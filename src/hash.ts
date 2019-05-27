import * as env from '../../yox-common/src/util/env'
import YoxClass from '../../yox-type/src/interface/YoxClass'

import * as type from './type'
import * as constant from './constant'
import * as valueUtil from './value'
import * as queryUtil from './query'

/**
 * 解析 path 中的参数
 */
function parseParams(Yox: YoxClass, realpath: string, path: string) {

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

  let result: type.LinkedRoute | undefined,

  realpathTerms = realpath.split(constant.SEPARATOR_PATH),

  length = realpathTerms.length

  Yox.array.each(
    routes,
    function (route) {
      if (route.params) {
        const pathTerms = route.path.split(constant.SEPARATOR_PATH)
        if (length === pathTerms.length) {
          for (let i = 0; i < length; i++) {
            // 非参数段不相同
            if (!Yox.string.startsWith(pathTerms[i], constant.PREFIX_PARAM)
              && pathTerms[i] !== realpathTerms[i]
            ) {
              return
            }
          }
          result = route
          return env.FALSE
        }
      }
      else if (route.path === realpath) {
        result = route
        return env.FALSE
      }
    }
  )

  return result

}

/**
 * 完整解析 hash 数据
 */
export function parse(Yox: YoxClass, routes: type.LinkedRoute[], hash: string) {

  let realpath: string, search: string | void, index = hash.indexOf(constant.SEPARATOR_SEARCH)

  if (index >= 0) {
    realpath = hash.substring(0, index)
    search = hash.substring(index + 1)
  }
  else {
    realpath = hash
  }

  const result: type.Hash = { realpath },

  route = getRouteByRealpath(Yox, routes, realpath)

  if (route) {
    result.route = route
    if (route.params) {
      const params = parseParams(Yox, realpath, route.path)
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
  }

  return result
}

/**
 * 把结构化数据序列化成 hash
 */
export function stringify(Yox: YoxClass, path: string, params: Object | void, query: Object | void) {

  let terms: string[] = [], realpath: string, search = env.EMPTY_STRING

  Yox.array.each(
    path.split(constant.SEPARATOR_PATH),
    function (item) {
      terms.push(
        Yox.string.startsWith(item, constant.PREFIX_PARAM)
          ? params[item.substr(constant.PREFIX_PARAM.length)]
          : item
      )
    }
  )

  realpath = terms.join(constant.SEPARATOR_PATH)

  if (query) {
    const queryStr = queryUtil.stringify(Yox, query)
    if (queryStr) {
      search = constant.SEPARATOR_SEARCH + queryStr
    }
  }

  return realpath + search

}