import { Solver, State, HORIZONTAL, VERTICAL, heuristicAStarCarBlocked, heuristicDepth } from "./logic.mjs";

globalThis.run = () => {
	global.stepDecoder = s => {
		const mapping = {
			"0": "A",
			"1": "G",
			"2": "C",
			"3": "H",
			"4": "I",
			"5": "B",
			"6": "E",
			"7": "F",
			"8": "D",
			"9": "J",
			"10": "K",
			"11": "L",
			"12": "M",
		};
		return "∅ " + s.split(" ").slice(1).map(s => [...s.matchAll(/^([0-9]+)([\+-][0-9]+)$/g)][0]).map(r => `${mapping[r[1]]}${r[2]}`).join(" ");
	};
	global.stepEncoder = s => {
		const mapping = {
			"A": "0",
			"G": "1",
			"C": "2",
			"H": "3",
			"I": "4",
			"B": "5",
			"E": "6",
			"F": "7",
			"D": "8",
			"J": "9",
			"K": "10",
			"L": "11",
			"M": "12",
		};
		return "∅ " + s.split(" ").slice(1).map(s => [...s.matchAll(/^([A-Z]+)([\+-][0-9]+)$/g)][0]).map(r => `${mapping[r[1]]}${r[2]}`).join(" ");
	};
	const state = State.new_root(
		6, 6,
		[
			{ id: 0, direction: HORIZONTAL, size: 2 }, // A
			{ id: 1, direction: VERTICAL, size: 3 }, // G
			{ id: 2, direction: HORIZONTAL, size: 3 }, // C
			{ id: 3, direction: VERTICAL, size: 2 }, // H
			{ id: 4, direction: VERTICAL, size: 2 }, // I
			{ id: 5, direction: HORIZONTAL, size: 2 }, // B
			{ id: 6, direction: HORIZONTAL, size: 2 }, // E
			{ id: 7, direction: HORIZONTAL, size: 2 }, // F
			{ id: 8, direction: HORIZONTAL, size: 2 }, // D
			{ id: 9, direction: VERTICAL, size: 2 }, // J
			{ id: 10, direction: VERTICAL, size: 2 }, // K
			{ id: 11, direction: VERTICAL, size: 2 }, // L
			{ id: 12, direction: VERTICAL, size: 3 } // M
		],
		[
			2 * 6 + 3,
			0 * 6 + 0,
			3 * 6 + 0,
			1 * 6 + 1,
			1 * 6 + 2,
			0 * 6 + 1,
			5 * 6 + 0,
			5 * 6 + 3,
			4 * 6 + 4,
			4 * 6 + 2,
			3 * 6 + 3,
			0 * 6 + 4,
			1 * 6 + 5,
		],
		[],
		2 * 6 + 5
	);
	// const stateStep = State.new_fromSteps(state, stepEncoder("∅ F+1 K+1 M-1 C+3 H+2 J-1 E+1 G+3 B-1 I-1 A-3 I+1 L+1 B+3 I-1 A+2 G-3 E-1 H-3 A-1 J+1 C-3 M+1 B+1 K-4 A+1 C+2 D-1 F-1 H+3 A-1 K+1 B-1 M-1 C+1 J-1 E+1 G+3 A-1 I+1 B-3 I-1 A+1 G-1 E-1 J+1 C-1 K-1 L-1"));
	const stateStep = state;
	const solver = new Solver(heuristicAStarCarBlocked, stateStep);
	const start = Date.now();
	let stepTaken = 0;
	while(solver.tick());
	// while(solver.step())
	// 	console.log(`Step ${stepTaken++}: ${Date.now() - start}ms`);
	console.log(`Took: ${Date.now() - start}ms`)
	if(solver.getSolution() == null)
		console.log("No Solution");
	else {
		console.log(`Steps needed: ${heuristicDepth(solver.getSolution())}`);
		console.log(solver.getSolution().getStepDescription());
	}
};

for(let i = 0; i < 20; i++)
globalThis.run();
