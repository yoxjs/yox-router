import { API } from '../type'

import * as constant from '../constant'
import * as valueUtil from './value'

/**
 * 把 GET 参数解析成对象
 */
export function parse(API: API, query: string) {
  let result: Object | undefined
  API.array.each(
    query.split(constant.SEPARATOR_QUERY),
    function (term) {

      let terms = term.split(constant.SEPARATOR_PAIR),

      key = API.string.trim(terms[0]),

      value = terms[1]

      if (key) {
        if (!result) {
          result = {}
        }
        value = valueUtil.parse(API, value)
        if (API.string.endsWith(key, constant.FLAG_ARRAY)) {
          key = API.string.slice(key, 0, -constant.FLAG_ARRAY.length)
          API.array.push(
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
export function stringify(API: API, query: Object) {
  const result: string[] = []
  for (let key in query) {
    const value = query[key]
    if (API.is.array(value)) {
      API.array.each(
        value,
        function (value) {
          const str = valueUtil.stringify(API, value)
          if (API.is.string(str)) {
            result.push(
              key + constant.FLAG_ARRAY + constant.SEPARATOR_PAIR + str
            )
          }
        }
      )
    }
    else {
      const str = valueUtil.stringify(API, value)
      if (API.is.string(str)) {
        result.push(
          key + constant.SEPARATOR_PAIR + str
        )
      }
    }
  }
  return result.join(constant.SEPARATOR_QUERY)
}
