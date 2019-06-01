使用 Yox.js + Yox Router 创建单页应用是非常简单的。

我们知道，Yox.js 应用由大大小小的组件组成，当我们把 Yox Router 添加到应用中，需要做的就是把 `组件` 映射到 `路由`，并且告诉 Yox Router 在哪里渲染组件。

我们来看一个简单的例子。

```html
<div id="app"></div>
<script src="https://unpkg.com/yox"></script>
<script src="https://unpkg.com/yox-router"></script>
<script>
  Yox.use(YoxRouter)

  var router = new YoxRouter.Router({
    // 在 #app 元素渲染路由组件
    el: '#app',
    // 路由就是一个路径对应一个组件
    routes: [
      {
        path: '/foo',
        component: {
          template: '<div>foo</div>'
        }
      },
      {
        path: '/bar',
        component: {
          template: '<div>bar</div>'
        }
      }
    ],
    // 当 path 未在 routes 中定义时，跳转到 404 路由
    route404: {
      path: '/404',
      component: {
        template: '<div>not found</div>'
      }
    }
  })

  // 开始监听 hashchange
  router.start()

  // 现在，路由已经启动了

</script>
```

打开这个页面，显示的是 `not found`，我们还没有给 `router` 配置首页，因此自动跳到了 404 路由，我们尝试加一个首页，如下：

```js
router.add([
  {
    path: '/',
    component: {
      template: `
        <div>
          <button o-to="/foo">
            Foo
          </button>
          <button o-to="/bar">
            Bar
          </button>
        </div>
      `
    }
  }
])
```

此时打开这个页面，默认会显示首页，点击 `Foo` 和 `Bar` 按钮，则会跳转到对应的路由。