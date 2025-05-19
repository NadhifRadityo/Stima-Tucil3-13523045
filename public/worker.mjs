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

import { setupMessagingHandler, Sia, DeSia } from "./protocols.mjs";

/** @type {WebSocket} */
let websocket = null;
/** @type {Promise<ReturnType<setupMessagingHandler>>} */
let websocketMessagingHandler = null;
/**
 * @returns {Promise<ReturnType<setupMessagingHandler>>}
 */
const getWebsocketMessagingHandler = () => {
	if(websocketMessagingHandler != null)
		return websocketMessagingHandler;
	const messagingHandlerPromise = websocketMessagingHandler = (async () => {
		const ws = new WebSocket("/ws");
		ws.binaryType = "arraybuffer";
		await new Promise((resolve, reject) => {
			ws.addEventListener("error", e => reject(e));
			ws.addEventListener("close", e => reject(e));
			ws.addEventListener("open", e => resolve(e));
		});
		const wsSia = new Sia();
		const wsDeSia = new DeSia();
		const wsChannel = new MessageChannel();
		ws.addEventListener("error", () => wsChannel.port1.close());
		ws.addEventListener("close", () => wsChannel.port1.close());
		ws.addEventListener("message", e => { if(!(e.data instanceof ArrayBuffer)) return; wsChannel.port1.postMessage(wsDeSia.deserialize(new Uint8Array(e.data))); });
		wsChannel.port1.addEventListener("message", e => ws.send(wsSia.serialize(e.data)));
		const messagingHandler = setupMessagingHandler(wsChannel.port2);
		wsChannel.port1.start();
		wsChannel.port2.start();
		ws.addEventListener("close", () => {
			if(pingHandle != null)
				clearTimeout(pingHandle);
			if(websocket == ws)
				websocket = null;
			if(websocketMessagingHandler == messagingHandler)
				websocketMessagingHandler = null;
		});
		let pingHandle = null;
		const ping = async () => {
			pingHandle = null;
			if(websocket != ws || websocketMessagingHandler != messagingHandler) return;
			let timeoutHandle;
			const result = await Promise.race([
				messagingHandler.requestResponseMessage({ command: "ping" }),
				new Promise(r => { timeoutHandle = setTimeout(() => { timeoutHandle = null; r(); }, 1000 * 10); })
			]).catch(e => e);
			if(timeoutHandle != null)
				clearTimeout(timeoutHandle);
			if(timeoutHandle != null && result == "pong") {
				if(websocket != ws || websocketMessagingHandler != messagingHandler) return;
				pingHandle = setTimeout(() => ping(), 1000 * 5);
				return;
			}
			ws.close();
			if(websocket == ws)
				websocket = null;
			if(websocketMessagingHandler == messagingHandler)
				websocketMessagingHandler = null;
		};
		pingHandle = setTimeout(() => ping(), 1000 * 5);
		if(websocketMessagingHandler == messagingHandlerPromise) {
			websocket = ws;
			websocketMessagingHandler = messagingHandler;
		}
		return messagingHandler;
	})().catch(e => {
		if(websocketMessagingHandler == messagingHandlerPromise) {
			websocket = null;
			websocketMessagingHandler = null;
		}
		throw e;
	});
	return messagingHandlerPromise;
};
const wsRequestResponseMessage = async (data, transfers) => {
	const messageHandler = await getWebsocketMessagingHandler();
	return await messageHandler.requestResponseMessage(data, transfers);
};
const handleConnect = messagePort => {
	const { onMessage, answerMessage } = setupMessagingHandler(messagePort);
	messagePort.start();
	onMessage(e => {
		if(e.command == "solvePuzzle") {
			answerMessage(e.handle, () => wsRequestResponseMessage({ command: "solvePuzzle", board: e.board, algorithmName: e.algorithmName, heuristicName: e.heuristicName }));
			return true;
		}
		if(e.command == "ping") {
			answerMessage(e.handle, () => wsRequestResponseMessage({ command: "ping" }));
			return true;
		}
		return false;
	});
};

function getGlobalDedicatedWorkerAsPort() {
	const result = {
		eventTarget: new EventTarget(),
		started: false,
		closed: false,
		__relayMessageEvent: null,
		__relayMessageErrorEvent: null,
		start() {
			if(this.started) return;
			this.started = true;
			this.__relayMessageEvent = e => this.eventTarget.dispatchEvent(new MessageEvent("message", e));
			this.__relayMessageErrorEvent = e => this.eventTarget.dispatchEvent(new MessageEvent("messageerror", e));
			globalThis.addEventListener("message", this.__relayMessageEvent);
			globalThis.addEventListener("messageerror", this.__relayMessageErrorEvent);
		},
		close() {
			if(!this.started) return;
			if(this.closed) return;
			this.closed = true;
			globalThis.removeEventListener("message", this.__relayMessageEvent);
			globalThis.removeEventListener("messageerror", this.__relayMessageErrorEvent);
			this.__relayMessageEvent = null;
			this.__relayMessageErrorEvent = null;
			this.eventTarget.dispatchEvent(new CloseEvent("close"));
		},
		addEventListener(name, listener, options) {
			this.eventTarget.addEventListener(name, listener, options);
		},
		removeEventListener(name, listener, options) {
			this.eventTarget.removeEventListener(name, listener, options);
		},
		postMessage(message, transferables) {
			if(!this.started) throw new Error("Not started");
			if(this.closed) throw new Error("Endpoint closed");
			globalThis.postMessage(message, transferables);
		}
	};
	setTimeout(() => result.start());
	return result;
}

if(typeof SharedWorkerGlobalScope != "undefined" && globalThis instanceof SharedWorkerGlobalScope)
	self.addEventListener("connect", e => handleConnect(e.ports[0]));
if(typeof DedicatedWorkerGlobalScope != "undefined" && globalThis instanceof DedicatedWorkerGlobalScope)
	handleConnect(getGlobalDedicatedWorkerAsPort());
