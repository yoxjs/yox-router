import * as type from '../../yox-type/src/type'

import API from '../../yox-type/src/interface/API'
import Yox from '../../yox-type/src/interface/Yox'
import PropRule from '../../yox-type/src/interface/PropRule'
import YoxClass from '../../yox-type/src/interface/YoxClass'
import Task from '../../yox-type/src/interface/Task'
import YoxOptions from '../../yox-type/src/options/Yox'
import VNode from '../../yox-type/src/vnode/VNode'
import Directive from '../../yox-type/src/vnode/Directive'
import CustomEvent from '../../yox-type/src/event/CustomEvent'

let Yox: YoxClass, registry: Yox, domApi: API

const UNDEFINED = void 0,

OUTLET = '$outlet',

ROUTE = '$route',

ROUTER = '$router',

COMPONENT = 'component',

// 点击事件
EVENT_CLICK = 'click',

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
PREFIX_HASH = '#!',

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

// 404 路由
ROUTE_404 = '/**',

// 导航钩子 - 路由进入之前
HOOK_BEFORE_ENTER = 'beforeEnter',

// 导航钩子 - 路由进入之后
HOOK_AFTER_ENTER = 'afterEnter',

// 导航钩子 - 路由离开之前
HOOK_BEFORE_LEAVE = 'beforeLeave',

// 导航钩子 - 路由离开之后
HOOK_AFTER_LEAVE = 'afterLeave'

interface RouteTarget {
  name?: string
  path?: string
  params?: type.data
  query?: type.data
}

type Target = string | RouteTarget

type Next = (value?: false | Target) => void

type Success = () => void

type Failure = (value: false | Target) => void

type BeforeHook = (to: Location, from: Location | void, next: Next) => void

type AfterHook = (to: Location, from: Location | void) => void

interface RouterOptions {
  el: Element,
  routes: RouteOptions[],
}

interface RouteOptions {
  path: string,
  component: string
  name?: string
  children?: RouteOptions[]
  [HOOK_BEFORE_ENTER]?: BeforeHook
  [HOOK_AFTER_ENTER]?: AfterHook
  [HOOK_BEFORE_LEAVE]?: BeforeHook
  [HOOK_AFTER_LEAVE]?: AfterHook
}

interface LinkedRoute {
  path: string
  component: string
  route: RouteOptions
  options?: YoxOptions
  context?: Yox
  parent?: LinkedRoute
  child?: LinkedRoute
}

interface Hash {
  realpath: string
  route?: LinkedRoute
  params?: type.data
  query?: type.data
}

