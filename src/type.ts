import {
  Data,
  DomApi,
  YoxInterface,
  ComponentOptions,
} from 'yox'

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

export type RouteCallback = (route: RouteOptions) => void

export type RouteLoader = (callback: RouteCallback) => Promise<any> | void

export type RouteBeforeHook = (to: Location, from: Location | void, next: (value?: false | string | RouteTarget) => void) => void

export type RouteAfterHook = (to: Location, from: Location | void) => void

export interface Location {
  path: string
  url?: string
  params?: Data
  query?: Data
}

export interface RouteTarget {
  name?: string
  path?: string
  params?: Data
  query?: Data
}

export interface RouterOptions {
  el: Element | string
  routes: RouteOptions[]
  route404?: RouteOptions
  mode?: 'hash' | 'history'
  [ROUTER_HOOK_BEFORE_ENTER]?: RouteBeforeHook
  [ROUTER_HOOK_AFTER_ENTER]?: RouteAfterHook
  [ROUTER_HOOK_BEFORE_UPDATE]?: RouteBeforeHook
  [ROUTER_HOOK_AFTER_UPDATE]?: RouteAfterHook
  [ROUTER_HOOK_BEFORE_LEAVE]?: RouteBeforeHook
  [ROUTER_HOOK_AFTER_LEAVE]?: RouteAfterHook
}

export interface RouteOptions {
  path: string
  component?: ComponentOptions
  name?: string
  load?: RouteLoader
  redirect?: Target | Redirect
  children?: RouteOptions[]
  [ROUTER_HOOK_BEFORE_ENTER]?: RouteBeforeHook
  [ROUTER_HOOK_AFTER_ENTER]?: RouteAfterHook
  [ROUTER_HOOK_BEFORE_UPDATE]?: RouteBeforeHook
  [ROUTER_HOOK_AFTER_UPDATE]?: RouteAfterHook
  [ROUTER_HOOK_BEFORE_LEAVE]?: RouteBeforeHook
  [ROUTER_HOOK_AFTER_LEAVE]?: RouteAfterHook
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

export interface RoutePending {
  cursor?: number
  location: Location
  onComplete: Function
  onAbort: Function
}

export interface RouterMode {
  start(api: DomApi, handler: Function): void
  stop(api: DomApi, handler: Function): void
  push(location: Location, handler: Function): void
  go(n: number): void
  current(): string
}
