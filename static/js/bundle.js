/* oak build --web */
// module system
const __Oak_Modules = {};
let __Oak_Import_Aliases;
function __oak_modularize(name, fn) {
	__Oak_Modules[name] = fn;
}
function __oak_module_import(name) {
	if (typeof __Oak_Modules[name] === 'object') return __Oak_Modules[name];
	const module = __Oak_Modules[name] || __Oak_Modules[__Oak_Import_Aliases[name]];
	if (module) {
		__Oak_Modules[name] = {}; // break circular imports
		return __Oak_Modules[name] = module();
	} else {
		throw new Error(`Could not import Oak module "${name}" at runtime`);
	}
}

// language primitives
let __oak_empty_assgn_tgt;
function __oak_eq(a, b) {
	a = __as_oak_string(a);
	b = __as_oak_string(b);
	if (a === __Oak_Empty || b === __Oak_Empty) return true;

	// match either null or undefined to compare correctly against undefined ?s
	// appearing in places like optional arguments
	if (a == null && b == null) return true;
	if (a === null || b === null) return false;

	if (typeof a !== typeof b) return false;
	if (__is_oak_string(a) && __is_oak_string(b)) {
		return a.valueOf() === b.valueOf();
	}
	if (typeof a === 'number' || typeof a === 'boolean' ||
		typeof a === 'function' || typeof a === 'symbol') {
		return a === b;
	}

	// deep equality check for composite values
	if (!Array.isArray(a) && typeof a !== 'object') return false;
	if (len(a) !== len(b)) return false;
	for (const key of keys(a)) {
		if (!__oak_eq(a[key], b[key])) return false;
	}
	return true;
}
function __oak_acc(tgt, prop) {
	return __is_oak_string(tgt)
		? __as_oak_string(tgt.valueOf()[prop]) || null
		: tgt[prop] !== undefined
		? tgt[prop]
		: null;
}
function __oak_obj_key(x) {
	return typeof x === 'symbol' ? Symbol.keyFor(x) : x;
}
function __oak_push(a, b) {
	a = __as_oak_string(a);
	a.push(b);
	return a;
}
function __oak_and(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return a && b;
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) & get(b, i));
		}
		return res;
	}
	return a & b;
}
function __oak_or(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return a || b;
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) | get(b, i));
		}
		return res;
	}
	return a | b;
}
function __oak_xor(a, b) {
	if (typeof a === 'boolean' && typeof b === 'boolean') {
		return (a && !b) || (!a && b);
	}
	if (__is_oak_string(a) && __is_oak_string(b)) {
		const max = Math.max(a.length, b.length);
		const get = (s, i) => s.valueOf().charCodeAt(i) || 0;

		let res = '';
		for (let i = 0; i < max; i ++) {
			res += String.fromCharCode(get(a, i) ^ get(b, i));
		}
		return res;
	}
	return a ^ b;
}
const __Oak_Empty = Symbol('__Oak_Empty');

// mutable string type
function __is_oak_string(x) {
	if (x == null) return false;
	return x.__mark_oak_string;
}
function __as_oak_string(x) {
	if (typeof x === 'string') return __Oak_String(x);
	return x;
}
const __Oak_String = s => {
	if (__is_oak_string(s)) return s;
	return {
		__mark_oak_string: true,
		assign(i, slice) {
			if (i === s.length) return s += slice;
			return s = s.substr(0, i) + slice + s.substr(i + slice.length);
		},
		push(slice) {
			s += slice;
		},
		toString() {
			return s;
		},
		valueOf() {
			return s;
		},
		get length() {
			return s.length;
		},
	}
}

// tail recursion trampoline helpers
function __oak_resolve_trampoline(fn, ...args) {
	let rv = fn(...args);
	while (rv && rv.__is_oak_trampoline) {
		rv = rv.fn(...rv.args);
	}
	return rv;
}
function __oak_trampoline(fn, ...args) {
	return {
		__is_oak_trampoline: true,
		fn: fn,
		args: args,
	}
}

// env (builtin) functions

// reflection and types
const __Is_Oak_Node = typeof process === 'object';
const __Oak_Int_RE = /^[+-]?\d+$/;
function int(x) {
	x = __as_oak_string(x);
	if (typeof x === 'number') {
		// JS rounds towards higher magnitude, Oak rounds towards higher value
		const rounded = Math.floor(x);
		const diff = x - rounded;
		if (x < 0 && diff === 0.5) return rounded + 1;
		return rounded;
	}
	if (__is_oak_string(x) && __Oak_Int_RE.test(x.valueOf())) {
		const i = Number(x.valueOf());
		if (isNaN(i)) return null;
		return i;
	}
	return null;
}
function float(x) {
	x = __as_oak_string(x);
	if (typeof x === 'number') return x;
	if (__is_oak_string(x)) {
		const f = parseFloat(x.valueOf());
		if (isNaN(f)) return null;
		return f;
	}
	return null;
}
function atom(x) {
	x = __as_oak_string(x);
	if (typeof x === 'symbol' && x !== __Oak_Empty) return x;
	if (__is_oak_string(x)) return Symbol.for(x.valueOf());
	return Symbol.for(string(x));
}
function string(x) {
	x = __as_oak_string(x);
	function display(x) {
		x = __as_oak_string(x);
		if (__is_oak_string(x)) {
			return '\'' + x.valueOf().replace('\\', '\\\\').replace('\'', '\\\'') + '\'';
		} else if (typeof x === 'symbol') {
			if (x === __Oak_Empty) return '_';
			return ':' + Symbol.keyFor(x);
		}
		return string(x);
	}
	if (x === null) {
		return '?';
	} else if (typeof x === 'number') {
		return x.toString();
	} else if (__is_oak_string(x)) {
		return x;
	} else if (typeof x === 'boolean') {
		return x.toString();
	} else if (typeof x === 'function') {
		return x.toString();
	} else if (typeof x === 'symbol') {
		if (x === __Oak_Empty) return '_';
		return Symbol.keyFor(x);
	} else if (Array.isArray(x)) {
		return '[' + x.map(display).join(', ') + ']';
	} else if (typeof x === 'object') {
		const entries = [];
		for (const key of keys(x).sort()) {
			entries.push(`${key}: ${display(x[key])}`);
		}
		return '{' + entries.join(', ') + '}';
	}
	throw new Error('string() called on unknown type ' + x.toString());
}
function codepoint(c) {
	c = __as_oak_string(c);
	return c.valueOf().charCodeAt(0);
}
function char(n) {
	return String.fromCharCode(n);
}
function type(x) {
	x = __as_oak_string(x);
	if (x === null) {
		return Symbol.for('null');
	} else if (typeof x === 'number') {
		// Many discrete APIs check for :int, so we consider all integer
		// numbers :int and fall back to :float. This is not an airtight
		// solution, but works well enough and the alternative (tagged number
		// values/types) have poor perf tradeoffs.
		if (Number.isInteger(x)) return Symbol.for('int');
		return Symbol.for('float');
	} else if (__is_oak_string(x)) {
		return Symbol.for('string');
	} else if (typeof x === 'boolean') {
		return Symbol.for('bool');
	} else if (typeof x === 'symbol') {
		if (x === __Oak_Empty) return Symbol.for('empty');
		return Symbol.for('atom');
	} else if (typeof x === 'function') {
		return Symbol.for('function');
	} else if (Array.isArray(x)) {
		return Symbol.for('list');
	} else if (typeof x === 'object') {
		return Symbol.for('object');
	}
	throw new Error('type() called on unknown type ' + x.toString());
}
function len(x) {
	x = __as_oak_string(x);
	if (__is_oak_string(x)) {
		return x.length;
	} else if (Array.isArray(x)) {
		return x.length;
	} else if (typeof x === 'object' && x !== null) {
		return Object.getOwnPropertyNames(x).length;
	}
	throw new Error('len() takes a string or composite value, but got ' + string(x));
}
function keys(x) {
	if (Array.isArray(x)) {
		const k = [];
		for (let i = 0; i < x.length; i ++) k.push(i);
		return k;
	} else if (typeof x === 'object' && x !== null) {
		return Object.getOwnPropertyNames(x).map(__as_oak_string);
	}
	throw new Error('keys() takes a composite value, but got ' + string(x).valueOf());
}

// OS interfaces
function args() {
	if (__Is_Oak_Node) return process.argv.map(__as_oak_string);
	return [window.location.href];
}
function env() {
	if (__Is_Oak_Node) {
		const e = Object.assign({}, process.env);
		for (const key in e) {
			e[key] = __as_oak_string(e[key]);
		}
		return e;
	}
	return {};
}
function time() {
	return Date.now() / 1000;
}
function nanotime() {
	return int(Date.now() * 1000000);
}
function rand() {
	return Math.random();
}
let randomBytes;
function srand(length) {
	if (__Is_Oak_Node) {
		// lazily import dependency
		if (!randomBytes) randomBytes = require('crypto').randomBytes;
		return randomBytes(length).toString('latin1');
	}

	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return __as_oak_string(Array.from(bytes).map(b => String.fromCharCode(b)).join(''));
}
function wait(duration, cb) {
	setTimeout(cb, duration * 1000);
	return null;
}
function exit(code) {
	if (__Is_Oak_Node) process.exit(code);
	return null;
}
function exec() {
	throw new Error('exec() not implemented');
}

// I/O
function input() {
	throw new Error('input() not implemented');
}
function print(s) {
	s = __as_oak_string(s);
	if (__Is_Oak_Node) {
		process.stdout.write(string(s).toString());
	} else {
		console.log(string(s).toString());
	}
	return s.length;
}
function ls() {
	throw new Error('ls() not implemented');
}
function rm() {
	throw new Error('rm() not implemented');
}
function mkdir() {
	throw new Error('mkdir() not implemented');
}
function stat() {
	throw new Error('stat() not implemented');
}
function open() {
	throw new Error('open() not implemented');
}
function close() {
	throw new Error('close() not implemented');
}
function read() {
	throw new Error('read() not implemented');
}
function write() {
	throw new Error('write() not implemented');
}
function listen() {
	throw new Error('listen() not implemented');
}
function req() {
	throw new Error('req() not implemented');
}

// math
function sin(n) {
	return Math.sin(n);
}
function cos(n) {
	return Math.cos(n);
}
function tan(n) {
	return Math.tan(n);
}
function asin(n) {
	return Math.asin(n);
}
function acos(n) {
	return Math.acos(n);
}
function atan(n) {
	return Math.atan(n);
}
function pow(b, n) {
	return Math.pow(b, n);
}
function log(b, n) {
	return Math.log(n) / Math.log(b);
}

