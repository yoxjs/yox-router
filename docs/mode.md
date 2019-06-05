
## hash 模式

Yox Router 默认使用 `hash` 模式。

如果浏览器不支持 `history` 模式，即使设置为 `history` 模式，也会 fallback 到  `hash` 模式。

## history 模式

如果你觉得 `hash` 模式的 URL 很丑，也可以使用 `history` 模式，如下：

```js
new YoxRouter.Router({
  mode: 'history',
  routes: [...]
})
```

当然，好看是要付出代价的，`history` 模式还需要后台配置，详情请移步 [HTML5 History 模式](https://router.vuejs.org/zh/guide/essentials/history-mode.html)。