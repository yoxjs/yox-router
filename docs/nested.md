真实项目中的界面，通常由多层嵌套的组件组合而成，如下：

```
/user/foo/profile                     /user/foo/posts
+------------------+                  +-----------------+
| User             |                  | User            |
| +--------------+ |                  | +-------------+ |
| | Profile      | |  +------------>  | | Posts       | |
| |              | |                  | |             | |
| +--------------+ |                  | +-------------+ |
+------------------+                  +-----------------+
```

`/user/foo` 确定当前用户是 `foo`，内容区域显示什么组件，却取决于后面的 `profile` 或 `posts`。

通过使用嵌套路由，就可以很简单的表达这种关系，如下：

```js
var User = {
  propTypes: {
    userId: {
      type: 'string'
    }
  },
  // <router-view /> 用于指定 children 中的路由组件的渲染出口
  template: `
    <div>
      user id: {{userId}}
      <router-view />
    </div>
  `
}
var UserProfile = {
  propTypes: {
    userId: {
      type: 'string'
    }
  },
  template: `
    <div>
      user profile: {{userId}}
    </div>
  `
}
var UserPosts = {
  propTypes: {
    userId: {
      type: 'string'
    }
  },
  template: `
    <div>
      user posts: {{userId}}
    </div>
  `
}
new YoxRouter.Router({
  routes: [
    {
      path: '/user/:userId',
      component: User,
      children: [
        {
          // 当 /user/:userId/profile 匹配成功
          // profile 会被渲染在 User 的 <router-view /> 中
          path: 'profile',
          component: UserProfile
        },
        {
          // 当 /user/:userId/posts 匹配成功
          // posts 会被渲染在 User 的 <router-view /> 中
          path: 'posts',
          component: UserPosts
        }
      ]
    }
  ],
  route404: {
    path: '/404',
    component: {
      template: '<div>not found</div>'
    }
  }
})
```

`<router-view />` 是为 `嵌套路由` 服务的，它表示此处将渲染一个子路由组件。

> 如果没有子路由，则无需使用 `<router-view />`

嵌套路由对层级数量没有限制，你只需要记住，当你需要子路由时，首先应在当前路由组件的模板中添加一个 `<router-view />`，然后再通过 `children` 定义子路由。

回到这个例子，当你访问 `/user/foo`，发现跳转到了 404，很奇怪对不对，`/user/foo` 明显符合 `/user/:userId` 的格式要求，为什么不渲染它呢？

当我们使用嵌套路由时，真正有意义的路由只有 `叶子` 路由，也就是没有 `children` 的路由，包含 `children` 的路由扮演了承上启下的角色，毕竟它的组件模板里存在一个 `<router-view />`，如果不能渲染子路由组件，那该怎么处理这个 `<router-view />` 呢？

因此，我们推荐为 `children` 加一个 `path` 为空的子路由，如下：

```js
new YoxRouter.Router({
  routes: [
    {
      path: '/user/:userId',
      component: User,
      children: [
        {
          // 当 /user/:userId 匹配成功
          // home 会被渲染在 User 的 <router-view /> 中
          path: '',
          component: UserHome
        },
        // ...其他子路由
      ]
    }
  ]
})
```