export const WINDOW = window

export const LOCATION = WINDOW.location

export const HISTORY = WINDOW.history

export const UNDEFINED = void 0

export const NULL = null

export const TRUE = true

export const FALSE = false

export const RAW_NULL = 'null'

export const RAW_TRUE = 'true'

export const RAW_FALSE = 'false'

// path 中的参数前缀，如 /user/:userId
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

// history 模式
export const MODE_HISTORY = 'history'

// 导航钩子 - 路由进入之前
export const ROUTER_HOOK_BEFORE_ENTER = 'beforeEnter'

// 导航钩子 - 路由进入之后
export const ROUTER_HOOK_AFTER_ENTER = 'afterEnter'

// 导航钩子 - 路由更新之前
export const ROUTER_HOOK_BEFORE_UPDATE = 'beforeUpdate'

// 导航钩子 - 路由更新之后
export const ROUTER_HOOK_AFTER_UPDATE = 'afterUpdate'

// 导航钩子 - 路由离开之前
export const ROUTER_HOOK_BEFORE_LEAVE = 'beforeLeave'

// 导航钩子 - 路由离开之后
export const ROUTER_HOOK_AFTER_LEAVE = 'afterLeave'

// 组件 Options 上的导航钩子
export const COMPONENT_HOOK_BEFORE_ENTER = 'beforeRouteEnter'
export const COMPONENT_HOOK_AFTER_ENTER = 'afterRouteEnter'
export const COMPONENT_HOOK_BEFORE_UPDATE = 'beforeRouteUpdate'
export const COMPONENT_HOOK_AFTER_UPDATE = 'afterRouteUpdate'
export const COMPONENT_HOOK_BEFORE_LEAVE = 'beforeRouteLeave'
export const COMPONENT_HOOK_AFTER_LEAVE = 'afterRouteLeave'