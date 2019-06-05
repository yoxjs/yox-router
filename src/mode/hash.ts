import * as type from '../../../yox-type/src/type'
import * as env from '../../../yox-common/src/util/env'

import API from '../../../yox-type/src/interface/API'
import Location from '../../../yox-type/src/router/Location'

import * as constant from '../constant'

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
const HASH_PREFIX = '#!',

HASH_CHANGE = 'hashchange'

export function start(domApi: API, handler: Function) {
  domApi.on(constant.WINDOW, HASH_CHANGE, handler as type.listener)
  handler()
}

export function stop(domApi: API, handler: Function) {
  domApi.off(constant.WINDOW, HASH_CHANGE, handler as type.listener)
}

export function push(location: Location) {
  constant.LOCATION.hash = HASH_PREFIX + location.url
  return env.TRUE
}

export function go(n: number) {
  constant.HISTORY.go(n)
  return env.TRUE
}

export function current() {
  // 不能直接读取 window.location.hash
  // 因为 Firefox 会做 pre-decode
  let href = constant.LOCATION.href, index = href.indexOf(HASH_PREFIX), url = constant.SEPARATOR_PATH
  if (index > 0) {
    url = href.substr(index + HASH_PREFIX.length)
  }
  return url
}

export function createHandler(handler: (url: string) => void) {

  return function () {
    handler(current())
  }

}