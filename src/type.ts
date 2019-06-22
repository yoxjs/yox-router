import {
  Location,
  RouteTarget,
  routerBeforeHook,
  routerAfterHook,
  DomUtil,
} from '../../yox-type/src/type'

import {
  YoxOptions,
  YoxInterface,
} from '../../yox-type/src/global'

import {
  ROUTER_HOOK_BEFORE_ENTER,
  ROUTER_HOOK_AFTER_ENTER,
  ROUTER_HOOK_BEFORE_UPDATE,
  ROUTER_HOOK_AFTER_UPDATE,
  ROUTER_HOOK_BEFORE_LEAVE,
  ROUTER_HOOK_AFTER_LEAVE,
} from './constant'

export type Target = string | RouteTarget

export type Redirect = (to: Location) => Target

export type Callback = () => void

export type RouteCallback = (route: RouteOptions) => void

export type RouteLoader = (callback: RouteCallback) => Promise<RouteOptions> | void

export interface RouterOptions {
  el: Element | string
  routes: RouteOptions[]
  route404?: RouteOptions
  mode?: 'hash' | 'history'
  [ROUTER_HOOK_BEFORE_ENTER]?: routerBeforeHook
  [ROUTER_HOOK_AFTER_ENTER]?: routerAfterHook
  [ROUTER_HOOK_BEFORE_UPDATE]?: routerBeforeHook
  [ROUTER_HOOK_AFTER_UPDATE]?: routerAfterHook
  [ROUTER_HOOK_BEFORE_LEAVE]?: routerBeforeHook
  [ROUTER_HOOK_AFTER_LEAVE]?: routerAfterHook
}

export interface RouteOptions {
  path: string
  component?: YoxOptions
  name?: string
  load?: RouteLoader
  redirect?: Target | Redirect
  children?: RouteOptions[]
  [ROUTER_HOOK_BEFORE_ENTER]?: routerBeforeHook
  [ROUTER_HOOK_AFTER_ENTER]?: routerAfterHook
  [ROUTER_HOOK_BEFORE_UPDATE]?: routerBeforeHook
  [ROUTER_HOOK_AFTER_UPDATE]?: routerAfterHook
  [ROUTER_HOOK_BEFORE_LEAVE]?: routerBeforeHook
  [ROUTER_HOOK_AFTER_LEAVE]?: routerAfterHook
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

export interface Mode {
  start(domUtil: DomUtil, handler: Function): void
  stop(domUtil: DomUtil, handler: Function): void
  push(location: Location, handler: Function): void
  go(n: number): void
  current(): string
}