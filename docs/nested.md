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

通过使用嵌套路由，就可以很简单的表达这种关系。

```js
new YoxRouter.Router({
  routes: [
    {
      path: '/user/:userId',
      component: {
        propTypes: {
          userId: {
            type: 'string'
          }
        },
        // 通过 <RouterView /> 定义子路由组件的渲染出口
        template: `
          <div>
            user id: {{userId}}
            <RouterView />
          </div>
        `
      },
      children: [
        {
          // 当 /user/:userId/profile 匹配成功
          // profile 会被渲染在 User 的 <RouterView> 中
          path: 'profile',
          component: {
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
        },
        {
          // 当 /user/:userId/posts 匹配成功
          // posts 会被渲染在 User 的 <RouterView> 中
          path: 'posts',
          component: {
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
        }
      ]
    }
  ]
})
```