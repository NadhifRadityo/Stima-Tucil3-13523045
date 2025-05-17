import path from "path";
import url from "url";
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
app.post(
	"/api/solve",
	zValidator("form", z.object({
		board: z.string(),
		algorithm: z.enum(["ucs", "gbfs", "a-star"]),
		heuristic: z.enum(["none", "car-blocked"])
	})),
	async c => {
		const { board, algorithm, heuristic } = c.req.valid("form");
		/** @type {logic.HeuristicCalculator} */
		let heuristicCalculator;
		if(algorithm == "ucs") {
			if(heuristic == "none")
				heuristicCalculator = logic.heuristicUCS;
			else
				throw new HTTPException(400, { message: `Unknown heuristic for UCS algorithm: ${heuristic}` });
		}
		if(algorithm == "gbfs") {
			if(heuristic == "car-blocked")
				heuristicCalculator = logic.heuristicGBFSCarBlocked;
			else
				throw new HTTPException(400, { message: `Unknown heuristic for GBFS algorithm: ${heuristic}` });
		}
		if(algorithm == "a-star") {
			if(heuristic == "car-blocked")
				heuristicCalculator = logic.heuristicAStarCarBlocked;
			else
				throw new HTTPException(400, { message: `Unknown heuristic for A-Star algorithm: ${heuristic}` });
		}
		let parsedBoard;
		try {
			parsedBoard = logic.parseBoardInput(board);
		} catch(e) {
			throw new HTTPException(400, { message: `Error while parsing board input: ${e.message ?? e}` });
		}
		try {
			const state = logic.State.new_root(
				parsedBoard.width, 
				parsedBoard.height, 
				parsedBoard.cars, 
				parsedBoard.carPositions, 
				parsedBoard.walls, 
				parsedBoard.exitPosition
			);
			const solver = new logic.Solver(heuristicCalculator, state);
			const start = performance.now();
			let currentTick = 0;
			while(solver.tick()) {
				currentTick++;
				if(currentTick % 500 == 0 && performance.now() - start >= 5000)
					throw new HTTPException(400, { message: `Timed out` });
			}
			const end = performance.now();
			return c.json({
				duration: end - start,
				board: parsedBoard,
				visitedNodes: solver.getVisitedNodes(),
				solutionSteps: solver.getSolution()?.getStepDescription() ?? null
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
