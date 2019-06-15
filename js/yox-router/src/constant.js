export const WINDOW = window;
export const LOCATION = WINDOW.location;
export const HISTORY = WINDOW.history;
// path 中的参数前缀，如 /user/:userId
export const PREFIX_PARAM = ':';
// path 分隔符
export const SEPARATOR_PATH = '/';
// path 和 search 的分隔符
export const SEPARATOR_SEARCH = '?';
// query 分隔符
export const SEPARATOR_QUERY = '&';
// 键值对分隔符
export const SEPARATOR_PAIR = '=';
// 参数中的数组标识
export const FLAG_ARRAY = '[]';
// 导航钩子 - 路由进入之前
export const HOOK_BEFORE_ENTER = 'beforeEnter';
// 导航钩子 - 路由进入之后
export const HOOK_AFTER_ENTER = 'afterEnter';
// 导航钩子 - 路由更新之前
export const HOOK_BEFORE_UPDATE = 'beforeUpdate';
// 导航钩子 - 路由更新之后
export const HOOK_AFTER_UPDATE = 'afterUpdate';
// 导航钩子 - 路由离开之前
export const HOOK_BEFORE_LEAVE = 'beforeLeave';
// 导航钩子 - 路由离开之后
export const HOOK_AFTER_LEAVE = 'afterLeave';
