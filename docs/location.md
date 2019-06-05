当 URL 发生变化时，Yox Router 会读取 URL 并进行参数格式化，下面我们通过一个例子演示整个流程。

首先，我们定义一个动态路由，如下：

```js
new YoxRouter.Router({
  routes: [
    {
      path: '/user/:userId/post/:postId',
      component: {
        template: '<div>user</div>'
      }
    }
  ]
})
```

我们为 `path` 设置了两个 `动态路径参数`：`userId`、`postId`，当 URL 为 `/user/foo/post/123?test=true`，格式化参数如下：

```js
{
  // 源 URL
  url: '/user/foo/post/123?test=true',
  // 匹配到的路由 path
  path: '/user/:userId/post/:postId',
  // 动态路由的参数
  params: {
    userId: 'foo',
    postId: 123
  },
  // 查询参数
  query: {
    test: true
  }
}
```

我们发现，`postId` 和 `test` 不是 `string` 类型，而是 `number` 和 `boolean` 类型。

Yox Router 支持识别以下参数类型，如果识别成功，则会自动转型。

* `number`
* `boolean`
* `undefined`
* `null`

路由参数还支持数组，当 URL 为 `/user/profile?test1=null&test2=undefined&tags[]=1&tags[]=2&tags[]=3`，格式化参数如下：

```js
{
  url: '/user/profile?test1=null&test2=undefined&tags[]=1&tags[]=2&tags[]=3',
  path: '/user/profile',
  query: {
    test1: null,
    test2: undefined,
    tags: [1, 2, 3]
  }
}
```

我们发现，如果不是动态路由，则没有 `params` 字段。同理，如果没有 `?key=value` 部分，则没有 `query` 字段。

综上，我们可以得出以下结论：

* 对于动态路由来说，路由参数来自 `params` 和 `query`
* 对于非动态路由来说，路由参数只来自 `query`

路由参数确定下来之后，我们怎么把它传给路由组件呢？这完全取决于路由组件的 `propTypes`。

我们知道，`propTypes` 用于组件的[数据校验](https://yoxjs.github.io/yox/#/component?id=%e6%95%b0%e6%8d%ae%e6%a0%a1%e9%aa%8c)，在 Yox Router 中，它又多了一个角色，就是定义路由组件需要哪些路由参数，如下：

```js
const User = {
  propTypes: {
    userId: {
      type: 'string'
    },
    postId: {
      type: 'string'
    }
  },
  template: `
    <div>
      userId: {{userId}}<br>
      postId: {{postId}}
    </div>
  `
}
new YoxRouter.Router({
  routes: [
    {
      path: '/user/:userId/post/:postId',
      component: User
    }
  ]
})
```

通过 `propTypes` 可以知道，`User` 组件需要 `userId` 和 `postId` 两个路由参数，就算 `params` 或 `query` 中还有其他参数，`User` 组件也毫不关心。

如果你对 `query` 中的参数同样感兴趣，也可以把它加入到 `propTypes` 中，如下：

```js
{
  userId: {
    type: 'string'
  },
  postId: {
    type: 'string'
  },
  test: {
    type: 'boolean'
  }
}
```

记住，只有在 `propTypes` 指定了接收哪些参数，Yox Router 才会传入哪些参数，它不会传入你不需要的参数，这样会带来两个好处：

* 传入的参数符合开发者的预期，更符合工程化的要求
* 传入的参数不会无端覆盖组件 `data` 定义的数据

通过 `propTypes` 获取参数是更组件化的方式，这样的组件和 Yox Router 完全解耦，非常优雅。

当然，如果你需要获取完整的路由参数，也可以通过组件实例的 `$router` 属性，如下：

```js
this.$router.location
```

Yox Router 会为每个路由组件自动注入 `$router`，它表示当前的 `YoxRouter.Router` 实例。