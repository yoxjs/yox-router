import Yox from 'yox'

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
export function parse(value: string) {
  let result: any
  if (Yox.is.numeric(value)) {
    result = +value
  }
  else if (Yox.is.string(value)) {
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

export function stringify(value: any): string | void {
  if (Yox.is.string(value)) {
    return encodeURIComponent(value)
  }
  else if (Yox.is.number(value) || Yox.is.boolean(value)) {
    return value.toString()
  }
  else if (value === NULL) {
    return RAW_NULL
  }
}