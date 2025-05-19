import path from "path";
import url from "url";
import { Worker } from "worker_threads";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { compress } from "hono/compress";
import { etag } from "hono/etag";
import { zValidator } from "@hono/zod-validator";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import z from "zod";
import ejs from "ejs";
import consoleStamp from "console-stamp";
import { parseBoardInput } from "./logic.mjs";
import { setupMessagingHandler, Sia, DeSia } from "./protocols.mjs";
consoleStamp(console, { format: ":date(mm/dd HH:MM:ss.l) :label" });

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {Hono<{ Bindings: import("@hono/node-server").HttpBindings }>} */
const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
const PORT = process.env.PORT || 3000;

const publicPath = path.join(__dirname, "public");
const viewsPath = path.join(__dirname, "views");
const workerFile = path.join(__dirname, "worker.mjs");

app.use(async (c, next) => {
	const requestIp = c.req.header("x-forwarded-for") ?? c.env.incoming.socket.remoteAddress;
	const requestProtocol = c.req.header("x-forwarded-proto") ?? "http";
	console.log(`[REQUEST]: ${requestIp}: (${requestProtocol}) ${c.env.incoming.url}`);
	await next();
});
app.use("*", compress(), etag());
app.get("/public/*", serveStatic({
	root: path.relative(path.resolve("./"), publicPath),
	rewriteRequestPath: p => p.replace(/^\/public/, "")
}));
app.get("*", async (c, next) => {
	c.setRenderer(async (template, data) => {
		const templatePath = path.join(viewsPath, `${template}.ejs`);
		const options = globalThis.__ejs_opts ??= { root: viewsPath };
		const rendered = await ejs.renderFile(templatePath, data, options);
		return c.html(rendered);
	});
	await next();
});
app.get("/", async c => {
	return c.render("index");
});

const maxWorkers = 4;
/** @type {(ReturnType<typeof setupMessagingHandler> & { worker: Worker })[]} */
const workerHandlers = [];
let lastWorkerShuffled = 0;
const pickWorker = () => {
	const now = Date.now();
	if(now - lastWorkerShuffled > 100) {
		lastWorkerShuffled = now;
		for(let i = 0; i < workerHandlers.length - 1; i++) {
			const j = Math.floor(Math.random() * (workerHandlers.length - i));
			const temp = workerHandlers[i];
			workerHandlers[i] = workerHandlers[j];
			workerHandlers[j] = temp;
		}
	}
	/** @type {(ReturnType<typeof setupMessagingHandler> & { worker: Worker })} */
	let pickedWorkerHandler = null;
	for(const workerHandler of workerHandlers) {
		if(pickedWorkerHandler != null && pickedWorkerHandler.pendingResponseMessage.size <= workerHandler.pendingResponseMessage.size)
			continue;
		pickedWorkerHandler = workerHandler;
		if(workerHandler.pendingResponseMessage.size == 0)
			break;
	}
	if(pickedWorkerHandler == null || (pickedWorkerHandler.pendingResponseMessage.size > 0 && workerHandlers.length < maxWorkers)) {
		const worker = new Worker(workerFile, { type: "module" });
		const workerSia = new Sia();
		const workerDeSia = new DeSia();
		const workerChannel = new MessageChannel();
		worker.addListener("error", () => workerChannel.port1.close());
		worker.addListener("message", data => { if(!(data instanceof Uint8Array)) return; workerChannel.port1.postMessage(workerDeSia.deserialize(data)); });
		workerChannel.port1.addEventListener("message", e => worker.postMessage(workerSia.serialize(e.data)));
		const workerHandler = setupMessagingHandler(workerChannel.port2);
		workerChannel.port1.start();
		workerChannel.port2.start();
		worker.addListener("exit", () => {
			const index = workerHandlers.indexOf(workerHandler);
			if(index == -1) return;
			workerHandlers.splice(index, 1);
		});
		workerHandler.worker = worker;
		workerHandlers.push(workerHandler);
		pickedWorkerHandler = workerHandler;
	}
	return pickedWorkerHandler;
};
const solvePuzzleSchema = z.object({
	board: z.string(),
	algorithmName: z.enum(["ucs", "gbfs", "a-star", "ida-star", "ida-star-approx"]),
	heuristicName: z.enum(["none", "car-distance", "car-blocked", "car-blocked-recursive"])
});
/**
 * @param {z.output<typeof solvePuzzleSchema>["algorithmName"]} algorithmName
 * @param {z.output<typeof solvePuzzleSchema>["heuristicName"]} heuristicName
 */
