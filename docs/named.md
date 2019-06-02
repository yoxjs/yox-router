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

当你需要跳转时，可以给 `o-to` 指令设置一个对象：

```html
<button o-to="{ name: 'user', params: { userId: 123 } }">
  User
</button>
```

这和手动调用 `router.push()` 是一回事：

```js
router.push({
  name: 'user',
  params: { userId: 123 }
})
```

这两种方式都会跳转到 `/user/123`。