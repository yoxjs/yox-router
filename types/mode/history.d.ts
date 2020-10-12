import { Location } from '../type';
export declare const isSupported: boolean;
export declare function start(handler: Function): void;
export declare function stop(handler: Function): void;
export declare function push(location: Location, handler: Function): void;
export declare function replace(location: Location, handler: Function): void;
export declare function go(n: number): void;
export declare function current(): string;
export declare function replaceState(url: string, handler: Function): void;
