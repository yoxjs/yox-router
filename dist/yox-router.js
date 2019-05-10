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
  var UNDEFINED = void 0, 
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
  // 默认路由
  ROUTE_DEFAULT = '', 
  // 404 路由
  ROUTE_404 = '*', 
  // 导航钩子 - 如果相继路由到的是同一个组件，那么会触发 refreshing 事件
  HOOK_REFRESHING = 'refreshing', 
  // 导航钩子 - 路由进入之前
  HOOK_BEFORE_ENTER = 'beforeEnter', 
  // 导航钩子 - 路由进入之后
  HOOK_AFTER_ENTER = 'afterEnter', 
  // 导航钩子 - 路由离开之前
  HOOK_BEFORE_LEAVE = 'beforeLeave', 
  // 导航钩子 - 路由离开之后
  HOOK_AFTER_LEAVE = 'afterLeave';
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
  // 钩子函数的调用链
  var Chain = /** @class */ (function () {
      function Chain(name) {
          this.name = name;
          this.list = [];
      }
      Chain.prototype.append = function (target, ctx) {
          var _a = this, name = _a.name, list = _a.list;
          if (target && Yox.is.func(target[name])) {
              list.push({
                  fn: target[name],
                  ctx: ctx
              });
          }
          return this;
      };
      Chain.prototype.run = function (to, from, success, failure) {
          var list = this.list, next = function (value) {
              if (value == null) {
                  var task = list.shift();
                  if (task) {
                      task.fn.call(task.ctx, to, from, next);
                  }
                  else if (success) {
                      success();
                  }
              }
              else if (failure) {
                  failure(value);
              }
          };
          next();
      };
      return Chain;
  }());
  var Router = /** @class */ (function () {
      function Router(options) {
          var instance = this;
          instance.routes = options.routes;
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
              var hash = parseHash(options.routes, hashStr), route = hash.route || (hashStr ? instance.route404 : instance.routeDefault);
              instance.setRoute({
                  component: route.component,
                  path: route.path,
                  params: hash.params,
                  query: hash.query
              }, route);
          };
          var route404, routeDefault;
          Yox.array.each(options.routes, function (route) {
              if (route.name) {
                  instance.name2Path[route.name] = route.path;
              }
              if (route.path === ROUTE_404) {
                  route404 = route;
              }
              else if (route.path === ROUTE_DEFAULT) {
                  routeDefault = route;
              }
          });
          {
              if (!routeDefault) {
                  Yox.logger.error("Route for default[\"" + ROUTE_DEFAULT + "\"] is required.");
                  return;
              }
              if (!route404) {
                  Yox.logger.error("Route for 404[\"" + ROUTE_404 + "\"] is required.");
                  return;
              }
          }
          instance.route404 = route404;
          instance.routeDefault = routeDefault;
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
       * go('/index')
       *
       * 如果需要带参数，切记路由表要配置 name
       *
       * go({
       *   name: 'index',
       *   params: { },
       *   query: { }
       * })
       *
       * 如果没有任何参数，可以只传 path
       *
       * go('/index')
       *
       * 2. 不会改变 url
       *
       * go({
       *   component: 'index',
       *   props: { }
       * })
       *
       */
      Router.prototype.go = function (target) {
          if (Yox.is.string(target)) {
              location.hash = stringifyHash(target);
          }
          else if (Yox.is.object(target)) {
              if (Yox.object.has(target, 'component')) {
                  var _a = target, component = _a.component, props = _a.props;
                  this.setRoute({
                      component: component,
                      props: props
                  });
              }
              else if (Yox.object.has(target, 'name')) {
                  var _b = target, name = _b.name, params = _b.params, query = _b.query, path = this.name2Path[name];
                  {
                      if (!Yox.is.string(path)) {
                          Yox.logger.error("Name[" + name + "] of the route is not found.");
                          return;
                      }
                  }
                  location.hash = stringifyHash(path, params, query);
              }
          }
      };
      /**
       * 切换路由
       */
      Router.prototype.setRoute = function (route, options) {
          var instance = this, currentRoute = instance.currentRoute, params = route.params, query = route.query, component = route.component, props = route.props, currentComponent = instance.currentComponent || (instance.currentComponent = { name: component }), failure = function (value) {
              if (value === false) {
                  // 流程到此为止，恢复到当前路由
                  if (currentRoute && Yox.is.string(currentRoute.path)) {
                      location.hash = stringifyHash(currentRoute.path, currentRoute.params, currentRoute.query);
                  }
              }
              else {
                  // 跳转到别的路由
                  instance.go(value);
              }
          }, callHook = function (name, success, failure) {
              new Chain(name)
                  // 先调用组件的钩子
                  .append(currentComponent.options, currentComponent.root)
                  // 再调用路由配置的钩子
                  .append(options, options)
                  // 最后调用路由实例的钩子
                  .append(instance, instance)
                  .run(route, currentRoute, success, failure);
          }, createComponent = function (options) {
              currentComponent.options = options;
              callHook(HOOK_BEFORE_ENTER, function () {
                  if (params || query) {
                      props = {};
                      if (params) {
                          Yox.object.extend(props, params);
                      }
                      if (query) {
                          Yox.object.extend(props, query);
                      }
                  }
                  currentComponent.root = new Yox(Yox.object.extend({
                      el: instance.el,
                      props: props,
                      extensions: {
                          $router: instance,
                          $route: route
                      }
                  }, options));
                  instance.currentRoute = route;
                  callHook(HOOK_AFTER_ENTER);
              }, failure);
          }, changeComponent = function (options) {
              callHook(HOOK_BEFORE_LEAVE, function () {
                  if (currentComponent.root) {
                      currentComponent.root.destroy();
                      currentComponent.root = UNDEFINED;
                  }
                  callHook(HOOK_AFTER_LEAVE);
                  createComponent(options);
              }, failure);
          };
          if (currentComponent.name !== component) {
              currentComponent.name = component;
          }
          store.component(component, function (options) {
              // 当连续调用此方法，且可能出现异步组件时
              // 执行到这 name 不一定会等于 currentComponent.name
              // 因此需要强制保证一下
              if (component !== currentComponent.name) {
                  return;
              }
              if (currentComponent.root) {
                  // 当前根组件还活着，并且还要切到当前根组件，表示刷新一下
                  if (currentComponent.options === options) {
                      callHook(HOOK_REFRESHING, function () {
                          // 如果 refreshing 钩子调用了 next()
                          // 表示要销毁重建当前根组件
                          changeComponent(options);
                      }, failure);
                  }
                  // 切换到其他组件
                  else {
                      changeComponent(options);
                  }
              }
              // 第一次创建组件
              else {
                  createComponent(options);
              }
          });
      };
      /**
       * 启动路由
       */
      Router.prototype.start = function (el) {
          if (Yox.is.string(el)) {
              var element = domApi.find(el);
              if (element) {
                  this.el = element;
              }
          }
          else {
              this.el = el;
          }
          domApi.on(window, 'hashchange', this.onHashChange);
          this.onHashChange();
      };
      /**
       * 停止路由
       */
      Router.prototype.stop = function () {
          this.el = UNDEFINED;
          domApi.off(window, 'hashchange', this.onHashChange);
      };
      return Router;
  }());
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
  }

  exports.Router = Router;
  exports.install = install;
  exports.register = register;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=yox-router.js.map
