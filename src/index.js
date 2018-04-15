
let shared, is, dom, array, object, string, logger, Component

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
const PREFIX_HASH = '#!'
// path 中的参数前缀，如 #!/user/:userId
const PREFIX_PARAM = ':'
// path 分隔符
const SEPARATOR_PATH = '/'
// query 分隔符
const SEPARATOR_QUERY = '&'
// 键值对分隔符
const SEPARATOR_PAIR = '='
// 参数中的数组标识
const FLAG_ARRAY = '[]'

/**
 * 把 value 解析成最合适的类型
 *
 * @param {*} value
 * @return {*}
 */
function parseValue(value) {
  if (is.numeric(value)) {
    value = +value
  }
  else if (is.string(value)) {
    if (value === 'true') {
      value = true
    }
    else if (value === 'false') {
      value = false
    }
    else if (value === 'null') {
      value = null
    }
    else if (value === 'undefined') {
      value = undefined
    }
    else {
      value = decodeURIComponent(value)
    }
  }
  return value
}

function stringifyPair(key, value) {
  let result = [ key ]
  if (is.string(value)) {
    array.push(
      result,
      encodeURIComponent(value)
    )
  }
  else if (is.number(value) || is.boolean(value)) {
    array.push(result, value.toString())
  }
  else if (value === null) {
    array.push(result, 'null')
  }
  else if (value === undefined) {
    array.push(result, 'undefined')
  }
  return result.join(SEPARATOR_PAIR)
}

/**
 * 把 GET 参数解析成对象
 *
 * @param {string} query
 * @return {?Object}
 */
function parseQuery(query) {
  let result, terms, key, value
  if (query) {
    array.each(
      query.split(SEPARATOR_QUERY),
      function (term) {
        terms = term.split(SEPARATOR_PAIR)
        key = string.trim(terms[ 0 ])
        value = terms[ 1 ]
        if (key) {
          if (!result) {
            result = { }
          }
          value = parseValue(value)
          if (string.endsWith(key, FLAG_ARRAY)) {
            key = string.slice(key, 0, -FLAG_ARRAY.length)
            let list = result[ key ] || (result[ key ] = [ ])
            array.push(list, value)
          }
          else {
            result[ key ] = value
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
            value = stringifyPair(key + FLAG_ARRAY, value)
            if (value) {
              array.push(result, value)
            }
          }
        )
      }
      else {
        value = stringifyPair(key, value)
        if (value) {
          array.push(result, value)
        }
      }
    }
  )
  return result.join(SEPARATOR_QUERY)
}

/**
 * 解析 path 中的参数
 *
 * @param {string} realpath 真实的路径
 * @param {string} path 配置的路径
 * @return {?Object}
 */
