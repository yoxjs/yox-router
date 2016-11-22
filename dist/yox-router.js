(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.YoxRouter = factory());
}(this, (function () { 'use strict';

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





var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
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

var is = void 0;
var array = void 0;
var object = void 0;
var native = void 0;
var Component = void 0;

var PREFIX_HASH = '#!';

var PREFIX_PARAM = ':';

var DIVIDER_PATH = '/';

var DIVIDER_QUERY = '&';

var HASH_CHANGE = 'hashchange';

function parseQuery(query) {
  var result = {};
  if (is.string(query)) {
    array.each(query.split(DIVIDER_QUERY), function (item) {
      var _item$split = item.split('='),
          _item$split2 = slicedToArray(_item$split, 2),
          key = _item$split2[0],
          value = _item$split2[1];

      if (key) {
        value = is.string(value) ? decodeURIComponent(value) : true;
        if (key.endsWith('[]')) {
          (result[key] || (result[key] = [])).push(value);
        } else {
          result[key] = value;
        }
      }
    });
  }
  return result;
}

function stringifyQuery(query) {
  var result = [];
  object.each(query, function (value, key) {
    if (is.array(value)) {
      array.each(value, function (value) {
        result.push(key + '[]=' + encodeURIComponent(value));
      });
    } else {
      result.push(key + '=' + encodeURIComponent(value));
    }
  });
  return result.join(DIVIDER_QUERY);
}

function parseParams(realpath, path) {

  var result = {};

  var realpathTerms = realpath.split(DIVIDER_PATH);
  var pathTerms = path.split(DIVIDER_PATH);

  if (realpathTerms.length === pathTerms.length) {
    array.each(pathTerms, function (item, index) {
      if (item.startsWith(PREFIX_PARAM)) {
        result[item.slice(PREFIX_PARAM.length)] = realpathTerms[index];
      }
    });
  }

  return result;
}

function getPathByRealpath(path2Route, realpath) {

  var result = void 0;

  var realpathTerms = realpath.split(DIVIDER_PATH);
  object.each(path2Route, function (config, path) {
    var pathTerms = path.split(DIVIDER_PATH);
    if (realpathTerms.length === pathTerms.length) {
      array.each(pathTerms, function (item, index) {
        if (!item.startsWith(PREFIX_PARAM) && item !== realpathTerms[index]) {
          path = null;
          return false;
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

function parseHash(path2Route, hash) {
  var realpath = void 0,
      search = void 0;
  var index = hash.indexOf('?');
  if (index >= 0) {
    realpath = hash.substring(0, index);
    search = hash.slice(index + 1);
  } else {
    realpath = hash;
  }

  var path = getPathByRealpath(path2Route, realpath);
  if (path) {
    return {
      path: path,
      realpath: realpath,
      params: parseParams(realpath, path),
      query: parseQuery(search)
    };
  }
}

function stringifyHash(path, params, query) {

  var realpath = [],
      search = '';

  array.each(path.split(DIVIDER_PATH), function (item) {
    realpath.push(item.startsWith(PREFIX_PARAM) ? params[item.slice(PREFIX_PARAM.length)] : item);
  });

  realpath = realpath.join(DIVIDER_PATH);

  if (query) {
    query = stringifyQuery(query);
    if (query) {
      search = '?' + query;
    }
  }

  return PREFIX_HASH + realpath + search;
}

function getComponent(name, callback) {
  var _is = is,
      func = _is.func,
      object = _is.object;

  var component = name2Component[name];
  if (func(component)) {
    (function () {
      var $pending = component.$pending;

      if (!$pending) {
        $pending = component.$pending = [];
        component(function (target) {
          array.each($pending, function (callback) {
            callback(target);
          });
          name2Component[name] = target;
        });
      }
      $pending.push(callback);
    })();
  } else if (object(component)) {
    callback(component);
  }
}

var Chain = function () {
  function Chain() {
    classCallCheck(this, Chain);

    this.list = [];
  }

  createClass(Chain, [{
    key: 'use',
    value: function use(item) {
      if (is.func(item)) {
        this.list.push(item);
      }
    }
  }, {
    key: 'run',
    value: function run(context, to, from, success, failure) {
      var list = this.list;

      var i = -1;
      var next = function next(value) {
        if (value == null) {
          i++;
          if (list[i]) {
            list[i].call(context, to, from, next);
          } else if (success) {
            success();
          }
        } else if (failure) {
          failure(value);
        }
      };
      next();
    }
  }]);
  return Chain;
}();

var Router = function () {
  function Router() {
    classCallCheck(this, Router);

    this.name2Path = {};

    this.path2Route = {};
  }

  createClass(Router, [{
    key: 'map',
    value: function map(routes) {
      var name2Path = this.name2Path,
          path2Route = this.path2Route;
      var _object = object,
          each = _object.each,
          has = _object.has;

      each(routes, function (data, path) {
        if (has(data, 'name')) {
          name2Path[data.name] = path;
        }
        path2Route[path] = data;
      });
    }
  }, {
    key: 'go',
    value: function go(data) {
      if (is.string(data)) {
        location.hash = stringifyHash(data);
      } else if (is.object(data)) {
        if (object.has(data, 'component')) {
          this.setComponent(data.component, data.props);
        } else if (object.has(data, 'name')) {
          location.hash = stringifyHash(this.name2Path[data.name], data.params, data.query);
        }
      }
    }
  }, {
    key: 'handleHashChange',
    value: function handleHashChange() {

      var instance = this;
      var path2Route = instance.path2Route;
      var _location = location,
          hash = _location.hash;

      hash = hash.startsWith(PREFIX_HASH) ? hash.slice(PREFIX_HASH.length) : '';

      var data = parseHash(path2Route, hash);
      if (data) {
        var path = data.path,
            params = data.params,
            query = data.query;

        this.setComponent(path, params, query);
      } else {
        var hook = hash ? Router.HOOK_NOT_FOUND : Router.HOOK_INDEX;
        if (instance[hook]) {
          instance[hook]();
        }
      }
    }
  }, {
    key: 'setComponent',
    value: function setComponent() {

      var instance = this;

      var path2Route = instance.path2Route,
          componentConfig = instance.componentConfig,
          componentInstance = instance.componentInstance;


      var args = arguments,
          component = void 0,
          props = void 0,
          path = void 0,
          params = void 0,
          query = void 0,
          route = void 0;

      if (args[2]) {
        path = args[0];
        params = args[1];
        query = args[2];
        route = path2Route[path];
        component = route.component;
      } else {
        component = args[0];
        props = args[1];
      }

      var current = {
        component: instance.component,
        props: instance.props,
        path: instance.path,
        params: instance.params,
        query: instance.query
      };
      var next = { component: component, props: props, path: path, params: params, query: query };

      var failure = function failure(value) {
        if (value === false) {
          if (current.path) {
            location.hash = stringifyHash(current.path, current.params, current.query);
          }
        } else {
          instance.go(value);
        }
      };

      var callHook = function callHook(name, success, failure) {
        var chain = new Chain();
        chain.use(componentConfig && componentConfig[name]);
        chain.use(route && route[name]);
        chain.use(instance && instance[name]);
        chain.run(componentInstance, next, current, success, failure);
      };

      var createComponent = function createComponent(component) {
        componentConfig = component;
        callHook(Router.HOOK_BEFORE_ENTER, function () {

          if (params || query) {
            props = object.extend({}, params, query);
          }

          componentInstance = new Component(object.extend({
            el: instance.el,
            props: props,
            extensions: {
              $router: instance
            }
          }, component));

          callHook(Router.HOOK_AFTER_ENTER);

          object.extend(instance, next);
          instance.componentConfig = componentConfig;
          instance.componentInstance = componentInstance;
        }, failure);
      };

      var changeComponent = function changeComponent(component) {
        callHook(Router.HOOK_BEFORE_LEAVE, function () {
          componentInstance.dispose();
          componentInstance = null;
          callHook(Router.HOOK_AFTER_LEAVE);
          createComponent(component);
        }, failure);
      };

      instance.componentName = component;

      getComponent(component, function (componentConf) {
        if (component === instance.componentName) {
          if (componentInstance) {
            if (componentConfig === componentConf) {
              callHook(Router.HOOK_REFRESH, function () {
                changeComponent(componentConf);
              }, function () {
                object.extend(instance, next);
              });
            } else {
              changeComponent(componentConf);
            }
          } else {
            createComponent(componentConf);
          }
        }
      });
    }
  }, {
    key: 'start',
    value: function start(el) {
      if (is.string(el)) {
        el = native.find(el);
      }
      this.el = el;
      this.handleHashChange();
      native.on(window, HASH_CHANGE, this.handleHashChange, this);
    }
  }, {
    key: 'stop',
    value: function stop() {
      this.el = null;
      native.off(window, HASH_CHANGE, this.handleHashChange);
    }
  }]);
  return Router;
}();

var name2Component = {};

Router.HOOK_INDEX = 'index';

Router.HOOK_NOT_FOUND = 'notFound';

Router.HOOK_REFRESH = 'refresh';

Router.HOOK_BEFORE_ENTER = 'beforeEnter';

Router.HOOK_AFTER_ENTER = 'afterEnter';

Router.HOOK_BEFORE_LEAVE = 'beforeLeave';

Router.HOOK_AFTER_LEAVE = 'afterLeave';

Router.register = function (name, component) {
  if (is.object(name)) {
    object.extend(name2Component, name);
  } else {
    name2Component[name] = component;
  }
};

Router.install = function (Yox) {
  Component = Yox;
  var _Component = Component,
      utils = _Component.utils;

  is = utils.is;
  array = utils.array;
  object = utils.object;
  native = utils.native;
};

if (typeof Yox !== 'undefined' && Yox.use) {
  Yox.use(Router);
}

return Router;

})));
