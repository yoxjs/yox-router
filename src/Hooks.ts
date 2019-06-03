import Task from '../../yox-type/src/interface/Task'

import * as type from './type'

export default class Hooks {

  list: Task[]

  to: type.Location

  from: type.Location | void

  setLocation(to: type.Location, from: type.Location | void) {
    this.to = to
    this.from = from
    return this
  }

  clear() {
    this.list = []
    return this
  }

  add(hook: Function | void, ctx: any) {
    const { list } = this
    if (hook) {
      list.push({
        fn: hook,
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