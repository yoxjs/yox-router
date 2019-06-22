declare const HOOK_BEFORE_CREATE = "beforeCreate";
declare const HOOK_AFTER_CREATE = "afterCreate";
declare const HOOK_BEFORE_MOUNT = "beforeMount";
declare const HOOK_AFTER_MOUNT = "afterMount";
declare const HOOK_BEFORE_UPDATE = "beforeUpdate";
declare const HOOK_AFTER_UPDATE = "afterUpdate";
declare const HOOK_BEFORE_DESTROY = "beforeDestroy";
declare const HOOK_AFTER_DESTROY = "afterDestroy";
declare const HOOK_BEFORE_ROUTE_ENTER = "beforeRouteEnter";
declare const HOOK_AFTER_ROUTE_ENTER = "afterRouteEnter";
declare const HOOK_BEFORE_ROUTE_UPDATE = "beforeRouteUpdate";
declare const HOOK_AFTER_ROUTE_UPDATE = "afterRouteUpdate";
declare const HOOK_BEFORE_ROUTE_LEAVE = "beforeRouteLeave";
declare const HOOK_AFTER_ROUTE_LEAVE = "afterRouteLeave";
export declare type watcher = (newValue: any, oldValue: any, keypath: string) => void;
export declare type listener = (event: CustomEventInterface, data?: data) => false | void;
export declare type nativeListener = (event: CustomEventInterface | Event) => false | void;
export interface ComputedOptions {
	get: getter;
	set?: setter;
	cache?: boolean;
	sync?: boolean;
	deps?: string[];
}
export interface WatcherOptions {
	watcher: watcher;
	immediate?: boolean;
	sync?: boolean;
	once?: boolean;
}
export interface EmitterOptions extends Task {
	ns?: string;
	num?: number;
	max?: number;
	count?: number;
}
export interface EmitterInterface {
	ns: boolean;
	listeners: Record<string, EmitterOptions[]>;
	nativeListeners?: Record<string, nativeListener>;
	fire(type: string, args: any[] | void, filter?: (type: string, args: any[] | void, options: EmitterOptions) => boolean | void): boolean;
	on(type: string, listener?: listener | EmitterOptions): void;
	off(type?: string, listener?: listener): void;
	has(type: string, listener?: listener): boolean;
}
declare var EmitterInterface: {
	prototype: EmitterInterface;
	new (ns?: boolean): EmitterInterface;
};
export interface CustomEventInterface {
	type: string;
	phase: number;
	target?: YoxInterface;
	originalEvent?: CustomEventInterface | Event;
	isPrevented?: true;
	isStoped?: true;
	listener?: Function;
	preventDefault(): CustomEventInterface;
	stopPropagation(): CustomEventInterface;
	prevent(): CustomEventInterface;
	stop(): CustomEventInterface;
}
declare var CustomEventInterface: {
	prototype: CustomEventInterface;
	PHASE_CURRENT: number;
	PHASE_UPWARD: number;
	PHASE_DOWNWARD: number;
	new (type: string, originalEvent?: CustomEventInterface | Event): CustomEventInterface;
};
export interface YoxOptions {
	name?: string;
	propTypes?: Record<string, PropRule>;
	el?: string | Node;
	data?: data | dataGenerator;
	template?: string | Function;
	model?: string;
	props?: data;
	root?: YoxInterface;
	parent?: YoxInterface;
	context?: YoxInterface;
	replace?: true;
	vnode?: VNode;
	slots?: Record<string, VNode[]>;
	computed?: Record<string, getter | ComputedOptions>;
	watchers?: Record<string, watcher | WatcherOptions>;
	transitions?: Record<string, TransitionHooks>;
	components?: Record<string, YoxOptions>;
	directives?: Record<string, DirectiveHooks>;
	partials?: Record<string, string>;
	filters?: Record<string, filter>;
	events?: Record<string, listener>;
	methods?: Record<string, Function>;
	extensions?: data;
	[HOOK_BEFORE_CREATE]?: optionsBeforeCreateHook;
	[HOOK_AFTER_CREATE]?: optionsOtherHook;
	[HOOK_BEFORE_MOUNT]?: optionsOtherHook;
	[HOOK_AFTER_MOUNT]?: optionsOtherHook;
	[HOOK_BEFORE_UPDATE]?: optionsOtherHook;
	[HOOK_AFTER_UPDATE]?: optionsOtherHook;
	[HOOK_BEFORE_DESTROY]?: optionsOtherHook;
	[HOOK_AFTER_DESTROY]?: optionsOtherHook;
	[HOOK_BEFORE_ROUTE_ENTER]?: routerBeforeHook;
	[HOOK_AFTER_ROUTE_ENTER]?: routerAfterHook;
	[HOOK_BEFORE_ROUTE_UPDATE]?: routerBeforeHook;
	[HOOK_AFTER_ROUTE_UPDATE]?: routerAfterHook;
	[HOOK_BEFORE_ROUTE_LEAVE]?: routerBeforeHook;
	[HOOK_AFTER_ROUTE_LEAVE]?: routerAfterHook;
}
export interface YoxInterface {
	$options: YoxOptions;
	$emitter: EmitterInterface;
	$observer: ObserverInterface;
	$el?: HTMLElement;
	$vnode?: VNode;
	$model?: string;
	$root?: YoxInterface;
	$parent?: YoxInterface;
	$context?: YoxInterface;
	$children?: YoxInterface[];
	$refs?: Record<string, YoxInterface | HTMLElement>;
	addComputed(keypath: string, computed: getter | ComputedOptions): ComputedInterface | void;
	removeComputed(keypath: string): void;
	get(keypath: string, defaultValue?: any, depIgnore?: boolean): any;
	set(keypath: string | data, value?: any): void;
	on(type: string | Record<string, listener>, listener?: listener): YoxInterface;
	once(type: string | Record<string, listener>, listener?: listener): YoxInterface;
	off(type?: string, listener?: listener): YoxInterface;
	fire(type: string | CustomEventInterface, data?: data | boolean, downward?: boolean): boolean;
	watch(keypath: string | Record<string, watcher | WatcherOptions>, watcher?: watcher | WatcherOptions, immediate?: boolean): YoxInterface;
	unwatch(keypath?: string, watcher?: watcher): YoxInterface;
	loadComponent(name: string, callback: componentCallback): void;
	createComponent(options: YoxOptions, vnode: VNode): YoxInterface;
	directive(name: string | Record<string, DirectiveHooks>, directive?: DirectiveHooks): DirectiveHooks | void;
	transition(name: string | Record<string, TransitionHooks>, transition?: TransitionHooks): TransitionHooks | void;
	component(name: string | Record<string, component>, component?: component): component | void;
	partial(name: string | Record<string, string>, partial?: string): Function | void;
	filter(name: string | Record<string, filter>, filter?: filter): filter | void;
	checkProps(props: data): void;
	checkProp(key: string, value: any): void;
	forceUpdate(data?: data): void;
	destroy(): void;
	nextTick(task: Function): void;
	toggle(keypath: string): boolean;
	increase(keypath: string, step?: number, max?: number): number | void;
	decrease(keypath: string, step: number, min?: number): number | void;
	insert(keypath: string, item: any, index: number | boolean): true | void;
	append(keypath: string, item: any): true | void;
	prepend(keypath: string, item: any): true | void;
	removeAt(keypath: string, index: number): true | void;
	remove(keypath: string, item: any): true | void;
	copy<T>(data: T, deep?: boolean): T;
}
declare const YoxInterface: {
	prototype: YoxInterface;
	is: IsUtil;
	dom: DomUtil;
	array: ArrayUtil;
	object: ObjectUtil;
	string: StringUtil;
	logger: LoggerUtil;
	Emitter: EmitterClass;
	Event: CustomEventClass;
	new (options?: YoxOptions): YoxInterface;
	use(plugin: YoxPlugin): void;
	create(options?: YoxOptions): YoxOptions;
	nextTick(task: Function, context?: any): void;
	compile(template: string, stringify?: boolean): Function | string;
	directive(name: string | Record<string, DirectiveHooks>, directive?: DirectiveHooks): DirectiveHooks | void;
	transition(name: string | Record<string, TransitionHooks>, transition?: TransitionHooks): TransitionHooks | void;
	component(name: string | Record<string, component>, component?: component): component | void;
	partial(name: string | Record<string, string>, partial?: string): Function | void;
	filter(name: string | Record<string, filter>, filter?: filter): filter | void;
};
export interface YoxPlugin {
	version: string;
	install(Yox: YoxClass): void;
}
export interface DirectiveHooks {
	once?: true;
	bind: bind;
	unbind?: unbind;
}
export interface SpecialEventHooks {
	on: on;
	off: off;
}
export interface TransitionHooks {
	enter?: enter;
	leave?: leave;
}
export declare type YoxClass = typeof YoxInterface;
export declare type EmitterClass = typeof EmitterInterface;
export declare type CustomEventClass = typeof CustomEventInterface;
export declare type hint = 1 | 2 | 3;
export declare type lazy = number | true;
export declare type propType = (key: string, value: any) => void;
export declare type propValue = () => any;
export declare type data = Record<string, any>;
export declare type dataGenerator = (options: YoxOptions) => data;
export declare type getter = () => any;
export declare type setter = (value: any) => void;
export declare type formater = (...args: any) => string | number | boolean;
export declare type filter = formater | Record<string, formater>;
export declare type enter = (node: HTMLElement) => void;
export declare type leave = (node: HTMLElement, done: () => void) => void;
export declare type bind = (node: HTMLElement | YoxInterface, directive: Directive, vnode: VNode) => void;
export declare type unbind = (node: HTMLElement | YoxInterface, directive: Directive, vnode: VNode) => void;
export declare type on = (node: HTMLElement | Window | Document, listener: nativeListener) => void;
export declare type off = (node: HTMLElement | Window | Document, listener: nativeListener) => void;
export declare type componentCallback = (options: YoxOptions) => void;
export declare type componentLoader = (callback: componentCallback) => void;
export declare type component = YoxOptions | componentLoader;
export declare type optionsBeforeCreateHook = (options: YoxOptions) => void;
export declare type optionsOtherHook = () => void;
export declare type routerBeforeHook = (to: Location, from: Location | void, next: (value?: false | string | RouteTarget) => void) => void;
export declare type routerAfterHook = (to: Location, from: Location | void) => void;
export interface ValueHolder {
	keypath?: string;
	value: any;
}
export interface Attribute {
	readonly name: string;
	readonly value: string;
}
export interface Property {
	readonly name: string;
	readonly value: any;
	readonly hint: hint;
}
export interface Directive {
	readonly ns: string;
	readonly name: string;
	readonly key: string;
	readonly value?: string | number | boolean;
	readonly hooks: DirectiveHooks;
	readonly getter?: getter | void;
	readonly handler?: listener | void;
	readonly binding?: string | void;
	readonly hint?: hint | void;
}
export interface VNode {
	data: data;
	node: Node;
	parent?: YoxInterface;
	slot?: string;
	readonly keypath: string;
	readonly context: YoxInterface;
	readonly tag?: string | void;
	readonly isComponent?: boolean;
	readonly isComment?: boolean;
	readonly isText?: boolean;
	readonly isSvg?: boolean;
	readonly isStyle?: boolean;
	readonly isOption?: boolean;
	readonly isStatic?: boolean;
	readonly props?: data;
	readonly slots?: Record<string, VNode[]>;
	readonly nativeProps?: Record<string, Property>;
	readonly nativeAttrs?: Record<string, Attribute>;
	readonly directives?: Record<string, Directive>;
	readonly lazy?: Record<string, lazy>;
	readonly transition?: TransitionHooks;
	readonly ref?: string;
	readonly key?: string;
	readonly text?: string;
	readonly html?: string;
	readonly children?: VNode[];
}
export interface DomUtil {
	createElement(tag: string, isSvg?: boolean): Element;
	createText(text: string): Text;
	createComment(text: string): Comment;
	prop(node: HTMLElement, name: string, value?: string | number | boolean): string | number | boolean | void;
	removeProp(node: HTMLElement, name: string, hint?: hint): void;
	attr(node: HTMLElement, name: string, value?: string): string | void;
	removeAttr(node: HTMLElement, name: string): void;
	before(parentNode: Node, node: Node, beforeNode: Node): void;
	append(parentNode: Node, node: Node): void;
	replace(parentNode: Node, node: Node, oldNode: Node): void;
	remove(parentNode: Node, node: Node): void;
	parent(node: Node): Node | void;
	next(node: Node): Node | void;
	find(selector: string): Element | void;
	tag(node: Node): string | void;
	text(node: Node, text?: string, isStyle?: boolean, isOption?: boolean): string | void;
	html(node: Element, html?: string, isStyle?: boolean, isOption?: boolean): string | void;
	addClass(node: HTMLElement, className: string): void;
	removeClass(node: HTMLElement, className: string): void;
	on(node: HTMLElement | Window | Document, type: string, listener: listener): void;
	off(node: HTMLElement | Window | Document, type: string, listener: listener): void;
	addSpecialEvent(type: string, hooks: SpecialEventHooks): void;
}
export interface ArrayUtil {
	each<T>(array: T[], callback: (item: T, index: number, length: number) => boolean | void, reversed?: boolean): void;
	push<T>(array: T[], target: T | T[]): void;
	unshift<T>(array: T[], target: T | T[]): void;
	indexOf<T>(array: T[], target: T, strict?: boolean): number;
	last<T>(array: T[]): T | void;
	pop<T>(array: T[]): T | void;
	remove<T>(array: T[], target: T, strict?: boolean): number;
	has<T>(array: T[], target: T, strict?: boolean): boolean;
	toArray<T>(array: T[] | ArrayLike<T>): T[];
	toObject(array: any[], key?: string | null, value?: any): Object;
	join(array: string[], separator: string): string;
	falsy(array: any): boolean;
}
export interface IsUtil {
	func(value: any): boolean;
	array(value: any): boolean;
	object(value: any): boolean;
	string(value: any): boolean;
	number(value: any): boolean;
	boolean(value: any): boolean;
	numeric(value: any): boolean;
}
export interface LoggerUtil {
	DEBUG: number;
	INFO: number;
	WARN: number;
	ERROR: number;
	FATAL: number;
	debug(msg: string, tag?: string): void;
	info(msg: string, tag?: string): void;
	warn(msg: string, tag?: string): void;
	error(msg: string, tag?: string): void;
	fatal(msg: string, tag?: string): void;
}
export interface ObjectUtil {
	keys(object: data): string[];
	sort(object: data, desc?: boolean): string[];
	each(object: data, callback: (value: any, key: string) => boolean | void): void;
	clear(object: data): void;
	extend(original: data, object: data): data;
	merge(object1: data | void, object2: data | void): data | void;
	copy(object: any, deep?: boolean): any;
	get(object: any, keypath: string): ValueHolder | undefined;
	set(object: data, keypath: string, value: any, autofill?: boolean): void;
	has(object: data, key: string | number): boolean;
	falsy(object: any): boolean;
}
export interface StringUtil {
	camelize(str: string): string;
	hyphenate(str: string): string;
	capitalize(str: string): string;
	trim(str: any): string;
	slice(str: string, start: number, end?: number): string;
	indexOf(str: string, part: string, start?: number): number;
	lastIndexOf(str: string, part: string, end?: number): number;
	startsWith(str: string, part: string): boolean;
	endsWith(str: string, part: string): boolean;
	charAt(str: string, index?: number): string;
	codeAt(str: string, index?: number): number;
	upper(str: string): string;
	lower(str: string): string;
	has(str: string, part: string): boolean;
	falsy(str: any): boolean;
}
export interface Task {
	fn: Function;
	ctx?: any;
}
export interface NextTaskInterface {
	append(func: Function, context?: any): void;
	prepend(func: Function, context?: any): void;
	clear(): void;
	run(): void;
}
export interface ObserverInterface {
	data: data;
	context: any;
	nextTask: NextTaskInterface;
	addComputed(keypath: string, options: getter | ComputedOptions): ComputedInterface | void;
	removeComputed(keypath: string): void;
	diff(keypath: string, newValue: any, oldValue: any): void;
	get(keypath: string, defaultValue?: any, depIgnore?: boolean): any;
	set(keypath: string | data, value?: any): void;
	watch(keypath: string | Record<string, watcher | WatcherOptions>, watcher?: watcher | WatcherOptions, immediate?: boolean): void;
	unwatch(keypath?: string, watcher?: watcher): void;
	toggle(keypath: string): boolean;
	increase(keypath: string, step?: number, max?: number): number | void;
	decrease(keypath: string, step: number, min?: number): number | void;
	insert(keypath: string, item: any, index: number | boolean): true | void;
	append(keypath: string, item: any): true | void;
	prepend(keypath: string, item: any): true | void;
	removeAt(keypath: string, index: number): true | void;
	remove(keypath: string, item: any): true | void;
	copy<T>(data: T, deep?: boolean): T;
	destroy(): void;
}
declare var ObserverInterface: {
	prototype: ObserverInterface;
	new (data?: data, context?: any): ObserverInterface;
};
export interface ComputedInterface {
	get(force?: boolean): any;
	set(value: any): void;
}
declare var ComputedInterface: {
	prototype: ComputedInterface;
	current?: ComputedInterface;
	build(keypath: string, observer: ObserverInterface, options: any): ComputedInterface | void;
	new (keypath: string, sync: boolean, cache: boolean, deps: string[], observer: ObserverInterface, getter: getter, setter: setter | void): ComputedInterface;
};
export interface PropRule {
	type: string | string[] | propType;
	value?: any | propValue;
	required?: boolean;
}
export interface Location {
	path: string;
	url?: string;
	params?: data;
	query?: data;
}
export interface RouteTarget {
	name?: string;
	path?: string;
	params?: data;
	query?: data;
}
declare const ROUTER_HOOK_BEFORE_ENTER = "beforeEnter";
declare const ROUTER_HOOK_AFTER_ENTER = "afterEnter";
declare const ROUTER_HOOK_BEFORE_UPDATE = "beforeUpdate";
declare const ROUTER_HOOK_AFTER_UPDATE = "afterUpdate";
declare const ROUTER_HOOK_BEFORE_LEAVE = "beforeLeave";
declare const ROUTER_HOOK_AFTER_LEAVE = "afterLeave";
export declare type Target = string | RouteTarget;
export declare type Redirect = (to: Location) => Target;
export declare type Callback = () => void;
export declare type RouteCallback = (route: RouteOptions) => void;
export declare type RouteLoader = (callback: RouteCallback) => void;
export interface RouterOptions {
	el: Element | string;
	routes: RouteOptions[];
	route404?: RouteOptions;
	mode?: 'hash' | 'history';
	[ROUTER_HOOK_BEFORE_ENTER]?: routerBeforeHook;
	[ROUTER_HOOK_AFTER_ENTER]?: routerAfterHook;
	[ROUTER_HOOK_BEFORE_UPDATE]?: routerBeforeHook;
	[ROUTER_HOOK_AFTER_UPDATE]?: routerAfterHook;
	[ROUTER_HOOK_BEFORE_LEAVE]?: routerBeforeHook;
	[ROUTER_HOOK_AFTER_LEAVE]?: routerAfterHook;
}
export interface RouteOptions {
	path: string;
	component?: YoxOptions;
	name?: string;
	load?: RouteLoader;
	redirect?: Target | Redirect;
	children?: RouteOptions[];
	[ROUTER_HOOK_BEFORE_ENTER]?: routerBeforeHook;
	[ROUTER_HOOK_AFTER_ENTER]?: routerAfterHook;
	[ROUTER_HOOK_BEFORE_UPDATE]?: routerBeforeHook;
	[ROUTER_HOOK_AFTER_UPDATE]?: routerAfterHook;
	[ROUTER_HOOK_BEFORE_LEAVE]?: routerBeforeHook;
	[ROUTER_HOOK_AFTER_LEAVE]?: routerAfterHook;
}
export interface LinkedRoute {
	path: string;
	route: RouteOptions;
	name?: string;
	load?: RouteLoader;
	component?: YoxOptions;
	params?: string[];
	context?: YoxInterface;
	parent?: LinkedRoute;
	child?: LinkedRoute;
}
export interface Pending {
	cursor?: number;
	location: Location;
	onComplete: Callback;
	onAbort: Callback;
}
export interface Mode {
	start(domUtil: DomUtil, handler: Function): void;
	stop(domUtil: DomUtil, handler: Function): void;
	push(location: Location, handler: Function): void;
	go(n: number): void;
	current(): string;
}
declare class Hooks {
	list: Task[];
	to: Location;
	from: Location | void;
	setLocation(to: Location, from: Location | void): this;
	clear(): this;
	add(hook: Function | void, ctx: any): this;
	next(next: Function, isGuard?: boolean, callback?: Callback): void;
}
export declare class Router {
	el: Element;
	options: RouterOptions;
	routes: LinkedRoute[];
	route404: LinkedRoute;
	name2Path: Record<string, string>;
	path2Route: Record<string, LinkedRoute>;
	mode: Mode;
	history: Location[];
	cursor: number;
	pending?: Pending;
	hooks: Hooks;
	handler: Function;
	route?: LinkedRoute;
	location?: Location;
	constructor(options: RouterOptions);
	/**
	 * 添加一个新的路由
	 */
	add(routeOptions: RouteOptions): LinkedRoute[];
	/**
	 * 删除一个已注册的路由
	 */
	remove(route: LinkedRoute): void;
	/**
	 * target 有 3 种格式：
	 *
	 * 如果只是简单的 path，直接传字符串
	 *
	 * push('/index')
	 *
	 * 如果需要带参数，可传对象
	 *
	 * push({
	 *   path: '/index',
	 *   params: { },
	 *   query: { }
	 * })
	 *
	 * 如果路由配置了 name，可用 name 代替 path，如下：
	 *
	 * push({
	 *   name: 'index'
	 * })
	 *
	 */
	push(target: Target): void;
	/**
	 * 不改变 URL，只修改路由组件
	 */
	replace(target: Target): void;
	/**
	 * 前进或后退 n 步
	 */
	go(n: number): void;
	/**
	 * 启动路由
	 */
	start(): void;
	/**
	 * 停止路由
	 */
	stop(): void;
	/**
	 * 钩子函数
	 */
	hook(route: LinkedRoute, componentHook: string, hook: string, isGuard?: boolean, callback?: Callback): void;
	private setHistory;
	private replaceHistory;
	private setUrl;
	private parseLocation;
	private diffRoute;
	private patchRoute;
	private setRoute;
}
/**
 * 版本
 */
export declare const version: string | undefined;
/**
 * 安装插件
 */
export declare function install(Yox: YoxClass): void;

export {};
