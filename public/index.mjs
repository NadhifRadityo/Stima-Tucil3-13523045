import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOMClient from "react-dom/client";
import { html, HORIZONTAL, VERTICAL, solvePuzzle } from "./shared.mjs";
import BoardView from "./BoardView.mjs";

const reconstructCarPositions = (board, solutionSteps) => {
	const positions = [board.carPositions.slice()];
	const moves = solutionSteps.trim().slice(1).trim().split(/\s+/);
	let current = board.carPositions.slice();
	for(const move of moves) {
		const [, idStr, op, valStr] = move.match(/(\d+)([+-])(\d+)/);
		const id = Number(idStr);
		const amount = (op == "+" ? 1 : -1) * Number(valStr);
		const direction = board.cars[id].direction;
		const width = board.width;
		current = [...current];
		if(direction == HORIZONTAL)
			current[id] = current[id] + amount;
		if(direction == VERTICAL)
			current[id] = current[id] + amount * width
		positions.push(current);
	}
	return positions;
};

const ApplicationElement = () => {
	const [boardText, setBoardText] = useState(`6 6
11
AAB..F
..BCDF
GPPCDFK
GH.III
GHJ...
LLJMM.`);
	const [algorithmName, setAlgorithmName] = useState("ucs");
	const [heuristicName, setHeuristicName] = useState("none");
	const [isPending, setIsPending] = useState(false);
	const [result, setResult] = useState(null);
	const [stepPositions, setStepPositions] = useState(null);
	const [currentStepPosition, setCurrentStepPosition] = useState(null);
	const fileInputRef = useRef();
	const handleFileChange = e => {
		const file = e.target.files?.[0];
		if(file == null) return;
		const reader = new FileReader();
		reader.onload = event => setBoardText(event.target.result);
		reader.readAsText(file);
	};
	const handleSubmit = async () => {
		if(isPending) return;
		setIsPending(true);
		let result;
		try {
			result = await solvePuzzle(boardText, algorithmName, heuristicName);
		} catch(e) {
			alert(`Tidak dapat menjalankan solver: ${e.stack ?? e.message ?? e}`);
			return;
		} finally{
			setIsPending(false);
		}
		setResult(result);
		if(result.solutionSteps == null) {
			alert("Tidak ada solusi!");
			setStepPositions([result.board.carPositions]);
			setCurrentStepPosition(0);
			return;
		}
		const stepPositions = reconstructCarPositions(result.board, result.solutionSteps);
		setStepPositions(stepPositions);
		setCurrentStepPosition(stepPositions.length - 1);
	};
	return html`
		<div className="max-w-5xl mx-auto p-6 space-y-6">
			<h1 className="text-3xl font-bold text-center">🚗 Rush Hour Puzzle Solver</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="space-y-4">
					<label className="block font-semibold">Konfigurasi Permainan:</label>
					<textarea
						value=${boardText}
						onInput=${e => setBoardText(e.target.value)}
						className="w-full p-3 border rounded h-44 font-mono text-sm resize-none"
						placeholder="Paste konfigurasi dari file .txt di sini"
					></textarea>
					<input
						ref=${fileInputRef}
						type="file"
						accept=".txt"
						onChange=${handleFileChange}
						className="block"
					/>
				</div>
				<div className="space-y-4">
					<div>
						<label className="font-semibold block mb-1">Algoritma Pathfinding:</label>
						<select
							value=${algorithmName}
							onChange=${e => {
								setAlgorithmName(e.target.value);
								if(e.target.value == "ucs" && heuristicName != "none")
									setHeuristicName("none");
								if(e.target.value != "ucs" && heuristicName == "none")
									setHeuristicName("car-blocked");
							}}
							className="w-full border rounded p-2"
						>
							<option value="ucs">UCS (Uniform Cost Search)</option>
							<option value="gbfs">GBFS (Greedy Best First Search)</option>
							<option value="a-star">A* (A-Star)</option>
							<option value="ida-star">IDA* (Iterative Deepening A-Star)</option>
							<option value="ida-star-approx">IDA* (Iterative Deepening A-Star) [Approx]</option>
						</select>
					</div>
					<div>
						<label className="font-semibold block mb-1">Heuristik:</label>
						<select
							value=${heuristicName}
							onChange=${e => setHeuristicName(e.target.value)}
							className="w-full border rounded p-2"
						>
							<option value="none" disabled=${algorithmName != "ucs"}>Tanpa Heuristik</option>
							<option value="car-distance" disabled=${algorithmName == "ucs"}>Jarak Mobil</option>
							<option value="car-blocked" disabled=${algorithmName == "ucs"}>Mobil Terhalangi</option>
							<option value="car-blocked-recursive" disabled=${algorithmName == "ucs"}>Mobil Terhalangi (Rekursif)</option>
						</select>
					</div>
					<button
						onClick=${handleSubmit}
						disabled=${isPending}
						className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded mt-2 cursor-pointer disabled:cursor-default"
					>
						${isPending ? "⌛ Menjalankan solver..." : "🔍 Jalankan Solver"}
					</button>
				</div>
			</div>
			${result && html`<${React.Fragment}>
				<div className="bg-gray-100 p-4 rounded shadow text-sm">
					<p><strong>Waktu eksekusi:</strong> ${result.duration}ms</p>
					<p><strong>Tick count:</strong> ${result.tickCount}</p>
					<p><strong>Node diperiksa:</strong> ${result.visitedNodes}</p>
					<p><strong>Banyak pencarian:</strong> ${result.searchCount}</p>
					${result.solutionSteps != null ? html`<${React.Fragment}>
						<p><strong>Branching factor:</strong> ${result.branchingFactor}</p>
						<p><strong>Step:</strong> ${result.solutionSteps.split(" ").map(s => [...s.matchAll(/^([0-9]+)([\+-][0-9]+)$/g)][0]).map((r, i) => html`
							<span
								key=${i}
								className=${`inline-block m-1 px-[1px] rounded-sm border border-neutral-500 cursor-pointer transition-colors duration-75 ${currentStepPosition == i ? "bg-green-300" : ""}`}
								onClick=${() => setCurrentStepPosition(i)}
							>
								${r == null ? "∅" : `${result.board.cars.find(c => `${c.id}` == r[1])?.symbol ?? "?"}${r[2]}`}
							</span>${' '}
						`)}</p>
					</${React.Fragment}>` : null}
				</div>
				${stepPositions.length > 0 && html`
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold">🔁 Visualisasi Langkah</h2>
							<div className="flex flex-col">
								<div className="space-x-2">
									<button
										onClick=${() => setCurrentStepPosition(s => Math.max(0, s - 1))}
										disabled=${currentStepPosition == 0}
										className="px-3 py-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-100 rounded cursor-pointer disabled:cursor-default"
									>⬅️</button>
									<span className="font-medium">Langkah ${currentStepPosition} / ${stepPositions.length - 1}</span>
									<button
										onClick=${() => setCurrentStepPosition(s => Math.min(stepPositions.length - 1, s + 1))}
										disabled=${currentStepPosition == stepPositions.length - 1}
										className="px-3 py-1 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-100 rounded cursor-pointer disabled:cursor-default"
									>➡️</button>
								</div>
								<input
									className="self-stretch"
									type="range"
									min="0"
									max=${stepPositions.length - 1}
									value=${currentStepPosition}
									onChange=${e => setCurrentStepPosition(e.target.valueAsNumber)}
								/>
							</div>
						</div>
						<div>
							<${BoardView} key=${JSON.stringify(result.board)} board=${result.board} carPositions=${stepPositions[currentStepPosition]} />
						</div>
					</div>
				`}
			</${React.Fragment}>`}
		</div>
	`;
};

ReactDOMClient
	.createRoot(document.querySelector("application"))
	.render(html`<${React.StrictMode}><${ApplicationElement}/></${React.StrictMode}>`);
