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
	const boardElementRef = useRef(null);
	const [boardString, setBoardString] = useState(`6 6
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
		reader.onload = event => setBoardString(event.target.result);
		reader.readAsText(file);
	};
	const handleSubmit = async () => {
		if(isPending) return;
		setIsPending(true);
		let result;
		try {
			result = await solvePuzzle(boardString, algorithmName, heuristicName);
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
	useLayoutEffect(() => {
		const decodeBase64 = base64 => {
			const text = atob(base64);
			const length = text.length;
			const bytes = new Uint8Array(length);
			for(let i = 0; i < length; i++)
				bytes[i] = text.charCodeAt(i);
			const decoder = new TextDecoder();
			return decoder.decode(bytes);
		};
		const onHashUpdate = () => {
			try {
				const hash = location.hash.slice(1);
				const result = JSON.parse(decodeBase64(hash));
				setBoardString(result.boardString);
				if(result.combinationName == "UCS") {
					setAlgorithmName("ucs");
					setHeuristicName("none");
				}
				if(result.combinationName == "GBFS CarDistance") {
					setAlgorithmName("gbfs");
					setHeuristicName("car-distance");
				}
				if(result.combinationName == "GBFS CarBlocked") {
					setAlgorithmName("gbfs");
					setHeuristicName("car-blocked");
				}
				if(result.combinationName == "GBFS CarBlockedRecursive") {
					setAlgorithmName("gbfs");
					setHeuristicName("car-blocked-recursive");
				}
				if(result.combinationName == "A* CarDistance") {
					setAlgorithmName("a-star");
					setHeuristicName("car-distance");
				}
				if(result.combinationName == "A* CarBlocked") {
					setAlgorithmName("a-star");
					setHeuristicName("car-blocked");
				}
				if(result.combinationName == "A* CarBlockedRecursive") {
					setAlgorithmName("a-star");
					setHeuristicName("car-blocked-recursive");
				}
				if(result.combinationName == "IDA* CarDistance") {
					setAlgorithmName("ida-star");
					setHeuristicName("car-distance");
				}
				if(result.combinationName == "IDA* CarBlocked") {
					setAlgorithmName("ida-star");
					setHeuristicName("car-blocked");
				}
				if(result.combinationName == "IDA* CarBlockedRecursive") {
					setAlgorithmName("ida-star");
					setHeuristicName("car-blocked-recursive");
				}
				if(result.combinationName == "IDA* Approx CarDistance") {
					setAlgorithmName("ida-star-approx");
					setHeuristicName("car-distance");
				}
				if(result.combinationName == "IDA* Approx CarBlocked") {
					setAlgorithmName("ida-star-approx");
					setHeuristicName("car-blocked");
				}
				if(result.combinationName == "IDA* Approx CarBlockedRecursive") {
					setAlgorithmName("ida-star-approx");
					setHeuristicName("car-blocked-recursive");
				}
				setResult(result);
				const stepPositions = reconstructCarPositions(result.board, result.solutionSteps);
				setStepPositions(stepPositions);
				setCurrentStepPosition(stepPositions.length - 1);
			} catch(e) {
				console.log(e);
			}
		};
		onHashUpdate();
		window.addEventListener("hashchange", onHashUpdate);
		return () => {
			window.removeEventListener("hashchange", onHashUpdate);
		};
	}, []);

	const stepPositionsRef = useRef(null);
	stepPositionsRef.current = stepPositions;
	const handleSubmitRef = useRef(null);
	handleSubmitRef.current = handleSubmit;
	const waitRerendersRef = useRef(new Set());
	[...waitRerendersRef.current].forEach(r => r());
	waitRerendersRef.current.clear();
	const waitRerender = () => new Promise(r => waitRerendersRef.current.add(r));
	const [showRecorder, setShowRecorder] = useState(false);
	const [recording, setRecording] = useState(false);
	const recorderVideoRef = useRef(null);
	useLayoutEffect(() => {
		setShowRecorder(globalThis.showRecorder ?? false);
		const handle = setInterval(() => {
			setShowRecorder(globalThis.showRecorder ?? false);
		}, 1000);
		return () => {
			clearInterval(handle);
		};
	}, []);
	useLayoutEffect(() => {
		if(!recording) {
			if(recorderVideoRef.current != null) {
				recorderVideoRef.current.abortController?.abort(new Error("Aborted"));
				recorderVideoRef.current.abortController = null;
				recorderVideoRef.current.srcObject?.getTracks().forEach(track => track.stop());
				recorderVideoRef.current.srcObject = null;
			}
			return;
		}
		let stream_;
		let abortController_;
		(async () => {
			const directoryHandle = await showDirectoryPicker({ id: "rushhour-recorder", mode: "readwrite" });
			const stream = stream_ = await navigator.mediaDevices.getDisplayMedia({
				video: {
					displaySurface: "window",
				},
				audio: false,
				preferCurrentTab: true
			});
			const [track] = stream.getVideoTracks();
			recorderVideoRef.current.srcObject = stream;
			const abortController = abortController_ = new AbortController();
			const abortPromise = new Promise((_, r) => abortController.signal.addEventListener("abort", r));
			recorderVideoRef.current.abortController = abortController;
			const puzzles = boardString.split("=====================================\n").filter(p => p.trim() != "");
			for(const puzzle of puzzles) {
				const lines = puzzle.split("\n");
				const name = lines.shift().trim();
				const board = lines.join("\n");
				const fileHandle = await Promise.race([directoryHandle.getFileHandle(`${name}_${algorithmName}_${heuristicName}.mp4`, { create: true }), abortPromise]);
				const fileWritable = await Promise.race([fileHandle.createWritable(), abortPromise]);
				setBoardString(board);
				setAlgorithmName(algorithmName);
				setHeuristicName(heuristicName);
				await Promise.race([waitRerender(), abortPromise]);
				await Promise.race([handleSubmitRef.current(), abortPromise]);
				setCurrentStepPosition(0);
				await Promise.race([waitRerender(), abortPromise]);
				recorderVideoRef.current.style.width = `${boardElementRef.current.parentElement.offsetWidth}px`;
				recorderVideoRef.current.style.height = `${boardElementRef.current.parentElement.offsetHeight}px`;
				boardElementRef.current.parentElement.scrollIntoViewIfNeeded();
				const restrictionTarget = await RestrictionTarget.fromElement(boardElementRef.current.parentElement);
				await Promise.race([track.restrictTo(restrictionTarget), abortPromise]);
				const writePromises = [];
				const recorder = new MediaRecorder(stream);
				recorder.addEventListener("dataavailable", e => writePromises.push(fileWritable.write(e.data)));
				recorder.start();
				const stopped = new Promise((resolve, reject) => {
					recorder.addEventListener("stop", resolve);
					recorder.addEventListener("error", reject);
				});
				await Promise.race([new Promise(r => setTimeout(r, 600)), stopped, abortPromise]);
				for(let i = 1; i < stepPositionsRef.current.length; i++) {
					setCurrentStepPosition(i);
					await Promise.race([waitRerender(), stopped, abortPromise]);
					await Promise.race([new Promise(r => setTimeout(r, 100)), stopped, abortPromise]);
				}
				await Promise.race([new Promise(r => setTimeout(r, 400)), stopped, abortPromise]);
				if(recorder.state == "recording")
					recorder.stop();
				await Promise.race([stopped, abortPromise]);
				await Promise.race([Promise.all(writePromises), abortPromise]);
				await Promise.race([fileWritable.close(), abortPromise]);
			}
			setRecording(false);
		})().catch(e => {
			console.log(e);
			setRecording(false);
		});
		return () => {
			abortController_?.abort(new Error("Aborted"));
			stream_?.getTracks().forEach(track => track.stop());
		};
	}, [recording]);
	return html`
		<div className="max-w-5xl mx-auto p-6 space-y-6">
			<h1 className="text-3xl font-bold text-center">🚗 Rush Hour Puzzle Solver</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="space-y-4">
					<label className="block font-semibold">Konfigurasi Permainan:</label>
					<textarea
						value=${boardString}
						onInput=${e => setBoardString(e.target.value)}
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
					${showRecorder ? html`<${React.Fragment}>
						<button
							onClick=${() => setRecording(r => !r)}
							className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-2 px-4 rounded mt-2 cursor-pointer disabled:cursor-default"
						>
							${recording ? "🚫 Stop" : "🔴 Record"}
						</button>
						${recording ? html`
							<video ref=${recorderVideoRef} className="z-10 fixed right-0 top-0 border opacity-50 pointer-events-none select-none" autoPlay />
						` : null}
					</${React.Fragment}>` : null}
				</div>
			</div>
			${result && html`<${React.Fragment}>
				<div className="bg-gray-100 p-4 rounded shadow text-sm">
					<p><strong>Waktu eksekusi:</strong> ${result.duration}${typeof result.duration == "number" ? "ms" : ""}</p>
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
						<div
							className=${`mx-auto w-fit ${recording ? "p-10 bg-white" : ""}`}
							style=${{ isolation: "isolate", transformStyle: "flat" }}
						>
							<${BoardView}
								ref=${boardElementRef}
								key=${JSON.stringify(result.board)}
								board=${result.board}
								carPositions=${stepPositions[currentStepPosition]}
								animationDuration=${recording ? 0.1 : 0.5}
							/>
							${recording ? html`
								<div className="bg-gray-100 p-4 rounded shadow text-sm" style=${{ width: `${64 * result.board.width}px` }}>
									<p><strong>Waktu eksekusi:</strong> ${result.duration}ms</p>
									<p><strong>Tick count:</strong> ${result.tickCount}</p>
									<p><strong>Node diperiksa:</strong> ${result.visitedNodes}</p>
									<p><strong>Banyak pencarian:</strong> ${result.searchCount}</p>
									${result.solutionSteps != null ? html`<${React.Fragment}>
										<p><strong>Branching factor:</strong> ${result.branchingFactor}</p>
										<p><strong>Langkah:</strong> ${currentStepPosition} / ${stepPositions.length - 1}</p>
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
							` : null}
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
