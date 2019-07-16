import { DomApi } from 'yox';
import { Location } from '../type';
export declare function start(api: DomApi, handler: Function): void;
export declare function stop(api: DomApi, handler: Function): void;
export declare function push(location: Location, handler: Function): void;
export declare function go(n: number): void;
export declare function current(): string;
