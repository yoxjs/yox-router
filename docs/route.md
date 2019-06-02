一个路由包含以下几个属性：

* `path`：路由的路径，必传
* `name`：路由的名称，可选
* `component`：注册组件的名称，必传
* `children`：子路由，可通过它实现嵌套路由，可选
* `beforeEnter`：前置守卫，进入路由之前调用，可选
* `afterEnter`：后置守卫，进入路由之后调用，可选
* `beforeLeave`：前置守卫，离开路由之前调用，可选
* `afterLeave`：后置守卫，离开路由之后调用，可选

## path

路由的路径，它