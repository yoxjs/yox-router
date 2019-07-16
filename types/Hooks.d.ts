import { Task } from 'yox';
import { Location } from './type';
export default class Hooks {
    list: Task[];
    to: Location;
    from: Location | void;
    setLocation(to: Location, from: Location | void): this;
    clear(): this;
    add(hook: Function | void, ctx: any): this;
    next(next: Function, isGuard?: boolean, callback?: Function): void;
}
