import { Task, Location } from './type';
export default class Hooks {
    list: Task[];
    to: Location;
    from: Location | void;
    setLocation(to: Location, from: Location | void): this;
    clear(): this;
    add(hook: Function | void, ctx: any): this;
    next(isGuard: boolean, next: Function, callback: Function): void;
}
