// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
export const PREFIX_HASH = '#!'

// path 中的参数前缀，如 #!/user/:userId
export const PREFIX_PARAM = ':'

// path 分隔符
export const SEPARATOR_PATH = '/'

// path 和 search 的分隔符
export const SEPARATOR_SEARCH = '?'

// 导航钩子 - 路由进入之前
export const HOOK_BEFORE_ENTER = 'beforeEnter'

// 导航钩子 - 路由进入之后
export const HOOK_AFTER_ENTER = 'afterEnter'

// 导航钩子 - 路由离开之前
export const HOOK_BEFORE_LEAVE = 'beforeLeave'

// 导航钩子 - 路由离开之后
export const HOOK_AFTER_LEAVE = 'afterLeave'