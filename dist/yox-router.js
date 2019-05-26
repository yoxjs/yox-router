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

  var Yox, registry, domApi;
  var UNDEFINED = void 0, OUTLET = '$outlet', ROUTE = '$route', ROUTER = '$router', COMPONENT = 'RouteComponent', 
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
      var _loop_1 = function (key) {
          var value = query[key];
          if (Yox.is.array(value)) {
              Yox.array.each(value, function (value) {
                  result.push(stringifyPair(key + FLAG_ARRAY, value));
              });
          }
          else {
              result.push(stringifyPair(key, value));
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
                  return false;
              }
          }
          else if (route.path === realpath) {
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
          if (route.params) {
              var params = parseParams(realpath, route.path);
              if (params) {
                  result.params = params;
              }
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
      return realpath + search;
  }
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
          var props = location.query, routeParams = route.params, locationParams = location.params, defaultValue = void 0;
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
                  defaultValue = Yox.checkProp(props, key, propTypes[key]);
                  result[key] = defaultValue !== UNDEFINED
                      ? defaultValue
                      : props[key];
              }
          }
      }
      return result;
  }
  // 钩子函数的调用链
  var Hooks = /** @class */ (function () {
      function Hooks() {
      }
      Hooks.prototype.setLocation = function (to, from) {
          this.to = to;
          this.from = from;
      };
      Hooks.prototype.setName = function (name) {
          this.name = name;
          this.list = [];
          return this;
      };
      Hooks.prototype.add = function (target, ctx) {
          var _a = this, name = _a.name, list = _a.list;
          if (target && Yox.is.func(target[name])) {
              list.push({
                  fn: target[name],
                  ctx: ctx
              });
          }
          return this;
      };
      Hooks.prototype.run = function (success, failure) {
          var _a = this, to = _a.to, from = _a.from, list = _a.list;
          if (!from || from.path !== to.path) {
              var next_1 = function (value) {
                  if (value === UNDEFINED) {
                      var task = list.shift();
                      if (task) {
                          task.fn.call(task.ctx, to, from, next_1);
                      }
                      else if (success) {
                          success();
                      }
                  }
                  else if (failure) {
                      failure(value);
                  }
              };
              next_1();
          }
          else if (success) {
              success();
          }
      };
      return Hooks;
  }());
  var Router = /** @class */ (function () {
      function Router(options) {
          var instance = this, route404 = options.route404, routes = [], name2Path = {}, path2Route = {};
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
              var hash = parseHash(routes, hashStr), route = hash.route;
              if (route) {
                  instance.setRoute({
                      path: route.path,
                      params: hash.params,
                      query: hash.query
                  }, route);
              }
              else {
                  instance.push(notFound);
              }
          };
          var pathStack = [], routeStack = [], callback = function (routeOptions) {
              var name = routeOptions.name, path = routeOptions.path, component = routeOptions.component, children = routeOptions.children, parentPath = pathStack[pathStack.length - 1], parentRoute = routeStack[routeStack.length - 1];
              path = formatPath(path, parentPath);
              var route = { path: path, component: component, route: routeOptions }, params = [];
              Yox.array.each(path.split(SEPARATOR_PATH), function (item, index) {
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
                  routes.push(route);
                  if (name) {
                      {
                          if (Yox.object.has(name2Path, name)) {
                              Yox.logger.error("Name[" + name + "] of the route is existed.");
                              return;
                          }
                      }
                      name2Path[name] = path;
                  }
                  {
                      if (Yox.object.has(path2Route, path)) {
                          Yox.logger.error("path [" + path + "] of the route is existed.");
                          return;
                      }
                  }
                  path2Route[path] = route;
              }
          };
          Yox.array.each(options.routes, callback);
          pathStack = routeStack = UNDEFINED;
          {
              if (!route404) {
                  Yox.logger.error("Route for 404 is required.");
                  return;
              }
          }
          var notFound = {
              path: formatPath(route404.path),
              route: route404,
              component: route404.component
          };
          routes.push(notFound);
          path2Route[notFound.path] = notFound;
          instance.route404 = notFound;
          instance.routes = routes;
          instance.path2Route = path2Route;
          instance.name2Path = name2Path;
          instance.hooks = new Hooks();
      }
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
              params = target.params;
              query = target.query;
              var name = target.name;
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
                  path = target.path;
              }
          }
          this.setHash(path, params, query);
      };
      Router.prototype.setHash = function (path, params, query) {
          path = formatPath(path);
          if (!this.path2Route[path]) {
              path = this.route404.path;
          }
          location.hash = PREFIX_HASH + stringifyHash(path, params, query);
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
      Router.prototype.guard = function (route, name, success, failure) {
          this.hooks
              .setName(name)
              // 先调用组件的钩子
              .add(route.options, route.context)
              // 再调用路由配置的钩子
              .add(route.route, route.route)
              // 最后调用路由实例的钩子
              .add(this, this)
              .run(success, failure);
      };
      /**
       * 切换路由
       */
      Router.prototype.setRoute = function (location, route) {
          var instance = this, oldRoute = instance.route, newRoute = Yox.object.copy(route), startRoute, oldLocation = instance.location, failure = function (value) {
              if (value === false) {
                  // 流程到此为止，恢复到当前路由
                  if (oldLocation
                      && Yox.is.string(oldLocation.path)) {
                      instance.setHash(oldLocation.path, oldLocation.params, oldLocation.query);
                  }
              }
              else {
                  // 跳转到别的路由
                  instance.push(value);
              }
          }, 
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
              while (true) {
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
                              if (!oldRoute_1.child) {
                                  oldRoute_1.context = UNDEFINED;
                                  instance.guard(oldRoute_1, HOOK_AFTER_LEAVE);
                              }
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
                          if (!route.child) {
                              instance.guard(route, HOOK_AFTER_ENTER);
                          }
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
          }, enterRoute = function (callback) {
              instance.guard(newRoute, HOOK_BEFORE_ENTER, function () {
                  instance.route = newRoute;
                  instance.location = location;
                  diffRoute(newRoute, oldRoute, UNDEFINED, callback);
              }, failure);
          };
          instance.hooks.setLocation(location, oldLocation);
          if (oldRoute) {
              instance.guard(oldRoute, HOOK_BEFORE_LEAVE, function () {
                  enterRoute(updateRoute);
              }, failure);
          }
          else {
              enterRoute(updateRoute);
          }
      };
      return Router;
  }());
  var directive = {
      bind: function (node, directive, vnode) {
          // 当前组件如果是根组件，则没有 $root 属性
          var $root = vnode.context.$root || vnode.context, router = $root[ROUTER], listener = function (_) {
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
              if (!route.child) {
                  router.guard(route, HOOK_AFTER_ENTER);
              }
          }
      },
      beforeChildDestroy: function (child) {
          var router = child[ROUTER], route = child[ROUTE];
          if (route) {
              route.context = UNDEFINED;
              if (!route.child) {
                  router.guard(route, HOOK_AFTER_LEAVE);
              }
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
