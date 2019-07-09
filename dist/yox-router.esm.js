/**
 * yox-router.js v1.0.0-alpha.34
 * (c) 2017-2019 musicode
 * Released under the MIT License.
 */

const WINDOW = window;
const LOCATION = WINDOW.location;
const HISTORY = WINDOW.history;
// path 中的参数前缀，如 /user/:userId
const PREFIX_PARAM = ':';
// path 分隔符
const SEPARATOR_PATH = '/';
// path 和 search 的分隔符
const SEPARATOR_SEARCH = '?';
// query 分隔符
const SEPARATOR_QUERY = '&';
// 键值对分隔符
const SEPARATOR_PAIR = '=';
// 参数中的数组标识
const FLAG_ARRAY = '[]';
// 导航钩子 - 路由进入之前
const ROUTER_HOOK_BEFORE_ENTER = 'beforeEnter';
// 导航钩子 - 路由进入之后
const ROUTER_HOOK_AFTER_ENTER = 'afterEnter';
// 导航钩子 - 路由更新之前
const ROUTER_HOOK_BEFORE_UPDATE = 'beforeUpdate';
// 导航钩子 - 路由更新之后
const ROUTER_HOOK_AFTER_UPDATE = 'afterUpdate';
// 导航钩子 - 路由离开之前
const ROUTER_HOOK_BEFORE_LEAVE = 'beforeLeave';
// 导航钩子 - 路由离开之后
const ROUTER_HOOK_AFTER_LEAVE = 'afterLeave';

// 路由钩子
const HOOK_BEFORE_ROUTE_ENTER = 'beforeRouteEnter';
const HOOK_AFTER_ROUTE_ENTER = 'afterRouteEnter';
const HOOK_BEFORE_ROUTE_UPDATE = 'beforeRouteUpdate';
const HOOK_AFTER_ROUTE_UPDATE = 'afterRouteUpdate';
const HOOK_BEFORE_ROUTE_LEAVE = 'beforeRouteLeave';
const HOOK_AFTER_ROUTE_LEAVE = 'afterRouteLeave';

/**
 * 为了压缩，定义的常量
 */
const TRUE = true;
const FALSE = false;
const NULL = null;
const UNDEFINED = void 0;

const RAW_TRUE = 'true';
const RAW_FALSE = 'false';
const RAW_NULL = 'null';

/**
 * Single instance for noop function
 */
const EMPTY_FUNCTION = function () {
  /** yox */
};

/**
 * 空对象，很多地方会用到，比如 `a || EMPTY_OBJECT` 确保是个对象
 */
const EMPTY_OBJECT = Object.freeze({});

/**
 * 空数组
 */
const EMPTY_ARRAY = Object.freeze([]);

class Hooks {
    setLocation(to, from) {
        this.to = to;
        this.from = from;
        return this;
    }
    clear() {
        this.list = [];
        return this;
    }
    add(hook, ctx) {
        const { list } = this;
        if (hook) {
            list.push({
                fn: hook,
                ctx,
            });
        }
        return this;
    }
    next(next, isGuard, callback) {
        const task = this.list.shift();
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
    }
}

/**
 * 把字符串 value 解析成最合适的类型
 */
