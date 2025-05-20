export class QueueSolver {
	/** @type {HeuristicCalculator} */
	#heuristicGCalculator;
	/** @type {HeuristicCalculator} */
	#heuristicHCalculator;
	/** @type {number} */
	#stateQueueLength;
	/** @type {State[]} */
	#stateQueue;
	/** @type {Map<number, State>} */
	#openHashes;
	/** @type {Set<number>} */
	#closedHashes;
	/** @type {number} */
	#searchCount;
	/** @type {State?} */
	#solution;
	/**
	 * @param {HeuristicCalculator} heuristicGCalculator
	 * @param {HeuristicCalculator} heuristicHCalculator
	 * @param {State} initialState
	 */
	constructor(heuristicGCalculator, heuristicHCalculator, initialState) {
		this.#heuristicGCalculator = heuristicGCalculator;
		this.#heuristicHCalculator = heuristicHCalculator;
		this.#stateQueueLength = 0;
		this.#stateQueue = [];
		this.#openHashes = new Map();
		this.#closedHashes = new Set();
		this.#searchCount = 0;
		this.#solution = null;

		initialState.publicBoundG = this.#heuristicGCalculator(0, initialState);
		initialState.publicBoundH = this.#heuristicHCalculator(0, initialState);
		initialState.publicBoundF = initialState.publicBoundG + initialState.publicBoundH;
		this.#openHashes.set(initialState.hashCode(), initialState);
		this.#stateQueueInsert(initialState);
	}
	getHeuristicGCalculator() {
		return this.#heuristicGCalculator;
	}
	getHeuristicHCalculator() {
		return this.#heuristicHCalculator;
	}
	getVisitedNodes() {
		return this.#closedHashes.size;
	}
	getSearchCount() {
		return this.#searchCount;
	}
	getSolution() {
		return this.#solution;
	}
	tick() {
		if(this.#solution != null || this.#stateQueueLength == 0)
			return false;
		const state = this.#stateQueuePoll();
		const stateHash = state.hashCode();
		this.#closedHashes.add(stateHash);
		this.#openHashes.delete(stateHash);
		if(state.isSolved()) {
			this.#solution = state;
			return false;
		}
		const width = state.getWidth();
		for(const [car, position, moves] of state.expand()) {
			const x = position % width;
			const y = Math.floor(position / width);
			this.#searchCount += moves.length;
			for(const move of moves) {
				const newPosition = car.direction == HORIZONTAL ? y * width + (x + move) : (y + move) * width + x;
				const expandedState = State.new_isDifference(state, [car.id], [(((position + 1) << 16) | (newPosition & 0xFFFF)) >>> 0]);
				const expandedStateHash = expandedState.hashCode();
				expandedState.publicBoundG = this.#heuristicGCalculator(state.publicBoundG, expandedState);
				expandedState.publicBoundH = this.#heuristicHCalculator(state.publicBoundH, expandedState);
				expandedState.publicBoundF = expandedState.publicBoundG + expandedState.publicBoundH;
				const oldState = this.#openHashes.get(expandedStateHash);
				if(oldState == null && !this.#closedHashes.has(expandedStateHash)) {
					this.#stateQueueInsert(expandedState);
					this.#openHashes.set(expandedStateHash, expandedState);
				}
				if(oldState != null && oldState.publicBoundF > expandedState.publicBoundF) {
					this.#stateQueueRemoveAt(oldState.publicIndex);
					this.#stateQueueInsert(expandedState);
					this.#openHashes.set(expandedStateHash, expandedState);
				}
			}
		}
		return this.#stateQueueLength != 0;
	}
	#stateQueuePoll() {
		const state = this.#stateQueue[0];
		if(this.#stateQueueLength > 1) {
			this.#stateQueueLength--;
			const movedState = this.#stateQueue[this.#stateQueueLength];
			this.#stateQueue[0] = movedState;
			movedState.publicIndex = 0;
			this.#stateQueuePercolateDown(0);
		} else
			this.#stateQueueLength--;
		return state;
	}
	#stateQueueRemoveAt(index) {
		this.#stateQueuePercolateUp(index, true);
		return this.#stateQueuePoll();
	}
	#stateQueuePercolateDown(index) {
		const length = this.#stateQueueLength;
		const heapSize = this.#stateQueueLength >>> 1;
		const state = this.#stateQueue[index];
		while(index < heapSize) {
			let left = (index << 1) + 1;
			let right = left + 1;
			let bestState = this.#stateQueue[left];
			if(right < length && this.#stateQueue[right].publicBoundF <= bestState.publicBoundF) {
				left = right;
				bestState = this.#stateQueue[right];
			}
			if(bestState.publicBoundF > state.publicBoundF)
				break;
			this.#stateQueue[index] = bestState;
			bestState.publicIndex = index;
			index = left;
		}
		this.#stateQueue[index] = state;
		state.publicIndex = index;
	}
	#stateQueuePercolateUp(index, force) {
		const state = this.#stateQueue[index];
		while(index > 0) {
			const parent = (index - 1) >> 1;
			const parentHeap = this.#stateQueue[parent];
			if(!force && state.publicBoundF > parentHeap.publicBoundF)
				break;
			this.#stateQueue[index] = parentHeap;
			parentHeap.publicIndex = index;
			index = parent;
		}
		this.#stateQueue[index] = state;
		state.publicIndex = index;
	}
	/**
	 * @param {State} state
	 */
	#stateQueueInsert(state) {
		let index = this.#stateQueueLength;
		this.#stateQueue[this.#stateQueueLength] = state;
		state.publicIndex = this.#stateQueueLength;
		this.#stateQueueLength++;
		while(index > 0) {
			const parent = (index - 1) >> 1;
			const parentHeap = this.#stateQueue[parent];
			if(state.publicBoundF > parentHeap.publicBoundF)
				break;
			this.#stateQueue[index] = parentHeap;
			parentHeap.publicIndex = index;
			index = parent;
		}
		this.#stateQueue[index] = state;
		state.publicIndex = index;
	}
}
// This solver is an optimization over the proper QueueSolver. It has a premise, where it doesn't need
// to update the bound for states that has the same hashCode. This is effectively suitable for UCS or
// A-Star algorithm with consistent heuristic. If the heuristic is consistent, A* will never need to 
// revisit a node, improving efficiency.
export class QueueSolverUniform {
	/** @type {HeuristicCalculator} */
	#heuristicGCalculator;
	/** @type {HeuristicCalculator} */
	#heuristicHCalculator;
	/** @type {State[]} */
	#stateQueue;
	/** @type {Set<number>} */
	#closedHashes;
	/** @type {number} */
	#searchCount;
	/** @type {State?} */
	#solution;
	/**
	 * @param {HeuristicCalculator} heuristicGCalculator
	 * @param {HeuristicCalculator} heuristicHCalculator
	 * @param {State} initialState
	 */
	constructor(heuristicGCalculator, heuristicHCalculator, initialState) {
		this.#heuristicGCalculator = heuristicGCalculator;
		this.#heuristicHCalculator = heuristicHCalculator;
		this.#stateQueue = [];
		this.#closedHashes = new Set();
		this.#searchCount = 0;
		this.#solution = null;

		initialState.publicBoundG = this.#heuristicGCalculator(0, initialState);
		initialState.publicBoundH = this.#heuristicHCalculator(0, initialState);
		initialState.publicBoundF = initialState.publicBoundG + initialState.publicBoundH;
		this.#stateQueue.push(initialState);
		this.#closedHashes.add(initialState.hashCode());
	}
	getHeuristicGCalculator() {
		return this.#heuristicGCalculator;
	}
	getHeuristicHCalculator() {
		return this.#heuristicHCalculator;
	}
	getVisitedNodes() {
		return this.#closedHashes.size;
	}
	getSearchCount() {
		return this.#searchCount;
	}
	getSolution() {
		return this.#solution;
	}
	tick() {
		if(this.#solution != null || this.#stateQueue.length == 0)
			return false;
		const state = this.#stateQueue.shift();
		if(state.isSolved()) {
			this.#solution = state;
			return false;
		}
		/** @type {State[]} */
		const toAddStates = [];
		const width = state.getWidth();
		for(const [car, position, moves] of state.expand()) {
			const x = position % width;
			const y = Math.floor(position / width);
			this.#searchCount += moves.length;
			for(const move of moves) {
				const newPosition = car.direction == HORIZONTAL ? y * width + (x + move) : (y + move) * width + x;
				const expandedState = State.new_isDifference(state, [car.id], [(((position + 1) << 16) | (newPosition & 0xFFFF)) >>> 0]);
				const expandedStateHash = expandedState.hashCode();
				if(this.#closedHashes.has(expandedStateHash)) continue;
				this.#closedHashes.add(expandedStateHash);
				expandedState.publicBoundG = this.#heuristicGCalculator(state.publicBoundG, expandedState);
				expandedState.publicBoundH = this.#heuristicHCalculator(state.publicBoundH, expandedState);
				expandedState.publicBoundF = expandedState.publicBoundG + expandedState.publicBoundH;
				toAddStates.push(expandedState);
			}
		}
		// Optimisation: Sort the newly added states, and merge sort to the queue.
		// The premise is, the newly added states will always be smaller than the existing states.
		// Because inserting to queue first and sort the queue, will unnecessarily compare sorted entries.
		toAddStates.sort((a, b) => a.publicBoundF - b.publicBoundF);
		this.#mergeSortedArraysInPlace(toAddStates);
		return this.#stateQueue.length != 0;
	}
	/**
	 * @param {State[]} toAddStates
	 */
	#mergeSortedArraysInPlace(toAddStates) {
		let queueIndex = 0;
		for(const state of toAddStates) {
			// Optimisation: Since aArray and bArray both sorted, we can optimize
			// the insertion further by searching the aIndex using binary search.
			let high = this.#stateQueue.length;
			while(queueIndex < high) {
				const mid = (queueIndex + high) >> 1;
				if(this.#stateQueue[mid].publicBoundF <= state.publicBoundF)
					queueIndex = mid + 1;
				else
					high = mid;
			}
			this.#stateQueue.splice(queueIndex, 0, state);
			queueIndex++;
		}
	}
}
export class StackSolver {
	/** @type {HeuristicCalculator} */
	#heuristicGCalculator;
	/** @type {HeuristicCalculator} */
	#heuristicHCalculator;
	/** @type {State} */
	#initialState;
	/** @type {Set<number>} */
	#closedHashes;
	/** @type {number} */
	#searchCount;
	/** @type {number?} */
	#bound;
	/** @type {State?} */
	#solution;
	/**
	 * @param {HeuristicCalculator} heuristicGCalculator
	 * @param {HeuristicCalculator} heuristicHCalculator
	 * @param {State} initialState
	 */
	constructor(heuristicGCalculator, heuristicHCalculator, initialState) {
		this.#heuristicGCalculator = heuristicGCalculator;
		this.#heuristicHCalculator = heuristicHCalculator;
		this.#initialState = initialState;
		this.#closedHashes = new Set();
		this.#searchCount = 0;
		this.#bound = 0;
		this.#solution = null;

		initialState.publicBoundG = this.#heuristicGCalculator(0, initialState);
		initialState.publicBoundH = this.#heuristicHCalculator(0, initialState);
		initialState.publicBoundF = initialState.publicBoundG + initialState.publicBoundH;
		this.#bound = initialState.publicBoundF;
	}
	getHeuristicGCalculator() {
		return this.#heuristicGCalculator;
	}
	getHeuristicHCalculator() {
		return this.#heuristicHCalculator;
	}
	getVisitedNodes() {
		return this.#closedHashes.size;
	}
	getSearchCount() {
		return this.#searchCount;
	}
	getBound() {
		return this.#bound;
	}
	getSolution() {
		return this.#solution;
	}
	tick() {
		if(this.#solution != null || this.#bound == Infinity)
			return false;
		const initialStateHashCode = this.#initialState.hashCode();
		this.#closedHashes.add(initialStateHashCode);
		const newBound = this.#search(this.#initialState);
		this.#closedHashes.delete(initialStateHashCode);
		if(newBound instanceof State) {
			this.#solution = newBound;
			return false;
		}
		this.#bound = newBound;
		if(newBound == Infinity)
			return false;
		return true;
	}
	/**
	 * @param {State} state
	 * @returns {number | State}
	 */
	#search(state) {
		if(state.publicBoundF > this.#bound)
			return state.publicBoundF;
		if(state.isSolved())
			return state;
		let minBound = Infinity;
		const width = state.getWidth();
		for(const [car, position, moves] of state.expand()) {
			const x = position % width;
			const y = Math.floor(position / width);
			this.#searchCount += moves.length;
			for(const move of moves) {
				const newPosition = car.direction == HORIZONTAL ? y * width + (x + move) : (y + move) * width + x;
				const expandedState = State.new_isDifference(state, [car.id], [(((position + 1) << 16) | (newPosition & 0xFFFF)) >>> 0]);
				const expandedStateHash = expandedState.hashCode();
				if(this.#closedHashes.has(expandedStateHash)) continue;
				this.#closedHashes.add(expandedStateHash);
				expandedState.publicBoundG = this.#heuristicGCalculator(state.publicBoundG, expandedState);
				expandedState.publicBoundH = this.#heuristicHCalculator(state.publicBoundH, expandedState);
				expandedState.publicBoundF = expandedState.publicBoundG + expandedState.publicBoundH;
				const result = this.#search(expandedState);
				if(result instanceof State) return result;
				if(result < minBound) minBound = result;
				this.#closedHashes.delete(expandedStateHash);
			}
		}
		return minBound;
	}
}
// This solver is an optimization over StackSolver. It may be faster for some test cases, 
// but it should outputs optimal solution like StackSolver (though unverified for all cases). 
// The main difference is how both solvers skip the closedHashes. In the "proper" implementation, 
// it behaves like a hash path, where it skips the node if it's in the current stack trace. 
// In contrast, this approx solver tries to use "global" closedHashes, where it still compares 
// if the state bound is less than the last bound within the same hash. If it is, it'll probably 
// resulting in fewer steps. Though, optimization can be further analyzed, since it has new 
// information every tick to speed up the next tick. For example, skipping the state that 
// always result in worst expansion.
export class StackSolverApprox {
	/** @type {HeuristicCalculator} */
	#heuristicGCalculator;
	/** @type {HeuristicCalculator} */
	#heuristicHCalculator;
	/** @type {State} */
	#initialState;
	/** @type {Map<number, number>} */
	#closedHashes;
	/** @type {number} */
	#searchCount;
	/** @type {number?} */
	#bound;
	/** @type {State?} */
	#solution;
	/**
	 * @param {HeuristicCalculator} heuristicGCalculator
	 * @param {HeuristicCalculator} heuristicHCalculator
	 * @param {State} initialState
	 */
	constructor(heuristicGCalculator, heuristicHCalculator, initialState) {
		this.#heuristicGCalculator = heuristicGCalculator;
		this.#heuristicHCalculator = heuristicHCalculator;
		this.#initialState = initialState;
		this.#closedHashes = new Map();
		this.#searchCount = 0;
		this.#bound = 0;
		this.#solution = null;

		initialState.publicBoundG = this.#heuristicGCalculator(0, initialState);
		initialState.publicBoundH = this.#heuristicHCalculator(0, initialState);
		initialState.publicBoundF = initialState.publicBoundG + initialState.publicBoundH;
		this.#bound = initialState.publicBoundF;
	}
	getHeuristicGCalculator() {
		return this.#heuristicGCalculator;
	}
	getHeuristicHCalculator() {
		return this.#heuristicHCalculator;
	}
	getVisitedNodes() {
		return this.#closedHashes.size;
	}
	getSearchCount() {
		return this.#searchCount;
	}
	getBound() {
		return this.#bound;
	}
	getSolution() {
		return this.#solution;
	}
	tick() {
		if(this.#solution != null || this.#bound == Infinity)
			return false;
		this.#closedHashes.clear();
		this.#closedHashes.set(this.#initialState.hashCode(), this.#initialState.publicBoundF);
		const newBound = this.#search(this.#initialState);
		if(newBound instanceof State) {
			this.#solution = newBound;
			return false;
		}
		this.#bound = newBound;
		if(newBound == Infinity)
			return false;
		return true;
	}
	/**
	 * @param {State} state
	 * @returns {number | State}
	 */
	#search(state) {
		if(state.publicBoundF > this.#bound)
			return state.publicBoundF;
		if(state.isSolved())
			return state;
		/** @type {State?} */
		let solvedState = null;
		let minBound = Infinity;
		const width = state.getWidth();
		for(const [car, position, moves] of state.expand()) {
			const x = position % width;
			const y = Math.floor(position / width);
			this.#searchCount += moves.length;
			for(const move of moves) {
				const newPosition = car.direction == HORIZONTAL ? y * width + (x + move) : (y + move) * width + x;
				const expandedState = State.new_isDifference(state, [car.id], [(((position + 1) << 16) | (newPosition & 0xFFFF)) >>> 0]);
				const expandedStateHash = expandedState.hashCode();
				expandedState.publicBoundG = this.#heuristicGCalculator(state.publicBoundG, expandedState);
				expandedState.publicBoundH = this.#heuristicHCalculator(state.publicBoundH, expandedState);
				expandedState.publicBoundF = expandedState.publicBoundG + expandedState.publicBoundH;
				const closedHashBound = this.#closedHashes.get(expandedStateHash);
				if(closedHashBound != null && closedHashBound <= expandedState.publicBoundF) continue;
				this.#closedHashes.set(expandedStateHash, expandedState.publicBoundF);
				const result = this.#search(expandedState);
				if(result instanceof State) {
					if(result.publicBoundF < minBound) {
						solvedState = result;
						minBound = result.publicBoundF;
					}
					continue;
				}
				if(result < minBound) {
					solvedState = null;
					minBound = result;
				}
			}
		}
		if(solvedState != null)
			return solvedState;
		return minBound;
	}
}

/**
 * @param {number} searchCount
 * @param {number} solutionDepth
 */
export const computeBranchingFactor = (searchCount, solutionDepth) => {
	const PRECISION = 0.00001;
	if(searchCount < solutionDepth + 1)
		throw new Error("searchCount must be at least solutionDepth + 1");
	if(solutionDepth < 0)
		throw new Error("solutionDepth must be non-negative");
	const geo_sum = (b, d) => {
		let s = 1.;
		for(let i = 0; i < d; i++)
			s = s * b + 1.;
		return s;
	};
	let b_lo = 1.;
	let f_lo = 1. + solutionDepth;
	let b_hi = b_lo;
	let f_hi = f_lo;
	while(f_hi < searchCount) {
		b_hi *= 2.;
		f_hi = geo_sum(b_hi, solutionDepth);
	}
	while(b_hi - b_lo > PRECISION) {
		const b_mid = (b_hi + b_lo) * 0.5;
		const f_mid = geo_sum(b_mid, solutionDepth);
		if(f_mid > searchCount) {
			b_hi = b_mid;
			f_hi = f_mid;
		} else {
			b_lo = b_mid;
			f_lo = f_mid;
		}
	}
	return b_lo;
};

/**
 * @typedef {(oldBound: number, state: State) => number} HeuristicCalculator
 */

/** @type {HeuristicCalculator} */
export const heuristicNone = () => 0;
/** @type {HeuristicCalculator} */
export const heuristicUniform = (b, _) => b + 1;
/** @type {HeuristicCalculator} */
export const heuristicPathCost = (b, s) => b + s.getPathCost();
/** @type {HeuristicCalculator} */
export const heuristicCarDistance = (_, state) => {
	if(state.isSolved()) return 0;
	const width = state.getWidth();
	const primaryCar = state.getAllCars()[0];
	const primaryCarPosition = state.getPrimaryCarPosition();
	const primaryCarPositionX = primaryCarPosition % width;
	const primaryCarPositionY = Math.floor(primaryCarPosition / width);
	const exitPosition = state.getExitPosition();
	const exitPositionX = exitPosition % width;
	const exitPositionY = Math.floor(exitPosition / width);
	if(primaryCar.direction == HORIZONTAL) {
		if(primaryCarPositionX >= exitPositionX)
			return primaryCarPositionX - exitPositionX;
		else
			return exitPositionX - primaryCarPositionX - primaryCar.size + 1;
	}
	if(primaryCar.direction == VERTICAL) {
		if(primaryCarPositionY >= exitPositionY)
			return primaryCarPositionY - exitPositionY;
		else
			return exitPositionY - primaryCarPositionY - primaryCar.size + 1;
	}
	return Infinity;
};
/** @type {HeuristicCalculator} */
export const heuristicCarBlocked = (_, state) => {
	if(state.isSolved()) return 0;
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
			for(let i = primaryCarPositionX - 1; i >= 0; i--) {
				const index = primaryCarPositionY * width + i;
				if(fields[index] == FIELD_EMPTY) continue;
				carBlocked++;
			}
		} else {
			for(let i = primaryCarPositionX + primaryCar.size; i < width; i++) {
				const index = primaryCarPositionY * width + i;
				if(fields[index] == FIELD_EMPTY) continue;
				carBlocked++;
			}
		}
	}
	if(primaryCar.direction == VERTICAL) {
		if(primaryCarPositionY > exitPositionY) {
			for(let i = primaryCarPositionY - 1; i >= 0; i--) {
				const index = i * width + primaryCarPositionX;
				if(fields[index] == FIELD_EMPTY) continue;
				carBlocked++;
			}
		} else {
			for(let i = primaryCarPositionY + primaryCar.size; i < height; i++) {
				const index = i * width + primaryCarPositionX;
				if(fields[index] == FIELD_EMPTY) continue;
				carBlocked++;
			}
		}
	}
	return carBlocked;
};
export const heuristicCarBlockedRecursiveUtils = (() => {
	/**
	 * @param {Car} car
	 * @param {number} carPositionFixed
	 * @param {number} carPositionVariable
	 * @param {Car} nextCar
	 * @param {number} nextCarPositionFixed
	 * @param {number} nextCarPositionVariable
	 */
	const checkIsBehind = (car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable) => {
		if(car.direction == nextCar.direction) {
			return nextCarPositionVariable + nextCar.size <= carPositionVariable;
		}
		return nextCarPositionFixed < carPositionVariable + car.size;
	};
	/**
	 * @param {Car} car
	 * @param {number} carPositionFixed
	 * @param {number} carPositionVariable
	 * @param {Car} nextCar
	 * @param {number} nextCarPositionFixed
	 * @param {number} nextCarPositionVariable
	 */
	const checkIsIntersecting = (car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable) => {
		if(car.direction == nextCar.direction) {
			return carPositionFixed == nextCarPositionFixed;
		}
		return carPositionFixed >= nextCarPositionVariable && carPositionFixed < nextCarPositionVariable + nextCar.size;
	}
	/**
	 * @param {number} width
	 * @param {number} height
	 * @param {Car} car
	 * @param {number} carPositionFixed
	 * @param {number} carPositionVariable
	 * @param {number} needsSpace
	 * @param {boolean} direction
	 */
	const checkIsWall = (width, height, car, carPositionFixed, carPositionVariable, needsSpace, direction) => {
		if(direction && carPositionVariable + car.size + needsSpace > (car.direction == HORIZONTAL ? width : height))
			return true;
		if(!direction && carPositionVariable - needsSpace < 0)
			return true;
		return false;
	};
	/**
	 * @param {Car} car
	 * @param {number} carPositionFixed
	 * @param {number} carPositionVariable
	 * @param {Car} nextCar
	 * @param {number} nextCarPositionFixed
	 * @param {number} nextCarPositionVariable
	 * @param {boolean} direction
	 */
	const getHasSpace = (car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable, direction) => {
		if(car.direction != nextCar.direction) {
			if(direction)
				return Math.abs(carPositionVariable + car.size - nextCarPositionFixed);
			return Math.abs(carPositionVariable - nextCarPositionFixed) + 1;
		}
		if(direction)
			return Math.abs(carPositionVariable + car.size - nextCarPositionVariable);
		return Math.abs(carPositionVariable - nextCarPositionVariable - nextCar.size);
	};
	/**
	 * @param {Car} car
	 * @param {number} carPositionFixed
	 * @param {number} carPositionVariable
	 * @param {Car} nextCar
	 * @param {number} nextCarPositionFixed
	 * @param {number} nextCarPositionVariable
	 * @param {number} needsSpace
	 * @param {boolean} direction
	 */
	const getNeedsSpace = (car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable, needsSpace, direction) => {
		if(car.direction == nextCar.direction) {
			const hasSpace = getHasSpace(car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable, direction);
			return needsSpace - hasSpace;
		}
		if(direction)
			return Math.abs(carPositionFixed - nextCarPositionVariable) + 1;
		return Math.abs(carPositionFixed - nextCarPositionVariable - nextCar.size);
	};
	/**
	 * @param {Car} car
	 * @param {number} carPositionFixed
	 * @param {number} carPositionVariable
	 * @param {Car} nextCar
	 * @param {number} nextCarPositionFixed
	 * @param {number} nextCarPositionVariable
	 * @param {number} needsSpace
	 * @param {boolean} direction
	 */
	const canMove = (car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable, needsSpace, direction) => {
		const isBehind = checkIsBehind(car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable);
		if(isBehind && direction || !isBehind && !direction)
			return true;
		return getHasSpace(car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable, direction) >= needsSpace;
	};
	return {
		checkIsBehind,
		checkIsIntersecting,
		checkIsWall,
		getHasSpace,
		getNeedsSpace,
		canMove
	};
})();
// This heuristic is ported from https://github.com/saschazar21/rushhour/blob/master/Heuristics/AdvancedHeuristic.java
// The solver in said repository always sets the exitPosition to be either on the right side or bottom side.
// Thus this heuristic best performs if the exitPosition is on the right side or bottom side.
/** @type {HeuristicCalculator} */
export const heuristicCarBlockedRecursive = (_, state) => {
	if(state.isSolved()) return 0;
	const width = state.getWidth();
	const height = state.getHeight();
	const allCars = state.getAllCars();
	const computedCarPositions = state.getComputedCarPositions();
	let visitedCars = 0;
	const { checkIsIntersecting, checkIsWall, getNeedsSpace, canMove } = heuristicCarBlockedRecursiveUtils;
	/**
	 * @param {Car} car
	 * @param {number} carPositionFixed
	 * @param {number} carPositionVariable
	 * @param {number} needsSpaceFront
	 * @param {number} needsSpaceBack
	 */
	const getBlockingValue = (car, carPositionFixed, carPositionVariable, needsSpaceFront, needsSpaceBack) => {
		visitedCars |= (1 << car.id);
		let value = 1;
		for(let i = 0; i < allCars.length; i++) {
			const nextCar = allCars[i];
			if(visitedCars & (1 << nextCar.id)) continue;
			const nextCarPosition = computedCarPositions[nextCar.id];
			const nextCarPositionX = nextCarPosition % width;
			const nextCarPositionY = Math.floor(nextCarPosition / width);
			const nextCarPositionFixed = nextCar.direction == HORIZONTAL ? nextCarPositionY : nextCarPositionX;
			const nextCarPositionVariable = nextCar.direction == HORIZONTAL ? nextCarPositionX : nextCarPositionY;
			if(!checkIsIntersecting(car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable)) continue;
			let valueFront = 0;
			let valueBack = 0;
			const frontMoveable = canMove(car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable, needsSpaceFront, true);
			const backMoveable = canMove(car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable, needsSpaceBack, false);
			const nextNeedsSpaceFront = getNeedsSpace(car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable, needsSpaceFront, true);
			const nextNeedsSpaceBack = getNeedsSpace(car, carPositionFixed, carPositionVariable, nextCar, nextCarPositionFixed, nextCarPositionVariable, needsSpaceBack, false);
			if(!frontMoveable)
				valueFront = getBlockingValue(nextCar, nextCarPositionFixed, nextCarPositionVariable, nextNeedsSpaceFront, nextNeedsSpaceBack);
			else if(checkIsWall(width, height, car, carPositionFixed, carPositionVariable, needsSpaceFront, true))
				valueFront = Infinity;
			if(!backMoveable)
				valueBack = getBlockingValue(nextCar, nextCarPositionFixed, nextCarPositionVariable, nextNeedsSpaceFront, nextNeedsSpaceBack);
			else if(checkIsWall(width, height, car, carPositionFixed, carPositionVariable, needsSpaceBack, false))
				valueBack = Infinity;
			value += Math.min(valueFront, valueBack);
		}
		return value;
	};
	const primaryCar = allCars[0];
	const primaryCarPosition = state.getPrimaryCarPosition();
	const primaryCarPositionX = primaryCarPosition % width;
	const primaryCarPositionY = Math.floor(primaryCarPosition / width);
	const primaryCarPositionFixed = primaryCar.direction == HORIZONTAL ? primaryCarPositionY : primaryCarPositionX;
	const primaryCarPositionVariable = primaryCar.direction == HORIZONTAL ? primaryCarPositionX : primaryCarPositionY;
	const getInitialBlockingCars = () => {
		const result = [];
		for(let i = 0; i < allCars.length; i++) {
			const car = allCars[i];
			if(car.direction == primaryCar.direction) continue;
			const carPosition = computedCarPositions[car.id];
			const carPositionX = carPosition % width;
			const carPositionY = Math.floor(carPosition / width);
			const carPositionFixed = car.direction == HORIZONTAL ? carPositionY : carPositionX;
			const carPositionVariable = car.direction == HORIZONTAL ? carPositionX : carPositionY;
			if(carPositionFixed < primaryCarPositionVariable + primaryCar.size) continue;
			if(primaryCarPositionFixed < carPositionVariable || primaryCarPositionFixed >= carPositionVariable + car.size) continue;
			result.push(car);
		}
		return result;
	};
	visitedCars |= 1;
	let value = 1;
	for(const blockingCar of getInitialBlockingCars()) {
		const blockingCarPosition = computedCarPositions[blockingCar.id];
		const blockingCarPositionX = blockingCarPosition % width;
		const blockingCarPositionY = Math.floor(blockingCarPosition / width);
		const blockingCarPositionFixed = blockingCar.direction == HORIZONTAL ? blockingCarPositionY : blockingCarPositionX;
		const blockingCarPositionVariable = blockingCar.direction == HORIZONTAL ? blockingCarPositionX : blockingCarPositionY;
		const needsSpaceFront = getNeedsSpace(primaryCar, primaryCarPositionFixed, primaryCarPositionVariable, blockingCar, blockingCarPositionFixed, blockingCarPositionVariable, 0, true);
		const needsSpaceBack = getNeedsSpace(primaryCar, primaryCarPositionFixed, primaryCarPositionVariable, blockingCar, blockingCarPositionFixed, blockingCarPositionVariable, 0, false);
		value += getBlockingValue(blockingCar, blockingCarPositionFixed, blockingCarPositionVariable, needsSpaceFront, needsSpaceBack);
	}
	return value;
};

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

	// For external storing
	publicIndex = 0;
	publicBoundF = 0;
	publicBoundG = 0;
	publicBoundH = 0;

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
		carPositions = pack.map(p => p[1] & 0xFFFF);
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
			const hintPosition = ((this.#carPositions[i] >>> 16) & 0xFFFF) - 1;
			if(hintPosition == -1) continue;
			hintPositionsCount++;
			this.#fillField(car.direction, hintPosition, car.size, FIELD_EMPTY);
		}
		// Slow path: invalidate using getComputedCars
		if(hintPositionsCount != this.#carIds.length) {
			const parentComputedCarPositions = parent.getComputedCarPositions();
			for(let i = 0; i < this.#carIds.length; i++) {
				const car = this.#allCars[this.#carIds[i]];
				const carPosition = parentComputedCarPositions[car.id];
				this.#carPositions[i] |= (carPosition + 1) << 16;
				this.#fillField(car.direction, carPosition, car.size, FIELD_EMPTY);
			}
		}
		for(let i = 0; i < this.#carIds.length; i++) {
			const car = this.#allCars[this.#carIds[i]];
			const carPosition = this.#carPositions[i] & 0xFFFF;
			// Optimisation: Assume valid. Premise: Parent is valid and getCarMovePositions returns valid moves.
			// if(!this.canFillField(car.direction, newPosition, car.size)) {
			// 	const x = newPosition % this.#width;
			// 	const y = Math.floor(newPosition / this.#width);
			// 	throw new Error(`Cannot place Car#${car.id} at position (${x}, ${y}) with direction ${car.direction} and size ${car.size}.\n${this.toString()}`);
			// }
			this.#fillField(car.direction, carPosition, car.size, car.id + 1);
			if(car.id == 0)
				this.#primaryCarPosition = carPosition;
		}
		if(hintPositionsCount == this.#carIds.length)
			this.#calculateProgressiveHashCode();
		else
			this.#calculateHashCode();
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
		// for(let y = 0; y < this.#height; y++) {
		// 	for(let x = y % 2 == 0 ? 0 : 1; x < this.#width; x++) {
		// 		const i = y * this.#width + x;
		// 		hash ^= this.#fields[i];
		// 		hash = (hash * 0x010193) >>> 0;
		// 	}
		// }
		for(let i = 0; i < this.#fields.length; i++) {
			hash ^= this.#fields[i];
			hash = (hash * 0x1193) >>> 0;
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
			const carPosition = this.#carPositions[i] & 0xFFFF;
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
		descriptions.push(...(this.#isDifference ? this.#getStepDescription_isDifference() : this.#getStepDescription_absolute()));
		return this.#__cachedStepDescription = descriptions.join(" ");
	}
	#getStepDescription_isDifference() {
		const descriptions = [];
		for(let i = 0; i < this.#carIds.length; i++) {
			const car = this.#allCars[this.#carIds[i]];
			const hintPosition = ((this.#carPositions[i] >>> 16) & 0xFFFF) - 1;
			const carPosition = this.#carPositions[i] & 0xFFFF;
			const previousX = hintPosition % this.#width;
			const previousY = Math.floor(hintPosition / this.#width);
			const currentX = carPosition % this.#width;
			const currentY = Math.floor(carPosition / this.#width);
			const dx = currentX - previousX;
			const dy = currentY - previousY;
			const steps = car.direction == HORIZONTAL ? dx : dy;
			descriptions.push(`${car.id}${steps > 0 ? `+${steps}` : `-${-steps}`}`);
		}
		return descriptions;
	}
	#getStepDescription_absolute() {
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
			const steps = car.direction == HORIZONTAL ? dx : dy;
			descriptions.push(`${car.id}${steps > 0 ? `+${steps}` : `-${-steps}`}`);
		}
		return descriptions;
	}
	/** @type {string?} */
	#__cachedMoveDescription = null; // Optimisation: Cache.
	getMoveDescription() {
		if(this.#__cachedMoveDescription != null)
			return this.#__cachedMoveDescription;
		if(this.#parent == null)
			return this.#__cachedMoveDescription = "Initial state";
		const descriptions = this.#isDifference ? this.#getMoveDescription_isDifference() : this.#getMoveDescription_absolute();
		return this.#__cachedMoveDescription = descriptions.length == 0 ? "No change in car positions" : descriptions.join("\n");
	}
	#getMoveDescription_isDifference() {
		const descriptions = [];
		for(let i = 0; i < this.#carIds.length; i++) {
			const car = this.#allCars[this.#carIds[i]];
			const hintPosition = ((this.#carPositions[i] >>> 16) & 0xFFFF) - 1;
			const carPosition = this.#carPositions[i] & 0xFFFF;
			const previousX = hintPosition % this.#width;
			const previousY = Math.floor(hintPosition / this.#width);
			const currentX = carPosition % this.#width;
			const currentY = Math.floor(carPosition / this.#width);
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
		return descriptions;
	}
	#getMoveDescription_absolute() {
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
		return descriptions;
	}
	/** @type {number?} */
	#__cachedPathCost = null; // Optimisation: Cache.
	getPathCost() {
		if(this.#__cachedPathCost != null)
			return this.#__cachedPathCost;
		if(this.#parent == null)
			return this.#__cachedPathCost = 0;
		const pathCost = this.#isDifference ? this.#getPathCost_isDifference() : this.#getPathCost_absolute();
		return this.#__cachedPathCost = pathCost;
	}
	#getPathCost_isDifference() {
		let pathCost = 0;
		for(let i = 0; i < this.#carIds.length; i++) {
			const car = this.#allCars[this.#carIds[i]];
			const hintPosition = ((this.#carPositions[i] >>> 16) & 0xFFFF) - 1;
			const carPosition = this.#carPositions[i] & 0xFFFF;
			if(car.direction == HORIZONTAL) {
				const previousX = hintPosition % this.#width;
				const currentX = carPosition % this.#width;
				const dx = currentX - previousX;
				pathCost += Math.abs(dx);
			}
			if(car.direction == VERTICAL) {
				const previousY = Math.floor(hintPosition / this.#width);
				const currentY = Math.floor(carPosition / this.#width);
				const dy = currentY - previousY;
				pathCost += Math.abs(dy);
			}
		}
		return pathCost;
	}
	#getPathCost_absolute() {
		let pathCost = 0;
		const parentComputedCarPositions = this.#parent.getComputedCarPositions();
		const computedCarPositions = this.getComputedCarPositions();
		for(const car of this.#allCars) {
			const previousCarPosition = parentComputedCarPositions[car.id];
			const currentCarPosition = computedCarPositions[car.id];
			if(previousCarPosition == currentCarPosition) continue;
			if(car.direction == HORIZONTAL) {
				const previousX = previousCarPosition % this.#width;
				const currentX = currentCarPosition % this.#width;
				const dx = currentX - previousX;
				pathCost += Math.abs(dx);
			}
			if(car.direction == VERTICAL) {
				const previousY = Math.floor(previousCarPosition / this.#width);
				const currentY = Math.floor(currentCarPosition / this.#width);
				const dy = currentY - previousY;
				pathCost += Math.abs(dy);
			}
		}
		return pathCost;
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
			// Optimisation: Assume valid.
			// if(positionX < 0 || positionX + size - 1 >= this.#width || positionY < 0 || positionY >= this.#height)
			// 	throw new Error(`Position at (${positionX}, ${positionY}) with direction ${direction} and size ${size} is out of bounds.`);
			for(let i = 0; i < size; i++) {
				const index = positionY * this.#width + (positionX + i);
				this.#fields[index] = value;
			}
		}
		if(direction == VERTICAL) {
			// Optimisation: Assume valid.
			// if(positionY < 0 || positionY + size - 1 >= this.#height || positionX < 0 || positionX >= this.#width)
			// 	throw new Error(`Position at (${positionX}, ${positionY}) with direction ${direction} and size ${size} is out of bounds.`);
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
	expand() {
		/** @type {[Car, number, number[]][]} */
		const result = [];
		if(this.#__cachedComputedCarPositions != null) {
			const computedCarPositions = this.#__cachedComputedCarPositions;
			for(const car of this.#allCars) {
				const position = computedCarPositions[car.id];
				const moves = this.getCarMoveOptions(car.direction, position, car.size);
				if(moves.length == 0) continue;
				result.push([car, position, moves]);
			}
			return result;
		}
		// Optimisation: Do not compute car positions. Iterating the fields and storing the visited car is faster.
		// Optimisation: Check the visited cars by bit fields because `Set` is slower. This puts restriction to the max number of cars to 52.
		let visitedCars = 0;
		for(let i = 0; i < this.#fields.length; i++) {
			const fieldValue = this.#fields[i];
			if(fieldValue == FIELD_EMPTY || fieldValue == FIELD_WALL) continue;
			const carId = fieldValue - 1;
			if(visitedCars & (1 << carId)) continue;
			visitedCars |= (1 << carId);
			const car = this.#allCars[carId];
			const moves = this.getCarMoveOptions(car.direction, i, car.size);
			if(moves.length == 0) continue;
			result.push([car, i, moves]);
		}
		return result;
	}
	hashCode() {
		return this.#hashCode;
	}
	isSolved() {
		return this.#fields[this.#exitPosition] == FIELD_PRIMARY_CAR;
	}
	toString() {
		const chunksArray = (a, size) =>
			Array.from(
				new Array(Math.ceil(a.length / size)),
				(_, i) => a.slice(i * size, i * size + size)
			);
		return chunksArray([...this.#fields], this.#width).map(a => a.map(v => `${v == FIELD_EMPTY ? "." : v == FIELD_WALL ? "#" : v - 1}`.padStart(2, " ")).join(" ")).join("\n");
	}
}

/**
 * @param {string} inputText
 * @returns {{
 *   width: number,
 *   height: number,
 *   cars: Car[],
 *   carPositions: number[],
 *   walls: number[],
 *   exitPosition: number
 * }}
 */
export function parseBoardInput(inputText) {
	const lines = inputText.trim().split(/\r?\n/g);
	const [width, height] = lines[0].trim().split(" ").map(s => parseInt(s));
	const carCount = parseInt(lines[1].trim(), 10);
	if(isNaN(width))
		throw new Error("Width is not a number");
	if(isNaN(height))
		throw new Error("Height is not a number");
	if(isNaN(carCount))
		throw new Error("Car count is not a number");
	const leftPadding = Math.min(...lines.slice(2).map(line => line.match(/^\s*/)[0].length));
	const boardLines = lines.slice(2).map(l => l.slice(leftPadding)).filter(l => l.trim() != "");
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
			if(!/^[A-Z]$/g.test(ch))
				throw new Error(`Unexpected character ${ch}`);
			if(!carCells.has(ch))
				carCells.set(ch, []);
			carCells.get(ch).push([x, y]);
		}
	}
	if(exitPosition == null)
		throw new Error("No exit 'K' found");
	if(exitPosition[0] != 0 && exitPosition[0] != width - 1 && exitPosition[1] != 0 && exitPosition[1] != height - 1)
		throw new Error("Exit position is not on the edge");
	if(exitPosition[0] == 0 && exitPosition[1] != 0) {
		[...carCells.values()].forEach(cs => cs.forEach(c => c[0] -= 1));
		walls.forEach(w => w[0] -= 1);
	}
	if(exitPosition[1] == 0) {
		[...carCells.values()].forEach(cs => cs.forEach(c => c[1] -= 1));
		walls.forEach(w => w[1] -= 1);
	}
	if(carCells.size != carCount + 1)
		throw new Error(`Unexpected car count, got ${carCells.size - 1} expected ${carCount}`);
	const cars = [];
	for(const [ch, cells] of carCells.entries()) {
		cells.sort(([x1, y1], [x2, y2]) => y1 - y2 || x1 - x2);
		const [x0, y0] = cells[0];
		const horizontal = cells.every(([x, y]) => y == y0);
		const vertical = cells.every(([x, y]) => x == x0);
		const size = cells.length;
		if(horizontal && vertical)
			throw new Error(`Car piece ${ch} is a square`);
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
