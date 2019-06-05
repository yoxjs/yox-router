import * as type from '../../yox-type/src/type'

import Yox from '../../yox-type/src/interface/Yox'
import YoxOptions from '../../yox-type/src/options/Yox'

import Location from '../../yox-type/src/router/Location'
import RouteTarget from '../../yox-type/src/router/RouteTarget'

import * as constant from './constant'

export type Target = string | RouteTarget

export type Redirect = (to: Location) => Target

export type Callback = () => void

export type RouteCallback = (route: RouteOptions) => void

export type RouteLoader = (callback: RouteCallback) => void

export type RouteComplete = () => void

export type RouteAbort = () => void

export type DiffComplete = (route: LinkedRoute, startRoute: LinkedRoute | void) => void

export interface RouterOptions {
  el: Element | string
  routes: RouteOptions[]
  route404: RouteOptions
}

export interface RouteOptions {
  path: string
  component: YoxOptions
  name?: string
  loadRoute?: RouteLoader
  redirect?: Target | Redirect
  children?: RouteOptions[]
  [constant.HOOK_BEFORE_ENTER]?: type.routerBeforeHook
  [constant.HOOK_AFTER_ENTER]?: type.routerAfterHook
  [constant.HOOK_BEFORE_LEAVE]?: type.routerBeforeHook
  [constant.HOOK_AFTER_LEAVE]?: type.routerAfterHook
}

export interface LinkedRoute {
  path: string
  route: RouteOptions
  name?: string
  loadRoute?: RouteLoader
  component?: YoxOptions
  params?: string[]
  context?: Yox
  parent?: LinkedRoute
  child?: LinkedRoute
}

export interface Pending {
  cursor: number | void
  location: Location
  onComplete: RouteComplete
  onAbort: RouteAbort
}