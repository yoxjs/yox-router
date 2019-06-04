重定向也是通过 routes 配置来完成，下面的例子是从 `/a` 重定向到 `/b`：

```js
new YoxRouter.Router({
  routes: [
    {
      path: '/a',
      component: Component,
      redirect: '/b'
    }
  ]
})
```