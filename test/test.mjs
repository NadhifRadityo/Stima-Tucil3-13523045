// Fetched from: https://github.com/saschazar21/rushhour/blob/master/jams.txt
const script = `Jam-1
6
1 2 h 2
0 1 v 3
0 0 h 2
3 1 v 3
2 5 h 3
0 4 v 2
4 4 h 2
5 0 v 3
.
Jam-2
6
0 2 h 2
0 0 v 2
0 3 h 3
0 5 h 2
2 4 v 2
3 0 h 3
3 1 v 2
4 2 v 2
4 4 h 2
3 5 h 2
5 1 v 3
.
Jam-3
6
1 2 h 2
1 3 h 2
3 2 v 3
1 4 v 2
2 5 h 2
5 3 v 3
.
Jam-4
6
1 2 h 2
2 3 v 2
3 3 h 3
0 0 v 3
5 4 v 2
3 0 v 3
2 5 h 3
.
Jam-5
6
1 2 h 2
0 0 h 2
4 1 v 3
4 5 h 2
0 4 v 2
3 0 v 3
5 0 v 2
1 3 h 3
4 4 h 2
5 2 v 2
0 1 v 3
.
Jam-6
6
1 2 h 2
0 0 h 2
3 2 v 3
0 4 v 2
0 3 h 2
4 1 v 3
3 0 v 2
0 1 h 2
2 3 v 2
3 5 h 3
5 1 v 3
.
Jam-7
6
1 2 h 2
1 0 v 2
3 4 v 2
5 2 v 2
5 0 v 2
2 0 h 2
4 0 v 2
3 1 v 2
2 3 h 2
.
Jam-8
6
0 2 h 2
3 0 h 2
3 5 h 3
0 3 h 2
2 2 v 2
5 0 v 3
2 1 h 2
4 1 v 2
3 2 v 2
4 3 h 2
3 4 h 3
0 4 h 2
2 4 v 2
0 5 h 2
.
Jam-9
6
0 2 h 2
1 0 v 2
1 3 h 3
5 2 v 2
3 1 v 2
4 2 v 3
2 0 h 2
4 0 h 2
4 1 h 2
2 4 v 2
0 3 v 3
5 4 v 2
.
Jam-10
6
1 2 h 2
0 0 h 2
1 3 h 3
4 4 h 2
0 1 h 2
5 1 v 3
2 0 v 2
4 0 h 2
3 4 v 2
0 5 h 2
0 2 v 3
4 5 h 2
.
Jam-11
6
1 2 h 2
1 0 h 2
3 3 h 3
2 5 h 3
0 0 v 3
2 3 v 2
5 4 v 2
3 0 v 3
.
Jam-12
6
0 2 h 2
0 0 v 2
3 3 h 3
0 5 h 3
5 0 v 3
1 0 h 2
4 4 v 2
2 1 v 3
.
Jam-13
6
3 2 h 2
0 0 h 2
4 4 h 2
3 3 h 2
2 1 v 2
5 1 v 3
2 0 h 2
4 0 v 2
1 2 v 2
3 4 v 2
0 3 v 3
1 5 h 2
4 5 h 2
.
Jam-14
6
2 2 h 2
0 0 h 2
4 4 h 2
4 2 v 2
0 2 v 2
0 5 h 2
2 0 v 2
4 1 h 2
1 2 v 2
5 2 v 2
2 4 v 2
2 3 h 2
.
Jam-15
6
2 2 h 2
1 0 h 2
0 2 v 3
3 3 v 2
2 1 h 2
4 1 v 3
3 0 h 2
0 1 h 2
2 3 v 2
4 4 h 2
5 1 v 3
1 2 v 3
1 5 h 2
3 5 h 2
.
Jam-16
6
3 2 h 2
0 0 h 2
3 3 h 3
1 2 v 2
0 1 v 2
5 0 v 3
2 0 h 2
4 0 v 2
2 1 h 2
0 5 h 2
2 2 v 3
.
Jam-17
6
0 2 h 2
0 0 v 2
0 4 h 3
4 4 v 2
2 2 v 2
1 0 h 3
2 1 h 2
4 1 h 2
0 3 h 2
5 4 v 2
3 3 v 3
0 5 h 3
.
Jam-18
6
1 2 h 2
0 0 h 2
1 3 h 3
0 5 h 3
1 4 h 2
3 0 v 3
2 0 v 2
0 1 h 2
0 2 v 3
.
Jam-19
6
2 2 h 2
2 0 v 2
4 3 v 2
1 2 v 2
1 4 h 3
3 0 h 2
4 1 v 2
2 3 h 2
.
Jam-20
6
0 2 h 2
0 0 v 2
3 5 h 3
3 4 h 2
2 2 v 2
3 0 h 3
1 1 h 2
3 1 v 2
2 4 v 2
5 2 v 3
.
Jam-21
6
1 2 h 2
0 0 h 2
1 3 h 3
3 5 h 3
3 0 v 3
2 0 v 2
0 1 v 3
.
Jam-22
6
1 2 h 2
2 0 v 2
1 5 h 3
0 4 v 2
1 3 v 2
3 0 h 3
0 1 v 2
4 1 h 2
4 3 h 2
2 4 h 2
3 1 v 3
5 4 v 2
.
Jam-23
6
3 2 h 2
2 1 v 2
2 5 h 3
4 4 h 2
3 3 v 2
2 0 h 3
3 1 h 2
2 3 v 2
4 3 h 2
5 0 v 3
.
Jam-24
6
2 2 h 2
2 0 v 2
0 5 h 2
1 3 h 2
0 2 v 2
0 4 h 3
3 0 h 2
1 1 v 2
4 2 v 2
4 4 v 2
.
Jam-25
6
1 2 h 2
0 0 h 2
1 3 h 3
1 4 v 2
0 1 h 2
5 1 v 3
2 0 v 2
4 0 h 2
4 2 v 2
3 4 v 2
0 2 v 3
4 4 h 2
4 5 h 2
.
Jam-26
6
1 2 h 2
1 0 v 2
3 5 h 2
2 4 v 2
5 2 v 2
3 0 h 3
0 1 v 2
3 1 v 2
0 3 v 2
5 4 v 2
1 3 h 3
4 1 v 3
.
Jam-27
6
0 2 h 2
0 0 v 2
3 5 h 3
2 4 v 2
2 2 v 2
3 0 v 3
1 0 h 2
1 1 h 2
3 3 h 2
5 2 v 3
.
Jam-28
6
0 2 h 2
3 0 v 2
2 4 h 3
0 5 h 2
1 3 v 2
0 0 h 3
4 1 h 2
0 3 v 2
3 3 h 2
2 5 h 2
2 1 v 3
5 3 v 3
.
Jam-29
6
0 2 h 2
2 1 v 2
0 5 h 3
1 4 h 2
1 3 h 2
0 0 h 3
5 2 v 2
0 3 v 2
3 3 h 2
3 4 v 2
4 0 v 3
5 4 v 2
.
Jam-30
6
1 2 h 2
2 0 v 2
5 3 v 3
2 5 h 2
2 3 h 2
0 0 v 3
3 1 v 2
0 3 h 2
0 5 h 2
3 0 h 3
.
Jam-31
6
1 2 h 2
0 0 h 2
2 3 v 3
0 4 h 2
0 2 v 2
3 0 h 3
3 1 v 2
4 1 h 2
3 3 h 2
3 5 h 3
5 2 v 3
.
Jam-32
6
0 2 h 2
0 0 h 2
0 5 h 2
3 3 h 2
0 3 v 2
2 0 v 3
3 0 v 2
4 0 h 2
1 3 h 2
3 4 v 2
5 3 v 3
.
Jam-33
6
0 2 h 2
1 0 v 2
0 5 h 3
1 4 h 2
1 3 h 2
2 0 v 3
4 0 h 2
4 4 v 2
3 3 h 2
3 4 v 2
5 3 v 3
0 3 v 2
.
Jam-34
6
0 2 h 2
0 0 v 2
0 3 h 3
4 4 h 2
3 3 v 2
3 0 h 3
3 1 v 2
4 2 v 2
2 4 v 2
3 5 h 2
5 1 v 3
0 5 h 2
.
Jam-35
6
0 2 h 2
3 0 h 2
1 3 h 3
4 4 v 2
1 4 h 2
2 0 v 3
3 1 v 2
0 3 v 2
3 4 v 2
0 5 h 2
5 0 v 3
.
Jam-36
6
2 2 h 2
4 0 h 2
5 1 v 3
4 4 h 2
3 3 v 2
0 0 v 3
1 1 v 2
2 1 h 2
2 4 v 2
0 5 h 2
1 0 h 3
0 3 h 3
.
Jam-37
6
1 2 h 2
0 0 h 2
0 2 v 3
4 4 h 2
0 1 h 2
4 1 v 3
2 0 v 2
4 0 h 2
3 4 v 2
0 5 h 2
5 1 v 3
1 3 h 3
4 5 h 2
.
Jam-38
6
0 2 h 2
0 0 v 2
3 5 h 3
2 4 v 2
2 2 v 2
3 0 h 3
1 1 h 2
3 1 v 2
3 3 h 2
3 4 h 2
5 2 v 3
.
Jam-39
6
0 2 h 2
2 0 v 2
5 2 v 3
0 4 v 2
0 3 h 2
3 0 h 3
3 1 v 2
2 2 v 2
3 3 h 2
1 4 v 2
2 4 h 2
2 5 h 2
.
Jam-40
6
3 2 h 2
1 0 h 2
0 3 h 3
2 4 v 2
2 1 v 2
0 0 v 3
4 0 v 2
1 1 v 2
3 3 v 2
4 4 h 2
5 1 v 3
0 5 h 2
3 5 h 2
.`;

