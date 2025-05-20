import { QueueSolver, State, computeBranchingFactor, heuristicCarDistance, parseBoardInput, heuristicPathCost } from "../logic.mjs";

globalThis.run = () => {
	const board = parseBoardInput(`6 6
7
CC...H
B..D.H
BPPD.HK
B..D..
F...GG
F.EEE.`);
	const mappingA = Object.fromEntries(board.cars.map(c => [`${c.id}`, c.symbol]));
	const mappingB = Object.fromEntries(board.cars.map(c => [c.symbol, `${c.id}`]));
	global.stepDecoder = s => {
		return "∅ " + s.split(" ").slice(1).map(s => [...s.matchAll(/^([0-9]+)([\+-][0-9]+)$/g)][0]).map(r => `${mappingA[r[1]]}${r[2]}`).join(" ");
	};
	global.stepEncoder = s => {
		return "∅ " + s.split(" ").slice(1).map(s => [...s.matchAll(/^([A-Z]+)([\+-][0-9]+)$/g)][0]).map(r => `${mappingB[r[1]]}${r[2]}`).join(" ");
	};
	const state = State.new_root(board.width, board.height, board.cars, board.carPositions, board.walls, board.exitPosition);
	const solver = new QueueSolver(heuristicPathCost, heuristicCarDistance, state);
	const start = performance.now();
	let tickCount = 0;
	while(solver.tick())
		tickCount++;
	// while(solver.step())
	// 	console.log(`Step ${stepTaken++}: ${performance.now() - start}ms`);
	const solution = solver.getSolution();
	console.log(`Took: ${performance.now() - start}ms`);
	console.log(`Tick count: ${tickCount}`);
	console.log(`Visited nodes: ${solver.getVisitedNodes()}`);
	console.log(`Search count: ${solver.getSearchCount()}`);
	if(solution == null)
		console.log("No Solution");
	else {
		console.log(`Branching factor: ${computeBranchingFactor(solver.getSearchCount(), solution.getDepth())}`);
		console.log(`Solution steps: ${solution.getDepth()}`);
		console.log(globalThis.stepDecoder(solution.getStepDescription()));
	}
};

// for(let i = 0; i < 100; i++)
globalThis.run();

import http from "http";
http.createServer(() => {}).listen(12739);
