import Yox from 'yox';
import { COMPONENT_HOOK_BEFORE_ENTER, COMPONENT_HOOK_AFTER_ENTER, COMPONENT_HOOK_BEFORE_UPDATE, COMPONENT_HOOK_AFTER_UPDATE, COMPONENT_HOOK_BEFORE_LEAVE, COMPONENT_HOOK_AFTER_LEAVE } from './constant';
import { Target, Location, RouterOptions, RouteOptions, LinkedRoute, RoutePending, RouterMode, RouteBeforeHook, RouteAfterHook } from './type';
import Hooks from './Hooks';
export declare class Router {
    el: Element;
    options: RouterOptions;
    routes: LinkedRoute[];
    route404: LinkedRoute;
    name2Path: Record<string, string>;
    path2Route: Record<string, LinkedRoute>;
    mode: RouterMode;
    history: Location[];
    cursor: number;
    pending?: RoutePending;
    hooks: Hooks;
    handler: Function;
    route?: LinkedRoute;
    location?: Location;
    constructor(options: RouterOptions);
    /**
     * 添加一个新的路由
     */
    add(routeOptions: RouteOptions): LinkedRoute[];
    /**
     * 删除一个已注册的路由
     */
    remove(route: LinkedRoute): void;
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
    push(target: Target): void;
    /**
     * 不改变 URL，只修改路由组件
     */
    replace(target: Target): void;
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
    hook(route: LinkedRoute, componentHook: string, hook: string, isGuard?: boolean, callback?: Function): void;
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
export declare function install(YoxClass: typeof Yox): void;
declare module 'yox' {
    interface ComponentOptions {
        [COMPONENT_HOOK_BEFORE_ENTER]?: RouteBeforeHook;
        [COMPONENT_HOOK_AFTER_ENTER]?: RouteAfterHook;
        [COMPONENT_HOOK_BEFORE_UPDATE]?: RouteBeforeHook;
        [COMPONENT_HOOK_AFTER_UPDATE]?: RouteAfterHook;
        [COMPONENT_HOOK_BEFORE_LEAVE]?: RouteBeforeHook;
        [COMPONENT_HOOK_AFTER_LEAVE]?: RouteAfterHook;
    }
    interface YoxInterface {
        $routeView?: YoxInterface;
        $route?: LinkedRoute;
        $router?: Router;
    }
}