import API from '../../../yox-type/src/interface/API';
import Location from '../../../yox-type/src/router/Location';
export declare const isSupported: boolean;
export declare function start(domApi: API, handler: Function): void;
export declare function stop(domApi: API, handler: Function): void;
export declare function push(location: Location, handler: Function): void;
export declare function go(n: number): void;
export declare function current(): string;
//# sourceMappingURL=history.d.ts.map