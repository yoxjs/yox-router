import {
  Location,
  RouteTarget,
  RouterBeforeHook,
  RouterAfterHook,
  DomUtil,
} from '../../yox-type/src/type'

import {
  YoxTypedOptions,
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

import Yox from '../../yox/src/Yox'

export type API = typeof Yox

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
  [ROUTER_HOOK_BEFORE_ENTER]?: RouterBeforeHook
  [ROUTER_HOOK_AFTER_ENTER]?: RouterAfterHook
  [ROUTER_HOOK_BEFORE_UPDATE]?: RouterBeforeHook
  [ROUTER_HOOK_AFTER_UPDATE]?: RouterAfterHook
  [ROUTER_HOOK_BEFORE_LEAVE]?: RouterBeforeHook
  [ROUTER_HOOK_AFTER_LEAVE]?: RouterAfterHook
}

export interface RouteOptions {
  path: string
  component?: YoxTypedOptions
  name?: string
  load?: RouteLoader
  redirect?: Target | Redirect
  children?: RouteOptions[]
  [ROUTER_HOOK_BEFORE_ENTER]?: RouterBeforeHook
  [ROUTER_HOOK_AFTER_ENTER]?: RouterAfterHook
  [ROUTER_HOOK_BEFORE_UPDATE]?: RouterBeforeHook
  [ROUTER_HOOK_AFTER_UPDATE]?: RouterAfterHook
  [ROUTER_HOOK_BEFORE_LEAVE]?: RouterBeforeHook
  [ROUTER_HOOK_AFTER_LEAVE]?: RouterAfterHook
}

export interface LinkedRoute {
  path: string
  route: RouteOptions
  name?: string
  load?: RouteLoader
  component?: YoxTypedOptions
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