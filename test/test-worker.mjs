import { State, heuristicUCS, heuristicGBFSCarDistance, heuristicGBFSCarBlocked, heuristicGBFSCarBlockedRecursive, heuristicAStarCarDistance, heuristicAStarCarBlocked, heuristicAStarCarBlockedRecursive, QueueSolver, computeBranchingFactor, StackSolver, StackSolverApprox } from "../logic.mjs";
import { parentPort } from "worker_threads";

const heuristics = {
	"QueueSolver-UCS": heuristicUCS,
	"QueueSolver-GBFSCarDistance": heuristicGBFSCarDistance,
	"QueueSolver-GBFSCarBlocked": heuristicGBFSCarBlocked,
	"QueueSolver-GBFSCarBlockedRecursive": heuristicGBFSCarBlockedRecursive,
	"QueueSolver-AStarCarDistance": heuristicAStarCarDistance,
	"QueueSolver-AStarCarBlocked": heuristicAStarCarBlocked,
	"QueueSolver-AStarCarBlockedRecursive": heuristicAStarCarBlockedRecursive,
	"StackSolver-UCS": heuristicUCS,
	"StackSolver-GBFSCarDistance": heuristicGBFSCarDistance,
	"StackSolver-GBFSCarBlocked": heuristicGBFSCarBlocked,
	"StackSolver-GBFSCarBlockedRecursive": heuristicGBFSCarBlockedRecursive,
	"StackSolver-AStarCarDistance": heuristicAStarCarDistance,
	"StackSolver-AStarCarBlocked": heuristicAStarCarBlocked,
	"StackSolver-AStarCarBlockedRecursive": heuristicAStarCarBlockedRecursive
};

const receiveMessage = () => new Promise((resolve, reject) => {
	const onError = e => { cleanup(); reject(e); };
	const onMessage = e => { cleanup(); resolve(e); };
	const onMessageError = e => { cleanup(); reject(e); };
	const cleanup = () => {
		parentPort.removeListener("error", onError);
		parentPort.removeListener("message", onMessage);
		parentPort.removeListener("messageerror", onMessageError);
	};
	parentPort.addListener("error", onError);
	parentPort.addListener("message", onMessage);
	parentPort.addListener("messageerror", onMessageError);
});

parentPort.postMessage({ ready: true });

while(true) {
	try {
		const { heuristicName, board } = await receiveMessage();
		const heuristic = heuristics[heuristicName];
		const state = State.new_root(board.width, board.height, board.cars, board.carPositions, board.walls, board.exitPosition);

		const durations = [];
		/** @type {QueueSolver | StackSolver | StackSolverApprox} */
		let lastSolver;
		let lastTickCount;
		let errorMessage = null;
		let countStart = performance.now();
		for(let i = 0; i < 20; i++) {
			const solver = heuristicName.trim().startsWith("QueueSolver") ? new QueueSolver(heuristic, state) : new StackSolverApprox(heuristic, state);
			const isStackSolver = solver instanceof StackSolver || solver instanceof StackSolverApprox;
			const start = performance.now();
			let breakOuter = false;
			let tickCount = 0;
			try {
				if(!isStackSolver) {
					while(solver.tick()) {
						tickCount++;
						if(tickCount % 64 == 0 && i >= 4 && performance.now() - countStart >= 200) {
							breakOuter = true;
							break;
						}
					}
				} else {
					while(solver.tick()) {
						tickCount++;
						if(performance.now() - countStart >= 200) {
							breakOuter = true;
							break;
						}
					}
				}
				if(breakOuter) {
					if(solver.getSolution() == null && lastSolver?.getSolution() == null) {
						lastSolver = solver;
						lastTickCount = tickCount;
					}
					if(i == 0)
						throw new Error("Timed out, ticked too many/long");
					break;
				}
			} catch(e) {
				lastSolver = solver;
				lastTickCount = tickCount;
				errorMessage = `${e.message ?? e}`;
				const end = performance.now();
				durations.push(end - start);
				break;
			}
			lastSolver = solver;
			lastTickCount = tickCount;
			const end = performance.now();
			durations.push(end - start);
		}
		const solution = lastSolver.getSolution();
		const durationAvg = durations.reduce((a, b) => a + b, 0) / durations.length;
		const durationDeviation = Math.sqrt(durations.reduce((a, b) => a + (b - durationAvg)**2, 0) / durations.length);
		const result = {
			runCount: durations.length,
			duration: `${durationAvg.toFixed(2)}ms ± ${durationDeviation.toFixed(2)}ms`,
			tickCount: lastTickCount,
			visitedNodes: lastSolver.getVisitedNodes(),
			searchCount: lastSolver.getSearchCount(),
			...(errorMessage == null ? {
				branchingFactor: solution != null ? computeBranchingFactor(lastSolver.getSearchCount(), solution.getDepth()).toFixed(3) : null,
				solutionSteps: solution != null ? solution.getStepDescription().split(" ").map(s => [...s.matchAll(/^([0-9]+)([\+-][0-9]+)$/g)][0]).map(r => r == null ? "∅" : `${r[1] == "0" ? "P" : board.cars.find(c => `${c.id}` == r[1])?.symbol ?? "?"}${r[2]}`).join(" ") : "NO SOLUTION"
			} : {
				errorMessage: errorMessage
			})
		};
		parentPort.postMessage({ result: result });
	} catch(e) {
		parentPort.postMessage({ error: `${e.message ?? e}` });
	}
}
