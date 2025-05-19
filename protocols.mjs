// ============================================================
//  COPYRIGHT WARNING
//
//  This code is the intellectual property of Nadhif Radityo.
//  Unauthorized copying, distribution, modification, or use
//  of this code, in whole or in part, is strictly prohibited.
//
//  You MUST obtain explicit written permission from the author
//  before using this code in any form.
//
//  Contact: nadhifradityo(at)gmail(dot)com
//
//  © Nadhif Radityo. All rights reserved.
// ============================================================

const oldMessageChannel = globalThis.MessageChannel;
function portCloseHandler() {
	const result = this.__oldClose__.apply(this, arguments);
	if(this.__closed__) return result;
	this.__closed__ = true;
	this.dispatchEvent(new CloseEvent("close"));
	this.__sibling__.deref()?.close();
}
globalThis.MessageChannel = function MessageChannel() {
	if(!(this instanceof MessageChannel))
		return new MessageChannel();
	const { port1, port2 } = new oldMessageChannel();
	port1.__closed__ = false;
	port2.__closed__ = false;
	port1.__sibling__ = new WeakRef(port2);
	port2.__sibling__ = new WeakRef(port1);
	port1.__oldClose__ = port1.close;
	port2.__oldClose__ = port2.close;
	port1.close = portCloseHandler;
	port2.close = portCloseHandler;
	return { port1, port2 };
};

if(Promise.withResolvers == null) {
	Promise.withResolvers = () => {
		let resolve; let reject;
		const promise = new Promise((r, j) => { resolve = r; reject = j; });
		return { promise, resolve, reject };
	};
}

const TypedArray = Object.getPrototypeOf(Uint8Array);
const TypedArrayInherits = [
	Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
	Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array
];

/**
 * @param {MessagePort} channel
 */
