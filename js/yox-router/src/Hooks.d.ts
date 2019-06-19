import { Task } from '../../yox-type/src/class';
import Location from '../../yox-type/src/router/Location';
import * as type from './type';
export default class Hooks {
    list: Task[];
    to: Location;
    from: Location | void;
    setLocation(to: Location, from: Location | void): this;
    clear(): this;
    add(hook: Function | void, ctx: any): this;
    next(next: Function, isGuard?: boolean, callback?: type.Callback): void;
}
//# sourceMappingURL=Hooks.d.ts.map