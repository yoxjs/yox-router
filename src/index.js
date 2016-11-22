
let is, env, array, object, native, Emitter, Component

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
const PREFIX_HASH = '#!'
// path 中的参数前缀，如 #!/user/:userId
const PREFIX_PARAM = ':'
// path 分隔符
const DIVIDER_PATH = '/'
// query 分隔符
const DIVIDER_QUERY = '&'
// hashchange 事件
const HASH_CHANGE = 'hashchange'

/**
 * 把 GET 参数解析成对象
 *
 * @param {string} query
 * @return {Object}
 */
function parseQuery(query) {
  let result = { }
  if (is.string(query)) {
    array.each(
      query.split(DIVIDER_QUERY),
      function (item) {
        let [ key, value ] = item.split('=')
        if (key) {
          value = is.string(value)
            ? decodeURIComponent(value)
            : env.TRUE
          if (key.endsWith('[]')) {
            (result[key] || (result[key] = [ ])).push(value)
          }
          else {
            result[key] = value
          }
        }
      }
    )
  }
  return result
}

/**
 * 把对象解析成 key1=value1&key2=value2
 *
 * @param {Object} query
 * @return {string}
 */
function stringifyQuery(query) {
  let result = [ ]
  object.each(
    query,
    function (value, key) {
      if (is.array(value)) {
        array.each(
          value,
          function (value) {
            result.push(
              `${key}[]=${encodeURIComponent(value)}`
            )
          }
        )
      }
      else {
        result.push(
          `${key}=${encodeURIComponent(value)}`
        )
      }
    }
  )
  return result.join(DIVIDER_QUERY)
}

/**
 * 解析 path 中的参数
 *
 * @param {string} realpath 真实的路径
 * @param {string} path 配置的路径
 * @return {Object}
 */
function parseParams(realpath, path) {

  let result = { }

  let realpathTerms = realpath.split(DIVIDER_PATH)
  let pathTerms = path.split(DIVIDER_PATH)

  if (realpathTerms.length === pathTerms.length) {
    array.each(
      pathTerms,
      function (item, index) {
        if (item.startsWith(PREFIX_PARAM)) {
          result[item.slice(PREFIX_PARAM.length)] = realpathTerms[index]
        }
      }
    )
  }

  return result

}

/**
 * 通过 realpath 获取配置的 path
 *
 * @param {Object} path2Route 路由表
 * @param {string} realpath
 * @return {string}
 */
function getPathByRealpath(path2Route, realpath) {

  let result

  let realpathTerms = realpath.split(DIVIDER_PATH)
  object.each(
    path2Route,
    function (config, path) {
      let pathTerms = path.split(DIVIDER_PATH)
      if (realpathTerms.length === pathTerms.length) {
        array.each(
          pathTerms,
          function (item, index) {
            // 非参数段不相同
            if (!item.startsWith(PREFIX_PARAM) && item !== realpathTerms[index]) {
              path = null
              return false
            }
          }
        )
        if (path) {
          result = path
          return false
        }
      }
    }
  )

  return result

}

/**
 * 完整解析 hash 数据
 *
 * @param {Object} path2Route 路由表
 * @param {string} hash
 * @return {object}
 */
function parseHash(path2Route, hash) {
  let realpath, search
  let index = hash.indexOf('?')
  if (index >= 0) {
    realpath = hash.substring(0, index)
    search = hash.slice(index + 1)
  }
  else {
    realpath = hash
  }

  let path = getPathByRealpath(path2Route, realpath)
  if (path) {
    return {
      path,
      realpath,
      params: parseParams(realpath, path),
      query: parseQuery(search)
    }
  }
}

/**
 * 把结构化数据序列化成 hash
 *
 * @param {string} path
 * @param {Object} params
 * @param {Object} query
 * @return {string}
 */
function stringifyHash(path, params, query) {

  let realpath = [ ], search = ''

  array.each(
    path.split(DIVIDER_PATH),
    function (item) {
      realpath.push(
        item.startsWith(PREFIX_PARAM)
        ? params[item.slice(PREFIX_PARAM.length)]
        : item
      )
    }
  )

  realpath = realpath.join(DIVIDER_PATH)

  if (query) {
    query = stringifyQuery(query)
    if (query) {
      search = '?' + query
    }
  }

  return PREFIX_HASH + realpath + search

}


