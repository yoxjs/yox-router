import * as env from '../../yox-common/src/util/env'
import YoxClass from '../../yox-type/src/interface/YoxClass'

/**
 * 把字符串 value 解析成最合适的类型
 */
export function parse(Yox: YoxClass, value: string) {
  let result: any
  if (Yox.is.numeric(value)) {
    result = +value
  }
  else if (Yox.is.string(value)) {
    if (value === env.RAW_TRUE) {
      result = env.TRUE
    }
    else if (value === env.RAW_FALSE) {
      result = env.FALSE
    }
    else if (value === env.RAW_NULL) {
      result = env.NULL
    }
    else if (value === env.RAW_UNDEFINED) {
      result = env.UNDEFINED
    }
    else {
      result = decodeURIComponent(value)
    }
  }
  return result
}

export function stringify(Yox: YoxClass, value: any): string {
  if (Yox.is.string(value)) {
    return encodeURIComponent(value)
  }
  else if (Yox.is.number(value) || Yox.is.boolean(value)) {
    return value.toString()
  }
  else if (value === env.NULL) {
    return env.RAW_NULL
  }
  return env.RAW_UNDEFINED
}