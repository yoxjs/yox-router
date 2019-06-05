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

export function push(location: Location) {
  constant.HISTORY.pushState({}, '', location.url)
}

export function go(n: number) {
  constant.HISTORY.go(n)
}

export function current() {
  return constant.LOCATION.pathname + constant.LOCATION.search
}

export function createHandler(handler: (url: string) => void) {

  return function () {
    handler(current())
  }

}