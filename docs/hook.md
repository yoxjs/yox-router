## 概念

### 叶子路由

在 **嵌套路由** 小节，我们知道路由是可以不断嵌套的，只要给路由加了 `children` 配置，则意味着着它还有子路由。

如果一个路由没有 `children` 配置，那么它就是 `叶子路由`，只有 `叶子路由` 上的路由钩子才会生效，这一点非常重要。

### 前置路由钩子

以 `before` 开头的路由钩子，称为 `前置路由钩子`，它的函数签名如下：

```js
function (to, from, next) {

}
```

`to` 表示即将前往的地址，`from` 表示当前的地址。

`next` 有点像 `express/koa` 里的中间件，必须调用它流程才能继续往下走，否则会一直停在这。

#### 不拦截

如果你不想拦截本次导航，直接调用 `next()` 即可：

```js
function (to, from, next) {
  next()
}
```

#### 取消本次导航

如果你不想去 `to`，而是想留在 `from`，直接调用 `next(false)` 即可：

```js
function (to, from, next) {
  next(false)
}
```

#### 导航到别的路由

如果你不想去 `to`，而是想导航到别的路由，可以把 `next` 当做 `push` 方法来用，如下：

```js
function (to, from, next) {
  next({
    path: '/user/foo'
  })
}
```

### 后置路由钩子

以 `after` 开头的路由钩子，称为 `后置路由钩子`，它的函数签名如下：

```js
function (to, from) {

}
```

`to` 表示即将前往的地址，`from` 表示当前的地址。

`后置路由钩子` 没有 `next` 参数，它仅用于通知某个事件已经结束了。

### 组件级路由钩子

```js
new YoxRouter.Router({
  routes: [
    {
      path: '/user/:id',
      component: {
        template: '<div>user</div>',
        beforeRouteEnter: function (to, from, next) {
          next()
        },
        afterRouteEnter: function (to, from) {

        },
        beforeRouteUpdate: function (to, from, next) {
          next()
        },
        afterRouteUpdate: function (to, from) {

        },
        beforeRouteLeave: function (to, from, next) {
          next()
        },
        afterRouteLeave: function (to, from) {

        }
      }
    }
  ]
})
```

### 路由级路由钩子

```js
new YoxRouter.Router({
  routes: [
    {
      path: '/user/:id',
      component: {
        template: '<div>user</div>'
      },
      beforeEnter: function (to, from, next) {
        next()
      },
      afterEnter: function (to, from) {

      },
      beforeUpdate: function (to, from, next) {
        next()
      },
      afterUpdate: function (to, from) {

      },
      beforeLeave: function (to, from, next) {
        next()
      },
      afterLeave: function (to, from) {

      }
    }
  ]
})
```

### 路由器级路由钩子

```js
new YoxRouter.Router({
  routes: [
    {
      path: '/user/:id',
      component: {
        template: '<div>user</div>'
      }
    }
  ],
  beforeEnter: function (to, from, next) {
    next()
  },
  afterEnter: function (to, from) {

  },
  beforeUpdate: function (to, from, next) {
    next()
  },
  afterUpdate: function (to, from) {

  },
  beforeLeave: function (to, from, next) {
    next()
  },
  afterLeave: function (to, from) {

  }
})
```

## 流程

当浏览器地址栏发生变化时，Yox Router 会根据 URL 创建一个 `Location` 对象，它的格式如下：

```js
{
  path: '',
  params: {},
  query: {}
}
```

> 详情参考 **路由参数**

### 新旧 Path 不同

如果 `newLocation` 和 `oldLocation` 的 `path` 不同，则会依次触发以下 `前置路由钩子`：

* `oldLeafRoute` 路由组件的 `beforeRouteLeave`
* `oldLeafRoute` 路由的 `beforeLeave`
* `router` 的 `beforeLeave`

如果 Leave `前置路由钩子` 没有进行拦截，则会继续依次触发以下 `前置路由钩子`：

* `newLeafRoute` 的路由组件的 `beforeRouteEnter`
* `newLeafRoute` 路由的 `beforeEnter`
* `router` 的 `beforeEnter`
Update `前置路由钩子` 没有进行拦截，则会销毁旧的路由组件，并创建新的路由组件，然后依次触发以下 `后置路由钩子`：

* `oldLeafRoute` 路由组件的 `afterRouteLeave`UpdateldLeafRoute` 路由的 `afterLeave`
* `router` 的 `afterLeave`
* `newLeafRoute` 的路由组件的 `afterRouteEnter`
* `newLeafRoute` 路由的 `afterELeave
* `router` 的 `afterEnter`

### 新旧 PLeave同

如果 `newLocation` 和 `oldLocation` 的 `path` 相同，则会依次触发以下 `前置路由钩子`：

* `oldLeafRoute` 路由组件的 `beforeRouteUpdate`
* `oldLeafRoute` 路由的 `beforeUpdate`
* `router` 的 `beforeUpdate`

如果 Update `前置路由钩子` 没有进行拦截，则会开始更新路由组件，然后依次触发以下 `后置路由钩子`：

* `oldLeafRoute` 路由组件的 `afterRouteUpdate`
* `oldLeafRoute` 路由的 `afterUpdate`
* `router` 的 `afterUpdate`