import {
  API,
  Location,
  listener,
} from '../../../yox-type/src/type'

import * as constant from '../constant'

const POP_STATE = 'popstate'

export const isSupported = 'pushState' in constant.HISTORY

export function start(domApi: API, handler: Function) {
  domApi.on(constant.WINDOW, POP_STATE, handler as listener)
  handler()
}

export function stop(domApi: API, handler: Function) {
  domApi.off(constant.WINDOW, POP_STATE, handler as listener)
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