export function setupMessagingHandler(channel) {
	const transferCache = new WeakMap();
	/**
	 * @template T
	 * @param {T} object
	 * @param {any[]} transfers
	 * @returns {T}
	 */
	const transfer = (object, transfers) => {
		transferCache.set(object, transfers);
		return object;
	};

	/** @type {((data: any) => boolean)[]} */
	const onMessageCallbacks = [];
	/**
	 * @param {any} data
	 * @param {any[] | null} transfers
	 */
	function postMessage(data, transfers) {
		transfers = new Set(transfers ?? []);
		const value = serializeValue(data, transfers);
		const transferrables = [...new Set([...transfers].map(t =>
			t instanceof ArrayBuffer ? t :
				t instanceof TypedArray ? t.buffer :
					t instanceof MessagePort ? t : null
		).filter(t => t != null))];
		channel.postMessage([value, transfers], transferrables);
	}
	/**
	 * @param {(data: any) => boolean} callback
	 */
	function onMessage(callback) {
		onMessageCallbacks.push(callback);
	}
	channel.addEventListener("message", e => {
		const [value, transfers] = e.data;
		const data = deserializeValue(value, transfers);
		for(const callback of onMessageCallbacks) {
			if(!callback(data)) continue;
			break;
		}
	});
	channel.addEventListener("messageerror", e => {
		console.warn(`Message Error: `, e);
	});

	/**
	 * @template T
	 * @param {T} value
	 * @param {Set<any>} transfers
	 * @param {Map<any, any>} history
	 * @returns {T}
	 */
	function deserializeValue(value, transfers, history = new Map()) {
		if(typeof value == "bigint") return value;
		if(typeof value == "boolean") return value;
		if(typeof value == "number") return value;
		if(typeof value == "string") return value;
		if(typeof value == "symbol") return value;
		if(typeof value == "undefined") return value;
		if(typeof value == "function") return value;
		if(value == null) return value;
		if(history.has(value)) return history.get(value);
		if(transfers.has(value))
			return value;
		if(value instanceof Array) {
			const result = [];
			history.set(value, result);
			for(const entry of value)
				result.push(deserializeValue(entry, transfers, history));
			return result;
		}
		if(value instanceof Set) {
			const result = new Set();
			history.set(value, result);
			for(const entry of value)
				result.add(deserializeValue(entry, transfers, history));
			return result;
		}
		if(value instanceof Map) {
			const result = new Map();
			history.set(value, result);
			for(const entry of value)
				result.set(deserializeValue(entry[0], transfers, history), deserializeValue(entry[1], transfers, history));
			return result;
		}
		if(value.__callback__) {
			const result = callbackDeserialize(value);
			history.set(value, result);
			return result;
		}
		if(value.__error__) {
			const result = errorDeserialize(value);
			history.set(value, result);
			return result;
		}
		if(value.__messagePort__) {
			const result = messagePortDeserialize(value);
			history.set(value, result);
			return result;
		}
		if(value instanceof TypedArray)
			return value;
		const result = {};
		history.set(value, result);
		for(const entry of Object.entries(value))
			result[deserializeValue(entry[0], transfers, history)] = deserializeValue(entry[1], transfers, history);
		return result;
	}
	/**
	 * @template T
	 * @param {T} value
	 * @param {Set<any>} transfers
	 * @param {Map<any, any>} history
	 * @returns {T}
	 */
	function serializeValue(value, transfers, history = new Map()) {
		if(typeof value == "bigint") return value;
		if(typeof value == "boolean") return value;
		if(typeof value == "number") return value;
		if(typeof value == "string") return value;
		if(typeof value == "symbol") return value;
		if(typeof value == "undefined") return value;
		if(typeof value == "function") {
			const result = callbackSerialize(value);
			history.set(value, result);
			return result;
		}
		if(value == null) return value;
		if(history.has(value)) return history.get(value);
		if(transfers.has(value))
			return value;
		if(value instanceof Array) {
			const result = [];
			history.set(value, result);
			for(const entry of value)
				result.push(serializeValue(entry, transfers, history));
			return result;
		}
		if(value instanceof Set) {
			const result = new Set();
			history.set(value, result);
			for(const entry of value)
				result.add(serializeValue(entry, transfers, history));
			return result;
		}
		if(value instanceof Map) {
			const result = new Map();
			history.set(value, result);
			for(const entry of value)
				result.set(serializeValue(entry[0], transfers, history), serializeValue(entry[1], transfers, history));
			return result;
		}
		if(value instanceof Error) {
			const result = errorSerialize(value);
			history.set(value, result);
			return result;
		}
		if(value instanceof MessagePort) {
			const result = messagePortSerialize(value);
			history.set(value, result);
			return result;
		}
		if(value instanceof TypedArray)
			return value;
		const result = {};
		history.set(value, result);
		for(const entry of Object.entries(value))
			result[serializeValue(entry[0], transfers, history)] = serializeValue(entry[1], transfers, history);
		return result;
	}

	/** @type {Map<number, PromiseWithResolvers<any>>} */
	const pendingResponseMessage = new Map();
	/**
	 * @param {any} data
	 * @param {any[] | null} transfers
	 */
	function requestResponseMessage(data, transfers) {
		const handle = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
		const resolvers = Promise.withResolvers();
		pendingResponseMessage.set(handle, resolvers);
		data.handle = handle;
		postMessage(data, transfers);
		return resolvers.promise;
	}
	/**
	 * @param {number} handle
	 * @param {any} data
	 */
	function answerMessage(handle, callback) {
		try {
			const value = callback();
			if(!(value instanceof Promise)) {
				postMessage({
					command: "messageAnswerResolution",
					handle: handle,
					data: value
				}, transferCache.get(value) ?? []);
				return;
			}
			value.then(
				v => {
					postMessage({
						command: "messageAnswerResolution",
						handle: handle,
						data: v
					}, transferCache.get(v) ?? []);
				},
				e => {
					postMessage({
						command: "messageAnswerRejection",
						handle: handle,
						data: e
					}, transferCache.get(e) ?? []);
				}
			);
		} catch(error) {
			postMessage({
				command: "messageAnswerRejection",
				handle: handle,
				data: error
			}, transferCache.get(error) ?? []);
		}
	}
	onMessage(e => {
		if(e.command == "messageAnswerResolution") {
			const resolvers = pendingResponseMessage.get(e.handle);
			if(resolvers == null) return true;
			pendingResponseMessage.delete(e.handle);
			resolvers.resolve(e.data);
			return true;
		}
		if(e.command == "messageAnswerRejection") {
			const resolvers = pendingResponseMessage.get(e.handle);
			if(resolvers == null) return true;
			pendingResponseMessage.delete(e.handle);
			resolvers.reject(e.data);
			return true;
		}
		return false;
	});
	channel.addEventListener("close", () => {
		const pendings = [...pendingResponseMessage.values()];
		pendingResponseMessage.clear();
		const error = new Error("Messaging channel closed");
		for(const resolvers of pendings)
			resolvers.reject(error);
	});

	/**
	 * @typedef {{ __error__: true, __name__: string, __message__: string, __stack__: string }} SerializedError
	 */
	/**
	 * @param {SerializedError} serialized
	 * @returns {Error}
	 */
	function errorDeserialize(serialized) {
		return Object.assign(new Error(serialized.__message__), {
			name: serialized.__name__,
			message: serialized.__message__,
			stack: serialized.__stack__
		});
	}
	/**
	 * @param {Error} error
	 * @returns {SerializedError}
	 */
	function errorSerialize(error) {
		return {
			__error__: true,
			__name__: error.name,
			__message__: error.message,
			__stack__: error.stack
		};
	}

	/**
	 * @typedef {{ __messagePort__: true, __id__: number }} SerializedMessagePort
	 */
	/** @type {FinalizationRegistry<SerializedMessagePort>} */
	const messagePortDeserializedFinalizationRegistry = new FinalizationRegistry(serialized => {
		const messagePort = messagePortDeserializedHeld.get(serialized.__id__)?.deref();
		messagePortDeserializedHeld.delete(serialized.__id__);
		if(messagePort != null) messagePort.close();
		postMessage({
			command: "messagePortRelease",
			id: serialized.__id__
		});
	});
	/** @type {Map<number, WeakRef<MessagePort>>} */
	const messagePortDeserializedHeld = new Map();
	/** @type {Map<number, MessagePort>} */
	const messagePortSerializedHeld = new Map();
	/**
	 * @param {SerializedMessagePort} serialized
	 * @returns {MessagePort}
	 */
	function messagePortDeserialize(serialized) {
		const { port1: messagePort } = new MessageChannel();
		messagePortDeserializedHeld.set(serialized.__id__, new WeakRef(messagePort));
		messagePortDeserializedFinalizationRegistry.register(messagePort, serialized);
		messagePort.postMessage = (data, transfers) => {
			postMessage({
				command: "messagePortDataB",
				id: serialized.__id__,
				data: data,
				transfers: transfers
			}, [data, ...transfers]);
		};
		const originalClose = messagePort.close.bind(messagePort);
		messagePort.close = () => {
			postMessage({
				command: "messagePortCloseB",
				id: serialized.__id__
			});
			originalClose();
		};
		return messagePort;
	}
	/**
	 * @param {MessagePort} messagePort
	 * @returns {SerializedMessagePort}
	 */
	function messagePortSerialize(messagePort) {
		const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
		messagePortSerializedHeld.set(id, messagePort);
		messagePort.addEventListener("message", e => {
			postMessage({
				command: "messagePortDataA",
				id: id,
				data: e.data
			}, [e.data]);
		});
		messagePort.addEventListener("close", e => {
			postMessage({
				command: "messagePortCloseA",
				id: id
			});
		});
		messagePort.start();
		return {
			__messagePort__: true,
			__id__: id
		};
	}
	onMessage(e => {
		if(e.command == "messagePortDataA") {
			const messagePort = messagePortDeserializedHeld.get(e.id)?.deref();
			if(messagePort == null) return true;
			messagePort.dispatchEvent(new MessageEvent("message", { data: e.data }));
			return true;
		}
		if(e.command == "messagePortDataB") {
			const messagePort = messagePortSerializedHeld.get(e.id);
			if(messagePort == null) return true;
			messagePort.postMessage(e.data, e.transfers);
			return true;
		}
		if(e.command == "messagePortCloseA") {
			const messagePort = messagePortDeserializedHeld.get(e.id)?.deref();
			if(messagePort == null) return true;
			messagePort.close();
			return true;
		}
		if(e.command == "messagePortCloseB") {
			const messagePort = messagePortSerializedHeld.get(e.id);
			if(messagePort == null) return true;
			messagePort.close();
			return true;
		}
		if(e.command == "messagePortRelease") {
			messagePortSerializedHeld.delete(e.id);
			return true;
		}
		return false;
	});
	channel.addEventListener("close", () => {
		for(const messagePortRef of messagePortDeserializedHeld.values()) {
			const messagePort = messagePortRef.deref();
			if(messagePort == null) return;
			messagePort.close();
		}
		messagePortDeserializedHeld.clear();
		for(const messagePort of messagePortSerializedHeld.values())
			messagePort.close();
		messagePortSerializedHeld.clear();
	});

	/**
	 * @typedef {{ __callback__: true, __id__: number }} SerializedCallback
	 */
	/** @type {FinalizationRegistry<SerializedCallback>} */
	const callbackDeserializedFinalizationRegistry = new FinalizationRegistry(serialized => {
		postMessage({
			command: "callbackRelease",
			id: serialized.__id__
		});
	});
	/** @type {Map<number, (...args: any[]) => Promise<any>>} */
	const callbackSerializedHeld = new Map();
	/**
	 * @param {SerializedCallback} serialized
	 * @returns {(...args: any[]) => Promsie<any>}
	 */
	function callbackDeserialize(serialized) {
		const result = (...args) => {
			return requestResponseMessage({
				command: "callbackCall",
				id: serialized.__id__,
				args: args
			});
		};
		callbackDeserializedFinalizationRegistry.register(result, serialized);
		return result;
	}
	/**
	 * @param {(...args: any[]) => Promise<any>} callback
	 * @returns {SerializedCallback}
	 */
	function callbackSerialize(callback) {
		const id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
		callbackSerializedHeld.set(id, callback);
		return {
			__callback__: true,
			__id__: id
		};
	}
	onMessage(e => {
		if(e.command == "callbackCall") {
			const callback = callbackSerializedHeld.get(e.id);
			if(callback == null) return true;
			answerMessage(e.handle, () => callback(...e.args));
			return true;
		}
		if(e.command == "callbackRelease") {
			callbackSerializedHeld.delete(e.id);
			return true;
		}
		return false;
	});

	return {
		transferCache,
		transfer,
		onMessageCallbacks,
		postMessage,
		onMessage,
		deserializeValue,
		serializeValue,
		pendingResponseMessage,
		requestResponseMessage,
		answerMessage,
		errorDeserialize,
		errorSerialize,
		messagePortDeserializedFinalizationRegistry,
		messagePortDeserializedHeld,
		messagePortSerializedHeld,
		messagePortDeserialize,
		messagePortSerialize,
		callbackDeserializedFinalizationRegistry,
		callbackSerializedHeld,
		callbackDeserialize,
		callbackSerialize
	};
}

import { default as utfz } from "utfz-lib";

