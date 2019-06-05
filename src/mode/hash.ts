import * as type from '../../../yox-type/src/type'
import * as env from '../../../yox-common/src/util/env'

import API from '../../../yox-type/src/interface/API'
import Location from '../../../yox-type/src/router/Location'

import * as constant from '../constant'

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
const WINDOW = window, LOCATION = WINDOW.location, EVENT_HASH_CHANGE = 'hashchange', PREFIX_HASH = '#!'

export function start(domApi: API, handler: Function) {
  domApi.on(WINDOW, EVENT_HASH_CHANGE, handler as type.listener)
  handler()
}

export function stop(domApi: API, handler: Function) {
  domApi.off(WINDOW, EVENT_HASH_CHANGE, handler as type.listener)
}

export function setLocation(location: Location) {

  const hash = PREFIX_HASH + location.url

  if (LOCATION.hash !== hash) {
    LOCATION.hash = hash
    return env.TRUE
  }

}

export function createHandler(handler: (hash: string) => void) {

  return function () {

    let url = LOCATION.hash

    // 如果不以 PREFIX_HASH 开头，表示不合法
    url = url !== PREFIX_HASH && url.indexOf(PREFIX_HASH) === 0
      ? url.substr(PREFIX_HASH.length)
      : constant.SEPARATOR_PATH

    handler(url)

  }

}