const getSolverNameAndHeuristicName = (algorithmName, heuristicName) => {
	let solverName;
	let heuristic;
	if(algorithmName == "ucs") {
		solverName = "QueueSolver";
		if(heuristicName == "none")
			heuristic = "UCS";
		else
			throw `Unknown heuristic for UCS algorithm: ${heuristicName}`;
	}
	if(algorithmName == "gbfs") {
		solverName = "QueueSolver";
		if(heuristicName == "car-distance")
			heuristic = "GBFSCarDistance";
		else if(heuristicName == "car-blocked")
			heuristic = "GBFSCarBlocked";
		else if(heuristicName == "car-blocked-recursive")
			heuristic = "GBFSCarBlockedRecursive";
		else
			throw `Unknown heuristic for GBFS algorithm: ${heuristicName}`;
	}
	if(algorithmName == "a-star") {
		solverName = "QueueSolver";
		if(heuristicName == "car-distance")
			heuristic = "AStarCarDistance";
		else if(heuristicName == "car-blocked")
			heuristic = "AStarCarBlocked";
		else if(heuristicName == "car-blocked-recursive")
			heuristic = "AStarCarBlockedRecursive";
		else
			throw `Unknown heuristic for A-Star algorithm: ${heuristicName}`;
	}
	if(algorithmName == "ida-star") {
		solverName = "StackSolver";
		if(heuristicName == "car-distance")
			heuristic = "AStarCarDistance";
		else if(heuristicName == "car-blocked")
			heuristic = "AStarCarBlocked";
		else if(heuristicName == "car-blocked-recursive")
			heuristic = "AStarCarBlockedRecursive";
		else
			throw `Unknown heuristic for IDA-Star algorithm: ${heuristicName}`;
	}
	if(algorithmName == "ida-star-approx") {
		solverName = "StackSolverApprox";
		if(heuristicName == "car-distance")
			heuristic = "AStarCarDistance";
		else if(heuristicName == "car-blocked")
			heuristic = "AStarCarBlocked";
		else if(heuristicName == "car-blocked-recursive")
			heuristic = "AStarCarBlockedRecursive";
		else
			throw `Unknown heuristic for IDA-Star algorithm: ${heuristicName}`;
	}
	return [solverName, heuristic];
};
app.post(
	"/api/solve-puzzle",
	zValidator("form", solvePuzzleSchema),
	async c => {
		try {
			const { board, algorithmName, heuristicName } = c.req.valid("form");
			const [solverName, heuristic] = getSolverNameAndHeuristicName(algorithmName, heuristicName);
			const parsedBoard = parseBoardInput(board);
			try {
				for(let i = 0; i < 3; i++) {
					const { requestResponseMessage, worker } = pickWorker();
					let data;
					try {
						data = await Promise.race([
							new Promise(r => setTimeout(() => r({ timeout: true }), 7000)),
							requestResponseMessage({
								command: "solvePuzzle",
								solverName: solverName,
								heuristicName: heuristic,
								board: parsedBoard
							})
						]);
					} catch(e) {
						if(`${e.message ?? e}` == "Messaging channel closed")
							continue;
						throw e;
					}
					if(data.timeout) {
						await worker.terminate();
						throw new Error("Timed out");
					}
					return c.json({
						...data,
						board: parsedBoard
					});
				}
			} catch(e) {
				throw new HTTPException(400, { message: `${e.message ?? e}\n${JSON.stringify(parsedBoard, null, 4)}` });
			}
		} catch(e) {
			throw new HTTPException(400, { message: `${e.message ?? e}` });
		}
	}
);
app.get(
	"/ws",
	upgradeWebSocket(c => {
		return {
			onOpen: (_, ws) => {
				ws.binaryType = "arraybuffer";
				const wsSia = new Sia();
				const wsDeSia = new DeSia();
				const wsChannel = new MessageChannel();
				ws.raw.addEventListener("error", () => wsChannel.port1.close());
				ws.raw.addEventListener("close", () => wsChannel.port1.close());
				ws.raw.addEventListener("message", e => { if(!(e.data instanceof Uint8Array)) return; wsChannel.port1.postMessage(wsDeSia.deserialize(e.data)); });
				wsChannel.port1.addEventListener("message", e => ws.raw.send(wsSia.serialize(e.data)));
				const { onMessage, answerMessage } = setupMessagingHandler(wsChannel.port2);
				wsChannel.port1.start();
				wsChannel.port2.start();
				onMessage(e => {
					if(e.command == "ping") {
						answerMessage(e.handle, () => "pong");
						return true;
					}
					if(e.command == "solvePuzzle") {
						answerMessage(e.handle, async () => {
							try {
								const { board, algorithmName, heuristicName } = solvePuzzleSchema.parse({ board: e.board, algorithmName: e.algorithmName, heuristicName: e.heuristicName });
								const [solverName, heuristic] = getSolverNameAndHeuristicName(algorithmName, heuristicName);
								const parsedBoard = parseBoardInput(board);
								try {
									for(let i = 0; i < 3; i++) {
										const { requestResponseMessage, worker } = pickWorker();
										let data;
										try {
											data = await Promise.race([
												new Promise(r => setTimeout(() => r({ timeout: true }), 7000)),
												requestResponseMessage({
													command: "solvePuzzle",
													solverName: solverName,
													heuristicName: heuristic,
													board: parsedBoard
												})
											]);
										} catch(e) {
											if(`${e.message ?? e}` == "Messaging channel closed")
												continue;
											throw e;
										}
										if(data.timeout) {
											await worker.terminate();
											throw "Timed out";
										}
										return {
											...data,
											board: parsedBoard
										};
									}
								} catch(e) {
									throw `${e.message ?? e}\n${JSON.stringify(parsedBoard, null, 4)}`;
								}
							} catch(e) {
								throw `${e.message ?? e}`;
							}
						});
						return true;
					}
					return false;
				});
			}
		};
	})
);

import RouteEsm from "./index.route-esm.mjs";
RouteEsm(app);

const server = serve({
	fetch: app.fetch,
	port: PORT
});
injectWebSocket(server);
console.log(`Server started at port ${PORT}`);

process.addListener("uncaughtException", error => {
	console.error(`Uncaught exception, Error: ${error.stack || error.message || error}`);
});
process.addListener("unhandledRejection", reason => {
	console.error(`Unhandled rejection, Error: ${reason.stack || reason.message || reason}`);
});
