
import YoxClass from '../../yox-type/src/interface/YoxClass'

import * as constant from './constant'
import * as valueUtil from './value'

/**
 * 把 GET 参数解析成对象
 */
export function parse(Yox: YoxClass, query: string) {
  let result: Object | undefined
  Yox.array.each(
    query.split(constant.SEPARATOR_QUERY),
    function (term) {

      let terms = term.split(constant.SEPARATOR_PAIR),

      key = Yox.string.trim(terms[0]),

      value = terms[1]

      if (key) {
        if (!result) {
          result = {}
        }
        value = valueUtil.parse(Yox, value)
        if (Yox.string.endsWith(key, constant.FLAG_ARRAY)) {
          key = Yox.string.slice(key, 0, -constant.FLAG_ARRAY.length)
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
            key + constant.FLAG_ARRAY + constant.SEPARATOR_PAIR + valueUtil.stringify(Yox, value)
          )
        }
      )
    }
    else {
      result.push(
        key + constant.SEPARATOR_PAIR + valueUtil.stringify(Yox, value)
      )
    }
  }
  return result.join(constant.SEPARATOR_QUERY)
}
