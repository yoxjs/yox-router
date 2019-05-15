/**
 * yox-router.js v0.30.0
 * (c) 2017-2019 musicode
 * Released under the MIT License.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.YoxRouter = {}));
}(this, function (exports) { 'use strict';

  var Yox, store, domApi;
  var UNDEFINED = void 0, OUTLET = '$outlet', ROUTE = '$route', 
  // 点击事件
  EVENT_CLICK = 'click', 
  // hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
  PREFIX_HASH = '#!', 
  // path 中的参数前缀，如 #!/user/:userId
  PREFIX_PARAM = ':', 
  // path 分隔符
  SEPARATOR_PATH = '/', 
  // query 分隔符
  SEPARATOR_QUERY = '&', 
  // 键值对分隔符
  SEPARATOR_PAIR = '=', 
  // 参数中的数组标识
  FLAG_ARRAY = '[]', 
  // 404 路由
  ROUTE_404 = '**'; 
  /**
   * 把字符串 value 解析成最合适的类型
   */
  function parseValue(value) {
      var result;
      if (Yox.is.numeric(value)) {
          result = +value;
      }
      else if (Yox.is.string(value)) {
          if (value === 'true') {
              result = true;
          }
          else if (value === 'false') {
              result = false;
          }
          else if (value === 'null') {
              result = null;
          }
          else if (value === 'undefined') {
              result = UNDEFINED;
          }
          else {
              result = decodeURIComponent(value);
          }
      }
      return result;
  }
  /**
   * 把 key value 序列化成合适的 key=value 格式
   */
  function stringifyPair(key, value) {
      var result = [key];
      if (Yox.is.string(value)) {
          result.push(encodeURIComponent(value));
      }
      else if (Yox.is.number(value) || Yox.is.boolean(value)) {
          result.push(value.toString());
      }
      else if (value === null) {
          result.push('null');
      }
      else if (value === UNDEFINED) {
          result.push('undefined');
      }
      return result.join(SEPARATOR_PAIR);
  }
  /**
   * 把 GET 参数解析成对象
   */
  function parseQuery(query) {
      var result;
      Yox.array.each(query.split(SEPARATOR_QUERY), function (term) {
          var terms = term.split(SEPARATOR_PAIR), key = Yox.string.trim(terms[0]), value = terms[1];
          if (key) {
              if (!result) {
                  result = {};
              }
              value = parseValue(value);
              if (Yox.string.endsWith(key, FLAG_ARRAY)) {
                  key = Yox.string.slice(key, 0, -FLAG_ARRAY.length);
                  Yox.array.push(result[key] || (result[key] = []), value);
              }
              else {
                  result[key] = value;
              }
          }
      });
      return result;
  }
  /**
   * 把对象解析成 key1=value1&key2=value2
   */
  function stringifyQuery(query) {
      var result = [];
      Yox.object.each(query, function (value, key) {
          if (Yox.is.array(value)) {
              Yox.array.each(value, function (value) {
                  result.push(stringifyPair(key + FLAG_ARRAY, value));
              });
          }
          else {
              result.push(stringifyPair(key, value));
          }
      });
      return result.join(SEPARATOR_QUERY);
  }
  /**
   * 解析 path 中的参数
   */
  function parseParams(realpath, path) {
      var result, realpathTerms = realpath.split(SEPARATOR_PATH), pathTerms = path.split(SEPARATOR_PATH);
      if (realpathTerms.length === pathTerms.length) {
          Yox.array.each(pathTerms, function (item, index) {
              if (Yox.string.startsWith(item, PREFIX_PARAM)) {
                  if (!result) {
                      result = {};
                  }
                  result[item.substr(PREFIX_PARAM.length)] = parseValue(realpathTerms[index]);
              }
          });
      }
      return result;
  }
  /**
   * 通过 realpath 获取配置的路由
   */
  function getRouteByRealpath(routes, realpath) {
      var result, realpathTerms = realpath.split(SEPARATOR_PATH), length = realpathTerms.length;
      Yox.array.each(routes, function (route) {
          var pathTerms = route.path.split(SEPARATOR_PATH);
          if (length === pathTerms.length) {
              for (var i = 0; i < length; i++) {
                  // 非参数段不相同
                  if (!Yox.string.startsWith(pathTerms[i], PREFIX_PARAM)
                      && pathTerms[i] !== realpathTerms[i]) {
                      return;
                  }
              }
              result = route;
              return false;
          }
      });
      return result;
  }
  /**
   * 完整解析 hash 数据
   */
  function parseHash(routes, hash) {
      var realpath, search, index = hash.indexOf('?');
      if (index >= 0) {
          realpath = hash.substring(0, index);
          search = hash.substring(index + 1);
      }
      else {
          realpath = hash;
      }
      var result = { realpath: realpath }, route = getRouteByRealpath(routes, realpath);
      if (route) {
          result.route = route;
          var params = parseParams(realpath, route.path);
          if (params) {
              result.params = params;
          }
          if (search) {
              var query = parseQuery(search);
              if (query) {
                  result.query = query;
              }
          }
      }
      return result;
  }
  /**
   * 把结构化数据序列化成 hash
   */
  function stringifyHash(path, params, query) {
      var terms = [], realpath, search = '';
      Yox.array.each(path.split(SEPARATOR_PATH), function (item) {
          terms.push(Yox.string.startsWith(item, PREFIX_PARAM)
              ? params[item.substr(PREFIX_PARAM.length)]
              : item);
      });
      realpath = terms.join(SEPARATOR_PATH);
      if (query) {
          var queryStr = stringifyQuery(query);
          if (queryStr) {
              search = '?' + queryStr;
          }
      }
      return PREFIX_HASH + realpath + search;
  }
  var Router = /** @class */ (function () {
      function Router(options) {
          var instance = this, routes = [];
          instance.el = options.el;
          /**
           * 路由表 name -> path
           */
          instance.name2Path = {};
          /**
           * hashchange 事件处理函数
           * 此函数必须写在实例上，不能写在类上
           * 否则一旦解绑，所有实例都解绑了
           */
          instance.onHashChange = function () {
              var hashStr = location.hash;
              // 如果不以 PREFIX_HASH 开头，表示不合法
              hashStr = Yox.string.startsWith(hashStr, PREFIX_HASH)
                  ? hashStr.substr(PREFIX_HASH.length)
                  : '';
              var hash = parseHash(routes, hashStr), route = hash.route || instance.route404;
              instance.setRoute({
                  path: route.path,
                  params: hash.params,
                  query: hash.query
              }, route);
          };
          var route404, pathStack = [], routeStack = [], callback = function (route) {
              var name = route.name, path = route.path, children = route.children;
              // 如果 path 以 / 结尾，删掉它
              if (Yox.string.endsWith(path, SEPARATOR_PATH)) {
                  path = Yox.string.slice(path, 0, -1);
              }
              // 如果 path 不是以 / 开头，有两种情况：
              // 1. 没有上级或上级是 ''，需要自动加 / 前缀
              // 2. 相对上级的路径，自动替换最后一个 / 后面的路径
              if (path !== ROUTE_404
                  && !Yox.string.startsWith(path, SEPARATOR_PATH)) {
                  var parent = Yox.array.last(pathStack);
                  if (path) {
                      if (Yox.string.falsy(parent)) {
                          path = SEPARATOR_PATH + path;
                      }
                      else {
                          path = parent + SEPARATOR_PATH + path;
                      }
                  }
                  else if (parent) {
                      path = parent;
                  }
              }
              var linkedRoute = {
                  path: path,
                  route: route,
                  component: route.component,
                  parent: Yox.array.last(routeStack)
              };
              if (children) {
                  pathStack.push(path);
                  routeStack.push(linkedRoute);
                  Yox.array.each(children, callback);
                  pathStack.pop();
                  routeStack.pop();
              }
              else {
                  routes.push(linkedRoute);
              }
              if (name) {
                  instance.name2Path[name] = path;
              }
              if (path === ROUTE_404) {
                  route404 = linkedRoute;
              }
          };
          Yox.array.each(options.routes, callback);
          {
              if (!route404) {
                  Yox.logger.error("Route for 404[\"" + ROUTE_404 + "\"] is required.");
                  return;
              }
          }
          instance.routes = routes;
          instance.route404 = route404;
      }
      /**
       * 真正执行路由切换操作的函数
       *
       * data 有 2 种格式：
       *
       * 1. 会修改 url
       *
       * 如果只是简单的 path，直接传字符串
       *
       * push('/index')
       *
       * 如果需要带参数，切记路由表要配置 name
       *
       * push({
       *   name: 'index',
       *   params: { },
       *   query: { }
       * })
       *
       * 如果没有任何参数，可以只传 path
       *
       * push('/index')
       *
       * 2. 不会改变 url
       *
       * push({
       *   component: 'index',
       *   props: { }
       * })
       *
       */
      Router.prototype.push = function (target) {
          if (Yox.is.string(target)) {
              location.hash = stringifyHash(target);
          }
          else {
              var _a = target, name = _a.name, params = _a.params, query = _a.query, path = this.name2Path[name];
              {
                  if (!Yox.is.string(path)) {
                      Yox.logger.error("Name[" + name + "] of the route is not found.");
                      return;
                  }
              }
              location.hash = stringifyHash(path, params, query);
          }
      };
      /**
       * 启动路由
       */
      Router.prototype.start = function () {
          domApi.on(window, 'hashchange', this.onHashChange);
          this.onHashChange();
      };
      /**
       * 停止路由
       */
      Router.prototype.stop = function () {
          domApi.off(window, 'hashchange', this.onHashChange);
      };
      /**
       * 切换路由
       */
      Router.prototype.setRoute = function (route, linkedRoute) {
          /**
           * 切换路由时，可能是两棵组件树的切换
           *
           * 比如从 /user/list 切到 /user/detail，可能 /user 这个层级还活着，只是第二级组件变化了
           *
           * 也可能从 /user/list 切到 /setting/profile，整个组件树都切掉了
           *
           * 当发生切换时:
           * beforeEnter/afterEnter 从上往下 触发
           * beforeLeave/afterLeave 从下往上 触发
           */
          var instance = this, currentRoute = instance.currentRoute, currentLinkedRoute = instance.currentLinkedRoute, props = {}, childRoute, startRoute, createComponent = function (options, el, route, props) {
              return new Yox(Yox.object.extend({
                  el: el,
                  props: props,
                  extensions: {
                      $router: instance,
                      $route: route
                  }
              }, options));
          }, 
          // changeComponent = function (options: YoxOptions, component: Yox, props: type.data | void) {
          //   const { $options } = component
          //   component.destroy()
          //   const { vnode } = $options
          //   if (vnode) {
          //     domApi.html(vnode.node as Element, '')
          //     return vnode.context.createComponent(options, vnode)
          //   }
          //   return createComponent(options, instance.el, props)
          // },
          // 对比新旧两个路由链表
          diffComponent = function (linkedRoute, oldLinkedRoute, isLeafRoute) {
              var newLinkedRoute = Yox.object.copy(linkedRoute);
              if (isLeafRoute) {
                  instance.currentLinkedRoute = newLinkedRoute;
              }
              // 不论是同步还是异步组件，都可以通过 store.loadComponent 取到 options
              store.loadComponent(newLinkedRoute.component, function (options) {
                  newLinkedRoute.options = options;
                  if (childRoute) {
                      newLinkedRoute.child = childRoute;
                      childRoute.parent = newLinkedRoute;
                  }
                  childRoute = newLinkedRoute;
                  if (oldLinkedRoute) {
                      // 同级的两个组件不同，疑似起始更新的路由
                      if (oldLinkedRoute.options !== options) {
                          startRoute = newLinkedRoute;
                      }
                      else {
                          // 把上次的组件实例搞过来
                          newLinkedRoute.context = oldLinkedRoute.context;
                      }
                  }
                  else {
                      startRoute = newLinkedRoute;
                  }
                  if (newLinkedRoute.parent) {
                      diffComponent(newLinkedRoute.parent, oldLinkedRoute ? oldLinkedRoute.parent : UNDEFINED);
                      return;
                  }
                  // 到达根组件，结束
                  console.log(newLinkedRoute);
                  console.log(oldLinkedRoute);
                  console.log(startRoute);
                  if (startRoute) {
                      var parent = startRoute.parent;
                      if (parent) {
                          var context = parent.context[OUTLET];
                          context.component(startRoute.component, startRoute.options);
                          context.set('component', startRoute.component);
                      }
                      else {
                          startRoute.context = createComponent(options, instance.el, startRoute, props);
                      }
                  }
              });
          };
          if (route.params) {
              Yox.object.extend(props, route.params);
          }
          if (route.query) {
              Yox.object.extend(props, route.query);
          }
          diffComponent(linkedRoute, currentLinkedRoute, true);
      };
      return Router;
  }());
  var directive = {
      bind: function (node, directive, vnode) {
          var root = vnode.context.$root || vnode.context, router = root['$router'], listener = function (_) {
              var value = directive.getter && directive.getter();
              router.push(value != null ? value : directive.value);
          };
          if (vnode.isComponent) {
              node.on(EVENT_CLICK, listener);
              vnode.data[directive.key] = function () {
                  node.off(EVENT_CLICK, listener);
              };
          }
          else {
              domApi.on(node, EVENT_CLICK, listener);
              vnode.data[directive.key] = function () {
                  domApi.off(node, EVENT_CLICK, listener);
              };
          }
      },
      unbind: function (node, directive, vnode) {
          vnode.data[directive.key]();
      }
  };
  var RouterView = {
      template: '<$component ref="outlet"/>',
      beforeCreate: function (options) {
          var parentContext = options.parent, route = parentContext[ROUTE].child;
          parentContext[OUTLET] = this;
          options.props = {
              component: route.component
          };
          var components = {};
          components[route.component] = route.options;
          options.components = components;
      },
      beforeChildCreate: function (options) {
          var $parent = this.$parent;
          options.extensions = {
              $route: $parent.$route.child,
              $router: $parent.$router
          };
      },
      afterChildCreate: function (child) {
          child[ROUTE].context = child;
      }
  };
  /**
   * 版本
   */
  var version = "0.30.0";
  /**
   * 注册全局组件，路由实例可共享
   */
  function register(name, component) {
      store.component(name, component);
  }
  /**
   * 安装插件
   */
  function install(Class) {
      Yox = Class;
      store = new Class();
      domApi = Class.dom;
      Yox.directive('href', directive);
      // 提供两种风格
      Yox.component({
          RouterView: RouterView,
          'router-view': RouterView
      });
  }

  exports.Router = Router;
  exports.install = install;
  exports.register = register;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=yox-router.js.map
