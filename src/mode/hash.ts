import Yox, {
  Listener,
} from 'yox'

import {
  Location,
} from '../type'

import {
  WINDOW,
  HISTORY,
  LOCATION,
  SEPARATOR_PATH,
} from '../constant'

import {
  isSupported,
  replaceState,
} from './history'

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
const HASH_PREFIX = '#!',

HASH_CHANGE = 'hashchange'

export function start(handler: Function) {
  Yox.dom.on(WINDOW, HASH_CHANGE, handler as Listener)
  handler()
}

export function stop(handler: Function) {
  Yox.dom.off(WINDOW, HASH_CHANGE, handler)
}

export function push(location: Location, handler: Function) {
  LOCATION.hash = HASH_PREFIX + location.url
}

export function replace(location: Location, handler: Function) {

  const url = LOCATION.protocol + '//' + LOCATION.host + LOCATION.pathname + HASH_PREFIX + location.url

  if (isSupported) {
    replaceState(url, handler)
  }
  else {
    LOCATION.replace(url)
  }

}

export function go(n: number) {
  HISTORY.go(n)
}

export function current() {

  // 不能直接读取 window.location.hash
  // 因为 Firefox 会做 pre-decode
  const href = LOCATION.href, index = href.indexOf(HASH_PREFIX)

  return index > 0
    ? href.substr(index + HASH_PREFIX.length)
    : SEPARATOR_PATH

}
