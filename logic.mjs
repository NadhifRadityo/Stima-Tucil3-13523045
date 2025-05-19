export class QueueSolver {
	/** @type {HeuristicCalculator} */
	#heuristicCalculator;
	/** @type {[number, State][]} */
	#stateQueue;
	/** @type {Set<number>} */
	#closedHashes;
	/** @type {number} */
	#searchCount;
	/** @type {State?} */
	#solution;
	/**
	 * @param {HeuristicCalculator} heuristicCalculator
	 * @param {State} initialState
	 */
	constructor(heuristicCalculator, initialState) {
		this.#heuristicCalculator = heuristicCalculator;
		this.#stateQueue = [[heuristicCalculator(0, initialState), initialState]];
		this.#closedHashes = new Set();
		this.#searchCount = 0;
		this.#solution = null;
		this.#closedHashes.add(initialState.hashCode());
	}
	getHeuristicCalculator() {
		return this.#heuristicCalculator;
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
		/** @type {[number, State]} */
		const [oldBound, state] = this.#stateQueue.shift();
		if(state.isSolved()) {
			this.#solution = state;
			return false;
		}
		/** @type {[number, State][]} */
		const toAddStateQueue = [];
		const width = state.getWidth();
		const allCars = state.getAllCars();
		const fields = state.getFields();
		// Optimisation: Do not compute car positions. Iterating the fields and storing the visited car is faster.
		// Optimisation: Check the visited cars by bit fields because `Set` is slower. This puts restriction to the max number of cars to 52.
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
			this.#searchCount += moves.length;
			for(const move of moves) {
				const newPosition = car.direction == HORIZONTAL ? y * width + (x + move) : (y + move) * width + x;
				const expandedState = State.new_isDifference(state, [car.id], [(((i + 1) << 16) | (newPosition & 0xFFFF)) >>> 0]);
				const hashCode = expandedState.hashCode();
				if(this.#closedHashes.has(hashCode)) continue;
				this.#closedHashes.add(hashCode);
				toAddStateQueue.push([this.#heuristicCalculator(oldBound, expandedState), expandedState]);
			}
		}
		// Optimisation: Sort the newly added states, and merge sort to the queue.
		// The premise is, the newly added states will always be smaller than the existing states.
		// Because inserting to queue first and sort the queue, will unnecessarily compare sorted entries.
		toAddStateQueue.sort((a, b) => a[0] - b[0]);
		QueueSolver.#mergeSortedArraysInPlace(this.#stateQueue, toAddStateQueue, (a, b) => a[0] - b[0]);
		return this.#stateQueue.length != 0;
	}

	/**
	 * @template T
	 * @param {T[]} aArray
	 * @param {T[]} bArray
	 * @param {(a: T, b: T) => number} compareFn
	 */
	static #mergeSortedArraysInPlace(aArray, bArray, compareFn) {
		let aIndex = 0;
		for(let bIndex = 0; bIndex < bArray.length; bIndex++) {
			const item = bArray[bIndex];
			// Optimisation: Since aArray and bArray both sorted, we can optimize
			// the insertion further by searching the aIndex using binary search.
			let high = aArray.length;
			while(aIndex < high) {
				const mid = (aIndex + high) >> 1;
				if(compareFn(aArray[mid], item) <= 0)
					aIndex = mid + 1;
				else
					high = mid;
			}
			aArray.splice(aIndex, 0, item);
			aIndex++;
		}
	}
}
export class StackSolver {
	/** @type {HeuristicCalculator} */
	#heuristicCalculator;
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
	 * @param {HeuristicCalculator} heuristicCalculator
	 * @param {State} initialState
	 */
	constructor(heuristicCalculator, initialState) {
		this.#heuristicCalculator = heuristicCalculator;
		this.#initialState = initialState;
		this.#closedHashes = new Set();
		this.#searchCount = 0;
		this.#bound = heuristicCalculator(0, initialState);
		this.#solution = null;
	}
	getHeuristicCalculator() {
		return this.#heuristicCalculator;
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
		const initialStateBound = this.#heuristicCalculator(0, this.#initialState);
		this.#closedHashes.add(initialStateHashCode);
		const newBound = this.#search(this.#initialState, initialStateBound);
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
	 * @param {number} oldBound
	 * @returns {number | State}
	 */
	#search(state, oldBound) {
		const bound = this.#heuristicCalculator(oldBound, state);
		if(bound > this.#bound)
			return bound;
		if(state.isSolved())
			return state;
		let minBound = Infinity;
		const width = state.getWidth();
		const allCars = state.getAllCars();
		const fields = state.getFields();
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
			this.#searchCount += moves.length;
			for(const move of moves) {
				const newPosition = car.direction == HORIZONTAL ? y * width + (x + move) : (y + move) * width + x;
				const expandedState = State.new_isDifference(state, [car.id], [(((i + 1) << 16) | (newPosition & 0xFFFF)) >>> 0]);
				const hashCode = expandedState.hashCode();
				if(this.#closedHashes.has(hashCode)) continue;
				this.#closedHashes.add(hashCode);
				const result = this.#search(expandedState, bound);
				if(result instanceof State) return result;
				if(result < minBound) minBound = result;
				this.#closedHashes.delete(hashCode);
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
	#heuristicCalculator;
	/** @type {State} */
	#initialState;
	/** @type {Map<number, number>} */
	#closedHashes;
	/** @type {number} */
	#searchCount;
	/** @type {number?} */
	#bound;
	/** @type {boolean} */
	#finished;
	/** @type {State?} */
	#solution;
	/**
	 * @param {HeuristicCalculator} heuristicCalculator
	 * @param {State} initialState
	 */
	constructor(heuristicCalculator, initialState) {
		this.#heuristicCalculator = heuristicCalculator;
		this.#initialState = initialState;
		this.#closedHashes = new Map();
		this.#searchCount = 0;
		this.#bound = heuristicCalculator(0, initialState);
		this.#finished = false;
		this.#solution = null;
	}
	getHeuristicCalculator() {
		return this.#heuristicCalculator;
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
	getFinished() {
		return this.#finished;
	}
	getSolution() {
		return this.#solution;
	}
	tick() {
		if(this.#finished)
			return false;
		const initialStateBound = this.#heuristicCalculator(0, this.#initialState);
		this.#closedHashes.clear();
		this.#closedHashes.set(this.#initialState.hashCode(), initialStateBound);
		const newBound = this.#search(this.#initialState, initialStateBound);
		if(newBound instanceof State) {
			this.#finished = true;
			this.#solution = newBound;
			return false;
		}
		if(newBound == Infinity) {
			this.#finished = true;
			return false;
		}
		this.#bound = newBound;
		return true;
	}
	/**
	 * @param {State} state
	 * @param {number} bound
	 * @returns {number | State}
	 */
	#search(state, bound) {
		if(bound > this.#bound)
			return bound;
		if(state.isSolved())
			return state;
		/** @type {State?} */
		let solvedState = null;
		let minBound = Infinity;
		const width = state.getWidth();
		const allCars = state.getAllCars();
		const fields = state.getFields();
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
			this.#searchCount += moves.length;
			for(const move of moves) {
				const newPosition = car.direction == HORIZONTAL ? y * width + (x + move) : (y + move) * width + x;
				const expandedState = State.new_isDifference(state, [car.id], [(((i + 1) << 16) | (newPosition & 0xFFFF)) >>> 0]);
				const expandedStateBound = this.#heuristicCalculator(bound, expandedState);
				const hashCode = expandedState.hashCode();
				const closedHashBound = this.#closedHashes.get(hashCode);
				if(closedHashBound != null && closedHashBound <= expandedStateBound) continue;
				this.#closedHashes.set(hashCode, expandedStateBound);
				const result = this.#search(expandedState, expandedStateBound);
				if(result instanceof State) {
					if(expandedStateBound < minBound) {
						solvedState = result;
						minBound = expandedStateBound;
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

/** @type {HeuristicCalculator} */
export const heuristicDepth = (_, state) => state.getDepth();
/** @type {HeuristicCalculator} */
export const heuristicConstant = () => 0;
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
		if(primaryCarPositionX > exitPositionX)
			return primaryCarPositionX - exitPositionX;
		else
			return exitPositionX - primaryCarPositionX - primaryCar.size;
	}
	if(primaryCar.direction == VERTICAL) {
		if(primaryCarPositionY > exitPositionY)
			return primaryCarPositionY - exitPositionY;
		else
			return exitPositionY - primaryCarPositionY - primaryCar.size;
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
/** @type {HeuristicCalculator} */
export const heuristicUCS = b => b + 1;
/** @type {HeuristicCalculator} */
export const heuristicGBFSCarDistance = heuristicCarDistance;
/** @type {HeuristicCalculator} */
export const heuristicGBFSCarBlocked = heuristicCarBlocked;
/** @type {HeuristicCalculator} */
export const heuristicGBFSCarBlockedRecursive = heuristicCarBlockedRecursive;
/** @type {HeuristicCalculator} */
export const heuristicAStarCarDistance = (b, s) => b + 1 + heuristicCarDistance(b, s);
/** @type {HeuristicCalculator} */
export const heuristicAStarCarBlocked = (b, s) => b + 1 + heuristicCarBlocked(b, s);
/** @type {HeuristicCalculator} */
export const heuristicAStarCarBlockedRecursive = (b, s) => b + 1 + heuristicCarBlockedRecursive(b, s);

/**
 * @typedef {(oldBound: number, state: State) => number} HeuristicCalculator
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
			this.#fillField(car.direction, hintPosition - 1, car.size, FIELD_EMPTY);
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
			// Optimisation: Assume valid. Premise: Parent is valid and getCarMovePositions returns valid moves.
			// if(!this.canFillField(car.direction, newPosition, car.size)) {
			// 	const x = newPosition % this.#width;
			// 	const y = Math.floor(newPosition / this.#width);
			// 	throw new Error(`Cannot place Car#${car.id} at position (${x}, ${y}) with direction ${car.direction} and size ${car.size}.\n${this.toString()}`);
			// }
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