const SIA_TYPES = {
	undefined: 192,
	null: 193,
	true: 232,
	false: 233,
	date: 234,
	date64: 235,
	uint0a: 2,    // xx 00 00 10 || xx != 3 || 0  <= xx <= 3
	uint0b: 3,    // xx 00 00 11 || xx != 3 || 3  <= xx <= 6
	uint0c: 4,    // xx 00 01 00 || xx != 3 || 6  <= xx <= 9
	uint0d: 5,    // xx 00 01 01 || xx != 3 || 9  <= xx <= 12
	uint0e: 6,    // xx 00 01 10 || xx != 3 || 12 <= xx <= 15
	uint0f: 7,    // xx 00 01 11 || xx != 3 || 15 <= xx <= 18
	uint8: 194,   // 11 00 00 10
	uint16: 195,  // 11 00 00 11
	uint32: 196,  // 11 00 01 00
	uint64: 197,  // 11 00 01 01
	uint128: 198, // 11 00 01 10
	uintn: 199,   // 11 00 01 11
	int8: 200,
	int16: 201,
	int32: 202,
	int64: 203,
	int128: 204,
	intn: 205,
	float8: 206, // Not Implemented
	float16: 207, // Not Implemented
	float32: 208,
	float64: 209,
	float128: 210, // Not Implemented
	floatn: 211, // Not Implemented
	// 212 is not used
	ref0a: 21,   // xx 01 01 01 | xx != 3 | 0  <= xx < 3
	ref0b: 22,   // xx 01 01 10 | xx != 3 | 3  <= xx < 6
	ref0c: 23,   // xx 01 01 11 | xx != 3 | 6  <= xx < 9
	ref0d: 24,   // xx 01 10 00 | xx != 3 | 9  <= xx < 12
	ref0e: 25,   // xx 01 10 01 | xx != 3 | 12 <= xx < 15
	ref0f: 26,   // xx 01 10 10 | xx != 3 | 15 <= xx < 18
	ref8: 213,   // 11 01 01 01
	ref16: 214,  // 11 01 01 10
	ref32: 215,  // 11 01 01 11
	ref64: 216,  // 11 01 10 00
	ref128: 217, // 11 01 10 01
	refn: 218,   // 11 01 10 10
	utfz0a: 27,     // xx 01 10 11 | xx != 3 | 0  <= xx < 3
	utfz0b: 28,     // xx 01 11 00 | xx != 3 | 3  <= xx < 6
	utfz0c: 29,     // xx 01 11 01 | xx != 3 | 6  <= xx < 9
	utfz0d: 30,     // xx 01 11 10 | xx != 3 | 9  <= xx < 12
	utfz0e: 31,     // xx 01 11 11 | xx != 3 | 12 <= xx < 15
	utfz0f: 32,     // xx 10 00 00 | xx != 3 | 15 <= xx < 18
	utfz0g: 33,     // xx 10 00 01 | xx != 3 | 18 <= xx < 21
	utfz: 219,      // 11 01 10 11
	string8: 220,   // 11 01 11 00
	string16: 221,  // 11 01 11 01
	string32: 222,  // 11 01 11 10
	string64: 223,  // 11 01 11 11
	string128: 224, // 11 10 00 00
	stringn: 225,   // 11 10 00 01
	bin0a: 34,   // xx 10 00 10 | xx != 3 | 0  <= xx < 3
	bin0b: 35,   // xx 10 00 11 | xx != 3 | 3  <= xx < 6
	bin0c: 36,   // xx 10 01 00 | xx != 3 | 6  <= xx < 9
	bin0d: 37,   // xx 10 01 01 | xx != 3 | 9  <= xx < 12
	bin0e: 38,   // xx 10 01 10 | xx != 3 | 12 <= xx < 15
	bin0f: 39,   // xx 10 01 11 | xx != 3 | 15 <= xx < 18
	bin8: 226,   // 11 10 00 10
	bin16: 227,  // 11 10 00 11
	bin32: 228,  // 11 10 01 00
	bin64: 229,  // 11 10 01 01
	bin128: 230, // 11 10 01 10
	binn: 231,   // 11 10 01 11
	constructor0a: 44,  // xx 10 11 00 | xx != 3 | 0  <= xx < 3
	constructor0b: 45,  // xx 10 11 00 | xx != 3 | 3  <= xx < 6
	constructor0c: 46,  // xx 10 11 00 | xx != 3 | 6  <= xx < 9
	constructor8: 236,  // 11 10 11 00
	constructor16: 237, // 11 10 11 00
	constructor32: 238, // 11 10 11 00
	array0a: 47,   // xx 10 11 11 | xx != 3 | 0  <= xx < 3
	array0b: 48,   // xx 11 00 00 | xx != 3 | 3  <= xx < 6
	array0c: 49,   // xx 11 00 01 | xx != 3 | 6  <= xx < 9
	array0d: 50,   // xx 11 00 10 | xx != 3 | 9  <= xx < 12
	array0e: 51,   // xx 11 00 11 | xx != 3 | 12 <= xx < 15
	array0f: 52,   // xx 11 01 00 | xx != 3 | 15 <= xx < 18
	array8: 239,   // 11 10 11 11
	array16: 240,  // 11 11 00 00
	array32: 241,  // 11 11 00 01
	array64: 242,  // 11 11 00 10
	array128: 243, // 11 11 00 11
	arrayn: 244,   // 11 11 01 00
	object0a: 53,     // xx 11 01 01 | xx != 3 | 0  <= xx < 3
	object0b: 54,     // xx 11 01 10 | xx != 3 | 3  <= xx < 6
	object0c: 55,     // xx 11 01 11 | xx != 3 | 6  <= xx < 9
	object0d: 56,     // xx 11 10 00 | xx != 3 | 9  <= xx < 12
	object0e: 57,     // xx 11 10 01 | xx != 3 | 12 <= xx < 15
	object0f: 58,     // xx 11 10 10 | xx != 3 | 15 <= xx < 18
	objectStart: 245, // 11 11 01 01
	objectEnd: 246,   // 11 11 01 10
	setStart: 247,    // 11 11 01 11
	setEnd: 248,      // 11 11 10 00
	mapStart: 249,    // 11 11 10 01
	mapEnd: 250       // 11 11 10 10
};
const SIA_BUILTIN_CONSTRUCTORS = [
	// Code 0 is a special type, its purpose is to catch-all
	// non-serializable value and replace it with desired value.
	{
		code: 1,
		canHandle: item => item instanceof RegExp,
		args: item => [item.source, item.flags],
		build: ([source, flags]) => new RegExp(source, flags)
	},
	{
		code: 2,
		canHandle: item => item instanceof Error,
		args: item => [item.name, item.message, item.stack],
		build: ([name, message, stack]) => Object.assign(new Error(message), { name, message, stack })
	},
	{
		code: 3,
		canHandle: (item, constructor) => item instanceof TypedArray && TypedArrayInherits.includes(constructor),
		args: item => [TypedArrayInherits.indexOf(Object.getPrototypeOf(item).constructor), item.buffer, item.byteOffset, item.length],
		build: ([type, buffer, byteOffset, length]) => new TypedArrayInherits[type](buffer, byteOffset, length)
	},
	{
		code: 4,
		canHandle: (item, constructor) => item instanceof DataView && constructor == DataView,
		args: item => [item.buffer, item.byteOffset, item.byteLength],
		build: ([buffer, byteOffset, byteLength]) => new DataView(buffer, byteOffset, byteLength)
	}
];
export class Sia {
	constructor({ size = 33554432, constructors = SIA_BUILTIN_CONSTRUCTORS } = {}) {
		this.buffer = new Uint8Array(size);
		this.dataView = new DataView(this.buffer.buffer);
		this.textEncoder = new TextEncoder();
		this.offset = 0;
		this.constructors = constructors;
		this.refs = new Map();
		this.refCount = 0;
	}
	reset() {
		this.offset = 0;
		this.refs.clear();
		this.refCount = 0;
	}
	writeUInt8(number) {
		this.dataView.setUint8(this.offset, number);
		this.offset += 1;
	}
	writeUInt16(number) {
		this.dataView.setUint16(this.offset, number, true);
		this.offset += 2;
	}
	writeUInt32(number) {
		this.dataView.setUint32(this.offset, number, true);
		this.offset += 4;
	}
	writeUInt64(number) {
		this.dataView.setBigUint64(this.offset, number, true);
		this.offset += 8;
	}
	writeUInt128(number) {
		this.dataView.setBigUint64(this.offset, number & 0xffffffffffffffffn, true);
		this.dataView.setBigUint64(this.offset, (number >> 64n) & 0xffffffffffffffffn, true);
		this.offset += 16;
	}
	writeUIntN(number) {
		const bytes = [];
		while(number != 0) {
			bytes.push(Number(number & 0xffn));
			number >>= 8n;
		}
		this.writeUInt8(bytes.length);
		for(const byte of bytes)
			this.writeUInt8(byte);
	}
	writeInt8(number) {
		this.dataView.setInt8(this.offset, number);
		this.offset += 1;
	}
	writeInt16(number) {
		this.dataView.setInt16(this.offset, number, true);
		this.offset += 2;
	}
	writeInt32(number) {
		this.dataView.setInt32(this.offset, number, true);
		this.offset += 4;
	}
	writeInt64(number) {
		this.dataView.setBigInt64(this.offset, number, true);
		this.offset += 8;
	}
	writeInt128(number) {
		this.writeUInt128(number);
	}
	writeIntN(number) {
		this.writeUIntN(number);
	}
	writeFloat32(number) {
		this.dataView.setFloat32(this.offset, number, true);
		this.offset += 4;
	}
	writeFloat64(number) {
		this.dataView.setFloat64(this.offset, number, true);
		this.offset += 8;
	}
	writeString(str, offset) {
		const subBuffer = new Uint8Array(this.buffer.buffer, offset, this.buffer.byteLength - offset);
		return this.textEncoder.encodeInto(str, subBuffer).written;
	}

