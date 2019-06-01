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
  if (Yox.string.endsWith(path, constant.SEPARATOR_PATH)) {
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
    path: env.EMPTY_STRING
  }

  if (Yox.is.string(target)) {
    location.path = formatPath(target as string)
  }
  else {
    const route = target as typeUtil.RouteTarget, name = route.name
    if (name) {
      location.path = name2Path[name]
      if (process.env.NODE_ENV === 'dev') {
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
  onChange: Function

  // 当前渲染的路由
  route?: typeUtil.LinkedRoute

  // 当前地址栏的路径和参数
  location?: typeUtil.Location

  [constant.HOOK_BEFORE_LEAVE]?: typeUtil.BeforeHook

  [constant.HOOK_BEFORE_ENTER]?: typeUtil.BeforeHook

  [constant.HOOK_AFTER_ENTER]?: typeUtil.AfterHook

  [constant.HOOK_AFTER_LEAVE]?: typeUtil.AfterHook

  constructor(options: typeUtil.RouterOptions) {

    const instance = this, route404 = options.route404

    instance.el = options.el

    /**
     * hashchange 事件处理函数
     * 此函数必须写在实例上，不能写在类上
     * 否则一旦解绑，所有实例都解绑了
     */
    instance.onChange = function () {

      let hashStr = LOCATION.hash, { loading, routes, route404 } = instance

      // 通过 push 或 replace 触发的
      if (loading) {
        if (loading.hash === hashStr) {
          instance.setRoute(
            loading.location,
            loading.route
          )
          return
        }
        instance.loading = env.UNDEFINED
      }

      // 如果不以 PREFIX_HASH 开头，表示不合法
      hashStr = hashStr.indexOf(constant.PREFIX_HASH) === 0
        ? hashStr.substr(constant.PREFIX_HASH.length)
        : ''

      // 直接修改地址栏触发
      const location = locationUtil.parse(Yox, routes, hashStr)
      if (location) {
        instance.setRoute(location, instance.path2Route[location.path])
      }
      else {
        instance.replace(route404)
      }

    }

    if (process.env.NODE_ENV === 'dev') {
      if (!route404) {
        Yox.logger.error(`Route for 404 is required.`)
        return
      }
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

    let instance = this, pathStack: any = [], routeStack: any = [],

    callback = function (routeOptions: typeUtil.RouteOptions) {

      let { name, path, component, children } = routeOptions,

      parentPath: string | void = pathStack[pathStack.length - 1],

      parentRoute: typeUtil.LinkedRoute | void = routeStack[routeStack.length - 1]

      path = formatPath(path, parentPath)

      const route: typeUtil.LinkedRoute = { path, component, route: routeOptions },

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
          if (process.env.NODE_ENV === 'dev') {
            if (Yox.object.has(instance.name2Path, name)) {
              Yox.logger.error(`Name[${name}] of the route is existed.`)
              return
            }
          }
          instance.name2Path[name] = path
        }

        if (process.env.NODE_ENV === 'dev') {
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

    pathStack = routeStack = env.UNDEFINED

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

    const instance = this, location = toLocation(target, instance.name2Path)

    instance.setHash(
      location,
      function () {
        const history = instance.history, cursor = instance.cursor + 1
        // 确保下一个为空
        // 如果不为空，肯定是调用过 go()，此时直接清掉后面的就行了
        if (history[cursor]) {
          history.length = cursor
        }
        history[cursor] = location
        instance.cursor = cursor
      },
      env.EMPTY_FUNCTION
    )

  }

  replace(target: typeUtil.Target) {

    const instance = this, location = toLocation(target, instance.name2Path)

    instance.setHash(
      location,
      function () {
        const history = instance.history, cursor = instance.cursor
        if (history[cursor]) {
          history[cursor] = location
        }
      },
      env.EMPTY_FUNCTION
    )

  }

  go(offset: number) {

    const instance = this,

    cursor = instance.cursor + offset,

    location = instance.history[cursor]

    if (location) {
      instance.setHash(
        location,
        function () {
          instance.cursor = cursor
        },
        env.EMPTY_FUNCTION
      )
    }

  }

  /**
   * 启动路由
   */
  start() {
    domApi.on(window, EVENT_HASH_CHANGE, this.onChange as type.listener)
    this.onChange()
  }

  /**
   * 停止路由
   */
  stop() {
    domApi.off(window, EVENT_HASH_CHANGE, this.onChange as type.listener)
  }

  /**
   * 路由守卫
   */
  guard(route: typeUtil.LinkedRoute, name: string, isGuard?: boolean, callback?: typeUtil.Callback) {

    // 必须是叶子节点
    // 如果把叶子节点放在 if 中，会出现即使不是定义时的叶子节点，却是运行时的叶子节点
    const child = route.child
    if (child && child.context) {
      return
    }

    const instance = this, { location, hooks, loading } = instance, { to, from } = hooks

    if (!from || from.path !== to.path) {

      hooks
        .setName(name)
        // 先调用组件的钩子
        .add(route.component, route.context)
        // 再调用路由配置的钩子
        .add(route.route, route.route)
        // 最后调用路由实例的钩子
        .add(instance, instance)

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
              instance.replace(location)
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
    else if (callback) {
      callback()
    }

  }

  private setHash(
    location: typeUtil.Location,
    onComplete: typeUtil.RouteComplete,
    onAbort: typeUtil.RouteAbort
  ) {

    let instance = this,

    route = instance.path2Route[location.path],

    hash: string

    if (route) {
      hash = locationUtil.stringify(Yox, location)
    }
    else {
      route = instance.route404
      hash = route.path
    }

    hash = constant.PREFIX_HASH + hash

    if (hash === LOCATION.hash) {
      return
    }

    instance.loading = {
      hash,
      location,
      route,
      onComplete,
      onAbort,
    }

    LOCATION.hash = hash

  }

  private diffRoute(
    route: typeUtil.LinkedRoute,
    oldRoute: typeUtil.LinkedRoute | void,
    onComplete: typeUtil.DiffComplete,
    startRoute: typeUtil.LinkedRoute | void,
    childRoute: typeUtil.LinkedRoute | void,
  ) {
    const instance = this

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
      instance.diffRoute(
        Yox.object.copy(route.parent),
        oldRoute ? oldRoute.parent : env.UNDEFINED,
        onComplete,
        startRoute,
        route,
      )
      return
    }

    // 到达根组件，结束
    onComplete(route, startRoute)

  }

  private updateRoute(
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

  private setRoute(
    location: typeUtil.Location,
    route: typeUtil.LinkedRoute
  ) {

    const instance = this,

    newRoute = Yox.object.copy(route),

    oldRoute = instance.route,

    enterRoute = function () {
      instance.diffRoute(
        newRoute,
        oldRoute,
        function (route, startRoute) {
          instance.guard(
            newRoute,
            constant.HOOK_BEFORE_ENTER,
            env.TRUE,
            function () {

              instance.route = newRoute
              instance.location = location

              instance.updateRoute(route, startRoute)

            }
          )
        }
      )
    }

    instance.hooks.setLocation(location, instance.location)

    if (oldRoute) {
      instance.guard(
        oldRoute,
        constant.HOOK_BEFORE_LEAVE,
        env.TRUE,
        enterRoute
      )
    }
    else {
      enterRoute()
    }

  }

}

const directive = {
  bind(node: HTMLElement | Yox, directive: Directive, vnode: VNode) {

    // 当前组件如果是根组件，则没有 $root 属性
    const $root = vnode.context.$root || vnode.context,

    router = $root[ROUTER] as Router,

    listener = function (_: CustomEvent) {
      const value = directive.getter && directive.getter()
      router.push(value != env.NULL ? value : directive.value)
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

  Yox.directive('href', directive)

  // 提供两种风格
  Yox.component({
    RouterView: RouterView,
    'router-view': RouterView,
  })

  const { beforeCreate, afterMount, afterDestroy } = Yox

  Yox.beforeCreate = function (options) {

    if (beforeCreate) {
      beforeCreate(options)
    }

    let parent = options.parent

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

    const route = instance[ROUTE] as typeUtil.LinkedRoute
    if (route) {
      const router = instance[ROUTER] as Router
      route.context = instance
      router.guard(route, constant.HOOK_AFTER_ENTER)

      const loading = router.loading
      if (loading) {
        loading.onComplete()
        router.loading = env.UNDEFINED
      }
    }
  }

  Yox.afterDestroy = function (instance) {

    if (afterDestroy) {
      afterDestroy(instance)
    }

    const route = instance[ROUTE] as typeUtil.LinkedRoute
    if (route) {
      const router = instance[ROUTER] as Router
      route.context = env.UNDEFINED
      router.guard(route, constant.HOOK_AFTER_LEAVE)
    }

  }

}
