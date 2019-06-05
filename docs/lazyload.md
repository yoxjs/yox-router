在项目开发过程中，我们应该按功能拆分模块，大致如下：

```
src/
  - user/
  - game/
  - pay/
```

每个模块负责规则自己内部的路由，并对外暴露一个路由配置，我们以 `user` 为例：

```js
export default {
  path: '/user',
  component: User,
  children: [
    {
      path: 'profile',
      component: UserProfile
    },
    {
      path: 'posts',
      component: UserPosts
    }
  ]
}
```

`user` 模块提供了两个路由：`/user/profile` 和 `/user/posts`。

对于整个项目来说，我们只需要知道有一个 `user` 模块，并不需要知道它的细节。

更重要的是，默认打开的首页不会加载 `user` 模块，而是等到用户导航到 `user` 才开始加载 `user` 模块的代码，这就是所谓的 `路由懒加载`。

> `路由懒加载` 的好处不言而喻，它可以编译出更小的代码包，确保更快的访问速度。

为项目添加路由懒加载非常简单，只需要配置一个 `path` 和 `load` 即可，`path` 用于前缀匹配，也就是说，只要 URL 以 `path` 开头就会自动加载路由，如下：

```js
new YoxRouter.Router({
  routes: [
    {
      path: '/user',
      load: function (callback) {
        // 路由加载成功后，把路由传入 callback 即可
        require(['./user/route'], callback)
      }
    }
  ]
})
```