	encodeUndefined() {
		this.writeUInt8(SIA_TYPES.undefined);
	}
	encodeNull() {
		this.writeUInt8(SIA_TYPES.null);
	}
	encodeBoolean(bool) {
		this.writeUInt8(bool ? SIA_TYPES.true : SIA_TYPES.false);
	}
	encodeDate(date) {
		const timestamp = date.valueOf();
		if(timestamp <= 0xffffffff) {
			this.writeUInt8(SIA_TYPES.date);
			this.writeUInt32(timestamp);
		} else if(timestamp <= 0xffffffffffffffffn) {
			this.writeUInt8(SIA_TYPES.date64);
			this.writeUInt64(timestamp);
		} else
			throw new Error(`Date ${timestamp} is too big to serialize`);
	}
	encodeNumber(number) {
		if(Number.isInteger(number))
			this.encodeInteger(number);
		else this.encodeFloat(number);
	}
	encodeInteger(number) {
		if(number >= 0) {
			if(number < 3)
				this.writeUInt8(SIA_TYPES.uint0a | (number - 0) << 6);
			else if(number < 6)
				this.writeUInt8(SIA_TYPES.uint0b | (number - 3) << 6);
			else if(number < 9)
				this.writeUInt8(SIA_TYPES.uint0c | (number - 6) << 6);
			else if(number < 12)
				this.writeUInt8(SIA_TYPES.uint0d | (number - 9) << 6);
			else if(number < 15)
				this.writeUInt8(SIA_TYPES.uint0e | (number - 12) << 6);
			else if(number < 18)
				this.writeUInt8(SIA_TYPES.uint0f | (number - 15) << 6);
			else if(number <= 0xff) {
				this.writeUInt8(SIA_TYPES.uint8);
				this.writeUInt8(number);
			} else if(number <= 0xffff) {
				this.writeUInt8(SIA_TYPES.uint16);
				this.writeUInt16(number);
			} else if(number <= 0xffffffff) {
				this.writeUInt8(SIA_TYPES.uint32);
				this.writeUInt32(number);
			} else
				this.encodeFloat(number);
		} else {
			if(number >= -0x80) {
				this.writeUInt8(SIA_TYPES.int8);
				this.writeInt8(number);
			} else if(number >= -0x8000) {
				this.writeUInt8(SIA_TYPES.int16);
				this.writeInt16(number);
			} else if(number >= -0x80000000) {
				this.writeUInt8(SIA_TYPES.int32);
				this.writeInt32(number);
			} else
				this.encodeFloat(number);
		}
	}
	encodeBigInt(number) {
		if(number >= 0n) {
			if(number <= 0xffffffffffffffffn) {
				this.writeUInt8(SIA_TYPES.uint64);
				this.writeUInt64(number);
			} else if(number <= 0xffffffffffffffffffffffffffffffffn) {
				this.writeUInt8(SIA_TYPES.uint128);
				this.writeUInt128(number);
			} else {
				this.writeUInt8(SIA_TYPES.uintn);
				this.writeUIntN(number);
			}
		} else {
			if(number >= -0x8000000000000000n) {
				this.writeUInt8(SIA_TYPES.int64);
				this.writeInt64(number);
			} else if(number >= -0x80000000000000000000000000000000n) {
				this.writeUInt8(SIA_TYPES.int128);
				this.writeInt128(number);
			} else {
				this.writeUInt8(SIA_TYPES.intn);
				this.writeIntN(number);
			}
		}
	}
	encodeFloat(number) {
		if(isNaN(number) || !isFinite(number) || number == Math.fround(number)) {
			this.writeUInt8(SIA_TYPES.float32);
			this.writeFloat32(number);
		} else {
			this.writeUInt8(SIA_TYPES.float64);
			this.writeFloat64(number);
		}
	}
	encodeRef(ref) {
		if(ref < 3)
			this.writeUInt8(SIA_TYPES.ref0a | (ref - 0) << 6);
		else if(ref < 6)
			this.writeUInt8(SIA_TYPES.ref0b | (ref - 3) << 6);
		else if(ref < 9)
			this.writeUInt8(SIA_TYPES.ref0c | (ref - 6) << 6);
		else if(ref < 12)
			this.writeUInt8(SIA_TYPES.ref0d | (ref - 9) << 6);
		else if(ref < 15)
			this.writeUInt8(SIA_TYPES.ref0e | (ref - 12) << 6);
		else if(ref < 18)
			this.writeUInt8(SIA_TYPES.ref0f | (ref - 15) << 6);
		else if(ref <= 0xff) {
			this.writeUInt8(SIA_TYPES.ref8);
			this.writeUInt8(ref);
		} else if(ref <= 0xffff) {
			this.writeUInt8(SIA_TYPES.ref16);
			this.writeUInt16(ref);
		} else if(ref <= 0xffffffff) {
			this.writeUInt8(SIA_TYPES.ref32);
			this.writeUInt32(ref);
		} else if(ref <= 0xffffffffffffffffn) {
			this.writeUInt8(SIA_TYPES.ref64);
			this.writeUInt64(ref);
		} else if(ref <= 0xffffffffffffffffffffffffffffffffn) {
			this.writeUInt8(SIA_TYPES.ref128);
			this.writeUInt128(ref);
		} else {
			this.writeUInt8(SIA_TYPES.refn);
			this.writeUIntN(ref);
		}
	}
	encodeString(string) {
		const ref = this.refs.get(string);
		if(ref != null) { this.encodeRef(ref); return; }
		this.refs.set(string, this.refCount++);
		const length = string.length;
		if(length < 21) {
			const byteLength = utfz.pack(string, length, this.buffer, this.offset + 1);
			if(byteLength < 3)
				this.writeUInt8(SIA_TYPES.utfz0a | (byteLength - 0) << 6);
			else if(byteLength < 6)
				this.writeUInt8(SIA_TYPES.utfz0b | (byteLength - 3) << 6);
			else if(byteLength < 9)
				this.writeUInt8(SIA_TYPES.utfz0c | (byteLength - 6) << 6);
			else if(byteLength < 12)
				this.writeUInt8(SIA_TYPES.utfz0d | (byteLength - 9) << 6);
			else if(byteLength < 15)
				this.writeUInt8(SIA_TYPES.utfz0e | (byteLength - 12) << 6);
			else if(byteLength < 18)
				this.writeUInt8(SIA_TYPES.utfz0f | (byteLength - 15) << 6);
			else if(byteLength < 21)
				this.writeUInt8(SIA_TYPES.utfz0g | (byteLength - 18) << 6);
			if(byteLength < 21) {
				this.offset += byteLength;
				return;
			}
		}
		if(length < 60) {
			this.writeUInt8(SIA_TYPES.utfz);
			const byteLength = utfz.pack(string, length, this.buffer, this.offset + 1);
			this.writeUInt8(byteLength);
			this.offset += byteLength;
			return;
		}
		const maxBytes = length * 3;
		if(maxBytes <= 0xff) {
			this.writeUInt8(SIA_TYPES.string8);
			const byteLength = this.writeString(string, this.offset + 1);
			this.writeUInt8(byteLength);
			this.offset += byteLength;
		} else if(maxBytes <= 0xffff) {
			this.writeUInt8(SIA_TYPES.string16);
			const byteLength = this.writeString(string, this.offset + 2);
			this.writeUInt16(byteLength);
			this.offset += byteLength;
		} else if(maxBytes <= 0xffffffff) {
			this.writeUInt8(SIA_TYPES.string32);
			const byteLength = this.writeString(string, this.offset + 4);
			this.writeUInt32(byteLength);
			this.offset += byteLength;
		} else if(maxBytes <= 0xffffffffffffffffn) {
			this.writeUInt8(SIA_TYPES.string64);
			const byteLength = this.writeString(string, this.offset + 8);
			this.writeUInt64(byteLength);
			this.offset += byteLength;
		} else if(maxBytes <= 0xffffffffffffffffffffffffffffffffn) {
			this.writeUInt8(SIA_TYPES.string128);
			const byteLength = this.writeString(string, this.offset + 16);
			this.writeUInt128(byteLength);
			this.offset += byteLength;
		} else
			throw new Error(`String size ${maxBytes} is too big`);
	}
	encodeArrayBuffer(buffer) {
		const ref = this.refs.get(buffer);
		if(ref != null) { this.encodeRef(ref); return; }
		this.refs.set(buffer, this.refCount++);
		const workingBuffer = new Uint8Array(buffer);
		const length = workingBuffer.length;
		if(workingBuffer.length < 3)
			this.writeUInt8(SIA_TYPES.bin0a | (workingBuffer.length - 0) << 6);
		else if(workingBuffer.length < 6)
			this.writeUInt8(SIA_TYPES.bin0b | (workingBuffer.length - 3) << 6);
		else if(workingBuffer.length < 9)
			this.writeUInt8(SIA_TYPES.bin0c | (workingBuffer.length - 6) << 6);
		else if(workingBuffer.length < 12)
			this.writeUInt8(SIA_TYPES.bin0d | (workingBuffer.length - 9) << 6);
		else if(workingBuffer.length < 15)
			this.writeUInt8(SIA_TYPES.bin0e | (workingBuffer.length - 12) << 6);
		else if(workingBuffer.length < 18)
			this.writeUInt8(SIA_TYPES.bin0f | (workingBuffer.length - 15) << 6);
		else if(workingBuffer.length <= 0xff) {
			this.writeUInt8(SIA_TYPES.bin8);
			this.writeUInt8(length);
		} else if(workingBuffer.length <= 0xffff) {
			this.writeUInt8(SIA_TYPES.bin16);
			this.writeUInt16(length);
		} else if(workingBuffer.length <= 0xffffffff) {
			this.writeUInt8(SIA_TYPES.bin32);
			this.writeUInt32(length);
		} else if(workingBuffer.length <= 0xffffffffffffffffn) {
			this.writeUInt8(SIA_TYPES.bin64);
			this.writeUInt64(length);
		} else if(workingBuffer.length <= 0xffffffffffffffffffffffffffffffffn) {
			this.writeUInt8(SIA_TYPES.bin128);
			this.writeUInt128(length);
		} else {
			this.writeUInt8(SIA_TYPES.binn);
			this.writeUIntN(length);
		}
		this.buffer.set(workingBuffer, this.offset);
		this.offset += length;
	}
	tryEncodeConstructor(constructor, object) {
		const isConstructorBuiltin =
			constructor == null || constructor == Object || constructor == Array ||
			constructor == Set || constructor == Map || constructor == ArrayBuffer ||
			constructor == Date;
		for(const entry of this.constructors) {
			if(!entry.canHandle(object, constructor)) continue;
			if(entry.code == 0 && isConstructorBuiltin) continue;
			const ref = this.refs.get(object);
			if(ref != null) { this.encodeRef(ref); return entry; }
			this.refs.set(object, this.refCount++);
			const code = entry.code;
			const args = entry.args(object);
			if(code < 3)
				this.writeUInt8(SIA_TYPES.constructor0a | (code - 0) << 6);
			else if(code < 6)
				this.writeUInt8(SIA_TYPES.constructor0b | (code - 3) << 6);
			else if(code < 9)
				this.writeUInt8(SIA_TYPES.constructor0c | (code - 6) << 6);
			else if(code <= 0xff) {
				this.writeUInt8(SIA_TYPES.constructor8);
				this.writeUInt8(code);
			} else if(code <= 0xffff) {
				this.writeUInt8(SIA_TYPES.constructor16);
				this.writeUInt16(code);
			} else if(code <= 0xffffffff) {
				this.writeUInt8(SIA_TYPES.constructor32);
				this.writeUInt32(code);
			} else
				throw new Error(`Code ${code} too big for a constructor`);
			this.serializeItem(args);
			return entry;
		}
	}
	encodeArray(array) {
		const ref = this.refs.get(array);
		if(ref != null) { this.encodeRef(ref); return; }
		this.refs.set(array, this.refCount++);
		const length = array.length;
		if(length < 3)
			this.writeUInt8(SIA_TYPES.array0a | (length - 0) << 6);
		else if(length < 6)
			this.writeUInt8(SIA_TYPES.array0b | (length - 3) << 6);
		else if(length < 9)
			this.writeUInt8(SIA_TYPES.array0c | (length - 6) << 6);
		else if(length < 12)
			this.writeUInt8(SIA_TYPES.array0d | (length - 9) << 6);
		else if(length < 15)
			this.writeUInt8(SIA_TYPES.array0e | (length - 12) << 6);
		else if(length < 18)
			this.writeUInt8(SIA_TYPES.array0f | (length - 15) << 6);
		else if(length <= 0xff) {
			this.writeUInt8(SIA_TYPES.array8);
			this.writeUInt8(length);
		} else if(length <= 0xffff) {
			this.writeUInt8(SIA_TYPES.array16);
			this.writeUInt16(length);
		} else if(length <= 0xffffffff) {
			this.writeUInt8(SIA_TYPES.array32);
			this.writeUInt32(length);
		} else if(length <= 0xffffffffffffffffn) {
			this.writeUInt8(SIA_TYPES.array64);
			this.writeUInt64(length);
		} else if(length <= 0xffffffffffffffffffffffffffffffffn) {
			this.writeUInt8(SIA_TYPES.array128);
			this.writeUInt128(length);
		} else {
			this.writeUInt8(SIA_TYPES.arrayn);
			this.writeUIntN(length);
		}
		for(const member of array)
			this.serializeItem(member);
	}
	encodeObject(object) {
		const ref = this.refs.get(object);
		if(ref != null) { this.encodeRef(ref); return; }
		this.refs.set(object, this.refCount++);
		const keys = Object.keys(object);
		if(keys.length < 3)
			this.writeUInt8(SIA_TYPES.object0a | (keys.length - 0) << 6);
		else if(keys.length < 6)
			this.writeUInt8(SIA_TYPES.object0b | (keys.length - 3) << 6);
		else if(keys.length < 9)
			this.writeUInt8(SIA_TYPES.object0c | (keys.length - 6) << 6);
		else if(keys.length < 12)
			this.writeUInt8(SIA_TYPES.object0d | (keys.length - 9) << 6);
		else if(keys.length < 15)
			this.writeUInt8(SIA_TYPES.object0e | (keys.length - 12) << 6);
		else if(keys.length < 18)
			this.writeUInt8(SIA_TYPES.object0f | (keys.length - 15) << 6);
		else
			this.writeUInt8(SIA_TYPES.objectStart);
		for(const key of keys) {
			this.serializeItem(key);
			this.serializeItem(object[key]);
		}
		if(keys.length >= 18)
			this.writeUInt8(SIA_TYPES.objectEnd);
	}
	encodeSet(set) {
		const ref = this.refs.get(set);
		if(ref != null) { this.encodeRef(ref); return; }
		this.refs.set(set, this.refCount++);
		this.writeUInt8(SIA_TYPES.setStart);
		for(const member of set)
			this.serializeItem(member);
		this.writeUInt8(SIA_TYPES.setEnd);
	}
	encodeMap(map) {
		const ref = this.refs.get(map);
		if(ref != null) { this.encodeRef(ref); return; }
		this.refs.set(map, this.refCount++);
		this.writeUInt8(SIA_TYPES.mapStart);
		for(const [key, value] of map) {
			this.serializeItem(key);
			this.serializeItem(value);
		}
		this.writeUInt8(SIA_TYPES.mapEnd);
	}

