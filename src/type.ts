import {
  Location,
  RouteTarget,
  routerBeforeHook,
  routerAfterHook,
} from '../../yox-type/src/type'

import * as constant from './constant'

export type Target = string | RouteTarget

export type Redirect = (to: Location) => Target

export type Callback = () => void

export type RouteCallback = (route: RouteOptions) => void

export type RouteLoader = (callback: RouteCallback) => void

export interface RouterOptions {
  el: Element | string
  routes: RouteOptions[]
  route404?: RouteOptions
  mode?: 'hash' | 'history'
  [constant.HOOK_BEFORE_ENTER]?: routerBeforeHook
  [constant.HOOK_AFTER_ENTER]?: routerAfterHook
  [constant.HOOK_BEFORE_LEAVE]?: routerBeforeHook
  [constant.HOOK_AFTER_LEAVE]?: routerAfterHook
}

export interface RouteOptions {
  path: string
  component?: YoxOptions
  name?: string
  load?: RouteLoader
  redirect?: Target | Redirect
  children?: RouteOptions[]
  [constant.HOOK_BEFORE_ENTER]?: routerBeforeHook
  [constant.HOOK_AFTER_ENTER]?: routerAfterHook
  [constant.HOOK_BEFORE_LEAVE]?: routerBeforeHook
  [constant.HOOK_AFTER_LEAVE]?: routerAfterHook
}

export interface LinkedRoute {
  path: string
  route: RouteOptions
  name?: string
  load?: RouteLoader
  component?: YoxOptions
  params?: string[]
  context?: YoxInterface
  parent?: LinkedRoute
  child?: LinkedRoute
}

export interface Pending {
  cursor?: number
  location: Location
  onComplete: Callback
  onAbort: Callback
}