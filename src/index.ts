import * as type from '../../yox-type/src/type'

import API from '../../yox-type/src/interface/API'
import Yox from '../../yox-type/src/interface/Yox'
import YoxClass from '../../yox-type/src/interface/YoxClass'
import Task from '../../yox-type/src/interface/Task'
import YoxOptions from '../../yox-type/src/options/Yox'
import VNode from '../../yox-type/src/vnode/VNode'
import Directive from '../../yox-type/src/vnode/Directive'
import CustomEvent from '../../dist/yox-type/src/event/CustomEvent'

let Yox: YoxClass, store: Yox, domApi: API

const UNDEFINED = void 0,

OUTLET = '$outlet',

ROUTE = '$route',

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
ROUTE_404 = '**',

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

type PathTarget = string

interface RouteTarget {
  name: string
  params?: type.data
  query?: type.data
}

type Target = PathTarget | RouteTarget

type next = (value?: false | Target) => void

type success = () => void

type failure = (value: false | Target) => void

type BeforeHook = (to: Route, from: Route | void, next: next) => void

type AfterHook = (to: Route, from: Route | void) => void

interface RouterOptions {
  el: Element,
  routes: RouteOptions[],
}

interface RouteOptions {
  path: string,
  component: string
  name?: string
  children?: RouteOptions[]
  [HOOK_REFRESHING]?: BeforeHook
  [HOOK_BEFORE_ENTER]?: BeforeHook
  [HOOK_AFTER_ENTER]?: AfterHook
  [HOOK_BEFORE_LEAVE]?: BeforeHook
  [HOOK_AFTER_LEAVE]?: AfterHook
}

interface LinkedRoute {
  path: string
  component: string
  route: RouteOptions
  parent: LinkedRoute | void
  child?: LinkedRoute
  options?: YoxOptions
  context?: Yox
}

interface Hash {
  realpath: string
  route?: LinkedRoute
  params?: type.data
  query?: type.data
}

interface Route {
  path: string
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

  let result: Hash = { realpath }, route = getRouteByRealpath(routes, realpath)

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