	serializeItem(item) {
		const type = typeof item;
		switch(type) {
			case "undefined":
				this.encodeUndefined();
				return;
			case "boolean":
				this.encodeBoolean(item);
				return;
			case "number":
				this.encodeNumber(item);
				return;
			case "bigint":
				this.encodeBigInt(item);
				return;
			case "string":
				this.encodeString(item);
				return;
			case "function":
			case "symbol":
			case "object": {
				if(item === null) {
					this.encodeNull();
					return;
				}
				const constructor = Object.getPrototypeOf(item)?.constructor;
				if(this.tryEncodeConstructor(constructor, item) != null)
					return;
				switch(constructor) {
					case Date:
						this.encodeDate(item);
						return;
					case ArrayBuffer:
						this.encodeArrayBuffer(item);
						return;
					case Array:
						this.encodeArray(item);
						return;
					case null:
					case Object:
						this.encodeObject(item);
						return;
					case Set:
						this.encodeSet(item);
						return;
					case Map:
						this.encodeMap(item);
						return;
					default:
						throw new Error(`Serialization of item ${item.toString()} is not supported`);
				}
			}
		}
	}
	serialize(data) {
		this.data = data;
		try {
			this.serializeItem(this.data);
			return this.buffer.subarray(0, this.offset);
		} finally {
			this.reset();
			this.data = null;
		}
	}
}
export class DeSia {
	constructor({ constructors = SIA_BUILTIN_CONSTRUCTORS, refSize = 256 * 1000 } = {}) {
		this.constructors = new Array(256);
		for(const item of constructors)
			this.constructors[item.code] = item;
		this.buffer = null;
		this.dataView = null;
		this.textDecoder = new TextDecoder();
		this.offset = 0;
		this.refs = new Array(refSize);
		this.refCount = 0;
	}
	reset() {
		this.buffer = null;
		this.dataView = null;
		this.offset = 0;
		this.refs.splice(0);
		this.refCount = 0;
	}
	readUInt8() {
		const number = this.dataView.getUint8(this.offset);
		this.offset += 1;
		return number;
	}
	readUInt16() {
		const number = this.dataView.getUint16(this.offset, true);
		this.offset += 2;
		return number;
	}
	readUInt32() {
		const number = this.dataView.getUint32(this.offset, true);
		this.offset += 4;
		return number;
	}
	readUInt64() {
		const number = this.dataView.getBigUint64(this.offset, true);
		this.offset += 8;
		return number;
	}
	readUInt128() {
		const lowerNumber = this.dataView.getBigUint64(this.offset, true);
		const upperNumber = this.dataView.getBigUint64(this.offset + 8, true);
		this.offset += 16;
		return (upperNumber << 64n) | lowerNumber;
	}
	readUIntN() {
		const length = this.readUInt8();
		let number = 0n;
		for(let i = 0; i < length; i++)
			number = (number << 8n) | BigInt(this.readUInt8());
		return number;
	}
	readInt8() {
		const number = this.dataView.getInt8(this.offset);
		this.offset += 1;
		return number;
	}
	readInt16() {
		const number = this.dataView.getInt16(this.offset, true);
		this.offset += 2;
		return number;
	}
	readInt32() {
		const number = this.dataView.getInt32(this.offset, true);
		this.offset += 4;
		return number;
	}
	readInt64() {
		const number = this.dataView.getBigInt64(this.offset, true);
		this.offset += 8;
		return number;
	}
	readInt128() {
		return this.readUInt128();
	}
	readIntN() {
		return this.readUIntN();
	}
	readFloat32() {
		const number = this.dataView.getFloat32(this.offset, true);
		this.offset += 4;
		return number;
	}
	readFloat64() {
		const number = this.dataView.getFloat64(this.offset, true);
		this.offset += 8;
		return number;
	}
	readString(length) {
		const str = this.textDecoder.decode(new Uint8Array(this.buffer.buffer, this.offset, length));
		this.offset += length;
		return str;
	}

