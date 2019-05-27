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
import * as hashUtil from './hash'

let Yox: YoxClass, registry: Yox, domApi: API

const OUTLET = '$outlet',

ROUTE = '$route',

ROUTER = '$router',

COMPONENT = 'RouteComponent',

EVENT_CLICK = 'click'

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

    // 从 location.params 挑出 route.params 参数
    if (routeParams && locationParams) {
      if (!props) {
        props = {}
      }
      for (let i = 0, key: string; key = routeParams[i]; i++) {
        props[key] = locationParams[key]
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

    const instance = this,

    route404 = options.route404,

    routes: typeUtil.LinkedRoute[] = [],

    name2Path = {},

    path2Route = {}

    instance.el = options.el

    /**
     * hashchange 事件处理函数
     * 此函数必须写在实例上，不能写在类上
     * 否则一旦解绑，所有实例都解绑了
     */
    instance.onChange = function () {

      let hashStr = location.hash

      // 如果不以 PREFIX_HASH 开头，表示不合法
      hashStr = Yox.string.startsWith(hashStr, constant.PREFIX_HASH)
        ? hashStr.substr(constant.PREFIX_HASH.length)
        : ''

      const hash = hashUtil.parse(Yox, routes, hashStr), { route } = hash

      if (route) {
        instance.setRoute(
          {
            path: route.path,
            params: hash.params,
            query: hash.query,
          },
          route
        )
      }
      else {
        instance.push(notFound)
      }

    }

    let pathStack: any = [], routeStack: any = [],

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

        routes.push(route)

        if (name) {
          if (process.env.NODE_ENV === 'dev') {
            if (Yox.object.has(name2Path, name)) {
              Yox.logger.error(`Name[${name}] of the route is existed.`)
              return
            }
          }
          name2Path[name] = path
        }

        if (process.env.NODE_ENV === 'dev') {
          if (Yox.object.has(path2Route, path)) {
            Yox.logger.error(`path [${path}] of the route is existed.`)
            return
          }
        }

        path2Route[path] = route

      }

    }

    Yox.array.each(
      options.routes,
      callback
    )

    pathStack = routeStack = env.UNDEFINED

    if (process.env.NODE_ENV === 'dev') {
      if (!route404) {
        Yox.logger.error(`Route for 404 is required.`)
        return
      }
    }

    const notFound = {
      path: formatPath(route404.path),
      route: route404,
      component: route404.component,
    }

    routes.push(notFound)
    path2Route[notFound.path] = notFound

    instance.route404 = notFound

    instance.routes = routes
    instance.path2Route = path2Route

    instance.name2Path = name2Path

    instance.hooks = new Hooks()

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

    let path: string, params: type.data | void, query: type.data | void

    if (Yox.is.string(target)) {
      path = target as string
    }
    else {
      params = (target as typeUtil.RouteTarget).params
      query = (target as typeUtil.RouteTarget).query

      const name = (target as typeUtil.RouteTarget).name
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
        path = (target as typeUtil.RouteTarget).path as string
      }
    }

    this.setHash(path, params, query)

  }

  setHash(path: string, params: Object | void, query: Object | void) {

    path = formatPath(path)

    if (!this.path2Route[path]) {
      path = this.route404.path
    }

    location.hash = constant.PREFIX_HASH + hashUtil.stringify(Yox, path, params, query)

  }

  /**
   * 启动路由
   */
  start() {
    domApi.on(window, 'hashchange', this.onChange as type.listener)
    this.onChange()
  }

  /**
   * 停止路由
   */
  stop() {
    domApi.off(window, 'hashchange', this.onChange as type.listener)
  }

  /**
   * 路由守卫
   */
  guard(route: typeUtil.LinkedRoute, name: string, callback?: () => void) {

    // 必须是叶子节点
    if (route.child) {
      return
    }

    const instance = this, { hooks } = instance, { to, from } = hooks

    if (!from || from.path !== to.path) {

      hooks
        .setName(name)
        // 先调用组件的钩子
        .add(route.options, route.context)
        // 再调用路由配置的钩子
        .add(route.route, route.route)
        // 最后调用路由实例的钩子
        .add(instance, instance)

      const next = function (value?: false | typeUtil.Target) {
        if (value === env.UNDEFINED) {
          hooks.next(next, callback)
        }
        else if (value !== env.FALSE) {
          // 跳转到别的路由
          instance.push(value)
        }
      }

      next()

    }
    else if (callback) {
      callback()
    }

  }

  /**
   * 切换路由
   */
  private setRoute(location: typeUtil.Location, route: typeUtil.LinkedRoute) {

    let instance = this,

    oldRoute = instance.route,

    newRoute = Yox.object.copy(route),

    startRoute: typeUtil.LinkedRoute | void,

    oldLocation = instance.location,

    // 对比新旧两个路由链表
    diffRoute = function (newRoute: typeUtil.LinkedRoute, oldRoute: typeUtil.LinkedRoute | void, childRoute: typeUtil.LinkedRoute | void, callback: (route: typeUtil.LinkedRoute) => void) {
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

          if (oldRoute) {
            // 同级的两个组件不同，疑似起始更新的路由
            if (oldRoute.options !== options) {
              startRoute = newRoute
            }
            else {
              // 把上次的组件实例搞过来
              newRoute.context = oldRoute.context
            }
          }
          else {
            startRoute = newRoute
          }

          if (newRoute.parent) {
            diffRoute(
              Yox.object.copy(newRoute.parent),
              oldRoute ? oldRoute.parent : env.UNDEFINED,
              newRoute,
              callback
            )
            return
          }

          // 到达根组件，结束
          callback(newRoute)

        }
      )
    },

    updateRoute = function (route: typeUtil.LinkedRoute) {
      // 从上往下更新 props
      while (env.TRUE) {

        let { parent, context, component, options } = route

        if (route === startRoute) {

          if (parent) {

            context = parent.context as Yox
            context.forceUpdate(
              filterProps(parent, location, parent.options as YoxOptions)
            )

            context = context[OUTLET]
            if (context) {
              const props = {}
              props[COMPONENT] = component
              context[ROUTE] = route
              context.component(component, options)
              context.forceUpdate(props)
            }

          }
          else {

            if (context) {
              context.destroy()
              const oldRoute = context[ROUTE]
              oldRoute.context = env.UNDEFINED
              instance.guard(oldRoute, constant.HOOK_AFTER_LEAVE)
            }

            // 每层路由组件都有 $route 和 $router 属性
            const extensions = {}
            extensions[ROUTER] = instance
            extensions[ROUTE] = route

            route.context = new Yox(
              Yox.object.extend(
                {
                  el: instance.el,
                  props: filterProps(route, location, options as YoxOptions),
                  extensions,
                },
                options as YoxOptions
              )
            )

            instance.guard(route, constant.HOOK_AFTER_ENTER)

          }

        }

        else if (context) {
          context[ROUTE] = route
          context.forceUpdate(
            filterProps(route, location, options as YoxOptions)
          )
          // 如果 <router-view> 定义在 if 里
          // 当 router-view 从无到有时，这里要读取最新的 child
          // 当 router-view 从有到无时，这里要判断它是否存在
          if (context[OUTLET] && route.child) {
            route = route.child as typeUtil.LinkedRoute
            continue
          }
        }
        break
      }
    },

    enterRoute = function (route: typeUtil.LinkedRoute) {
      instance.guard(
        newRoute,
        constant.HOOK_BEFORE_ENTER,
        function () {

          instance.route = newRoute
          instance.location = location

          updateRoute(route)

        }
      )
    }

    instance.hooks.setLocation(location, oldLocation)

    // 先确保加载到组件 options，这样才能在 guard 方法中调用 options 的路由钩子
    diffRoute(
      newRoute,
      oldRoute,
      env.UNDEFINED,
      function (route) {

        if (oldRoute) {
          instance.guard(
            oldRoute,
            constant.HOOK_BEFORE_LEAVE,
            function () {
              enterRoute(route)
            }
          )
        }
        else {
          enterRoute(route)
        }

      }
    )

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
  template: '<$' + COMPONENT + '/>',
  beforeCreate(options) {

    const $parent = options.parent as Yox,

    route = $parent[ROUTE].child as typeUtil.LinkedRoute

    if (route) {

      $parent[OUTLET] = this

      const props = {}, components = {}

      props[COMPONENT] = route.component
      components[route.component] = route.options

      options.props = props
      options.components = components

    }

  },
  beforeDestroy() {
    this.$parent[OUTLET] = env.UNDEFINED
  },
  beforeChildCreate(childOptions: YoxOptions) {

    const { $parent } = this,

    router = $parent[ROUTER] as Router,

    route = $parent[ROUTE].child as typeUtil.LinkedRoute,

    extensions = {}

    extensions[ROUTE] = route
    extensions[ROUTER] = router

    if (router.location) {
      childOptions.props = filterProps(route, router.location, childOptions)
    }

    childOptions.extensions = extensions

  },
  afterChildCreate(child: Yox) {

    const router = child[ROUTER] as Router,

    route = child[ROUTE] as typeUtil.LinkedRoute

    if (route) {
      route.context = child
      router.guard(route, constant.HOOK_AFTER_ENTER)
    }

  },
  beforeChildDestroy(child: Yox) {

    const router = child[ROUTER] as Router,

    route = child[ROUTE] as typeUtil.LinkedRoute

    if (route) {
      route.context = env.UNDEFINED
      router.guard(route, constant.HOOK_AFTER_LEAVE)
    }

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
