import * as type from '../../yox-type/src/type'

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
import * as typeUtil from './type'
import * as locationUtil from './location'

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

  // 如果 path 以 / 结尾，删掉它
  // 比如 { path: 'index/' }
  if (path !== constant.SEPARATOR_PATH
    && Yox.string.endsWith(path, constant.SEPARATOR_PATH)
  ) {
    path = Yox.string.slice(path, 0, -1)
  }

  // 如果 path 不是以 / 开头，有两种情况：
  // 1. 没有上级或上级是 ''，需要自动加 / 前缀
  // 2. 相对上级的路径，自动替换最后一个 / 后面的路径
  if (!Yox.string.startsWith(path, constant.SEPARATOR_PATH)) {

    if (path) {
      if (Yox.string.falsy(parentPath)) {
        path = constant.SEPARATOR_PATH + path
      }
      else {
        path = parentPath + constant.SEPARATOR_PATH + path
      }
    }
    else if (parentPath) {
      path = parentPath
    }

  }

  return path
}

function toLocation(target: typeUtil.Target, name2Path: type.data): typeUtil.Location {

  const location: typeUtil.Location = {
    hash: env.EMPTY_STRING,
    path: env.EMPTY_STRING
  }

  if (Yox.is.string(target)) {
    location.path = formatPath(target as string)
  }
  else {
    const route = target as typeUtil.RouteTarget, name = route.name
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
function filterProps(route: typeUtil.LinkedRoute, location: typeUtil.Location, options: YoxOptions) {
  const result: type.data = {}, propTypes = options.propTypes
  if (propTypes) {

    let props = location.query,

    routeParams = route.params,

    locationParams = location.params

    // 从 location.params 挑出 route.params 定义过的参数
    if (routeParams && locationParams) {
      props = props ? Yox.object.copy(props) : {}
      for (let i = 0, key: string; key = routeParams[i]; i++) {
        (props as type.data)[key] = locationParams[key]
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
function isLeafRoute(route: typeUtil.LinkedRoute) {
  const child = route.child
  return !child || !child.context
}

function updateRoute(instance: Yox, componentHook: string | void, hook: string | undefined, upsert?: boolean) {
  const route = instance[ROUTE] as typeUtil.LinkedRoute
  if (route) {
    route.context = upsert ? instance : env.UNDEFINED
    if (isLeafRoute(route)) {
      const router = instance[ROUTER] as Router
      if (componentHook && hook) {
        router.hook(route, componentHook, hook)
      }
      if (upsert && router.loading) {
        router.loading.onComplete()
        router.loading = env.UNDEFINED
      }
    }
  }
}

export class Router {

  el: Element

  routes: typeUtil.LinkedRoute[]

  route404: typeUtil.LinkedRoute

  name2Path: Record<string, string>

  path2Route: Record<string, typeUtil.LinkedRoute>

  history: typeUtil.Location[]

  cursor: number

  loading: typeUtil.Loading | void

  hooks: Hooks

  // 路由或参数发生了变化会触发此函数
  onHashChange: Function

  // 当前渲染的路由
  route?: typeUtil.LinkedRoute

  // 当前地址栏的路径和参数
  location?: typeUtil.Location

  [constant.HOOK_BEFORE_LEAVE]?: typeUtil.BeforeHook

  [constant.HOOK_BEFORE_ENTER]?: typeUtil.BeforeHook

  [constant.HOOK_AFTER_ENTER]?: typeUtil.AfterHook

  [constant.HOOK_AFTER_LEAVE]?: typeUtil.AfterHook

  constructor(options: typeUtil.RouterOptions) {

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

      let hashStr = LOCATION.hash, { loading, routes, route404 } = instance

      // 如果不以 PREFIX_HASH 开头，表示不合法
      hashStr = hashStr !== constant.PREFIX_HASH
        && Yox.string.startsWith(hashStr, constant.PREFIX_HASH)
        ? hashStr.substr(constant.PREFIX_HASH.length)
        : constant.SEPARATOR_PATH

      if (loading) {
        // 通过 push 或 go 触发
        if (loading.location.hash === hashStr) {
          instance.setRoute(loading.location)
          return
        }
        instance.loading = env.UNDEFINED
      }

      // 直接修改地址栏触发
      const location = locationUtil.parse(Yox, routes, hashStr)
      if (location) {
        instance.pushHistory(location)
        instance.setRoute(location)
        return
      }

      instance.push(route404)

    }

    instance.routes = []
    instance.name2Path = {}
    instance.path2Route = {}

    instance.history = []
    instance.cursor = -1

    instance.hooks = new Hooks()

    instance.add(options.routes)
    instance.add([route404])

    instance.route404 = Yox.array.last(instance.routes) as typeUtil.LinkedRoute

  }

  /**
   * 添加新的路由
   */
  add(routes: typeUtil.RouteOptions[]) {

    let instance = this,

    pathStack: string[] = [],

    routeStack: typeUtil.LinkedRoute[] = [],

    callback = function (routeOptions: typeUtil.RouteOptions) {

      let { name, component, children } = routeOptions,

      parentPath = Yox.array.last(pathStack),

      parentRoute = Yox.array.last(routeStack),

      path = formatPath(routeOptions.path, parentPath),

      route: typeUtil.LinkedRoute = { path, component, route: routeOptions },

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

      if (parentRoute) {
        route.parent = parentRoute
      }

      if (children) {
        pathStack.push(path)
        routeStack.push(route)
        Yox.array.each(
          children,
          callback
        )
        routeStack.pop()
        pathStack.pop()
      }
      else {

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

    Yox.array.each(
      routes,
      callback
    )

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
  push(target: typeUtil.Target) {

    const instance = this,

    location = instance.setLocation(
      toLocation(target, instance.name2Path),
      function () {
        instance.pushHistory(location as typeUtil.Location)
      },
      env.EMPTY_FUNCTION
    )

    if (location) {
      instance.setHash(location)
    }

  }

  replace(target: typeUtil.Target) {

    const instance = this,

    location = instance.setLocation(
      toLocation(target, instance.name2Path),
      function () {
        const history = instance.history, cursor = instance.cursor
        if (history[cursor]) {
          history[cursor] = location as typeUtil.Location
        }
      },
      env.EMPTY_FUNCTION
    )

    if (location) {
      instance.setRoute(location)
    }

  }

  go(offset: number) {

    let instance = this,

    cursor = instance.cursor + offset,

    location: typeUtil.Location | void = instance.history[cursor]

    if (location) {
      location = instance.setLocation(
        location,
        function () {
          instance.cursor = cursor
        },
        env.EMPTY_FUNCTION
      )
      if (location) {
        instance.setHash(location)
      }
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
  hook(route: typeUtil.LinkedRoute, componentHook: string, hook: string, isGuard?: boolean, callback?: typeUtil.Callback) {

    const instance = this, { location, hooks, loading } = instance

    hooks
      .clear()
      // 先调用组件的钩子
      .add(route.component[componentHook], route.context)
      // 再调用路由配置的钩子
      .add(route.route[hook], route.route)
      // 最后调用路由实例的钩子
      .add(instance[hook], instance)

    const next = function (value?: false | typeUtil.Target) {
      if (value === env.UNDEFINED) {
        hooks.next(next, isGuard, callback)
      }
      else {
        // 只有前置守卫才有可能走进这里
        // 此时 instance.location 还是旧地址
        if (loading) {
          loading.onAbort()
          instance.loading = env.UNDEFINED
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

  private pushHistory(location: typeUtil.Location) {
    let { history, cursor } = this
    cursor++
    // 确保下一个为空
    // 如果不为空，肯定是调用过 go()，此时直接清掉后面的就行了
    if (history[cursor]) {
      history.length = cursor
    }
    history[cursor] = location
    this.cursor = cursor
  }

  private setHash(location: typeUtil.Location) {

    const hash = constant.PREFIX_HASH + location.hash
    if (LOCATION.hash !== hash) {
      LOCATION.hash = hash
    }
    else {
      this.setRoute(location)
    }

  }

  private setLocation(
    location: typeUtil.Location,
    onComplete: typeUtil.RouteComplete,
    onAbort: typeUtil.RouteAbort
  ) {

    let instance = this,

    hash = locationUtil.stringify(Yox, location),

    oldLocation = instance.location,

    oldHash = oldLocation ? locationUtil.stringify(Yox, oldLocation) : env.UNDEFINED,

    checkExisted = locationUtil.parse(Yox, instance.routes, hash)

    if (checkExisted) {
      location = checkExisted
    }
    else {
      hash = instance.route404.path
      location = {
        hash,
        path: hash
      }
    }

    if (hash !== oldHash) {
      instance.loading = {
        location,
        onComplete,
        onAbort,
      }
      return location
    }

  }

  private diffRoute(
    route: typeUtil.LinkedRoute,
    oldRoute: typeUtil.LinkedRoute | void,
    onComplete: typeUtil.DiffComplete,
    startRoute: typeUtil.LinkedRoute | void,
    childRoute: typeUtil.LinkedRoute | void,
    oldTopRoute: typeUtil.LinkedRoute | void
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
    route: typeUtil.LinkedRoute,
    startRoute: typeUtil.LinkedRoute | void
  ) {

    const instance = this, location = instance.location as typeUtil.Location

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
              parent.component
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
                props: filterProps(route, location, component),
                extensions,
              },
              component
            )
          )

        }

      }

      else if (context) {
        if (context.$vnode) {
          context[ROUTE] = route
          context.forceUpdate(
            filterProps(route, location, component)
          )
        }
        else {
          route.context = env.UNDEFINED
        }
        if (route.child) {
          route = route.child as typeUtil.LinkedRoute
          continue
        }
      }
      break
    }
  }

  private setRoute(location: typeUtil.Location) {

    const instance = this,

    newRoute = Yox.object.copy(instance.path2Route[location.path]),

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

    route = $parent[ROUTE].child as typeUtil.LinkedRoute

    if (route) {

      $parent[ROUTE_VIEW] = this

      const props = {}, components = {}, name = ROUTE_COMPONENT + (++guid)

      props[ROUTE_COMPONENT] = name
      components[name] = route.component

      options.props = props
      options.components = components

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
        route = parent[ROUTE].child as typeUtil.LinkedRoute

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

    if (afterMount) {
      afterMount(instance)
    }

    updateRoute(instance, constant.HOOK_AFTER_ROUTE_ENTER, constant.HOOK_AFTER_ENTER, env.TRUE)

  }
  Yox.afterUpdate = function (instance) {

    if (afterUpdate) {
      afterUpdate(instance)
    }

    updateRoute(instance, constant.HOOK_AFTER_ROUTE_UPDATE, constant.HOOK_AFTER_UPDATE, env.TRUE)

  }
  Yox.afterDestroy = function (instance) {

    if (afterDestroy) {
      afterDestroy(instance)
    }

    updateRoute(instance, constant.HOOK_AFTER_ROUTE_LEAVE, constant.HOOK_AFTER_LEAVE)

  }

}
