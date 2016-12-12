
let root, is, array, object, native, Component

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
const PREFIX_HASH = '#!'
// path 中的参数前缀，如 #!/user/:userId
const PREFIX_PARAM = ':'
// path 分隔符
const DIVIDER_PATH = '/'
// query 分隔符
const DIVIDER_QUERY = '&'

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
            : true
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
    function (route, path) {
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

class Chain {

  constructor() {
    this.list = [ ]
  }

  use(fn, context) {
    if (is.func(fn)) {
      this.list.push({ fn, context })
    }
  }

  run(to, from, success, failure) {
    let { list } = this
    let i = -1
    let next = function (value) {
      if (value == null) {
        i++
        if (list[i]) {
          list[i].fn.call(list[i].context, to, from, next)
        }
        else if (success) {
          success()
        }
      }
      else if (failure) {
        failure(value)
      }
    }
    next()
  }

}

export default class Router {

  constructor(routes) {

    let router = this

    /**
     * 路由表 name -> path
     *
     * @type {Object}
     */
    router.name2Path = { }
    /**
     * 路由表 path -> route
     *
     * @type {Object}
     */
    router.path2Route = { }

    /**
     * hashchange 事件处理函数
     * 此函数必须绑在实例上，不能使用原型的
     * 否则一旦解绑，所有实例都解绑了
     *
     * @type {Function}
     */
    router.handleHashChange = router.onHashChange.bind(router)

    if (routes) {
      let { each, has } = object
      each(
        routes,
        function (data, path) {
          if (has(data, 'name')) {
            router.name2Path[data.name] = path
          }
          router.path2Route[path] = data
        }
      )
    }

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
    else if (is.object(data)) {
      if (object.has(data, 'component')) {
        this.setComponent(
          data.component,
          data.props
        )
      }
      else if (object.has(data, 'name')) {
        location.hash = stringifyHash(
          this.name2Path[data.name],
          data.params,
          data.query
        )
      }
    }
  }

  /**
   * 处理浏览器的 hash 变化
   */
  onHashChange() {

    let router = this
    let { path2Route } = router
    let { hash } = location

    // 如果不以 PREFIX_HASH 开头，表示不合法
    hash = hash.startsWith(PREFIX_HASH)
      ? hash.slice(PREFIX_HASH.length)
      : ''

    let data = parseHash(path2Route, hash)
    if (data) {
      let { path, params, query } = data
      this.setComponent(path, params, query)
    }
    else {
      let path = hash ? '*' : '', data = { }
      this.setComponent(path, data, data)
    }

  }

  /**
   * 设置当前组件
   */
  setComponent() {

    let router = this

    let {
      path2Route,
      currentRoute,
      currentComponent,
    } = router

    if (!currentComponent) {
      currentComponent = { }
    }

    let {
      options,
      instance,
    } = currentComponent

    let args = arguments, route,
      component, props,
      path, params, query

    if (args[2]) {
      path = args[0]
      params = args[1]
      query = args[2]
      route = path2Route[path]
      component = route.component
    }
    else {
      component = args[0]
      props = args[1]
    }

    let nextRoute = { component, props, path, params, query }

    let failure = function (value) {
      if (value === false) {
        if (currentRoute && currentRoute.path) {
          location.hash = stringifyHash(currentRoute.path, currentRoute.params, currentRoute.query)
        }
      }
      else {
        router.go(value)
      }
    }

    let callHook = function (name, success, failure) {
      let chain = new Chain()
      chain.use(options && options[name], instance)
      chain.use(route && route[name], route)
      chain.use(router && router[name], router)
      chain.run(nextRoute, currentRoute, success, failure)
    }

    let createComponent = function (component) {
      options = component
      callHook(
        Router.HOOK_BEFORE_ENTER,
        function () {

          if (params || query) {
            props = object.extend({ }, params, query)
          }

          if (props && object.has(component, 'propTypes')) {
            Component.validate(props, component.propTypes)
          }

          instance = new Component(
            object.extend(
              {
                el: router.el,
                props,
                extensions: {
                  $router: router,
                }
              },
              component
            )
          )

          callHook(Router.HOOK_AFTER_ENTER)

          router.currentRoute = nextRoute
          router.currentComponent = { options, instance }
        },
        failure
      )
    }

    let changeComponent = function (component) {
      callHook(
        Router.HOOK_BEFORE_LEAVE,
        function () {
          instance.destroy()
          instance = null
          callHook(Router.HOOK_AFTER_LEAVE)
          createComponent(component)
        },
        failure
      )
    }

    currentComponent.name = component

    root.component(
      component,
      function (componentOptions) {
        // 当连续调用此方法，且可能出现异步组件时
        // 执行到这 name 不一定会等于 router.componentName
        // 因此需要强制保证一下
        if (component === currentComponent.name) {
          if (instance) {
            if (options === componentOptions) {
              callHook(
                Router.HOOK_REROUTE,
                function () {
                  changeComponent(componentOptions)
                },
                function () {
                  router.currentRoute = nextRoute
                }
              )
            }
            else {
              changeComponent(componentOptions)
            }
          }
          else {
            createComponent(componentOptions)
          }
        }
      }
    )
  }

  /**
   * 启动路由
   *
   * @param {string|HTMLElement} el
   */
  start(el) {
    if (is.string(el)) {
      el = native.find(el)
    }
    this.el = el
    this.handleHashChange()
    native.on(window, 'hashchange', this.handleHashChange)
  }

  /**
   * 停止路由
   */
  stop() {
    this.el = null
    native.off(window, 'hashchange', this.handleHashChange)
  }

}



/**
 * 版本
 *
 * @type {string}
 */
Router.version = '0.7.0'

/**
 * 导航钩子 - 如果相继路由到的是同一个组件，那么会触发 reroute 事件
 *
 * @type {string}
 */
Router.HOOK_REROUTE = 'reroute'

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
  root.component(name, component)
}

/**
 * 安装插件
 *
 * @param {Yox} Yox
 */
Router.install = function (Yox) {
  root = new Yox({ })
  Component = Yox
  let { utils } = Yox
  is = utils.is
  array = utils.array
  object = utils.object
  native = utils.native
}

// 如果全局环境已有 Yox，自动安装
if (typeof Yox !== 'undefined' && Yox.use) {
  Yox.use(Router)
}
