import {
  Data,
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
  ROUTER_HOOK_BEFORE_LOAD,
  ROUTER_HOOK_AFTER_LOAD,
} from './constant'

export type Target = string | RouteTarget

export type Redirect = (to: Location) => Target

export type RouteCallback = (route: RouteOptions) => void

export type RouteLoader = (callback: RouteCallback) => Promise<any> | void

export type RouteBeforeHook = (to: Location, from: Location | void, next: (value?: false | string | RouteTarget) => void) => void

export type RouteAfterHook = (to: Location, from: Location | void) => void

export interface Task {
  fn: Function
  ctx?: any
}

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
  [ROUTER_HOOK_BEFORE_LOAD]?: (path: string) => void
  [ROUTER_HOOK_AFTER_LOAD]?: (path: string, location: Location | void) => void
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
  loading?: boolean
  component?: ComponentOptions
  params?: string[]
  context?: YoxInterface
  parent?: LinkedRoute
  child?: LinkedRoute
}

export interface RoutePending {
  onComplete: Function
  onAbort: Function
}

export interface RouterMode {
  start(handler: Function): void
  stop(handler: Function): void
  push(location: Location, handler: Function): void
  replace(location: Location, handler: Function): void
  go(n: number): void
  current(): string
}
