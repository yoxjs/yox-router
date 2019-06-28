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

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
const HASH_PREFIX = '#!',

HASH_CHANGE = 'hashchange'

export function start(domApi: DomApi, handler: Function) {
  domApi.on(constant.WINDOW, HASH_CHANGE, handler as Listener)
  handler()
}

export function stop(domApi: DomApi, handler: Function) {
  domApi.off(constant.WINDOW, HASH_CHANGE, handler as Listener)
}

export function push(location: Location, handler: Function) {
  constant.LOCATION.hash = HASH_PREFIX + location.url
}

export function go(n: number) {
  constant.HISTORY.go(n)
}

export function current() {

  // 不能直接读取 window.location.hash
  // 因为 Firefox 会做 pre-decode
  const href = constant.LOCATION.href, index = href.indexOf(HASH_PREFIX)

  return index > 0
    ? href.substr(index + HASH_PREFIX.length)
    : constant.SEPARATOR_PATH

}
