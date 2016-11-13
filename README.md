# yox-router

## Install

NPM

```shell
npm install yox-router
```

CDN

```html
<script src="https://unpkg.com/yox-router@latest"></script>
```

## Usage

基于 `hashchange` 机制设计，未采用 pushState 有以下几个考虑：

1. 尽快出活，减少折腾
2. hashchange 能利用浏览器 `history` 提供的一系列方法，省掉了自己去实现 `push`、`pop` 的时间和代码量
3. hashchange 兼容性好，减少出问题的概率，就算出了问题也好排查

```javascript
// 注册插件
Yox.use(YoxRouter)

// 注册组件
// 有两个特殊组件
// 当没有 hash 时，会去找名为 `index` 的组件
// 当有 hash 但是没有对应的路由时，会去找 `404` 组件
// 这两个名字可以通过 YoxRouter.INDEX 和 YoxRouter.NOT_FOUND 进行配置
YoxRouter.register({
  index: { },
  login: { },
  register: { },
  asyncComponent: function (resolve) {
    setTimeout(
      function () {
        resolve({ })
      },
      1000
    )
  }
})

// 配置路由表
// 如果希望跳转时携带参数，必须要配置 name
// 如果是 url 变化触发的跳转（非手动调用），可配置默认传入的 params 和 query
YoxRouter.map({
  '/index/:userId': {
    name: 'index',
    component: 'index',
    params: {
      userId: ''
    },
    query: {
      userName: ''
    }
  },
  '/login': {
    component: 'login',
  },
  '/register': {
    component: 'register'
  }
})

// 启动路由
YoxRouter.start(el)
// 停止路由
YoxRouter.stop()

```

## 组件接收的路由参数

路由参数，包括 `params` 和 `query` 会统一混入到组件的 `data` 中。

## 组件手动跳转

我们为路由中的组件实例添加了 `route()` 方法，用法如下：

触发 URL 变化

```javascript
// 如果没有参数，可直接传入 path
this.route('/index')
// 如果有参数，则必须确保配置了 name
this.route({
  name: 'index',
  params: { },
  query: { }
})
```

不触发 URL 变化

```javascript
this.route({
  component: 'index',
  props: { },
})
```
