import {
  data,
  VNode,
  Directive,
  Location,
  RouteTarget,
} from '../../yox-type/src/type'

import {
  listener,
  CustomEventInterface,
  YoxOptions,
  YoxInterface,
  YoxClass,
} from '../../yox-type/src/global'

import {
  ROUTER_HOOK_BEFORE_ENTER,
  ROUTER_HOOK_AFTER_ENTER,
  ROUTER_HOOK_BEFORE_UPDATE,
  ROUTER_HOOK_AFTER_UPDATE,
  ROUTER_HOOK_BEFORE_LEAVE,
  ROUTER_HOOK_AFTER_LEAVE,
  SEPARATOR_PATH,
  PREFIX_PARAM,
  SEPARATOR_SEARCH,
} from './constant'

import {
  Mode,
  Target,
  RouterOptions,
  RouteOptions,
  LinkedRoute,
  Pending,
  Callback,
  Redirect,
} from './type'

import * as config from '../../yox-config/src/config'

import * as env from '../../yox-common/src/util/env'

import Hooks from './Hooks'
import * as queryUtil from './util/query'
import * as valueUtil from './util/value'

import * as hashMode from './mode/hash'
import * as historyMode from './mode/history'

let API: YoxClass, hookEvents: Record<string, listener>, guid = 0

const ROUTER = '$router',

ROUTE = '$route',

ROUTE_VIEW = '$routeView',

ROUTE_COMPONENT = 'RouteComponent',

EVENT_CLICK = 'click'

/**
 * 格式化路径，确保它以 / 开头，不以 / 结尾
 */
function formatPath(path: string, parentPath: string | void) {

  // 如果不是 / 开头，表示是相对路径
  if (!API.string.startsWith(path, SEPARATOR_PATH)) {
    // 确保 parentPath 以 / 结尾
    if (parentPath) {
      if (!API.string.endsWith(parentPath, SEPARATOR_PATH)) {
        parentPath += SEPARATOR_PATH
      }
    }
    else {
      parentPath = SEPARATOR_PATH
    }
    path = parentPath + path
  }

  // 如果 path 以 / 结尾，删掉它
  if (path !== SEPARATOR_PATH
    && API.string.endsWith(path, SEPARATOR_PATH)
  ) {
    path = API.string.slice(path, 0, -SEPARATOR_PATH.length)
  }

  return path

}

/**
 * 把结构化数据序列化成 url
 */
function stringifyUrl(path: string, params: data | void, query: data | void) {

  if (/\/\:\w+/.test(path)) {

    const terms: string[] = []

    API.array.each(
      path.split(SEPARATOR_PATH),
      function (item) {
        terms.push(
          API.string.startsWith(item, PREFIX_PARAM) && params
            ? params[item.substr(PREFIX_PARAM.length)]
            : item
        )
      }
    )

    path = terms.join(SEPARATOR_PATH)

  }

  if (query) {
    const queryStr = queryUtil.stringify(API, query)
    if (queryStr) {
      path += SEPARATOR_SEARCH + queryStr
    }
  }

  return path

}

function toUrl(target: Target, name2Path: data): string {

  if (API.is.string(target)) {
    return formatPath(target as string)
  }

  let route = target as RouteTarget, name = route.name, path: string
  if (name) {
    path = name2Path[name]
    if (process.env.NODE_ENV === 'development') {
      if (!API.is.string(path)) {
        API.logger.error(`The route of name[${name}] is not found.`)
      }
    }
  }
  else {
    path = formatPath(route.path as string)
  }

  return stringifyUrl(path, route.params, route.query)

}

/**
 * 按照 propTypes 定义的外部数据格式过滤路由参数，这样有两个好处：
 *
 * 1. 避免传入不符预期的数据
 * 2. 避免覆盖 data 定义的数据
 */
