
let utils
let createComponent

const PREFIX_HASH = '!'
const PREFIX_PARAM = ':'
const DIVIDER_PATH = '/'
const DIVIDER_QUERY = '&'

/**
 * 把 GET 参数解析成对象
 *
 * @param {string} query
 * @return {Object}
 */
function parseQuery(query) {
  let result = { }
  if (utils.is.string(query)) {
    utils.array.each(
      query.split(DIVIDER_QUERY),
      function (item) {
        let [ key, value ] = item.split('=')
        if (key) {
          result[key] = utils.is.string(value)
            ? decodeURIComponent(value)
            : true
        }
      }
    )
  }
  return result
}

/**
 * 把对象解析成 key1=value1&key2=value2
 *
 * @param {Object} query
 * @return {string}
 */
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
  return result.join(DIVIDER_QUERY)
}

/**
 * 解析 path 中的参数
 *
 * @param {string} realpath
 * @param {string} path
 * @return {Object}
 */
function parseParams(realpath, path) {

  let result = { }

  let terms = realpath.split(DIVIDER_PATH)
  utils.array.each(
    path.split(DIVIDER_PATH),
    function (item, index) {
      if (item.startsWith(PREFIX_PARAM)) {
        result[item.slice(PREFIX_PARAM.length)] = terms[index]
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

  let terms = realpath.split(DIVIDER_PATH)
  utils.object.each(
    path2Data,
    function (config, path) {
      let patterns = path.split(DIVIDER_PATH)
      if (terms.length === patterns.length) {
        utils.array.each(
          patterns,
          function (pattern, index) {
            if (!pattern.startsWith(PREFIX_PARAM)) {
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
  if (hash.startsWith(PREFIX_HASH)) {
    hash = hash.slice(PREFIX_HASH.length)
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
    path.split(DIVIDER_PATH),
    function (term) {
      realpath.push(
        term.startsWith(PREFIX_PARAM)
        ? params[term.slice(1)]
        : term
      )
    }
  )

  let hash = realpath.join(DIVIDER_PATH)

  if (query) {
    query = stringifyQuery(query)
    if (query) {
      hash += `?${query}`
    }
  }

  return PREFIX_HASH + hash

}


/**
 * 响应路由变化的元素
 *
 * @type {HTMLElement}
 */
let element

/**
 * 当前组件
 */
let currentComponentName
let currentComponentConfig
let currentComponentInstance

/**
 * 路由表
 *
 * @type {Object}
 */
let path2Data = { }
let name2Path = { }

/**
 * 已注册的组件，name -> component
 *
 * @type {Object}
 */
let name2Component = { }

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
 * 设置当前组件
 *
 * @param {string} name
 * @param {?Object} props
 */
function setCurrentComponent(name, props, extra) {
  currentComponentName = name
  getComponent(
    name,
    function (component) {
      if (name === currentComponentName) {

        props = utils.object.extend({ }, props, extra)

        // 发事件给组件，该干嘛干嘛，不想干嘛就让后面的代码继续干嘛
        if (currentComponentInstance
          && currentComponentConfig === component
          && currentComponentInstance.fire(REFRESH_COMPONENT, props)
        ) {
          return
        }

        if (currentComponentInstance) {
          currentComponentInstance.dispose()
        }
        currentComponentConfig = component
        currentComponentInstance = createComponent(component, props)
        currentComponentInstance.route = route
      }
    }
  )
}

/**
 * 真正执行路由切换操作的函数
 *
 * data 有 2 种格式：
 *
 * 1. 会修改 url
 *
 * 如果只是简单的 path，直接传字符串
 *
 * route('/index')
 *
 * 如果需要带参数，切记路由表要配置 name
 *
 * route({
 *   name: 'index',
 *   params: { },
 *   query: { }
 * })
 *
 * 如果没有任何参数，可以只传 path
 *
 * route('/index')
 *
 * 2. 不会改变 url
 *
 * route({
 *   component: 'index',
 *   props: { }
 * })
 *
 */
function route(data) {
  if (utils.is.string(data)) {
    location.hash = stringifyHash(data)
  }
  else {
    if (utils.object.has(data, 'component')) {
      setCurrentComponent(
        data.component,
        data.props
      )
    }
    else {
      location.hash = stringifyHash(name2Path[data.name], data.params, data.query)
    }
  }
}

function onHashChange() {
  let hash = location.hash.slice(1)
  let data = parseHash(hash)

  let component, params, query
  if (data) {
    component = path2Data[data.path].component
    params = data.params
    query = data.query
  }
  else {
    component = hash ? NOT_FOUND : INDEX
  }

  setCurrentComponent(component, params, query)

}

/**
 * 首页组件名称
 *
 * @type {string}
 */
export const INDEX = 'index'

/**
 * 404 组件名称
 *
 * @type {string}
 */
export const NOT_FOUND = '404'

/**
 * 如果相继路由到的是同一个组件，那么会优先触发该组件实例的一个 refresh 事件
 *
 * @type {String}
 */
export const REFRESH_COMPONENT = 'refreshcomponent'

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
 * @param {Object} map
 */
export function map(map) {
  let { each, has } = utils.object
  each(
    map,
    function (data, path) {
      if (has(data, 'name')) {
        name2Path[data.name] = path
      }
      path2Data[path] = data
    }
  )
}

/**
 * 启动路由
 *
 * @param {HTMLElement} el
 */
export function start(el) {
  element = el
  onHashChange()
  window.onhashchange = onHashChange
}

/**
 * 停止路由
 */
export function stop() {
  element =
  window.onhashchange = null
}

export function install(Yox) {
  utils = Yox.utils
  createComponent = function (component, props) {
    return new Yox(
      utils.object.extend(
        {
          el: element,
          props,
        },
        component
      )
    )
  }
}