function parse(API, value) {
    let result;
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
    let result;
    API.array.each(query.split(SEPARATOR_QUERY), function (term) {
        let terms = term.split(SEPARATOR_PAIR), key = API.string.trim(terms[0]), value = terms[1];
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
    const result = [];
    for (let key in query) {
        const value = query[key];
        if (API.is.array(value)) {
            API.array.each(value, function (value) {
                const str = stringify(API, value);
                if (API.is.string(str)) {
                    result.push(key + FLAG_ARRAY + SEPARATOR_PAIR + str);
                }
            });
        }
        else {
            const str = stringify(API, value);
            if (API.is.string(str)) {
                result.push(key + SEPARATOR_PAIR + str);
            }
        }
    }
    return result.join(SEPARATOR_QUERY);
}

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
const HASH_PREFIX = '#!', HASH_CHANGE = 'hashchange';
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
    const href = LOCATION.href, index = href.indexOf(HASH_PREFIX);
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

const POP_STATE = 'popstate';
const isSupported = 'pushState' in HISTORY;
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

let API, hookEvents, guid = 0;
const ROUTER = '$router', ROUTE = '$route', ROUTE_VIEW = '$routeView', ROUTE_COMPONENT = 'RouteComponent', EVENT_CLICK = 'click';
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
        const terms = [];
        API.array.each(path.split(SEPARATOR_PATH), function (item) {
            terms.push(API.string.startsWith(item, PREFIX_PARAM) && params
                ? params[item.substr(PREFIX_PARAM.length)]
                : item);
        });
        path = terms.join(SEPARATOR_PATH);
    }
    if (query) {
        const queryStr = stringify$1(API, query);
        if (queryStr) {
            path += SEPARATOR_SEARCH + queryStr;
        }
    }
    return path;
}
function toUrl(target, name2Path) {
    if (API.is.string(target)) {
        return formatPath(target);
    }
    let route = target, name = route.name, path;
    if (name) {
        path = name2Path[name];
        {
            if (!API.is.string(path)) {
                API.logger.error(`The route of name[${name}] is not found.`);
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
    const result = {}, propTypes = options.propTypes;
    if (propTypes) {
        let props = location.query, routeParams = route.params, locationParams = location.params;
        // 从 location.params 挑出 route.params 定义过的参数
        if (routeParams && locationParams) {
            props = props ? API.object.copy(props) : {};
            for (let i = 0, length = routeParams.length; i < length; i++) {
                props[routeParams[i]] = locationParams[routeParams[i]];
            }
        }
        if (props) {
            for (let key in propTypes) {
                let value = props[key];
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
    const child = route.child;
    return !child || !child.context;
}
function updateRoute(instance, componentHookName, hookName, upsert) {
    const route = instance[ROUTE];
    if (route) {
        route.context = upsert ? instance : UNDEFINED;
        if (isLeafRoute(route)) {
            const router = instance[ROUTER];
            if (componentHookName && hookName) {
                router.hook(route, componentHookName, hookName);
            }
            if (upsert) {
                const { pending } = router;
                if (pending) {
                    pending.onComplete();
                    router.pending = UNDEFINED;
                }
            }
        }
    }
}
class Router {
    constructor(options) {
        const instance = this, el = options.el, route404 = options.route404 || default404;
        instance.options = options;
        instance.el = API.is.string(el)
            ? API.dom.find(el)
            : el;
        {
            if (!instance.el) {
                API.logger.error(`router.el is not an element.`);
                return;
            }
        }
        instance.mode = options.mode === 'history' && isSupported ? historyMode : hashMode;
        instance.handler = function () {
            const url = instance.mode.current(), { pending } = instance;
            if (pending) {
                const { location } = pending;
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
    }
    /**
     * 添加一个新的路由
     */
    add(routeOptions) {
        const instance = this, newRoutes = [], pathStack = [], routeStack = [], addRoute = function (routeOptions) {
            let { name, component, children, load } = routeOptions, parentPath = API.array.last(pathStack), parentRoute = API.array.last(routeStack), path = formatPath(routeOptions.path, parentPath), route = { path, route: routeOptions }, params = [];
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
                            API.logger.error(`Name[${name}] of the route is existed.`);
                            return;
                        }
                    }
                    instance.name2Path[name] = path;
                }
                {
                    if (API.object.has(instance.path2Route, path)) {
                        API.logger.error(`path [${path}] of the route is existed.`);
                        return;
                    }
                }
                instance.path2Route[path] = route;
            }
        };
        addRoute(routeOptions);
        return newRoutes;
    }
    /**
     * 删除一个已注册的路由
     */
    remove(route) {
        const instance = this;
        API.array.remove(instance.routes, route);
        if (route.name) {
            delete instance.name2Path[route.name];
        }
        delete instance.path2Route[route.path];
    }
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
     */
    push(target) {
        const instance = this, { mode } = instance;
        instance.setUrl(toUrl(target, instance.name2Path), EMPTY_FUNCTION, EMPTY_FUNCTION, function (location, pending) {
            instance.pending = pending;
            if (mode.current() !== location.url) {
                mode.push(location, instance.handler);
            }
            else {
                instance.setRoute(location);
            }
        });
    }
    /**
     * 不改变 URL，只修改路由组件
     */
    replace(target) {
        const instance = this;
        instance.setUrl(toUrl(target, instance.name2Path), function () {
            instance.replaceHistory(instance.location);
        }, EMPTY_FUNCTION, function (location, pending) {
            instance.pending = pending;
            instance.setRoute(location);
        });
    }
    /**
     * 前进或后退 n 步
     */
    go(n) {
        const instance = this, { mode } = instance, cursor = instance.cursor + n, location = instance.history[cursor];
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
    }
    /**
     * 启动路由
     */
    start() {
        this.mode.start(API.dom, this.handler);
    }
    /**
     * 停止路由
     */
    stop() {
        this.mode.stop(API.dom, this.handler);
    }
    /**
     * 钩子函数
     */
    hook(route, componentHook, hook, isGuard, callback) {
        const instance = this, { location, hooks, pending } = instance;
        hooks
            .clear()
            // 先调用组件的钩子
            .add(route.component[componentHook], route.context)
            // 再调用路由配置的钩子
            .add(route.route[hook], route.route)
            // 最后调用路由实例的钩子
            .add(instance.options[hook], instance);
        const next = function (value) {
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
    }
    setHistory(location, index) {
        const { history, cursor } = this;
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
    }
    replaceHistory(location) {
        const { history, cursor } = this;
        if (history[cursor]) {
            history[cursor] = location;
        }
    }
    setUrl(url, onComplete, onAbort, callback) {
        // 这里无需判断新旧 url 是否相同，因为存在 replace，即使它们相同也不等价于不用跳转
        const instance = this;
        instance.parseLocation(url, function (location) {
            if (location) {
                callback(location, {
                    location,
                    onComplete,
                    onAbort,
                });
            }
            else {
                API.logger.error(`"${url}" can't match a route.`);
            }
        });
    }
    parseLocation(url, callback) {
        let realpath, search, index = url.indexOf(SEPARATOR_SEARCH);
        if (index >= 0) {
            realpath = url.slice(0, index);
            search = url.slice(index + 1);
        }
        else {
            realpath = url;
        }
        // 匹配已注册的 route
        const instance = this, realpathTerms = realpath.split(SEPARATOR_PATH), length = realpathTerms.length, matchRoute = function (routes, callback) {
            let index = 0, route;
            loop: while (route = routes[index++]) {
                const path = route.path;
                // 动态路由
                if (route.params) {
                    const pathTerms = path.split(SEPARATOR_PATH);
                    // path 段数量必须一致，否则没有比较的意义
                    if (length === pathTerms.length) {
                        const params = {};
                        for (let i = 0; i < length; i++) {
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
                    const routeCallback = function (lazyRoute) {
                        instance.remove(route);
                        matchRoute(instance.add(lazyRoute['default'] || lazyRoute), callback);
                    };
                    const promise = route.load(routeCallback);
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
                const location = {
                    url,
                    path: route.path
                };
                if (params) {
                    location.params = params;
                }
                if (search) {
                    const query = parse$1(API, search);
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
    }
    diffRoute(route, oldRoute, onComplete, startRoute, childRoute, oldTopRoute) {
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
            let context;
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
    }
    patchRoute(route, startRoute) {
        const instance = this, location = instance.location;
        // 从上往下更新 props
        while (route) {
            let { parent, context, component } = route;
            if (route === startRoute) {
                if (parent) {
                    context = parent.context;
                    context.forceUpdate(filterProps(parent, location, parent.component));
                    context = context[ROUTE_VIEW];
                    if (context) {
                        const props = {}, name = ROUTE_COMPONENT + (++guid);
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
                    const extensions = {};
                    extensions[ROUTER] = instance;
                    extensions[ROUTE] = route;
                    const options = API.object.extend({
                        el: instance.el,
                        props: filterProps(route, location, component),
                        extensions,
                    }, component);
                    options.events = options.events
                        ? API.object.extend(options.events, hookEvents)
                        : hookEvents;
                    route.context = new API(options);
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
    }
    setRoute(location) {
        let instance = this, linkedRoute = instance.path2Route[location.path], redirect = linkedRoute.route.redirect;
        if (redirect) {
            if (API.is.func(redirect)) {
                redirect = redirect(location);
            }
            if (redirect) {
                instance.push(redirect);
                return;
            }
        }
        const newRoute = API.object.copy(linkedRoute), oldRoute = instance.route, oldLocation = instance.location, enterRoute = function () {
            instance.diffRoute(newRoute, oldRoute, function (route, startRoute) {
                instance.hook(newRoute, startRoute ? HOOK_BEFORE_ROUTE_ENTER : HOOK_BEFORE_ROUTE_UPDATE, startRoute ? ROUTER_HOOK_BEFORE_ENTER : ROUTER_HOOK_BEFORE_UPDATE, TRUE, function () {
                    instance.route = newRoute;
                    instance.location = location;
                    instance.patchRoute(route, startRoute);
                });
            });
        };
        instance.hooks.setLocation(location, oldLocation);
        if (oldRoute && oldLocation && location.path !== oldLocation.path) {
            instance.hook(oldRoute, HOOK_BEFORE_ROUTE_LEAVE, ROUTER_HOOK_BEFORE_LEAVE, TRUE, enterRoute);
            return;
        }
        enterRoute();
    }
}
const default404 = {
    path: '/404',
    component: {
        template: '<div>This is a default 404 page, please set "route404" for your own 404 page.</div>'
    }
}, directive = {
    bind(node, directive, vnode) {
        // 当前组件如果是根组件，则没有 $root 属性
        const $root = vnode.context.$root || vnode.context, router = $root[ROUTER], listener = vnode.data[directive.key] = function (_) {
            let { value, getter } = directive, target = value;
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
    unbind(node, directive, vnode) {
        const listener = vnode.data[directive.key];
        if (vnode.isComponent) {
            node.off(EVENT_CLICK, listener);
        }
        else {
            API.dom.off(node, EVENT_CLICK, listener);
        }
    },
}, RouterView = {
    template: '<$' + ROUTE_COMPONENT + '/>',
    beforeCreate(options) {
        const context = options.context, route = context[ROUTE].child;
        if (route) {
            context[ROUTE_VIEW] = this;
            const props = options.props = {}, components = options.components = {}, name = ROUTE_COMPONENT + (++guid);
            props[ROUTE_COMPONENT] = name;
            components[name] = route.component;
        }
    },
    beforeDestroy() {
        this.$context[ROUTE_VIEW] = UNDEFINED;
    }
};
/**
 * 版本
 */
const version = "1.0.0-alpha.34";
/**
 * 安装插件
 */
function install(Yox) {
    API = Yox;
    Yox.directive({
        push: directive,
        replace: directive,
        go: directive,
    });
    Yox.component('router-view', RouterView);
    hookEvents = {
        'beforeCreate.hook': function (event, data) {
            if (data) {
                let options = data, { context } = options;
                // 当前组件是 <router-view> 中的动态组件
                if (context && context.$options.beforeCreate === RouterView.beforeCreate) {
                    // 找到渲染 <router-view> 的父级组件，它是一定存在的
                    context = context.$context;
                    const router = context[ROUTER], route = context[ROUTE].child;
                    if (route) {
                        const extensions = options.extensions = {};
                        extensions[ROUTER] = router;
                        extensions[ROUTE] = route;
                        if (router.location) {
                            options.props = filterProps(route, router.location, options);
                        }
                    }
                }
            }
        },
        'afterMount.hook': function (event) {
            updateRoute(event.target, HOOK_AFTER_ROUTE_ENTER, ROUTER_HOOK_AFTER_ENTER, TRUE);
        },
        'afterUpdate.hook': function (event) {
            updateRoute(event.target, HOOK_AFTER_ROUTE_UPDATE, ROUTER_HOOK_AFTER_UPDATE, TRUE);
        },
        'afterDestroy.hook': function (event) {
            updateRoute(event.target, HOOK_AFTER_ROUTE_LEAVE, ROUTER_HOOK_AFTER_LEAVE);
        }
    };
}

export { Router, install, version };
//# sourceMappingURL=yox-router.esm.js.map