import path from "path";
import url from "url";
import fs0 from "fs";
import fs from "fs/promises";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerFile = path.join(__dirname, "test-worker.mjs");
const testOutputFile = path.join(__dirname, "test_output.log");

const origStdoutWrite = process.stdout.write;
const origStderrWrite = process.stderr.write;
const logStream = fs0.createWriteStream(testOutputFile);
const stripAnsi = (str) => str.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "");
process.stdout.write = (chunk, encoding, callback) => {
	const text = typeof chunk == "string" ? chunk : chunk.toString();
	logStream.write(stripAnsi(text));
	return origStdoutWrite.call(process.stdout, chunk, encoding, callback);
};
process.stderr.write = (chunk, encoding, callback) => {
	const text = typeof chunk == "string" ? chunk : chunk.toString();
	logStream.write(stripAnsi(text));
	return origStderrWrite.call(process.stderr, chunk, encoding, callback);
};

import { State, HORIZONTAL, VERTICAL, FIELD_PRIMARY_CAR, FIELD_EMPTY, FIELD_WALL, parseBoardInput } from "../logic.mjs";
import { Worker } from "worker_threads";

const heuristicNames = [
	"QueueSolver-UCS",
	"QueueSolver-GBFSCarDistance",
	"QueueSolver-GBFSCarBlocked",
	"QueueSolver-GBFSCarBlockedRecursive",
	"QueueSolver-AStarCarDistance",
	"QueueSolver-AStarCarBlocked",
	"QueueSolver-AStarCarBlockedRecursive",
	"StackSolver-UCS",
	"StackSolver-GBFSCarDistance",
	"StackSolver-GBFSCarBlocked",
	"StackSolver-GBFSCarBlockedRecursive",
	"StackSolver-AStarCarDistance",
	"StackSolver-AStarCarBlocked",
	"StackSolver-AStarCarBlockedRecursive",
];
const heuristicNamesPadCount = Math.max(...heuristicNames.map(h => h.length));
const heuristicNamesPad = heuristicNames.map(h => h.padStart(heuristicNamesPadCount, ' '));

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

