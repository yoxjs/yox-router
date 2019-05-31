import * as type from '../../yox-type/src/type'

import Yox from '../../yox-type/src/interface/Yox'
import YoxOptions from '../../yox-type/src/options/Yox'

import * as constant from './constant'

export interface RouteTarget {
  name?: string
  path?: string
  params?: type.data
  query?: type.data
}

export type Target = string | RouteTarget

export type Next = (value?: false | Target) => void

export type Callback = () => void

export type BeforeHook = (to: Location, from: Location | void, next: Next) => void

export type AfterHook = (to: Location, from: Location | void) => void

export type RouteComplete = () => void

export type RouteAbort = () => void

export type DiffComplete = (route: LinkedRoute, startRoute: LinkedRoute | void) => void

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
  [constant.HOOK_BEFORE_ENTER]?: BeforeHook
  [constant.HOOK_AFTER_ENTER]?: AfterHook
  [constant.HOOK_BEFORE_LEAVE]?: BeforeHook
  [constant.HOOK_AFTER_LEAVE]?: AfterHook
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

export interface Location {
  path: string
  params?: type.data
  query?: type.data
}

export interface Loading {
  location: Location
  route: LinkedRoute
  hash: string
  onComplete: RouteComplete
  onAbort: RouteAbort
}