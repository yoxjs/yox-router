注册组件的目的是为了更方便的使用组件，注册之后，在其他地方，通过组件名称就能代表组件。

注册组件既支持单个注册，也支持批量注册，如下：

## 为什么要注册组件

存放组件的位置一般比较分散，如下：

```
src/
  - a/
      - ComponentA.js
  - b/
      - ComponentB.js
  - c/
      - ComponentC.js
      - d/
          - ComponentD.js
```

## 单个组件

```js
YoxRouter.register('name', Component)
```

## 批量注册

```js
YoxRouter.register({
  name1: Component1,
  name2: Component2
})
```

## 异步注册

```js
YoxRouter.register({
  name: function (callback) {
    require(['path/component'], callback)
  }
)
```
