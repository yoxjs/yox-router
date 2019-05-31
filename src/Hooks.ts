import Task from '../../yox-type/src/interface/Task'
import YoxOptions from '../../yox-type/src/options/Yox'
import { Router } from './index'

import * as typeUtil from './type'

export default class Hooks {

  name: string

  list: Task[]

  to: typeUtil.Location

  from: typeUtil.Location | void

  setLocation(to: typeUtil.Location, from: typeUtil.Location | void) {
    this.to = to
    this.from = from
    return this
  }

  setName(name: string) {
    this.name = name
    this.list = []
    return this
  }

  add(target: YoxOptions | typeUtil.RouteOptions | Router | void, ctx: any) {
    const { name, list } = this
    if (target && target[name]) {
      list.push({
        fn: target[name],
        ctx,
      })
    }
    return this
  }

  next(next: typeUtil.Next, isGuard?: boolean, complete?: typeUtil.Callback) {
    const task = this.list.shift()
    if (task) {
      if (isGuard) {
        task.fn.call(task.ctx, this.to, this.from, next)
      }
      else {
        task.fn.call(task.ctx, this.to, this.from)
        next()
      }
    }
    else if (complete) {
      complete()
    }
  }

}