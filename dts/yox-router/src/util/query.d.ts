import { YoxInterface } from '../../../yox-type/src/global';
declare type YoxClass = typeof YoxInterface;
/**
 * 把 GET 参数解析成对象
 */
export declare function parse(Yox: YoxClass, query: string): Object | undefined;
/**
 * 把对象解析成 key1=value1&key2=value2
 */
export declare function stringify(Yox: YoxClass, query: Object): string;
export {};
//# sourceMappingURL=query.d.ts.map