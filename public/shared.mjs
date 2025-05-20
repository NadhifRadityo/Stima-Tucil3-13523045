import React from "react";
import htm from "htm";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const html = htm.bind(React.createElement);
export const cn = (...inputs) => twMerge(clsx(inputs));

export const FIELD_EMPTY = 0;
export const FIELD_WALL = 255;
export const FIELD_PRIMARY_CAR = 1;
export const HORIZONTAL = 0;
export const VERTICAL = 1;

import SharedWorker from "/esm/@okikio/sharedworker@latest?standalone";
import { setupMessagingHandler } from "./protocols.mjs";

export const worker = new SharedWorker("/public/worker.mjs", { type: "module" });
export const workerMessagingHandler = setupMessagingHandler(worker.port);
worker.start?.();
worker.port.start?.();

export const solvePuzzle = async (boardString, algorithmName, heuristicName) => {
	if(navigator.onLine) {
		return await workerMessagingHandler.requestResponseMessage({
			command: "solvePuzzle",
			boardString: boardString,
			algorithmName: algorithmName,
			heuristicName: heuristicName
		});
	}
	const payload = new FormData();
	payload.set("boardString", boardString);
	payload.set("algorithmName", algorithmName);
	payload.set("heuristicName", heuristicName);
	const response = await fetch("/api/solve-puzzle", {
		method: "POST",
		body: payload
	});
	if(!response.ok)
		throw await response.text();
	return await response.json();
}
