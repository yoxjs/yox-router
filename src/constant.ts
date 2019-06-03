// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
export const PREFIX_HASH = '#!'

// path 中的参数前缀，如 #!/user/:userId
export const PREFIX_PARAM = ':'

// path 分隔符
export const SEPARATOR_PATH = '/'

// path 和 search 的分隔符
export const SEPARATOR_SEARCH = '?'

// query 分隔符
export const SEPARATOR_QUERY = '&'

// 键值对分隔符
export const SEPARATOR_PAIR = '='

// 参数中的数组标识
export const FLAG_ARRAY = '[]'

// 导航钩子 - 路由进入之前
export const HOOK_BEFORE_ENTER = 'beforeEnter'
export const HOOK_BEFORE_ROUTE_ENTER = 'beforeRouteEnter'

// 导航钩子 - 路由进入之后
export const HOOK_AFTER_ENTER = 'afterEnter'
export const HOOK_AFTER_ROUTE_ENTER = 'afterRouteEnter'

// 导航钩子 - 路由更新之前
export const HOOK_BEFORE_UPDATE = 'beforeUpdate'
export const HOOK_BEFORE_ROUTE_UPDATE = 'beforeRouteUpdate'

// 导航钩子 - 路由更新之后
export const HOOK_AFTER_UPDATE = 'afterUpdate'
export const HOOK_AFTER_ROUTE_UPDATE = 'afterRouteUpdate'

// 导航钩子 - 路由离开之前
export const HOOK_BEFORE_LEAVE = 'beforeLeave'
export const HOOK_BEFORE_ROUTE_LEAVE = 'beforeRouteLeave'

// 导航钩子 - 路由离开之后
export const HOOK_AFTER_LEAVE = 'afterLeave'
export const HOOK_AFTER_ROUTE_LEAVE = 'afterRouteLeave'