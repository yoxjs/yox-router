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
4. `pushState` 的优势，一个是 url 美观，一个是可保持滚动位置，我觉得这两个都不是刚需，可留作以后升级

```javascript
// 注册组件
// 支持异步组件，参考下面的 `asyncComponent`
YoxRouter.register({
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

// 创建路由实例
var router = new YoxRouter()

// 配置路由表
// 如果希望跳转时携带参数，必须要配置 name
// 如果是 url 变化触发的跳转（非手动调用），可配置默认的 params 和 query
router.map({
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
router.start(el)
// 停止路由
router.stop()

```

## 组件接收的路由参数

路由参数，包括 `params` 和 `query` 会统一混入到组件的 `data` 中。

## 组件手动跳转

我们为路由中的组件实例添加了 `$router` 属性，用法如下：

触发 url 变化

```javascript
// 如果没有参数，可直接传入 path
this.$router.go('/index')
// 如果有参数，则必须确保配置了 name
this.$router.go({
  name: 'index',
  params: { },
  query: { }
})
```

不触发 url 变化

```javascript
this.$router.go({
  component: 'index',
  props: { },
})
```