// runtime
function ___runtime_lib() {
	throw new Error('___runtime_lib() not implemented');
}
function ___runtime_lib__oak_qm() {
	throw new Error('___runtime_lib?() not implemented');
}

// JavaScript interop
function bind(target, fn) {
	const fnName = Symbol.keyFor(fn);
	return target[fnName].bind(target);
}
function __oak_js_new(Constructor, ...args) {
	return new Constructor(...args);
}
(__oak_modularize(__Oak_String(`lib/storage.oak`),function _(){return ((PersistenceInterval,debounce,json,load,persist,persistImmediately)=>(({debounce}=__oak_module_import(__Oak_String(`std`))),(json=__oak_module_import(__Oak_String(`json`))),(PersistenceInterval=1),load=function load(key=null,defaultData=null){return ((data,getItem)=>((getItem=bind(((__oak_acc_tgt)=>__oak_acc_tgt.localStorage!==undefined?__oak_acc_tgt.localStorage:null)(window),Symbol.for('getItem'))),((__oak_cond)=>__oak_eq(__oak_cond,null)?defaultData:((__oak_acc_tgt)=>__oak_acc_tgt.parse!==undefined?__oak_acc_tgt.parse:null)(json)(data))((data=getItem(key)))))()},persistImmediately=function persistImmediately(key=null,data=null){return ((serialized,setItem)=>((serialized=((__oak_acc_tgt)=>__oak_acc_tgt.serialize!==undefined?__oak_acc_tgt.serialize:null)(json)(data)),(setItem=bind(((__oak_acc_tgt)=>__oak_acc_tgt.localStorage!==undefined?__oak_acc_tgt.localStorage:null)(window),Symbol.for('setItem'))),setItem(key,serialized)))()},(persist=debounce(PersistenceInterval,persistImmediately)),({PersistenceInterval,debounce,json,load,persist,persistImmediately})))()}),__oak_modularize(__Oak_String(`lib/torus.js.oak`),function _(){return ((Renderer,__oak_js_default,h,map)=>(({__oak_js_default,map}=__oak_module_import(__Oak_String(`std`))),h=function h(tag=null,...args){return ((attrs,children,classes,events)=>(((__oak_cond)=>__oak_eq(__oak_cond,0)?null:__oak_eq(__oak_cond,1)?([children=null]=args):__oak_eq(__oak_cond,2)?([classes,children=null]=args):__oak_eq(__oak_cond,3)?([classes,attrs,children=null]=args):([classes,attrs,events,children=null]=args))(len(args)),(classes=__oak_js_default(classes,[])),(attrs=__oak_js_default(attrs,({}))),(events=__oak_js_default(events,({}))),(children=__oak_js_default(children,[])),({tag:String(string(tag)),attrs:((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(__Oak_String(`class`),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__Oak_String(`class`)]):(__oak_assgn_tgt[__Oak_String(`class`)])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(attrs),map(classes,String)),events,children:map(children,function _(child=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?String(child):child)(type(child))})})))()},Renderer=function Renderer(root=null){return ((initialDOM,node,render,self,update)=>(((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?(root=bind(document,Symbol.for('querySelector'))(root)):null)(type(root)),(render=((__oak_acc_tgt)=>__oak_acc_tgt.render!==undefined?__oak_acc_tgt.render:null)(((__oak_acc_tgt)=>__oak_acc_tgt.Torus!==undefined?__oak_acc_tgt.Torus:null)(window))),(initialDOM=h(Symbol.for('div'))),(node=render(null,null,initialDOM)),bind(root,Symbol.for('appendChild'))(node),(self=({node,prev:initialDOM,update:update=function update(jdom=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(node,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.node):(__oak_assgn_tgt.node)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(self),render(((__oak_acc_tgt)=>__oak_acc_tgt.node!==undefined?__oak_acc_tgt.node:null)(self),((__oak_acc_tgt)=>__oak_acc_tgt.prev!==undefined?__oak_acc_tgt.prev:null)(self),jdom)),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(prev,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.prev):(__oak_assgn_tgt.prev)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(self),jdom),((__oak_acc_tgt)=>__oak_acc_tgt.node!==undefined?__oak_acc_tgt.node:null)(self))}}))))()},({Renderer,__oak_js_default,h,map})))()}),__oak_modularize(__Oak_String(`src/app.js.oak`),function _(){return ((DefaultN,DefaultTokens,Link,Renderer,State,StateStorageKey,append,cloneDoc,currentDoc,datetime,__oak_js_default,endsWith__oak_qm,fetchCompletion,filter,fmt,focusPromptInput,h,insertDoc,json,map,merge,padStart,persistAndRender,println,r,render,slice,storage,trim,truncate,updateCompletions)=>(({println,__oak_js_default,slice,map,merge,filter,append}=__oak_module_import(__Oak_String(`std`))),({endsWith__oak_qm,padStart,trim}=__oak_module_import(__Oak_String(`str`))),(fmt=__oak_module_import(__Oak_String(`fmt`))),(datetime=__oak_module_import(__Oak_String(`datetime`))),(json=__oak_module_import(__Oak_String(`json`))),(storage=__oak_module_import(__Oak_String(`lib/storage.oak`))),({Renderer,h}=__oak_module_import(__Oak_String(`lib/torus.js.oak`))),(DefaultTokens=20),(DefaultN=5),(StateStorageKey=__Oak_String(`calamity_db`)),(State=merge(((__oak_acc_tgt)=>__oak_acc_tgt.load!==undefined?__oak_acc_tgt.load:null)(storage)(StateStorageKey,({fetching__oak_qm:false,sidebar__oak_qm:true,docIdx:0,docs:[({params:({tokens:DefaultTokens,n:DefaultN}),prompt:__Oak_String(``),completions:[],created:int(time())})]})),({fetching__oak_qm:false,docIdx:0,sidebar__oak_qm:false}))),fetchCompletion=function fetchCompletion(prompt=null,withCompletions=null){return ((handleErr,jsonResp,n,resp,tokens)=>(render(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(fetching__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.fetching__oak_qm):(__oak_assgn_tgt.fetching__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),true)),({tokens,n}=((__oak_acc_tgt)=>__oak_acc_tgt.params!==undefined?__oak_acc_tgt.params:null)(currentDoc())),(resp=fetch(__Oak_String(`/gen`),({method:__Oak_String(`POST`),body:((__oak_acc_tgt)=>__oak_acc_tgt.serialize!==undefined?__oak_acc_tgt.serialize:null)(json)(({text:trim(prompt),tokens,n}))}))),handleErr=function handleErr(e=null){return render(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(fetching__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.fetching__oak_qm):(__oak_assgn_tgt.fetching__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),bind(e,Symbol.for('toString'))()))},bind(resp,Symbol.for('catch'))(handleErr),(jsonResp=bind(resp,Symbol.for('then'))(function _(r=null){return ((__oak_cond)=>__oak_eq(__oak_cond,200)?bind(r,Symbol.for('json'))():handleErr(__Oak_String(`Request failed.`)))(((__oak_acc_tgt)=>__oak_acc_tgt.status!==undefined?__oak_acc_tgt.status:null)(r))})),bind(jsonResp,Symbol.for('catch'))(handleErr),bind(jsonResp,Symbol.for('then'))(function _(data=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?handleErr(__Oak_String(`Request serialization failed.`)):(render(((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(fetching__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.fetching__oak_qm):(__oak_assgn_tgt.fetching__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),false)),withCompletions(data)))(data)})))()},updateCompletions=function updateCompletions(){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?null:((doc,prompt)=>((doc=currentDoc()),(prompt=((__oak_acc_tgt)=>__oak_acc_tgt.prompt!==undefined?__oak_acc_tgt.prompt:null)(doc)),fetchCompletion(prompt,function _(completions=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(completions,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.completions):(__oak_assgn_tgt.completions)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(doc),map(completions,function _(completion=null){return [prompt,slice(completion,len(prompt))]})),persistAndRender())})))())(((__oak_acc_tgt)=>__oak_acc_tgt.fetching__oak_qm!==undefined?__oak_acc_tgt.fetching__oak_qm:null)(State))},currentDoc=function currentDoc(){return __oak_acc(((__oak_acc_tgt)=>__oak_acc_tgt.docs!==undefined?__oak_acc_tgt.docs:null)(State),__oak_obj_key((((__oak_acc_tgt)=>__oak_acc_tgt.docIdx!==undefined?__oak_acc_tgt.docIdx:null)(State))))},truncate=function truncate(s=null,n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?s:__as_oak_string(slice(s,0,n)+__Oak_String(`...`)))((len(s)<n))},focusPromptInput=function focusPromptInput(){return ((promptEditor)=>(((__oak_cond)=>__oak_eq(__oak_cond,null)?null:(bind(promptEditor,Symbol.for('focus'))(),bind(promptEditor,Symbol.for('setSelectionRange'))(len(((__oak_acc_tgt)=>__oak_acc_tgt.value!==undefined?__oak_acc_tgt.value:null)(promptEditor)),len(((__oak_acc_tgt)=>__oak_acc_tgt.value!==undefined?__oak_acc_tgt.value:null)(promptEditor)))))((promptEditor=bind(document,Symbol.for('querySelector'))(__Oak_String(`.prompt-editor-input`))))))()},insertDoc=function insertDoc(attrs=null){return ((newDoc)=>((newDoc=merge(({params:({tokens:DefaultTokens,n:DefaultN}),prompt:__Oak_String(``),completions:[]}),attrs,({created:int(time())}))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(fav,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.fav):(__oak_assgn_tgt.fav)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(newDoc),__Oak_Empty),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(docs,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.docs):(__oak_assgn_tgt.docs)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),append([newDoc],((__oak_acc_tgt)=>__oak_acc_tgt.docs!==undefined?__oak_acc_tgt.docs:null)(State))),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(docIdx,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.docIdx):(__oak_assgn_tgt.docIdx)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),0),persistAndRender(),focusPromptInput()))()},cloneDoc=function cloneDoc(doc=null){return ((__oak_acc_tgt)=>__oak_acc_tgt.parse!==undefined?__oak_acc_tgt.parse:null)(json)(((__oak_acc_tgt)=>__oak_acc_tgt.serialize!==undefined?__oak_acc_tgt.serialize:null)(json)(doc))},persistAndRender=function persistAndRender(){return (((__oak_acc_tgt)=>__oak_acc_tgt.persist!==undefined?__oak_acc_tgt.persist:null)(storage)(StateStorageKey,State),render())},(r=Renderer(__Oak_String(`#root`))),Link=function Link(text=null,link=null){return h(Symbol.for('a'),[],({target:__Oak_String(`_blank`),href:link}),[text])},render=function render(){return (((__oak_acc_tgt)=>__oak_acc_tgt.update!==undefined?__oak_acc_tgt.update:null)(r)(h(Symbol.for('div'),[__Oak_String(`app`),((__oak_cond)=>__oak_eq(__oak_cond,true)?__Oak_String(`sidebar-visible`):__Oak_String(`sidebar-hidden`))(((__oak_acc_tgt)=>__oak_acc_tgt.sidebar__oak_qm!==undefined?__oak_acc_tgt.sidebar__oak_qm:null)(State))],[h(Symbol.for('div'),[__Oak_String(`sidebar`)],[h(Symbol.for('div'),[__Oak_String(`logo`)],[h(Symbol.for('a'),[],({href:__Oak_String(`/`)}),[__Oak_String(`Calamity`),h(Symbol.for('span'),[__Oak_String(`logo-faded`)],[__Oak_String(`, an AI notebook`)])])]),h(Symbol.for('li'),[__Oak_String(`floating`),__Oak_String(`inactive`),__Oak_String(`docs-item`),__Oak_String(`new-doc-button`)],({}),({click:function _(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(sidebar__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.sidebar__oak_qm):(__oak_assgn_tgt.sidebar__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),false),insertDoc(({})))}}),[__Oak_String(`+ New prompt`)]),h(Symbol.for('div'),[__Oak_String(`docs-list-container`)],[h(Symbol.for('ul'),[__Oak_String(`docs-list`)],(map(((__oak_acc_tgt)=>__oak_acc_tgt.docs!==undefined?__oak_acc_tgt.docs:null)(State),function _(doc=null,i=null){return ((emptyPrompt__oak_qm)=>((emptyPrompt__oak_qm=__oak_eq(trim(((__oak_acc_tgt)=>__oak_acc_tgt.prompt!==undefined?__oak_acc_tgt.prompt:null)(doc)),__Oak_String(``))),h(Symbol.for('li'),[__Oak_String(`floating`),__Oak_String(`docs-item`),((__oak_cond)=>__oak_eq(__oak_cond,i)?__Oak_String(`active`):__Oak_String(`inactive`))(((__oak_acc_tgt)=>__oak_acc_tgt.docIdx!==undefined?__oak_acc_tgt.docIdx:null)(State)),((__oak_cond)=>__oak_eq(__oak_cond,emptyPrompt__oak_qm)?__Oak_String(`empty`):__Oak_String(``))(true),((__oak_cond)=>__oak_eq(__oak_cond,true)?__Oak_String(`favorited`):__Oak_String(``))(((__oak_acc_tgt)=>__oak_acc_tgt.fav!==undefined?__oak_acc_tgt.fav:null)(doc))],({title:((__oak_acc_tgt)=>__oak_acc_tgt.prompt!==undefined?__oak_acc_tgt.prompt:null)(doc)}),({click:function _(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(docIdx,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.docIdx):(__oak_assgn_tgt.docIdx)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),i),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(sidebar__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.sidebar__oak_qm):(__oak_assgn_tgt.sidebar__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),false),persistAndRender())}}),[h(Symbol.for('div'),[__Oak_String(`docs-item-content`)],[((__oak_cond)=>__oak_eq(__oak_cond,emptyPrompt__oak_qm)?__Oak_String(`empty`):truncate(((__oak_acc_tgt)=>__oak_acc_tgt.prompt!==undefined?__oak_acc_tgt.prompt:null)(doc),72))(true)]),h(Symbol.for('div'),[__Oak_String(`docs-item-meta`)],[((day,hour,min,month,year)=>(({year,month,day,hour,minute:min=null}=((__oak_acc_tgt)=>__oak_acc_tgt.describe!==undefined?__oak_acc_tgt.describe:null)(datetime)(((__oak_acc_tgt)=>__oak_acc_tgt.created!==undefined?__oak_acc_tgt.created:null)(doc))),((__oak_acc_tgt)=>__oak_acc_tgt.format!==undefined?__oak_acc_tgt.format:null)(fmt)(__Oak_String(`{{0}}/{{1}}/{{2}} {{3}}:{{4}}`),year,month,day,hour,padStart(string(min),2,__Oak_String(`0`)))))()])])))()})))]),h(Symbol.for('div'),[__Oak_String(`masthead`)],[h(Symbol.for('p'),[],[Link(__Oak_String(`Calamity`),__Oak_String(`https://github.com/thesephist/calamity`)),__Oak_String(` is a project by `),Link(__Oak_String(`Linus`),__Oak_String(`https://thesephist.com`)),__Oak_String(` built with `),Link(__Oak_String(`Oak`),__Oak_String(`https://oaklang.org/`)),__Oak_String(` and `),Link(__Oak_String(`Torus`),__Oak_String(`https://github.com/thesephist/torus`)),__Oak_String(`.`)])])]),h(Symbol.for('main'),[],[((prompt)=>((prompt=((__oak_acc_tgt)=>__oak_acc_tgt.prompt!==undefined?__oak_acc_tgt.prompt:null)(currentDoc())),h(Symbol.for('div'),[__Oak_String(`editor-container`)],[h(Symbol.for('div'),[__Oak_String(`floating`),__Oak_String(`inactive`),__Oak_String(`editor-shadow`),((__oak_cond)=>__oak_eq(__oak_cond,true)?__Oak_String(`extra-height`):__Oak_String(``))(endsWith__oak_qm(prompt,__Oak_String(`
`)))],[prompt]),h(Symbol.for('textarea'),[__Oak_String(`prompt-editor-input`),__Oak_String(`floating`),__Oak_String(`editor-itself`)],({value:prompt,placeholder:__Oak_String(`Start a prompt...`)}),({input:function _(evt=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(prompt,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.prompt):(__oak_assgn_tgt.prompt)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(currentDoc()),((__oak_acc_tgt)=>__oak_acc_tgt.value!==undefined?__oak_acc_tgt.value:null)(((__oak_acc_tgt)=>__oak_acc_tgt.target!==undefined?__oak_acc_tgt.target:null)(evt))),persistAndRender())},keydown:function _(evt=null){return ((__oak_cond)=>__oak_eq(__oak_cond,[__Oak_String(`Enter`),true])?updateCompletions():null)([((__oak_acc_tgt)=>__oak_acc_tgt.key!==undefined?__oak_acc_tgt.key:null)(evt),__oak_or(((__oak_acc_tgt)=>__oak_acc_tgt.ctrlKey!==undefined?__oak_acc_tgt.ctrlKey:null)(evt),((__oak_acc_tgt)=>__oak_acc_tgt.metaKey!==undefined?__oak_acc_tgt.metaKey:null)(evt))])}}),[])])))(),h(Symbol.for('div'),[__Oak_String(`ai-controls`)],[h(Symbol.for('div'),[__Oak_String(`ai-inputs`)],[h(Symbol.for('button'),[__Oak_String(`floating`),__Oak_String(`mobile`)],({title:__Oak_String(`More prompts`)}),({click:function _(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(sidebar__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.sidebar__oak_qm):(__oak_assgn_tgt.sidebar__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),!((__oak_acc_tgt)=>__oak_acc_tgt.sidebar__oak_qm!==undefined?__oak_acc_tgt.sidebar__oak_qm:null)(State)),render())}}),[__Oak_String(`☰`)]),h(Symbol.for('label'),[],[h(Symbol.for('span'),[__Oak_String(`label-text`)],[__Oak_String(`Tokens`)]),h(Symbol.for('input'),[__Oak_String(`floating`)],({type:__Oak_String(`number`),min:__Oak_String(`1`),max:__Oak_String(`200`),value:((__oak_acc_tgt)=>__oak_acc_tgt.tokens!==undefined?__oak_acc_tgt.tokens:null)(((__oak_acc_tgt)=>__oak_acc_tgt.params!==undefined?__oak_acc_tgt.params:null)(currentDoc()))}),({input:function _(evt=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(tokens,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.tokens):(__oak_assgn_tgt.tokens)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(((__oak_acc_tgt)=>__oak_acc_tgt.params!==undefined?__oak_acc_tgt.params:null)(currentDoc())),__oak_js_default(int(((__oak_acc_tgt)=>__oak_acc_tgt.value!==undefined?__oak_acc_tgt.value:null)(((__oak_acc_tgt)=>__oak_acc_tgt.target!==undefined?__oak_acc_tgt.target:null)(evt))),DefaultTokens)),persistAndRender())}}),[])]),h(Symbol.for('label'),[],[h(Symbol.for('span'),[__Oak_String(`label-text`),__Oak_String(`desktop`)],[__Oak_String(`Completions`)]),h(Symbol.for('span'),[__Oak_String(`label-text`),__Oak_String(`mobile`)],[__Oak_String(`Seqs`)]),h(Symbol.for('input'),[__Oak_String(`floating`)],({type:__Oak_String(`number`),min:__Oak_String(`1`),max:__Oak_String(`50`),value:((__oak_acc_tgt)=>__oak_acc_tgt.n!==undefined?__oak_acc_tgt.n:null)(((__oak_acc_tgt)=>__oak_acc_tgt.params!==undefined?__oak_acc_tgt.params:null)(currentDoc()))}),({input:function _(evt=null){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(n,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.n):(__oak_assgn_tgt.n)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(((__oak_acc_tgt)=>__oak_acc_tgt.params!==undefined?__oak_acc_tgt.params:null)(currentDoc())),__oak_js_default(int(((__oak_acc_tgt)=>__oak_acc_tgt.value!==undefined?__oak_acc_tgt.value:null)(((__oak_acc_tgt)=>__oak_acc_tgt.target!==undefined?__oak_acc_tgt.target:null)(evt))),DefaultN)),persistAndRender())}}),[])])]),h(Symbol.for('div'),[__Oak_String(`ai-buttons`)],[((__oak_cond)=>__oak_eq(__oak_cond,1)?null:h(Symbol.for('button'),[__Oak_String(`floating`),__Oak_String(`ai-delete-button`)],({title:__Oak_String(`Delete`)}),({click:function _(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(docs,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.docs):(__oak_assgn_tgt.docs)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),filter(((__oak_acc_tgt)=>__oak_acc_tgt.docs!==undefined?__oak_acc_tgt.docs:null)(State),function _(__oak_empty_ident0=null,i=null){return !__oak_eq(i,((__oak_acc_tgt)=>__oak_acc_tgt.docIdx!==undefined?__oak_acc_tgt.docIdx:null)(State))})),((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(sidebar__oak_qm,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.sidebar__oak_qm):(__oak_assgn_tgt.sidebar__oak_qm)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),true),((__oak_cond)=>__oak_eq(__oak_cond,null)?((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(docIdx,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.docIdx):(__oak_assgn_tgt.docIdx)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(State),0):null)(currentDoc()),persistAndRender())}}),[__Oak_String(`×`)]))(len(((__oak_acc_tgt)=>__oak_acc_tgt.docs!==undefined?__oak_acc_tgt.docs:null)(State))),h(Symbol.for('button'),[__Oak_String(`floating`),__Oak_String(`ai-clone-button`)],({}),({click:function _(){return insertDoc(cloneDoc(currentDoc()))}}),[__Oak_String(`Clone`)]),h(Symbol.for('button'),[__Oak_String(`floating`),__Oak_String(`ai-fav-button`),((__oak_cond)=>__oak_eq(__oak_cond,true)?__Oak_String(`favorited`):__Oak_String(``))(((__oak_acc_tgt)=>__oak_acc_tgt.fav!==undefined?__oak_acc_tgt.fav:null)(currentDoc()))],({title:__Oak_String(`Toggle favorite`)}),({click:function _(){return (((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(fav,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.fav):(__oak_assgn_tgt.fav)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(currentDoc()),__Oak_Empty):((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(fav,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.fav):(__oak_assgn_tgt.fav)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(currentDoc()),true))(((__oak_acc_tgt)=>__oak_acc_tgt.fav!==undefined?__oak_acc_tgt.fav:null)(currentDoc())),persistAndRender())}}),[]),h(Symbol.for('button'),[__Oak_String(`floating`),__Oak_String(`accent`),__Oak_String(`ai-generate-button`)],({disabled:__oak_eq(((__oak_acc_tgt)=>__oak_acc_tgt.fetching__oak_qm!==undefined?__oak_acc_tgt.fetching__oak_qm:null)(State),true)}),({click:updateCompletions}),[__Oak_String(`Generate`)])])]),h(Symbol.for('div'),[__Oak_String(`completions-container`)],(((__oak_cond)=>__oak_eq(__oak_cond,true)?[h(Symbol.for('div'),[__Oak_String(`completions-fetching`)],[h(Symbol.for('div'),[__Oak_String(`loading`)],[])])]:__oak_eq(__oak_cond,false)?map(((__oak_acc_tgt)=>__oak_acc_tgt.completions!==undefined?__oak_acc_tgt.completions:null)(currentDoc()),function _(completion=null){return ((generated,prompt)=>(([prompt,generated=null]=completion),h(Symbol.for('div'),[__Oak_String(`floating`),__Oak_String(`completion`)],({}),({click:function _(){return (((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign(prompt,__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt.prompt):(__oak_assgn_tgt.prompt)=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(currentDoc()),__as_oak_string(prompt+generated)),persistAndRender(),focusPromptInput())}}),[h(Symbol.for('span'),[__Oak_String(`completion-prompt`)],[prompt]),h(Symbol.for('span'),[__Oak_String(`completion-generated`)],[generated])])))()}):[h(Symbol.for('div'),[__Oak_String(`completions-error`)],[__Oak_String(`Error: `),((__oak_acc_tgt)=>__oak_acc_tgt.fetching__oak_qm!==undefined?__oak_acc_tgt.fetching__oak_qm:null)(State)])])(((__oak_acc_tgt)=>__oak_acc_tgt.fetching__oak_qm!==undefined?__oak_acc_tgt.fetching__oak_qm:null)(State))))])])))},render(),bind(window,Symbol.for('addEventListener'))(__Oak_String(`beforeunload`),function _(){return (((__oak_acc_tgt)=>__oak_acc_tgt.persistImmediately!==undefined?__oak_acc_tgt.persistImmediately:null)(storage)(StateStorageKey,State))}),({DefaultN,DefaultTokens,Link,Renderer,State,StateStorageKey,append,cloneDoc,currentDoc,datetime,__oak_js_default,endsWith__oak_qm,fetchCompletion,filter,fmt,focusPromptInput,h,insertDoc,json,map,merge,padStart,persistAndRender,println,r,render,slice,storage,trim,truncate,updateCompletions})))()}),__oak_modularize(__Oak_String(`datetime`),function _(){return ((DaysBeforeMonth,DaysFrom1To1970,DaysPer100Years,DaysPer400Years,DaysPer4Years,LeapDay,SecondsPerDay,ZeroYear,_describeClock,_describeDate,_parseTZOffset,__oak_js_default,describe,endsWith__oak_qm,fmtFormat,format,leap__oak_qm,map,merge,padEnd,padStart,parse,slice,split,strContains__oak_qm,strIndexOf,timestamp)=>(({__oak_js_default,slice,map,merge}=__oak_module_import(__Oak_String(`std`))),({endsWith__oak_qm,contains__oak_qm:strContains__oak_qm=null,indexOf:strIndexOf=null,padStart,padEnd,split}=__oak_module_import(__Oak_String(`str`))),({format:fmtFormat=null}=__oak_module_import(__Oak_String(`fmt`))),(LeapDay=__as_oak_string(31+28)),(SecondsPerDay=86400),(DaysPer4Years=__as_oak_string((365*4)+1)),(DaysPer100Years=((25*DaysPer4Years)-1)),(DaysPer400Years=__as_oak_string((DaysPer100Years*4)+1)),(ZeroYear=1),(DaysFrom1To1970=(((DaysPer400Years*5)-(365*31))-8)),(DaysBeforeMonth=[__Oak_Empty,0,31,__as_oak_string(31+28),__as_oak_string(__as_oak_string(31+28)+31),__as_oak_string(__as_oak_string(__as_oak_string(31+28)+31)+30),__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(31+28)+31)+30)+31),__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(31+28)+31)+30)+31)+30),__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(31+28)+31)+30)+31)+30)+31),__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(31+28)+31)+30)+31)+30)+31)+31),__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(31+28)+31)+30)+31)+30)+31)+31)+30),__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(31+28)+31)+30)+31)+30)+31)+31)+30)+31),__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(31+28)+31)+30)+31)+30)+31)+31)+30)+31)+30),__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(31+28)+31)+30)+31)+30)+31)+31)+30)+31)+30)+31)]),leap__oak_qm=function leap__oak_qm(year=null){return __oak_and(__oak_eq((year%4),0),(__oak_or(!__oak_eq((year%100),0),__oak_eq((year%400),0))))},_describeDate=function _describeDate(t=null){return ((d,day,leapYear__oak_qm,month,n,n100,n4,n400,year)=>((d=__as_oak_string(int((((t-(t%SecondsPerDay)))/SecondsPerDay))+DaysFrom1To1970)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(d=(d-1)):null)(__oak_and((t<0),!__oak_eq((t%86400),0))),(n400=int((d/DaysPer400Years))),(d=(d-(DaysPer400Years*n400))),(n100=int((d/DaysPer100Years))),(n100=(n100-int((n100/4)))),(d=(d-(DaysPer100Years*n100))),(n4=int((d/DaysPer4Years))),(d=(d-(DaysPer4Years*n4))),(n=int((d/365))),(n=(n-int((n/4)))),(d=(d-(365*n))),(year=__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string(ZeroYear+(400*n400))+(100*n100))+(4*n4))+n)),(month=0),(day=d),(leapYear__oak_qm=leap__oak_qm(year)),((__oak_cond)=>__oak_eq(__oak_cond,__oak_and(leapYear__oak_qm,__oak_eq(day,LeapDay)))?((month=2),(day=29)):((subMonth)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?(day=(day-1)):null)(__oak_and(leapYear__oak_qm,(day>LeapDay))),subMonth=function subMonth(m=null){return ((__oak_trampolined_subMonth)=>((__oak_trampolined_subMonth=function _(m=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?m:__oak_trampoline(__oak_trampolined_subMonth,__as_oak_string(m+1)))((day<__oak_acc(DaysBeforeMonth,__oak_obj_key((__as_oak_string(m+1))))))}),__oak_resolve_trampoline(__oak_trampolined_subMonth,m)))()},(month=subMonth(1)),(day=__as_oak_string((day-__oak_acc(DaysBeforeMonth,__oak_obj_key((month))))+1))))())(true),({year,month,day})))()},_describeClock=function _describeClock(t=null){return ((hour,minute,rem)=>((rem=(t%SecondsPerDay)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(rem=__as_oak_string(rem+SecondsPerDay)):null)((rem<0)),(hour=int((rem/3600))),(rem=(rem%3600)),(minute=int((rem/60))),({hour,minute,second:(rem%60)})))()},describe=function describe(t=null){return merge(_describeDate(t),_describeClock(t))},timestamp=function timestamp(desc=null){return ((day,daysFrom1,daysFrom1970,daysYearToDate,hour,leapYear__oak_qm,minute,month,n100,n4,n400,second,year)=>(({year,month,day,hour,minute,second}=desc),(leapYear__oak_qm=leap__oak_qm(year)),(year=(year-ZeroYear)),(n400=int((year/400))),(year=(year%400)),(n100=int((year/100))),(year=(year%100)),(n4=int((year/4))),(year=(year%4)),(daysYearToDate=((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,__oak_eq(month,1))?(__as_oak_string(__oak_acc(DaysBeforeMonth,__oak_obj_key((month)))+day)-1):__oak_eq(__oak_cond,__oak_and(__oak_eq(month,2),(day<29)))?(__as_oak_string(__oak_acc(DaysBeforeMonth,__oak_obj_key((month)))+day)-1):__oak_eq(__oak_cond,__oak_and(__oak_eq(month,2),__oak_eq(day,29)))?59:__as_oak_string(__oak_acc(DaysBeforeMonth,__oak_obj_key((month)))+day))(true):(__as_oak_string(__oak_acc(DaysBeforeMonth,__oak_obj_key((month)))+day)-1))(leapYear__oak_qm)),(daysFrom1=__as_oak_string(__as_oak_string(__as_oak_string(__as_oak_string((DaysPer400Years*n400)+(DaysPer100Years*n100))+(DaysPer4Years*n4))+(365*year))+daysYearToDate)),(daysFrom1970=(daysFrom1-DaysFrom1To1970)),__as_oak_string(__as_oak_string(__as_oak_string((daysFrom1970*SecondsPerDay)+(3600*hour))+(60*minute))+second)))()},format=function format(t=null,tzOffset=null){return ((day,hour,minute,month,second,year)=>((tzOffset=__oak_js_default(tzOffset,0)),({year,month,day,hour,minute,second}=describe(__as_oak_string(t+(tzOffset*60)))),fmtFormat(__Oak_String(`{{0}}-{{1}}-{{2}}T{{3}}:{{4}}:{{5}}{{6}}`),((__oak_cond)=>__oak_eq(__oak_cond,(year>9999))?padStart(string(year),6,__Oak_String(`0`)):__oak_eq(__oak_cond,(year<0))?__oak_push(__Oak_String(`-`),padStart(string(-year),6,__Oak_String(`0`))):padStart(string(year),4,__Oak_String(`0`)))(true),padStart(string(month),2,__Oak_String(`0`)),padStart(string(day),2,__Oak_String(`0`)),padStart(string(hour),2,__Oak_String(`0`)),padStart(string(minute),2,__Oak_String(`0`)),padStart(string(second),2,__Oak_String(`0`)),((__oak_cond)=>__oak_eq(__oak_cond,__oak_eq(tzOffset,0))?__Oak_String(`Z`):__oak_eq(__oak_cond,(tzOffset>0))?__oak_push(__Oak_String(`+`),fmtFormat(__Oak_String(`{{0}}:{{1}}`),padStart(string(int((tzOffset/60))),2,__Oak_String(`0`)),padStart(string((tzOffset%60)),2,__Oak_String(`0`)))):__oak_push(__Oak_String(`-`),fmtFormat(__Oak_String(`{{0}}:{{1}}`),padStart(string(int((-tzOffset/60))),2,__Oak_String(`0`)),padStart(string((-tzOffset%60)),2,__Oak_String(`0`)))))(true))))()},_parseTZOffset=function _parseTZOffset(offsetString=null){let hh;let mm;return ((__oak_cond)=>__oak_eq(__oak_cond,[])?null:__oak_eq(__oak_cond,[__Oak_Empty])?null:__oak_eq(__oak_cond,[null,__Oak_Empty])?null:__oak_eq(__oak_cond,[__Oak_Empty,null])?null:__as_oak_string((hh*60)+mm))(([hh,mm=null]=map(split(offsetString,__Oak_String(`:`)),int)))},parse=function parse(s=null){let clock;let date;let day;let hour;let minute;let month;let second;let year;return ((__oak_cond)=>__oak_eq(__oak_cond,[])?null:__oak_eq(__oak_cond,[__Oak_Empty])?null:__oak_eq(__oak_cond,[null,__Oak_Empty])?null:__oak_eq(__oak_cond,[__Oak_Empty,null])?null:((__oak_cond)=>__oak_eq(__oak_cond,[])?null:__oak_eq(__oak_cond,[__Oak_Empty])?null:__oak_eq(__oak_cond,[__Oak_Empty,__Oak_Empty])?null:__oak_eq(__oak_cond,[null,__Oak_Empty,__Oak_Empty])?null:__oak_eq(__oak_cond,[__Oak_Empty,null,__Oak_Empty])?null:__oak_eq(__oak_cond,[__Oak_Empty,__Oak_Empty,null])?null:((__oak_cond)=>__oak_eq(__oak_cond,[])?null:__oak_eq(__oak_cond,[__Oak_Empty])?null:__oak_eq(__oak_cond,[__Oak_Empty,__Oak_Empty])?null:__oak_eq(__oak_cond,[null,__Oak_Empty,__Oak_Empty])?null:__oak_eq(__oak_cond,[__Oak_Empty,null,__Oak_Empty])?null:__oak_eq(__oak_cond,[__Oak_Empty,__Oak_Empty,null])?null:((maybeMillis,parsed,tzOffset)=>(([__oak_empty_assgn_tgt,maybeMillis=null]=map(map(split(clock,__Oak_String(`.`)),function _(s=null){return slice(s,0,3)}),int)),(tzOffset=((__oak_cond)=>__oak_eq(__oak_cond,strContains__oak_qm(clock,__Oak_String(`+`)))?_parseTZOffset(slice(clock,__as_oak_string(strIndexOf(clock,__Oak_String(`+`))+1))):__oak_eq(__oak_cond,strContains__oak_qm(clock,__Oak_String(`-`)))?((__oak_cond)=>__oak_eq(__oak_cond,null)?null:-parsed)((parsed=_parseTZOffset(slice(clock,__as_oak_string(strIndexOf(clock,__Oak_String(`-`))+1))))):0)(true)),((__oak_cond)=>__oak_eq(__oak_cond,true)?({year,month,day,hour,minute,second,millis:__oak_js_default(maybeMillis,0),tzOffset}):null)(!__oak_eq(tzOffset,null))))())(([hour,minute,second=null]=map(split(slice(clock,0,8),__Oak_String(`:`)),int))))(([year,month,day=null]=map(split(date,__Oak_String(`-`)),int))))(([date,clock=null]=split(s,__Oak_String(`T`))))},({DaysBeforeMonth,DaysFrom1To1970,DaysPer100Years,DaysPer400Years,DaysPer4Years,LeapDay,SecondsPerDay,ZeroYear,_describeClock,_describeDate,_parseTZOffset,__oak_js_default,describe,endsWith__oak_qm,fmtFormat,format,leap__oak_qm,map,merge,padEnd,padStart,parse,slice,split,strContains__oak_qm,strIndexOf,timestamp})))()}),__oak_modularize(__Oak_String(`fmt`),function _(){return ((format,printf,println)=>(({println}=__oak_module_import(__Oak_String(`std`))),format=function format(raw=null,...values){return ((buf,key,sub,which)=>((which=0),(key=__Oak_String(``)),(buf=__Oak_String(``)),sub=function sub(idx=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(idx=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((c)=>((c=__oak_acc(raw,__oak_obj_key((idx)))),((__oak_cond)=>__oak_eq(__oak_cond,0)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`{`))?(which=1):__oak_push(buf,c))(c):__oak_eq(__oak_cond,1)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`{`))?(which=2):(__oak_push(__oak_push(buf,__Oak_String(`{`)),c),(which=0)))(c):__oak_eq(__oak_cond,2)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`}`))?((index)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(buf,string(__oak_acc(values,__oak_obj_key((int(key)))))):null)(!__oak_eq(null,(index=int(key)))),(key=__Oak_String(``)),(which=3)))():__oak_eq(__oak_cond,__Oak_String(` `))?null:__oak_eq(__oak_cond,__Oak_String(`	`))?null:(key=__as_oak_string(key+c)))(c):__oak_eq(__oak_cond,3)?((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`}`))?(which=0):null)(c):null)(which),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(idx+1))))():buf)((idx<len(raw)))}),__oak_resolve_trampoline(__oak_trampolined_sub,idx)))()},sub(0)))()},printf=function printf(raw=null,...values){return println(format(raw,...values))},({format,printf,println})))()}),__oak_modularize(__Oak_String(`json`),function _(){return ((Reader,_parseReader,__oak_js_default,esc,escape,join,map,parse,parseFalse,parseList,parseNull,parseNumber,parseObject,parseString,parseTrue,serialize,slice,space__oak_qm)=>(({__oak_js_default,slice,map}=__oak_module_import(__Oak_String(`std`))),({space__oak_qm,join}=__oak_module_import(__Oak_String(`str`))),esc=function esc(c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`	`))?__Oak_String(`\\t`):__oak_eq(__oak_cond,__Oak_String(`
`))?__Oak_String(`\\n`):__oak_eq(__oak_cond,__Oak_String(``))?__Oak_String(`\\r`):__oak_eq(__oak_cond,__Oak_String(``))?__Oak_String(`\\f`):__oak_eq(__oak_cond,__Oak_String(`"`))?__Oak_String(`\\"`):__oak_eq(__oak_cond,__Oak_String(`\\`))?__Oak_String(`\\\\`):c)(c)},escape=function escape(s=null){return ((max,sub)=>((max=len(s)),sub=function sub(i=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null,acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1),__oak_push(acc,esc(__oak_acc(s,__oak_obj_key((i)))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i,acc)))()},sub(0,__Oak_String(``))))()},serialize=function serialize(c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('null'))?__Oak_String(`null`):__oak_eq(__oak_cond,Symbol.for('empty'))?__Oak_String(`null`):__oak_eq(__oak_cond,Symbol.for('function'))?__Oak_String(`null`):__oak_eq(__oak_cond,Symbol.for('string'))?__oak_push(__oak_push(__Oak_String(`"`),escape(c)),__Oak_String(`"`)):__oak_eq(__oak_cond,Symbol.for('atom'))?__oak_push(__oak_push(__Oak_String(`"`),string(c)),__Oak_String(`"`)):__oak_eq(__oak_cond,Symbol.for('int'))?string(c):__oak_eq(__oak_cond,Symbol.for('float'))?string(c):__oak_eq(__oak_cond,Symbol.for('bool'))?string(c):__oak_eq(__oak_cond,Symbol.for('list'))?__oak_push(__oak_push(__Oak_String(`[`),join(map(c,serialize),__Oak_String(`,`))),__Oak_String(`]`)):__oak_eq(__oak_cond,Symbol.for('object'))?__oak_push(__oak_push(__Oak_String(`{`),join(map(keys(c),function _(k=null){return __oak_push(__oak_push(__oak_push(__Oak_String(`"`),escape(k)),__Oak_String(`":`)),serialize(__oak_acc(c,__oak_obj_key((k)))))}),__Oak_String(`,`))),__Oak_String(`}`)):null)(type(c))},Reader=function Reader(s=null){return ((err__oak_qm,forward,index,next,nextWord,peek)=>((index=0),(err__oak_qm=false),next=function next(){return ((index=__as_oak_string(index+1)),__oak_js_default(__oak_acc(s,__oak_obj_key(((index-1)))),__Oak_String(``)))},peek=function peek(){return __oak_js_default(__oak_acc(s,__oak_obj_key((index))),__Oak_String(``))},nextWord=function nextWord(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((index=len(s)),null):((word)=>((word=slice(s,index,__as_oak_string(index+n))),(index=__as_oak_string(index+n)),word))())((__as_oak_string(index+n)>len(s)))},forward=function forward(){return ((sub)=>(sub=function sub(){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((index=__as_oak_string(index+1)),__oak_trampoline(__oak_trampolined_sub)):null)(space__oak_qm(peek()))}),__oak_resolve_trampoline(__oak_trampolined_sub)))()},sub()))()},({next,peek,forward,nextWord,done__oak_qm:function _(){return (index>=len(s))},err__oak_exclam:function _(){return ((err__oak_qm=true),Symbol.for('error'))},err__oak_qm:function _(){return err__oak_qm}})))()},parseNull=function parseNull(r=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`null`))?null:((__oak_acc_tgt)=>__oak_acc_tgt.err__oak_exclam!==undefined?__oak_acc_tgt.err__oak_exclam:null)(r)())(((__oak_acc_tgt)=>__oak_acc_tgt.nextWord!==undefined?__oak_acc_tgt.nextWord:null)(r)(4))},parseString=function parseString(r=null){return ((next,sub)=>((next=((__oak_acc_tgt)=>__oak_acc_tgt.next!==undefined?__oak_acc_tgt.next:null)(r)),next(),sub=function sub(acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null){let c;return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?((__oak_acc_tgt)=>__oak_acc_tgt.err__oak_exclam!==undefined?__oak_acc_tgt.err__oak_exclam:null)(r)():__oak_eq(__oak_cond,__Oak_String(`\\`))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`t`))?__Oak_String(`	`):__oak_eq(__oak_cond,__Oak_String(`n`))?__Oak_String(`
`):__oak_eq(__oak_cond,__Oak_String(`r`))?__Oak_String(``):__oak_eq(__oak_cond,__Oak_String(`f`))?__Oak_String(``):__oak_eq(__oak_cond,__Oak_String(`"`))?__Oak_String(`"`):c)((c=next())))):__oak_eq(__oak_cond,__Oak_String(`"`))?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,c)))((c=next()))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc)))()},sub(__Oak_String(``))))()},parseNumber=function parseNumber(r=null){return ((decimal__oak_qm,negate__oak_qm,next,parsed,peek,result,sub)=>((peek=((__oak_acc_tgt)=>__oak_acc_tgt.peek!==undefined?__oak_acc_tgt.peek:null)(r)),(next=((__oak_acc_tgt)=>__oak_acc_tgt.next!==undefined?__oak_acc_tgt.next:null)(r)),(decimal__oak_qm=false),(negate__oak_qm=((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`-`))?(next(),true):false)(peek())),sub=function sub(acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`.`))?((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_acc_tgt)=>__oak_acc_tgt.err__oak_exclam!==undefined?__oak_acc_tgt.err__oak_exclam:null)(r)():((decimal__oak_qm=true),__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next()))))(decimal__oak_qm):__oak_eq(__oak_cond,__Oak_String(`0`))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String(`1`))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String(`2`))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String(`3`))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String(`4`))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String(`5`))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String(`6`))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String(`7`))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String(`8`))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):__oak_eq(__oak_cond,__Oak_String(`9`))?__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,next())):acc)(peek())}),__oak_resolve_trampoline(__oak_trampolined_sub,acc)))()},(result=sub(__Oak_String(``))),((__oak_cond)=>__oak_eq(__oak_cond,null)?Symbol.for('error'):((__oak_cond)=>__oak_eq(__oak_cond,true)?-parsed:parsed)(negate__oak_qm))((parsed=((__oak_cond)=>__oak_eq(__oak_cond,true)?float(result):int(result))(decimal__oak_qm)))))()},parseTrue=function parseTrue(r=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`true`))?true:((__oak_acc_tgt)=>__oak_acc_tgt.err__oak_exclam!==undefined?__oak_acc_tgt.err__oak_exclam:null)(r)())(((__oak_acc_tgt)=>__oak_acc_tgt.nextWord!==undefined?__oak_acc_tgt.nextWord:null)(r)(4))},parseFalse=function parseFalse(r=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`false`))?false:((__oak_acc_tgt)=>__oak_acc_tgt.err__oak_exclam!==undefined?__oak_acc_tgt.err__oak_exclam:null)(r)())(((__oak_acc_tgt)=>__oak_acc_tgt.nextWord!==undefined?__oak_acc_tgt.nextWord:null)(r)(5))},parseList=function parseList(r=null){return ((err__oak_qm,forward,next,peek,sub)=>((err__oak_qm=((__oak_acc_tgt)=>__oak_acc_tgt.err__oak_qm!==undefined?__oak_acc_tgt.err__oak_qm:null)(r)),(peek=((__oak_acc_tgt)=>__oak_acc_tgt.peek!==undefined?__oak_acc_tgt.peek:null)(r)),(next=((__oak_acc_tgt)=>__oak_acc_tgt.next!==undefined?__oak_acc_tgt.next:null)(r)),(forward=((__oak_acc_tgt)=>__oak_acc_tgt.forward!==undefined?__oak_acc_tgt.forward:null)(r)),next(),forward(),sub=function sub(acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?Symbol.for('error'):((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?((__oak_acc_tgt)=>__oak_acc_tgt.err__oak_exclam!==undefined?__oak_acc_tgt.err__oak_exclam:null)(r)():__oak_eq(__oak_cond,__Oak_String(`]`))?(next(),acc):(__oak_push(acc,_parseReader(r)),forward(),((__oak_cond)=>__oak_eq(__oak_cond,true)?next():null)(__oak_eq(peek(),__Oak_String(`,`))),forward(),__oak_trampoline(__oak_trampolined_sub,acc)))(peek()))(err__oak_qm())}),__oak_resolve_trampoline(__oak_trampolined_sub,acc)))()},sub([])))()},parseObject=function parseObject(r=null){return ((err__oak_qm,forward,next,peek,sub)=>((err__oak_qm=((__oak_acc_tgt)=>__oak_acc_tgt.err__oak_qm!==undefined?__oak_acc_tgt.err__oak_qm:null)(r)),(peek=((__oak_acc_tgt)=>__oak_acc_tgt.peek!==undefined?__oak_acc_tgt.peek:null)(r)),(next=((__oak_acc_tgt)=>__oak_acc_tgt.next!==undefined?__oak_acc_tgt.next:null)(r)),(forward=((__oak_acc_tgt)=>__oak_acc_tgt.forward!==undefined?__oak_acc_tgt.forward:null)(r)),next(),forward(),sub=function sub(acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?Symbol.for('error'):((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?((__oak_acc_tgt)=>__oak_acc_tgt.err__oak_exclam!==undefined?__oak_acc_tgt.err__oak_exclam:null)(r)():__oak_eq(__oak_cond,__Oak_String(`}`))?(next(),acc):((key)=>((key=parseString(r)),((__oak_cond)=>__oak_eq(__oak_cond,true)?((val)=>(forward(),((__oak_cond)=>__oak_eq(__oak_cond,true)?next():null)(__oak_eq(peek(),__Oak_String(`:`))),(val=_parseReader(r)),((__oak_cond)=>__oak_eq(__oak_cond,true)?(forward(),((__oak_cond)=>__oak_eq(__oak_cond,true)?next():null)(__oak_eq(peek(),__Oak_String(`,`))),forward(),__oak_trampoline(__oak_trampolined_sub,((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((key),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((key))]):(__oak_assgn_tgt[__oak_obj_key((key))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(acc),val))):null)(!err__oak_qm())))():null)(!err__oak_qm())))())(peek()))(err__oak_qm())}),__oak_resolve_trampoline(__oak_trampolined_sub,acc)))()},sub(({}))))()},_parseReader=function _parseReader(r=null){return ((result)=>(((__oak_acc_tgt)=>__oak_acc_tgt.forward!==undefined?__oak_acc_tgt.forward:null)(r)(),(result=((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(`n`))?parseNull(r):__oak_eq(__oak_cond,__Oak_String(`"`))?parseString(r):__oak_eq(__oak_cond,__Oak_String(`t`))?parseTrue(r):__oak_eq(__oak_cond,__Oak_String(`f`))?parseFalse(r):__oak_eq(__oak_cond,__Oak_String(`[`))?parseList(r):__oak_eq(__oak_cond,__Oak_String(`{`))?parseObject(r):parseNumber(r))(((__oak_acc_tgt)=>__oak_acc_tgt.peek!==undefined?__oak_acc_tgt.peek:null)(r)())),((__oak_cond)=>__oak_eq(__oak_cond,true)?Symbol.for('error'):result)(((__oak_acc_tgt)=>__oak_acc_tgt.err__oak_qm!==undefined?__oak_acc_tgt.err__oak_qm:null)(r)())))()},parse=function parse(s=null){return _parseReader(Reader(s))},({Reader,_parseReader,__oak_js_default,esc,escape,join,map,parse,parseFalse,parseList,parseNull,parseNumber,parseObject,parseString,parseTrue,serialize,slice,space__oak_qm})))()}),__oak_modularize(__Oak_String(`std`),function _(){return ((_asPredicate,_baseIterator,_hToN,_nToH,append,clamp,clone,compact,contains__oak_qm,debounce,__oak_js_default,each,entries,every,filter,find,first,flatten,fromHex,identity,indexOf,join,last,loop,map,merge,once,partition,println,range,reduce,reverse,slice,some,toHex,uniq,values,zip)=>(identity=function identity(x=null){return x},_baseIterator=function _baseIterator(v=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?__Oak_String(``):__oak_eq(__oak_cond,Symbol.for('list'))?[]:__oak_eq(__oak_cond,Symbol.for('object'))?({}):null)(type(v))},_asPredicate=function _asPredicate(pred=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('atom'))?((prop)=>((prop=string(pred)),function _(x=null){return __oak_acc(x,__oak_obj_key((prop)))}))():__oak_eq(__oak_cond,Symbol.for('string'))?function _(x=null){return __oak_acc(x,__oak_obj_key((pred)))}:__oak_eq(__oak_cond,Symbol.for('int'))?function _(x=null){return __oak_acc(x,__oak_obj_key((pred)))}:pred)(type(pred))},__oak_js_default=function __oak_js_default(x=null,base=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?base:x)(x)},(_nToH=__Oak_String(`0123456789abcdef`)),toHex=function toHex(n=null){return ((sub)=>(sub=function sub(p=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(p=null,acc=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__as_oak_string(__oak_acc(_nToH,__oak_obj_key((p)))+acc):__oak_trampoline(__oak_trampolined_sub,int((p/16)),__as_oak_string(__oak_acc(_nToH,__oak_obj_key(((p%16))))+acc)))((p<16))}),__oak_resolve_trampoline(__oak_trampolined_sub,p,acc)))()},sub(int(n),__Oak_String(``))))()},(_hToN=({0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,a:10,A:10,b:11,B:11,c:12,C:12,d:13,D:13,e:14,E:14,f:15,F:15})),fromHex=function fromHex(s=null){return ((sub)=>(sub=function sub(i=null,acc=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null,acc=null){let next;return ((__oak_cond)=>__oak_eq(__oak_cond,__oak_eq(i,len(s)))?acc:__oak_eq(__oak_cond,!__oak_eq(null,(next=__oak_acc(_hToN,__oak_obj_key((__oak_acc(s,__oak_obj_key((i)))))))))?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1),__as_oak_string((acc*16)+next)):null)(true)}),__oak_resolve_trampoline(__oak_trampolined_sub,i,acc)))()},sub(0,0)))()},clamp=function clamp(min=null,max=null,n=null,m=null){return ((n=((__oak_cond)=>__oak_eq(__oak_cond,true)?min:n)((n<min))),(m=((__oak_cond)=>__oak_eq(__oak_cond,true)?min:m)((m<min))),(m=((__oak_cond)=>__oak_eq(__oak_cond,true)?max:m)((m>max))),(n=((__oak_cond)=>__oak_eq(__oak_cond,true)?m:n)((n>m))),[n,m])},slice=function slice(xs=null,min=null,max=null){return ((sub)=>((min=__oak_js_default(min,0)),(max=__oak_js_default(max,len(xs))),([min,max=null]=clamp(0,len(xs),min,max)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,__oak_acc(xs,__oak_obj_key((i)))),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),min)))()},clone=function clone(x=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('string'))?__as_oak_string(__Oak_String(``)+x):__oak_eq(__oak_cond,Symbol.for('list'))?slice(x):__oak_eq(__oak_cond,Symbol.for('object'))?reduce(keys(x),({}),function _(acc=null,key=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((key),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((key))]):(__oak_assgn_tgt[__oak_obj_key((key))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(acc),__oak_acc(x,__oak_obj_key((key))))}):x)(type(x))},append=function append(xs=null,ys=null){return ((xlen)=>((xlen=len(xs)),each(ys,function _(y=null,i=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((__as_oak_string(xlen+i)),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((__as_oak_string(xlen+i)))]):(__oak_assgn_tgt[__oak_obj_key((__as_oak_string(xlen+i)))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(xs),y)}),xs))()},join=function join(xs=null,ys=null){return append(clone(xs),ys)},range=function range(start=null,end=null,step=null){return ((step=__oak_js_default(step,1)),((__oak_cond)=>__oak_eq(__oak_cond,true)?([start,end=null]=[0,start]):null)(__oak_eq(end,null)),((__oak_cond)=>__oak_eq(__oak_cond,true)?[]:((list,sub)=>((list=[]),((__oak_cond)=>__oak_eq(__oak_cond,true)?sub=function sub(n=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(list,n),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(n+step))):list)((n<end))}),__oak_resolve_trampoline(__oak_trampolined_sub,n)))()}:sub=function sub(n=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(n=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(list,n),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(n+step))):list)((n>end))}),__oak_resolve_trampoline(__oak_trampolined_sub,n)))()})((step>0)),sub(start)))())(__oak_eq(step,0)))},reverse=function reverse(xs=null){return ((sub)=>(sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,__oak_acc(xs,__oak_obj_key((i)))),(i-1)))((i<0))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),(len(xs)-1))))()},map=function map(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,f(__oak_acc(xs,__oak_obj_key((i))),i)),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},each=function each(xs=null,f=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?null:(f(__oak_acc(xs,__oak_obj_key((i))),i),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},filter=function filter(xs=null,f=null){return ((sub)=>((f=_asPredicate(f)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:((x)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,x):null)(f((x=__oak_acc(xs,__oak_obj_key((i)))),i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1))))())(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(_baseIterator(xs),0)))()},reduce=function reduce(xs=null,seed=null,f=null){return ((sub)=>(sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?acc:__oak_trampoline(__oak_trampolined_sub,f(acc,__oak_acc(xs,__oak_obj_key((i))),i),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(seed,0)))()},flatten=function flatten(xs=null){return reduce(xs,[],append)},compact=function compact(xs=null){return filter(xs,function _(x=null){return !__oak_eq(x,null)})},some=function some(xs=null,pred=null){return ((pred=__oak_js_default(pred,identity)),reduce(xs,false,function _(acc=null,x=null,i=null){return __oak_or(acc,pred(x,i))}))},every=function every(xs=null,pred=null){return ((pred=__oak_js_default(pred,identity)),reduce(xs,true,function _(acc=null,x=null,i=null){return __oak_and(acc,pred(x,i))}))},zip=function zip(xs=null,ys=null,zipper=null){return ((max,sub)=>((zipper=__oak_js_default(zipper,function _(x=null,y=null){return [x,y]})),(max=((__oak_cond)=>__oak_eq(__oak_cond,true)?len(xs):len(ys))((len(xs)<len(ys)))),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?acc:__oak_trampoline(__oak_trampolined_sub,__oak_push(acc,zipper(__oak_acc(xs,__oak_obj_key((i))),__oak_acc(ys,__oak_obj_key((i))),i)),__as_oak_string(i+1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub([],0)))()},partition=function partition(xs=null,by=null){return ((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('int'))?reduce(xs,[],function _(acc=null,x=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?__oak_push(acc,[x]):(__oak_push(__oak_acc(acc,__oak_obj_key(((len(acc)-1)))),x),acc))((i%by))}):__oak_eq(__oak_cond,Symbol.for('function'))?((last)=>((last=function _(){return null}),reduce(xs,[],function _(acc=null,x=null){return ((__oak_js_this)=>(((__oak_cond)=>__oak_eq(__oak_cond,last)?__oak_push(__oak_acc(acc,__oak_obj_key(((len(acc)-1)))),x):__oak_push(acc,[x]))((__oak_js_this=by(x))),(last=__oak_js_this),acc))()})))():null)(type(by))},uniq=function uniq(xs=null,pred=null){return ((last,sub,ys)=>((pred=__oak_js_default(pred,identity)),(ys=_baseIterator(xs)),(last=function _(){return null}),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){let p;let x;return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?ys:((__oak_cond)=>__oak_eq(__oak_cond,last)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):(__oak_push(ys,x),(last=p),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1))))((p=pred((x=__oak_acc(xs,__oak_obj_key((i))))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},first=function first(xs=null){return __oak_acc(xs,0)},last=function last(xs=null){return __oak_acc(xs,__oak_obj_key(((len(xs)-1))))},find=function find(xs=null,pred=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?-1:((__oak_cond)=>__oak_eq(__oak_cond,true)?i:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)))(pred(__oak_acc(xs,__oak_obj_key((i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},indexOf=function indexOf(xs=null,x=null){return ((sub)=>(sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,len(xs))?-1:((__oak_cond)=>__oak_eq(__oak_cond,x)?i:__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)))(__oak_acc(xs,__oak_obj_key((i)))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},contains__oak_qm=function contains__oak_qm(xs=null,x=null){return (indexOf(xs,x)>-1)},values=function values(obj=null){return map(keys(obj),function _(key=null){return __oak_acc(obj,__oak_obj_key((key)))})},entries=function entries(obj=null){return map(keys(obj),function _(key=null){return [key,__oak_acc(obj,__oak_obj_key((key)))]})},merge=function merge(...os){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?null:reduce(os,__oak_acc(os,0),function _(acc=null,o=null){return (reduce(keys(o),acc,function _(root=null,k=null){return ((__oak_assgn_tgt,__oak_assgn_val)=>(__is_oak_string(__oak_assgn_tgt)?__oak_assgn_tgt.assign((k),__oak_assgn_val):__oak_assgn_val===__Oak_Empty?delete (__oak_assgn_tgt[__oak_obj_key((k))]):(__oak_assgn_tgt[__oak_obj_key((k))])=__oak_assgn_val,__oak_assgn_tgt))(__as_oak_string(root),__oak_acc(o,__oak_obj_key((k))))}))}))(len(os))},once=function once(f=null){return ((called__oak_qm)=>((called__oak_qm=false),function _(...args){return ((__oak_cond)=>__oak_eq(__oak_cond,called__oak_qm)?null:((called__oak_qm=true),f(...args)))(true)}))()},loop=function loop(max=null,f=null){return ((breaker,broken,sub)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?((f=max),(max=-1)):null)(__oak_eq(f,null)),(max=__oak_js_default(max,-1)),(broken=false),breaker=function breaker(){return (broken=true)},sub=function sub(count=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(count=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?null:((__oak_cond)=>__oak_eq(__oak_cond,true)?null:(f(count,breaker),__oak_trampoline(__oak_trampolined_sub,__as_oak_string(count+1))))(broken))(count)}),__oak_resolve_trampoline(__oak_trampolined_sub,count)))()},sub(0)))()},debounce=function debounce(duration=null,firstCall=null,f=null){return ((dargs,debounced,target,waiting__oak_qm)=>(((__oak_cond)=>__oak_eq(__oak_cond,true)?([firstCall,f=null]=[Symbol.for('trailing'),firstCall]):null)(__oak_eq(f,null)),(dargs=null),(waiting__oak_qm=false),(target=(time()-duration)),debounced=function debounced(...args){return ((tcall)=>((tcall=time()),(dargs=args),((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?((target=__as_oak_string(tcall+duration)),((__oak_cond)=>__oak_eq(__oak_cond,Symbol.for('leading'))?f(...dargs):__oak_eq(__oak_cond,Symbol.for('trailing'))?((waiting__oak_qm=true),wait((target-time()),function _(){return ((waiting__oak_qm=false),f(...dargs))})):null)(firstCall)):((timeout)=>((waiting__oak_qm=true),(timeout=(target-tcall)),(target=__as_oak_string(target+duration)),wait(timeout,function _(){return ((waiting__oak_qm=false),f(...dargs))})))())((target<=tcall)):null)(!waiting__oak_qm)))()}))()},println=function println(...xs){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?print(__Oak_String(`
`)):((out)=>((out=reduce(slice(xs,1),string(__oak_acc(xs,0)),function _(acc=null,x=null){return (__as_oak_string(__as_oak_string(acc+__Oak_String(` `))+string(x)))})),print(__as_oak_string(out+__Oak_String(`
`)))))())(len(xs))},({_asPredicate,_baseIterator,_hToN,_nToH,append,clamp,clone,compact,contains__oak_qm,debounce,__oak_js_default,each,entries,every,filter,find,first,flatten,fromHex,identity,indexOf,join,last,loop,map,merge,once,partition,println,range,reduce,reverse,slice,some,toHex,uniq,values,zip})))()}),__oak_modularize(__Oak_String(`str`),function _(){return ((_extend,_matchesAt__oak_qm,_replaceNonEmpty,_splitNonEmpty,_trimEndNonEmpty,_trimSpace,_trimStartNonEmpty,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,endsWith__oak_qm,indexOf,join,letter__oak_qm,lower,lower__oak_qm,padEnd,padStart,reduce,replace,slice,space__oak_qm,split,startsWith__oak_qm,trim,trimEnd,trimStart,upper,upper__oak_qm,word__oak_qm)=>(({__oak_js_default,slice,reduce}=__oak_module_import(__Oak_String(`std`))),checkRange=function checkRange(lo=null,hi=null){let checker;return checker=function checker(c=null){return ((p)=>((p=codepoint(c)),__oak_and((lo<=p),(p<=hi))))()}},upper__oak_qm=function upper__oak_qm(c=null){return __oak_and((c>=__Oak_String(`A`)),(c<=__Oak_String(`Z`)))},lower__oak_qm=function lower__oak_qm(c=null){return __oak_and((c>=__Oak_String(`a`)),(c<=__Oak_String(`z`)))},digit__oak_qm=function digit__oak_qm(c=null){return __oak_and((c>=__Oak_String(`0`)),(c<=__Oak_String(`9`)))},space__oak_qm=function space__oak_qm(c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(` `))?true:__oak_eq(__oak_cond,__Oak_String(`	`))?true:__oak_eq(__oak_cond,__Oak_String(`
`))?true:__oak_eq(__oak_cond,__Oak_String(``))?true:__oak_eq(__oak_cond,__Oak_String(``))?true:false)(c)},letter__oak_qm=function letter__oak_qm(c=null){return __oak_or(upper__oak_qm(c),lower__oak_qm(c))},word__oak_qm=function word__oak_qm(c=null){return __oak_or(letter__oak_qm(c),digit__oak_qm(c))},join=function join(strings=null,joiner=null){return ((joiner=__oak_js_default(joiner,__Oak_String(``))),((__oak_cond)=>__oak_eq(__oak_cond,0)?__Oak_String(``):reduce(slice(strings,1),__oak_acc(strings,0),function _(a=null,b=null){return __as_oak_string(__as_oak_string(a+joiner)+b)}))(len(strings)))},startsWith__oak_qm=function startsWith__oak_qm(s=null,prefix=null){return __oak_eq(slice(s,0,len(prefix)),prefix)},endsWith__oak_qm=function endsWith__oak_qm(s=null,suffix=null){return __oak_eq(slice(s,(len(s)-len(suffix))),suffix)},_matchesAt__oak_qm=function _matchesAt__oak_qm(s=null,substr=null,idx=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?true:__oak_eq(__oak_cond,1)?__oak_eq(__oak_acc(s,__oak_obj_key((idx))),substr):((max,sub)=>((max=len(substr)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,max)?true:((__oak_cond)=>__oak_eq(__oak_cond,__oak_acc(substr,__oak_obj_key((i))))?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):false)(__oak_acc(s,__oak_obj_key((__as_oak_string(idx+i))))))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))())(len(substr))},indexOf=function indexOf(s=null,substr=null){return ((max,sub)=>((max=(len(s)-len(substr))),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?i:((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+1)):-1)((i<max)))(_matchesAt__oak_qm(s,substr,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},sub(0)))()},contains__oak_qm=function contains__oak_qm(s=null,substr=null){return (indexOf(s,substr)>=0)},cut=function cut(s=null,sep=null){let idx;return ((__oak_cond)=>__oak_eq(__oak_cond,-1)?[s,__Oak_String(``)]:[slice(s,0,idx),slice(s,__as_oak_string(idx+len(sep)))])((idx=indexOf(s,sep)))},lower=function lower(s=null){return reduce(s,__Oak_String(``),function _(acc=null,c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,char(__as_oak_string(codepoint(c)+32))):__oak_push(acc,c))(upper__oak_qm(c))})},upper=function upper(s=null){return reduce(s,__Oak_String(``),function _(acc=null,c=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_push(acc,char((codepoint(c)-32))):__oak_push(acc,c))(lower__oak_qm(c))})},_replaceNonEmpty=function _replaceNonEmpty(s=null,old=null,__oak_js_new=null){return ((lnew,lold,sub)=>((lold=len(old)),(lnew=len(__oak_js_new)),sub=function sub(acc=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(__as_oak_string(slice(acc,0,i)+__oak_js_new)+slice(acc,__as_oak_string(i+lold))),__as_oak_string(i+lnew)):((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1)):acc)((i<len(acc))))(_matchesAt__oak_qm(acc,old,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i)))()},sub(s,0)))()},replace=function replace(s=null,old=null,__oak_js_new=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?s:_replaceNonEmpty(s,old,__oak_js_new))(old)},_splitNonEmpty=function _splitNonEmpty(s=null,sep=null){return ((coll,lsep,sub)=>((coll=[]),(lsep=len(sep)),sub=function sub(acc=null,i=null,last=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(acc=null,i=null,last=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?(__oak_push(coll,slice(acc,last,i)),__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+lsep),__as_oak_string(i+lsep))):((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,acc,__as_oak_string(i+1),last):__oak_push(coll,slice(acc,last)))((i<len(acc))))(_matchesAt__oak_qm(acc,sep,i))}),__oak_resolve_trampoline(__oak_trampolined_sub,acc,i,last)))()},sub(s,0,0)))()},split=function split(s=null,sep=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?reduce(s,[],function _(acc=null,c=null){return __oak_push(acc,c)}):__oak_eq(__oak_cond,__Oak_String(``))?reduce(s,[],function _(acc=null,c=null){return __oak_push(acc,c)}):_splitNonEmpty(s,sep))(sep)},_extend=function _extend(pad=null,n=null){return ((part,sub,times)=>((times=int((n/len(pad)))),(part=(n%len(pad))),sub=function sub(base=null,i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(base=null,i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,0)?__oak_push(base,slice(pad,0,part)):__oak_trampoline(__oak_trampolined_sub,__oak_push(base,pad),(i-1)))(i)}),__oak_resolve_trampoline(__oak_trampolined_sub,base,i)))()},sub(__Oak_String(``),times)))()},padStart=function padStart(s=null,n=null,pad=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?s:__oak_push(_extend(pad,(n-len(s))),s))((len(s)>=n))},padEnd=function padEnd(s=null,n=null,pad=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?s:__as_oak_string(s+_extend(pad,(n-len(s)))))((len(s)>=n))},_trimStartNonEmpty=function _trimStartNonEmpty(s=null,prefix=null){return ((idx,lpref,max,sub)=>((max=len(s)),(lpref=len(prefix)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,__as_oak_string(i+lpref)):i)(_matchesAt__oak_qm(s,prefix,i)):i)((i<max))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},(idx=sub(0)),slice(s,idx)))()},trimStart=function trimStart(s=null,prefix=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?s:_trimStartNonEmpty(s,prefix))(prefix)},_trimEndNonEmpty=function _trimEndNonEmpty(s=null,suffix=null){return ((idx,lsuf,sub)=>((lsuf=len(suffix)),sub=function sub(i=null){return ((__oak_trampolined_sub)=>((__oak_trampolined_sub=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_sub,(i-lsuf)):i)(_matchesAt__oak_qm(s,suffix,(i-lsuf))):i)((i>-1))}),__oak_resolve_trampoline(__oak_trampolined_sub,i)))()},(idx=sub(len(s))),slice(s,0,idx)))()},trimEnd=function trimEnd(s=null,suffix=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?s:_trimEndNonEmpty(s,suffix))(suffix)},_trimSpace=function _trimSpace(s=null){return ((__oak_cond)=>__oak_eq(__oak_cond,__Oak_String(``))?s:((firstNonSpace,lastNonSpace,subEnd,subStart)=>(subStart=function subStart(i=null){return ((__oak_trampolined_subStart)=>((__oak_trampolined_subStart=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_subStart,__as_oak_string(i+1)):i)(space__oak_qm(__oak_acc(s,__oak_obj_key((i)))))}),__oak_resolve_trampoline(__oak_trampolined_subStart,i)))()},(firstNonSpace=subStart(0)),subEnd=function subEnd(i=null){return ((__oak_trampolined_subEnd)=>((__oak_trampolined_subEnd=function _(i=null){return ((__oak_cond)=>__oak_eq(__oak_cond,true)?__oak_trampoline(__oak_trampolined_subEnd,(i-1)):i)(space__oak_qm(__oak_acc(s,__oak_obj_key((i)))))}),__oak_resolve_trampoline(__oak_trampolined_subEnd,i)))()},(lastNonSpace=subEnd((len(s)-1))),slice(s,firstNonSpace,__as_oak_string(lastNonSpace+1))))())(s)},trim=function trim(s=null,part=null){return ((__oak_cond)=>__oak_eq(__oak_cond,null)?_trimSpace(s):trimStart(trimEnd(s,part),part))(part)},({_extend,_matchesAt__oak_qm,_replaceNonEmpty,_splitNonEmpty,_trimEndNonEmpty,_trimSpace,_trimStartNonEmpty,checkRange,contains__oak_qm,cut,__oak_js_default,digit__oak_qm,endsWith__oak_qm,indexOf,join,letter__oak_qm,lower,lower__oak_qm,padEnd,padStart,reduce,replace,slice,space__oak_qm,split,startsWith__oak_qm,trim,trimEnd,trimStart,upper,upper__oak_qm,word__oak_qm})))()}),(__Oak_Import_Aliases=({})),__oak_module_import(__Oak_String(`src/app.js.oak`)))