import { parentPort } from "worker_threads";
import { setupMessagingHandler, Sia, DeSia } from "../protocols.mjs";
import { QueueSolver, QueueSolverUniform, StackSolver, StackSolverApprox, computeBranchingFactor, State, heuristicZero, heuristicUniform, heuristicCarDistance, heuristicCarBlocked, heuristicCarBlockedRecursive } from "../logic.mjs";

const solvers = {
	"QueueSolver": QueueSolver,
	"QueueSolverUniform": QueueSolverUniform,
	"StackSolver": StackSolver,
	"StackSolverApprox": StackSolverApprox
};
const heuristics = {
	"Zero": heuristicZero,
	"Uniform": heuristicUniform,
	"CarDistance": heuristicCarDistance,
	"CarBlocked": heuristicCarBlocked,
	"CarBlockedRecursive": heuristicCarBlockedRecursive
};

const workerSia = new Sia();
const workerDeSia = new DeSia();
const workerChannel = new MessageChannel();
parentPort.addListener("error", () => workerChannel.port1.close());
parentPort.addListener("message", data => { if(!(data instanceof Uint8Array)) return; workerChannel.port1.postMessage(workerDeSia.deserialize(data)); });
workerChannel.port1.addEventListener("message", e => parentPort.postMessage(workerSia.serialize(e.data)));
const { onMessage, answerMessage } = setupMessagingHandler(workerChannel.port2);
onMessage(e => {
	if(e.command == "testSolvePuzzle") {
		answerMessage(e.handle, () => {
			const { solverName, heuristicGName, heuristicHName, board } = e;
			/** @type {typeof QueueSolver | typeof QueueSolverUniform | typeof StackSolver | typeof StackSolverApprox} */
			const Solver = solvers[solverName];
			const heuristicG = heuristics[heuristicGName];
			const heuristicH = heuristics[heuristicHName];
			const state = State.new_root(board.width, board.height, board.cars, board.carPositions, board.walls, board.exitPosition);

			const durations = [];
			/** @type {QueueSolver | QueueSolverUniform | StackSolver | StackSolverApprox} */
			let lastSolver;
			let lastTickCount;
			let errorMessage = null;
			let countStart = performance.now();
			for(let i = 0; i < 20; i++) {
				const solver = new Solver(heuristicG, heuristicH, state);
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
			return {
				runCount: durations.length,
				duration: `${durationAvg.toFixed(2)}ms ± ${durationDeviation.toFixed(2)}ms`,
				tickCount: lastTickCount,
				visitedNodes: lastSolver.getVisitedNodes(),
				searchCount: lastSolver.getSearchCount(),
				...(errorMessage == null ? {
					branchingFactor: solution != null ? computeBranchingFactor(lastSolver.getSearchCount(), solution.getDepth()).toFixed(3) : null,
					solutionSteps: solution.getStepDescription(),
					parsedSolutionSteps: solution != null ? solution.getStepDescription().split(" ").map(s => [...s.matchAll(/^([0-9]+)([\+-][0-9]+)$/g)][0]).map(r => r == null ? "∅" : `${r[1] == "0" ? "P" : board.cars.find(c => `${c.id}` == r[1])?.symbol ?? "?"}${r[2]}`).join(" ") : "NO SOLUTION"
				} : {
					errorMessage: errorMessage
				})
			};
		});
		return true;
	}
	return false;
});
