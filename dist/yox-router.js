/**
 * yox-router.js v1.0.0-alpha.46
 * (c) 2017-2019 musicode
 * Released under the MIT License.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.YoxRouter = {}));
}(this, function (exports) { 'use strict';

  var WINDOW = window;
  var LOCATION = WINDOW.location;
  var HISTORY = WINDOW.history;
  var UNDEFINED = void 0;
  var NULL = null;
  var TRUE = true;
  var FALSE = false;
  var RAW_NULL = 'null';
  var RAW_TRUE = 'true';
  var RAW_FALSE = 'false';
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
  // history 模式
  var MODE_HISTORY = 'history';
  // 导航钩子 - 路由进入之前
  var ROUTER_HOOK_BEFORE_ENTER = 'beforeEnter';
  // 导航钩子 - 路由进入之后
  var ROUTER_HOOK_AFTER_ENTER = 'afterEnter';
  // 导航钩子 - 路由更新之前
  var ROUTER_HOOK_BEFORE_UPDATE = 'beforeUpdate';
  // 导航钩子 - 路由更新之后
  var ROUTER_HOOK_AFTER_UPDATE = 'afterUpdate';
  // 导航钩子 - 路由离开之前
  var ROUTER_HOOK_BEFORE_LEAVE = 'beforeLeave';
  // 导航钩子 - 路由离开之后
  var ROUTER_HOOK_AFTER_LEAVE = 'afterLeave';
  // 组件 Options 上的导航钩子
  var COMPONENT_HOOK_BEFORE_ENTER = 'beforeRouteEnter';
  var COMPONENT_HOOK_AFTER_ENTER = 'afterRouteEnter';
  var COMPONENT_HOOK_BEFORE_UPDATE = 'beforeRouteUpdate';
  var COMPONENT_HOOK_AFTER_UPDATE = 'afterRouteUpdate';
  var COMPONENT_HOOK_BEFORE_LEAVE = 'beforeRouteLeave';
  var COMPONENT_HOOK_AFTER_LEAVE = 'afterRouteLeave';

  var Hooks = function Hooks () {};

  Hooks.prototype.setLocation = function setLocation (to, from) {
      this.to = to;
      this.from = from;
      return this;
  };
  Hooks.prototype.clear = function clear () {
      this.list = [];
      return this;
  };
  Hooks.prototype.add = function add (hook, ctx) {
      var ref = this;
          var list = ref.list;
      if (hook) {
          list.push({
              fn: hook,
              ctx: ctx,
          });
      }
      return this;
  };
  Hooks.prototype.next = function next (isGuard, next$1, callback) {
      var task = this.list.shift();
      if (task) {
          if (isGuard) {
              task.fn.call(task.ctx, this.to, this.from, next$1);
          }
          else {
              task.fn.call(task.ctx, this.to, this.from);
              next$1();
          }
      }
      else {
          callback();
      }
  };

  /**
   * 把字符串 value 解析成最合适的类型
   */
  function parse(API, value) {
      var result;
      if (API.is.numeric(value)) {
          result = +value;
      }
      else if (API.is.string(value)) {
          if (value === RAW_TRUE) {
              result = TRUE;
          }
          else if (value === RAW_FALSE) {
              result = FALSE;
          }
          else if (value === RAW_NULL) {
              result = NULL;
          }
          else {
              result = decodeURIComponent(value);
          }
      }
      return result;
  }
  function stringify(API, value) {
      if (API.is.string(value)) {
          return encodeURIComponent(value);
      }
      else if (API.is.number(value) || API.is.boolean(value)) {
          return value.toString();
      }
      else if (value === NULL) {
          return RAW_NULL;
      }
  }

  /**
   * 把 GET 参数解析成对象
   */
  function parse$1(API, query) {
      var result;
      API.array.each(query.split(SEPARATOR_QUERY), function (term) {
          var terms = term.split(SEPARATOR_PAIR), key = API.string.trim(terms[0]), value = terms[1];
          if (key) {
              if (!result) {
                  result = {};
              }
              value = parse(API, value);
              if (API.string.endsWith(key, FLAG_ARRAY)) {
                  key = API.string.slice(key, 0, -FLAG_ARRAY.length);
                  API.array.push(result[key] || (result[key] = []), value);
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
  function stringify$1(API, query) {
      var result = [];
      var loop = function ( key ) {
          var value = query[key];
          if (API.is.array(value)) {
              API.array.each(value, function (value) {
                  var str = stringify(API, value);
                  if (API.is.string(str)) {
                      result.push(key + FLAG_ARRAY + SEPARATOR_PAIR + str);
                  }
              });
          }
          else {
              var str = stringify(API, value);
              if (API.is.string(str)) {
                  result.push(key + SEPARATOR_PAIR + str);
              }
          }
      };

      for (var key in query) loop( key );
      return result.join(SEPARATOR_QUERY);
  }

  // hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
  var HASH_PREFIX = '#!', HASH_CHANGE = 'hashchange';
  function start(api, handler) {
      api.on(WINDOW, HASH_CHANGE, handler);
      handler();
  }
  function stop(api, handler) {
      api.off(WINDOW, HASH_CHANGE, handler);
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
  function start$1(api, handler) {
      api.on(WINDOW, POP_STATE, handler);
      handler();
  }
  function stop$1(api, handler) {
      api.off(WINDOW, POP_STATE, handler);
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

  var API, hookEvents, guid = 0;
  var ROUTE_COMPONENT = 'RouteComponent', NAMESPACE_HOOK = '.hook', EVENT_CLICK = 'click', EMPTY_FUNCTION = new Function();
  /**
   * 格式化路径，确保它以 / 开头，不以 / 结尾
   */
  function formatPath(path, parentPath) {
      // 如果不是 / 开头，表示是相对路径
      if (!API.string.startsWith(path, SEPARATOR_PATH)) {
          // 确保 parentPath 以 / 结尾
          if (parentPath) {
              if (!API.string.endsWith(parentPath, SEPARATOR_PATH)) {
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
          && API.string.endsWith(path, SEPARATOR_PATH)) {
          path = API.string.slice(path, 0, -SEPARATOR_PATH.length);
      }
      return path;
  }
  /**
   * 把结构化数据序列化成 url
   */
  function stringifyUrl(path, params, query) {
      if (/\/\:\w+/.test(path)) {
          var terms = [];
          API.array.each(path.split(SEPARATOR_PATH), function (item) {
              terms.push(API.string.startsWith(item, PREFIX_PARAM) && params
                  ? params[item.substr(PREFIX_PARAM.length)]
                  : item);
          });
          path = terms.join(SEPARATOR_PATH);
      }
      if (query) {
          var queryStr = stringify$1(API, query);
          if (queryStr) {
              path += SEPARATOR_SEARCH + queryStr;
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
          // 从 location.params 挑出 route.params 定义过的参数
          if (routeParams && locationParams) {
              props = props ? API.object.copy(props) : {};
              for (var i = 0, length = routeParams.length; i < length; i++) {
                  props[routeParams[i]] = locationParams[routeParams[i]];
              }
          }
          if (props) {
              for (var key in propTypes) {
                  var value = props[key];
                  if (value !== UNDEFINED) {
                      result[key] = value;
                  }
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
  function updateRoute(instance, componentHookName, routerHookName, upsert) {
      var route = instance.$route;
      if (route) {
          route.context = upsert ? instance : UNDEFINED;
          if (isLeafRoute(route)) {
              var router = instance.$router;
              if (componentHookName && routerHookName) {
                  router.hook(route, componentHookName, routerHookName, FALSE);
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
  var Router = function Router(options) {
      var instance = this, el = options.el, route404 = options.route404 || default404;
      instance.options = options;
      instance.el = API.is.string(el)
          ? API.dom.find(el)
          : el;
      {
          if (!instance.el) {
              API.logger.error("The \"el\" option must be an element or a selector.");
              return;
          }
      }
      instance.mode = options.mode === MODE_HISTORY && isSupported
          ? historyMode
          : hashMode;
      instance.handler = function () {
          var url = instance.mode.current();
          var pending = instance.pending;
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
      API.array.each(options.routes, function (route) {
          instance.add(route);
      });
      instance.route404 = instance.add(route404)[0];
  };
  /**
   * 添加一个新的路由
   */
  Router.prototype.add = function add (routeOptions) {
      var instance = this, newRoutes = [], pathStack = [], routeStack = [], addRoute = function (routeOptions) {
          var name = routeOptions.name;
              var component = routeOptions.component;
              var children = routeOptions.children;
              var load = routeOptions.load;
              var parentPath = API.array.last(pathStack), parentRoute = API.array.last(routeStack), path = formatPath(routeOptions.path, parentPath), route = { path: path, route: routeOptions }, params = [];
          API.array.each(path.split(SEPARATOR_PATH), function (item) {
              if (API.string.startsWith(item, PREFIX_PARAM)) {
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
              API.array.each(children, addRoute);
              routeStack.pop();
              pathStack.pop();
          }
          else {
              newRoutes.push(route);
              instance.routes.push(route);
              if (name) {
                  {
                      if (API.object.has(instance.name2Path, name)) {
                          API.logger.error(("The name \"" + name + "\" of the route is existed."));
                          return;
                      }
                  }
                  instance.name2Path[name] = path;
              }
              {
                  if (API.object.has(instance.path2Route, path)) {
                      API.logger.error(("The path \"" + path + "\" of the route is existed."));
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
  Router.prototype.remove = function remove (route) {
      var instance = this;
      API.array.remove(instance.routes, route);
      if (route.name) {
          delete instance.name2Path[route.name];
      }
      delete instance.path2Route[route.path];
  };
  /**
   * target 有 3 种格式：
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
   * 也可以不传 path 或 name，只传 params 或 query
   * 表示不修改 path，仅修改 params 或 query
   *
   */
  Router.prototype.push = function push (target) {
      var instance = this;
          var mode = instance.mode;
      instance.setUrl(instance.toUrl(target), EMPTY_FUNCTION, EMPTY_FUNCTION, function (location, pending) {
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
  Router.prototype.replace = function replace (target) {
      var instance = this;
      instance.setUrl(instance.toUrl(target), function () {
          instance.replaceHistory(instance.location);
      }, EMPTY_FUNCTION, function (location, pending) {
          instance.pending = pending;
          instance.setRoute(location);
      });
  };
  /**
   * 前进或后退 n 步
   */
  Router.prototype.go = function go (n) {
      var instance = this;
          var mode = instance.mode;
          var cursor = instance.cursor + n, location = instance.history[cursor];
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
  Router.prototype.start = function start () {
      this.mode.start(API.dom, this.handler);
  };
  /**
   * 停止路由
   */
  Router.prototype.stop = function stop () {
      this.mode.stop(API.dom, this.handler);
  };
  /**
   * 钩子函数
   */
  Router.prototype.hook = function hook (route, componentHook, routerHook, isGuard, callback) {
      var instance = this;
          var location = instance.location;
          var hooks = instance.hooks;
          var pending = instance.pending;
          var context = route.context;
          var onComplete = function () {
          // 如果钩子未被拦截，则会走进 onComplete
          // 这里要把钩子事件冒泡上去，便于业务层处理
          // 加命名空间是为了和 yox 生命周期钩子事件保持一致
          if (context) {
              context.fire(componentHook + NAMESPACE_HOOK, {
                  from: hooks.from,
                  to: hooks.to,
              });
          }
          // 在发事件之后调用 callback
          // 因为 callback 有可能销毁组件，导致事件发不出去
          if (callback) {
              callback();
          }
      }, next = function (value) {
          if (value === UNDEFINED) {
              hooks.next(isGuard, next, onComplete);
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
      hooks
          .clear()
          // 先调用组件的钩子
          .add(route.component[componentHook], context)
          // 再调用路由配置的钩子
          .add(route.route[routerHook], route.route)
          // 最后调用路由实例的钩子
          .add(instance.options[routerHook], instance);
      next();
  };
  Router.prototype.setHistory = function setHistory (location, index) {
      var ref = this;
          var history = ref.history;
          var cursor = ref.cursor;
      // 如果没传 cursor，表示 push
      if (!API.is.number(index)) {
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
  Router.prototype.replaceHistory = function replaceHistory (location) {
      var ref = this;
          var history = ref.history;
          var cursor = ref.cursor;
      if (history[cursor]) {
          history[cursor] = location;
      }
  };
  Router.prototype.toUrl = function toUrl (target) {
      if (API.is.string(target)) {
          return formatPath(target);
      }
      var instance = this, location = instance.location, routeTarget = target, params = routeTarget.params, path;
      if (routeTarget.name) {
          path = instance.name2Path[routeTarget.name];
      }
      else if (routeTarget.path) {
          path = formatPath(routeTarget.path);
      }
      else if (location) {
          path = location.path;
          if (!params) {
              params = location.params;
          }
      }
      {
          if (!API.is.string(path)) {
              API.logger.error("The path is not found.");
          }
      }
      return stringifyUrl(path, params, routeTarget.query);
  };
  Router.prototype.setUrl = function setUrl (url, onComplete, onAbort, callback) {
      // 这里无需判断新旧 url 是否相同，因为存在 replace，即使它们相同也不等价于不用跳转
      var instance = this;
      instance.parseLocation(url, function (location) {
          if (location) {
              callback(location, {
                  location: location,
                  onComplete: onComplete,
                  onAbort: onAbort,
              });
          }
      });
  };
  Router.prototype.parseLocation = function parseLocation (url, callback) {
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
                          if (API.string.startsWith(pathTerms[i], PREFIX_PARAM)) {
                              params[pathTerms[i].substr(PREFIX_PARAM.length)] = parse(API, realpathTerms[i]);
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
              else if (route.load && API.string.startsWith(realpath, path)) {
                  var routeCallback = function (lazyRoute) {
                      instance.remove(route);
                      matchRoute(instance.add(lazyRoute['default'] || lazyRoute), callback);
                  };
                  var promise = route.load(routeCallback);
                  if (promise) {
                      promise.then(routeCallback);
                  }
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
                  var query = parse$1(API, search);
                  if (query) {
                      location.query = query;
                  }
              }
              callback(location);
          }
          else {
              {
                  API.logger.error(("The path \"" + realpath + "\" can't match a route."));
              }
              callback();
          }
      });
  };
  Router.prototype.diffRoute = function diffRoute (route, oldRoute, onComplete, startRoute, childRoute, oldTopRoute) {
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
          this.diffRoute(API.object.copy(route.parent), oldRoute ? oldRoute.parent : UNDEFINED, onComplete, startRoute, route, oldRoute || oldTopRoute);
          return;
      }
      // 整个组件树全换掉
      if (startRoute === route) {
          var context;
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
  Router.prototype.patchRoute = function patchRoute (route, startRoute) {
      var instance = this, location = instance.location;
      // 从上往下更新 props
      while (route) {
          var parent = route.parent;
              var context = route.context;
              var component = route.component;
          if (route === startRoute) {
              if (parent) {
                  context = parent.context;
                  context.forceUpdate(filterProps(parent, location, parent.component));
                  context = context.$routeView;
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
                  var extensions = {
                      $router: instance,
                      $route: route
                  };
                  var options = API.object.extend({
                      el: instance.el,
                      props: filterProps(route, location, component),
                      extensions: extensions,
                  }, component);
                  options.events = options.events
                      ? API.object.extend(options.events, hookEvents)
                      : hookEvents;
                  route.context = new API(options);
              }
          }
          else if (context) {
              if (context.$vnode) {
                  context.$route = route;
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
  Router.prototype.setRoute = function setRoute (location) {
      var instance = this, linkedRoute = instance.path2Route[location.path], redirect = linkedRoute.route.redirect;
      if (redirect) {
          if (API.is.func(redirect)) {
              redirect = redirect(location);
          }
          if (redirect) {
              instance.push(redirect);
              return;
          }
      }
      var newRoute = API.object.copy(linkedRoute), oldRoute = instance.route, oldLocation = instance.location, enterRoute = function () {
          instance.diffRoute(newRoute, oldRoute, function (route, startRoute) {
              instance.hook(newRoute, startRoute ? COMPONENT_HOOK_BEFORE_ENTER : COMPONENT_HOOK_BEFORE_UPDATE, startRoute ? ROUTER_HOOK_BEFORE_ENTER : ROUTER_HOOK_BEFORE_UPDATE, TRUE, function () {
                  instance.route = newRoute;
                  instance.location = location;
                  instance.patchRoute(route, startRoute);
              });
          });
      };
      instance.hooks.setLocation(location, oldLocation);
      if (oldRoute && oldLocation && location.path !== oldLocation.path) {
          instance.hook(oldRoute, COMPONENT_HOOK_BEFORE_LEAVE, ROUTER_HOOK_BEFORE_LEAVE, TRUE, enterRoute);
          return;
      }
      enterRoute();
  };
  var default404 = {
      path: '/404',
      component: {
          template: '<div>This is a default 404 page, please set "route404" for your own 404 page.</div>'
      }
  }, directive = {
      bind: function bind(node, directive, vnode) {
          // 当前组件如果是根组件，则没有 $root 属性
          var $root = vnode.context.$root || vnode.context, router = $root.$router, listener = vnode.data[directive.key] = function (_) {
              var value = directive.value;
              var getter = directive.getter;
              var target = value;
              if (value && getter && API.string.has(value, '{')) {
                  target = getter();
              }
              router[directive.name](target);
          };
          if (vnode.isComponent) {
              node.on(EVENT_CLICK, listener);
          }
          else {
              API.dom.on(node, EVENT_CLICK, listener);
          }
      },
      unbind: function unbind(node, directive, vnode) {
          var listener = vnode.data[directive.key];
          if (vnode.isComponent) {
              node.off(EVENT_CLICK, listener);
          }
          else {
              API.dom.off(node, EVENT_CLICK, listener);
          }
      },
  }, RouterView = {
      template: '<$' + ROUTE_COMPONENT + '/>',
      beforeCreate: function beforeCreate(options) {
          var context = options.context, 
          // context 一定有 $route 属性
          route = context.$route.child;
          if (route) {
              context.$routeView = this;
              var props = options.props = {}, components = options.components = {}, name = ROUTE_COMPONENT + (++guid);
              props[ROUTE_COMPONENT] = name;
              components[name] = route.component;
          }
      },
      beforeDestroy: function beforeDestroy() {
          this.$context.$routeView = UNDEFINED;
      }
  };
  /**
   * 版本
   */
  var version = "1.0.0-alpha.46";
  /**
   * 安装插件
   */
  function install(Y) {
      API = Y;
      API.directive({
          push: directive,
          replace: directive,
          go: directive,
      });
      API.component('router-view', RouterView);
      hookEvents = {};
      hookEvents['beforeCreate' + NAMESPACE_HOOK] = function (event, data) {
          if (data) {
              var options = data;
              var context = options.context;
              // 当前组件是 <router-view> 中的动态组件
              if (context && context.$options.beforeCreate === RouterView.beforeCreate) {
                  // 找到渲染 <router-view> 的父级组件，它是一定存在的
                  context = context.$context;
                  var router = context.$router, 
                  // context 一定有 $route 属性
                  route = context.$route.child;
                  if (route) {
                      options.extensions = {
                          $router: router,
                          $route: route,
                      };
                      if (router.location) {
                          options.props = filterProps(route, router.location, options);
                      }
                  }
              }
          }
      };
      hookEvents['afterMount' + NAMESPACE_HOOK] = function (event) {
          updateRoute(event.target, COMPONENT_HOOK_AFTER_ENTER, ROUTER_HOOK_AFTER_ENTER, TRUE);
      };
      hookEvents['afterUpdate' + NAMESPACE_HOOK] = function (event) {
          updateRoute(event.target, COMPONENT_HOOK_AFTER_UPDATE, ROUTER_HOOK_AFTER_UPDATE, TRUE);
      };
      hookEvents['afterDestroy' + NAMESPACE_HOOK] = function (event) {
          updateRoute(event.target, COMPONENT_HOOK_AFTER_LEAVE, ROUTER_HOOK_AFTER_LEAVE);
      };
  }

  exports.Router = Router;
  exports.install = install;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=yox-router.js.map
