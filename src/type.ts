import * as type from '../../yox-type/src/type'

import YoxOptions from '../../yox-type/src/options/Yox'

export interface RouteTarget {
  name?: string
  path?: string
  params?: type.data
  query?: type.data
}

export type Target = string | RouteTarget

export type Next = (value?: false | Target) => void

export type BeforeHook = (to: Location, from: Location | void, next: Next) => void

export type AfterHook = (to: Location, from: Location | void) => void

export interface RouterOptions {
  el: Element
  routes: RouteOptions[]
  route404: RouteOptions
}

export interface RouteOptions {
  path: string
  component: string
  name?: string
  children?: RouteOptions[]
  [HOOK_BEFORE_ENTER]?: BeforeHook
  [HOOK_AFTER_ENTER]?: AfterHook
  [HOOK_BEFORE_LEAVE]?: BeforeHook
  [HOOK_AFTER_LEAVE]?: AfterHook
}

export interface LinkedRoute {
  path: string
  component: string
  route: RouteOptions
  params?: string[]
  options?: YoxOptions
  context?: Yox
  parent?: LinkedRoute
  child?: LinkedRoute
}

export interface Hash {
  realpath: string
  route?: LinkedRoute
  params?: type.data
  query?: type.data
}

export interface Location {
  path: string
  params?: type.data
  query?: type.data
}