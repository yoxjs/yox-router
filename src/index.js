
let utils
let create

const PREFIX = '!'
const DIVIDER = '/'






/**
 * 解析 GET 参数
 *
 * @param {string} query
 * @return {object}
 */
function parseQuery(query) {
  let result = { }
  if (utils.is.string(query) && query.indexOf('=') >= 0) {
    utils.array.each(
      query.split('&'),
      function (item) {
        let terms = item.split('=')
        if (terms.length === 2) {
          let key = terms[0]
          if (key) {
            result[key] = decodeURIComponent(terms[1])
          }
        }
      }
    )
  }
  return result
}

function stringifyQuery(query) {
  let result = [ ]
  utils.object.each(
    query,
    function (value, key) {
      result.push(
        `${key}=${encodeURIComponent(value)}`
      )
    }
  )
  return result.join('&')
}

/**
 * 解析 path 中的参数
 *
 * @param {string} realpath
 * @param {string} path
 * @return {object}
 */
function parseParams(realpath, path) {

  let result = { }

  let terms = realpath.split(DIVIDER)
  utils.array.each(
    path.split(DIVIDER),
    function (item, index) {
      if (item.startsWith(':')) {
        result[item.slice(1)] = terms[index]
      }
    }
  )

  return result

}

/**
 * 通过 realpath（不包含参数）获取配置的 path
 *
 * @param {string} realpath
 * @return {string}
 */
function getPath(realpath) {

  let result

  let terms = realpath.split(DIVIDER)
  utils.object.each(
    path2Config,
    function (config, path) {
      let patterns = path.split(DIVIDER)
      if (terms.length === patterns.length) {
        utils.array.each(
          patterns,
          function (pattern, index) {
            if (!pattern.startsWith(':')) {
              if (pattern !== terms[index]) {
                path = null
                return false
              }
            }
          }
        )
        if (path) {
          result = path
          return false
        }
      }
    }
  )

  return result

}

/**
 * 完整解析 hash 数据
 *
 * @param {string} hash
 * @param {string} pattern
 * @return {object}
 */
function parseHash(hash) {
  if (hash.startsWith(PREFIX)) {
    hash = hash.slice(PREFIX.length)
    let realpath, search
    let index = hash.indexOf('?')
    if (index >= 0) {
      realpath = hash.substring(0, index)
      search = hash.slice(index + 1)
    }
    else {
      realpath = hash
    }

    let path = getPath(realpath)
    if (path) {
      return {
        path,
        realpath,
        params: parseParams(realpath, path),
        query: parseQuery(search)
      }
    }
  }
}

function stringifyHash(path, params, query) {

  let realpath = [ ]

  utils.array.each(
    path.split(DIVIDER),
    function (term) {
      realpath.push(
        term.startsWith(':')
        ? params[term.slice(1)]
        : term
      )
    }
  )

  let hash = realpath.join(DIVIDER)

  query = stringifyQuery(query)
  if (query) {
    hash += `?${query}`
  }

  return PREFIX + hash

}


/**
 * 响应路由变化的元素
 *
 * @type {HTMLElement}
 */
let element

let instance

/**
 * 已注册的组件，name -> component
 *
 * @type {Object}
 */
let name2Component = { }

/**
 * 路由表
 *
 * @type {Object}
 */
let path2Config

/**
 * 获取组件
 *
 * @param {string} name
 * @param {Function} callback
 */
function getComponent(name, callback) {
  let component = name2Component[name]
  if (utils.is.func(component)) {
    let { $pending } = component
    if (!$pending) {
      $pending = component.$pending = [ ]
      component(function (target) {
        utils.array.each(
          $pending,
          function (callback) {
            callback(target)
          }
        )
        name2Component[name] = target
      })
    }
    $pending.push(callback)
  }
  else {
    callback(component)
  }
}

/**
 * 真正执行路由切换操作的函数
 */
function route(name, params, query) {
  getComponent(name, function (component) {
    if (instance) {
      instance.dispose()
    }
    instance = create(
      component,
      utils.object.extend({}, params, query),
    )
  })
}



function onHashChange() {
  let data = parseHash(location.hash.slice(1))
  if (data) {
    let { name } = path2Config[data.path]
    route(name, data.params, data.query)
  }
}

/**
 * 注册组件
 *
 * @param {string} name
 * @param {Object} component
 */
export function register(name, component) {
  if (utils.is.object(name)) {
    utils.object.extend(name2Component, name)
  }
  else {
    name2Component[name] = component
  }
}

/**
 * 配置路由表
 *
 * {
 *     path: {
 *         name: '注册的组件名',
 *         query: { }   // ? 后面跟的参数，表示默认参数
 *     }
 * }
 *
 * @param {Object} map
 */
export function map(map) {
  path2Config = map
}

export function start(el) {
  element = el
  onHashChange()
  window.onhashchange = onHashChange
}

export function stop() {
  element =
  window.onhashchange = null
}

export function install(Yox) {
  utils = Yox.utils
  create = function (component, props) {
    return new Yox(
      utils.object.extend(
        { el: element },
        component,
        {
          props,
        }
      )
    )
  }
}
