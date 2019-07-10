import {
  API,
} from '../type'

import {
  NULL,
  TRUE,
  FALSE,
  RAW_NULL,
  RAW_TRUE,
  RAW_FALSE,
} from '../constant'

/**
 * 把字符串 value 解析成最合适的类型
 */
export function parse(API: API, value: string) {
  let result: any
  if (API.is.numeric(value)) {
    result = +value
  }
  else if (API.is.string(value)) {
    if (value === RAW_TRUE) {
      result = TRUE
    }
    else if (value === RAW_FALSE) {
      result = FALSE
    }
    else if (value === RAW_NULL) {
      result = NULL
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
  else if (value === NULL) {
    return RAW_NULL
  }
}