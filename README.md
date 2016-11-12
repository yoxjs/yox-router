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

```javascript
// 注册插件
Yox.use(YoxRouter)

// 注册组件
YoxRouter.register({
  index: { },
  login: { },
  register: { }
})

// 配置路由表
YoxRouter.map({
  '/index': {
    name: 'index',
  },
  '/login': {
    name: 'login',
  },
  '/register': {
    name: 'register'
  }
})

// 启动路由
YoxRouter.start(el)

```
