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
} from '../constant'

const POP_STATE = 'popstate'

export const isSupported = 'pushState' in HISTORY

export function start(handler: Function) {
  Yox.dom.on(WINDOW, POP_STATE, handler as Listener)
  handler()
}

export function stop(handler: Function) {
  Yox.dom.off(WINDOW, POP_STATE, handler)
}

export function push(location: Location, handler: Function) {
  // 调用 pushState 不会触发 popstate 事件
  // 因此这里需要手动调用一次 handler
  HISTORY.pushState({}, '', location.url)
  handler()
}

export function replace(location: Location, handler: Function) {
  // 调用 replaceState 不会触发 popstate 事件
  // 因此这里需要手动调用一次 handler
  replaceState(location.url as string, handler)
}

export function go(n: number) {
  HISTORY.go(n)
}

export function current() {
  return LOCATION.pathname + LOCATION.search
}

export function replaceState(url: string, handler: Function) {

  // try...catch the pushState call to get around Safari
  // DOM Exception 18 where it limits to 100 pushState calls
  try {
    HISTORY.replaceState({}, '', url)
    handler()
  }
  catch (e) {
    LOCATION.replace(url)
  }

}