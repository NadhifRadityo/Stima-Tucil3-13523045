import { parentPort } from "worker_threads";
import { setupMessagingHandler, Sia, DeSia } from "./protocols.mjs";
import { State, heuristicUCS, heuristicGBFSCarDistance, heuristicGBFSCarBlocked, heuristicGBFSCarBlockedRecursive, heuristicAStarCarDistance, heuristicAStarCarBlocked, heuristicAStarCarBlockedRecursive, QueueSolver, computeBranchingFactor, StackSolver, StackSolverApprox } from "./logic.mjs";

const solvers = {
	"QueueSolver": QueueSolver,
	"StackSolver": StackSolver,
	"StackSolverApprox": StackSolverApprox
};
const heuristics = {
	"UCS": heuristicUCS,
	"GBFSCarDistance": heuristicGBFSCarDistance,
	"GBFSCarBlocked": heuristicGBFSCarBlocked,
	"GBFSCarBlockedRecursive": heuristicGBFSCarBlockedRecursive,
	"AStarCarDistance": heuristicAStarCarDistance,
	"AStarCarBlocked": heuristicAStarCarBlocked,
	"AStarCarBlockedRecursive": heuristicAStarCarBlockedRecursive
};

const workerSia = new Sia();
const workerDeSia = new DeSia();
const workerChannel = new MessageChannel();
parentPort.addListener("error", () => workerChannel.port1.close());
parentPort.addListener("message", data => { if(!(data instanceof Uint8Array)) return; workerChannel.port1.postMessage(workerDeSia.deserialize(data)); });
workerChannel.port1.addEventListener("message", e => parentPort.postMessage(workerSia.serialize(e.data)));
const { onMessage, answerMessage } = setupMessagingHandler(workerChannel.port2);
onMessage(e => {
	if(e.command == "solvePuzzle") {
		answerMessage(e.handle, () => {
			const { solverName, heuristicName, board } = e;
			/** @type {typeof QueueSolver | typeof StackSolver | typeof StackSolverApprox} */
			const Solver = solvers[solverName];
			const heuristic = heuristics[heuristicName];
			const state = State.new_root(board.width, board.height, board.cars, board.carPositions, board.walls, board.exitPosition);
			const solver = new Solver(heuristic, state);
			const isStackSolver = solver instanceof StackSolver || solver instanceof StackSolverApprox;
			const start = performance.now();
			let tickCount = 0;
			if(!isStackSolver) {
				while(solver.tick()) {
					tickCount++;
					if(tickCount % 64 == 0 && performance.now() - start >= 5000)
						throw Error(`Timed out. Tick count: ${tickCount}, Visited nodes: ${solver.getVisitedNodes()}, Search count: ${solver.getSearchCount()}`);
				}
			} else {
				while(solver.tick()) {
					tickCount++;
					if(performance.now() - start >= 5000)
						throw Error(`Timed out. Tick count: ${tickCount}, Visited nodes: ${solver.getVisitedNodes()}, Search count: ${solver.getSearchCount()}`);
				}
			}
			const end = performance.now();
			const solution = solver.getSolution();
			return {
				duration: end - start,
				tickCount: tickCount,
				visitedNodes: solver.getVisitedNodes(),
				searchCount: solver.getSearchCount(),
				branchingFactor: solution != null ? computeBranchingFactor(solver.getSearchCount(), solution.getDepth()) : null,
				solutionSteps: solution != null ? solution.getStepDescription() : null
			};
		});
		return true;
	}
	return false;
});