function filterProps(route: LinkedRoute, location: Location, options: YoxOptions) {
  const result: data = {}, propTypes = options.propTypes
  if (propTypes) {

    let props = location.query,

    routeParams = route.params,

    locationParams = location.params

    // 从 location.params 挑出 route.params 定义过的参数
    if (routeParams && locationParams) {
      props = props ? API.object.copy(props) : {}
      for (let i = 0, length = routeParams.length; i < length; i++) {
        (props as data)[routeParams[i]] = locationParams[routeParams[i]]
      }
    }

    if (props) {
      for (let key in propTypes) {
        let value = props[key]
        if (value !== env.UNDEFINED) {
          result[key] = value
        }
      }
    }

  }
  return result
}

/**
 * 是否是叶子节点
 * 如果把叶子节点放在 if 中，会出现即使不是定义时的叶子节点，却是运行时的叶子节点
 */
function isLeafRoute(route: LinkedRoute) {
  const child = route.child
  return !child || !child.context
}

function updateRoute(instance: YoxInterface, componentHookName: string | void, hookName: string | undefined, upsert?: boolean) {
  const route = instance[ROUTE] as LinkedRoute
  if (route) {
    route.context = upsert ? instance : env.UNDEFINED
    if (isLeafRoute(route)) {
      const router = instance[ROUTER] as Router
      if (componentHookName && hookName) {
        router.hook(route, componentHookName, hookName)
      }
      if (upsert) {
        const { pending } = router
        if (pending) {
          pending.onComplete()
          router.pending = env.UNDEFINED
        }
      }
    }
  }
}

export class Router {

  el: Element

  options: RouterOptions

  routes: LinkedRoute[]

  route404: LinkedRoute

  name2Path: Record<string, string>

  path2Route: Record<string, LinkedRoute>

  mode: Mode

  history: Location[]

  cursor: number

  pending?: Pending

  // 路由钩子
  hooks: Hooks

  // 路由或参数发生了变化会触发此函数
  handler: Function

  // 当前渲染的路由
  route?: LinkedRoute

  // 当前地址栏的路径和参数
  location?: Location

  constructor(options: RouterOptions) {

    const instance = this, el = options.el, route404 = options.route404 || default404

    instance.options = options

    instance.el = API.is.string(el)
      ? API.dom.find(el as string) as Element
      : el as Element

    if (process.env.NODE_ENV === 'development') {
      if (!instance.el) {
        API.logger.error(`router.el is not an element.`)
        return
      }
    }

    instance.mode = options.mode === 'history' && historyMode.isSupported ? historyMode : hashMode

    instance.handler = function () {

      const url = instance.mode.current(), { pending } = instance

      if (pending) {
        const { location } = pending
        // 通过 push 或 go 触发
        if (location.url === url) {
          instance.setHistory(location, pending.cursor)
          instance.setRoute(location)
          return
        }
        instance.pending = env.UNDEFINED
      }

      // 直接修改地址栏触发
      instance.parseLocation(
        url,
        function (location) {
          if (location) {
            instance.setHistory(location)
            instance.setRoute(location)
          }
          else {
            instance.push(instance.route404)
          }
        }
      )
    }

    instance.routes = []
    instance.name2Path = {}
    instance.path2Route = {}

    instance.history = []
    instance.cursor = -1

    instance.hooks = new Hooks()

    API.array.each(
      options.routes,
      function (route) {
        instance.add(route)
      }
    )

    instance.route404 = instance.add(route404)[0]

  }

