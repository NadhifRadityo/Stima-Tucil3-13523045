// import { Solver, State, HORIZONTAL, VERTICAL, heuristicAStarCarBlocked, heuristicDepth } from "./logic.mjs";

import fs from "fs/promises";

globalThis.valtypeBinary = 0x7c;
const { createImport: Porffor_createImport } = await import("porffor/compiler/wrap.js");
const Porffor_Byg = (await import("porffor/byg/index.js")).default;
const compileToDebug = source => {
	const originalLines = source.split('\n');
	
	let funcs = {}, funcId = 0;
	
	const lines = source.split('\n');
	let classEnclosure = [];
	let bracket = 0;
	let previousClass = false;
	for (let i = 0; i < lines.length; i++) {
	  if(lines[i].trim().startsWith(".")) continue;
	  if(lines[i].trim().endsWith("{"))
		bracket++;
	  if(lines[i].trim().endsWith("}") || lines[i].trim().endsWith("});"))
		bracket--;
	  if(lines[i].includes("class")) {
		classEnclosure.push(bracket);
		continue;
	  }
	  if(classEnclosure.at(-1) == bracket) {
		previousClass = true;
		continue;
	  }
	  if(previousClass) {
		previousClass = false;
		continue;
	  }
	  if (lines[i].trim().replace('}', '') === '') continue;
	  if(lines[i].includes("return ")) {
		const [a,b] = lines[i].split("return ");
		lines[i] = `${a}return profile1(Porffor.wasm.f64.const(${i})),${b}`
		continue;
	  }
	  if(lines[i].includes("throw ")) {
		const [a,b] = lines[i].split("throw ");
		lines[i] = `${a}throw profile1(Porffor.wasm.f64.const(${i})),${b}`
		continue;
	  }
		lines[i] = `profile1(Porffor.wasm.f64.const(${i}));` + lines[i];
	}
	source = lines.join('\n');
	source = source.replace(/^\s*(function|const)\s*([a-zA-Z0-9]+)(\s*=\s*)?\([^)]*\)\s*(=>)?\s*\{$/gm, (x, _, n) => {
	  const id = funcId++;
	  funcs[funcId] = n;
	  return `${x}profile2(Porffor.wasm.f64.const(${id}));`;
	});
	
	const breakpoints = new Array(lines.length);
	
	let paused = true;
	const byg = Porffor_Byg({
	  lines: originalLines,
	  pause: () => { paused = true; },
	  breakpoint: (line, breakpoint) => {
		breakpoints[line] = breakpoint;
	  }
	});
	
	let stepIn = false, stepOut = false;
	const callStack = [];
	
	let _paused;
	let callStarts = [];
	let lastLine;
	
	let output = '';
	
	Porffor_createImport('profile1', 1, 0, n => {
	  if (callStarts[callStarts.length - 1] === n - 1) {
		// end of call
	
		callStarts.pop();
		callStack.pop();
	
		paused = _paused;
	  }
	
	  lastLine = n;
	
	  if (breakpoints[n]) paused = true;
	
	  if (paused) {
		stepIn = false; stepOut = false;
	
		switch (byg(
		  paused,
		  n,
		  `\x1b[1mporffor debugger\x1b[22m: ${file}@${n + 1}    ${callStack.join('->')}`,
		  [
			{
			  x: termWidth - 1 - 40 - 6,
			  y: () => 4,
			  width: 40,
			  height: 20,
			  title: 'console',
			  content: output.split('\n')
			}
		  ]
		)) {
		  case 'resume': {
			paused = false;
			break;
		  }
	
		  case 'stepOver': {
			break;
		  }
	
		  case 'stepIn': {
			stepIn = true;
			// paused = false;
			break;
		  }
	
		  case 'stepOut': {
			stepOut = true;
			paused = false;
			break;
		  }
		}
	  }
	});
	
	Porffor_createImport('profile2', 1, 0, n => {
	  // start of call
	  callStack.push(funcs[n]);
	
	  callStarts.push(lastLine);
	
	  _paused = paused;
	  if (!stepIn) paused = false;
		else paused = true;
	});
	return source;
}

await fs.writeFile("test2.debug.mjs", compileToDebug(await fs.readFile("test2.mjs", "utf-8")), "utf-8");
const { default: Porffor_compile } = await import("porffor/compiler/wrap.js");
// const wasm = Porffor_compile(compileToDebug(await fs.readFile("test2.mjs", "utf-8")), true, {
const wasm = Porffor_compile(await fs.readFile("test2.mjs", "utf-8"), true, {
	__Porffor_hashFields: {
		params: 4,
		returns: 0,
		js: (width, height, fields, out) => {
			// 0: Length, 4: address, 8: limit
			const memory = new DataView(wasm.exports["$"].buffer);
			const fieldsBuffer = memory.getUint32(fields + 4, true) + 4;
			let hash = 0x811c9dc5;
			// Optimisation: This hashCode is not 100% correct. But that's what we sacrifice to half the computation.
			// Optimisation: Compute the hashCode over checkered board pattern to reduce clashes.
			// This hash is safe as long as there's no one-sized car.
			for(let y = 0; y < height; y++) {
				for(let x = y % 2 == 0 ? 0 : 1; x < width; x++) {
					const i = y * width + x;
					hash ^= memory.getUint8(fieldsBuffer + i);
					hash = (hash * 0x010193) >>> 0;
				}
			}
			memory.setUint32(memory.getUint32(out + 4, true) + 4, hash, true);
		}
	}
});

process.argv = ["", "", "",
	`0\x006 6
12
AAB..F
..BCDF
GPPCDFK
GH.III
GHJ...
LLJMM.`
];
wasm.exports.main();
for(let i = 0; i < 10; i++)
	wasm.exports.Porffor_runSolver();

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

// for(let i = 0; i < 100; i++)
// globalThis.run();

import http from "http";
http.createServer(() => {}).listen(25312);
