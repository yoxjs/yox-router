import {
  Task,
} from 'yox'

import {
  Location,
} from './type'

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

  next(isGuard: boolean, next: Function, callback: Function) {
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
    else {
      callback()
    }
  }

}