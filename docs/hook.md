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

前置路由钩子，也可以理解为路由守卫，你可以取消此次导航，也可以导航到其他路由，无论如何，最后一定要调用 `next`，否则流程会中断。

#### 不拦截

如果你不想拦截本次导航，直接调用 `next()` 即可：

```js
function (to, from, next) {
  next()
}
```

### 取消本次导航

如果你不想去 `to`，而是想留在 `from`，直接调用 `next(false)` 即可：

```js
function (to, from, next) {
  next(false)
}
```

### 导航到别的路由

如果你不想去 `to`，而是想导航到别的路由，可以把 `next` 当做 `push` 方法来用，如下：

```js
function (to, from, next) {
  next({
    path: '/user/foo'
  })
}
```

这个特性非常有用，比如我们常见的 `重定向` 就可以通过 `next` 实现。

### 后置路由钩子

以 `after` 开头的路由钩子，称为 `后置路由钩子`，它的函数签名如下：

```js
function (to, from) {

}
```

`to` 表示即将前往的地址，`from` 表示当前的地址。

`后置路由钩子` 没有 `next` 参数，它仅用于通知某个事件已经结束了。

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

如果 Leave `前置路由钩子` 没有进行拦截，则会继续触发以下 `前置路由钩子`：

* `newLeafRoute` 的路由组件的 `beforeRouteEnter`
* `newLeafRoute` 路由的 `beforeEnter`
* `router` 的 `beforeEnter`

如果 Enter `前置路由钩子` 没有进行拦截，则会销毁旧的路由组件，并创建新的路由组件，然后触发以下 `后置路由钩子`：

* `oldLeafRoute` 路由组件的 `afterRouteLeave`
* `oldLeafRoute` 路由的 `afterLeave`
* `router` 的 `afterLeave`
* `newLeafRoute` 的路由组件的 `afterRouteEnter`
* `newLeafRoute` 路由的 `afterEnter`
* `router` 的 `afterEnter`

### 新旧 Path 相同

如果 `newLocation` 和 `oldLocation` 的 `path` 相同，则会依次触发以下 `前置路由钩子`：

* `oldLeafRoute` 路由组件的 `beforeRouteUpdate`
* `oldLeafRoute` 路由的 `beforeUpdate`
* `router` 的 `beforeUpdate`

如果 Update `前置路由钩子` 没有进行拦截，则会开始更新路由组件，然后触发以下 `后置路由钩子`：

* `oldLeafRoute` 路由组件的 `afterRouteUpdate`
* `oldLeafRoute` 路由的 `afterUpdate`
* `router` 的 `afterUpdate`