import { Location, RouteTarget, routerBeforeHook, routerAfterHook } from '../../yox-type/src/type';
import { YoxOptions, YoxInterface } from '../../yox-type/src/global';
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
    [constant.HOOK_BEFORE_ENTER]?: routerBeforeHook;
    [constant.HOOK_AFTER_ENTER]?: routerAfterHook;
    [constant.HOOK_BEFORE_LEAVE]?: routerBeforeHook;
    [constant.HOOK_AFTER_LEAVE]?: routerAfterHook;
}
export interface RouteOptions {
    path: string;
    component?: YoxOptions;
    name?: string;
    load?: RouteLoader;
    redirect?: Target | Redirect;
    children?: RouteOptions[];
    [constant.HOOK_BEFORE_ENTER]?: routerBeforeHook;
    [constant.HOOK_AFTER_ENTER]?: routerAfterHook;
    [constant.HOOK_BEFORE_LEAVE]?: routerBeforeHook;
    [constant.HOOK_AFTER_LEAVE]?: routerAfterHook;
}
export interface LinkedRoute {
    path: string;
    route: RouteOptions;
    name?: string;
    load?: RouteLoader;
    component?: YoxOptions;
    params?: string[];
    context?: YoxInterface;
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