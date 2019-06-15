import * as routerType from './type';
import YoxClass from '../../yox-type/src/interface/YoxClass';
import Location from '../../yox-type/src/router/Location';
import Hooks from './Hooks';
import * as hashMode from './mode/hash';
export declare class Router {
    el: Element;
    options: routerType.RouterOptions;
    routes: routerType.LinkedRoute[];
    route404: routerType.LinkedRoute;
    name2Path: Record<string, string>;
    path2Route: Record<string, routerType.LinkedRoute>;
    mode: typeof hashMode;
    history: Location[];
    cursor: number;
    pending?: routerType.Pending;
    hooks: Hooks;
    handler: Function;
    route?: routerType.LinkedRoute;
    location?: Location;
    constructor(options: routerType.RouterOptions);
    /**
     * 添加一个新的路由
     */
    add(routeOptions: routerType.RouteOptions): routerType.LinkedRoute[];
    /**
     * 删除一个已注册的路由
     */
    remove(route: routerType.LinkedRoute): void;
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
    push(target: routerType.Target): void;
    /**
     * 不改变 URL，只修改路由组件
     */
    replace(target: routerType.Target): void;
    /**
     * 前进或后退 n 步
     */
    go(n: number): void;
    /**
     * 启动路由
     */
    start(): void;
    /**
     * 停止路由
     */
    stop(): void;
    /**
     * 钩子函数
     */
    hook(route: routerType.LinkedRoute, componentHook: string, hook: string, isGuard?: boolean, callback?: routerType.Callback): void;
    private setHistory;
    private replaceHistory;
    private setUrl;
    private parseLocation;
    private diffRoute;
    private patchRoute;
    private setRoute;
}
/**
 * 版本
 */
export declare const version: string | undefined;
/**
 * 安装插件
 */
export declare function install(Class: YoxClass): void;
//# sourceMappingURL=Router.d.ts.map