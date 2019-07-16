import Yox from 'yox';
/**
 * 把 GET 参数解析成对象
 */
export declare function parse(API: typeof Yox, query: string): object | undefined;
/**
 * 把对象解析成 key1=value1&key2=value2
 */
export declare function stringify(API: typeof Yox, query: object): string;