  run(to: Route, from: Route | void, success: success | void, failure: failure | void) {

    const { list } = this,

    next: next = function (value?: false | Target) {
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

  currentRoute?: Route

  currentLinkedRoute?: LinkedRoute

  [HOOK_REFRESHING]?: BeforeHook

  [HOOK_BEFORE_ENTER]?: BeforeHook

  [HOOK_AFTER_ENTER]?: AfterHook

  [HOOK_BEFORE_LEAVE]?: BeforeHook

  [HOOK_AFTER_LEAVE]?: AfterHook

  constructor(options: RouterOptions) {

    const instance = this, routes: LinkedRoute[] = []

    instance.el = options.el

    /**
     * 路由表 name -> path
     */
    instance.name2Path = {}

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

      route = hash.route || instance.route404

      instance.setRoute(
        {
          path: route.path,
          params: hash.params,
          query: hash.query,
        },
        route
      )

    }

    let route404: LinkedRoute | undefined,

    pathStack: string[] = [],

    routeStack: LinkedRoute[] = [],

    callback = function (route: RouteOptions) {

      let { name, path, children } = route

      // 如果 path 以 / 结尾，删掉它
      if (Yox.string.endsWith(path, SEPARATOR_PATH)) {
        path = Yox.string.slice(path, 0, -1)
      }

      // 如果 path 不是以 / 开头，有两种情况：
      // 1. 没有上级或上级是 ''，需要自动加 / 前缀
      // 2. 相对上级的路径，自动替换最后一个 / 后面的路径
      if (path !== ROUTE_404
        && !Yox.string.startsWith(path, SEPARATOR_PATH)
      ) {

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

      const linkedRoute: LinkedRoute = {
        path,
        route: route,
        component: route.component,
        parent: Yox.array.last(routeStack),
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
        instance.name2Path[name] = path
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

    instance.routes = routes
    instance.route404 = route404 as LinkedRoute

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
   * push('/index')
   *
   * 如果需要带参数，切记路由表要配置 name
   *
   * push({
   *   name: 'index',
   *   params: { },
   *   query: { }
   * })
   *
   * 如果没有任何参数，可以只传 path
   *
   * push('/index')
   *
   * 2. 不会改变 url
   *
   * push({
   *   component: 'index',
   *   props: { }
   * })
   *
   */
  push(target: Target) {
    if (Yox.is.string(target)) {
      location.hash = stringifyHash(target as PathTarget)
    }
    else {
      const { name, params, query } = target as RouteTarget, path = this.name2Path[name]

      if (process.env.NODE_ENV === 'dev') {
        if (!Yox.is.string(path)) {
          Yox.logger.error(`Name[${name}] of the route is not found.`)
          return
        }
      }

      location.hash = stringifyHash(path, params, query)
    }
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
  private setRoute(route: Route, linkedRoute: LinkedRoute) {

    /**
     * 切换路由时，可能是两棵组件树的切换
     *
     * 比如从 /user/list 切到 /user/detail，可能 /user 这个层级还活着，只是第二级组件变化了
     *
     * 也可能从 /user/list 切到 /setting/profile，整个组件树都切掉了
     *
     * 当发生切换时:
     * beforeEnter/afterEnter 从上往下 触发
     * beforeLeave/afterLeave 从下往上 触发
     */

    let instance = this,

    { currentRoute, currentLinkedRoute } = instance,

    props: type.data = {},

    childRoute: LinkedRoute | void,

    startRoute: LinkedRoute | void,

    failure: failure = function (value: false | Target) {
      if (value === false) {
        // 流程到此为止，恢复到当前路由
        if (currentRoute
          && Yox.is.string(currentRoute.path)
          && currentRoute.path !== ROUTE_404
        ) {
          location.hash = stringifyHash(
            currentRoute.path as string,
            currentRoute.params,
            currentRoute.query
          )
        }
      }
      else {
        // 跳转到别的路由
        instance.push(value)
      }
    },

    callHook = function (name: string, success: success | void, failure: failure | void) {
      new Hooks(name)
      // 先调用组件的钩子
      // .add(currentComponent.options, currentComponent.root)
      // 再调用路由配置的钩子
      .add(currentRoute, linkedRoute.route)
      // 最后调用路由实例的钩子
      .add(instance, instance)
      .run(route, currentRoute, success, failure)
    },

    createComponent1 = function (options: YoxOptions) {

      // currentComponent.options = options

      callHook(
        HOOK_BEFORE_ENTER,
        function () {



          // currentComponent.root = new Yox(
          //   Yox.object.extend(
          //     {
          //       el: instance.el,
          //       props,
          //       extensions: {
          //         $router: instance
          //       }
          //     },
          //     options
          //   )
          // )

          instance.currentRoute = route

          callHook(HOOK_AFTER_ENTER)

        },
        failure
      )
    },

    changeComponent1 = function (options: YoxOptions) {
      // callHook(
      //   HOOK_BEFORE_LEAVE,
      //   function () {
      //     if (currentComponent.root) {
      //       currentComponent.root.destroy()
      //       currentComponent.root = UNDEFINED
      //     }
      //     callHook(HOOK_AFTER_LEAVE)
      //     createComponent(options)
      //   },
      //   failure
      // )
    },

    loadComponent1 = function (options: YoxOptions) {
      // if (currentComponent.root) {
      //   // 当前根组件还活着，并且还要切到当前根组件，表示刷新一下
      //   if (currentComponent.options === options) {
      //     callHook(
      //       HOOK_REFRESHING,
      //       function () {
      //         // 如果 refreshing 钩子调用了 next()
      //         // 表示要销毁重建当前根组件
      //         changeComponent(options)
      //       },
      //       failure
      //     )
      //   }
      //   // 切换到其他组件
      //   else {
      //     changeComponent(options)
      //   }
      // }
      // // 第一次创建组件
      // else {
      //   createComponent(options)
      // }
    },

    createComponent = function (options: YoxOptions, el: Element, route: LinkedRoute, props: type.data | void) {
      return new Yox(
        Yox.object.extend(
          {
            el,
            props,
            extensions: {
              $router: instance,
              $route: route,
            }
          },
          options
        )
      )
    },

    // changeComponent = function (options: YoxOptions, component: Yox, props: type.data | void) {
    //   const { $options } = component
    //   component.destroy()

    //   const { vnode } = $options
    //   if (vnode) {
    //     domApi.html(vnode.node as Element, '')
    //     return vnode.context.createComponent(options, vnode)
    //   }
    //   return createComponent(options, instance.el, props)
    // },

    // 对比新旧两个路由链表
    diffComponent = function (linkedRoute: LinkedRoute, oldLinkedRoute: LinkedRoute | void, isLeafRoute: boolean | void) {

      const newLinkedRoute: LinkedRoute = Yox.object.copy(linkedRoute)

      if (isLeafRoute) {
        instance.currentLinkedRoute = newLinkedRoute
      }

      // 不论是同步还是异步组件，都可以通过 store.loadComponent 取到 options
      store.loadComponent(
        newLinkedRoute.component,
        function (options) {

          newLinkedRoute.options = options

          if (childRoute) {
            newLinkedRoute.child = childRoute
            childRoute.parent = newLinkedRoute
          }

          childRoute = newLinkedRoute

          if (oldLinkedRoute) {
            // 同级的两个组件不同，疑似起始更新的路由
            if (oldLinkedRoute.options !== options) {
              startRoute = newLinkedRoute
            }
            else {
              // 把上次的组件实例搞过来
              newLinkedRoute.context = oldLinkedRoute.context
            }
          }
          else {
            startRoute = newLinkedRoute
          }

          if (newLinkedRoute.parent) {
            diffComponent(
              newLinkedRoute.parent,
              oldLinkedRoute ? oldLinkedRoute.parent : UNDEFINED
            )
            return
          }

          // 到达根组件，结束
          console.log(newLinkedRoute)
          console.log(oldLinkedRoute)
          console.log(startRoute)

          if (startRoute) {
            const { parent } = startRoute
            if (parent) {
              const context: Yox = (parent.context as Yox)[OUTLET]
              context.component(startRoute.component, startRoute.options)
              context.set(COMPONENT, startRoute.component)
            }
            else {
              startRoute.context = createComponent(options, instance.el, startRoute, props)
            }
          }
          // 每个层级的 route 完全一致
          else {

          }

        }
      )
    }

    if (route.params) {
      Yox.object.extend(props, route.params)
    }
    if (route.query) {
      Yox.object.extend(props, route.query)
    }

    diffComponent(linkedRoute, currentLinkedRoute, true)

  }

}

const directive = {
  bind(node: HTMLElement | Yox, directive: Directive, vnode: VNode) {

    const root = vnode.context.$root || vnode.context,

    router: Router = root['$router'],

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

    const parentContext = options.parent as Yox, route = parentContext[ROUTE].child as LinkedRoute

    parentContext[OUTLET] = this

    const props: type.data = {}
    props[COMPONENT] = route.component

    options.props = props

    const components: type.data = {}
    components[route.component] = route.options

    options.components = components

  },
  beforeChildCreate(options) {

    const { $parent } = this

    options.extensions = {
      $route: $parent.$route.child,
      $router: $parent.$router
    }

  },
  afterChildCreate(child: Yox) {
    child[ROUTE].context = child
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

  Yox.directive('href', directive)

  // 提供两种风格
  Yox.component({
    RouterView: RouterView,
    'router-view': RouterView,
  })

}
