import {
  Location,
} from '../../../yox-type/src/router'

import {
  DomApi,
} from '../../../yox-type/src/api'

import {
  Listener,
} from '../../../yox-type/src/type'

import * as constant from '../constant'

const POP_STATE = 'popstate'

export const isSupported = 'pushState' in constant.HISTORY

export function start(domApi: DomApi, handler: Function) {
  domApi.on(constant.WINDOW, POP_STATE, handler as Listener)
  handler()
}

export function stop(domApi: DomApi, handler: Function) {
  domApi.off(constant.WINDOW, POP_STATE, handler as Listener)
}

export function push(location: Location, handler: Function) {
  // 调用 pushState 不会触发 popstate 事件
  // 因此这里需要手动调用一次 handler
  constant.HISTORY.pushState({}, '', location.url)
  handler()
}

export function go(n: number) {
  constant.HISTORY.go(n)
}

export function current() {
  return constant.LOCATION.pathname + constant.LOCATION.search
}
