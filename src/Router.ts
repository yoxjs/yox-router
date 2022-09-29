import Yox, {
  Data,
  VNode,
  Directive,
  ComponentOptions,
  YoxInterface,
} from 'yox'

import {
  TRUE,
  FALSE,
  UNDEFINED,

  MODE_HISTORY,
  PREFIX_PARAM,
  SEPARATOR_PATH,
  SEPARATOR_SEARCH,

  ROUTER_HOOK_BEFORE_ENTER,
  ROUTER_HOOK_AFTER_ENTER,
  ROUTER_HOOK_BEFORE_UPDATE,
  ROUTER_HOOK_AFTER_UPDATE,
  ROUTER_HOOK_BEFORE_LEAVE,
  ROUTER_HOOK_AFTER_LEAVE,
  ROUTER_HOOK_BEFORE_LOAD,
  ROUTER_HOOK_AFTER_LOAD,

  COMPONENT_HOOK_BEFORE_ENTER,
  COMPONENT_HOOK_AFTER_ENTER,
  COMPONENT_HOOK_BEFORE_UPDATE,
  COMPONENT_HOOK_AFTER_UPDATE,
  COMPONENT_HOOK_BEFORE_LEAVE,
  COMPONENT_HOOK_AFTER_LEAVE,
} from './constant'

import {
  Target,
  Location,
  RouteTarget,
  RouterOptions,
  RouteOptions,
  LinkedRoute,
  RoutePending,
  Redirect,
  RouteCallback,
  RouterMode,
  RouteBeforeHook,
  RouteAfterHook,
} from './type'

import Hooks from './Hooks'

import * as queryUtil from './util/query'
import * as valueUtil from './util/value'

import * as hashMode from './mode/hash'
import * as historyMode from './mode/history'

let guid = 0

const ROUTE_COMPONENT = 'RouteComponent',

EVENT_CLICK = 'click'

/**
 * 格式化路径，确保它以 / 开头，不以 / 结尾
 */
