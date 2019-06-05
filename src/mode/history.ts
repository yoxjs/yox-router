import * as type from '../../../yox-type/src/type'

import API from '../../../yox-type/src/interface/API'
import Location from '../../../yox-type/src/router/Location'

import * as constant from '../constant'

const POP_STATE = 'popstate'

export const isSupported = 'pushState' in constant.HISTORY

export function start(domApi: API, handler: Function) {
  domApi.on(constant.WINDOW, POP_STATE, handler as type.listener)
  handler()
}

export function stop(domApi: API, handler: Function) {
  domApi.off(constant.WINDOW, POP_STATE, handler as type.listener)
}

export function push(location: Location, handler: Function) {
  constant.HISTORY.pushState({}, '', location.url)
  handler()
}

export function go(n: number, handler: Function) {
  constant.HISTORY.go(n)
  handler()
}

export function current() {
  return constant.LOCATION.pathname + constant.LOCATION.search
}