  /**
   * 添加一个新的路由
   */
  add(routeOptions: RouteOptions) {

    const instance = this,

    newRoutes: LinkedRoute[] = [],

    pathStack: string[] = [],

    routeStack: LinkedRoute[] = [],

    addRoute = function (routeOptions: RouteOptions) {

      let { name, component, children, load } = routeOptions,

      parentPath = API.array.last(pathStack),

      parentRoute = API.array.last(routeStack),

      path = formatPath(routeOptions.path, parentPath),

      route: LinkedRoute = { path, route: routeOptions },

      params: string[] = []

      API.array.each(
        path.split(SEPARATOR_PATH),
        function (item) {
          if (API.string.startsWith(item, PREFIX_PARAM)) {
            params.push(
              item.substr(PREFIX_PARAM.length)
            )
          }
        }
      )

      if (params.length) {
        route.params = params
      }

      if (name) {
        route.name = name
      }

      // component 和 load 二选一
      if (component) {
        route.component = component
      }
      else if (load) {
        route.load = load
      }

      if (parentRoute) {
        route.parent = parentRoute
      }

      if (children) {
        pathStack.push(path)
        routeStack.push(route)
        API.array.each(
          children,
          addRoute
        )
        routeStack.pop()
        pathStack.pop()
      }
      else {

        newRoutes.push(route)
        instance.routes.push(route)

        if (name) {
          if (process.env.NODE_ENV === 'development') {
            if (API.object.has(instance.name2Path, name)) {
              API.logger.error(`Name[${name}] of the route is existed.`)
              return
            }
          }
          instance.name2Path[name] = path
        }

        if (process.env.NODE_ENV === 'development') {
          if (API.object.has(instance.path2Route, path)) {
            API.logger.error(`path [${path}] of the route is existed.`)
            return
          }
        }

        instance.path2Route[path] = route

      }

    }

    addRoute(routeOptions)

    return newRoutes

  }

  /**
   * 删除一个已注册的路由
   */
  remove(route: LinkedRoute) {

    const instance = this

    API.array.remove(instance.routes, route)

    if (route.name) {
      delete instance.name2Path[route.name]
    }

    delete instance.path2Route[route.path]

  }

  /**
   * target 有 3 种格式：
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

    const instance = this, { mode } = instance

    instance.setUrl(
      toUrl(target, instance.name2Path),
      env.EMPTY_FUNCTION,
      env.EMPTY_FUNCTION,
      function (location, pending) {
        instance.pending = pending
        if (mode.current() !== location.url) {
          mode.push(location, instance.handler)
        }
        else {
          instance.setRoute(location)
        }
      }
    )

  }

  /**
   * 不改变 URL，只修改路由组件
   */
  replace(target: Target) {

    const instance = this

    instance.setUrl(
      toUrl(target, instance.name2Path),
      function () {
        instance.replaceHistory(instance.location as Location)
      },
      env.EMPTY_FUNCTION,
      function (location, pending) {
        instance.pending = pending
        instance.setRoute(location)
      }
    )

  }

  /**
   * 前进或后退 n 步
   */
  go(n: number) {

    const instance = this,

    { mode } = instance,

    cursor = instance.cursor + n,

    location = instance.history[cursor]

    if (location) {
      instance.setUrl(
        stringifyUrl(location.path, location.params, location.query),
        env.EMPTY_FUNCTION,
        env.EMPTY_FUNCTION,
        function (location, pending) {
          pending.cursor = cursor
          instance.pending = pending

          if (mode.current() !== location.url) {
            mode.go(n)
          }
          else {
            instance.setHistory(location, cursor)
            instance.setRoute(location)
          }
        }
      )
    }

  }

  /**
   * 启动路由
   */
  start() {
    this.mode.start(API.dom, this.handler)
  }

  /**
   * 停止路由
   */
  stop() {
    this.mode.stop(API.dom, this.handler)
  }

  /**
   * 钩子函数
   */
  hook(route: LinkedRoute, componentHook: string, hook: string, isGuard?: boolean, callback?: Callback) {

    const instance = this, { location, hooks, pending } = instance

    hooks
      .clear()
      // 先调用组件的钩子
      .add((route.component as YoxOptions)[componentHook], route.context)
      // 再调用路由配置的钩子
      .add(route.route[hook], route.route)
      // 最后调用路由实例的钩子
      .add(instance.options[hook], instance)

    const next = function (value?: false | Target) {
      if (value === env.UNDEFINED) {
        hooks.next(next, isGuard, callback)
      }
      else {
        // 只有前置守卫才有可能走进这里
        // 此时 instance.location 还是旧地址
        if (pending) {
          pending.onAbort()
          instance.pending = env.UNDEFINED
        }
        if (value === env.FALSE) {
          if (location) {
            instance.push(location)
          }
        }
        else {
          // 跳转到别的路由
          instance.push(value)
        }
      }
    }

    next()

  }

