import * as type from '../../../yox-type/src/type'

import API from '../../../yox-type/src/interface/API'
import Location from '../../../yox-type/src/router/Location'

import * as constant from '../constant'

const WINDOW = window,

LOCATION = WINDOW.location,

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
HASH_PREFIX = '#!',

HASH_CHANGE = 'hashchange'

export function start(domApi: API, handler: Function) {
  domApi.on(WINDOW, HASH_CHANGE, handler as type.listener)
  handler()
}

export function stop(domApi: API, handler: Function) {
  domApi.off(WINDOW, HASH_CHANGE, handler as type.listener)
}

export function push(location: Location) {
  LOCATION.hash = HASH_PREFIX + location.url
}

export function go(n: number) {
  WINDOW.history.go(n)
}

export function createHandler(handler: (url: string) => void) {

  return function () {

    // 不能直接读取 window.location.hash
    // 因为 Firefox 会做 pre-decode
    let href = LOCATION.href, index = href.indexOf(HASH_PREFIX), url = constant.SEPARATOR_PATH
    if (index > 0) {
      url = href.substr(index + HASH_PREFIX.length)
    }

    handler(url)

  }

}