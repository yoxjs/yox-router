import {
  DomUtil,
  Location,
} from '../../../yox-type/src/type'

import {
  listener,
} from '../../../yox-type/src/global'

import * as constant from '../constant'

const POP_STATE = 'popstate'

export const isSupported = 'pushState' in constant.HISTORY

export function start(domUtil: DomUtil, handler: Function) {
  domUtil.on(constant.WINDOW, POP_STATE, handler as listener)
  handler()
}

export function stop(domUtil: DomUtil, handler: Function) {
  domUtil.off(constant.WINDOW, POP_STATE, handler as listener)
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
