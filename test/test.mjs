import path from "path";
import url from "url";
import fs0 from "fs";
import fs from "fs/promises";
import { Worker } from "worker_threads";
import { parseBoardInput } from "../logic.mjs";
import { setupMessagingHandler, Sia, DeSia } from "../protocols.mjs";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerFile = path.join(__dirname, "test-worker.mjs");
const testOutputFile = path.join(__dirname, "test_output.log");
const casesDirectory = path.join(__dirname, "cases/");

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

const combinations = [
	["UCS", "QueueSolverUniform", "Uniform", "None"],
	["GBFS CarDistance", "QueueSolver", "None", "CarDistance"],
	["GBFS CarBlocked", "QueueSolver", "None", "CarBlocked"],
	["GBFS CarBlockedRecursive", "QueueSolver", "None", "CarBlockedRecursive"],
	["A* CarDistance", "QueueSolver", "PathCost", "CarDistance"],
	["A* CarBlocked", "QueueSolver", "PathCost", "CarBlocked"],
	["A* CarBlockedRecursive", "QueueSolver", "PathCost", "CarBlockedRecursive"],
	["IDA* CarDistance", "StackSolver", "PathCost", "CarDistance"],
	["IDA* CarBlocked", "StackSolver", "PathCost", "CarBlocked"],
	["IDA* CarBlockedRecursive", "StackSolver", "PathCost", "CarBlockedRecursive"],
	["IDA* Approx CarDistance", "StackSolverApprox", "PathCost", "CarDistance"],
	["IDA* Approx CarBlocked", "StackSolverApprox", "PathCost", "CarBlocked"],
	["IDA* Approx CarBlockedRecursive", "StackSolverApprox", "PathCost", "CarBlockedRecursive"]
];
const combinationNamesPadCount = Math.max(...combinations.map(c => c[0].length));
const combinationNamesPad = combinations.map(c => c[0].padStart(combinationNamesPadCount, ' '));

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
		worker.addListener("exit", () => workerChannel.port1.close());
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

for(const caseFile of (await fs.readdir(casesDirectory)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(f => path.join(casesDirectory, f))) {
	const boardString = await fs.readFile(caseFile, "utf-8");
	console.log("=====================================");
	console.log(path.relative(__dirname, caseFile));
	console.log(boardString);
	console.log();
	for(let i = 0; i < combinations.length; i++) {
		const [combinationName, solverName, heuristicGName, heuristicHName] = combinations[i];
		const combinationNamePad = combinationNamesPad[i];
		const board = parseBoardInput(boardString)
		const { requestResponseMessage, worker } = pickWorker();
		const data = await Promise.race([
			new Promise(r => setTimeout(() => r({ timeout: true }), 600)),
			requestResponseMessage({
				command: "testSolvePuzzle",
				solverName: solverName,
				heuristicGName: heuristicGName,
				heuristicHName: heuristicHName,
				board: board
			})
		]);
		if(data.timeout) {
			console.table({ [combinationNamePad]: {
				status: "Timed out"
			} });
			await worker.terminate();
		} else {
			console.table({ [combinationNamePad]: {
				...data
			} });
		}
	}
}

for(const { worker } of workerHandlers)
	await worker.terminate();
