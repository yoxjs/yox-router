(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.YoxRouter = global.YoxRouter || {})));
}(this, (function (exports) { 'use strict';

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();















var get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

















var set = function set(object, property, value, receiver) {
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent !== null) {
      set(parent, property, value, receiver);
    }
  } else if ("value" in desc && desc.writable) {
    desc.value = value;
  } else {
    var setter = desc.set;

    if (setter !== undefined) {
      setter.call(receiver, value);
    }
  }

  return value;
};

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var utils = void 0;
var createComponent = void 0;

var PREFIX_HASH = '!';
var PREFIX_PARAM = ':';
var DIVIDER_PATH = '/';
var DIVIDER_QUERY = '&';

function parseQuery(query) {
  var result = {};
  if (utils.is.string(query)) {
    utils.array.each(query.split(DIVIDER_QUERY), function (item) {
      var _item$split = item.split('='),
          _item$split2 = slicedToArray(_item$split, 2),
          key = _item$split2[0],
          value = _item$split2[1];

      if (key) {
        result[key] = utils.is.string(value) ? decodeURIComponent(value) : true;
      }
    });
  }
  return result;
}

function stringifyQuery(query) {
  var result = [];
  utils.object.each(query, function (value, key) {
    result.push(key + '=' + encodeURIComponent(value));
  });
  return result.join(DIVIDER_QUERY);
}

function parseParams(realpath, path) {

  var result = {};

  var terms = realpath.split(DIVIDER_PATH);
  utils.array.each(path.split(DIVIDER_PATH), function (item, index) {
    if (item.startsWith(PREFIX_PARAM)) {
      result[item.slice(PREFIX_PARAM.length)] = terms[index];
    }
  });

  return result;
}

function getPath(realpath) {

  var result = void 0;

  var terms = realpath.split(DIVIDER_PATH);
  utils.object.each(path2Data, function (config, path) {
    var patterns = path.split(DIVIDER_PATH);
    if (terms.length === patterns.length) {
      utils.array.each(patterns, function (pattern, index) {
        if (!pattern.startsWith(PREFIX_PARAM)) {
          if (pattern !== terms[index]) {
            path = null;
            return false;
          }
        }
      });
      if (path) {
        result = path;
        return false;
      }
    }
  });

  return result;
}

function parseHash(hash) {
  if (hash.startsWith(PREFIX_HASH)) {
    hash = hash.slice(PREFIX_HASH.length);
    var realpath = void 0,
        search = void 0;
    var index = hash.indexOf('?');
    if (index >= 0) {
      realpath = hash.substring(0, index);
      search = hash.slice(index + 1);
    } else {
      realpath = hash;
    }

    var path = getPath(realpath);
    if (path) {
      return {
        path: path,
        realpath: realpath,
        params: parseParams(realpath, path),
        query: parseQuery(search)
      };
    }
  }
}

function stringifyHash(path, params, query) {

  var realpath = [];

  utils.array.each(path.split(DIVIDER_PATH), function (term) {
    realpath.push(term.startsWith(PREFIX_PARAM) ? params[term.slice(1)] : term);
  });

  var hash = realpath.join(DIVIDER_PATH);

  if (query) {
    query = stringifyQuery(query);
    if (query) {
      hash += '?' + query;
    }
  }

  return PREFIX_HASH + hash;
}

var element = void 0;

var currentComponentName = void 0;
var currentComponentConfig = void 0;
var currentComponentInstance = void 0;

var path2Data = {};
var name2Path = {};

var name2Component = {};

function getComponent(name, callback) {
  var component = name2Component[name];
  if (utils.is.func(component)) {
    (function () {
      var $pending = component.$pending;

      if (!$pending) {
        $pending = component.$pending = [];
        component(function (target) {
          utils.array.each($pending, function (callback) {
            callback(target);
          });
          name2Component[name] = target;
        });
      }
      $pending.push(callback);
    })();
  } else {
    callback(component);
  }
}

function setCurrentComponent(name, props, extra) {
  currentComponentName = name;
  getComponent(name, function (component) {
    if (name === currentComponentName) {

      props = utils.object.extend({}, props, extra);

      if (currentComponentInstance && currentComponentConfig === component && !currentComponentInstance.fire(REFRESH_COMPONENT, props)) {
        return;
      }

      if (currentComponentInstance) {
        currentComponentInstance.dispose();
      }
      currentComponentConfig = component;
      currentComponentInstance = createComponent(component, props);
      currentComponentInstance.route = route;
    }
  });
}

function route(data) {
  if (utils.is.string(data)) {
    location.hash = stringifyHash(data);
  } else {
    if (utils.object.has(data, 'component')) {
      setCurrentComponent(data.component, data.props);
    } else {
      location.hash = stringifyHash(name2Path[data.name], data.params, data.query);
    }
  }
}

function onHashChange() {
  var hash = location.hash.slice(1);
  var data = parseHash(hash);

  var component = void 0,
      params = void 0,
      query = void 0;
  if (data) {
    component = path2Data[data.path].component;
    params = data.params;
    query = data.query;
  } else {
    component = hash ? NOT_FOUND : INDEX;
  }

  setCurrentComponent(component, params, query);
}

var INDEX = 'index';

var NOT_FOUND = '404';

var REFRESH_COMPONENT = 'refreshcomponent';

function register(name, component) {
  if (utils.is.object(name)) {
    utils.object.extend(name2Component, name);
  } else {
    name2Component[name] = component;
  }
}

function map(map) {
  var _utils$object = utils.object,
      each = _utils$object.each,
      has = _utils$object.has;

  each(map, function (data, path) {
    if (has(data, 'name')) {
      name2Path[data.name] = path;
    }
    path2Data[path] = data;
  });
}

function start(el) {
  element = el;
  onHashChange();
  window.onhashchange = onHashChange;
}

function stop() {
  element = window.onhashchange = null;
}

function install(Yox) {
  utils = Yox.utils;
  createComponent = function createComponent(component, props) {
    return new Yox(utils.object.extend({
      el: element,
      props: props
    }, component));
  };
}

exports.INDEX = INDEX;
exports.NOT_FOUND = NOT_FOUND;
exports.REFRESH_COMPONENT = REFRESH_COMPONENT;
exports.register = register;
exports.map = map;
exports.start = start;
exports.stop = stop;
exports.install = install;

Object.defineProperty(exports, '__esModule', { value: true });

})));
