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

  /**
   * 为了压缩，定义的常量
   */
  var TRUE = true;
  var FALSE = false;
  var NULL = null;
  var UNDEFINED = void 0;

  var RAW_TRUE = 'true';
  var RAW_FALSE = 'false';
  var RAW_NULL = 'null';
  var RAW_UNDEFINED = 'undefined';

  /**
   * 空对象，很多地方会用到，比如 `a || EMPTY_OBJECT` 确保是个对象
   */
  var EMPTY_OBJECT = Object.freeze({});

  /**
   * 空数组
   */
  var EMPTY_ARRAY = Object.freeze([]);

  /**
   * 空字符串
   */
  var EMPTY_STRING = '';

  var Hooks = /** @class */ (function () {
      function Hooks() {
      }
      Hooks.prototype.setLocation = function (to, from) {
          this.to = to;
          this.from = from;
          return this;
      };
      Hooks.prototype.setName = function (name) {
          this.name = name;
          this.list = [];
          return this;
      };
      Hooks.prototype.add = function (target, ctx) {
          var _a = this, name = _a.name, list = _a.list;
          if (target && target[name]) {
              list.push({
                  fn: target[name],
                  ctx: ctx
              });
          }
          return this;
      };
      Hooks.prototype.next = function (next, complete) {
          var task = this.list.shift();
          if (task) {
              if (complete) {
                  task.fn.call(task.ctx, this.to, this.from, next);
              }
              else {
                  task.fn.call(task.ctx, this.to, this.from);
                  next();
              }
          }
          else if (complete) {
              complete();
          }
      };
      return Hooks;
  }());

  // hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
  var PREFIX_HASH = '#!';
  // path 中的参数前缀，如 #!/user/:userId
  var PREFIX_PARAM = ':';
  // path 分隔符
  var SEPARATOR_PATH = '/';
  var SEPARATOR_SEARCH = '?';
  // 导航钩子 - 路由进入之前
  var HOOK_BEFORE_ENTER = 'beforeEnter';
  // 导航钩子 - 路由进入之后
  var HOOK_AFTER_ENTER = 'afterEnter';
  // 导航钩子 - 路由离开之前
  var HOOK_BEFORE_LEAVE = 'beforeLeave';
  // 导航钩子 - 路由离开之后
  var HOOK_AFTER_LEAVE = 'afterLeave';

  /**
   * 把字符串 value 解析成最合适的类型
   */
  function parse(Yox, value) {
      var result;
      if (Yox.is.numeric(value)) {
          result = +value;
      }
      else if (Yox.is.string(value)) {
          if (value === RAW_TRUE) {
              result = TRUE;
          }
          else if (value === RAW_FALSE) {
              result = FALSE;
          }
          else if (value === RAW_NULL) {
              result = NULL;
          }
          else if (value === RAW_UNDEFINED) {
              result = UNDEFINED;
          }
          else {
              result = decodeURIComponent(value);
          }
      }
      return result;
  }
  function stringify(Yox, value) {
      if (Yox.is.string(value)) {
          return encodeURIComponent(value);
      }
      else if (Yox.is.number(value) || Yox.is.boolean(value)) {
          return value.toString();
      }
      else if (value === NULL) {
          return RAW_NULL;
      }
      return RAW_UNDEFINED;
  }

  // query 分隔符
  var SEPARATOR_QUERY = '&', 
  // 键值对分隔符
  SEPARATOR_PAIR = '=', 
  // 参数中的数组标识
  FLAG_ARRAY = '[]';
  /**
   * 把 GET 参数解析成对象
   */
  function parse$1(Yox, query) {
      var result;
      Yox.array.each(query.split(SEPARATOR_QUERY), function (term) {
          var terms = term.split(SEPARATOR_PAIR), key = Yox.string.trim(terms[0]), value = terms[1];
          if (key) {
              if (!result) {
                  result = {};
              }
              value = parse(Yox, value);
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
  function stringify$1(Yox, query) {
      var result = [];
      var _loop_1 = function (key) {
          var value = query[key];
          if (Yox.is.array(value)) {
              Yox.array.each(value, function (value) {
                  result.push(key + FLAG_ARRAY + SEPARATOR_PAIR + stringify(Yox, value));
              });
          }
          else {
              result.push(key + SEPARATOR_PAIR + stringify(Yox, value));
          }
      };
      for (var key in query) {
          _loop_1(key);
      }
      return result.join(SEPARATOR_QUERY);
  }

  /**
   * 解析 path 中的参数
   */
  function parseParams(Yox, realpath, path) {
      var result, realpathTerms = realpath.split(SEPARATOR_PATH), pathTerms = path.split(SEPARATOR_PATH);
      if (realpathTerms.length === pathTerms.length) {
          Yox.array.each(pathTerms, function (item, index) {
              if (Yox.string.startsWith(item, PREFIX_PARAM)) {
                  if (!result) {
                      result = {};
                  }
                  result[item.substr(PREFIX_PARAM.length)] = parse(Yox, realpathTerms[index]);
              }
          });
      }
      return result;
  }
  /**
   * 通过 realpath 获取配置的路由
   */
  function getRouteByRealpath(Yox, routes, realpath) {
      var result, realpathTerms = realpath.split(SEPARATOR_PATH), length = realpathTerms.length;
      Yox.array.each(routes, function (route) {
          if (route.params) {
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
                  return FALSE;
              }
          }
          else if (route.path === realpath) {
              result = route;
              return FALSE;
          }
      });
      return result;
  }
  /**
   * 完整解析 hash 数据
   */
  function parse$2(Yox, routes, hash) {
      var realpath, search, index = hash.indexOf(SEPARATOR_SEARCH);
      if (index >= 0) {
          realpath = hash.substring(0, index);
          search = hash.substring(index + 1);
      }
      else {
          realpath = hash;
      }
      var result = { realpath: realpath }, route = getRouteByRealpath(Yox, routes, realpath);
      if (route) {
          result.route = route;
          if (route.params) {
              var params = parseParams(Yox, realpath, route.path);
              if (params) {
                  result.params = params;
              }
          }
          if (search) {
              var query = parse$1(Yox, search);
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
  function stringify$2(Yox, path, params, query) {
      var terms = [], realpath, search = EMPTY_STRING;
      Yox.array.each(path.split(SEPARATOR_PATH), function (item) {
          terms.push(Yox.string.startsWith(item, PREFIX_PARAM)
              ? params[item.substr(PREFIX_PARAM.length)]
              : item);
      });
      realpath = terms.join(SEPARATOR_PATH);
      if (query) {
          var queryStr = stringify$1(Yox, query);
          if (queryStr) {
              search = SEPARATOR_SEARCH + queryStr;
          }
      }
      return realpath + search;
  }

  var Yox, registry, domApi;
  var OUTLET = '$outlet', ROUTE = '$route', ROUTER = '$router', COMPONENT = 'RouteComponent', EVENT_CLICK = 'click';
  /**
   * 格式化路径，确保它以 / 开头，不以 / 结尾
   */
  function formatPath(path, parentPath) {
      // 如果 path 以 / 结尾，删掉它
      // 比如 { path: 'index/' }
      if (Yox.string.endsWith(path, SEPARATOR_PATH)) {
          path = Yox.string.slice(path, 0, -1);
      }
      // 如果 path 不是以 / 开头，有两种情况：
      // 1. 没有上级或上级是 ''，需要自动加 / 前缀
      // 2. 相对上级的路径，自动替换最后一个 / 后面的路径
      if (!Yox.string.startsWith(path, SEPARATOR_PATH)) {
          if (path) {
              if (Yox.string.falsy(parentPath)) {
                  path = SEPARATOR_PATH + path;
              }
              else {
                  path = parentPath + SEPARATOR_PATH + path;
              }
          }
          else if (parentPath) {
              path = parentPath;
          }
      }
      return path;
  }
  /**
   * 按照 propTypes 定义的外部数据格式过滤路由参数，这样有两个好处：
   *
   * 1. 避免传入不符预期的数据
   * 2. 避免覆盖 data 定义的数据
   */
  function filterProps(route, location, options) {
      var result = {}, propTypes = options.propTypes;
      if (propTypes) {
          var props = location.query, routeParams = route.params, locationParams = location.params;
          // 从 location.params 挑出 route.params 参数
          if (routeParams && locationParams) {
              if (!props) {
                  props = {};
              }
              for (var i = 0, key = void 0; key = routeParams[i]; i++) {
                  props[key] = locationParams[key];
              }
          }
          if (props) {
              for (var key in propTypes) {
                  result[key] = Yox.checkProp(key, props[key], propTypes[key]);
              }
          }
      }
      return result;
  }
  var Router = /** @class */ (function () {
      function Router(options) {
          var instance = this, route404 = options.route404;
          instance.el = options.el;
          /**
           * hashchange 事件处理函数
           * 此函数必须写在实例上，不能写在类上
           * 否则一旦解绑，所有实例都解绑了
           */
          instance.onChange = function () {
              var hashStr = location.hash;
              // 如果不以 PREFIX_HASH 开头，表示不合法
              hashStr = Yox.string.startsWith(hashStr, PREFIX_HASH)
                  ? hashStr.substr(PREFIX_HASH.length)
                  : '';
              var hash = parse$2(Yox, instance.routes, hashStr), route = hash.route;
              if (route) {
                  instance.setRoute({
                      path: route.path,
                      params: hash.params,
                      query: hash.query
                  }, route);
              }
              else {
                  instance.push(instance.route404);
              }
          };
          {
              if (!route404) {
                  Yox.logger.error("Route for 404 is required.");
                  return;
              }
          }
          instance.routes = [];
          instance.name2Path = {};
          instance.path2Route = {};
          instance.hooks = new Hooks();
          instance.add(options.routes);
          instance.add([route404]);
          instance.route404 = Yox.array.last(instance.routes);
      }
      Router.prototype.add = function (routes) {
          var instance = this, pathStack = [], routeStack = [], callback = function (routeOptions) {
              var name = routeOptions.name, path = routeOptions.path, component = routeOptions.component, children = routeOptions.children, parentPath = pathStack[pathStack.length - 1], parentRoute = routeStack[routeStack.length - 1];
              path = formatPath(path, parentPath);
              var route = { path: path, component: component, route: routeOptions }, params = [];
              Yox.array.each(path.split(SEPARATOR_PATH), function (item) {
                  if (Yox.string.startsWith(item, PREFIX_PARAM)) {
                      params.push(item.substr(PREFIX_PARAM.length));
                  }
              });
              if (params.length) {
                  route.params = params;
              }
              if (parentRoute) {
                  route.parent = parentRoute;
              }
              if (children) {
                  pathStack.push(path);
                  routeStack.push(route);
                  Yox.array.each(children, callback);
                  routeStack.pop();
                  pathStack.pop();
              }
              else {
                  instance.routes.push(route);
                  if (name) {
                      {
                          if (Yox.object.has(instance.name2Path, name)) {
                              Yox.logger.error("Name[" + name + "] of the route is existed.");
                              return;
                          }
                      }
                      instance.name2Path[name] = path;
                  }
                  {
                      if (Yox.object.has(instance.path2Route, path)) {
                          Yox.logger.error("path [" + path + "] of the route is existed.");
                          return;
                      }
                  }
                  instance.path2Route[path] = route;
              }
          };
          Yox.array.each(routes, callback);
          pathStack = routeStack = UNDEFINED;
      };
      /**
       * 真正执行路由切换操作的函数
       *
       * target 有 2 种格式：
       *
       * 如果只是简单的 path，直接传字符串
       *
       * push('/index')
       *
       * 如果需要带参数，可传对象
       *
       * push({
       *   path: '/index',
       *   params: { },
       *   query: { }
       * })
       *
       * 如果路由配置了 name，可用 name 代替 path，如下：
       *
       * push({
       *   name: 'index'
       * })
       *
       */
      Router.prototype.push = function (target) {
          var path, params, query;
          if (Yox.is.string(target)) {
              path = target;
          }
          else {
              var route = target, name = route.name;
              if (name) {
                  path = this.name2Path[name];
                  {
                      if (!Yox.is.string(path)) {
                          Yox.logger.error("Name[" + name + "] of the route is not found.");
                          return;
                      }
                  }
              }
              else {
                  path = route.path;
              }
              params = route.params;
              query = route.query;
          }
          this.setHash(path, params, query);
      };
      Router.prototype.setHash = function (path, params, query) {
          path = formatPath(path);
          if (!this.path2Route[path]) {
              path = this.route404.path;
          }
          location.hash = PREFIX_HASH + stringify$2(Yox, path, params, query);
      };
      /**
       * 启动路由
       */
      Router.prototype.start = function () {
          domApi.on(window, 'hashchange', this.onChange);
          this.onChange();
      };
      /**
       * 停止路由
       */
      Router.prototype.stop = function () {
          domApi.off(window, 'hashchange', this.onChange);
      };
      /**
       * 路由守卫
       */
      Router.prototype.guard = function (route, name, callback) {
          // 必须是叶子节点
          if (route.child) {
              return;
          }
          var instance = this, hooks = instance.hooks, to = hooks.to, from = hooks.from;
          if (!from || from.path !== to.path) {
              hooks
                  .setName(name)
                  // 先调用组件的钩子
                  .add(route.options, route.context)
                  // 再调用路由配置的钩子
                  .add(route.route, route.route)
                  // 最后调用路由实例的钩子
                  .add(instance, instance);
              var next_1 = function (value) {
                  if (value === UNDEFINED) {
                      hooks.next(next_1, callback);
                  }
                  else if (value !== FALSE) {
                      // 跳转到别的路由
                      instance.push(value);
                  }
              };
              next_1();
          }
          else if (callback) {
              callback();
          }
      };
      /**
       * 切换路由
       */
      Router.prototype.setRoute = function (location, route) {
          var instance = this, oldRoute = instance.route, newRoute = Yox.object.copy(route), startRoute, oldLocation = instance.location, 
          // 对比新旧两个路由链表
          diffRoute = function (newRoute, oldRoute, childRoute, callback) {
              // 不论是同步还是异步组件，都可以通过 registry.loadComponent 取到 options
              registry.loadComponent(newRoute.component, function (options) {
                  newRoute.options = options;
                  // 更新链路
                  if (childRoute) {
                      newRoute.child = childRoute;
                      childRoute.parent = newRoute;
                  }
                  if (oldRoute) {
                      // 同级的两个组件不同，疑似起始更新的路由
                      if (oldRoute.options !== options) {
                          startRoute = newRoute;
                      }
                      else {
                          // 把上次的组件实例搞过来
                          newRoute.context = oldRoute.context;
                      }
                  }
                  else {
                      startRoute = newRoute;
                  }
                  if (newRoute.parent) {
                      diffRoute(Yox.object.copy(newRoute.parent), oldRoute ? oldRoute.parent : UNDEFINED, newRoute, callback);
                      return;
                  }
                  // 到达根组件，结束
                  callback(newRoute);
              });
          }, updateRoute = function (route) {
              // 从上往下更新 props
              while (TRUE) {
                  var parent = route.parent, context = route.context, component = route.component, options = route.options;
                  if (route === startRoute) {
                      if (parent) {
                          context = parent.context;
                          context.forceUpdate(filterProps(parent, location, parent.options));
                          context = context[OUTLET];
                          if (context) {
                              var props = {};
                              props[COMPONENT] = component;
                              context[ROUTE] = route;
                              context.component(component, options);
                              context.forceUpdate(props);
                          }
                      }
                      else {
                          if (context) {
                              context.destroy();
                              var oldRoute_1 = context[ROUTE];
                              oldRoute_1.context = UNDEFINED;
                              instance.guard(oldRoute_1, HOOK_AFTER_LEAVE);
                          }
                          // 每层路由组件都有 $route 和 $router 属性
                          var extensions = {};
                          extensions[ROUTER] = instance;
                          extensions[ROUTE] = route;
                          route.context = new Yox(Yox.object.extend({
                              el: instance.el,
                              props: filterProps(route, location, options),
                              extensions: extensions
                          }, options));
                          instance.guard(route, HOOK_AFTER_ENTER);
                      }
                  }
                  else if (context) {
                      context[ROUTE] = route;
                      context.forceUpdate(filterProps(route, location, options));
                      // 如果 <router-view> 定义在 if 里
                      // 当 router-view 从无到有时，这里要读取最新的 child
                      // 当 router-view 从有到无时，这里要判断它是否存在
                      if (context[OUTLET] && route.child) {
                          route = route.child;
                          continue;
                      }
                  }
                  break;
              }
          }, enterRoute = function (route) {
              instance.guard(newRoute, HOOK_BEFORE_ENTER, function () {
                  instance.route = newRoute;
                  instance.location = location;
                  updateRoute(route);
              });
          };
          instance.hooks.setLocation(location, oldLocation);
          // 先确保加载到组件 options，这样才能在 guard 方法中调用 options 的路由钩子
          diffRoute(newRoute, oldRoute, UNDEFINED, function (route) {
              if (oldRoute) {
                  instance.guard(oldRoute, HOOK_BEFORE_LEAVE, function () {
                      enterRoute(route);
                  });
              }
              else {
                  enterRoute(route);
              }
          });
      };
      return Router;
  }());
  var directive = {
      bind: function (node, directive, vnode) {
          // 当前组件如果是根组件，则没有 $root 属性
          var $root = vnode.context.$root || vnode.context, router = $root[ROUTER], listener = function (_) {
              var value = directive.getter && directive.getter();
              router.push(value != NULL ? value : directive.value);
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
      template: '<$' + COMPONENT + '/>',
      beforeCreate: function (options) {
          var $parent = options.parent, route = $parent[ROUTE].child;
          if (route) {
              $parent[OUTLET] = this;
              var props = {}, components = {};
              props[COMPONENT] = route.component;
              components[route.component] = route.options;
              options.props = props;
              options.components = components;
          }
      },
      beforeDestroy: function () {
          this.$parent[OUTLET] = UNDEFINED;
      },
      beforeChildCreate: function (childOptions) {
          var $parent = this.$parent, router = $parent[ROUTER], route = $parent[ROUTE].child, extensions = {};
          extensions[ROUTE] = route;
          extensions[ROUTER] = router;
          if (router.location) {
              childOptions.props = filterProps(route, router.location, childOptions);
          }
          childOptions.extensions = extensions;
      },
      afterChildCreate: function (child) {
          var router = child[ROUTER], route = child[ROUTE];
          if (route) {
              route.context = child;
              router.guard(route, HOOK_AFTER_ENTER);
          }
      },
      beforeChildDestroy: function (child) {
          var router = child[ROUTER], route = child[ROUTE];
          if (route) {
              route.context = UNDEFINED;
              router.guard(route, HOOK_AFTER_LEAVE);
          }
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
      registry.component(name, component);
  }
  /**
   * 安装插件
   */
  function install(Class) {
      Yox = Class;
      registry = new Class();
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