/**
 * 获取配置的组件，支持异步获取
 *
 * @param {string} name
 * @param {Function} callback
 */
function getComponent(name, callback) {
  let { func, object } = is
  let component = name2Component[name]
  if (func(component)) {
    let { $pending } = component
    if (!$pending) {
      $pending = component.$pending = [ ]
      component(function (target) {
        array.each(
          $pending,
          function (callback) {
            callback(target)
          }
        )
        name2Component[name] = target
      })
    }
    $pending.push(callback)
  }
  else if (object(component)) {
    callback(component)
  }
}

export default class Router {

  constructor() {
    /**
     * 路由表 name -> path
     *
     * @type {Object}
     */
    this.name2Path = { }
    /**
     * 路由表 path -> route
     *
     * @type {Object}
     */
    this.path2Route = { }
    /**
     * 支持事件
     *
     * @type {Emitter}
     */
    this.emitter = new Emitter()
  }

  on(type, listener) {
    this.emitter.on(type, listener)
  }

  once(type, listener) {
    this.emitter.once(type, listener)
  }

  off(type, listener) {
    this.emitter.off(type, listener)
  }

  fire(type, data) {
    return this.emitter.fire(type, data)
  }

  /**
   * 配置路由表
   *
   * @param {Object} routes
   */
  map(routes) {
    let { name2Path, path2Route } = this
    let { each, has } = object
    each(
      routes,
      function (data, path) {
        if (has(data, 'name')) {
          name2Path[data.name] = path
        }
        path2Route[path] = data
      }
    )
  }

  /**
   * 真正执行路由切换操作的函数
   *
   * data 有 2 种格式：
   *
   * 1. 会修改 url
   *
   * 如果只是简单的 path，直接传字符串
   *
   * go('/index')
   *
   * 如果需要带参数，切记路由表要配置 name
   *
   * go({
   *   name: 'index',
   *   params: { },
   *   query: { }
   * })
   *
   * 如果没有任何参数，可以只传 path
   *
   * go('/index')
   *
   * 2. 不会改变 url
   *
   * go({
   *   component: 'index',
   *   props: { }
   * })
   *
   */
  go(data) {
    if (is.string(data)) {
      location.hash = stringifyHash(data)
    }
    else {
      if (object.has(data, 'component')) {
        this.setComponent(
          data.component,
          data.props
        )
      }
      else {
        location.hash = stringifyHash(
          this.name2Path[data.name],
          data.params,
          data.query
        )
      }
    }
  }

  handleHashChange() {

    let { path2Route } = this
    let { hash } = location

    hash = hash.startsWith(PREFIX_HASH)
      ? hash.slice(PREFIX_HASH.length)
      : ''

    let data = parseHash(path2Route, hash)
    if (data) {
      let { path, params, query } = data
      let { component } = path2Route[path]
      this.setComponent(
        component,
        object.extend({ }, params, query),
        path
      )
    }
    else {
      this.fire(
        hash ? Router.HOOK_NOT_FOUND : Router.HOOK_INDEX
      )
    }

  }

