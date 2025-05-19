import { State, heuristicUCS, heuristicGBFSCarDistance, heuristicGBFSCarBlocked, heuristicGBFSCarBlockedRecursive, heuristicAStarCarDistance, heuristicAStarCarBlocked, heuristicAStarCarBlockedRecursive, QueueSolver, computeBranchingFactor, StackSolver, StackSolverApprox } from "./logic.mjs";
import { parentPort } from "worker_threads";

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
		const { solverName, heuristicName, board } = await receiveMessage();
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
		const result = {
			duration: end - start,
			tickCount: tickCount,
			visitedNodes: solver.getVisitedNodes(),
			searchCount: solver.getSearchCount(),
			branchingFactor: solution != null ? computeBranchingFactor(solver.getSearchCount(), solution.getDepth()) : null,
			solutionSteps: solution != null ? solution.getStepDescription() : null
		};
		parentPort.postMessage({ result: result });
	} catch(e) {
		parentPort.postMessage({ error: `${e.message ?? e}` });
	}
}
