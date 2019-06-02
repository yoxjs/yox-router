相比使用 `path`，通过 `name` 来标识一个路由显得更方便一些。

你可以在初始化 Router 实例时，在 `routes` 配置中给某个路由设置名称，如下：

```js
new YoxRouter.Router({
  routes: [
    {
      path: '/user/:userId',
      name: 'user',
      component: User
    }
  ]
})
```

当你需要导航到其他路由时，可以给 `o-push` 或 `o-replace` 指令设置一个对象：

```html
<button o-push="{ name: 'user', params: { userId: 123 } }">
  User
</button>
```