  private setHistory(location: Location, index: number | void) {

    const { history, cursor } = this

    // 如果没传 cursor，表示 push
    if (!API.is.number(index)) {
      index = cursor + 1
      // 确保下一个为空
      // 如果不为空，肯定是调用过 go()，此时直接清掉后面的就行了
      if (history[index]) {
        history.length = index
      }
    }

    history[index as number] = location

    this.cursor = index as number

  }

  private replaceHistory(location: Location) {
    const { history, cursor } = this
    if (history[cursor]) {
      history[cursor] = location
    }
  }

  private setUrl(
    url: string,
    onComplete: Callback,
    onAbort: Callback,
    callback: (locaiton: Location, pending: Pending) => void
  ) {

    // 这里无需判断新旧 url 是否相同，因为存在 replace，即使它们相同也不等价于不用跳转
    const instance = this

    instance.parseLocation(
      url,
      function (location) {

        if (location) {
          callback(
            location,
            {
              location,
              onComplete,
              onAbort,
            }
          )
        }
        else if (process.env.NODE_ENV === 'development') {
          API.logger.error(`"${url}" can't match a route.`)
        }

      }
    )

  }

  private parseLocation(url: string, callback: (location?: Location) => void) {

    let realpath: string, search: string | void, index = url.indexOf(SEPARATOR_SEARCH)

    if (index >= 0) {
      realpath = url.slice(0, index)
      search = url.slice(index + 1)
    }
    else {
      realpath = url
    }

    // 匹配已注册的 route
    const instance = this,

    realpathTerms = realpath.split(SEPARATOR_PATH),

    length = realpathTerms.length,

    matchRoute = function (
      routes: LinkedRoute[],
      callback: (route?: LinkedRoute, params?: data) => void
    ) {

      let index = 0, route: LinkedRoute | void

      loop: while (route = routes[index++]) {
        const path = route.path

        // 动态路由
        if (route.params) {
          const pathTerms = path.split(SEPARATOR_PATH)
          // path 段数量必须一致，否则没有比较的意义
          if (length === pathTerms.length) {
            const params: data = {}
            for (let i = 0; i < length; i++) {
              if (API.string.startsWith(pathTerms[i], PREFIX_PARAM)) {
                params[pathTerms[i].substr(PREFIX_PARAM.length)] = valueUtil.parse(API, realpathTerms[i])
              }
              // 非参数段不相同
              else if (pathTerms[i] !== realpathTerms[i]) {
                continue loop
              }
            }
            callback(route, params)
            return
          }
        }
        // 懒加载路由，前缀匹配成功后，意味着懒加载回来的路由一定有我们想要的
        else if (route.load && API.string.startsWith(realpath, path)) {
          route.load(
            function (lazyRoute) {
              instance.remove(route as LinkedRoute)
              matchRoute(
                instance.add(lazyRoute),
                callback
              )
            }
          )
          return
        }
        else if (path === realpath) {
          callback(route)
          return
        }
      }

      callback()

    }

    matchRoute(
      instance.routes,
      function (route, params) {
        if (route) {
          const location: Location = {
            url,
            path: route.path
          }
          if (params) {
            location.params = params
          }
          if (search) {
            const query = queryUtil.parse(API, search)
            if (query) {
              location.query = query
            }
          }
          callback(location)
        }
        else {
          callback()
        }
      }
    )

  }

