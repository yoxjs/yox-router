
import YoxClass from '../../yox-type/src/interface/YoxClass'

import * as valueUtil from './value'

// query 分隔符
const SEPARATOR_QUERY = '&',

// 键值对分隔符
SEPARATOR_PAIR = '=',

// 参数中的数组标识
FLAG_ARRAY = '[]'

/**
 * 把 GET 参数解析成对象
 */
export function parse(Yox: YoxClass, query: string) {
  let result: Object | undefined
  Yox.array.each(
    query.split(SEPARATOR_QUERY),
    function (term) {

      let terms = term.split(SEPARATOR_PAIR),

      key = Yox.string.trim(terms[0]),

      value = terms[1]

      if (key) {
        if (!result) {
          result = {}
        }
        value = valueUtil.parse(Yox, value)
        if (Yox.string.endsWith(key, FLAG_ARRAY)) {
          key = Yox.string.slice(key, 0, -FLAG_ARRAY.length)
          Yox.array.push(
            result[key] || (result[key] = []),
            value
          )
        }
        else {
          result[key] = value
        }
      }

    }
  )
  return result
}

/**
 * 把对象解析成 key1=value1&key2=value2
 */
export function stringify(Yox: YoxClass, query: Object) {
  const result: string[] = []
  for (let key in query) {
    const value = query[key]
    if (Yox.is.array(value)) {
      Yox.array.each(
        value,
        function (value) {
          result.push(
            key + FLAG_ARRAY + SEPARATOR_PAIR + valueUtil.stringify(Yox, value)
          )
        }
      )
    }
    else {
      result.push(
        key + SEPARATOR_PAIR + valueUtil.stringify(Yox, value)
      )
    }
  }
  return result.join(SEPARATOR_QUERY)
}