	decodeUndefined(blockType) {
		switch(blockType) {
			case SIA_TYPES.undefined:
				return undefined;
		}
	}
	decodeNull(blockType) {
		switch(blockType) {
			case SIA_TYPES.null:
				return null;
		}
	}
	decodeBoolean(blockType) {
		let boolean;
		switch(blockType) {
			case SIA_TYPES.true:
				boolean = true;
				break;
			case SIA_TYPES.false:
				boolean = false;
				break;
		}
		return boolean;
	}
	decodeDate(blockType) {
		switch(blockType) {
			case SIA_TYPES.date:
				return new Date(this.readUInt32());
			case SIA_TYPES.date64:
				return new Date(this.readUInt64());
		}
	}
	decodeNumber(blockType) {
		let number;
		const blockInlineLength = blockType >> 6;
		if(blockInlineLength != 3) {
			switch(blockType & 0b00111111) {
				case SIA_TYPES.uint0a:
				case SIA_TYPES.uint0b:
				case SIA_TYPES.uint0c:
				case SIA_TYPES.uint0d:
				case SIA_TYPES.uint0e:
				case SIA_TYPES.uint0f:
					number = this.decodeInteger(blockType);
					break;
			}
			return number;
		}
		switch(blockType) {
			case SIA_TYPES.uint8:
			case SIA_TYPES.uint16:
			case SIA_TYPES.uint32:
			case SIA_TYPES.int8:
			case SIA_TYPES.int16:
			case SIA_TYPES.int32:
				number = this.decodeInteger(blockType);
				break;
			case SIA_TYPES.float32:
			case SIA_TYPES.float64:
				number = this.decodeFloat(blockType);
				break;
		}
		return number;
	}
	decodeInteger(blockType) {
		let number;
		const blockInlineLength = blockType >> 6;
		if(blockInlineLength != 3) {
			switch(blockType & 0b00111111) {
				case SIA_TYPES.uint0a:
					number = blockInlineLength + 0;
					break;
				case SIA_TYPES.uint0b:
					number = blockInlineLength + 3;
					break;
				case SIA_TYPES.uint0c:
					number = blockInlineLength + 6;
					break;
				case SIA_TYPES.uint0d:
					number = blockInlineLength + 9;
					break;
				case SIA_TYPES.uint0e:
					number = blockInlineLength + 12;
					break;
				case SIA_TYPES.uint0f:
					number = blockInlineLength + 15;
					break;
			}
			return number;
		}
		switch(blockType) {
			case SIA_TYPES.uint8:
				number = this.readUInt8();
				break;
			case SIA_TYPES.uint16:
				number = this.readUInt16();
				break;
			case SIA_TYPES.uint32:
				number = this.readUInt32();
				break;
			case SIA_TYPES.int8:
				number = this.readInt8();
				break;
			case SIA_TYPES.int16:
				number = this.readInt16();
				break;
			case SIA_TYPES.int32:
				number = this.readInt32();
				break;
			case SIA_TYPES.float32:
			case SIA_TYPES.float64:
				number = this.decodeFloat(blockType);
				break;
		}
		return number;
	}
	decodeBigInt(blockType) {
		let number;
		switch(blockType) {
			case SIA_TYPES.uint64:
				number = this.readUInt64();
				break;
			case SIA_TYPES.uint128:
				number = this.readUInt128();
				break;
			case SIA_TYPES.uintn:
				number = this.readUIntN();
				break;
			case SIA_TYPES.int64:
				number = this.readInt64();
				break;
			case SIA_TYPES.int128:
				number = this.readInt128();
				break;
			case SIA_TYPES.intn:
				number = this.readIntN();
				break;
		}
		return number;
	}
	decodeFloat(blockType) {
		let number;
		switch(blockType) {
			case SIA_TYPES.float32:
				number = this.readFloat32();
				break;
			case SIA_TYPES.float64:
				number = this.readFloat64();
				break;
		}
		return number;
	}
	decodeRef(blockType) {
		let ref;
		const blockInlineLength = blockType >> 6;
		if(blockInlineLength != 3) {
			switch(blockType & 0b00111111) {
				case SIA_TYPES.ref0a:
					ref = blockInlineLength + 0;
					break;
				case SIA_TYPES.ref0b:
					ref = blockInlineLength + 3;
					break;
				case SIA_TYPES.ref0c:
					ref = blockInlineLength + 6;
					break;
				case SIA_TYPES.ref0d:
					ref = blockInlineLength + 9;
					break;
				case SIA_TYPES.ref0e:
					ref = blockInlineLength + 12;
					break;
				case SIA_TYPES.ref0f:
					ref = blockInlineLength + 15;
					break;
			}
			return this.refs[ref];
		}
		switch(blockType) {
			case SIA_TYPES.ref8:
				ref = this.readUInt8();
				break;
			case SIA_TYPES.ref16:
				ref = this.readUInt16();
				break;
			case SIA_TYPES.ref32:
				ref = this.readUInt32();
				break;
			case SIA_TYPES.ref64:
				ref = this.readUInt64();
				break;
			case SIA_TYPES.ref128:
				ref = this.readUInt128();
				break;
			case SIA_TYPES.refn:
				ref = this.readUIntN();
				break;
		}
		return this.refs[ref];
	}
	decodeString(blockType) {
		let length;
		const blockInlineLength = blockType >> 6;
		if(blockInlineLength != 3) {
			switch(blockType & 0b00111111) {
				case SIA_TYPES.utfz0a:
					length = blockInlineLength + 0;
					break;
				case SIA_TYPES.utfz0b:
					length = blockInlineLength + 3;
					break;
				case SIA_TYPES.utfz0c:
					length = blockInlineLength + 6;
					break;
				case SIA_TYPES.utfz0d:
					length = blockInlineLength + 9;
					break;
				case SIA_TYPES.utfz0e:
					length = blockInlineLength + 12;
					break;
				case SIA_TYPES.utfz0f:
					length = blockInlineLength + 15;
					break;
				case SIA_TYPES.utfz0g:
					length = blockInlineLength + 18;
					break;
			}
			const string = utfz.unpack(this.buffer, length, this.offset);
			this.refs[this.refCount++] = string;
			this.offset += length;
			return string;
		}
		switch(blockType) {
			case SIA_TYPES.utfz: {
				const length = this.readUInt8();
				const string = utfz.unpack(this.buffer, length, this.offset);
				this.refs[this.refCount++] = string;
				this.offset += length;
				return string;
			}
			case SIA_TYPES.string8:
				length = this.readUInt8();
				break;
			case SIA_TYPES.string16:
				length = this.readUInt16();
				break;
			case SIA_TYPES.string32:
				length = this.readUInt32();
				break;
			case SIA_TYPES.string64:
				length = this.readUInt64();
				break;
			case SIA_TYPES.string128:
				length = this.readUInt128();
				break;
		}
		const string = this.readString(length);
		this.refs[this.refCount++] = string;
		return string;
	}
	decodeArrayBuffer(blockType) {
		let length;
		const blockInlineLength = blockType >> 6;
		if(blockInlineLength != 3) {
			switch(blockType & 0b00111111) {
				case SIA_TYPES.bin0a:
					length = blockInlineLength + 0;
					break;
				case SIA_TYPES.bin0b:
					length = blockInlineLength + 3;
					break;
				case SIA_TYPES.bin0c:
					length = blockInlineLength + 6;
					break;
				case SIA_TYPES.bin0d:
					length = blockInlineLength + 9;
					break;
				case SIA_TYPES.bin0e:
					length = blockInlineLength + 12;
					break;
				case SIA_TYPES.bin0f:
					length = blockInlineLength + 15;
					break;
			}
			const buffer = new Uint8Array(length);
			this.refs[this.refCount++] = buffer.buffer;
			buffer.set(new Uint8Array(this.buffer.buffer, this.offset, length));
			this.offset += length;
			return buffer.buffer;
		}
		switch(blockType) {
			case SIA_TYPES.bin8:
				length = this.readUInt8();
				break;
			case SIA_TYPES.bin16:
				length = this.readUInt16();
				break;
			case SIA_TYPES.bin32:
				length = this.readUInt32();
				break;
			case SIA_TYPES.bin64:
				length = this.readUInt64();
				break;
			case SIA_TYPES.bin128:
				length = this.readUInt128();
				break;
			case SIA_TYPES.binn:
				length = this.readUIntN();
				break;
		}
		const buffer = new Uint8Array(length);
		this.refs[this.refCount++] = buffer.buffer;
		buffer.set(new Uint8Array(this.buffer.buffer, this.offset, length));
		this.offset += length;
		return buffer.buffer;
	}
	decodeConstructor(blockType) {
		let code;
		const blockInlineLength = blockType >> 6;
		if(blockInlineLength != 3) {
			switch(blockType & 0b00111111) {
				case SIA_TYPES.constructor0a:
					code = blockInlineLength + 0;
					break;
				case SIA_TYPES.constructor0b:
					code = blockInlineLength + 3;
					break;
				case SIA_TYPES.constructor0c:
					code = blockInlineLength + 6;
					break;
			}
			const refId = this.refCount++;
			const args = this.deserializeBlock();
			const constructor = this.constructors[code];
			if(!constructor)
				throw new Error(`Constructor ${code} is unknown`);
			const object = constructor.build(args);
			this.refs[refId] = object;
			return object;
		}
		switch(blockType) {
			case SIA_TYPES.constructor8:
				code = this.readUInt8();
				break;
			case SIA_TYPES.constructor16:
				code = this.readUInt16();
				break;
			case SIA_TYPES.constructor32:
				code = this.readUInt32();
				break;
		}
		const refId = this.refCount++;
		const args = this.deserializeBlock();
		const constructor = this.constructors[code];
		if(!constructor)
			throw new Error(`Constructor ${code} is unknown`);
		const object = constructor.build(args);
		this.refs[refId] = object;
		return object;
	}
	decodeArray(blockType) {
		let length;
		const blockInlineLength = blockType >> 6;
		if(blockInlineLength != 3) {
			switch(blockType & 0b00111111) {
				case SIA_TYPES.array0a:
					length = blockInlineLength + 0;
					break;
				case SIA_TYPES.array0b:
					length = blockInlineLength + 3;
					break;
				case SIA_TYPES.array0c:
					length = blockInlineLength + 6;
					break;
				case SIA_TYPES.array0d:
					length = blockInlineLength + 9;
					break;
				case SIA_TYPES.array0e:
					length = blockInlineLength + 12;
					break;
				case SIA_TYPES.array0f:
					length = blockInlineLength + 15;
					break;
			}
			const array = new Array(length);
			this.refs[this.refCount++] = array;
			for(let i = 0; i < length; i++)
				array[i] = this.deserializeBlock();
			return array;
		}
		switch(blockType) {
			case SIA_TYPES.array8:
				length = this.readUInt8();
				break;
			case SIA_TYPES.array16:
				length = this.readUInt16();
				break;
			case SIA_TYPES.array32:
				length = this.readUInt32();
				break;
			case SIA_TYPES.array64:
				length = this.readUInt64();
				break;
			case SIA_TYPES.array128:
				length = this.readUInt128();
				break;
			case SIA_TYPES.arrayn:
				length = this.readUIntN();
				break;
		}
		const array = new Array(length);
		this.refs[this.refCount++] = array;
		for(let i = 0; i < length; i++)
			array[i] = this.deserializeBlock();
		return array;
	}
	decodeObject(blockType) {
		const blockInlineLength = blockType >> 6;
		if(blockInlineLength != 3) {
			let keysLength;
			switch(blockType & 0b00111111) {
				case SIA_TYPES.object0a:
					keysLength = blockInlineLength + 0;
					break;
				case SIA_TYPES.object0b:
					keysLength = blockInlineLength + 3;
					break;
				case SIA_TYPES.object0c:
					keysLength = blockInlineLength + 6;
					break;
				case SIA_TYPES.object0d:
					keysLength = blockInlineLength + 9;
					break;
				case SIA_TYPES.object0e:
					keysLength = blockInlineLength + 12;
					break;
				case SIA_TYPES.object0f:
					keysLength = blockInlineLength + 15;
					break;
			}
			const object = {};
			this.refs[this.refCount++] = object;
			for(let i = 0; i < keysLength; i++)
				object[this.deserializeBlock()] = this.deserializeBlock();
			return object;
		}
		switch(blockType) {
			case SIA_TYPES.objectStart: {
				const object = {};
				this.refs[this.refCount++] = object;
				let curr = this.dataView.getUint8(this.offset);
				while(curr != SIA_TYPES.objectEnd) {
					object[this.deserializeBlock()] = this.deserializeBlock();
					curr = this.dataView.getUint8(this.offset);
				}
				this.offset++;
				return object;
			}
		}
	}
	decodeSet(blockType) {
		switch(blockType) {
			case SIA_TYPES.setStart: {
				const set = new Set();
				this.refs[this.refCount++] = set;
				let curr = this.dataView.getUint8(this.offset);
				while(curr != SIA_TYPES.setEnd) {
					set.add(this.deserializeBlock());
					curr = this.dataView.getUint8(this.offset);
				}
				this.offset++;
				return set;
			}
		}
	}
	decodeMap(blockType) {
		switch(blockType) {
			case SIA_TYPES.mapStart: {
				const map = new Map();
				this.refs[this.refCount++] = map;
				let curr = this.dataView.getUint8(this.offset);
				while(curr != SIA_TYPES.mapEnd) {
					map.set(this.deserializeBlock(), this.deserializeBlock());
					curr = this.dataView.getUint8(this.offset);
				}
				this.offset++;
				return map;
			}
		}
	}