  private diffRoute(
    route: LinkedRoute,
    oldRoute: LinkedRoute | void,
    onComplete: (route: LinkedRoute, startRoute: LinkedRoute | void) => void,
    startRoute: LinkedRoute | void,
    childRoute: LinkedRoute | void,
    oldTopRoute: LinkedRoute | void
  ) {

    // 更新链路
    if (childRoute) {
      route.child = childRoute
      childRoute.parent = route
    }

    if (oldRoute) {
      // 同级的两个组件不同，疑似起始更新的路由
      if (oldRoute.component !== route.component) {
        startRoute = route
      }
      else {
        // 把上次的组件实例搞过来
        route.context = oldRoute.context
      }
    }
    else {
      startRoute = route
    }

    if (route.parent) {
      this.diffRoute(
        API.object.copy(route.parent),
        oldRoute ? oldRoute.parent : env.UNDEFINED,
        onComplete,
        startRoute,
        route,
        oldRoute || oldTopRoute
      )
      return
    }

    // 整个组件树全换掉
    if (startRoute === route) {
      let context: YoxInterface | void
      // 当层级较多的路由切换到层级较少的路由
      if (oldRoute) {
        while (oldRoute) {
          context = oldRoute.context
          oldRoute = oldRoute.parent
        }
      }
      // 当层级较少的路由切换到层级较多的路由
      else if (oldTopRoute) {
        context = oldTopRoute.context
      }
      if (context) {
        startRoute.context = context
      }
    }

    // 到达根组件，结束
    onComplete(route, startRoute)

  }