interface Location {
  path: string
  props: type.data
  params?: type.data
  query?: type.data
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
      result = UNDEFINED
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
  else if (value === UNDEFINED) {
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
  let result: Object | undefined
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

  let result: Object | undefined,

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
 * 通过 realpath 获取配置的路由
 */
function getRouteByRealpath(routes: LinkedRoute[], realpath: string) {

  let result: LinkedRoute | undefined,

  realpathTerms = realpath.split(SEPARATOR_PATH),

  length = realpathTerms.length

  Yox.array.each(
    routes,
    function (route) {
      const pathTerms = (route.path as string).split(SEPARATOR_PATH)
      if (length === pathTerms.length) {
        for (let i = 0; i < length; i++) {
          // 非参数段不相同
          if (!Yox.string.startsWith(pathTerms[i], PREFIX_PARAM)
            && pathTerms[i] !== realpathTerms[i]
          ) {
            return
          }
        }
        result = route
        return false
      }
    }
  )

  return result

}

/**
 * 完整解析 hash 数据
 */
function parseHash(routes: LinkedRoute[], hash: string) {

  let realpath: string, search: string | void, index = hash.indexOf('?')

  if (index >= 0) {
    realpath = hash.substring(0, index)
    search = hash.substring(index + 1)
  }
  else {
    realpath = hash
  }

  const result: Hash = { realpath },

  route = getRouteByRealpath(routes, realpath)

  if (route) {
    result.route = route
    const params = parseParams(realpath, route.path as string)
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

  let terms: string[] = [], realpath: string, search = ''

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

/**
 * 按照 propTypes 定义的外部数据格式过滤路由参数，这样有两个好处：
 *
 * 1. 避免传入不符预期的数据
 * 2. 避免覆盖 data 定义的数据
 */
function filterProps(props: type.data, options: YoxOptions) {
  const result: type.data = {}
  if (options.propTypes) {
    Yox.object.each(
      options.propTypes,
      function (rule: PropRule, key: string) {
        const defaultValue = Yox.checkProp(props, key, rule)
        result[key] = defaultValue !== UNDEFINED
          ? defaultValue
          : props[key]
      }
    )
  }
  return result
}

// 钩子函数的调用链
class Hooks {

  name: string

  list: Task[]

  constructor(name: string) {
    this.name = name
    this.list = []
  }

  add(target: Object | void, ctx: any) {
    const { name, list } = this
    if (target && Yox.is.func(target[name])) {
      list.push({
        fn: target[name] as Function,
        ctx,
      })
    }
    return this
  }

  run(to: Location, from: Location | void, success: Success | void, failure: Failure | void) {

    const { list } = this,

    next: Next = function (value?: false | Target) {
      if (value == null) {
        const task = list.shift()
        if (task) {
          task.fn.call(task.ctx, to, from, next)
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

  routes: LinkedRoute[]

  route404: LinkedRoute

  name2Path: Record<string, string>

  onHashChange: Function

  // 当前地址栏的路径和参数
  location?: Location

  // 当前渲染的路由
  route?: LinkedRoute

  [HOOK_BEFORE_ENTER]?: BeforeHook

  [HOOK_AFTER_ENTER]?: AfterHook

  [HOOK_BEFORE_LEAVE]?: BeforeHook

  [HOOK_AFTER_LEAVE]?: AfterHook

  constructor(options: RouterOptions) {

    const instance = this, routes: LinkedRoute[] = [], name2Path = {}

    instance.el = options.el

    /**
     * hashchange 事件处理函数
     * 此函数必须写在实例上，不能写在类上
     * 否则一旦解绑，所有实例都解绑了
     */
    instance.onHashChange = function () {

      let hashStr = location.hash

      // 如果不以 PREFIX_HASH 开头，表示不合法
      hashStr = Yox.string.startsWith(hashStr, PREFIX_HASH)
        ? hashStr.substr(PREFIX_HASH.length)
        : ''

      const hash = parseHash(routes, hashStr),

      { params, query } = hash,

      route = hash.route || instance.route404,

      props: type.data = {}

      if (params) {
        Yox.object.extend(props, params)
      }
      if (query) {
        Yox.object.extend(props, query)
      }

      instance.setRoute(
        {
          path: route.path,
          props,
          params,
          query,
        },
        route
      )

    }

    let route404: LinkedRoute | undefined,

    pathStack: string[] = [],

    routeStack: LinkedRoute[] = [],

    callback = function (route: RouteOptions) {

      let { name, path, component, children } = route

      // 如果 path 以 / 结尾，删掉它
      // 比如 { path: 'index/' }
      if (Yox.string.endsWith(path, SEPARATOR_PATH)) {
        path = Yox.string.slice(path, 0, -1)
      }

      // 如果 path 不是以 / 开头，有两种情况：
      // 1. 没有上级或上级是 ''，需要自动加 / 前缀
      // 2. 相对上级的路径，自动替换最后一个 / 后面的路径
      if (!Yox.string.startsWith(path, SEPARATOR_PATH)) {

        const parent = Yox.array.last(pathStack)

        if (path) {
          if (Yox.string.falsy(parent)) {
            path = SEPARATOR_PATH + path
          }
          else {
            path = parent + SEPARATOR_PATH + path
          }
        }
        else if (parent) {
          path = parent
        }

      }

      const linkedRoute: LinkedRoute = { path, route, component },

      parent = Yox.array.last(routeStack)

      if (parent) {
        linkedRoute.parent = parent
      }

      if (children) {
        pathStack.push(path)
        routeStack.push(linkedRoute)
        Yox.array.each(
          children,
          callback
        )
        pathStack.pop()
        routeStack.pop()
      }
      else {
        routes.push(linkedRoute)
      }

      if (name) {
        if (process.env.NODE_ENV === 'dev') {
          if (!Yox.object.has(name2Path, name)) {
            Yox.logger.error(`Name[${name}] of the route is existed.`)
            return
          }
        }
        name2Path[name] = path
      }
      if (path === ROUTE_404) {
        route404 = linkedRoute
      }

    }

    Yox.array.each(
      options.routes,
      callback
    )

    if (process.env.NODE_ENV === 'dev') {
      if (!route404) {
        Yox.logger.error(`Route for 404["${ROUTE_404}"] is required.`)
        return
      }
    }

    instance.name2Path = name2Path

    instance.routes = routes

    instance.route404 = route404 as LinkedRoute


  }

  /**
   * 真正执行路由切换操作的函数
   *
   * target 有 2 种格式：
   *
   * 如果只是简单的 path，直接传字符串
   *
   * push('/index')
   *
   * 如果需要带参数，可传对象
   *
   * push({
   *   path: '/index',
   *   params: { },
   *   query: { }
   * })
   *
   * 如果路由配置了 name，可用 name 代替 path，如下：
   *
   * push({
   *   name: 'index'
   * })
   *
   */
  push(target: Target) {

    let path: string, params: type.data | void, query: type.data | void

    if (Yox.is.string(target)) {
      path = target as string
    }
    else {
      params = (target as RouteTarget).params
      query = (target as RouteTarget).query

      const name = (target as RouteTarget).name
      if (name) {
        path = this.name2Path[name]
        if (process.env.NODE_ENV === 'dev') {
          if (!Yox.is.string(path)) {
            Yox.logger.error(`Name[${name}] of the route is not found.`)
            return
          }
        }
      }
      else {
        path = (target as RouteTarget).path as string
      }
    }

    location.hash = stringifyHash(path, params, query)

  }

  /**
   * 启动路由
   */
  start() {
    domApi.on(window, 'hashchange', this.onHashChange as type.listener)
    this.onHashChange()
  }

  /**
   * 停止路由
   */
  stop() {
    domApi.off(window, 'hashchange', this.onHashChange as type.listener)
  }

  /**
   * 切换路由
   */
  private setRoute(to: Location, route: LinkedRoute) {

    let instance = this,

    from = instance.location,

    childRoute: LinkedRoute | void,

    startRoute: LinkedRoute | void,

    failure: Failure = function (value: false | Target) {
      if (value === false) {
        // 流程到此为止，恢复到当前路由
        if (from
          && Yox.is.string(from.path)
          && from.path !== ROUTE_404
        ) {
          window.location.hash = stringifyHash(
            from.path as string,
            from.params,
            from.query
          )
        }
      }
      else {
        // 跳转到别的路由
        instance.push(value)
      }
    },

    callHook = function (name: string, success: Success | void, failure: Failure | void) {
      new Hooks(name)
      // 先调用组件的钩子
      // .add(currentComponent.options, currentComponent.root)
      // 再调用路由配置的钩子
      .add(location, route.route)
      // 最后调用路由实例的钩子
      .add(instance, instance)
      .run(to, from, success, failure)
    },

    // 对比新旧两个路由链表
    diffComponent = function (route: LinkedRoute, oldRoute: LinkedRoute | void, isLeafRoute: boolean | void) {

      // route 是注册时的路由，不能修改，因此这里拷贝一个
      let newRoute: LinkedRoute = Yox.object.copy(route)

      // 存储叶子路由，因为 diff 的过程是从下往上
      if (isLeafRoute) {
        instance.route = newRoute
      }

      // 不论是同步还是异步组件，都可以通过 registry.loadComponent 取到 options
      registry.loadComponent(
        newRoute.component,
        function (options) {

          newRoute.options = options

          // 更新链路
          if (childRoute) {
            newRoute.child = childRoute
            childRoute.parent = newRoute
          }

          childRoute = newRoute

          if (oldRoute) {
            // 同级的两个组件不同，疑似起始更新的路由
            if (oldRoute.options !== options) {
              startRoute = newRoute
            }
            else {
              // 把上次的组件实例搞过来
              const { context } = oldRoute
              if (context) {
                context[ROUTE] = newRoute
                newRoute.context = context
              }
            }
          }
          else {
            startRoute = newRoute
          }

          if (newRoute.parent) {
            diffComponent(
              newRoute.parent,
              oldRoute ? oldRoute.parent : UNDEFINED
            )
            return
          }

          // 到达根组件，结束

          // 从上往下更新 props
          while (true) {

            let { parent, context, component, options } = newRoute

            if (newRoute === startRoute) {

              if (parent) {

                context = parent.context as Yox
                context.forceUpdate(
                  filterProps(to.props, parent.options as YoxOptions)
                )

                context = context[OUTLET]
                if (context) {
                  const props = {}
                  props[COMPONENT] = component
                  context.component(component, options)
                  context.forceUpdate(props)
                }

              }
              else {
                if (context) {
                  context.destroy()
                }

                // 每层路由组件都有 $route 和 $router 属性
                const extensions = {}
                extensions[ROUTER] = instance
                extensions[ROUTE] = newRoute

                newRoute.context = new Yox(
                  Yox.object.extend(
                    {
                      el: instance.el,
                      props: filterProps(to.props, options as YoxOptions),
                      extensions,
                    },
                    options as YoxOptions
                  )
                )
              }

            }

            else if (context) {
              context.forceUpdate(
                filterProps(to.props, options as YoxOptions)
              )
              // 如果 <router-view> 定义在 if 里
              // 当 router-view 从无到有时，这里要读取最新的 child
              // 当 router-view 从有到无时，这里要判断它是否存在
              if (context[OUTLET] && newRoute.child) {
                newRoute = newRoute.child as LinkedRoute
                continue
              }
            }
            break
          }

        }
      )
    }

    instance.location = to

    diffComponent(route, instance.route, true)

  }

}

const directive = {
  bind(node: HTMLElement | Yox, directive: Directive, vnode: VNode) {

    // 当前组件如果是根组件，则没有 $root 属性
    const $root = vnode.context.$root || vnode.context,

    router: Router = $root[ROUTER],

    listener = function (_: CustomEvent) {
      const value = directive.getter && directive.getter()
      router.push(value != null ? value : directive.value)
    }

    if (vnode.isComponent) {
      (node as Yox).on(EVENT_CLICK, listener)
      vnode.data[directive.key] = function () {
        (node as Yox).off(EVENT_CLICK, listener)
      }
    }
    else {
      domApi.on(node as HTMLElement, EVENT_CLICK, listener)
      vnode.data[directive.key] = function () {
        domApi.off(node as HTMLElement, EVENT_CLICK, listener)
      }
    }

  },
  unbind(node: HTMLElement | Yox, directive: Directive, vnode: VNode) {
    vnode.data[directive.key]()
  },
}

const RouterView: YoxOptions = {
  template: '<$' + COMPONENT + '/>',
  beforeCreate(options) {

    const $parent = options.parent as Yox,

    route = $parent[ROUTE].child as LinkedRoute,

    props = {},

    components = {}

    $parent[OUTLET] = this

    props[COMPONENT] = route.component
    components[route.component] = route.options

    options.props = props
    options.components = components

  },
  beforeDestroy() {
    this.$parent[OUTLET] = UNDEFINED
  },
  beforeChildCreate(childOptions: YoxOptions) {

    const { $parent } = this,

    router = $parent[ROUTER] as Router,

    extensions = {}

    extensions[ROUTE] = $parent[ROUTE].child
    extensions[ROUTER] = router

    if (router.location) {
      childOptions.props = filterProps(router.location.props, childOptions)
    }

    childOptions.extensions = extensions

  },
  afterChildCreate(child: Yox) {
    child[ROUTE].context = child
  },
  beforeChildDestroy(child: Yox) {
    child[ROUTE].context = UNDEFINED
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
  registry.component(name, component)
}

/**
 * 安装插件
 */
export function install(Class: YoxClass): void {

  Yox = Class
  registry = new Class()
  domApi = Class.dom as API

  Yox.directive('href', directive)

  // 提供两种风格
  Yox.component({
    RouterView: RouterView,
    'router-view': RouterView,
  })

}
