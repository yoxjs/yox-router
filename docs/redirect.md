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

`redirect` 配置和 `push` 方法的参数值相同。

此外，你还可以设置一个函数，动态返回重定向目标：

```js
new YoxRouter.Router({
  routes: [
    {
      path: '/a',
      component: Component,
      redirect: function (to) {
        // return 重定向的 字符串路径/路径对象
      }
    }
  ]
})
```
