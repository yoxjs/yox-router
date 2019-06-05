当我们需要把多个 `path` 映射到同一个组件，通常要用到动态路由。

举个例子，我们有一个 `User` 组件，不同 `ID` 的用户都要使用这个组件来渲染，我们可以使用 `动态路径参数` 实现这个目的，如下：

```js
new YoxRouter.Router({
  routes: [
    {
      path: '/user/:id',
      component: {
        propTypes: {
          id: {
            type: 'string'
          }
        },
        template: '<div>id: {{id}}</div>'
      }
    }
  ]
})
```

现在，`/user/foo` 和 `/user/bar` 都将渲染到相同的组件，只是传给组件的 `id` 不同而已。

`动态路径参数` 使用 `:` 标记。当一个 `path` 匹配到一个动态路由时，参数会被收集到 `params` 中，如下：

路由 path | 实际 path | params
-|-|-
/user/:id | /user/foo | { id: 'foo' } |
/user/:userId/post/:postId | /user/foo/post/123 | { userId: 'foo', postId: 123 } |

关于如何获取路由参数，请参考 **路由参数**。