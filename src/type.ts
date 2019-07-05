import {
  Location,
  RouteTarget,
} from '../../yox-type/src/router'

import {
  RouterBeforeHook,
  RouterAfterHook,
} from '../../yox-type/src/type'

import {
  DomApi,
} from '../../yox-type/src/api'

import {
  ComponentOptions,
} from '../../yox-type/src/options'

import {
  YoxInterface,
} from '../../yox-type/src/yox'

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
  component?: ComponentOptions
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
  component?: ComponentOptions
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
  start(domApi: DomApi, handler: Function): void
  stop(domApi: DomApi, handler: Function): void
  push(location: Location, handler: Function): void
  go(n: number): void
  current(): string
}