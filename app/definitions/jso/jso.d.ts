declare class JSO {

	static enablejQuery($: any): any;

	constructor(vars: any);
	
	getProviderID(): any;
	callback(): any;
	ajax(vars: any):any;
	getToken(fn: Function): any;
	wipeTokens(): any;
	checkToken():any;
}

declare module 'JSO' { export = JSO }