const puzzles = script.split(".");
for(const puzzle of puzzles) {
	if(puzzle == "") continue;
	const lines = puzzle.split("\n").map(l => l.trim()).filter(l => l != "");
	const title = lines.shift();
	const size = parseInt(lines.shift());
	const cars = lines.map(l => l.split(" ")).map(([x, y, d, s], i) => ({
		i: i,
		x: parseInt(x),
		y: parseInt(y),
		d: d == "h" ? HORIZONTAL : VERTICAL,
		s: parseInt(s)
	}));
	const state = State.new_root(
		size, 
		size, 
		cars.map(c => ({ id: c.i, direction: c.d, size: c.s })),
		cars.map(c => c.y * size + c.x),
		[],
		cars[0].d == HORIZONTAL ? cars[0].y * size + (size - 1) : (size - 1) * size + cars[0].x
	);
	const fields = state.getFields();
	const chunksArray = (a, size) =>
		Array.from(
			new Array(Math.ceil(a.length / size)),
			(_, i) => a.slice(i * size, i * size + size)
		);
	const carSymbols = new Array(26).fill().map((_, i) => String.fromCharCode(65 + i)).filter(c => c != "P" && c != "K");
	let fieldString = chunksArray([...fields], size).map(a => a.map(v => `${v == FIELD_EMPTY ? "." : v == FIELD_WALL ? "#" : v == FIELD_PRIMARY_CAR ? "P" : carSymbols[v - 1]}`).join(""));
	if(cars[0].d == VERTICAL)
		fieldString.push(new Array(size).fill(" ").map((c, i) => i == cars[0].x ? "K" : c));
	else
		fieldString = fieldString.map((l, i) => l + (i == cars[0].y ? "K" : " "));
	const boardString = `${size} ${size}
${cars.length - 1}
${fieldString.join("\n")}
	`;
	console.log("=====================================");
	console.log(title);
	console.log(boardString);
	console.log();
	for(let i = 0; i < heuristicNames.length; i++) {
		const heuristicName = heuristicNames[i];
		const heuristicNamePad = heuristicNamesPad[i];
		const worker = await getWorker();
		worker.postMessage({
			heuristicName: heuristicName,
			board: parseBoardInput(boardString)
		});
		const data = await Promise.race([
			worker.receiveMessage(),
			new Promise(r => setTimeout(() => r({ timeout: true }), 600))
		]);
		if(data.timeout) {
			console.table({ [heuristicNamePad]: {
				status: "Timed out"
			} });
			await worker.terminate();
		}
		if(data.error != null) {
			console.table({ [heuristicNamePad]: {
				status: "Error",
				errorMessage: data.error
			} });
		}
		if(data.result != null) {
			console.table({ [heuristicNamePad]: {
				...data.result
			} });
		}
	}
}
await worker_?.terminate();
