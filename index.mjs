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
import z from "zod";
import ejs from "ejs";
import consoleStamp from "console-stamp";
import * as logic from "./logic.mjs";
consoleStamp(console, { format: ":date(mm/dd HH:MM:ss.l) :label" });

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new Hono();
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
/** @type {Worker} */
let worker_ = null;
const getWorker = async () => {
	if(worker_ != null)
		return worker_;
	const worker = worker_ = new Worker(workerFile, { type: "module" });
	worker.addListener("exit", () => { if(worker_ == worker) worker_ = null; });
	worker.addListener("error", () => { if(worker_ == worker) worker_ = null; });
	worker.receiveMessage = () => new Promise((resolve, reject) => {
		const onExit = e => { cleanup(); reject(e); };
		const onError = e => { cleanup(); reject(e); };
		const onMessage = e => { cleanup(); resolve(e); };
		const onMessageError = e => { cleanup(); reject(e); };
		const cleanup = () => {
			worker.removeListener("exit", onExit);
			worker.removeListener("error", onError);
			worker.removeListener("message", onMessage);
			worker.removeListener("messageerror", onMessageError);
		};
		worker.addListener("exit", onExit);
		worker.addListener("error", onError);
		worker.addListener("message", onMessage);
		worker.addListener("messageerror", onMessageError);
	});
	const startMessage = await worker.receiveMessage();
	if(!startMessage.ready)
		throw new Error(`Unexpected message ${JSON.stringify(startMessage)}`);
	return worker;
};
app.post(
	"/api/solve",
	zValidator("form", z.object({
		board: z.string(),
		algorithmName: z.enum(["ucs", "gbfs", "a-star", "ida-star", "ida-star-approx"]),
		heuristicName: z.enum(["none", "car-distance", "car-blocked", "car-blocked-recursive"])
	})),
	async c => {
		const { board, algorithmName, heuristicName } = c.req.valid("form");
		let solverName;
		let heuristic;
		if(algorithmName == "ucs") {
			solverName = "QueueSolver";
			if(heuristicName == "none")
				heuristic = "UCS";
			else
				throw new HTTPException(400, { message: `Unknown heuristic for UCS algorithm: ${heuristicName}` });
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
				throw new HTTPException(400, { message: `Unknown heuristic for GBFS algorithm: ${heuristicName}` });
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
				throw new HTTPException(400, { message: `Unknown heuristic for A-Star algorithm: ${heuristicName}` });
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
				throw new HTTPException(400, { message: `Unknown heuristic for IDA-Star algorithm: ${heuristicName}` });
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
				throw new HTTPException(400, { message: `Unknown heuristic for IDA-Star algorithm: ${heuristicName}` });
		}
		let parsedBoard;
		try {
			parsedBoard = logic.parseBoardInput(board);
		} catch(e) {
			throw new HTTPException(400, { message: `Error while parsing board input: ${e.message ?? e}` });
		}
		try {
			const worker = await getWorker();
			worker.postMessage({
				solverName: solverName,
				heuristicName: heuristic,
				board: parsedBoard
			});
			const data = await Promise.race([
				worker.receiveMessage(),
				new Promise(r => setTimeout(() => r({ timeout: true }), 7000))
			]);
			if(data.timeout) {
				await worker.terminate();
				throw new Error("Timed out");
			}
			if(data.error != null)
				throw new Error(data.error);
			return c.json({
				...data.result,
				board: parsedBoard
			});
		} catch(e) {
			throw new HTTPException(400, { message: `Error while running algorithm: ${e.message ?? e}\n${JSON.stringify(parsedBoard, null, 4)}` });
		}
	}
);

import RouteEsm from "./index.route-esm.mjs";
RouteEsm(app);

serve({
	fetch: app.fetch,
	port: PORT
});
console.log(`Server started at port ${PORT}`);

process.addListener("uncaughtException", error => {
	console.error(`Uncaught exception, Error: ${error.stack || error.message || error}`);
});
process.addListener("unhandledRejection", reason => {
	console.error(`Unhandled rejection, Error: ${reason.stack || reason.message || reason}`);
});
