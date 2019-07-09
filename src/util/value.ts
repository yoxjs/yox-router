import {
  API,
} from '../type'

import * as env from '../../../yox-common/src/util/env'

/**
 * 把字符串 value 解析成最合适的类型
 */
export function parse(API: API, value: string) {
  let result: any
  if (API.is.numeric(value)) {
    result = +value
  }
  else if (API.is.string(value)) {
    if (value === env.RAW_TRUE) {
      result = env.TRUE
    }
    else if (value === env.RAW_FALSE) {
      result = env.FALSE
    }
    else if (value === env.RAW_NULL) {
      result = env.NULL
    }
    else {
      result = decodeURIComponent(value)
    }
  }
  return result
}

export function stringify(API: API, value: any): string | void {
  if (API.is.string(value)) {
    return encodeURIComponent(value)
  }
  else if (API.is.number(value) || API.is.boolean(value)) {
    return value.toString()
  }
  else if (value === env.NULL) {
    return env.RAW_NULL
  }
}