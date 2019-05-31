import Task from '../../yox-type/src/interface/Task'
import YoxOptions from '../../yox-type/src/options/Yox'
import { Router } from './index'

import * as type from './type'

export default class Hooks {

  name: string

  list: Task[]

  to: type.Location

  from: type.Location | void

  setLocation(to: type.Location, from: type.Location | void) {
    this.to = to
    this.from = from
    return this
  }

  setName(name: string) {
    this.name = name
    this.list = []
    return this
  }

  add(target: YoxOptions | type.RouteOptions | Router, ctx: any) {
    const { name, list } = this
    if (target[name]) {
      list.push({
        fn: target[name],
        ctx,
      })
    }
    return this
  }

  next(next: type.Next, isGuard?: boolean, callback?: type.Callback) {
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
    else if (callback) {
      callback()
    }
  }

}