import * as type from 'yox-type/src/type'

import API from 'yox-type/src/interface/API'
import Yox from 'yox-type/src/interface/Yox'
import YoxClass from 'yox-type/src/interface/YoxClass'
import CustomEvent from 'yox-type/src/event/CustomEvent'

let Yox: YoxClass, store: Yox, domApi: API

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
const PREFIX_HASH = '#!',

// path 中的参数前缀，如 #!/user/:userId
PREFIX_PARAM = ':',

// path 分隔符
SEPARATOR_PATH = '/',

// query 分隔符
SEPARATOR_QUERY = '&',

// 键值对分隔符
SEPARATOR_PAIR = '=',

// 参数中的数组标识
FLAG_ARRAY = '[]',

// 默认路由
ROUTE_DEFAULT = '',

// 404 路由
ROUTE_404 = '*',

// 导航钩子 - 如果相继路由到的是同一个组件，那么会触发 refreshing 事件
HOOK_REFRESHING = 'refreshing',

// 导航钩子 - 路由进入之前
HOOK_BEFORE_ENTER = 'beforeEnter',

// 导航钩子 - 路由进入之后
HOOK_AFTER_ENTER = 'afterEnter',

// 导航钩子 - 路由离开之前
HOOK_BEFORE_LEAVE = 'beforeLeave',

// 导航钩子 - 路由离开之后
HOOK_AFTER_LEAVE = 'afterLeave'

interface ComponentTarget {
  component: string,
  props?: type.data
}

interface RouteTarget {
  name: string,
  params?: type.data,
  query?: type.data
}

interface RouteOptions {
  component: string,
  name?: string,
  beforeEnter?: Function,
  afterEnter?: Function,
  beforeLeave?: Function,
  afterLeave?: Function,
  refreshing?: Function
}

/**
 * 把字符串 value 解析成最合适的类型
 */
function parseValue(value: string) {
  let result: any
  if (Yox.is.numeric(value)) {
    result = +value
  }
  else if (Yox.is.string(value)) {
    if (value === 'true') {
      result = true
    }
    else if (value === 'false') {
      result = false
    }
    else if (value === 'null') {
      result = null
    }
    else if (value === 'undefined') {
      result = undefined
    }
    else {
      result = decodeURIComponent(value)
    }
  }
  return result
}

/**
 * 把 key value 序列化成合适的 key=value 格式
 */
function stringifyPair(key: string, value: any) {
  let result = [key]
  if (Yox.is.string(value)) {
    result.push(
      encodeURIComponent(value)
    )
  }
  else if (Yox.is.number(value) || Yox.is.boolean(value)) {
    result.push(
      value.toString()
    )
  }
  else if (value === null) {
    result.push(
      'null'
    )
  }
  else if (value === undefined) {
    result.push(
      'undefined'
    )
  }
  return result.join(SEPARATOR_PAIR)
}

/**
 * 把 GET 参数解析成对象
 */
function parseQuery(query: string) {
  let result: Object | void
  Yox.array.each(
    query.split(SEPARATOR_QUERY),
    function (term) {

      let terms = term.split(SEPARATOR_PAIR),

      key = Yox.string.trim(terms[0]),

      value = terms[1]

      if (key) {
        if (!result) {
          result = {}
        }
        value = parseValue(value)
        if (Yox.string.endsWith(key, FLAG_ARRAY)) {
          key = Yox.string.slice(key, 0, -FLAG_ARRAY.length)
          Yox.array.push(
            result[key] || (result[key] = []),
            value
          )
        }
        else {
          result[key] = value
        }
      }

    }
  )
  return result
}

/**
 * 把对象解析成 key1=value1&key2=value2
 */
function stringifyQuery(query: Object) {
  const result: string[] = []
  Yox.object.each(
    query,
    function (value, key) {
      if (Yox.is.array(value)) {
        Yox.array.each(
          value,
          function (value) {
            result.push(
              stringifyPair(key + FLAG_ARRAY, value)
            )
          }
        )
      }
      else {
        result.push(
          stringifyPair(key, value)
        )
      }
    }
  )
  return result.join(SEPARATOR_QUERY)
}

/**
 * 解析 path 中的参数
 */
function parseParams(realpath: string, path: string) {

  let result: Object | void,

  realpathTerms = realpath.split(SEPARATOR_PATH),

  pathTerms = path.split(SEPARATOR_PATH)

  if (realpathTerms.length === pathTerms.length) {
    Yox.array.each(
      pathTerms,
      function (item, index) {
        if (Yox.string.startsWith(item, PREFIX_PARAM)) {
          if (!result) {
            result = {}
          }
          result[item.substr(PREFIX_PARAM.length)] = parseValue(realpathTerms[index])
        }
      }
    )
  }

  return result

}

/**
 * 通过 realpath 获取配置的 path
 */
function getPathByRealpath(path2Route: Object, realpath: string) {

  let result: string | void,

  realpathTerms = realpath.split(SEPARATOR_PATH),

  length = realpathTerms.length

  Yox.object.each(
    path2Route,
    function (_, path) {
      const pathTerms = path.split(SEPARATOR_PATH)
      if (length === pathTerms.length) {
        for (let i = 0; i < length; i++) {
          // 非参数段不相同
          if (!Yox.string.startsWith(pathTerms[i], PREFIX_PARAM)
            && pathTerms[i] !== realpathTerms[i]
          ) {
            return
          }
        }
        result = path
        return false
      }
    }
  )

  return result

}

interface Hash {
  realpath: string,
  path?: string,
  params?: Record<string, any>,
  query?: Record<string, any>,
}

/**
 * 完整解析 hash 数据
 */