  private patchRoute(
    route: LinkedRoute,
    startRoute: LinkedRoute | void
  ) {

    const instance = this, location = instance.location as Location

    // 从上往下更新 props
    while (route) {

      let { parent, context, component } = route

      if (route === startRoute) {

        if (parent) {

          context = parent.context as YoxInterface
          context.forceUpdate(
            filterProps(
              parent,
              location,
              parent.component as YoxOptions
            )
          )

          context = context[ROUTE_VIEW]
          if (context) {
            const props = {}, name = ROUTE_COMPONENT + (++guid)
            props[ROUTE_COMPONENT] = name
            context.component(name, component)
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
          extensions[ROUTE] = route

          const options: YoxOptions = API.object.extend(
            {
              el: instance.el,
              props: filterProps(route, location, component as YoxOptions),
              extensions,
            },
            component as YoxOptions
          )

          options.events = options.events
            ? API.object.extend(options.events, hookEvents)
            : hookEvents

          route.context = new API(options)

        }

      }

      else if (context) {
        if (context.$vnode) {
          context[ROUTE] = route
          context.forceUpdate(
            filterProps(route, location, component as YoxOptions)
          )
        }
        else {
          route.context = env.UNDEFINED
        }
        if (route.child) {
          route = route.child as LinkedRoute
          continue
        }
      }
      break
    }
  }

  private setRoute(location: Location) {

    let instance = this,

    linkedRoute = instance.path2Route[location.path],

    redirect = linkedRoute.route.redirect

    if (redirect) {
      if (API.is.func(redirect)) {
        redirect = (redirect as Redirect)(location)
      }
      if (redirect) {
        instance.push(redirect as Target)
        return
      }
    }

    const newRoute = API.object.copy(linkedRoute),

    oldRoute = instance.route,

    oldLocation = instance.location,

    enterRoute = function () {
      instance.diffRoute(
        newRoute,
        oldRoute,
        function (route, startRoute) {
          instance.hook(
            newRoute,
            startRoute ? config.HOOK_BEFORE_ROUTE_ENTER : config.HOOK_BEFORE_ROUTE_UPDATE,
            startRoute ? ROUTER_HOOK_BEFORE_ENTER : ROUTER_HOOK_BEFORE_UPDATE,
            env.TRUE,
            function () {

              instance.route = newRoute
              instance.location = location

              instance.patchRoute(route, startRoute)

            }
          )
        }
      )
    }

    instance.hooks.setLocation(location, oldLocation)

    if (oldRoute && oldLocation && location.path !== oldLocation.path) {
      instance.hook(
        oldRoute,
        config.HOOK_BEFORE_ROUTE_LEAVE,
        ROUTER_HOOK_BEFORE_LEAVE,
        env.TRUE,
        enterRoute
      )
      return
    }

    enterRoute()

  }

}

const default404 = {
  path: '/404',
  component: {
    template: '<div>This is a default 404 page, please set "route404" for your own 404 page.</div>'
  }
},

directive = {
  bind(node: HTMLElement | YoxInterface, directive: Directive, vnode: VNode) {

    // 当前组件如果是根组件，则没有 $root 属性
    const $root = vnode.context.$root || vnode.context,

    router = $root[ROUTER] as Router,

    listener = vnode.data[directive.key] = function (_: CustomEventInterface) {
      let { value, getter } = directive, target: any = value
      if (value && getter && API.string.has(value as string, '{')) {
        target = getter()
      }
      router[directive.name](target)
    }

    if (vnode.isComponent) {
      (node as YoxInterface).on(EVENT_CLICK, listener)
    }
    else {
      API.dom.on(node as HTMLElement, EVENT_CLICK, listener)
    }

  },
  unbind(node: HTMLElement | YoxInterface, directive: Directive, vnode: VNode) {
    const listener = vnode.data[directive.key]
    if (vnode.isComponent) {
      (node as YoxInterface).off(EVENT_CLICK, listener)
    }
    else {
      API.dom.off(node as HTMLElement, EVENT_CLICK, listener)
    }
  },
},

RouterView: YoxOptions = {
  template: '<$' + ROUTE_COMPONENT + '/>',
  beforeCreate(options) {

    const context = options.context as YoxInterface,

    route = context[ROUTE].child as LinkedRoute

    if (route) {

      context[ROUTE_VIEW] = this

      const props = options.props = {}, components = options.components = {},

      name = ROUTE_COMPONENT + (++guid)

      props[ROUTE_COMPONENT] = name
      components[name] = route.component

    }

  },
  beforeDestroy() {
    this.$context[ROUTE_VIEW] = env.UNDEFINED
  }
}

/**
 * 版本
 */
export const version = process.env.NODE_VERSION

/**
 * 安装插件
 */
export function install(Yox: YoxClass): void {

  API = Yox

  Yox.directive({
    push: directive,
    replace: directive,
    go: directive,
  })

  Yox.component('router-view', RouterView)

  hookEvents = {
    'beforeCreate.hook': function (event: CustomEventInterface, data?: data) {
      if (data) {
        let options = data as YoxOptions, { context } = options
        // 当前组件是 <router-view> 中的动态组件
        if (context && context.$options.beforeCreate === RouterView.beforeCreate) {
          // 找到渲染 <router-view> 的父级组件，它是一定存在的
          context = context.$context as YoxInterface

          const router = context[ROUTER] as Router,
          route = context[ROUTE].child as LinkedRoute

          if (route) {
            const extensions = options.extensions = {}
            extensions[ROUTER] = router
            extensions[ROUTE] = route

            if (router.location) {
              options.props = filterProps(route, router.location, options)
            }
          }
        }
      }
    },
    'afterMount.hook': function (event: CustomEventInterface) {
      updateRoute(
        event.target as YoxInterface,
        config.HOOK_AFTER_ROUTE_ENTER,
        ROUTER_HOOK_AFTER_ENTER,
        env.TRUE
      )
    },
    'afterUpdate.hook': function (event: CustomEventInterface) {
      updateRoute(
        event.target as YoxInterface,
        config.HOOK_AFTER_ROUTE_UPDATE,
        ROUTER_HOOK_AFTER_UPDATE,
        env.TRUE
      )
    },
    'afterDestroy.hook': function (event: CustomEventInterface) {
      updateRoute(
        event.target as YoxInterface,
        config.HOOK_AFTER_ROUTE_LEAVE,
        ROUTER_HOOK_AFTER_LEAVE
      )
    }
  }

}