import Task from '../../yox-type/src/interface/Task'
import Location from '../../yox-type/src/router/Location'

import * as type from './type'

export default class Hooks {

  list: Task[]

  to: Location

  from: Location | void

  setLocation(to: Location, from: Location | void) {
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

  next(next: Function, isGuard?: boolean, callback?: type.Callback) {
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