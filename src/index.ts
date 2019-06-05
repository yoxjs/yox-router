import * as type from '../../yox-type/src/type'
import * as routerType from './type'

import * as env from '../../yox-common/src/util/env'

import API from '../../yox-type/src/interface/API'
import Yox from '../../yox-type/src/interface/Yox'
import YoxClass from '../../yox-type/src/interface/YoxClass'

import YoxOptions from '../../yox-type/src/options/Yox'
import VNode from '../../yox-type/src/vnode/VNode'
import Directive from '../../yox-type/src/vnode/Directive'
import CustomEvent from '../../yox-type/src/event/CustomEvent'

import Hooks from './Hooks'
import * as constant from './constant'
import * as queryUtil from './query'
import * as valueUtil from './value'

let Yox: YoxClass, domApi: API, guid = 0

const WINDOW = window,

LOCATION = WINDOW.location,

ROUTER = '$router',

ROUTE = '$route',

ROUTE_VIEW = '$routeView',

ROUTE_COMPONENT = 'RouteComponent',

EVENT_CLICK = 'click',

EVENT_HASH_CHANGE = 'hashchange'

/**
 * 格式化路径，确保它以 / 开头，不以 / 结尾
 */
function formatPath(path: string, parentPath: string | void) {

  // 如果不是 / 开头，表示是相对路径
  if (!Yox.string.startsWith(path, constant.SEPARATOR_PATH)) {
    // 确保 parentPath 以 / 结尾
    if (parentPath) {
      if (!Yox.string.endsWith(parentPath, constant.SEPARATOR_PATH)) {
        parentPath += constant.SEPARATOR_PATH
      }
    }
    else {
      parentPath = constant.SEPARATOR_PATH
    }
    path = parentPath + path
  }

  // 如果 path 以 / 结尾，删掉它
  if (path !== constant.SEPARATOR_PATH
    && Yox.string.endsWith(path, constant.SEPARATOR_PATH)
  ) {
    path = Yox.string.slice(path, 0, -constant.SEPARATOR_PATH.length)
  }

  return path

}

function toLocation(target: routerType.Target, name2Path: type.data): routerType.Location {

  const location: routerType.Location = {
    path: env.EMPTY_STRING
  }

  if (Yox.is.string(target)) {
    location.path = formatPath(target as string)
  }
  else {
    const route = target as routerType.RouteTarget, name = route.name
    if (name) {
      location.path = name2Path[name]
      if (process.env.NODE_ENV === 'development') {
        if (!Yox.is.string(location.path)) {
          Yox.logger.error(`The route of name[${name}] is not found.`)
        }
      }
    }
    else {
      location.path = formatPath(route.path as string)
    }
    if (route.params) {
      location.params = route.params
    }
    if (route.query) {
      location.query = route.query
    }
  }

  return location

}

/**
 * 按照 propTypes 定义的外部数据格式过滤路由参数，这样有两个好处：
 *
 * 1. 避免传入不符预期的数据
 * 2. 避免覆盖 data 定义的数据
 */
function filterProps(route: routerType.LinkedRoute, location: routerType.Location, options: YoxOptions) {
  const result: type.data = {}, propTypes = options.propTypes
  if (propTypes) {

    let props = location.query,

    routeParams = route.params,

    locationParams = location.params

    // 从 location.params 挑出 route.params 定义过的参数
    if (routeParams && locationParams) {
      props = props ? Yox.object.copy(props) : {}
      for (let i = 0, length = routeParams.length; i < length; i++) {
        (props as type.data)[routeParams[i]] = locationParams[routeParams[i]]
      }
    }

    if (props) {
      for (let key in propTypes) {
        result[key] = Yox.checkProp(key, props[key], propTypes[key])
      }
    }

  }
  return result
}

/**
 * 是否是叶子节点
 * 如果把叶子节点放在 if 中，会出现即使不是定义时的叶子节点，却是运行时的叶子节点
 */