function parseHash(path2Route: Object, hash: string) {

  let realpath: string, search: string | void, index = hash.indexOf('?')

  if (index >= 0) {
    realpath = hash.substring(0, index)
    search = hash.substring(index + 1)
  }
  else {
    realpath = hash
  }

  let result: Hash = { realpath }

  let path = getPathByRealpath(path2Route, realpath)
  if (path) {
    result.path = path
    const params = parseParams(realpath, path)
    if (params) {
      result.params = params
    }
    if (search) {
      const query = parseQuery(search)
      if (query) {
        result.query = query
      }
    }
  }

  return result
}

/**
 * 把结构化数据序列化成 hash
 */
function stringifyHash(path: string, params: Object | void, query: Object | void) {

  let terms = [ ], realpath: string, search = ''

  Yox.array.each(
    path.split(SEPARATOR_PATH),
    function (item) {
      terms.push(
        Yox.string.startsWith(item, PREFIX_PARAM)
          ? params[item.substr(PREFIX_PARAM.length)]
          : item
      )
    }
  )

  realpath = terms.join(SEPARATOR_PATH)

  if (query) {
    const queryStr = stringifyQuery(query)
    if (queryStr) {
      search = '?' + queryStr
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

export class Router {

  el: Element

  name2Path: Record<string, string>

  path2Route: Record<string, any>

  onHashChange: type.listener

  constructor(routes: Record<string, RouteOptions>) {

    const instance = this

    /**
     * 路由表 name -> path
     */
    instance.name2Path = {}

    /**
     * 路由表 path -> route
     */
    instance.path2Route = {}

    /**
     * hashchange 事件处理函数
     * 此函数必须绑在实例上，不能使用原型的
     * 否则一旦解绑，所有实例都解绑了
     */
    instance.onHashChange = function (event: CustomEvent, data?: type.data) {

      let hashStr = location.hash

      // 如果不以 PREFIX_HASH 开头，表示不合法
      hashStr = Yox.string.startsWith(hashStr, PREFIX_HASH)
        ? hashStr.substr(PREFIX_HASH.length)
        : ''

      const hash = parseHash(instance.path2Route, hashStr)

      if (!hash.path) {
        hash.path = hashStr ? ROUTE_404 : ROUTE_DEFAULT
      }

      instance.setComponent(hash)

    }

    if (process.env.NODE_ENV === 'dev') {
      if (!Yox.object.has(routes, ROUTE_DEFAULT)) {
        Yox.logger.error(`Route for default["${ROUTE_DEFAULT}"] is required.`)
        return
      }
      if (!Yox.object.has(routes, ROUTE_404)) {
        Yox.logger.error(`Route for 404["${ROUTE_404}"] is required.`)
        return
      }
    }

    Yox.object.each(
      routes,
      function (route, path) {
        if (Yox.object.has(route, 'name')) {
          instance.name2Path[route.name] = path
        }
        instance.path2Route[path] = route
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
  go(data: string | RouteTarget | ComponentTarget) {
    if (Yox.is.string(data)) {
      this.setPath(data as string)
    }
    else if (Yox.is.object(data)) {
      if (Yox.object.has(data, 'component')) {
        this.setComponent(data as ComponentTarget)
      }
      else if (Yox.object.has(data, 'name')) {
        this.setRoute(data as RouteTarget)
      }
    }
  }

  setPath(path: string) {
    location.hash = stringifyHash(path)
  }

  /**
   * 设置当前路由
   */
  setRoute(target: RouteTarget) {

    const path = this.name2Path[target.name]

    if (process.env.NODE_ENV === 'dev') {
      if (!Yox.is.string(path)) {
        Yox.logger.error(`Name[${target.name}] of the route is not found.`)
        return
      }
    }

    location.hash = stringifyHash(path, target.params, target.query)

  }

  /**
   * 设置当前组件
   */
  setComponent(target: ComponentTarget) {

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

    let { path, realpath, params, query, component, props } = target

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
      chain.run(target, currentRoute, success, failure)
    }

    let createComponent = function (component) {
      options = component
      callHook(
        HOOK_BEFORE_ENTER,
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

          callHook(HOOK_AFTER_ENTER)

          router.currentRoute = target
          router.currentComponent = { options, instance }

        },
        failure
      )
    }

    let changeComponent = function (component) {
      callHook(
        HOOK_BEFORE_LEAVE,
        function () {
          instance.destroy()
          instance = null
          callHook(HOOK_AFTER_LEAVE)
          createComponent(component)
        },
        failure
      )
    }

    currentComponent.name = component

    store.component(
      component,
      function (componentOptions) {
        // 当连续调用此方法，且可能出现异步组件时
        // 执行到这 name 不一定会等于 router.componentName
        // 因此需要强制保证一下
        if (component === currentComponent.name) {
          if (instance) {
            if (options === componentOptions) {
              callHook(
                HOOK_REFRESHING,
                function () {
                  changeComponent(componentOptions)
                },
                function () {
                  router.currentRoute = target
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
   */
  start(el: string | Element) {
    if (Yox.is.string(el)) {
      const element = domApi.find(el as string)
      if (element) {
        this.el = element
      }
    }
    else {
      this.el = el as Element
    }
    domApi.on(window, 'hashchange', this.onHashChange)
    this.onHashChange()
  }

  /**
   * 停止路由
   */
  stop() {
    this.el = null
    domApi.off(window, 'hashchange', this.onHashChange)
  }

}



/**
 * 版本
 */
export const version = process.env.NODE_VERSION

/**
 * 注册全局组件，路由实例可共享
 */
export function register(
  name: string | Record<string, type.component>,
  component?: type.component
): void {
  store.component(name, component)
}

/**
 * 安装插件
 */
export function install(Class: YoxClass): void {
  Yox = Class
  store = new Class()
  domApi = Class.dom as API
}