	deserializeBlock() {
		const blockType = this.readUInt8();
		const blockInlineLength = blockType >> 6;
		if(blockInlineLength != 3) {
			switch(blockType & 0b00111111) {
				case SIA_TYPES.uint0a:
				case SIA_TYPES.uint0b:
				case SIA_TYPES.uint0c:
				case SIA_TYPES.uint0d:
				case SIA_TYPES.uint0e:
				case SIA_TYPES.uint0f:
					return this.decodeInteger(blockType);
				case SIA_TYPES.ref0a:
				case SIA_TYPES.ref0b:
				case SIA_TYPES.ref0c:
				case SIA_TYPES.ref0d:
				case SIA_TYPES.ref0e:
				case SIA_TYPES.ref0f:
					return this.decodeRef(blockType);
				case SIA_TYPES.utfz0a:
				case SIA_TYPES.utfz0b:
				case SIA_TYPES.utfz0c:
				case SIA_TYPES.utfz0d:
				case SIA_TYPES.utfz0e:
				case SIA_TYPES.utfz0f:
				case SIA_TYPES.utfz0g:
					return this.decodeString(blockType);
				case SIA_TYPES.bin0a:
				case SIA_TYPES.bin0b:
				case SIA_TYPES.bin0c:
				case SIA_TYPES.bin0d:
				case SIA_TYPES.bin0e:
				case SIA_TYPES.bin0f:
					return this.decodeArrayBuffer(blockType);
				case SIA_TYPES.constructor0a:
				case SIA_TYPES.constructor0b:
				case SIA_TYPES.constructor0c:
					return this.decodeConstructor(blockType);
				case SIA_TYPES.array0a:
				case SIA_TYPES.array0b:
				case SIA_TYPES.array0c:
				case SIA_TYPES.array0d:
				case SIA_TYPES.array0e:
				case SIA_TYPES.array0f:
					return this.decodeArray(blockType);
				case SIA_TYPES.object0a:
				case SIA_TYPES.object0b:
				case SIA_TYPES.object0c:
				case SIA_TYPES.object0d:
				case SIA_TYPES.object0e:
				case SIA_TYPES.object0f:
					return this.decodeObject(blockType);
			}
		}
		switch(blockType) {
			case SIA_TYPES.undefined:
				return this.decodeUndefined(blockType);
			case SIA_TYPES.null:
				return this.decodeNull(blockType);
			case SIA_TYPES.true:
			case SIA_TYPES.false:
				return this.decodeBoolean(blockType);
			case SIA_TYPES.uint8:
			case SIA_TYPES.uint16:
			case SIA_TYPES.uint32:
			case SIA_TYPES.int8:
			case SIA_TYPES.int16:
			case SIA_TYPES.int32:
				return this.decodeInteger(blockType);
			case SIA_TYPES.uint64:
			case SIA_TYPES.uint128:
			case SIA_TYPES.uintn:
			case SIA_TYPES.int64:
			case SIA_TYPES.int128:
			case SIA_TYPES.intn:
				return this.decodeBigInt(blockType);
			case SIA_TYPES.float32:
			case SIA_TYPES.float64:
				return this.decodeFloat(blockType);
			case SIA_TYPES.ref8:
			case SIA_TYPES.ref16:
			case SIA_TYPES.ref32:
			case SIA_TYPES.ref64:
			case SIA_TYPES.ref128:
			case SIA_TYPES.refn:
				return this.decodeRef(blockType);
			case SIA_TYPES.utfz:
			case SIA_TYPES.string8:
			case SIA_TYPES.string16:
			case SIA_TYPES.string32:
			case SIA_TYPES.string64:
			case SIA_TYPES.string128:
				return this.decodeString(blockType);
			case SIA_TYPES.bin8:
			case SIA_TYPES.bin16:
			case SIA_TYPES.bin32:
			case SIA_TYPES.bin64:
			case SIA_TYPES.bin128:
			case SIA_TYPES.binn:
				return this.decodeArrayBuffer(blockType);
			case SIA_TYPES.constructor8:
			case SIA_TYPES.constructor16:
			case SIA_TYPES.constructor32:
				return this.decodeConstructor(blockType);
			case SIA_TYPES.array8:
			case SIA_TYPES.array16:
			case SIA_TYPES.array32:
			case SIA_TYPES.array64:
			case SIA_TYPES.array128:
			case SIA_TYPES.arrayn:
				return this.decodeArray(blockType);
			case SIA_TYPES.objectStart:
				return this.decodeObject(blockType);
			case SIA_TYPES.setStart:
				return this.decodeSet(blockType);
			case SIA_TYPES.mapStart:
				return this.decodeMap(blockType);
			default:
				throw new Error(`Unsupported type: ${blockType}`);
		}
	}
	deserialize(buffer) {
		this.buffer = buffer;
		this.dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
		try {
			return this.deserializeBlock();
		} finally {
			this.reset();
			this.buffer = null;
			this.dataView = null;
		}
	}
}
