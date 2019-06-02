路由导航有以下两种方式：

* 编程式导航
* 指令式导航

## 编程式导航

我们先来看编程式导航，因为 `指令式导航` 是根据编程式导航而来的。

Yox Router 会为每个路由组件自动注入 `$router`，它表示当前的 `YoxRouter.Router` 实例，因此你可以调用它的三个方法进行导航。

### router.push(target)

`push` 方法会向 history 栈添加一个新的记录，所以，当用户点击浏览器后退按钮时，则回到之前的 URL。

该方法的参数可以是一个 `path`，或者一个描述地址的对象，如下：

```js
// path
router.push('/home')

// 对象
router.push({ path: '/home' })

// 命名路由
router.push({ name: 'user' })

// 带查询参数，变成 /register?plan=private
router.push({ path: '/register', query: { plan: 'private' } })

```

如果想导航到一个动态路由，有 4 种方式可供选择，如下：

```js
{
  path: '/user/:userId',
  name: 'user',
  component: User
}
```

```js
// 以下 4 种方式都会导航到 /user/123
router.push({ name: '/user', params: { userId: 123 } })
router.push({ path: '/user/:userId', params: { userId: 123 } })
router.push({ path: '/user/123' })
router.push('/user/123')
```

### router.replace(target)

`replace()` 方法和 `push()` 方法类似，唯一的不同是，它不会修改地址栏 URL。

### router.go(n)

`go()` 方法的参数是一个整数，意思是在 history 记录中向前或者后退多少步，类似 `window.history.go(n)`。

```js
// 在浏览器记录中前进一步
router.go(1)

// 后退一步记录
router.go(-1)

// 前进 3 步记录
router.go(3)

// 如果 history 记录不够用，那就默默地失败呗
router.go(-100)
router.go(100)
```

## 指令式导航

根据前面介绍的 `编程式导航`，我们提供了两个导航指令：`push` 和 `replace`，如下：

```html
<div>
  <button o-push="/user/foo">
    User Foo
  </button>
  <button o-replace="{ path: '/user/bar' }">
    User Bar
  </button>
</div>
```



