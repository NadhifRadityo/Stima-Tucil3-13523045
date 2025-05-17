import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactDOMClient from "react-dom/client";
import { html, HORIZONTAL, VERTICAL } from "./shared.mjs";
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
	const [inputText, setInputText] = useState("");
	const [algorithm, setAlgorithm] = useState("ucs");
	const [heuristic, setHeuristic] = useState("none");
	const [result, setResult] = useState(null);
	const [stepPositions, setStepPositions] = useState(null);
	const [currentStepPosition, setCurrentStepPosition] = useState(null);
	const fileInputRef = useRef();
	const handleFileChange = e => {
		const file = e.target.files?.[0];
		if(file == null) return;
		const reader = new FileReader();
		reader.onload = event => setInputText(event.target.result);
		reader.readAsText(file);
	};
	const handleSubmit = async () => {
		const payload = new FormData();
		payload.set("board", inputText),
		payload.set("algorithm", algorithm);
		payload.set("heuristic", heuristic);
		const response = await fetch("/api/solve", {
			method: "POST",
			body: payload
		});
		if(!response.ok) {
			alert(`Tidak dapat menjalankan solver: ${await response.text()}`);
			return;
		}
		const result = await response.json();
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
						value=${inputText}
						onInput=${e => setInputText(e.target.value)}
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
							value=${algorithm}
							onChange=${e => setAlgorithm(e.target.value)}
							className="w-full border rounded p-2"
						>
							<option value="ucs">UCS (Uniform Cost Search)</option>
							<option value="gbfs">GBFS (Greedy Best First Search)</option>
							<option value="a-star">A* (A-Star)</option>
						</select>
					</div>
					<div>
						<label className="font-semibold block mb-1">Heuristik:</label>
						<select
							value=${heuristic}
							onChange=${e => setHeuristic(e.target.value)}
							className="w-full border rounded p-2"
						>
							<option value="none">Tanpa Heuristik</option>
							<option value="car-blocked">Mobil Terhalangi</option>
						</select>
					</div>
					<button
						onClick=${handleSubmit}
						className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded mt-2"
					>
						🔍 Jalankan Solver
					</button>
				</div>
			</div>
			${result && html`<${React.Fragment}>
				<div className="bg-gray-100 p-4 rounded shadow text-sm">
					<p><strong>Node diperiksa:</strong> ${result.visitedNodes}</p>
					<p><strong>Waktu eksekusi:</strong> ${result.duration}ms</p>
				</div>
				${stepPositions.length > 0 && html`
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-xl font-semibold">🔁 Visualisasi Langkah</h2>
							<div className="flex flex-col">
								<div className="space-x-2">
									<button
										onClick=${() => setCurrentStepPosition(s => Math.max(0, s - 1))}
										className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
									>⬅️</button>
									<span className="font-medium">Langkah ${currentStepPosition + 1} / ${stepPositions.length}</span>
									<button
										onClick=${() => setCurrentStepPosition(s => Math.min(stepPositions.length - 1, s + 1))}
										className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
									>➡️</button>
								</div>
								<input
									className="self-stretch"
									type="range"
									min="1"
									max=${stepPositions.length}
									value=${currentStepPosition + 1}
									onChange=${e => setCurrentStepPosition(e.target.valueAsNumber - 1)}
								/>
							</div>
						</div>
						<div>
							<${BoardView} board=${result.board} carPositions=${stepPositions[currentStepPosition]} />
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
