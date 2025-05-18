export class Solver {
	/** @type {HeuristicCalculator} */
	#heuristicCalculator;
	/** @type {[number, State][]} */
	#stateQueue;
	/** @type {Set<number>} */
	#stateQueueHashes;
	/** @type {Set<number>} */
	#closedHashes;
	/** @type {State?} */
	#solution;
	/**
	 * @param {HeuristicCalculator} heuristicCalculator
	 * @param {State} initialState
	 */
	constructor(heuristicCalculator, initialState) {
		this.#heuristicCalculator = heuristicCalculator;
		this.#stateQueue = [[heuristicCalculator(initialState), initialState]];
		this.#stateQueueHashes = new Set();
		this.#closedHashes = new Set();
		this.#solution = null;
	}
	getHeuristicCalculator() {
		return this.#heuristicCalculator;
	}
	getVisitedNodes() {
		return this.#closedHashes.size;
	}
	getSolution() {
		return this.#solution;
	}
	tick() {
		if(this.#solution != null || this.#stateQueue.length == 0)
			return false;
		/** @type {[number, State]} */
		const [_, state] = this.#stateQueue.shift();
		this.#stateQueueHashes.delete(state.hashCode());
		if(state.isSolved()) {
			this.#solution = state;
			return false;
		}
		this.#closedHashes.add(state.hashCode());
		const expandedStates = state.expand(state => {
			/** @type {[number[], number[]][]} */
			const newStatesCars = [];
			/** @type {Set<number>} */
			const allCars = state.getAllCars();
			const width = state.getWidth();
			const fields = state.getFields();
			// Optimisation: Do not compute car positions. Iterating the fields and storing the visited car is faster.
			// Optimisation: Check the visited cars by bit fields. `Set` is slower.
			let visitedCars = 0;
			for(let i = 0; i < fields.length; i++) {
				const fieldValue = fields[i];
				if(fieldValue == FIELD_EMPTY || fieldValue == FIELD_WALL) continue;
				const carId = fieldValue - 1;
				if(visitedCars & (1 << carId)) continue;
				visitedCars |= (1 << carId);
				const car = allCars[carId];
				const x = i % width;
				const y = Math.floor(i / width);
				const moves = state.getCarMoveOptions(car.direction, i, car.size);
				if(moves.length == 0) continue;
				newStatesCars.push(...moves.map(m => [
					[car.id],
					[((i << 16) | ((car.direction == HORIZONTAL ? y * width + (x + m) : (y + m) * width + x) & 0xFFFF)) >>> 0]
				]));
			}
			return newStatesCars;
		});
		/** @type {[number, State][]} */
		const toAddStateQueue = [];
		for(const expandedState of expandedStates) {
			if(this.#closedHashes.has(expandedState.hashCode())) continue;
			if(this.#stateQueueHashes.has(expandedState.hashCode())) continue;
			toAddStateQueue.push([this.#heuristicCalculator(expandedState), expandedState]);
			this.#stateQueueHashes.add(expandedState.hashCode());
		}
		// Optimisation: Sort the newly added states, and merge sort to the queue.
		// The premise is, the newly added states will always be smaller than the existing states.
		// Because inserting to queue first and sort the queue, will unnecessarily compare sorted entries.
		toAddStateQueue.sort(([a], [b]) => a - b);
		Solver.#mergeSortedArraysInPlace(this.#stateQueue, toAddStateQueue, ([a], [b]) => a - b);
		return this.#stateQueue.length != 0;
	}
	
	/**
	 * @template T
	 * @param {T[]} aArray
	 * @param {T[]} bArray
	 * @param {(a: T, b: T) => number} compareFn
	 */
	static #mergeSortedArraysInPlace(aArray, bArray, compareFn) {
		let i = 0, j = 0;
		while(j < bArray.length) {
			while(i < aArray.length && compareFn(aArray[i], bArray[j]) <= 0)
				i++;
			aArray.splice(i, 0, bArray[j]);
			i++;
			j++;
		}
	}
}

/** @type {HeuristicCalculator} */
export const heuristicDepth = state => state.getDepth();
/** @type {HeuristicCalculator} */
export const heuristicConstant = _ => 0;
/** @type {(a: HeuristicCalculator, b: HeuristicCalculator) => HeuristicCalculator} */
export const heuristicComposite = (a, b) => state => a(state) + b(state);
/** @type {HeuristicCalculator} */
export const heuristicCarBlocked = state => {
	const width = state.getWidth();
	const height = state.getHeight();
	const fields = state.getFields();
	const primaryCar = state.getAllCars()[0];
	const primaryCarPosition = state.getPrimaryCarPosition();
	const primaryCarPositionX = primaryCarPosition % width;
	const primaryCarPositionY = Math.floor(primaryCarPosition / width);
	const exitPosition = state.getExitPosition();
	const exitPositionX = exitPosition % width;
	const exitPositionY = Math.floor(exitPosition / width);
	let carBlocked = 0;
	if(primaryCar.direction == HORIZONTAL) {
		if(primaryCarPositionX > exitPositionX) {
			for(let i = primaryCarPositionX; i >= 0; i--) {
				const index = primaryCarPositionY * width + i;
				const fieldValue = fields[index];
				if(fieldValue == FIELD_EMPTY || fieldValue == FIELD_PRIMARY_CAR) continue;
				carBlocked++;
			}
		} else {
			for(let i = primaryCarPositionX; i < width; i++) {
				const index = primaryCarPositionY * width + i;
				const fieldValue = fields[index];
				if(fieldValue == FIELD_EMPTY || fieldValue == FIELD_PRIMARY_CAR) continue;
				carBlocked++;
			}
		}
	}
	if(primaryCar.direction == VERTICAL) {
		if(primaryCarPositionY > exitPositionY) {
			for(let i = primaryCarPositionY; i >= 0; i--) {
				const index = i * width + primaryCarPositionX;
				const fieldValue = fields[index];
				if(fieldValue == FIELD_EMPTY || fieldValue == FIELD_PRIMARY_CAR) continue;
				carBlocked++;
			}
		} else {
			for(let i = primaryCarPositionY; i < height; i++) {
				const index = i * width + primaryCarPositionX;
				const fieldValue = fields[index];
				if(fieldValue == FIELD_EMPTY || fieldValue == FIELD_PRIMARY_CAR) continue;
				carBlocked++;
			}
		}
	}
	return carBlocked;
};
export const heuristicUCS = heuristicDepth;
export const heuristicGBFSCarBlocked = heuristicCarBlocked;
export const heuristicAStarCarBlocked = heuristicComposite(heuristicDepth, heuristicCarBlocked);

/**
 * @typedef {(state: State) => number} HeuristicCalculator
 */

/**
 * @typedef {(state: State) => [number[], number[]][]} StateExpander
 */

/**
 * @typedef {Object} Car
 * @property {number} id
 * @property {number} direction
 * @property {number} size
 */

export const FIELD_EMPTY = 0;
export const FIELD_WALL = 255;
export const FIELD_PRIMARY_CAR = 1;
export const HORIZONTAL = 0;
export const VERTICAL = 1;

// `State` is effectively constant. You should cache the computation over `State` whenever possible.
export class State {
	/**
	 * 
	 * @param {number} width
	 * @param {number} height
	 * @param {Car[]} allCars
	 * @param {number[]} carPositions
	 * @param {number[]} walls
	 * @param {number} exitPosition
	 */
	static new_root(width, height, allCars, carPositions, walls, exitPosition) {
		const state = new State();
		state.constructor_root(width, height, allCars, carPositions, walls, exitPosition);
		return state;
	}

	/**
	 * @param {State} parent
	 * @param {number[]} carIds
	 * @param {number[]} carPositions
	 */
	static new_isDifference(parent, carIds, carPositions) {
		const state = new State();
		state.constructor_isDifference(parent, carIds, carPositions);
		return state;
	}

	/**
	 * @param {State} parent
	 * @param {string} stepsString
	 */
	static new_fromSteps(parent, stepsString) {
		let state = parent;
		const allCars = parent.getAllCars();
		const width = parent.getWidth();
		const steps = stepsString.split(" ").slice(1)
			.map(s => [...s.matchAll(/^([0-9]+)([\+-][0-9]+)$/g)][0])
			.map(s => [parseInt(s[1]), parseInt(s[2])]);
		for(const step of steps) {
			const [carId, move] = step;
			const car = allCars[carId];
			const carPosition = state.getComputedCarPositions()[carId];
			const x = carPosition % width;
			const y = Math.floor(carPosition / width);
			const newPosition = car.direction == HORIZONTAL ? y * width + (x + move) : (y + move) * width + x;
			state = State.new_isDifference(state, [carId], [((carPosition << 16) | (newPosition & 0xFFFF)) >>> 0]);
		}
		return state;
	}

	/** @type {State?} */
	#parent;
	/** @type {number} */
	#depth;
	/** @type {number} */
	#width; // Optimisation: Positions are encoded as (y * width + x). Applies for carPositions, walls, and exitPosition.
	/** @type {number} */
	#height;
	/** @type {boolean} */
	#isDifference; // Optimisation: Store the difference instead of copying all objects.
	/** @type {Car[]} */
	#allCars; // Optimisation: Avoid traversing up to the root node.
	/** @type {number[]} */
	#carIds;
	/** @type {number[]} */
	#carPositions;
	/** @type {number} */
	#primaryCarPosition; // Optimisation: Heuristic needs this. Instead of searching the fields, just cache when constructing state.
	/** @type {number[]} */
	#walls;
	/** @type {number} */
	#exitPosition;
	/** @type {Uint8Array} */
	#fields;
	/** @type {number} */
	#hashCode;
	/**
	 * 
	 * @param {number} width
	 * @param {number} height
	 * @param {Car[]} allCars
	 * @param {number[]} carPositions
	 * @param {number[]} walls
	 * @param {number} exitPosition
	 */
	constructor_root(width, height, allCars, carPositions, walls, exitPosition) {
		const pack = allCars.map((c, i) => [c, carPositions[i]]).sort((a, b) => a[0].id - b[0].id);
		pack.forEach((p, i) => p[0].id = i);
		allCars = pack.map(p => p[0]);
		carPositions = pack.map(p => p[1]);
		this.#parent = null;
		this.#depth = 0;
		this.#width = width;
		this.#height = height;
		this.#isDifference = false;
		this.#allCars = allCars;
		this.#carIds = allCars.map(c => c.id);
		this.#carPositions = carPositions;
		this.#primaryCarPosition = carPositions[0];
		this.#walls = walls;
		this.#exitPosition = exitPosition;
		this.#fields = new Uint8Array(width * height);
		for(const wall of this.#walls)
			this.#fillField(HORIZONTAL, wall, 1, FIELD_WALL);
		for(let i = 0; i < this.#carIds.length; i++) {
			const car = this.#allCars[this.#carIds[i]];
			const carPosition = this.#carPositions[i];
			if(!this.canFillField(car.direction, carPosition, car.size)) {
				const x = carPosition % this.#width;
				const y = Math.floor(carPosition / this.#width);
				throw new Error(`Cannot place Car#${car.id} at position (${x}, ${y}) with direction ${car.direction} and size ${car.size}.\n${this.toString()}`);
			}
			this.#fillField(car.direction, carPosition, car.size, car.id + 1);
		}
		this.#calculateHashCode();
	}
	/**
	 * @param {State} parent
	 * @param {number[]} carIds
	 * @param {number[]} carPositions
	 */
	constructor_isDifference(parent, carIds, carPositions) {
		this.#parent = parent;
		this.#depth = parent.#depth + 1;
		this.#width = parent.#width;
		this.#height = parent.#height;
		this.#isDifference = true;
		this.#allCars = parent.#allCars;
		this.#carIds = carIds;
		this.#carPositions = carPositions;
		this.#primaryCarPosition = parent.#primaryCarPosition;
		this.#walls = parent.#walls;
		this.#exitPosition = parent.#exitPosition;
		this.#fields = new Uint8Array(parent.#fields);
		let hintPositionsCount = 0;
		for(let i = 0; i < this.#carIds.length; i++) {
			const car = this.#allCars[this.#carIds[i]];
			const carPosition = this.#carPositions[i];
			const hintPosition = (carPosition >>> 16) & 0xFFFF;
			if(hintPosition == 0) continue;
			hintPositionsCount++;
			this.#fillField(car.direction, hintPosition, car.size, FIELD_EMPTY);
		}
		// Slow path: invalidate using getComputedCars
		if(hintPositionsCount != this.#carIds.length) {
			const parentComputedCarPositions = parent.getComputedCarPositions();
			for(let i = 0; i < this.#carIds.length; i++) {
				const car = this.#allCars[this.#carIds[i]];
				const carPosition = parentComputedCarPositions[car.id];
				this.#fillField(car.direction, carPosition, car.size, FIELD_EMPTY);
			}
		}
		for(let i = 0; i < this.#carIds.length; i++) {
			const car = this.#allCars[this.#carIds[i]];
			const carPosition = this.#carPositions[i];
			const newPosition = carPosition & 0xFFFF;
			if(!this.canFillField(car.direction, newPosition, car.size)) {
				const x = newPosition % this.#width;
				const y = Math.floor(newPosition / this.#width);
				throw new Error(`Cannot place Car#${car.id} at position (${x}, ${y}) with direction ${car.direction} and size ${car.size}.\n${this.toString()}`);
			}
			this.#fillField(car.direction, newPosition, car.size, car.id + 1);
			if(car.id == 0)
				this.#primaryCarPosition = newPosition;
		}
		if(hintPositionsCount == this.#carIds.length)
			this.#calculateProgressiveHashCode();
		else
			this.#calculateHashCode();
		for(let i = 0; i < this.#carIds.length; i++) {
			const carPosition = this.#carPositions[i];
			const newPosition = carPosition & 0xFFFF;
			this.#carPositions[i] = newPosition;
		}
	}
	getParent() {
		return this.#parent;
	}
	getDepth() {
		return this.#depth;
	}
	getWidth() {
		return this.#width;
	}
	getHeight() {
		return this.#height;
	}
	getIsDifference() {
		return this.#isDifference;
	}
	getAllCars() {
		return this.#allCars;
	}
	getCarIds() {
		return this.#carIds;
	}
	getCarPositions() {
		return this.#carPositions;
	}
	getPrimaryCarPosition() {
		return this.#primaryCarPosition;
	}
	getWalls() {
		return this.#walls;
	}
	getExitPosition() {
		return this.#exitPosition;
	}
	getFields() {
		return this.#fields;
	}
	#calculateHashCode() {
		let hash = 0x811c9dc5;
		// Optimisation: This hashCode is not 100% correct. But that's what we sacrifice to half the computation.
		// Optimisation: Compute the hashCode over checkered board pattern to reduce clashes.
		// This hash is safe as long as there's no one-sized car.
		for(let y = 0; y < this.#height; y++) {
			for(let x = y % 2 == 0 ? 0 : 1; x < this.#width; x++) {
				const i = y * this.#width + x;
				hash ^= this.#fields[i];
				hash = (hash * 0x010193) >>> 0;
			}
		}
		this.#hashCode = hash;
	}
	#calculateProgressiveHashCode() {
		this.#calculateHashCode();
	}
	/** @type {number[]} */
	#__cachedComputedCarPositions = null; // Optimisation: Cache.
	getComputedCarPositions() {
		if(this.#__cachedComputedCarPositions != null)
			return this.#__cachedComputedCarPositions;
		if(this.#parent == null || !this.#isDifference)
			return this.#__cachedComputedCarPositions = this.#carPositions;
		/** @type {number[]} */
		const computedCars = [...this.#parent.getComputedCarPositions()];
		for(let i = 0; i < this.#carIds.length; i++) {
			const carId = this.#carIds[i];
			const carPosition = this.#carPositions[i];
			computedCars[carId] = carPosition;
		}
		return this.#__cachedComputedCarPositions = computedCars;
	}
	/** @type {string?} */
	#__cachedStepDescription = null; // Optimisation: Cache.
	getStepDescription() {
		if(this.#__cachedStepDescription != null)
			return this.#__cachedStepDescription;
		if(this.#parent == null)
			return this.#__cachedStepDescription = "∅";
		const descriptions = [this.#parent.getStepDescription()];
		const parentComputedCarPositions = this.#parent.getComputedCarPositions();
		const computedCarPositions = this.getComputedCarPositions();
		for(const car of this.#allCars) {
			const previousCarPosition = parentComputedCarPositions[car.id];
			const currentCarPosition = computedCarPositions[car.id];
			if(previousCarPosition == currentCarPosition) continue;
			const previousX = previousCarPosition % this.#width;
			const previousY = Math.floor(previousCarPosition / this.#width);
			const currentX = currentCarPosition % this.#width;
			const currentY = Math.floor(currentCarPosition / this.#width);
			const dx = currentX - previousX;
			const dy = currentY - previousY;
			const steps = car.direction == HORIZONTAL ? dx : dy;
			descriptions.push(`${car.id}${steps > 0 ? `+${steps}` : `-${-steps}`}`);
		}
		return this.#__cachedStepDescription = descriptions.join(" ");
	}
	/** @type {string?} */
	#__cachedMoveDescription = null; // Optimisation: Cache.
	getMoveDescription() {
		if(this.#__cachedMoveDescription != null)
			return this.#__cachedMoveDescription;
		if(this.#parent == null)
			return this.#__cachedMoveDescription = "Initial state";
		const descriptions = [];
		const parentComputedCarPositions = this.#parent.getComputedCarPositions();
		const computedCarPositions = this.getComputedCarPositions();
		for(const car of this.#allCars) {
			const previousCarPosition = parentComputedCarPositions[car.id];
			const currentCarPosition = computedCarPositions[car.id];
			if(previousCarPosition == currentCarPosition) continue;
			const previousX = previousCarPosition % this.#width;
			const previousY = Math.floor(previousCarPosition / this.#width);
			const currentX = currentCarPosition % this.#width;
			const currentY = Math.floor(currentCarPosition / this.#width);
			const dx = currentX - previousX;
			const dy = currentY - previousY;
			let direction = "";
			let steps = 0;
			if(car.direction == HORIZONTAL) {
				direction = dx > 0 ? "rightward" : "leftward";
				steps = Math.abs(dx);
			}
			if(car.direction == VERTICAL) {
				direction = dy > 0 ? "downward" : "upward";
				steps = Math.abs(dy);
			}
			descriptions.push(`Car#${car.id} moved ${steps} step${steps > 1 ? "s" : ""} ${direction}`);
		}
		return this.#__cachedMoveDescription = descriptions.length == 0 ? "No change in car positions" : descriptions.join("\n");
	}
	/**
	 * @param {number} direction
	 * @param {number} position
	 * @param {number} size
	 * @param {number} value
	 */
	#fillField(direction, position, size, value) {
		const positionX = position % this.#width;
		const positionY = Math.floor(position / this.#width);
		if(direction == HORIZONTAL) {
			if(positionX < 0 || positionX + size - 1 >= this.#width || positionY < 0 || positionY >= this.#height)
				throw new Error(`Position at (${positionX}, ${positionY}) with direction ${direction} and size ${size} is out of bounds.`);
			for(let i = 0; i < size; i++) {
				const index = positionY * this.#width + (positionX + i);
				this.#fields[index] = value;
			}
		}
		if(direction == VERTICAL) {
			if(positionY < 0 || positionY + size - 1 >= this.#height || positionX < 0 || positionX >= this.#width)
				throw new Error(`Position at (${positionX}, ${positionY}) with direction ${direction} and size ${size} is out of bounds.`);
			for(let i = 0; i < size; i++) {
				const index = (positionY + i) * this.#width + positionX;
				this.#fields[index] = value;
			}
		}
	}
	/**
	 * @param {number} direction
	 * @param {number} position
	 * @param {number} size
	 */
	canFillField(direction, position, size) {
		const positionX = position % this.#width;
		const positionY = Math.floor(position / this.#width);
		if(direction == HORIZONTAL) {
			if(positionX < 0 || positionX + size - 1 >= this.#width || positionY < 0 || positionY >= this.#height)
				return false;
			for(let i = 0; i < size; i++) {
				const x = positionX + i;
				const index = positionY * this.#width + x;
				if(this.#fields[index] != FIELD_EMPTY)
					return false;
			}
		}
		if(direction == VERTICAL) {
			if(positionY < 0 || positionY + size - 1 >= this.#height || positionX < 0 || positionX >= this.#width)
				return false;
			for(let i = 0; i < size; i++) {
				const y = positionY + i;
				const index = y * this.#width + positionX;
				if(this.#fields[index] != FIELD_EMPTY)
					return false;
			}
		}
		return true;
	}
	/**
	 * @param {number} direction
	 * @param {number} position
	 * @param {number} size
	 */
	getCarMoveOptions(direction, position, size) {
		const positionX = position % this.#width;
		const positionY = Math.floor(position / this.#width);
		const moves = [];
		const isFree = (x, y) => {
			if(x < 0 || x >= this.#width || y < 0 || y >= this.#height)
				return false;
			const index = y * this.#width + x;
			return this.#fields[index] == FIELD_EMPTY;
		};
		let maxSteps = Math.max(this.#width, this.#height);
		for(let step = 1; step <= maxSteps; step++) {
			let x, y;
			if(direction == HORIZONTAL) {
				x = positionX + size - 1 + step;
				y = positionY;
			}
			if(direction == VERTICAL) {
				x = positionX;
				y = positionY + size - 1 + step;
			}
			if(!isFree(x, y))
				break;
			moves.push(step);
		}
		for(let step = 1; step <= maxSteps; step++) {
			let x, y;
			if(direction == HORIZONTAL) {
				x = positionX - step;
				y = positionY;
			}
			if(direction == VERTICAL) {
				x = positionX;
				y = positionY - step;
			}
			if(!isFree(x, y))
				break;
			moves.push(-step);
		}
		return moves;
	}
	hashCode() {
		return this.#hashCode;
	}
	isSolved() {
		return this.#fields[this.#exitPosition] == FIELD_PRIMARY_CAR;
	}
	/**
	 * @param {StateExpander} expander
	 */
	expand(expander) {
		const newStatesCars = expander(this);
		return newStatesCars.map(([newCarIds, newCarPositions]) => State.new_isDifference(this, newCarIds, newCarPositions));
	}
	toString() {
		const chunksArray = (a, size) =>
			Array.from(
				new Array(Math.ceil(a.length / size)),
				(_, i) => a.slice(i * size, i * size + size)
			);
		return chunksArray([...this.#fields], 6).map(a => a.map(v => `${v == FIELD_EMPTY ? "." : v == FIELD_WALL ? "#" : v - 1}`.padStart(2, " ")).join(" ")).join("\n");
	}
}

/**
 * @param {string} inputText
 * @returns {{
 *   width: number,
 *   height: number,
 *   cars: Car[],
 *   carPositions: Car[],
 *   walls: number[],
 *   exitPosition: number
 * }}
 */
export function parseBoardInput(inputText) {
	const lines = inputText.trim().split("\n").map(l => l.trim());
	const [width, height] = lines[0].split(" ").map(s => parseInt(s));
	const carCount = parseInt(lines[1], 10);
	const boardLines = lines.slice(2);
	if(isNaN(width))
		throw new Error("Width is not a number");
	if(isNaN(height))
		throw new Error("Height is not a number");
	if(isNaN(carCount))
		throw new Error("Car count is not a number");
	const carCells = new Map();
	let exitPosition = null;
	const walls = [];
	for(let y = 0; y < boardLines.length; y++) {
		for(let x = 0; x < boardLines[y].length; x++) {
			const ch = boardLines[y][x];
			if(ch == null || ch == " " || ch == ".") continue;
			if(ch == "K") {
				if(exitPosition != null)
					throw new Error("Multiple 'K' characters found");
				exitPosition = [
					Math.max(0, Math.min(width - 1, x)),
					Math.max(0, Math.min(height - 1, y))
				];
				continue;
			}
			if(ch == "#") {
				walls.push([x, y]);
				continue;
			}
			if(!/^[A-Z]+$/g.test(ch))
				throw new Error(`Unexpected character ${ch}`);
			if(!carCells.has(ch))
				carCells.set(ch, []);
			carCells.get(ch).push([x, y]);
		}
	}
	if(exitPosition == null)
		throw new Error("No exit 'K' found");
	if(exitPosition[0] != width - 1 && exitPosition[1] != height - 1)
		throw new Error("Exit position is not on the edge");
	if(carCells.size != carCount)
		throw new Error(`Unexpected car count, got ${carCells.size} expected ${carCount}`);
	const cars = [];
	for(const [ch, cells] of carCells.entries()) {
		cells.sort(([x1, y1], [x2, y2]) => y1 - y2 || x1 - x2);
		const [x0, y0] = cells[0];
		const horizontal = cells.every(([x, y]) => y == y0);
		const vertical = cells.every(([x, y]) => x == x0);
		const size = cells.length;
		if(!horizontal && !vertical)
			throw new Error(`Car piece ${ch} has inconsistent shape`);
		cars.push({
			symbol: ch,
			direction: horizontal ? HORIZONTAL : VERTICAL,
			positionX: x0,
			positionY: y0,
			size: size
		});
	}
	const primaryIndex = cars.findIndex(c => c.symbol == "P");
	if(primaryIndex == -1)
		throw new Error("Cannot find primary car piece 'P'");
	if(primaryIndex > 0) {
		const temp = cars[0];
		cars[0] = cars[primaryIndex];
		cars[primaryIndex] = temp;
	}
	return {
		width: width,
		height: height,
		cars: cars.map((c, i) => ({ symbol: c.symbol, id: i, direction: c.direction, size: c.size })),
		carPositions: cars.map(c => c.positionY * width + c.positionX),
		walls: walls.map(([x, y]) => y * width + x),
		exitPosition: exitPosition[1] * width + exitPosition[0]
	};
}
