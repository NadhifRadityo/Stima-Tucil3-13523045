class Solver {
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
	constructor(heuristicCalculator, initialState) {profile2(Porffor.wasm.f64.const(0));
profile1(Porffor.wasm.f64.const(16));		console.log();
profile1(Porffor.wasm.f64.const(17));		this.#heuristicCalculator = heuristicCalculator;
profile1(Porffor.wasm.f64.const(18));		this.#stateQueue = [[heuristicCalculator(initialState), initialState]];
profile1(Porffor.wasm.f64.const(19));		this.#stateQueueHashes = new Set();
profile1(Porffor.wasm.f64.const(20));		this.#closedHashes = new Set();
profile1(Porffor.wasm.f64.const(21));		this.#solution = null;
	}
	getHeuristicCalculator() {
		return profile1(Porffor.wasm.f64.const(24)),this.#heuristicCalculator;
	}
	getVisitedNodes() {
		return profile1(Porffor.wasm.f64.const(27)),this.#closedHashes.size;
	}
	getSolution() {
		return profile1(Porffor.wasm.f64.const(30)),this.#solution;
	}
	tick() {
profile1(Porffor.wasm.f64.const(33));		if(this.#solution != null || this.#stateQueue.length == 0)
			return profile1(Porffor.wasm.f64.const(34)),false;
		
profile1(Porffor.wasm.f64.const(36));		/** @type {[number, State]} */
profile1(Porffor.wasm.f64.const(37));		const [_, state] = this.#stateQueue.shift();
		
profile1(Porffor.wasm.f64.const(39));		this.#stateQueueHashes.delete(state.hashCode());
		
profile1(Porffor.wasm.f64.const(41));		if(state.isSolved()) {
profile1(Porffor.wasm.f64.const(42));			this.#solution = state;
			return profile1(Porffor.wasm.f64.const(43)),false;
		}
		
profile1(Porffor.wasm.f64.const(46));		this.#closedHashes.add(state.hashCode());
profile1(Porffor.wasm.f64.const(47));		const expandedStates = state.expand(state => {
			
profile1(Porffor.wasm.f64.const(49));			/** @type {[number[], number[]][]} */
profile1(Porffor.wasm.f64.const(50));			const newStatesCars = [];
profile1(Porffor.wasm.f64.const(51));			/** @type {Set<number>} */
profile1(Porffor.wasm.f64.const(52));			const allCars = state.getAllCars();
profile1(Porffor.wasm.f64.const(53));			const width = state.getWidth();
profile1(Porffor.wasm.f64.const(54));			const fields = state.getFields();
profile1(Porffor.wasm.f64.const(55));			// Optimisation: Do not compute car positions. Iterating the fields and storing the visited car is faster.
profile1(Porffor.wasm.f64.const(56));			// Optimisation: Check the visited cars by bit fields. `Set` is slower.
profile1(Porffor.wasm.f64.const(57));			let visitedCars = 0;
profile1(Porffor.wasm.f64.const(58));			for(let i = 0; i < fields.length; i++) {
profile1(Porffor.wasm.f64.const(59));				const fieldValue = fields[i];
profile1(Porffor.wasm.f64.const(60));				if(fieldValue == FIELD_EMPTY || fieldValue == FIELD_WALL) continue;
profile1(Porffor.wasm.f64.const(61));				const carId = fieldValue - 1;
profile1(Porffor.wasm.f64.const(62));				if(visitedCars & (1 << carId)) continue;
profile1(Porffor.wasm.f64.const(63));				visitedCars |= (1 << carId);
profile1(Porffor.wasm.f64.const(64));				const car = allCars[carId];
profile1(Porffor.wasm.f64.const(65));				const x = i % width;
profile1(Porffor.wasm.f64.const(66));				const y = Math.floor(i / width);
profile1(Porffor.wasm.f64.const(67));				const moves = state.getCarMoveOptions(car.direction, i, car.size);
				
profile1(Porffor.wasm.f64.const(69));				if(moves.length == 0) continue;
profile1(Porffor.wasm.f64.const(70));				// @Porffor
profile1(Porffor.wasm.f64.const(71));				for(let j = 0; j < moves.length; j++) {
profile1(Porffor.wasm.f64.const(72));					const move = moves[j];
profile1(Porffor.wasm.f64.const(73));					const newPos = car.direction === HORIZONTAL ? y * width + (x + move) : (y + move) * width + x;
profile1(Porffor.wasm.f64.const(74));					newStatesCars.push([[car.id], [((i << 16) | (newPos & 0xFFFF)) >>> 0]]);
				}
			}
			
			return profile1(Porffor.wasm.f64.const(78)),newStatesCars;
profile1(Porffor.wasm.f64.const(79));		});

profile1(Porffor.wasm.f64.const(81));		/** @type {[number, State][]} */
profile1(Porffor.wasm.f64.const(82));		const toAddStateQueue = [];
profile1(Porffor.wasm.f64.const(83));		for(const expandedState of expandedStates) {
profile1(Porffor.wasm.f64.const(84));			if(this.#closedHashes.has(expandedState.hashCode())) continue;
profile1(Porffor.wasm.f64.const(85));			if(this.#stateQueueHashes.has(expandedState.hashCode())) continue;
profile1(Porffor.wasm.f64.const(86));			toAddStateQueue.push([this.#heuristicCalculator(expandedState), expandedState]);
profile1(Porffor.wasm.f64.const(87));			this.#stateQueueHashes.add(expandedState.hashCode());
		}
profile1(Porffor.wasm.f64.const(89));		// Optimisation: Sort the newly added states, and merge sort to the queue.
profile1(Porffor.wasm.f64.const(90));		// The premise is, the newly added states will always be smaller than the existing states.
profile1(Porffor.wasm.f64.const(91));		// Because inserting to queue first and sort the queue, will unnecessarily compare sorted entries.
		
profile1(Porffor.wasm.f64.const(93));		toAddStateQueue.sort(([a], [b]) => a - b);
profile1(Porffor.wasm.f64.const(94));		Solver.#mergeSortedArraysInPlace(this.#stateQueue, toAddStateQueue, ([a], [b]) => a - b);
		
		
		return profile1(Porffor.wasm.f64.const(97)),this.#stateQueue.length != 0;
	}
	
	/**
	 * @template T
	 * @param {T[]} aArray
	 * @param {T[]} bArray
	 * @param {(a: T, b: T) => number} compareFn
	 */
	static #mergeSortedArraysInPlace(aArray, bArray, compareFn) {
		
		
		
profile1(Porffor.wasm.f64.const(110));		let i = 0, j = 0;
profile1(Porffor.wasm.f64.const(111));		while(j < bArray.length) {
			
profile1(Porffor.wasm.f64.const(113));			while(i < aArray.length && compareFn(aArray[i], bArray[j]) <= 0)
profile1(Porffor.wasm.f64.const(114));				i++;
profile1(Porffor.wasm.f64.const(115));			aArray.splice(i, 0, bArray[j]);
			
profile1(Porffor.wasm.f64.const(117));			i++;
profile1(Porffor.wasm.f64.const(118));			j++;
		}
	}
}

profile1(Porffor.wasm.f64.const(123));const FIELD_EMPTY = 0;
profile1(Porffor.wasm.f64.const(124));const FIELD_WALL = 255;
profile1(Porffor.wasm.f64.const(125));const FIELD_PRIMARY_CAR = 1;
profile1(Porffor.wasm.f64.const(126));const HORIZONTAL = 0;
profile1(Porffor.wasm.f64.const(127));const VERTICAL = 1;

class State {
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
profile1(Porffor.wasm.f64.const(140));		const state = new State();
profile1(Porffor.wasm.f64.const(141));		state.constructor_root(width, height, allCars, carPositions, walls, exitPosition);
		return profile1(Porffor.wasm.f64.const(142)),state;
	}

	/**
	 * @param {State} parent
	 * @param {number[]} carIds
	 * @param {number[]} carPositions
	 */
	static new_isDifference(parent, carIds, carPositions) {
profile1(Porffor.wasm.f64.const(151));		const state = new State();
profile1(Porffor.wasm.f64.const(152));		state.constructor_isDifference(parent, carIds, carPositions);
		return profile1(Porffor.wasm.f64.const(153)),state;
	}

	/**
	 * @param {State} parent
	 * @param {string} stepsString
	 */
	static new_fromSteps(parent, stepsString) {
profile1(Porffor.wasm.f64.const(161));		let state = parent;
profile1(Porffor.wasm.f64.const(162));		const allCars = parent.getAllCars();
profile1(Porffor.wasm.f64.const(163));		const width = parent.getWidth();
profile1(Porffor.wasm.f64.const(164));		const steps = stepsString.split(" ").slice(1)
			.map(s => [...s.matchAll(/^([0-9]+)([\+-][0-9]+)$/g)][0])
			.map(s => [parseInt(s[1]), parseInt(s[2])]);
profile1(Porffor.wasm.f64.const(167));		for(const step of steps) {
profile1(Porffor.wasm.f64.const(168));			const [carId, move] = step;
profile1(Porffor.wasm.f64.const(169));			const car = allCars[carId];
profile1(Porffor.wasm.f64.const(170));			const carPosition = state.getComputedCarPositions()[carId];
profile1(Porffor.wasm.f64.const(171));			const x = carPosition % width;
profile1(Porffor.wasm.f64.const(172));			const y = Math.floor(carPosition / width);
profile1(Porffor.wasm.f64.const(173));			const newPosition = car.direction == HORIZONTAL ? y * width + (x + move) : (y + move) * width + x;
profile1(Porffor.wasm.f64.const(174));			state = State.new_isDifference(state, [carId], [((carPosition << 16) | (newPosition & 0xFFFF)) >>> 0]);
		}
		return profile1(Porffor.wasm.f64.const(176)),state;
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
profile1(Porffor.wasm.f64.const(215));		// const pack = allCars.map((c, i) => [c, carPositions[i]]).sort((a, b) => a[0].id - b[0].id);
profile1(Porffor.wasm.f64.const(216));		// @Porffor
profile1(Porffor.wasm.f64.const(217));		const pack = [];
profile1(Porffor.wasm.f64.const(218));		for (let i = 0; i < allCars.length; i++) {
profile1(Porffor.wasm.f64.const(219));			pack.push([allCars[i], carPositions[i]]);
		}
profile1(Porffor.wasm.f64.const(221));		pack.sort((a, b) => a[0].id - b[0].id);
profile1(Porffor.wasm.f64.const(222));		pack.forEach((p, i) => p[0].id = i);
profile1(Porffor.wasm.f64.const(223));		allCars = pack.map(p => p[0]);
profile1(Porffor.wasm.f64.const(224));		carPositions = pack.map(p => p[1]);
profile1(Porffor.wasm.f64.const(225));		this.#parent = null;
profile1(Porffor.wasm.f64.const(226));		this.#depth = 0;
profile1(Porffor.wasm.f64.const(227));		this.#width = width;
profile1(Porffor.wasm.f64.const(228));		this.#height = height;
profile1(Porffor.wasm.f64.const(229));		this.#isDifference = false;
profile1(Porffor.wasm.f64.const(230));		this.#allCars = allCars;
profile1(Porffor.wasm.f64.const(231));		this.#carIds = allCars.map(c => c.id);
profile1(Porffor.wasm.f64.const(232));		this.#carPositions = carPositions;
profile1(Porffor.wasm.f64.const(233));		this.#primaryCarPosition = carPositions[0];
profile1(Porffor.wasm.f64.const(234));		this.#walls = walls;
profile1(Porffor.wasm.f64.const(235));		this.#exitPosition = exitPosition;
profile1(Porffor.wasm.f64.const(236));		this.#fields = new Uint8Array(width * height);
profile1(Porffor.wasm.f64.const(237));		for(const wall of this.#walls)
profile1(Porffor.wasm.f64.const(238));			this.#fillField(HORIZONTAL, wall, 1, FIELD_WALL);
profile1(Porffor.wasm.f64.const(239));		for(let i = 0; i < this.#carIds.length; i++) {
profile1(Porffor.wasm.f64.const(240));			const car = this.#allCars[this.#carIds[i]];
profile1(Porffor.wasm.f64.const(241));			const carPosition = this.#carPositions[i];
profile1(Porffor.wasm.f64.const(242));			if(!this.canFillField(car.direction, carPosition, car.size)) {
profile1(Porffor.wasm.f64.const(243));				const x = carPosition % this.#width;
profile1(Porffor.wasm.f64.const(244));				const y = Math.floor(carPosition / this.#width);
				throw profile1(Porffor.wasm.f64.const(245)),new Error(`Cannot place Car#${car.id} at position (${x}, ${y}) with direction ${car.direction} and size ${car.size}.\n${this.toString()}`);
			}
profile1(Porffor.wasm.f64.const(247));			this.#fillField(car.direction, carPosition, car.size, car.id + 1);
		}
profile1(Porffor.wasm.f64.const(249));		this.#calculateHashCode();
	}
	/**
	 * @param {State} parent
	 * @param {number[]} carIds
	 * @param {number[]} carPositions
	 */
	constructor_isDifference(parent, carIds, carPositions) {
profile1(Porffor.wasm.f64.const(257));		this.#parent = parent;
profile1(Porffor.wasm.f64.const(258));		this.#depth = parent.#depth + 1;
profile1(Porffor.wasm.f64.const(259));		this.#width = parent.#width;
profile1(Porffor.wasm.f64.const(260));		this.#height = parent.#height;
profile1(Porffor.wasm.f64.const(261));		this.#isDifference = true;
profile1(Porffor.wasm.f64.const(262));		this.#allCars = parent.#allCars;
profile1(Porffor.wasm.f64.const(263));		this.#carIds = carIds;
profile1(Porffor.wasm.f64.const(264));		this.#carPositions = carPositions;
profile1(Porffor.wasm.f64.const(265));		this.#primaryCarPosition = parent.#primaryCarPosition;
profile1(Porffor.wasm.f64.const(266));		this.#walls = parent.#walls;
profile1(Porffor.wasm.f64.const(267));		this.#exitPosition = parent.#exitPosition;
profile1(Porffor.wasm.f64.const(268));		this.#fields = new Uint8Array(parent.#fields);
profile1(Porffor.wasm.f64.const(269));		let hintPositionsCount = 0;
profile1(Porffor.wasm.f64.const(270));		for(let i = 0; i < this.#carIds.length; i++) {
profile1(Porffor.wasm.f64.const(271));			const car = this.#allCars[this.#carIds[i]];
profile1(Porffor.wasm.f64.const(272));			const carPosition = this.#carPositions[i];
profile1(Porffor.wasm.f64.const(273));			const hintPosition = (carPosition >>> 16) & 0xFFFF;
profile1(Porffor.wasm.f64.const(274));			if(hintPosition == 0) continue;
profile1(Porffor.wasm.f64.const(275));			hintPositionsCount++;
profile1(Porffor.wasm.f64.const(276));			this.#fillField(car.direction, hintPosition, car.size, FIELD_EMPTY);
		}
profile1(Porffor.wasm.f64.const(278));		// Slow path: invalidate using getComputedCars
profile1(Porffor.wasm.f64.const(279));		if(hintPositionsCount != this.#carIds.length) {
profile1(Porffor.wasm.f64.const(280));			const parentComputedCarPositions = parent.getComputedCarPositions();
profile1(Porffor.wasm.f64.const(281));			for(let i = 0; i < this.#carIds.length; i++) {
profile1(Porffor.wasm.f64.const(282));				const car = this.#allCars[this.#carIds[i]];
profile1(Porffor.wasm.f64.const(283));				const carPosition = parentComputedCarPositions[car.id];
profile1(Porffor.wasm.f64.const(284));				this.#fillField(car.direction, carPosition, car.size, FIELD_EMPTY);
			}
		}
profile1(Porffor.wasm.f64.const(287));		for(let i = 0; i < this.#carIds.length; i++) {
profile1(Porffor.wasm.f64.const(288));			const car = this.#allCars[this.#carIds[i]];
profile1(Porffor.wasm.f64.const(289));			const carPosition = this.#carPositions[i];
profile1(Porffor.wasm.f64.const(290));			const newPosition = carPosition & 0xFFFF;
profile1(Porffor.wasm.f64.const(291));			if(!this.canFillField(car.direction, newPosition, car.size)) {
profile1(Porffor.wasm.f64.const(292));				const x = newPosition % this.#width;
profile1(Porffor.wasm.f64.const(293));				const y = Math.floor(newPosition / this.#width);
				throw profile1(Porffor.wasm.f64.const(294)),new Error(`Cannot place Car#${car.id} at position (${x}, ${y}) with direction ${car.direction} and size ${car.size}.\n${this.toString()}`);
			}
profile1(Porffor.wasm.f64.const(296));			this.#fillField(car.direction, newPosition, car.size, car.id + 1);
profile1(Porffor.wasm.f64.const(297));			if(car.id == 0)
profile1(Porffor.wasm.f64.const(298));				this.#primaryCarPosition = newPosition;
		}
profile1(Porffor.wasm.f64.const(300));		this.#calculateHashCode();
profile1(Porffor.wasm.f64.const(301));		for(let i = 0; i < this.#carIds.length; i++) {
profile1(Porffor.wasm.f64.const(302));			const carPosition = this.#carPositions[i];
profile1(Porffor.wasm.f64.const(303));			const newPosition = carPosition & 0xFFFF;
profile1(Porffor.wasm.f64.const(304));			this.#carPositions[i] = newPosition;
		}
	}
	getParent() {
		return profile1(Porffor.wasm.f64.const(308)),this.#parent;
	}
	getDepth() {
		return profile1(Porffor.wasm.f64.const(311)),this.#depth;
	}
	getWidth() {
		return profile1(Porffor.wasm.f64.const(314)),this.#width;
	}
	getHeight() {
		return profile1(Porffor.wasm.f64.const(317)),this.#height;
	}
	getIsDifference() {
		return profile1(Porffor.wasm.f64.const(320)),this.#isDifference;
	}
	getAllCars() {
		return profile1(Porffor.wasm.f64.const(323)),this.#allCars;
	}
	getCarIds() {
		return profile1(Porffor.wasm.f64.const(326)),this.#carIds;
	}
	getCarPositions() {
		return profile1(Porffor.wasm.f64.const(329)),this.#carPositions;
	}
	getPrimaryCarPosition() {
		return profile1(Porffor.wasm.f64.const(332)),this.#primaryCarPosition;
	}
	getWalls() {
		return profile1(Porffor.wasm.f64.const(335)),this.#walls;
	}
	getExitPosition() {
		return profile1(Porffor.wasm.f64.const(338)),this.#exitPosition;
	}
	getFields() {
		return profile1(Porffor.wasm.f64.const(341)),this.#fields;
	}
	static #__tempUint32Array = new Uint32Array(1);
	#calculateHashCode() {
profile1(Porffor.wasm.f64.const(345));		// let hash = 0x811c9dc5;
profile1(Porffor.wasm.f64.const(346));		// Optimisation: This hashCode is not 100% correct. But that's what we sacrifice to half the computation.
profile1(Porffor.wasm.f64.const(347));		// Optimisation: Compute the hashCode over checkered board pattern to reduce clashes.
profile1(Porffor.wasm.f64.const(348));		// This hash is safe as long as there's no one-sized car.
profile1(Porffor.wasm.f64.const(349));		// for(let y = 0; y < this.#height; y++) {
profile1(Porffor.wasm.f64.const(350));		// 	for(let x = y % 2 == 0 ? 0 : 1; x < this.#width; x++) {
profile1(Porffor.wasm.f64.const(351));		// 		const i = y * this.#width + x;
profile1(Porffor.wasm.f64.const(352));		// 		hash ^= this.#fields[i];
profile1(Porffor.wasm.f64.const(353));		// 		hash = (hash * 0x010193) >>> 0;
profile1(Porffor.wasm.f64.const(354));		// 	}
profile1(Porffor.wasm.f64.const(355));		// }
profile1(Porffor.wasm.f64.const(356));		// @Porffor
profile1(Porffor.wasm.f64.const(357));		Porffor.hashFields(this.#width, this.#height, this.#fields, State.#__tempUint32Array);
profile1(Porffor.wasm.f64.const(358));		this.#hashCode = State.#__tempUint32Array[0];
profile1(Porffor.wasm.f64.const(359));		// console.log(this.#hashCode);
	}
	/** @type {number[]} */
	#__cachedComputedCarPositions = null; // Optimisation: Cache.
	getComputedCarPositions() {
profile1(Porffor.wasm.f64.const(364));		if(this.#__cachedComputedCarPositions != null)
			return profile1(Porffor.wasm.f64.const(365)),this.#__cachedComputedCarPositions;
profile1(Porffor.wasm.f64.const(366));		if(this.#parent == null || !this.#isDifference)
			return profile1(Porffor.wasm.f64.const(367)),this.#__cachedComputedCarPositions = this.#carPositions;
profile1(Porffor.wasm.f64.const(368));		/** @type {number[]} */
profile1(Porffor.wasm.f64.const(369));		const computedCars = [...this.#parent.getComputedCarPositions()];
profile1(Porffor.wasm.f64.const(370));		for(let i = 0; i < this.#carIds.length; i++) {
profile1(Porffor.wasm.f64.const(371));			const carId = this.#carIds[i];
profile1(Porffor.wasm.f64.const(372));			const carPosition = this.#carPositions[i];
profile1(Porffor.wasm.f64.const(373));			computedCars[carId] = carPosition;
		}
		return profile1(Porffor.wasm.f64.const(375)),this.#__cachedComputedCarPositions = computedCars;
	}
	/** @type {string?} */
	#__cachedStepDescription = null; // Optimisation: Cache.
	getStepDescription() {
profile1(Porffor.wasm.f64.const(380));		if(this.#__cachedStepDescription != null)
			return profile1(Porffor.wasm.f64.const(381)),this.#__cachedStepDescription;
profile1(Porffor.wasm.f64.const(382));		if(this.#parent == null)
			return profile1(Porffor.wasm.f64.const(383)),this.#__cachedStepDescription = "";
profile1(Porffor.wasm.f64.const(384));		const descriptions = [this.#parent.getStepDescription()];
profile1(Porffor.wasm.f64.const(385));		const parentComputedCarPositions = this.#parent.getComputedCarPositions();
profile1(Porffor.wasm.f64.const(386));		const computedCarPositions = this.getComputedCarPositions();
profile1(Porffor.wasm.f64.const(387));		for(const car of this.#allCars) {
profile1(Porffor.wasm.f64.const(388));			const previousCarPosition = parentComputedCarPositions[car.id];
profile1(Porffor.wasm.f64.const(389));			const currentCarPosition = computedCarPositions[car.id];
profile1(Porffor.wasm.f64.const(390));			if(previousCarPosition == currentCarPosition) continue;
profile1(Porffor.wasm.f64.const(391));			const previousX = previousCarPosition % this.#width;
profile1(Porffor.wasm.f64.const(392));			const previousY = Math.floor(previousCarPosition / this.#width);
profile1(Porffor.wasm.f64.const(393));			const currentX = currentCarPosition % this.#width;
profile1(Porffor.wasm.f64.const(394));			const currentY = Math.floor(currentCarPosition / this.#width);
profile1(Porffor.wasm.f64.const(395));			const dx = currentX - previousX;
profile1(Porffor.wasm.f64.const(396));			const dy = currentY - previousY;
profile1(Porffor.wasm.f64.const(397));			const steps = car.direction == HORIZONTAL ? dx : dy;
profile1(Porffor.wasm.f64.const(398));			descriptions.push(`${car.id}${steps > 0 ? `+${steps}` : `-${-steps}`}`);
		}
		return profile1(Porffor.wasm.f64.const(400)),this.#__cachedStepDescription = descriptions.join(" ");
	}
	/** @type {string?} */
	#__cachedMoveDescription = null; // Optimisation: Cache.
	getMoveDescription() {
profile1(Porffor.wasm.f64.const(405));		if(this.#__cachedMoveDescription != null)
			return profile1(Porffor.wasm.f64.const(406)),this.#__cachedMoveDescription;
profile1(Porffor.wasm.f64.const(407));		if(this.#parent == null)
			return profile1(Porffor.wasm.f64.const(408)),this.#__cachedMoveDescription = "Initial state";
profile1(Porffor.wasm.f64.const(409));		const descriptions = [];
profile1(Porffor.wasm.f64.const(410));		const parentComputedCarPositions = this.#parent.getComputedCarPositions();
profile1(Porffor.wasm.f64.const(411));		const computedCarPositions = this.getComputedCarPositions();
profile1(Porffor.wasm.f64.const(412));		for(const car of this.#allCars) {
profile1(Porffor.wasm.f64.const(413));			const previousCarPosition = parentComputedCarPositions[car.id];
profile1(Porffor.wasm.f64.const(414));			const currentCarPosition = computedCarPositions[car.id];
profile1(Porffor.wasm.f64.const(415));			if(previousCarPosition == currentCarPosition) continue;
profile1(Porffor.wasm.f64.const(416));			const previousX = previousCarPosition % this.#width;
profile1(Porffor.wasm.f64.const(417));			const previousY = Math.floor(previousCarPosition / this.#width);
profile1(Porffor.wasm.f64.const(418));			const currentX = currentCarPosition % this.#width;
profile1(Porffor.wasm.f64.const(419));			const currentY = Math.floor(currentCarPosition / this.#width);
profile1(Porffor.wasm.f64.const(420));			const dx = currentX - previousX;
profile1(Porffor.wasm.f64.const(421));			const dy = currentY - previousY;
profile1(Porffor.wasm.f64.const(422));			let direction = "";
profile1(Porffor.wasm.f64.const(423));			let steps = 0;
profile1(Porffor.wasm.f64.const(424));			if(car.direction == HORIZONTAL) {
profile1(Porffor.wasm.f64.const(425));				direction = dx > 0 ? "rightward" : "leftward";
profile1(Porffor.wasm.f64.const(426));				steps = Math.abs(dx);
			}
profile1(Porffor.wasm.f64.const(428));			if(car.direction == VERTICAL) {
profile1(Porffor.wasm.f64.const(429));				direction = dy > 0 ? "downward" : "upward";
profile1(Porffor.wasm.f64.const(430));				steps = Math.abs(dy);
			}
profile1(Porffor.wasm.f64.const(432));			descriptions.push(`Car#${car.id} moved ${steps} step${steps > 1 ? "s" : ""} ${direction}`);
		}
		return profile1(Porffor.wasm.f64.const(434)),this.#__cachedMoveDescription = descriptions.length == 0 ? "No change in car positions" : descriptions.join("\n");
	}
	/**
	 * @param {number} direction
	 * @param {number} position
	 * @param {number} size
	 * @param {number} value
	 */
	#fillField(direction, position, size, value) {
profile1(Porffor.wasm.f64.const(443));		const positionX = position % this.#width;
profile1(Porffor.wasm.f64.const(444));		const positionY = Math.floor(position / this.#width);
profile1(Porffor.wasm.f64.const(445));		if(direction == HORIZONTAL) {
profile1(Porffor.wasm.f64.const(446));			if(positionX < 0 || positionX + size - 1 >= this.#width || positionY < 0 || positionY >= this.#height)
				throw profile1(Porffor.wasm.f64.const(447)),new Error(`Position at (${positionX}, ${positionY}) with direction ${direction} and size ${size} is out of bounds.`);
profile1(Porffor.wasm.f64.const(448));			for(let i = 0; i < size; i++) {
profile1(Porffor.wasm.f64.const(449));				const index = positionY * this.#width + (positionX + i);
profile1(Porffor.wasm.f64.const(450));				this.#fields[index] = value;
			}
		}
profile1(Porffor.wasm.f64.const(453));		if(direction == VERTICAL) {
profile1(Porffor.wasm.f64.const(454));			if(positionY < 0 || positionY + size - 1 >= this.#height || positionX < 0 || positionX >= this.#width)
				throw profile1(Porffor.wasm.f64.const(455)),new Error(`Position at (${positionX}, ${positionY}) with direction ${direction} and size ${size} is out of bounds.`);
profile1(Porffor.wasm.f64.const(456));			for(let i = 0; i < size; i++) {
profile1(Porffor.wasm.f64.const(457));				const index = (positionY + i) * this.#width + positionX;
profile1(Porffor.wasm.f64.const(458));				this.#fields[index] = value;
			}
		}
	}
	/**
	 * @param {number} direction
	 * @param {number} position
	 * @param {number} size
	 */
	canFillField(direction, position, size) {
profile1(Porffor.wasm.f64.const(468));		const positionX = position % this.#width;
profile1(Porffor.wasm.f64.const(469));		const positionY = Math.floor(position / this.#width);
profile1(Porffor.wasm.f64.const(470));		if(direction == HORIZONTAL) {
profile1(Porffor.wasm.f64.const(471));			if(positionX < 0 || positionX + size - 1 >= this.#width || positionY < 0 || positionY >= this.#height)
				return profile1(Porffor.wasm.f64.const(472)),false;
profile1(Porffor.wasm.f64.const(473));			for(let i = 0; i < size; i++) {
profile1(Porffor.wasm.f64.const(474));				const x = positionX + i;
profile1(Porffor.wasm.f64.const(475));				const index = positionY * this.#width + x;
profile1(Porffor.wasm.f64.const(476));				if(this.#fields[index] != FIELD_EMPTY)
					return profile1(Porffor.wasm.f64.const(477)),false;
			}
		}
profile1(Porffor.wasm.f64.const(480));		if(direction == VERTICAL) {
profile1(Porffor.wasm.f64.const(481));			if(positionY < 0 || positionY + size - 1 >= this.#height || positionX < 0 || positionX >= this.#width)
				return profile1(Porffor.wasm.f64.const(482)),false;
profile1(Porffor.wasm.f64.const(483));			for(let i = 0; i < size; i++) {
profile1(Porffor.wasm.f64.const(484));				const y = positionY + i;
profile1(Porffor.wasm.f64.const(485));				const index = y * this.#width + positionX;
profile1(Porffor.wasm.f64.const(486));				if(this.#fields[index] != FIELD_EMPTY)
					return profile1(Porffor.wasm.f64.const(487)),false;
			}
		}
		return profile1(Porffor.wasm.f64.const(490)),true;
	}
	/**
	 * @param {number} direction
	 * @param {number} position
	 * @param {number} size
	 */
	getCarMoveOptions(direction, position, size) {
profile1(Porffor.wasm.f64.const(498));		// @Porffor
profile1(Porffor.wasm.f64.const(499));		const positionX = position % this.#width;
profile1(Porffor.wasm.f64.const(500));		const positionY = Math.floor(position / this.#width);
profile1(Porffor.wasm.f64.const(501));		const moves = [];
profile1(Porffor.wasm.f64.const(502));		const maxSteps = Math.max(this.#width, this.#height);

profile1(Porffor.wasm.f64.const(504));		for (let step = 1; step <= maxSteps; step++) {
profile1(Porffor.wasm.f64.const(505));			let x, y;
profile1(Porffor.wasm.f64.const(506));			if (direction == HORIZONTAL) {
profile1(Porffor.wasm.f64.const(507));				x = positionX + size - 1 + step;
profile1(Porffor.wasm.f64.const(508));				y = positionY;
profile1(Porffor.wasm.f64.const(509));			} else { // direction == VERTICAL
profile1(Porffor.wasm.f64.const(510));				x = positionX;
profile1(Porffor.wasm.f64.const(511));				y = positionY + size - 1 + step;
			}

profile1(Porffor.wasm.f64.const(514));			if (x < 0 || x >= this.#width || y < 0 || y >= this.#height) break;
profile1(Porffor.wasm.f64.const(515));			const index = y * this.#width + x;
profile1(Porffor.wasm.f64.const(516));			if (this.#fields[index] !== FIELD_EMPTY) break;

profile1(Porffor.wasm.f64.const(518));			moves.push(step);
		}

profile1(Porffor.wasm.f64.const(521));		for (let step = 1; step <= maxSteps; step++) {
profile1(Porffor.wasm.f64.const(522));			let x, y;
profile1(Porffor.wasm.f64.const(523));			if (direction == HORIZONTAL) {
profile1(Porffor.wasm.f64.const(524));				x = positionX - step;
profile1(Porffor.wasm.f64.const(525));				y = positionY;
profile1(Porffor.wasm.f64.const(526));			} else { // direction == VERTICAL
profile1(Porffor.wasm.f64.const(527));				x = positionX;
profile1(Porffor.wasm.f64.const(528));				y = positionY - step;
			}

profile1(Porffor.wasm.f64.const(531));			if (x < 0 || x >= this.#width || y < 0 || y >= this.#height) break;
profile1(Porffor.wasm.f64.const(532));			const index = y * this.#width + x;
profile1(Porffor.wasm.f64.const(533));			if (this.#fields[index] !== FIELD_EMPTY) break;

profile1(Porffor.wasm.f64.const(535));			moves.push(-step);
		}

		return profile1(Porffor.wasm.f64.const(538)),moves;
	}
	hashCode() {
		return profile1(Porffor.wasm.f64.const(541)),this.#hashCode;
	}
	isSolved() {
		return profile1(Porffor.wasm.f64.const(544)),this.#fields[this.#exitPosition] == FIELD_PRIMARY_CAR;
	}
	/**
	 * @param {StateExpander} expander
	 */
	expand(expander) {
profile1(Porffor.wasm.f64.const(550));		// @Porffor
profile1(Porffor.wasm.f64.const(551));		const newStatesCars = expander(this);
profile1(Porffor.wasm.f64.const(552));		const result = [];
profile1(Porffor.wasm.f64.const(553));		for (let i = 0; i < newStatesCars.length; i++) {
profile1(Porffor.wasm.f64.const(554));			const [newCarIds, newCarPositions] = newStatesCars[i];
profile1(Porffor.wasm.f64.const(555));			const newState = State.new_isDifference(this, newCarIds, newCarPositions);
profile1(Porffor.wasm.f64.const(556));			result.push(newState);
		}
	return profile1(Porffor.wasm.f64.const(558)),result;
	}
	toString() {
profile1(Porffor.wasm.f64.const(561));		// const chunksArray = (a, size) =>
profile1(Porffor.wasm.f64.const(562));		// 	Array.from(
profile1(Porffor.wasm.f64.const(563));		// 		new Array(Math.ceil(a.length / size)),
profile1(Porffor.wasm.f64.const(564));		// 		(_, i) => a.slice(i * size, i * size + size)
profile1(Porffor.wasm.f64.const(565));		// 	);
		// return profile1(Porffor.wasm.f64.const(566)),chunksArray([...this.#fields], 6).map(a => a.map(v => `${v == FIELD_EMPTY ? "." : v == FIELD_WALL ? "#" : v - 1}`.padStart(2, " ")).join(" ")).join("\n");
profile1(Porffor.wasm.f64.const(567));		// @Porffor
profile1(Porffor.wasm.f64.const(568));		const numChunks = Math.ceil(this.#fields.length / this.#width);
profile1(Porffor.wasm.f64.const(569));		const lines = [];
profile1(Porffor.wasm.f64.const(570));		for(let i = 0; i < numChunks; i++) {
profile1(Porffor.wasm.f64.const(571));			const chunk = [];
profile1(Porffor.wasm.f64.const(572));			for(let j = 0; j < this.#width; j++) {
profile1(Porffor.wasm.f64.const(573));				const index = i * this.#width + j;
profile1(Porffor.wasm.f64.const(574));				if(index >= this.#fields.length) break;
profile1(Porffor.wasm.f64.const(575));				const v = this.#fields[index];
profile1(Porffor.wasm.f64.const(576));				let display;
profile1(Porffor.wasm.f64.const(577));				if(v == FIELD_EMPTY) {
profile1(Porffor.wasm.f64.const(578));					display = ".";
profile1(Porffor.wasm.f64.const(579));				} else if(v == FIELD_WALL) {
profile1(Porffor.wasm.f64.const(580));					display = "#";
profile1(Porffor.wasm.f64.const(581));				} else {
profile1(Porffor.wasm.f64.const(582));					display = (v - 1).toString();
				}
profile1(Porffor.wasm.f64.const(584));				chunk.push(display.padStart(2, " "));
			}
profile1(Porffor.wasm.f64.const(586));			lines.push(chunk.join(" "));
		}
		return profile1(Porffor.wasm.f64.const(588)),lines.join("\n");
	}
}

profile1(Porffor.wasm.f64.const(592));/** @type {HeuristicCalculator} */
profile1(Porffor.wasm.f64.const(593));const heuristicDepth = state => state.getDepth();
profile1(Porffor.wasm.f64.const(594));/** @type {HeuristicCalculator} */
profile1(Porffor.wasm.f64.const(595));const heuristicConstant = _ => 0;
profile1(Porffor.wasm.f64.const(596));/** @type {HeuristicCalculator} */
profile1(Porffor.wasm.f64.const(597));const heuristicCarBlocked = state => {
profile1(Porffor.wasm.f64.const(598));	const width = state.getWidth();
profile1(Porffor.wasm.f64.const(599));	const height = state.getHeight();
profile1(Porffor.wasm.f64.const(600));	const fields = state.getFields();
profile1(Porffor.wasm.f64.const(601));	const primaryCar = state.getAllCars()[0];
profile1(Porffor.wasm.f64.const(602));	const primaryCarPosition = state.getPrimaryCarPosition();
profile1(Porffor.wasm.f64.const(603));	const primaryCarPositionX = primaryCarPosition % width;
profile1(Porffor.wasm.f64.const(604));	const primaryCarPositionY = Math.floor(primaryCarPosition / width);
profile1(Porffor.wasm.f64.const(605));	const exitPosition = state.getExitPosition();
profile1(Porffor.wasm.f64.const(606));	const exitPositionX = exitPosition % width;
profile1(Porffor.wasm.f64.const(607));	const exitPositionY = Math.floor(exitPosition / width);
profile1(Porffor.wasm.f64.const(608));	let carBlocked = 0;
profile1(Porffor.wasm.f64.const(609));	if(primaryCar.direction == HORIZONTAL) {
profile1(Porffor.wasm.f64.const(610));		if(primaryCarPositionX > exitPositionX) {
profile1(Porffor.wasm.f64.const(611));			for(let i = primaryCarPositionX; i >= 0; i--) {
profile1(Porffor.wasm.f64.const(612));				const index = primaryCarPositionY * width + i;
profile1(Porffor.wasm.f64.const(613));				const fieldValue = fields[index];
profile1(Porffor.wasm.f64.const(614));				if(fieldValue == FIELD_EMPTY || fieldValue == FIELD_PRIMARY_CAR) continue;
profile1(Porffor.wasm.f64.const(615));				carBlocked++;
			}
profile1(Porffor.wasm.f64.const(617));		} else {
profile1(Porffor.wasm.f64.const(618));			for(let i = primaryCarPositionX; i < width; i++) {
profile1(Porffor.wasm.f64.const(619));				const index = primaryCarPositionY * width + i;
profile1(Porffor.wasm.f64.const(620));				const fieldValue = fields[index];
profile1(Porffor.wasm.f64.const(621));				if(fieldValue == FIELD_EMPTY || fieldValue == FIELD_PRIMARY_CAR) continue;
profile1(Porffor.wasm.f64.const(622));				carBlocked++;
			}
		}
	}
profile1(Porffor.wasm.f64.const(626));	if(primaryCar.direction == VERTICAL) {
profile1(Porffor.wasm.f64.const(627));		if(primaryCarPositionY > exitPositionY) {
profile1(Porffor.wasm.f64.const(628));			for(let i = primaryCarPositionY; i >= 0; i--) {
profile1(Porffor.wasm.f64.const(629));				const index = i * width + primaryCarPositionX;
profile1(Porffor.wasm.f64.const(630));				const fieldValue = fields[index];
profile1(Porffor.wasm.f64.const(631));				if(fieldValue == FIELD_EMPTY || fieldValue == FIELD_PRIMARY_CAR) continue;
profile1(Porffor.wasm.f64.const(632));				carBlocked++;
			}
profile1(Porffor.wasm.f64.const(634));		} else {
profile1(Porffor.wasm.f64.const(635));			for(let i = primaryCarPositionY; i < height; i++) {
profile1(Porffor.wasm.f64.const(636));				const index = i * width + primaryCarPositionX;
profile1(Porffor.wasm.f64.const(637));				const fieldValue = fields[index];
profile1(Porffor.wasm.f64.const(638));				if(fieldValue == FIELD_EMPTY || fieldValue == FIELD_PRIMARY_CAR) continue;
profile1(Porffor.wasm.f64.const(639));				carBlocked++;
			}
		}
	}
	return profile1(Porffor.wasm.f64.const(643)),carBlocked;
profile1(Porffor.wasm.f64.const(644));};
profile1(Porffor.wasm.f64.const(645));const heuristicUCS = heuristicDepth;
profile1(Porffor.wasm.f64.const(646));const heuristicGBFSCarBlocked = heuristicCarBlocked;
profile1(Porffor.wasm.f64.const(647));const heuristicAStarCarBlocked = s => heuristicDepth(s) + heuristicCarBlocked(s);

profile1(Porffor.wasm.f64.const(649));const stringSplitAll = s => {
profile1(Porffor.wasm.f64.const(650));	const result = new Array(s.length).fill();
profile1(Porffor.wasm.f64.const(651));	for(let i = 0; i < s.length; i++)
profile1(Porffor.wasm.f64.const(652));		result[i] = s.charAt(i);
	return profile1(Porffor.wasm.f64.const(653)),result;
profile1(Porffor.wasm.f64.const(654));};
profile1(Porffor.wasm.f64.const(655));function parseBoardInput(inputText) {
profile1(Porffor.wasm.f64.const(656));	const lines = inputText.trim().split("\n").map(l => l.trim());
profile1(Porffor.wasm.f64.const(657));	const [width, height] = lines[0].split(" ").map(s => parseInt(s));
profile1(Porffor.wasm.f64.const(658));	const carCount = parseInt(lines[1], 10);
profile1(Porffor.wasm.f64.const(659));	const boardLines = lines.slice(2).map(l => stringSplitAll(l));
profile1(Porffor.wasm.f64.const(660));	if(isNaN(width))
		throw profile1(Porffor.wasm.f64.const(661)),new Error("Width is not a number");
profile1(Porffor.wasm.f64.const(662));	if(isNaN(height))
		throw profile1(Porffor.wasm.f64.const(663)),new Error("Height is not a number");
profile1(Porffor.wasm.f64.const(664));	if(isNaN(carCount))
		throw profile1(Porffor.wasm.f64.const(665)),new Error("Car count is not a number");
profile1(Porffor.wasm.f64.const(666));	const carCells = new Map();
profile1(Porffor.wasm.f64.const(667));	let exitPosition = -1;
profile1(Porffor.wasm.f64.const(668));	const walls = [];
profile1(Porffor.wasm.f64.const(669));	for(let y = 0; y < boardLines.length; y++) {
profile1(Porffor.wasm.f64.const(670));		for(let x = 0; x < boardLines[y].length; x++) {
profile1(Porffor.wasm.f64.const(671));			const ch = boardLines[y][x];
profile1(Porffor.wasm.f64.const(672));			if(ch == null || ch == " " || ch == ".") continue;
profile1(Porffor.wasm.f64.const(673));			if(ch == "K") {
profile1(Porffor.wasm.f64.const(674));				if(exitPosition != -1)
					throw profile1(Porffor.wasm.f64.const(675)),new Error("Multiple 'K' characters found");
profile1(Porffor.wasm.f64.const(676));				const exitX = Math.max(0, Math.min(width - 1, x));
profile1(Porffor.wasm.f64.const(677));				const exitY = Math.max(0, Math.min(height - 1, y));
profile1(Porffor.wasm.f64.const(678));				if(exitX != width - 1 && exitY != height - 1)
					throw profile1(Porffor.wasm.f64.const(679)),new Error("Exit position is not on the edge");
profile1(Porffor.wasm.f64.const(680));				exitPosition = exitY * width + exitX;
profile1(Porffor.wasm.f64.const(681));				continue;
			}
profile1(Porffor.wasm.f64.const(683));			if(ch == "#") {
profile1(Porffor.wasm.f64.const(684));				walls.push([x, y]);
profile1(Porffor.wasm.f64.const(685));				continue;
			}
profile1(Porffor.wasm.f64.const(687));			// if(Porffor == null && !/^[A-Z]+$/g.test(ch))
			// 	throw profile1(Porffor.wasm.f64.const(688)),new Error(`Unexpected character ${ch}`);
profile1(Porffor.wasm.f64.const(689));			if(!carCells.has(ch))
profile1(Porffor.wasm.f64.const(690));				carCells.set(ch, []);
profile1(Porffor.wasm.f64.const(691));			carCells.get(ch).push([x, y]);
		}
	}
profile1(Porffor.wasm.f64.const(694));	if(exitPosition == -1)
		throw profile1(Porffor.wasm.f64.const(695)),new Error("No exit 'K' found");
profile1(Porffor.wasm.f64.const(696));	if(carCells.size != carCount)
		throw profile1(Porffor.wasm.f64.const(697)),new Error(`Unexpected car count, got ${carCells.size} expected ${carCount}`);
profile1(Porffor.wasm.f64.const(698));	const cars = [];
profile1(Porffor.wasm.f64.const(699));	for(const [ch, cells] of carCells) {
profile1(Porffor.wasm.f64.const(700));		cells.sort(([x1, y1], [x2, y2]) => y1 - y2 || x1 - x2);
profile1(Porffor.wasm.f64.const(701));		const [x0, y0] = cells[0];
profile1(Porffor.wasm.f64.const(702));		let horizontal = true;
profile1(Porffor.wasm.f64.const(703));		let vertical = true;
profile1(Porffor.wasm.f64.const(704));		for(let i = 0; i < cells.length; i++) {
profile1(Porffor.wasm.f64.const(705));			const [x, y] = cells[i];
profile1(Porffor.wasm.f64.const(706));			if(y != y0) horizontal = false;
profile1(Porffor.wasm.f64.const(707));			if(x != x0) vertical = false;
		}
profile1(Porffor.wasm.f64.const(709));		const size = cells.length;
profile1(Porffor.wasm.f64.const(710));		if(!horizontal && !vertical)
			throw profile1(Porffor.wasm.f64.const(711)),new Error(`Car piece ${ch} has inconsistent shape`);
profile1(Porffor.wasm.f64.const(712));		cars.push({ symbol: ch, direction: horizontal ? HORIZONTAL : VERTICAL, positionX: x0, positionY: y0, size: size });
	}
profile1(Porffor.wasm.f64.const(714));	const primaryIndex = cars.findIndex(c => c.symbol == "P");
profile1(Porffor.wasm.f64.const(715));	if(primaryIndex == -1)
		throw profile1(Porffor.wasm.f64.const(716)),new Error("Cannot find primary car piece 'P'");
profile1(Porffor.wasm.f64.const(717));	if(primaryIndex > 0) {
profile1(Porffor.wasm.f64.const(718));		const temp = cars[0];
profile1(Porffor.wasm.f64.const(719));		cars[0] = cars[primaryIndex];
profile1(Porffor.wasm.f64.const(720));		cars[primaryIndex] = temp;
	}
profile1(Porffor.wasm.f64.const(722));	// Manually build carsWithIds
profile1(Porffor.wasm.f64.const(723));	const carsWithIds = [];
profile1(Porffor.wasm.f64.const(724));	for (let i = 0; i < cars.length; i++) {
profile1(Porffor.wasm.f64.const(725));		const c = cars[i];
profile1(Porffor.wasm.f64.const(726));		carsWithIds.push({ symbol: c.symbol, id: i, direction: c.direction, size: c.size });
	}
profile1(Porffor.wasm.f64.const(728));	// Manually build carPositions
profile1(Porffor.wasm.f64.const(729));	const carPositions = [];
profile1(Porffor.wasm.f64.const(730));	for (let i = 0; i < cars.length; i++) {
profile1(Porffor.wasm.f64.const(731));		carPositions.push(cars[i].positionY * width + cars[i].positionX);
	}
profile1(Porffor.wasm.f64.const(733));	// Manually build wall positions
profile1(Porffor.wasm.f64.const(734));	const wallPositions = [];
profile1(Porffor.wasm.f64.const(735));	for (let i = 0; i < walls.length; i++) {
profile1(Porffor.wasm.f64.const(736));		const [x, y] = walls[i];
profile1(Porffor.wasm.f64.const(737));		wallPositions.push(y * width + x);
	}
	return profile1(Porffor.wasm.f64.const(739)),{ width: width, height: height, cars: carsWithIds, carPositions: carPositions, walls: wallPositions, exitPosition: exitPosition };
}

profile1(Porffor.wasm.f64.const(742));export function Porffor_runSolver() {
profile1(Porffor.wasm.f64.const(743));	let arg = "";
profile1(Porffor.wasm.f64.const(744));	Porffor.readArgv(1, arg);
profile1(Porffor.wasm.f64.const(745));	const [heuristicStr, boardStr] = arg.split("\0");
profile1(Porffor.wasm.f64.const(746));	const heuristic = parseInt(heuristicStr);
profile1(Porffor.wasm.f64.const(747));	const board = parseBoardInput(boardStr);
profile1(Porffor.wasm.f64.const(748));	const heuristicCalculator = [ heuristicUCS, heuristicGBFSCarBlocked, heuristicAStarCarBlocked ][heuristic];
profile1(Porffor.wasm.f64.const(749));	const state = State.new_root( board.width,  board.height,  board.cars,  board.carPositions,   board.walls,  board.exitPosition );
profile1(Porffor.wasm.f64.const(750));	const solver = new Solver(heuristicCalculator, state);
profile1(Porffor.wasm.f64.const(751));	const start = performance.now();
profile1(Porffor.wasm.f64.const(752));	let currentTick = 0;
profile1(Porffor.wasm.f64.const(753));	while(solver.tick()) {
profile1(Porffor.wasm.f64.const(754));		currentTick++;
profile1(Porffor.wasm.f64.const(755));		if(currentTick % 500 == 0 && performance.now() - start >= 5000)
			throw profile1(Porffor.wasm.f64.const(756)),new Error("Timed out");
	}
profile1(Porffor.wasm.f64.const(758));	const end = performance.now();
profile1(Porffor.wasm.f64.const(759));	console.log(end - start);
	return profile1(Porffor.wasm.f64.const(760)),({ duration: end - start, board: board, visitedNodes: solver.getVisitedNodes(), solutionSteps: solver.getSolution() == null ? null : solver.getSolution().getStepDescription() });
}

profile1(Porffor.wasm.f64.const(763));// const board = {
profile1(Porffor.wasm.f64.const(764));// 	width: 6,
profile1(Porffor.wasm.f64.const(765));// 	height: 6,
profile1(Porffor.wasm.f64.const(766));// 	cars: [
profile1(Porffor.wasm.f64.const(767));// 		{ symbol: 'P', id: 0, direction: 0, size: 2 },
profile1(Porffor.wasm.f64.const(768));// 		{ symbol: 'B', id: 1, direction: 1, size: 2 },
profile1(Porffor.wasm.f64.const(769));// 		{ symbol: 'F', id: 2, direction: 1, size: 3 },
profile1(Porffor.wasm.f64.const(770));// 		{ symbol: 'C', id: 3, direction: 1, size: 2 },
profile1(Porffor.wasm.f64.const(771));// 		{ symbol: 'D', id: 4, direction: 1, size: 2 },
profile1(Porffor.wasm.f64.const(772));// 		{ symbol: 'G', id: 5, direction: 1, size: 3 },
profile1(Porffor.wasm.f64.const(773));// 		{ symbol: 'A', id: 6, direction: 0, size: 2 },
profile1(Porffor.wasm.f64.const(774));// 		{ symbol: 'H', id: 7, direction: 1, size: 2 },
profile1(Porffor.wasm.f64.const(775));// 		{ symbol: 'I', id: 8, direction: 0, size: 3 },
profile1(Porffor.wasm.f64.const(776));// 		{ symbol: 'J', id: 9, direction: 1, size: 2 },
profile1(Porffor.wasm.f64.const(777));// 		{ symbol: 'L', id: 10, direction: 0, size: 2 },
profile1(Porffor.wasm.f64.const(778));// 		{ symbol: 'M', id: 11, direction: 0, size: 2 }
profile1(Porffor.wasm.f64.const(779));// 	],
profile1(Porffor.wasm.f64.const(780));// 	carPositions: [
profile1(Porffor.wasm.f64.const(781));// 		13,  2,  5,  9, 10,
profile1(Porffor.wasm.f64.const(782));// 		12,  0, 19, 21, 26,
profile1(Porffor.wasm.f64.const(783));// 		30, 33
profile1(Porffor.wasm.f64.const(784));// 	],
profile1(Porffor.wasm.f64.const(785));// 	walls: [],
profile1(Porffor.wasm.f64.const(786));// 	exitPosition: 17
profile1(Porffor.wasm.f64.const(787));// };
profile1(Porffor.wasm.f64.const(788));// const state = State.new_root(
profile1(Porffor.wasm.f64.const(789));// 	board.width, 
profile1(Porffor.wasm.f64.const(790));// 	board.height, 
profile1(Porffor.wasm.f64.const(791));// 	board.cars, 
profile1(Porffor.wasm.f64.const(792));// 	board.carPositions, 
profile1(Porffor.wasm.f64.const(793));// 	board.walls, 
profile1(Porffor.wasm.f64.const(794));// 	board.exitPosition
profile1(Porffor.wasm.f64.const(795));// );
profile1(Porffor.wasm.f64.const(796));// const solver = new Solver(heuristicAStarCarBlocked, state);
profile1(Porffor.wasm.f64.const(797));// const start = performance.now();
profile1(Porffor.wasm.f64.const(798));// let currentTick = 0;
profile1(Porffor.wasm.f64.const(799));// while(solver.tick()) {
	
profile1(Porffor.wasm.f64.const(801));// 	currentTick++;
profile1(Porffor.wasm.f64.const(802));// 	if(currentTick % 500 == 0 && performance.now() - start >= 5000)
// 		throw profile1(Porffor.wasm.f64.const(803)),new Error("Timed out");
profile1(Porffor.wasm.f64.const(804));// }
profile1(Porffor.wasm.f64.const(805));// const end = performance.now();
profile1(Porffor.wasm.f64.const(806));// console.log({
profile1(Porffor.wasm.f64.const(807));// 	duration: end - start,
profile1(Porffor.wasm.f64.const(808));// 	board: board,
profile1(Porffor.wasm.f64.const(809));// 	visitedNodes: solver.getVisitedNodes(),
profile1(Porffor.wasm.f64.const(810));// 	// @Porffor
profile1(Porffor.wasm.f64.const(811));// 	solutionSteps: solver.getSolution() == null ? null : solver.getSolution().getStepDescription()
profile1(Porffor.wasm.f64.const(812));// });
