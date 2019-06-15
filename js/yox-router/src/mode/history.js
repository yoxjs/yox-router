import * as constant from '../constant';
const POP_STATE = 'popstate';
export const isSupported = 'pushState' in constant.HISTORY;
export function start(domApi, handler) {
    domApi.on(constant.WINDOW, POP_STATE, handler);
    handler();
}
export function stop(domApi, handler) {
    domApi.off(constant.WINDOW, POP_STATE, handler);
}
export function push(location, handler) {
    // 调用 pushState 不会触发 popstate 事件
    // 因此这里需要手动调用一次 handler
    constant.HISTORY.pushState({}, '', location.url);
    handler();
}
export function go(n) {
    constant.HISTORY.go(n);
}
export function current() {
    return constant.LOCATION.pathname + constant.LOCATION.search;
}
