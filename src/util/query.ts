import Yox from 'yox'

import {
  SEPARATOR_QUERY,
  SEPARATOR_PAIR,
  FLAG_ARRAY,
} from '../constant'

import * as valueUtil from './value'

/**
 * 把 GET 参数解析成对象
 */
export function parse(query: string) {
  let result: object | undefined
  Yox.array.each(
    query.split(SEPARATOR_QUERY),
    function (term: string) {

      let terms = term.split(SEPARATOR_PAIR),

      key = Yox.string.trim(terms[0]),

      value = terms[1]

      if (key) {
        if (!result) {
          result = {}
        }
        value = valueUtil.parse(value)
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
export function stringify(query: object) {
  const result: string[] = []
  for (let key in query) {
    const value = query[key]
    if (Yox.is.array(value)) {
      Yox.array.each(
        value,
        function (value: any) {
          const str = valueUtil.stringify(value)
          if (Yox.is.string(str)) {
            result.push(
              key + FLAG_ARRAY + SEPARATOR_PAIR + str
            )
          }
        }
      )
    }
    else {
      const str = valueUtil.stringify(value)
      if (Yox.is.string(str)) {
        result.push(
          key + SEPARATOR_PAIR + str
        )
      }
    }
  }
  return result.join(SEPARATOR_QUERY)
}
