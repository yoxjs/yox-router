import * as constant from '../constant';
// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
const HASH_PREFIX = '#!', HASH_CHANGE = 'hashchange';
export function start(domApi, handler) {
    domApi.on(constant.WINDOW, HASH_CHANGE, handler);
    handler();
}
export function stop(domApi, handler) {
    domApi.off(constant.WINDOW, HASH_CHANGE, handler);
}
export function push(location, handler) {
    constant.LOCATION.hash = HASH_PREFIX + location.url;
}
export function go(n) {
    constant.HISTORY.go(n);
}
export function current() {
    // 不能直接读取 window.location.hash
    // 因为 Firefox 会做 pre-decode
    const href = constant.LOCATION.href, index = href.indexOf(HASH_PREFIX);
    return index > 0
        ? href.substr(index + HASH_PREFIX.length)
        : constant.SEPARATOR_PATH;
}
