import YoxClass from '../../yox-type/src/interface/YoxClass'

import * as type from './type'
import * as constant from './constant'
import * as valueUtil from './value'
import * as queryUtil from './query'

/**
 * 解析 path 中的参数
 */
function parseParams(Yox: YoxClass, path: string, realpath: string) {

  let result: Object | undefined,

  realpathTerms = realpath.split(constant.SEPARATOR_PATH),

  pathTerms = path.split(constant.SEPARATOR_PATH)

  if (realpathTerms.length === pathTerms.length) {
    Yox.array.each(
      pathTerms,
      function (item, index) {
        if (Yox.string.startsWith(item, constant.PREFIX_PARAM)) {
          if (!result) {
            result = {}
          }
          result[item.substr(constant.PREFIX_PARAM.length)] = valueUtil.parse(Yox, realpathTerms[index])
        }
      }
    )
  }

  return result

}

/**
 * 通过 realpath 获取配置的路由
 */
function getRouteByRealpath(Yox: YoxClass, routes: type.LinkedRoute[], realpath: string) {

  let realpathTerms = realpath.split(constant.SEPARATOR_PATH),

  length = realpathTerms.length,

  i = 0,

  route: type.LinkedRoute | void

  loop: while (route = routes[i++]) {
    if (route.params) {
      const pathTerms = route.path.split(constant.SEPARATOR_PATH)
      if (length === pathTerms.length) {
        for (let l = 0; l < length; l++) {
          // 非参数段不相同
          if (!Yox.string.startsWith(pathTerms[l], constant.PREFIX_PARAM)
            && pathTerms[l] !== realpathTerms[l]
          ) {
            continue loop
          }
        }
        return route
      }
    }
    else if (route.path === realpath) {
      return route
    }
  }

}

export function parse(Yox: YoxClass, routes: type.LinkedRoute[], hash: string) {

  let realpath: string, search: string | void, index = hash.indexOf(constant.SEPARATOR_SEARCH)

  if (index >= 0) {
    realpath = hash.slice(0, index)
    search = hash.slice(index + 1)
  }
  else {
    realpath = hash
  }

  const route = getRouteByRealpath(Yox, routes, realpath)

  if (route) {
    const result: type.Location = {
      hash,
      path: route.path
    }
    if (route.params) {
      const params = parseParams(Yox, route.path, realpath)
      if (params) {
        result.params = params
      }
    }
    if (search) {
      const query = queryUtil.parse(Yox, search)
      if (query) {
        result.query = query
      }
    }
    return result
  }

}

/**
 * 把结构化数据序列化成 hash
 */
export function stringify(Yox: YoxClass, location: type.Location) {

  const { path, params, query } = location, terms: string[] = []

  Yox.array.each(
    path.split(constant.SEPARATOR_PATH),
    function (item) {
      terms.push(
        Yox.string.startsWith(item, constant.PREFIX_PARAM) && params
          ? params[item.substr(constant.PREFIX_PARAM.length)]
          : item
      )
    }
  )

  let realpath = terms.join(constant.SEPARATOR_PATH)

  if (query) {
    const queryStr = queryUtil.stringify(Yox, query)
    if (queryStr) {
      realpath += constant.SEPARATOR_SEARCH + queryStr
    }
  }

  return realpath

}