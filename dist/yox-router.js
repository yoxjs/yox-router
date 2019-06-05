/**
 * yox-router.js v1.0.0-alpha11
 * (c) 2017-2019 musicode
 * Released under the MIT License.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.YoxRouter = {}));
}(this, function (exports) { 'use strict';

  // 路由钩子
  var HOOK_BEFORE_ROUTE_ENTER = 'beforeRouteEnter';
  var HOOK_AFTER_ROUTE_ENTER = 'afterRouteEnter';
  var HOOK_BEFORE_ROUTE_UPDATE = 'beforeRouteUpdate';
  var HOOK_AFTER_ROUTE_UPDATE = 'afterRouteUpdate';
  var HOOK_BEFORE_ROUTE_LEAVE = 'beforeRouteLeave';
  var HOOK_AFTER_ROUTE_LEAVE = 'afterRouteLeave';

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
   * Single instance for noop function
   */
  var EMPTY_FUNCTION = function () {
    /** yox */
  };

  /**
   * 空对象，很多地方会用到，比如 `a || EMPTY_OBJECT` 确保是个对象
   */
  var EMPTY_OBJECT = Object.freeze({});

  /**
   * 空数组
   */
  var EMPTY_ARRAY = Object.freeze([]);

  var Hooks = /** @class */ (function () {
      function Hooks() {
      }
      Hooks.prototype.setLocation = function (to, from) {
          this.to = to;
          this.from = from;
          return this;
      };
      Hooks.prototype.clear = function () {
          this.list = [];
          return this;
      };
      Hooks.prototype.add = function (hook, ctx) {
          var list = this.list;
          if (hook) {
              list.push({
                  fn: hook,
                  ctx: ctx
              });
          }
          return this;
      };
      Hooks.prototype.next = function (next, isGuard, callback) {
          var task = this.list.shift();
          if (task) {
              if (isGuard) {
                  task.fn.call(task.ctx, this.to, this.from, next);
              }
              else {
                  task.fn.call(task.ctx, this.to, this.from);
                  next();
              }
          }
          else if (callback) {
              callback();
          }
      };
      return Hooks;
  }());

  var WINDOW = window;
  var LOCATION = WINDOW.location;
  var HISTORY = WINDOW.history;
  // path 中的参数前缀，如 /user/:userId
  var PREFIX_PARAM = ':';
  // path 分隔符
  var SEPARATOR_PATH = '/';
  // path 和 search 的分隔符
  var SEPARATOR_SEARCH = '?';
  // query 分隔符
  var SEPARATOR_QUERY = '&';
  // 键值对分隔符
  var SEPARATOR_PAIR = '=';
  // 参数中的数组标识
  var FLAG_ARRAY = '[]';
  // 导航钩子 - 路由进入之前
  var HOOK_BEFORE_ENTER = 'beforeEnter';
  // 导航钩子 - 路由进入之后
  var HOOK_AFTER_ENTER = 'afterEnter';
  // 导航钩子 - 路由更新之前
  var HOOK_BEFORE_UPDATE = 'beforeUpdate';
  // 导航钩子 - 路由更新之后
  var HOOK_AFTER_UPDATE = 'afterUpdate';
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

  // hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
  var HASH_PREFIX = '#!', HASH_CHANGE = 'hashchange';
  function start(domApi, handler) {
      domApi.on(WINDOW, HASH_CHANGE, handler);
      handler();
  }
  function stop(domApi, handler) {
      domApi.off(WINDOW, HASH_CHANGE, handler);
  }
  function push(location, handler) {
      LOCATION.hash = HASH_PREFIX + location.url;
  }
  function go(n) {
      HISTORY.go(n);
  }
  function current() {
      // 不能直接读取 window.location.hash
      // 因为 Firefox 会做 pre-decode
      var href = LOCATION.href, index = href.indexOf(HASH_PREFIX);
      return index > 0
          ? href.substr(index + HASH_PREFIX.length)
          : SEPARATOR_PATH;
  }

  var hashMode = /*#__PURE__*/Object.freeze({
    start: start,
    stop: stop,
    push: push,
    go: go,
    current: current
  });

  var POP_STATE = 'popstate';
  var isSupported = 'pushState' in HISTORY;
  function start$1(domApi, handler) {
      domApi.on(WINDOW, POP_STATE, handler);
      handler();
  }
  function stop$1(domApi, handler) {
      domApi.off(WINDOW, POP_STATE, handler);
  }
  function push$1(location, handler) {
      // 调用 pushState 不会触发 popstate 事件
      // 因此这里需要手动调用一次 handler
      HISTORY.pushState({}, '', location.url);
      handler();
  }
  function go$1(n) {
      HISTORY.go(n);
  }
  function current$1() {
      return LOCATION.pathname + LOCATION.search;
  }

  var historyMode = /*#__PURE__*/Object.freeze({
    isSupported: isSupported,
    start: start$1,
    stop: stop$1,
    push: push$1,
    go: go$1,
    current: current$1
  });

  var Yox, domApi, guid = 0;
  var ROUTER = '$router', ROUTE = '$route', ROUTE_VIEW = '$routeView', ROUTE_COMPONENT = 'RouteComponent', EVENT_CLICK = 'click';
  /**
   * 格式化路径，确保它以 / 开头，不以 / 结尾
   */
  function formatPath(path, parentPath) {
      // 如果不是 / 开头，表示是相对路径
      if (!Yox.string.startsWith(path, SEPARATOR_PATH)) {
          // 确保 parentPath 以 / 结尾
          if (parentPath) {
              if (!Yox.string.endsWith(parentPath, SEPARATOR_PATH)) {
                  parentPath += SEPARATOR_PATH;
              }
          }
          else {
              parentPath = SEPARATOR_PATH;
          }
          path = parentPath + path;
      }
      // 如果 path 以 / 结尾，删掉它
      if (path !== SEPARATOR_PATH
          && Yox.string.endsWith(path, SEPARATOR_PATH)) {
          path = Yox.string.slice(path, 0, -SEPARATOR_PATH.length);
      }
      return path;
  }
  /**
   * 把结构化数据序列化成 url
   */
  function stringifyUrl(path, params, query) {
      if (/\/\:\w+/.test(path)) {
          var terms_1 = [];
          Yox.array.each(path.split(SEPARATOR_PATH), function (item) {
              terms_1.push(Yox.string.startsWith(item, PREFIX_PARAM) && params
                  ? params[item.substr(PREFIX_PARAM.length)]
                  : item);
          });
          path = terms_1.join(SEPARATOR_PATH);
      }
      if (query) {
          var queryStr = stringify$1(Yox, query);
          if (queryStr) {
              path += SEPARATOR_SEARCH + queryStr;
          }
      }
      return path;
  }
  function toUrl(target, name2Path) {
      if (Yox.is.string(target)) {
          return formatPath(target);
      }
      var route = target, name = route.name, path;
      if (name) {
          path = name2Path[name];
          {
              if (!Yox.is.string(path)) {
                  Yox.logger.error("The route of name[" + name + "] is not found.");
              }
          }
      }
      else {
          path = formatPath(route.path);
      }
      return stringifyUrl(path, route.params, route.query);
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
          // 从 location.params 挑出 route.params 定义过的参数
          if (routeParams && locationParams) {
              props = props ? Yox.object.copy(props) : {};
              for (var i = 0, length = routeParams.length; i < length; i++) {
                  props[routeParams[i]] = locationParams[routeParams[i]];
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
  /**
   * 是否是叶子节点
   * 如果把叶子节点放在 if 中，会出现即使不是定义时的叶子节点，却是运行时的叶子节点
   */
  function isLeafRoute(route) {
      var child = route.child;
      return !child || !child.context;
  }
  function updateRoute(instance, hook, componentHookName, hookName, upsert) {
      if (hook) {
          hook(instance);
      }
      var route = instance[ROUTE];
      if (route) {
          route.context = upsert ? instance : UNDEFINED;
          if (isLeafRoute(route)) {
              var router = instance[ROUTER];
              if (componentHookName && hookName) {
                  router.hook(route, componentHookName, hookName);
              }
              if (upsert) {
                  var pending = router.pending;
                  if (pending) {
                      pending.onComplete();
                      router.pending = UNDEFINED;
                  }
              }
          }
      }
  }
  var Router = /** @class */ (function () {
      function Router(options) {
          var instance = this, el = options.el, route404 = options.route404;
          instance.options = options;
          instance.el = Yox.is.string(el)
              ? domApi.find(el)
              : el;
          {
              if (!instance.el) {
                  Yox.logger.error("router.el is not an element.");
                  return;
              }
              if (!route404) {
                  Yox.logger.error("Route for 404 is required.");
                  return;
              }
          }
          instance.mode = options.mode === 'history' && isSupported ? historyMode : hashMode;
          instance.handler = function () {
              var url = instance.mode.current(), pending = instance.pending;
              if (pending) {
                  var location = pending.location;
                  // 通过 push 或 go 触发
                  if (location.url === url) {
                      instance.setHistory(location, pending.cursor);
                      instance.setRoute(location);
                      return;
                  }
                  instance.pending = UNDEFINED;
              }
              // 直接修改地址栏触发
              instance.parseLocation(url, function (location) {
                  if (location) {
                      instance.setHistory(location);
                      instance.setRoute(location);
                  }
                  else {
                      instance.push(instance.route404);
                  }
              });
          };
          instance.routes = [];
          instance.name2Path = {};
          instance.path2Route = {};
          instance.history = [];
          instance.cursor = -1;
          instance.hooks = new Hooks();
          Yox.array.each(options.routes, function (route) {
              instance.add(route);
          });
          instance.route404 = instance.add(route404)[0];
      }
      /**
       * 添加一个新的路由
       */
      Router.prototype.add = function (routeOptions) {
          var instance = this, newRoutes = [], pathStack = [], routeStack = [], addRoute = function (routeOptions) {
              var name = routeOptions.name, component = routeOptions.component, children = routeOptions.children, load = routeOptions.load, parentPath = Yox.array.last(pathStack), parentRoute = Yox.array.last(routeStack), path = formatPath(routeOptions.path, parentPath), route = { path: path, route: routeOptions }, params = [];
              Yox.array.each(path.split(SEPARATOR_PATH), function (item) {
                  if (Yox.string.startsWith(item, PREFIX_PARAM)) {
                      params.push(item.substr(PREFIX_PARAM.length));
                  }
              });
              if (params.length) {
                  route.params = params;
              }
              if (name) {
                  route.name = name;
              }
              // component 和 load 二选一
              if (component) {
                  route.component = component;
              }
              else if (load) {
                  route.load = load;
              }
              if (parentRoute) {
                  route.parent = parentRoute;
              }
              if (children) {
                  pathStack.push(path);
                  routeStack.push(route);
                  Yox.array.each(children, addRoute);
                  routeStack.pop();
                  pathStack.pop();
              }
              else {
                  newRoutes.push(route);
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
          addRoute(routeOptions);
          return newRoutes;
      };
      /**
       * 删除一个已注册的路由
       */
      Router.prototype.remove = function (route) {
          var instance = this;
          Yox.array.remove(instance.routes, route);
          if (route.name) {
              delete instance.name2Path[route.name];
          }
          delete instance.path2Route[route.path];
      };
      /**
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
          var instance = this, mode = instance.mode;
          instance.setUrl(toUrl(target, instance.name2Path), EMPTY_FUNCTION, EMPTY_FUNCTION, function (location, pending) {
              instance.pending = pending;
              if (mode.current() !== location.url) {
                  mode.push(location, instance.handler);
              }
              else {
                  instance.setRoute(location);
              }
          });
      };
      /**
       * 不改变 URL，只修改路由组件
       */
      Router.prototype.replace = function (target) {
          var instance = this;
          instance.setUrl(toUrl(target, instance.name2Path), function () {
              instance.replaceHistory(instance.location);
          }, EMPTY_FUNCTION, function (location, pending) {
              instance.pending = pending;
              instance.setRoute(location);
          });
      };
      /**
       * 前进或后退 n 步
       */
      Router.prototype.go = function (n) {
          var instance = this, mode = instance.mode, cursor = instance.cursor + n, location = instance.history[cursor];
          if (location) {
              instance.setUrl(stringifyUrl(location.path, location.params, location.query), EMPTY_FUNCTION, EMPTY_FUNCTION, function (location, pending) {
                  pending.cursor = cursor;
                  instance.pending = pending;
                  if (mode.current() !== location.url) {
                      mode.go(n);
                  }
                  else {
                      instance.setHistory(location, cursor);
                      instance.setRoute(location);
                  }
              });
          }
      };
      /**
       * 启动路由
       */
      Router.prototype.start = function () {
          this.mode.start(domApi, this.handler);
      };
      /**
       * 停止路由
       */
      Router.prototype.stop = function () {
          this.mode.stop(domApi, this.handler);
      };
      /**
       * 钩子函数
       */
      Router.prototype.hook = function (route, componentHook, hook, isGuard, callback) {
          var instance = this, location = instance.location, hooks = instance.hooks, pending = instance.pending;
          hooks
              .clear()
              // 先调用组件的钩子
              .add(route.component[componentHook], route.context)
              // 再调用路由配置的钩子
              .add(route.route[hook], route.route)
              // 最后调用路由实例的钩子
              .add(instance.options[hook], instance);
          var next = function (value) {
              if (value === UNDEFINED) {
                  hooks.next(next, isGuard, callback);
              }
              else {
                  // 只有前置守卫才有可能走进这里
                  // 此时 instance.location 还是旧地址
                  if (pending) {
                      pending.onAbort();
                      instance.pending = UNDEFINED;
                  }
                  if (value === FALSE) {
                      if (location) {
                          instance.push(location);
                      }
                  }
                  else {
                      // 跳转到别的路由
                      instance.push(value);
                  }
              }
          };
          next();
      };
      Router.prototype.setHistory = function (location, index) {
          var _a = this, history = _a.history, cursor = _a.cursor;
          // 如果没传 cursor，表示 push
          if (!Yox.is.number(index)) {
              index = cursor + 1;
              // 确保下一个为空
              // 如果不为空，肯定是调用过 go()，此时直接清掉后面的就行了
              if (history[index]) {
                  history.length = index;
              }
          }
          history[index] = location;
          this.cursor = index;
      };
      Router.prototype.replaceHistory = function (location) {
          var _a = this, history = _a.history, cursor = _a.cursor;
          if (history[cursor]) {
              history[cursor] = location;
          }
      };
      Router.prototype.setUrl = function (url, onComplete, onAbort, callback) {
          // 这里无需判断新旧 url 是否相同，因为存在 replace，即使它们相同也不等价于不用跳转
          var instance = this;
          instance.parseLocation(url, function (location) {
              if (location) {
                  callback(location, {
                      location: location,
                      onComplete: onComplete,
                      onAbort: onAbort
                  });
              }
              else {
                  Yox.logger.error("\"" + url + "\" can't match a route.");
              }
          });
      };
      Router.prototype.parseLocation = function (url, callback) {
          var realpath, search, index = url.indexOf(SEPARATOR_SEARCH);
          if (index >= 0) {
              realpath = url.slice(0, index);
              search = url.slice(index + 1);
          }
          else {
              realpath = url;
          }
          // 匹配已注册的 route
          var instance = this, realpathTerms = realpath.split(SEPARATOR_PATH), length = realpathTerms.length, matchRoute = function (routes, callback) {
              var index = 0, route;
              loop: while (route = routes[index++]) {
                  var path = route.path;
                  // 动态路由
                  if (route.params) {
                      var pathTerms = path.split(SEPARATOR_PATH);
                      // path 段数量必须一致，否则没有比较的意义
                      if (length === pathTerms.length) {
                          var params = {};
                          for (var i = 0; i < length; i++) {
                              if (Yox.string.startsWith(pathTerms[i], PREFIX_PARAM)) {
                                  params[pathTerms[i].substr(PREFIX_PARAM.length)] = parse(Yox, realpathTerms[i]);
                              }
                              // 非参数段不相同
                              else if (pathTerms[i] !== realpathTerms[i]) {
                                  continue loop;
                              }
                          }
                          callback(route, params);
                          return;
                      }
                  }
                  // 懒加载路由，前缀匹配成功后，意味着懒加载回来的路由一定有我们想要的
                  else if (route.load && Yox.string.startsWith(realpath, path)) {
                      route.load(function (lazyRoute) {
                          instance.remove(route);
                          matchRoute(instance.add(lazyRoute), callback);
                      });
                      return;
                  }
                  else if (path === realpath) {
                      callback(route);
                      return;
                  }
              }
              callback();
          };
          matchRoute(instance.routes, function (route, params) {
              if (route) {
                  var location = {
                      url: url,
                      path: route.path
                  };
                  if (params) {
                      location.params = params;
                  }
                  if (search) {
                      var query = parse$1(Yox, search);
                      if (query) {
                          location.query = query;
                      }
                  }
                  callback(location);
              }
              else {
                  callback();
              }
          });
      };
      Router.prototype.diffRoute = function (route, oldRoute, onComplete, startRoute, childRoute, oldTopRoute) {
          // 更新链路
          if (childRoute) {
              route.child = childRoute;
              childRoute.parent = route;
          }
          if (oldRoute) {
              // 同级的两个组件不同，疑似起始更新的路由
              if (oldRoute.component !== route.component) {
                  startRoute = route;
              }
              else {
                  // 把上次的组件实例搞过来
                  route.context = oldRoute.context;
              }
          }
          else {
              startRoute = route;
          }
          if (route.parent) {
              this.diffRoute(Yox.object.copy(route.parent), oldRoute ? oldRoute.parent : UNDEFINED, onComplete, startRoute, route, oldRoute || oldTopRoute);
              return;
          }
          // 整个组件树全换掉
          if (startRoute === route) {
              var context = void 0;
              // 当层级较多的路由切换到层级较少的路由
              if (oldRoute) {
                  while (oldRoute) {
                      context = oldRoute.context;
                      oldRoute = oldRoute.parent;
                  }
              }
              // 当层级较少的路由切换到层级较多的路由
              else if (oldTopRoute) {
                  context = oldTopRoute.context;
              }
              if (context) {
                  startRoute.context = context;
              }
          }
          // 到达根组件，结束
          onComplete(route, startRoute);
      };
      Router.prototype.patchRoute = function (route, startRoute) {
          var instance = this, location = instance.location;
          // 从上往下更新 props
          while (route) {
              var parent = route.parent, context = route.context, component = route.component;
              if (route === startRoute) {
                  if (parent) {
                      context = parent.context;
                      context.forceUpdate(filterProps(parent, location, parent.component));
                      context = context[ROUTE_VIEW];
                      if (context) {
                          var props = {}, name = ROUTE_COMPONENT + (++guid);
                          props[ROUTE_COMPONENT] = name;
                          context.component(name, component);
                          context.forceUpdate(props);
                      }
                  }
                  else {
                      if (context) {
                          context.destroy();
                      }
                      // 每层路由组件都有 $route 和 $router 属性
                      var extensions = {};
                      extensions[ROUTER] = instance;
                      extensions[ROUTE] = route;
                      route.context = new Yox(Yox.object.extend({
                          el: instance.el,
                          props: filterProps(route, location, component),
                          extensions: extensions
                      }, component));
                  }
              }
              else if (context) {
                  if (context.$vnode) {
                      context[ROUTE] = route;
                      context.forceUpdate(filterProps(route, location, component));
                  }
                  else {
                      route.context = UNDEFINED;
                  }
                  if (route.child) {
                      route = route.child;
                      continue;
                  }
              }
              break;
          }
      };
      Router.prototype.setRoute = function (location) {
          var instance = this, linkedRoute = instance.path2Route[location.path], redirect = linkedRoute.route.redirect;
          if (redirect) {
              if (Yox.is.func(redirect)) {
                  redirect = redirect(location);
              }
              if (redirect) {
                  instance.push(redirect);
                  return;
              }
          }
          var newRoute = Yox.object.copy(linkedRoute), oldRoute = instance.route, oldLocation = instance.location, enterRoute = function () {
              instance.diffRoute(newRoute, oldRoute, function (route, startRoute) {
                  instance.hook(newRoute, startRoute ? HOOK_BEFORE_ROUTE_ENTER : HOOK_BEFORE_ROUTE_UPDATE, startRoute ? HOOK_BEFORE_ENTER : HOOK_BEFORE_UPDATE, TRUE, function () {
                      instance.route = newRoute;
                      instance.location = location;
                      instance.patchRoute(route, startRoute);
                  });
              });
          };
          instance.hooks.setLocation(location, oldLocation);
          if (oldRoute && oldLocation && location.path !== oldLocation.path) {
              instance.hook(oldRoute, HOOK_BEFORE_ROUTE_LEAVE, HOOK_BEFORE_LEAVE, TRUE, enterRoute);
              return;
          }
          enterRoute();
      };
      return Router;
  }());
  var directive = {
      bind: function (node, directive, vnode) {
          // 当前组件如果是根组件，则没有 $root 属性
          var $root = vnode.context.$root || vnode.context, router = $root[ROUTER], listener = vnode.data[directive.key] = function (_) {
              var value = directive.value, getter = directive.getter, target = value;
              if (value && getter && Yox.string.has(value, '{')) {
                  target = getter();
              }
              router[directive.name](target);
          };
          if (vnode.isComponent) {
              node.on(EVENT_CLICK, listener);
          }
          else {
              domApi.on(node, EVENT_CLICK, listener);
          }
      },
      unbind: function (node, directive, vnode) {
          var listener = vnode.data[directive.key];
          if (vnode.isComponent) {
              node.off(EVENT_CLICK, listener);
          }
          else {
              domApi.off(node, EVENT_CLICK, listener);
          }
      }
  }, RouterView = {
      template: '<$' + ROUTE_COMPONENT + '/>',
      beforeCreate: function (options) {
          var $parent = options.parent, route = $parent[ROUTE].child;
          if (route) {
              $parent[ROUTE_VIEW] = this;
              var props = options.props = {}, components = options.components = {}, name = ROUTE_COMPONENT + (++guid);
              props[ROUTE_COMPONENT] = name;
              components[name] = route.component;
          }
      },
      beforeDestroy: function () {
          this.$parent[ROUTE_VIEW] = UNDEFINED;
      }
  };
  /**
   * 版本
   */
  var version = "1.0.0-alpha11";
  /**
   * 安装插件
   */
  function install(Class) {
      Yox = Class;
      domApi = Class.dom;
      Yox.directive({
          push: directive,
          replace: directive,
          go: directive
      });
      Yox.component('router-view', RouterView);
      var beforeCreate = Yox.beforeCreate, afterMount = Yox.afterMount, afterUpdate = Yox.afterUpdate, afterDestroy = Yox.afterDestroy;
      Yox.beforeCreate = function (options) {
          if (beforeCreate) {
              beforeCreate(options);
          }
          var parent = options.parent;
          // 处理 <router-view> 嵌入的组件
          if (parent && options.beforeCreate !== RouterView.beforeCreate) {
              // parent 是 <router-view> 实例，得再上一层才是路由组件
              parent = parent.$parent;
              if (parent) {
                  var router = parent[ROUTER], route = parent[ROUTE].child;
                  if (router && route) {
                      var extensions = options.extensions = {};
                      extensions[ROUTER] = router;
                      extensions[ROUTE] = route;
                      if (router.location) {
                          options.props = filterProps(route, router.location, options);
                      }
                  }
              }
          }
      };
      Yox.afterMount = function (instance) {
          updateRoute(instance, afterMount, HOOK_AFTER_ROUTE_ENTER, HOOK_AFTER_ENTER, TRUE);
      };
      Yox.afterUpdate = function (instance) {
          updateRoute(instance, afterUpdate, HOOK_AFTER_ROUTE_UPDATE, HOOK_AFTER_UPDATE, TRUE);
      };
      Yox.afterDestroy = function (instance) {
          updateRoute(instance, afterDestroy, HOOK_AFTER_ROUTE_LEAVE, HOOK_AFTER_LEAVE);
      };
  }

  exports.Router = Router;
  exports.install = install;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=yox-router.js.map
