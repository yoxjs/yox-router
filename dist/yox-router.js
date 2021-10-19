/**
 * yox-router.js v1.0.0-alpha.133
 * (c) 2017-2021 musicode
 * Released under the MIT License.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('yox')) :
  typeof define === 'function' && define.amd ? define(['exports', 'yox'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.YoxRouter = {}, global.Yox));
}(this, (function (exports, Yox) { 'use strict';

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
  // 导航钩子 - 路由懒加载开始
  var ROUTER_HOOK_BEFORE_LOAD = 'beforeLoad';
  // 导航钩子 - 路由懒加载结束
  var ROUTER_HOOK_AFTER_LOAD = 'afterLoad';
  // 组件 Options 上的导航钩子
  var COMPONENT_HOOK_BEFORE_ENTER = 'beforeRouteEnter';
  var COMPONENT_HOOK_AFTER_ENTER = 'afterRouteEnter';
  var COMPONENT_HOOK_BEFORE_UPDATE = 'beforeRouteUpdate';
  var COMPONENT_HOOK_AFTER_UPDATE = 'afterRouteUpdate';
  var COMPONENT_HOOK_BEFORE_LEAVE = 'beforeRouteLeave';
  var COMPONENT_HOOK_AFTER_LEAVE = 'afterRouteLeave';

  var Hooks = function () {};

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
  Hooks.prototype.next = function (isGuard, next$1, callback) {
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
  function parse$1(value) {
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
          else {
              result = decodeURIComponent(value);
          }
      }
      return result;
  }
  function stringify$1(value) {
      if (Yox.is.string(value)) {
          return encodeURIComponent(value);
      }
      else if (Yox.is.number(value) || Yox.is.boolean(value)) {
          return value.toString();
      }
      else if (value === NULL) {
          return RAW_NULL;
      }
  }

  /**
   * 把 GET 参数解析成对象
   */
  function parse(query) {
      var result;
      Yox.array.each(query.split(SEPARATOR_QUERY), function (term) {
          var terms = term.split(SEPARATOR_PAIR), key = Yox.string.trim(terms[0]), value = terms[1];
          if (key) {
              if (!result) {
                  result = {};
              }
              value = parse$1(value);
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
  function stringify(query) {
      var result = [];
      var loop = function ( key ) {
          var value = query[key];
          if (Yox.is.array(value)) {
              Yox.array.each(value, function (value) {
                  var str = stringify$1(value);
                  if (Yox.is.string(str)) {
                      result.push(key + FLAG_ARRAY + SEPARATOR_PAIR + str);
                  }
              });
          }
          else {
              var str = stringify$1(value);
              if (Yox.is.string(str)) {
                  result.push(key + SEPARATOR_PAIR + str);
              }
          }
      };

      for (var key in query) loop( key );
      return result.join(SEPARATOR_QUERY);
  }

  var POP_STATE = 'popstate';
  var isSupported = 'pushState' in HISTORY;
  function start$1(handler) {
      Yox.dom.on(WINDOW, POP_STATE, handler);
      handler();
  }
  function stop$1(handler) {
      Yox.dom.off(WINDOW, POP_STATE, handler);
  }
  function push$1(location, handler) {
      // 调用 pushState 不会触发 popstate 事件
      // 因此这里需要手动调用一次 handler
      HISTORY.pushState({}, '', location.url);
      handler();
  }
  function replace$1(location, handler) {
      // 调用 replaceState 不会触发 popstate 事件
      // 因此这里需要手动调用一次 handler
      replaceState(location.url, handler);
  }
  function go$1(n) {
      HISTORY.go(n);
  }
  function current$1() {
      return LOCATION.pathname + LOCATION.search;
  }
  function replaceState(url, handler) {
      // try...catch the pushState call to get around Safari
      // DOM Exception 18 where it limits to 100 pushState calls
      try {
          HISTORY.replaceState({}, '', url);
          handler();
      }
      catch (e) {
          LOCATION.replace(url);
      }
  }

  var historyMode = /*#__PURE__*/Object.freeze({
    __proto__: null,
    isSupported: isSupported,
    start: start$1,
    stop: stop$1,
    push: push$1,
    replace: replace$1,
    go: go$1,
    current: current$1,
    replaceState: replaceState
  });

  // hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
  var HASH_PREFIX = '#!', HASH_CHANGE = 'hashchange';
  function start(handler) {
      Yox.dom.on(WINDOW, HASH_CHANGE, handler);
      handler();
  }
  function stop(handler) {
      Yox.dom.off(WINDOW, HASH_CHANGE, handler);
  }
  function push(location, handler) {
      LOCATION.hash = HASH_PREFIX + location.url;
  }
  function replace(location, handler) {
      var url = LOCATION.protocol + '//' + LOCATION.host + LOCATION.pathname + HASH_PREFIX + location.url;
      if (isSupported) {
          replaceState(url, handler);
      }
      else {
          LOCATION.replace(url);
      }
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
    __proto__: null,
    start: start,
    stop: stop,
    push: push,
    replace: replace,
    go: go,
    current: current
  });

  var template404 = (function(){var $2=!0;return function(_a,_b,_c,_d,_e,_f,_g,_h,_i,_j,_k,_l,_m,_n,_o,_p,_q,_r,_s,_t,_u,_v,_w,_x,_y,_z,_A,_B,_C,_D,_E,_F,_G,_H,_I,_J,_K,_L,_M,_N,_O,_P,_U,_V,_S,_T){_S[_S.length]={context:_G,isPure:$2,isStatic:$2,operator:_B,tag:'div',text:'This is a default 404 page, please set "route404" for your own 404 page.',type:3};}})();

  var templatePlaceholder = (function(){var $2=!0;return function(_a,_b,_c,_d,_e,_f,_g,_h,_i,_j,_k,_l,_m,_n,_o,_p,_q,_r,_s,_t,_u,_v,_w,_x,_y,_z,_A,_B,_C,_D,_E,_F,_G,_H,_I,_J,_K,_L,_M,_N,_O,_P,_U,_V,_S,_T){_S[_S.length]=_T[_T.length]={context:_G,isComponent:$2,operator:_C,tag:'router-view',type:4};}})();

  var templateRouterView = (function(){var $2=!0;return function(_a,_b,_c,_d,_e,_f,_g,_h,_i,_j,_k,_l,_m,_n,_o,_p,_q,_r,_s,_t,_u,_v,_w,_x,_y,_z,_A,_B,_C,_D,_E,_F,_G,_H,_I,_J,_K,_L,_M,_N,_O,_P,_U,_V,_S,_T){_S[_S.length]=_T[_T.length]={context:_G,isComponent:$2,operator:_C,tag:_q('RouteComponent',_U.RouteComponent).value,type:4};}})();

  var guid = 0;
  var ROUTE_COMPONENT = 'RouteComponent', EVENT_CLICK = 'click';
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
          var terms = [];
          Yox.array.each(path.split(SEPARATOR_PATH), function (item) {
              terms.push(Yox.string.startsWith(item, PREFIX_PARAM) && params
                  ? params[item.substr(PREFIX_PARAM.length)]
                  : item);
          });
          path = terms.join(SEPARATOR_PATH);
      }
      if (query) {
          var queryStr = stringify(query);
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
              props = props ? Yox.object.copy(props) : {};
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
  var Router = function(options) {
      var instance = this, el = options.el, route404 = options.route404 || default404;
      instance.options = options;
      instance.el = Yox.is.string(el)
          ? Yox.dom.find(el)
          : el;
      {
          if (!instance.el) {
              Yox.logger.error("The \"el\" option must be an element or a selector.");
              return;
          }
      }
      instance.mode = options.mode === MODE_HISTORY && isSupported
          ? historyMode
          : hashMode;
      instance.handler = function () {
          // 从地址栏读取最新 url
          instance.parseLocation(instance.mode.current(), function (location) {
              if (location) {
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
      instance.hooks = new Hooks();
      Yox.array.each(options.routes, function (route) {
          instance.add(route);
      });
      instance.route404 = instance.add(route404)[0];
  };
  /**
   * 添加一个新的路由
   */
  Router.prototype.add = function (routeOptions, parentRoute) {
      var instance = this, newRoutes = [], pathStack = [], routeStack = [], addRoute = function (routeOptions) {
          var name = routeOptions.name;
              var component = routeOptions.component;
              var children = routeOptions.children;
              var load = routeOptions.load;
              var parentPath = Yox.array.last(pathStack), parentRoute = Yox.array.last(routeStack), path = formatPath(routeOptions.path, parentPath), route = { path: path, route: routeOptions }, params = [];
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
          if (load) {
              route.load = load;
          }
          else {
              // 每一级都必须有一个组件
              // 如果没有，则用占位组件，避免业务层写太多无用的组件
              route.component = component || placeholderComponent;
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
                          Yox.logger.error(("The name \"" + name + "\" of the route is existed."));
                          return;
                      }
                  }
                  instance.name2Path[name] = path;
              }
              {
                  if (Yox.object.has(instance.path2Route, path)) {
                      Yox.logger.error(("The path \"" + path + "\" of the route is existed."));
                      return;
                  }
              }
              instance.path2Route[path] = route;
          }
      };
      if (parentRoute) {
          pathStack.push(parentRoute.path);
          routeStack.push(parentRoute);
      }
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
  Router.prototype.push = function (target) {
      var instance = this;
          var mode = instance.mode;
      instance.setUrl(instance.toUrl(target), function (location) {
          if (mode.current() !== location.url) {
              mode.push(location, instance.handler);
          }
      });
  };
  /**
   * 替换当前路由栈
   */
  Router.prototype.replace = function (target) {
      var instance = this;
          var mode = instance.mode;
      instance.setUrl(instance.toUrl(target), function (location) {
          if (mode.current() !== location.url) {
              mode.replace(location, instance.handler);
          }
      });
  };
  /**
   * 前进或后退 n 步
   */
  Router.prototype.go = function (n) {
      this.mode.go(n);
  };
  /**
   * 启动路由
   */
  Router.prototype.start = function () {
      this.mode.start(this.handler);
  };
  /**
   * 停止路由
   */
  Router.prototype.stop = function () {
      this.mode.stop(this.handler);
  };
  /**
   * 钩子函数
   */
  Router.prototype.hook = function (route, componentHook, routerHook, isGuard, callback) {
      var instance = this;
          var location = instance.location;
          var hooks = instance.hooks;
          var pending = instance.pending;
          var context = route.context;
          var onComplete = function () {
          // 如果钩子未被拦截，则会走进 onComplete
          if (context) {
              Yox.lifeCycle.fire(context, componentHook, {
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
  Router.prototype.toUrl = function (target) {
      if (Yox.is.string(target)) {
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
          if (!Yox.is.string(path)) {
              Yox.logger.error("The path is not found.");
          }
      }
      return stringifyUrl(path, params, routeTarget.query);
  };
  Router.prototype.setUrl = function (url, callback) {
      // 这里无需判断新旧 url 是否相同，因为存在 replace，即使它们相同也不等价于不用跳转
      var instance = this;
      instance.parseLocation(url, function (location) {
          if (location) {
              callback(location);
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
      var instance = this;
          var options = instance.options;
          var routes = instance.routes;
          var location = instance.location;
          var realpathTerms = realpath.split(SEPARATOR_PATH), length = realpathTerms.length, createLocation = function (route, params) {
          var location = {
              url: url,
              path: route.path
          };
          if (params) {
              location.params = params;
          }
          if (search) {
              var query = parse(search);
              if (query) {
                  location.query = query;
              }
          }
          return location;
      }, matchRoute = function (route, callback) {
          var path = route.path;
          // 动态路由
          if (route.params) {
              var pathTerms = path.split(SEPARATOR_PATH);
              // path 段数量必须一致，否则没有比较的意义
              if (length === pathTerms.length) {
                  var params = {};
                  for (var i = 0; i < length; i++) {
                      if (Yox.string.startsWith(pathTerms[i], PREFIX_PARAM)) {
                          params[pathTerms[i].substr(PREFIX_PARAM.length)] = parse$1(realpathTerms[i]);
                      }
                      // 非参数段不相同
                      else if (pathTerms[i] !== realpathTerms[i]) {
                          return;
                      }
                  }
                  return callback(createLocation(route, params));
              }
          }
          // 懒加载路由，前缀匹配成功后，意味着懒加载回来的路由一定有我们想要的
          else if (route.load && Yox.string.startsWith(realpath, path)) {
              if (route.loading) {
                  return TRUE;
              }
              var beforeLoad = options[ROUTER_HOOK_BEFORE_LOAD], afterLoad = options[ROUTER_HOOK_AFTER_LOAD], routeCallback = function (lazyRoute) {
                  instance.remove(route);
                  // 支持函数，方便动态生成路由，比如根据权限创建不同的路由
                  var lazyRouteOptions = lazyRoute['default'] || lazyRoute;
                  if (Yox.is.func(lazyRouteOptions)) {
                      lazyRouteOptions = lazyRouteOptions();
                  }
                  // 注册新的路由
                  var newRoutes = instance.add(lazyRouteOptions, route.parent);
                  // 懒加载到此结束
                  route.loading = FALSE;
                  if (location === instance.location) {
                      matchRoutes(newRoutes, function (newLocation) {
                          if (afterLoad) {
                              afterLoad.call(instance, realpath, newLocation);
                          }
                          return callback(newLocation);
                      });
                  }
                  else if (afterLoad) {
                      afterLoad.call(instance, realpath);
                  }
              };
              route.loading = TRUE;
              if (beforeLoad) {
                  beforeLoad.call(instance, realpath);
              }
              var promise = route.load(routeCallback);
              if (promise) {
                  promise.then(routeCallback);
              }
              return TRUE;
          }
          else if (path === realpath) {
              return callback(createLocation(route));
          }
      }, matchRoutes = function (routes, callback) {
          for (var i = 0, length = routes.length; i < length; i++) {
              if (matchRoute(routes[i], callback)) {
                  return;
              }
          }
          callback();
      };
      matchRoutes(routes, function (location) {
          {
              if (!location) {
                  Yox.logger.error(("The path \"" + realpath + "\" can't match a route."));
              }
          }
          callback(location);
          return TRUE;
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
  Router.prototype.patchRoute = function (route, startRoute) {
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
                  route.context = new Yox(Yox.object.extend({
                      el: instance.el,
                      props: filterProps(route, location, component),
                      // 每层路由组件都有 $route 和 $router 属性
                      extensions: {
                          $router: instance,
                          $route: route
                      },
                  }, component));
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
          template: template404
      }
  }, 
  // 占位组件
  placeholderComponent = {
      template: templatePlaceholder
  }, directive = {
      bind: function(node, directive, vnode) {
          // 当前组件如果是根组件，则没有 $root 属性
          var $root = vnode.context.$root || vnode.context, router = $root.$router, listener = vnode.data[directive.key] = function (_) {
              var value = directive.value;
              var getter = directive.getter;
              var target = value;
              if (value && getter && Yox.string.has(value, '{')) {
                  target = getter();
              }
              router[directive.name](target);
          };
          if (vnode.isComponent) {
              node.on(EVENT_CLICK, listener);
          }
          else {
              Yox.dom.on(node, EVENT_CLICK, listener);
          }
      },
      unbind: function(node, directive, vnode) {
          var listener = vnode.data[directive.key];
          if (vnode.isComponent) {
              node.off(EVENT_CLICK, listener);
          }
          else {
              Yox.dom.off(node, EVENT_CLICK, listener);
          }
      },
  }, RouterView = {
      template: templateRouterView,
      beforeCreate: function(options) {
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
      beforeDestroy: function() {
          this.$context.$routeView = UNDEFINED;
      }
  };
  Yox.lifeCycle
      .on('beforeCreate', function (_, data) {
      var options = data.options;
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
  })
      .on('afterMount', function (component) {
      updateRoute(component, COMPONENT_HOOK_AFTER_ENTER, ROUTER_HOOK_AFTER_ENTER, TRUE);
  })
      .on('afterUpdate', function (component) {
      updateRoute(component, COMPONENT_HOOK_AFTER_UPDATE, ROUTER_HOOK_AFTER_UPDATE, TRUE);
  })
      .on('afterDestroy', function (component) {
      updateRoute(component, COMPONENT_HOOK_AFTER_LEAVE, ROUTER_HOOK_AFTER_LEAVE);
  });
  /**
   * 版本
   */
  var version = "1.0.0-alpha.133";
  /**
   * 安装插件
   */
  function install(Y) {
      Y.directive({
          push: directive,
          replace: directive,
          go: directive,
      });
      Y.component('router-view', RouterView);
  }

  exports.Router = Router;
  exports.install = install;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=yox-router.js.map
