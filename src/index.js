
let utils
let createComponent

// hash 前缀，Google 的规范是 #! 开头，如 #!/path/sub?key=value
const PREFIX_HASH = '!'
// path 中的参数前缀，如 #!/user/:userId
const PREFIX_PARAM = ':'
// path 分隔符
const DIVIDER_PATH = '/'
// query 分隔符
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
          value = utils.is.string(value)
            ? decodeURIComponent(value)
            : true
          if (key.endsWith('[]')) {
            let array = result[key] || (result[key] = [ ])
            array.push(value)
          }
          else {
            result[key] = value
          }
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
      if (utils.is.array(value)) {
        utils.array.each(
          value,
          function (value) {
            result.push(
              `${key}[]=${encodeURIComponent(value)}`
            )
          }
        )
      }
      else {
        result.push(
          `${key}=${encodeURIComponent(value)}`
        )
      }
    }
  )
  return result.join(DIVIDER_QUERY)
}

/**
 * 解析 path 中的参数
 *
 * @param {string} realpath 真实的路径
 * @param {string} path 配置的路径
 * @return {Object}
 */
function parseParams(realpath, path) {

  let result = { }

  let realpathTerms = realpath.split(DIVIDER_PATH)
  let pathTerms = path.split(DIVIDER_PATH)

  if (realpathTerms.length === pathTerms.length) {
    utils.array.each(
      pathTerms,
      function (item, index) {
        if (item.startsWith(PREFIX_PARAM)) {
          result[item.slice(PREFIX_PARAM.length)] = realpathTerms[index]
        }
      }
    )
  }

  return result

}

/**
 * 通过 realpath 获取配置的 path
 *
 * @param {string} realpath
 * @return {string}
 */
function getPathByRealpath(realpath) {

  let result

  let realpathTerms = realpath.split(DIVIDER_PATH)
  utils.object.each(
    path2Data,
    function (config, path) {
      let pathTerms = path.split(DIVIDER_PATH)
      if (realpathTerms.length === pathTerms.length) {
        utils.array.each(
          pathTerms,
          function (item, index) {
            // 非参数段不相同
            if (!item.startsWith(PREFIX_PARAM) && item !== realpathTerms[index]) {
              path = null
              return false
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

    let path = getPathByRealpath(realpath)
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

/**
 * 把结构化数据序列化成 hash
 *
 * @param {string} path
 * @param {Object} params
 * @param {Object} query
 * @return {string}
 */
function stringifyHash(path, params, query) {

  let realpath = [ ], search = ''

  utils.array.each(
    path.split(DIVIDER_PATH),
    function (item) {
      realpath.push(
        item.startsWith(PREFIX_PARAM)
        ? params[item.slice(PREFIX_PARAM.length)]
        : item
      )
    }
  )

  realpath = realpath.join(DIVIDER_PATH)

  if (query) {
    query = stringifyQuery(query)
    if (query) {
      search = '?' + query
    }
  }

  return PREFIX_HASH + realpath + search

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
 * 获取配置的组件，支持异步获取
 *
 * @param {string} name
 * @param {Function} callback
 */
function getComponent(name, callback) {
  let { func, object } = utils.is
  let component = name2Component[name]
  if (func(component)) {
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
  else if (object(component)) {
    callback(component)
  }
}


/**
 * 设置当前组件
 *
 * @param {string} name
 * @param {?Object} props
 * @param {?Object} extra
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
 * @type {string}
 */
export const REFRESH_COMPONENT = 'refreshcomponent'

/**
 * 导航钩子
 *
 * @type {string}
 */
export const BEFORE_ROUTE_ENTER = 'beforerouteenter'
export const AFTER_ROUTE_ENTER = 'afterrouteenter'
export const BEFORE_ROUTE_LEAVE = 'beforerouteleave'
export const AFTER_ROUTE_LEAVE = 'afterrouteleave'

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

// 如果全局环境已有 Yox，自动安装
if (typeof Yox !== 'undefined' && Yox.version) {
  install(Yox)
}
