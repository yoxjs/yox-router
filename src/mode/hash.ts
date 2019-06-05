import * as type from '../../../yox-type/src/type'
import * as env from '../../../yox-common/src/util/env'

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

export function setLocation(location: Location) {

  const hash = HASH_PREFIX + location.url

  if (LOCATION.hash !== hash) {
    LOCATION.hash = hash
    return env.TRUE
  }

}

export function createHandler(handler: (url: string) => void) {

  return function () {

    let url = LOCATION.hash

    // 如果不以 HASH_PREFIX 开头，表示不合法
    url = url !== HASH_PREFIX && url.indexOf(HASH_PREFIX) === 0
      ? url.substr(HASH_PREFIX.length)
      : constant.SEPARATOR_PATH

    handler(url)

  }

}