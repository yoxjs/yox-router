export default class Hooks {
    setLocation(to, from) {
        this.to = to;
        this.from = from;
        return this;
    }
    clear() {
        this.list = [];
        return this;
    }
    add(hook, ctx) {
        const { list } = this;
        if (hook) {
            list.push({
                fn: hook,
                ctx,
            });
        }
        return this;
    }
    next(next, isGuard, callback) {
        const task = this.list.shift();
        if (task) {
            if (isGuard) {
                task.fn.call(task.ctx, this.to, this.from, next);
            }
            else {
                task.fn.call(task.ctx, this.to, this.from);
                next();
            }
        }
        else if (callback) {
            callback();
        }
    }
}