function formatPath(path: string, parentPath: string | void) {

  // 如果不是 / 开头，表示是相对路径
  if (!Yox.string.startsWith(path, SEPARATOR_PATH)) {
    // 确保 parentPath 以 / 结尾
    if (parentPath) {
      if (!Yox.string.endsWith(parentPath, SEPARATOR_PATH)) {
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
    && Yox.string.endsWith(path, SEPARATOR_PATH)
  ) {
    path = Yox.string.slice(path, 0, -SEPARATOR_PATH.length)
  }

  return path

}

/**
 * 把结构化数据序列化成 url
 */
function stringifyUrl(path: string, params: Data | void, query: Data | void) {

  if (/\/\:\w+/.test(path)) {

    const terms: string[] = []

    Yox.array.each(
      path.split(SEPARATOR_PATH),
      function (item) {
        terms.push(
          Yox.string.startsWith(item, PREFIX_PARAM) && params
            ? params[item.substring(PREFIX_PARAM.length)]
            : item
        )
      }
    )

    path = terms.join(SEPARATOR_PATH)

  }

  if (query) {
    const queryStr = queryUtil.stringify(query)
    if (queryStr) {
      path += SEPARATOR_SEARCH + queryStr
    }
  }

  return path

}

/**
 * 按照 propTypes 定义的外部数据格式过滤路由参数，这样有两个好处：
 *
 * 1. 避免传入不符预期的数据
 * 2. 避免覆盖 data 定义的数据
 */
function filterProps(route: LinkedRoute, location: Location, options: ComponentOptions) {
  const result: Data = {}, propTypes = options.propTypes
  if (propTypes) {

    let props = location.query,

    routeParams = route.params,

    locationParams = location.params

    // 从 location.params 挑出 route.params 定义过的参数
    if (routeParams && locationParams) {
      props = props ? Yox.object.copy(props) : {}
      for (let i = 0, length = routeParams.length; i < length; i++) {
        (props as Data)[routeParams[i]] = locationParams[routeParams[i]]
      }
    }

    if (props) {
      for (let key in propTypes) {
        let value = props[key]
        if (value !== UNDEFINED) {
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

function updateRoute(instance: YoxInterface, componentHookName: string | void, routerHookName: string | undefined, upsert?: boolean) {
  const route = instance.$route as LinkedRoute
  if (route) {
    route.context = upsert ? instance : UNDEFINED
    if (isLeafRoute(route)) {
      const router = instance.$router as Router
      if (componentHookName && routerHookName) {
        router.hook(route, componentHookName, routerHookName, FALSE)
      }
      if (upsert) {
        const { pending } = router
        if (pending) {
          pending.onComplete()
          router.pending = UNDEFINED
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

  mode: RouterMode

  pending?: RoutePending

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

    instance.el = Yox.is.string(el)
      ? Yox.dom.find(el as string) as Element
      : el as Element

    if (process.env.NODE_ENV === 'development') {
      if (!instance.el) {
        Yox.logger.error(`The "el" option must be an element or a selector.`)
        return
      }
    }

    instance.mode = options.mode === MODE_HISTORY && historyMode.isSupported
      ? historyMode
      : hashMode

    instance.handler = function () {

      // 从地址栏读取最新 url
      instance.parseLocation(
        instance.mode.current(),
        function (location) {
          if (location) {
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

    instance.hooks = new Hooks()

    Yox.array.each(
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
  add(routeOptions: RouteOptions, parentRoute: LinkedRoute | void) {

    const instance = this,

    newRoutes: LinkedRoute[] = [],

    pathStack: string[] = [],

    routeStack: LinkedRoute[] = [],

    addRoute = function (routeOptions: RouteOptions) {

      let { name, component, children, load } = routeOptions,

      parentPath = Yox.array.last(pathStack),

      parentRoute = Yox.array.last(routeStack),

      path = formatPath(routeOptions.path, parentPath),

      route: LinkedRoute = { path, route: routeOptions },

      params: string[] = []

      Yox.array.each(
        path.split(SEPARATOR_PATH),
        function (item) {
          if (Yox.string.startsWith(item, PREFIX_PARAM)) {
            params.push(
              item.substring(PREFIX_PARAM.length)
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
      if (load) {
        route.load = load
      }
      else {
        // 每一级都必须有一个组件
        // 如果没有，则用占位组件，避免业务层写太多无用的组件
        route.component = component || placeholderComponent
      }

      if (parentRoute) {
        route.parent = parentRoute
      }

      if (children) {
        pathStack.push(path)
        routeStack.push(route)
        Yox.array.each(
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
            if (Yox.object.has(instance.name2Path, name)) {
              Yox.logger.error(`The name "${name}" of the route is existed.`)
              return
            }
          }
          instance.name2Path[name] = path
        }

        if (process.env.NODE_ENV === 'development') {
          if (Yox.object.has(instance.path2Route, path)) {
            Yox.logger.error(`The path "${path}" of the route is existed.`)
            return
          }
        }

        instance.path2Route[path] = route

      }

    }

    if (parentRoute) {
      pathStack.push(parentRoute.path)
      routeStack.push(parentRoute)
    }

    addRoute(routeOptions)

    return newRoutes

  }

  /**
   * 删除一个已注册的路由
   */
  remove(route: LinkedRoute) {

    const instance = this

    Yox.array.remove(instance.routes, route)

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
   * 也可以不传 path 或 name，只传 params 或 query
   * 表示不修改 path，仅修改 params 或 query
   *
   */
  push(target: Target) {

    const instance = this, { mode } = instance

    instance.setUrl(
      instance.toUrl(target),
      function (location) {
        if (mode.current() !== location.url) {
          mode.push(location, instance.handler)
        }
      }
    )

  }

  /**
   * 替换当前路由栈
   */
  replace(target: Target) {

    const instance = this, { mode } = instance

    instance.setUrl(
      instance.toUrl(target),
      function (location) {
        if (mode.current() !== location.url) {
          mode.replace(location, instance.handler)
        }
      }
    )

  }

  /**
   * 前进或后退 n 步
   */
  go(n: number) {
    this.mode.go(n)
  }

  /**
   * 启动路由
   */
  start() {
    this.mode.start(this.handler)
  }

  /**
   * 停止路由
   */
  stop() {
    this.mode.stop(this.handler)
  }

  /**
   * 钩子函数
   */
  hook(route: LinkedRoute, componentHook: string, routerHook: string, isGuard: boolean, callback?: Function) {

    const instance = this,

    { location, hooks, pending } = instance,

    { context } = route,

    onComplete = function () {
      // 如果钩子未被拦截，则会走进 onComplete
      if (context) {
        Yox.lifeCycle.fire(
          context,
          componentHook,
          {
            from: hooks.from,
            to: hooks.to,
          }
        )
      }
      // 在发事件之后调用 callback
      // 因为 callback 有可能销毁组件，导致事件发不出去
      if (callback) {
        callback()
      }
    },

    next = function (value?: false | Target) {
      if (value === UNDEFINED) {
        hooks.next(isGuard, next, onComplete)
      }
      else {
        // 只有前置守卫才有可能走进这里
        // 此时 instance.location 还是旧地址
        if (pending) {
          pending.onAbort()
          instance.pending = UNDEFINED
        }
        if (value === FALSE) {
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

    hooks
      .clear()
      // 先调用组件的钩子
      .add((route.component as ComponentOptions)[componentHook], context)
      // 再调用路由配置的钩子
      .add(route.route[routerHook], route.route)
      // 最后调用路由实例的钩子
      .add(instance.options[routerHook], instance)

    next()

  }

  private toUrl(target: Target): string {

    if (Yox.is.string(target)) {
      return formatPath(target as string)
    }

    let instance = this,

    location = instance.location,

    routeTarget = target as RouteTarget,

    params = routeTarget.params,

    path: string | void

    if (routeTarget.name) {
      path = instance.name2Path[routeTarget.name]
    }
    else if (routeTarget.path) {
      path = formatPath(routeTarget.path)
    }
    else if (location) {
      path = location.path
      if (!params) {
        params = location.params
      }
    }

    if (process.env.NODE_ENV === 'development') {
      if (!Yox.is.string(path)) {
        Yox.logger.error(`The path is not found.`)
      }
    }

    return stringifyUrl(
      path as string,
      params,
      routeTarget.query
    )

  }

  private setUrl(url: string, callback: (locaiton: Location) => void) {

    // 这里无需判断新旧 url 是否相同，因为存在 replace，即使它们相同也不等价于不用跳转
    const instance = this

    instance.parseLocation(
      url,
      function (location) {
        if (location) {
          callback(location)
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

    { options, routes, location } = instance,

    realpathTerms = realpath.split(SEPARATOR_PATH),

    length = realpathTerms.length,

    createLocation = function (
      route: LinkedRoute,
      params?: Data
    ) {
      const location: Location = {
        url,
        path: route.path
      }
      if (params) {
        location.params = params
      }
      if (search) {
        const query = queryUtil.parse(search)
        if (query) {
          location.query = query
        }
      }
      return location
    },

    matchRoute = function (
      route: LinkedRoute,
      callback: (location?: Location) => boolean
    ) {
      const path = route.path

      // 动态路由
      if (route.params) {
        const pathTerms = path.split(SEPARATOR_PATH)
        // path 段数量必须一致，否则没有比较的意义
        if (length === pathTerms.length) {

          const params: Data = { }

          for (let i = 0; i < length; i++) {
            if (Yox.string.startsWith(pathTerms[i], PREFIX_PARAM)) {
              params[pathTerms[i].substring(PREFIX_PARAM.length)] = valueUtil.parse(realpathTerms[i])
            }
            // 非参数段不相同
            else if (pathTerms[i] !== realpathTerms[i]) {
              return
            }
          }

          return callback(
            createLocation(route, params)
          )
        }
      }
      // 懒加载路由，前缀匹配成功后，意味着懒加载回来的路由一定有我们想要的
      else if (route.load && Yox.string.startsWith(realpath, path)) {

        if (route.loading) {
          return TRUE
        }

        const beforeLoad = options[ROUTER_HOOK_BEFORE_LOAD],
        afterLoad = options[ROUTER_HOOK_AFTER_LOAD],
        routeCallback: RouteCallback = function (lazyRoute) {

          instance.remove(route as LinkedRoute)

          // 支持函数，方便动态生成路由，比如根据权限创建不同的路由
          let lazyRouteOptions = lazyRoute['default'] || lazyRoute
          if (Yox.is.func(lazyRouteOptions)) {
            lazyRouteOptions = lazyRouteOptions()
          }

          // 注册新的路由
          const newRoutes = instance.add(lazyRouteOptions, (route as LinkedRoute).parent)

          // 懒加载到此结束
          route.loading = FALSE

          if (location === instance.location) {
            matchRoutes(
              newRoutes,
              function (newLocation) {
                if (afterLoad) {
                  afterLoad.call(instance, realpath, newLocation)
                }
                return callback(newLocation)
              }
            )
          }
          else if (afterLoad) {
            afterLoad.call(instance, realpath)
          }

        }

        route.loading = TRUE

        if (beforeLoad) {
          beforeLoad.call(instance, realpath)
        }

        const promise = route.load(routeCallback)
        if (promise) {
          promise.then(routeCallback)
        }

        return TRUE
      }
      else if (path === realpath) {
        return callback(
          createLocation(route)
        )
      }
    },

    matchRoutes = function (
      routes: LinkedRoute[],
      callback: (location?: Location) => boolean
    ) {
      for (let i = 0, length = routes.length; i < length; i++) {
        if (matchRoute(routes[i], callback)) {
          return
        }
      }
      callback()
    }

    matchRoutes(
      routes,
      function (location) {
        if (process.env.NODE_ENV === 'development') {
          if (!location) {
            Yox.logger.error(`The path "${realpath}" can't match a route.`)
          }
        }
        callback(location)
        return TRUE
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
        Yox.object.copy(route.parent),
        oldRoute ? oldRoute.parent : UNDEFINED,
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
              parent.component as ComponentOptions
            )
          )

          context = context.$routeView
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

          route.context = new Yox(
            Yox.object.extend(
              {
                el: instance.el,
                props: filterProps(route, location, component as ComponentOptions),
                // 每层路由组件都有 $route 和 $router 属性
                extensions: {
                  $router: instance,
                  $route: route
                },
              },
              component as ComponentOptions
            )
          )

        }

      }

      else if (context) {
        if (context.$vnode) {
          context.$route = route
          context.forceUpdate(
            filterProps(route, location, component as ComponentOptions)
          )
        }
        else {
          route.context = UNDEFINED
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
      if (Yox.is.func(redirect)) {
        redirect = (redirect as Redirect)(location)
      }
      if (redirect) {
        instance.push(redirect as Target)
        return
      }
    }

    const newRoute = Yox.object.copy(linkedRoute),

    oldRoute = instance.route,

    oldLocation = instance.location,

    enterRoute = function () {
      instance.diffRoute(
        newRoute,
        oldRoute,
        function (route, startRoute) {
          instance.hook(
            newRoute,
            startRoute ? COMPONENT_HOOK_BEFORE_ENTER : COMPONENT_HOOK_BEFORE_UPDATE,
            startRoute ? ROUTER_HOOK_BEFORE_ENTER : ROUTER_HOOK_BEFORE_UPDATE,
            TRUE,
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
        COMPONENT_HOOK_BEFORE_LEAVE,
        ROUTER_HOOK_BEFORE_LEAVE,
        TRUE,
        enterRoute
      )
      return
    }

    enterRoute()

  }

}

import template404 from './template/404.hbs'
import templatePlaceholder from './template/Placeholder.hbs'
import templateRouterView from './template/RouterView.hbs'

const default404 = {
  path: '/404',
  component: {
    template: template404
  }
},

// 占位组件
placeholderComponent = {
  template: templatePlaceholder
},

directive = {
  bind(node: HTMLElement | YoxInterface, directive: Directive, vnode: VNode) {

    // 当前组件如果是根组件，则没有 $root 属性
    const $root = vnode.context.$root || vnode.context,

    router = $root.$router as Router,

    listener = vnode.data[directive.key] = function (_: any) {
      let { value, getter } = directive, target: any = value
      if (value && getter && Yox.string.has(value as string, '{')) {
        target = getter()
      }
      router[directive.name](target)
    }

    if (vnode.isComponent) {
      (node as YoxInterface).on(EVENT_CLICK, listener)
    }
    else {
      Yox.dom.on(node as HTMLElement, EVENT_CLICK, listener)
    }

  },
  unbind(node: HTMLElement | YoxInterface, directive: Directive, vnode: VNode) {
    const listener = vnode.data[directive.key]
    if (vnode.isComponent) {
      (node as YoxInterface).off(EVENT_CLICK, listener)
    }
    else {
      Yox.dom.off(node as HTMLElement, EVENT_CLICK, listener)
    }
  },
},

RouterView: ComponentOptions = {
  template: templateRouterView,
  beforeCreate(options) {

    const context = options.context as YoxInterface,

    // context 一定有 $route 属性
    route = (context.$route as LinkedRoute).child as LinkedRoute

    if (route) {

      context.$routeView = this

      const props = options.props = {}, components = options.components = {},

      name = ROUTE_COMPONENT + (++guid)

      props[ROUTE_COMPONENT] = name
      components[name] = route.component

    }

  },
  beforeDestroy() {
    this.$context.$routeView = UNDEFINED
  }
}

Yox.lifeCycle
.on('beforeCreate', function (_: YoxInterface, data: Data) {
  let options = data.options as ComponentOptions, { context } = options
  // 当前组件是 <router-view> 中的动态组件
  if (context && context.$options.beforeCreate === RouterView.beforeCreate) {
    // 找到渲染 <router-view> 的父级组件，它是一定存在的
    context = context.$context as YoxInterface

    const router = context.$router as Router,

    // context 一定有 $route 属性
    route = (context.$route as LinkedRoute).child as LinkedRoute

    if (route) {
      options.extensions = {
        $router: router,
        $route: route,
      }
      if (router.location) {
        options.props = filterProps(route, router.location, options)
      }
    }
  }
})
.on('afterMount', function (component: YoxInterface) {
  updateRoute(
    component,
    COMPONENT_HOOK_AFTER_ENTER,
    ROUTER_HOOK_AFTER_ENTER,
    TRUE
  )
})
.on('afterUpdate', function (component: YoxInterface) {
  updateRoute(
    component,
    COMPONENT_HOOK_AFTER_UPDATE,
    ROUTER_HOOK_AFTER_UPDATE,
    TRUE
  )
})
.on('afterDestroy', function (component: YoxInterface) {
  updateRoute(
    component,
    COMPONENT_HOOK_AFTER_LEAVE,
    ROUTER_HOOK_AFTER_LEAVE
  )
})

/**
 * 版本
 */
export const version = process.env.NODE_VERSION

/**
 * 安装插件
 */
export function install(Y: typeof Yox): void {

  Y.directive({
    push: directive,
    replace: directive,
    go: directive,
  })

  Y.component('router-view', RouterView)

}

declare module 'yox' {

  interface ComponentOptions {
    [COMPONENT_HOOK_BEFORE_ENTER]?: RouteBeforeHook
    [COMPONENT_HOOK_AFTER_ENTER]?: RouteAfterHook
    [COMPONENT_HOOK_BEFORE_UPDATE]?: RouteBeforeHook
    [COMPONENT_HOOK_AFTER_UPDATE]?: RouteAfterHook
    [COMPONENT_HOOK_BEFORE_LEAVE]?: RouteBeforeHook
    [COMPONENT_HOOK_AFTER_LEAVE]?: RouteAfterHook
  }

  interface YoxInterface {
    $routeView?: YoxInterface
    $route?: LinkedRoute
    $router?: Router
  }

}
