import * as type from '../../yox-type/src/type';
import Yox from '../../yox-type/src/interface/Yox';
import YoxOptions from '../../yox-type/src/options/Yox';
import Location from '../../yox-type/src/router/Location';
import RouteTarget from '../../yox-type/src/router/RouteTarget';
import * as constant from './constant';
export declare type Target = string | RouteTarget;
export declare type Redirect = (to: Location) => Target;
export declare type Callback = () => void;
export declare type RouteCallback = (route: RouteOptions) => void;
export declare type RouteLoader = (callback: RouteCallback) => void;
export interface RouterOptions {
    el: Element | string;
    routes: RouteOptions[];
    route404?: RouteOptions;
    mode?: 'hash' | 'history';
    [constant.HOOK_BEFORE_ENTER]?: type.yoxRouterBeforeHook;
    [constant.HOOK_AFTER_ENTER]?: type.yoxRouterAfterHook;
    [constant.HOOK_BEFORE_LEAVE]?: type.yoxRouterBeforeHook;
    [constant.HOOK_AFTER_LEAVE]?: type.yoxRouterAfterHook;
}
export interface RouteOptions {
    path: string;
    component?: YoxOptions;
    name?: string;
    load?: RouteLoader;
    redirect?: Target | Redirect;
    children?: RouteOptions[];
    [constant.HOOK_BEFORE_ENTER]?: type.yoxRouterBeforeHook;
    [constant.HOOK_AFTER_ENTER]?: type.yoxRouterAfterHook;
    [constant.HOOK_BEFORE_LEAVE]?: type.yoxRouterBeforeHook;
    [constant.HOOK_AFTER_LEAVE]?: type.yoxRouterAfterHook;
}
export interface LinkedRoute {
    path: string;
    route: RouteOptions;
    name?: string;
    load?: RouteLoader;
    component?: YoxOptions;
    params?: string[];
    context?: Yox;
    parent?: LinkedRoute;
    child?: LinkedRoute;
}
export interface Pending {
    cursor?: number;
    location: Location;
    onComplete: Callback;
    onAbort: Callback;
}
//# sourceMappingURL=type.d.ts.map