  /**
   * 设置当前组件
   *
   * @param {string} component 全局注册的组件名称
   * @param {?Object} props 传给组件的数据
   * @param {?string} path 组件对应的路径
   */
  setComponent(component, props, path) {

    // 确保是对象，避免业务代码做判断
    if (!is.object(props)) {
      props = { }
    }

    let instance = this
    let {
      path2Route,
      componentConfig,
      componentInstance,
    } = instance

    let current = {
      component: instance.component,
      props: instance.props,
      path: instance.path,
    }
    let next = { component, props, path }

    let callHookAboveRouter = function (name, callback) {
      if (instance && instance[name]) {
        instance[name](current, next, function (value) {
          if (value !== env.FALSE && callback) {
            callback()
          }
        })
      }
      else if (callback) {
        callback()
      }
    }

    let callHookAboveRoute = function (name, callback) {
      if (path && path2Route[path] && path2Route[path][name]) {
        path2Route[path][name].call(
          env.NULL,
          current,
          next,
          function (value) {
            if (value !== env.FALSE) {
              callHookAboveRouter(name, callback)
            }
          }
        )
      }
      else {
        callHookAboveRouter(name, callback)
      }
    }


    let callHook = function (name, callback) {
      if (componentConfig && componentConfig[name]) {
        componentConfig[name].call(
          componentInstance,
          current,
          next,
          function (value) {
            if (value !== env.FALSE) {
              callHookAboveRoute(name, callback)
            }
          }
        )
      }
      else {
        callHookAboveRoute(name, callback)
      }
    }

    let createComponent = function (component) {
      componentConfig = component
      callHook(
        Router.HOOK_BEFORE_ENTER,
        function () {
          componentInstance = new Component(
            object.extend(
              {
                el: instance.el,
                props,
                extensions: {
                  $router: instance,
                }
              },
              component
            )
          )

          callHook(Router.HOOK_AFTER_ENTER)

          object.extend(instance, next)
          instance.componentConfig = componentConfig
          instance.componentInstance = componentInstance
        }
      )
    }

    let changeComponent = function (component) {
      callHook(
        Router.HOOK_BEFORE_LEAVE,
        function () {
          componentInstance.dispose()
          componentInstance = env.NULL
          callHook(Router.HOOK_AFTER_LEAVE)
          createComponent(component)
        }
      )
    }


    instance.componentName = component

    getComponent(
      component,
      function (componentConf) {
        // 当连续调用此方法，且可能出现异步组件时
        // 执行到这 name 不一定会等于 instance.componentName
        // 因此需要强制保证一下
        if (component === instance.componentName) {
          if (componentInstance) {
            if (componentConfig === componentConf) {
              callHook(
                Router.HOOK_REFRESH,
                function () {
                  changeComponent(componentConf)
                }
              )
              object.extend(instance, next)
            }
            else {
              changeComponent(componentConf)
            }
          }
          else {
            createComponent(componentConf)
          }
        }
      }
    )
  }

  /**
   * 启动路由
   *
   * @param {HTMLElement} el
   */
  start(el) {
    this.el = el
    this.handleHashChange()
    native.on(env.win, HASH_CHANGE, this.handleHashChange, this)
  }

  /**
   * 停止路由
   */
  stop() {
    this.el = env.NULL
    native.off(env.win, HASH_CHANGE, this.handleHashChange)
  }

}




/**
 * 全局注册的组件，name -> component
 *
 * @type {Object}
 */
let name2Component = { }

/**
 * 没有指定路由时，会触发主页路由
 *
 * @type {string}
 */
Router.HOOK_INDEX = 'index'

/**
 * 找不到指定的路由时，会触发 404 路由
 *
 * @type {string}
 */
Router.HOOK_NOT_FOUND = '404'

/**
 * 导航钩子 - 如果相继路由到的是同一个组件，那么会触发 refresh 事件
 *
 * @type {string}
 */
Router.HOOK_REFRESH = 'refresh'

/**
 * 导航钩子 - 路由进入之前
 *
 * @type {string}
 */
Router.HOOK_BEFORE_ENTER = 'beforeEnter'

/**
 * 导航钩子 - 路由进入之后
 *
 * @type {string}
 */
Router.HOOK_AFTER_ENTER = 'afterEnter'

/**
 * 导航钩子 - 路由离开之前
 *
 * @type {string}
 */
Router.HOOK_BEFORE_LEAVE = 'beforeLeave'

/**
 * 导航钩子 - 路由离开之后
 *
 * @type {string}
 */
Router.HOOK_AFTER_LEAVE = 'afterLeave'

/**
 * 注册全局组件，路由实例可共享之
 *
 * @param {string|Object} name
 * @param {?Object} component
 */
Router.register = function (name, component) {
  if (is.object(name)) {
    object.extend(name2Component, name)
  }
  else {
    name2Component[name] = component
  }
}

/**
 * 安装插件
 *
 * @param {Yox} Yox
 */
Router.install = function (Yox) {
  Component = Yox
  let { utils } = Component
  is = utils.is
  env = utils.env
  array = utils.array
  object = utils.object
  native = utils.native
  Emitter = utils.Emitter
}

// 如果全局环境已有 Yox，自动安装
if (typeof Yox !== 'undefined' && Yox.use) {
  Yox.use(Router)
}