function parseParams(realpath, path) {

  let result

  let realpathTerms = realpath.split(SEPARATOR_PATH)
  let pathTerms = path.split(SEPARATOR_PATH)

  if (realpathTerms.length === pathTerms.length) {
    array.each(
      pathTerms,
      function (item, index) {
        if (string.startsWith(item, PREFIX_PARAM)) {
          if (!result) {
            result = { }
          }
          result[ item.slice(PREFIX_PARAM.length) ] = parseValue(realpathTerms[ index ])
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

  let realpathTerms = realpath.split(SEPARATOR_PATH)
  object.each(
    path2Route,
    function (route, path) {
      let pathTerms = path.split(SEPARATOR_PATH)
      if (realpathTerms.length === pathTerms.length) {
        array.each(
          pathTerms,
          function (item, index) {
            // 非参数段不相同
            if (!string.startsWith(item, PREFIX_PARAM) && item !== realpathTerms[ index ]) {
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

  let result = { realpath }

  let path = getPathByRealpath(path2Route, realpath)
  if (path) {
    result.path = path
    result.params = parseParams(realpath, path)
    result.query = parseQuery(search)
  }
  return result
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
    path.split(SEPARATOR_PATH),
    function (item) {
      array.push(
        realpath,
        string.startsWith(item, PREFIX_PARAM)
        ? params[ item.slice(PREFIX_PARAM.length) ]
        : item
      )
    }
  )

  realpath = realpath.join(SEPARATOR_PATH)

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
      array.push(
        this.list,
        { fn, context }
      )
    }
  }

  run(to, from, success, failure) {
    let { list } = this
    let i = -1
    let next = function (value) {
      if (value == null) {
        i++
        if (list[ i ]) {
          list[ i ].fn.call(list[ i ].context, to, from, next)
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

    let { each, has } = object
    let { ROUTE_DEFAULT, ROUTE_404 } = Router
    if (!has(routes, ROUTE_DEFAULT)) {
      logger.error(`Route for default["${ROUTE_DEFAULT}"] is required.`)
      return
    }
    if (!has(routes, ROUTE_404)) {
      logger.error(`Route for 404["${ROUTE_404}"] is required.`)
      return
    }

    each(
      routes,
      function (data, path) {
        if (has(data, 'name')) {
          router.name2Path[ data.name ] = path
        }
        router.path2Route[ path ] = data
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
    else if (is.object(data)) {
      if (object.has(data, 'component')) {
        this.setComponent(data)
      }
      else if (object.has(data, 'name')) {
        let path = this.name2Path[ data.name ]
        if (!is.string(path)) {
          logger.error(`Name[${data.name}] of the route is not found.`)
          return
        }
        location.hash = stringifyHash(
          path,
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
    hash = string.startsWith(hash, PREFIX_HASH)
      ? hash.slice(PREFIX_HASH.length)
      : ''

    let data = parseHash(path2Route, hash)
    if (!object.has(data, 'path')) {
      data.path = hash ? Router.ROUTE_404 : Router.ROUTE_DEFAULT
    }
    this.setComponent(data)

  }

  /**
   * 设置当前组件
   */
  setComponent(data) {

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

    let { path, realpath, params, query, component, props } = data

    let route
    if (!component) {
      route = path2Route[ path ]
      component = route.component
    }

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
      chain.use(options && options[ name ], instance)
      chain.use(route && route[ name ], route)
      chain.use(router && router[ name ], router)
      chain.run(data, currentRoute, success, failure)
    }

    let createComponent = function (component) {
      options = component
      callHook(
        Router.HOOK_BEFORE_ENTER,
        function () {

          if (params || query) {
            props = object.extend({ }, params, query)
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

          router.currentRoute = data
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

    shared.component(
      component,
      function (componentOptions) {
        // 当连续调用此方法，且可能出现异步组件时
        // 执行到这 name 不一定会等于 router.componentName
        // 因此需要强制保证一下
        if (component === currentComponent.name) {
          if (instance) {
            if (options === componentOptions) {
              callHook(
                Router.HOOK_REFRESHING,
                function () {
                  changeComponent(componentOptions)
                },
                function () {
                  router.currentRoute = data
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
    this.el = is.string(el) ? dom.find(el) : el
    dom.on(window, 'hashchange', this.handleHashChange)
    this.handleHashChange()
  }

  /**
   * 停止路由
   */
  stop() {
    this.el = null
    dom.off(window, 'hashchange', this.handleHashChange)
  }

}



/**
 * 版本
 *
 * @type {string}
 */
Router.version = '0.20.0'

/**
 * 默认路由
 *
 * @type {string}
 */
Router.ROUTE_DEFAULT = ''

/**
 * 404 路由
 *
 * @type {string}
 */
Router.ROUTE_404 = '*'

/**
 * 导航钩子 - 如果相继路由到的是同一个组件，那么会触发 refreshing 事件
 *
 * @type {string}
 */
Router.HOOK_REFRESHING = 'refreshing'

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
  shared.component(name, component)
}

/**
 * 安装插件
 *
 * @param {Yox} Yox
 */
Router.install = function (Yox) {
  shared = new Yox({ })
  Component = Yox
  is = Yox.is
  dom = Yox.dom
  array = Yox.array
  object = Yox.object
  string = Yox.string
  logger = Yox.logger
}

// 如果全局环境已有 Yox，自动安装
if (typeof Yox !== 'undefined' && Yox.use) {
  Yox.use(Router)
}
