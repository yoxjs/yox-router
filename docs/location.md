当地址栏的 `hash` 发生变化时，Yox Router 会读取 `location.hash` 并进行参数格式化，下面我们通过一个例子演示整个流程。

我们先定义一个动态路由，如下：

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

我们为 `path` 设置了两个 `动态路径参数`：`userId`、`postId`，当 `hash` 为 `#!/user/foo/post/123?test=true`，格式化参数如下：

```js
{
  path: '/user/:userId/post/:postId',
  params: {
    userId: 'foo',
    postId: 123
  },
  query: {
    test: true
  }
}
```

我们发现，`postId` 和 `test` 不是 `string` 类型，而是 `number` 和 `boolean` 类型。

Yox Router 可以识别以下参数类型，如果识别成功，则会自动转型。

* `number`
* `boolean`
* `undefined`
* `null`

路由参数还支持数组，当 `hash` 为 `#!/post?test1=null&test2=undefined&tags[]=1&tags[]=2&tags[]=3`，格式化参数如下：

```js
{
  path: '/post',
  query: {
    test1: null,
    test2: undefined,
    tags: [1, 2, 3]
  }
}
```

我们发现，如果不是动态路由，则没有 `params` 字段。同理，如果没有 `?key=value` 部分，则没有 `query` 字段。

当我们获取到路由参数后，会根据路由的 `path`（动态路由） 和 `component` 对应的组件的 `propTypes`，选择将哪些参数传给组件，如下：

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

通过 `propTypes` 可以知道，`User` 组件只接收 `userId` 和 `postId` 两个参数，就算 `params` 或 `query` 中还有其他参数，`User` 组件也毫不关心。

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