function isLeafRoute(route: routerType.LinkedRoute) {
  const child = route.child
  return !child || !child.context
}

function updateRoute(instance: Yox, hook: Function | void, componentHookName: string | void, hookName: string | undefined, upsert?: boolean) {
  if (hook) {
    hook(instance)
  }
  const route = instance[ROUTE] as routerType.LinkedRoute
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

  routes: routerType.LinkedRoute[]

  route404: routerType.LinkedRoute

  name2Path: Record<string, string>

  path2Route: Record<string, routerType.LinkedRoute>

  history: routerType.Location[]

  cursor: number

  pending?: routerType.Pending

  // 路由钩子
  hooks: Hooks

  // 路由或参数发生了变化会触发此函数
  onHashChange: Function

  // 当前渲染的路由
  route?: routerType.LinkedRoute

  // 当前地址栏的路径和参数
  location?: routerType.Location

  [constant.HOOK_BEFORE_LEAVE]?: routerType.BeforeHook

  [constant.HOOK_BEFORE_ENTER]?: routerType.BeforeHook

  [constant.HOOK_AFTER_ENTER]?: routerType.AfterHook

  [constant.HOOK_AFTER_LEAVE]?: routerType.AfterHook

  constructor(options: routerType.RouterOptions) {

    const instance = this, { el, route404 } = options

    instance.el = Yox.is.string(el)
      ? domApi.find(el as string) as Element
      : el as Element

    if (process.env.NODE_ENV === 'development') {
      if (!instance.el) {
        Yox.logger.error(`router.el is not an element.`)
        return
      }
      if (!route404) {
        Yox.logger.error(`Route for 404 is required.`)
        return
      }
    }

    /**
     * hashchange 事件处理函数
     * 此函数必须写在实例上，不能写在类上
     * 否则一旦解绑，所有实例都解绑了
     */
    instance.onHashChange = function () {

      let hashStr = LOCATION.hash, { pending } = instance

      // 如果不以 PREFIX_HASH 开头，表示不合法
      hashStr = hashStr !== constant.PREFIX_HASH
        && Yox.string.startsWith(hashStr, constant.PREFIX_HASH)
        ? hashStr.substr(constant.PREFIX_HASH.length)
        : constant.SEPARATOR_PATH

      if (pending) {
        const { location } = pending
        // 通过 push 或 go 触发
        if (location.hash === hashStr) {
          instance.setHistory(location, pending.cursor)
          instance.setRoute(location)
          return
        }
        instance.pending = env.UNDEFINED
      }

      // 直接修改地址栏触发
      instance.parseLocation(
        hashStr,
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

    Yox.array.each(
      options.routes,
      function (route) {
        instance.add(route)
      }
    )

    instance.route404 = instance.add(route404)[0]

  }

  /**
   * 添加新的路由
   */
  add(routeOptions: routerType.RouteOptions) {

    const instance = this,

    newRoutes: routerType.LinkedRoute[] = [],

    pathStack: string[] = [],

    routeStack: routerType.LinkedRoute[] = [],

    addRoute = function (routeOptions: routerType.RouteOptions) {

      let { name, component, children, loadRoute } = routeOptions,

      parentPath = Yox.array.last(pathStack),

      parentRoute = Yox.array.last(routeStack),

      path = formatPath(routeOptions.path, parentPath),

      route: routerType.LinkedRoute = { path, route: routeOptions },

      params: string[] = []

      Yox.array.each(
        path.split(constant.SEPARATOR_PATH),
        function (item) {
          if (Yox.string.startsWith(item, constant.PREFIX_PARAM)) {
            params.push(
              item.substr(constant.PREFIX_PARAM.length)
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

      // component 和 loadRoute 二选一
      if (component) {
        route.component = component
      }
      else if (loadRoute) {
        route.loadRoute = loadRoute
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
              Yox.logger.error(`Name[${name}] of the route is existed.`)
              return
            }
          }
          instance.name2Path[name] = path
        }

        if (process.env.NODE_ENV === 'development') {
          if (Yox.object.has(instance.path2Route, path)) {
            Yox.logger.error(`path [${path}] of the route is existed.`)
            return
          }
        }

        instance.path2Route[path] = route

      }

    }

    addRoute(routeOptions)

    return newRoutes

  }

  remove(route: routerType.LinkedRoute) {

    const instance = this

    Yox.array.remove(instance.routes, route)

    if (route.name) {
      delete instance.name2Path[route.name]
    }

    delete instance.path2Route[route.path]

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
  push(target: routerType.Target) {

    const instance = this

    instance.setLocation(
      toLocation(target, instance.name2Path),
      env.UNDEFINED,
      env.EMPTY_FUNCTION,
      env.EMPTY_FUNCTION,
      function (location) {
        instance.setHash(location)
      }
    )

  }

  replace(target: routerType.Target) {

    const instance = this

    instance.setLocation(
      toLocation(target, instance.name2Path),
      env.UNDEFINED,
      function () {
        instance.replaceHistory(instance.location as routerType.Location)
      },
      env.EMPTY_FUNCTION,
      function (location) {
        instance.setRoute(location)
      }
    )

  }

  go(offset: number) {

    const instance = this,

    cursor = instance.cursor + offset,

    location: routerType.Location | void = instance.history[cursor]

    if (location) {
      instance.setLocation(
        location,
        cursor,
        env.EMPTY_FUNCTION,
        env.EMPTY_FUNCTION,
        function (location) {
          instance.setHash(location)
        }
      )
    }

  }

  /**
   * 启动路由
   */
  start() {
    domApi.on(WINDOW, EVENT_HASH_CHANGE, this.onHashChange as type.listener)
    this.onHashChange()
  }

  /**
   * 停止路由
   */
  stop() {
    domApi.off(WINDOW, EVENT_HASH_CHANGE, this.onHashChange as type.listener)
  }

  /**
   * 钩子函数
   */
  hook(route: routerType.LinkedRoute, componentHook: string, hook: string, isGuard?: boolean, callback?: routerType.Callback) {

    const instance = this, { location, hooks, pending } = instance

    hooks
      .clear()
      // 先调用组件的钩子
      .add((route.component as YoxOptions)[componentHook], route.context)
      // 再调用路由配置的钩子
      .add(route.route[hook], route.route)
      // 最后调用路由实例的钩子
      .add(instance[hook], instance)

    const next = function (value?: false | routerType.Target) {
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

  private setHistory(location: routerType.Location, index: number | void) {

    const { history, cursor } = this

    // 如果没传 cursor，表示 push
    if (!Yox.is.number(index)) {
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

  private replaceHistory(location: routerType.Location) {
    const { history, cursor } = this
    if (history[cursor]) {
      history[cursor] = location
    }
  }

  private setHash(location: routerType.Location) {

    const hash = constant.PREFIX_HASH + location.hash

    if (LOCATION.hash !== hash) {
      LOCATION.hash = hash
    }
    else {
      this.setRoute(location)
    }

  }

  private setLocation(
    location: routerType.Location,
    cursor: number | void,
    onComplete: routerType.RouteComplete,
    onAbort: routerType.RouteAbort,
    callback: (locaiton: routerType.Location) => void
  ) {

    let instance = this,

    hash = instance.stringifyLocation(location),

    oldLocation = instance.location,

    oldHash = oldLocation ? instance.stringifyLocation(oldLocation) : env.UNDEFINED

    instance.parseLocation(
      hash,
      function (location) {

        if (!location) {
          hash = instance.route404.path
          location = {
            hash,
            path: hash
          }
        }

        if (hash !== oldHash) {
          instance.pending = {
            cursor,
            location,
            onComplete,
            onAbort,
          }
          callback(location)
        }

      }
    )

  }

  private parseLocation(hash: string, callback: (location: routerType.Location | void) => void) {

    let realpath: string, search: string | void, index = hash.indexOf(constant.SEPARATOR_SEARCH)

    if (index >= 0) {
      realpath = hash.slice(0, index)
      search = hash.slice(index + 1)
    }
    else {
      realpath = hash
    }

    // 重置为 0，方便 while 循环
    index = 0


    // 匹配已注册的 route
    const instance = this,

    realpathTerms = realpath.split(constant.SEPARATOR_PATH),

    length = realpathTerms.length,

    searchRoute = function (
      routes: routerType.LinkedRoute[],
      callback: (route?: routerType.LinkedRoute, params?: type.data) => void
    ) {

      let route: routerType.LinkedRoute | void

      loop: while (route = routes[index++]) {
        const path = route.path

        // 动态路由
        if (route.params) {
          const pathTerms = path.split(constant.SEPARATOR_PATH)
          // path 段数量必须一致，否则没有比较的意义
          if (length === pathTerms.length) {
            const params: type.data = {}
            for (let i = 0; i < length; i++) {
              if (Yox.string.startsWith(pathTerms[i], constant.PREFIX_PARAM)) {
                params[pathTerms[i].substr(constant.PREFIX_PARAM.length)] = valueUtil.parse(Yox, realpathTerms[i])
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
        else if (route.loadRoute && Yox.string.startsWith(realpath, path)) {
          route.loadRoute(
            function (lazyRoute) {
              instance.remove(route as routerType.LinkedRoute)
              searchRoute(
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

    searchRoute(
      instance.routes,
      function (route, params) {
        if (route) {
          const location: routerType.Location = {
            hash,
            path: route.path
          }
          if (params) {
            location.params = params
          }
          if (search) {
            const query = queryUtil.parse(Yox, search)
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

  /**
   * 把结构化数据序列化成 hash
   */
  private stringifyLocation(location: routerType.Location) {

    const { path, params, query } = location, terms: string[] = []

    Yox.array.each(
      path.split(constant.SEPARATOR_PATH),
      function (item) {
        terms.push(
          Yox.string.startsWith(item, constant.PREFIX_PARAM) && params
            ? params[item.substr(constant.PREFIX_PARAM.length)]
            : item
        )
      }
    )

    let realpath = terms.join(constant.SEPARATOR_PATH)

    if (query) {
      const queryStr = queryUtil.stringify(Yox, query)
      if (queryStr) {
        realpath += constant.SEPARATOR_SEARCH + queryStr
      }
    }

    return realpath

  }

  private diffRoute(
    route: routerType.LinkedRoute,
    oldRoute: routerType.LinkedRoute | void,
    onComplete: routerType.DiffComplete,
    startRoute: routerType.LinkedRoute | void,
    childRoute: routerType.LinkedRoute | void,
    oldTopRoute: routerType.LinkedRoute | void
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
      let context: Yox | void
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
    route: routerType.LinkedRoute,
    startRoute: routerType.LinkedRoute | void
  ) {

    const instance = this, location = instance.location as routerType.Location

    // 从上往下更新 props
    while (route) {

      let { parent, context, component } = route

      if (route === startRoute) {

        if (parent) {

          context = parent.context as Yox
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

          route.context = new Yox(
            Yox.object.extend(
              {
                el: instance.el,
                props: filterProps(route, location, component as YoxOptions),
                extensions,
              },
              component as YoxOptions
            )
          )

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
          route = route.child as routerType.LinkedRoute
          continue
        }
      }
      break
    }
  }

  private setRoute(location: routerType.Location) {

    let instance = this,

    linkedRoute = instance.path2Route[location.path],

    redirect = linkedRoute.route.redirect

    if (redirect) {
      if (Yox.is.func(redirect)) {
        redirect = (redirect as routerType.Redirect)(location)
      }
      if (redirect) {
        instance.push(redirect as routerType.Target)
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
            startRoute ? constant.HOOK_BEFORE_ROUTE_ENTER : constant.HOOK_BEFORE_ROUTE_UPDATE,
            startRoute ? constant.HOOK_BEFORE_ENTER : constant.HOOK_BEFORE_UPDATE,
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
        constant.HOOK_BEFORE_ROUTE_LEAVE,
        constant.HOOK_BEFORE_LEAVE,
        env.TRUE,
        enterRoute
      )
      return
    }

    enterRoute()

  }

}

const directive = {
  bind(node: HTMLElement | Yox, directive: Directive, vnode: VNode) {

    // 当前组件如果是根组件，则没有 $root 属性
    const $root = vnode.context.$root || vnode.context,

    router = $root[ROUTER] as Router,

    listener = vnode.data[directive.key] = function (_: CustomEvent) {
      let { value, getter } = directive, target: any = value
      if (value && getter && Yox.string.has(value as string, '{')) {
        target = getter()
      }
      router[directive.name](target)
    }

    if (vnode.isComponent) {
      (node as Yox).on(EVENT_CLICK, listener)
    }
    else {
      domApi.on(node as HTMLElement, EVENT_CLICK, listener)
    }

  },
  unbind(node: HTMLElement | Yox, directive: Directive, vnode: VNode) {
    const listener = vnode.data[directive.key]
    if (vnode.isComponent) {
      (node as Yox).off(EVENT_CLICK, listener)
    }
    else {
      domApi.off(node as HTMLElement, EVENT_CLICK, listener)
    }
  },
},

RouterView: YoxOptions = {
  template: '<$' + ROUTE_COMPONENT + '/>',
  beforeCreate(options) {

    const $parent = options.parent as Yox,

    route = $parent[ROUTE].child as routerType.LinkedRoute

    if (route) {

      $parent[ROUTE_VIEW] = this

      const props = options.props = {},

      components = options.components = {},

      name = ROUTE_COMPONENT + (++guid)

      props[ROUTE_COMPONENT] = name
      components[name] = route.component

    }

  },
  beforeDestroy() {
    this.$parent[ROUTE_VIEW] = env.UNDEFINED
  }
}

/**
 * 版本
 */
export const version = process.env.NODE_VERSION

/**
 * 安装插件
 */
export function install(Class: YoxClass): void {

  Yox = Class
  domApi = Class.dom as API

  Yox.directive({
    push: directive,
    replace: directive,
    go: directive,
  })

  Yox.component('router-view', RouterView)

  const { beforeCreate, afterMount, afterUpdate, afterDestroy } = Yox

  Yox.beforeCreate = function (options) {

    if (beforeCreate) {
      beforeCreate(options)
    }

    let { parent } = options

    // 处理 <router-view> 嵌入的组件
    if (parent && options.beforeCreate !== RouterView.beforeCreate) {

      // parent 是 <router-view> 实例，得再上一层才是路由组件
      parent = parent.$parent
      if (parent) {
        const router = parent[ROUTER] as Router,
        route = parent[ROUTE].child as routerType.LinkedRoute

        if (router && route) {
          const extensions = options.extensions = {}

          extensions[ROUTER] = router
          extensions[ROUTE] = route

          if (router.location) {
            options.props = filterProps(route, router.location, options)
          }
        }
      }

    }
  }

  Yox.afterMount = function (instance) {

    updateRoute(instance, afterMount, constant.HOOK_AFTER_ROUTE_ENTER, constant.HOOK_AFTER_ENTER, env.TRUE)

  }
  Yox.afterUpdate = function (instance) {

    updateRoute(instance, afterUpdate, constant.HOOK_AFTER_ROUTE_UPDATE, constant.HOOK_AFTER_UPDATE, env.TRUE)

  }
  Yox.afterDestroy = function (instance) {

    updateRoute(instance, afterDestroy, constant.HOOK_AFTER_ROUTE_LEAVE, constant.HOOK_AFTER_LEAVE)

  }

}
