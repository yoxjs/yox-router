import { YoxInterface } from '../../../yox-type/src/global';
declare type YoxClass = typeof YoxInterface;
/**
 * 把字符串 value 解析成最合适的类型
 */
export declare function parse(Yox: YoxClass, value: string): any;
export declare function stringify(Yox: YoxClass, value: any): string | void;
export {};
//# sourceMappingURL=value.d.ts.map