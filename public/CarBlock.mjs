import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { html, HORIZONTAL } from "./shared.mjs";

const sfc32 = (a, b, c, d) => {
	return () => {
		a |= 0; b |= 0; c |= 0; d |= 0;
		let t = (a + b | 0) + d | 0;
		d = d + 1 | 0;
		a = b ^ b >>> 9;
		b = c + (c << 3) | 0;
		c = (c << 21 | c >>> 11);
		c = c + t | 0;
		return (t >>> 0) / 4294967296;
	};
};
const cyrb128 = str => {
	let h1 = 1779033703, h2 = 3144134277,
		h3 = 1013904242, h4 = 2773480762;
	for(let i = 0, k; i < str.length; i++) {
		k = str.charCodeAt(i);
		h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
		h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
		h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
		h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
	}
	h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
	h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
	h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
	h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
	h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
	return [h1>>>0, h2>>>0, h3>>>0, h4>>>0];
};
const seedToHue = seed => {
	const seedgen = cyrb128(seed);
	const getRand = sfc32(seedgen[0], seedgen[1], seedgen[2], seedgen[3]);
	return Math.floor(getRand() * 360);
};

export const CarBlock = ({ id, symbol, x, y, size, direction, cellSize, animationDuration = 0.5 }) => {
	const ref = useRef();
	const firstRenderRef = useRef(true);
	const animationDurationRef = useRef(null);
	animationDurationRef.current = animationDuration;
	const carImage = `/public/assets/car-${size}.png`;
	useEffect(() => {
		if(ref.current == null)
			return;
		if(firstRenderRef.current) {
			firstRenderRef.current = false;
			gsap.set(ref.current, {
				top: y * cellSize,
				left: x * cellSize,
			});
			return;
		}
		gsap.to(ref.current, {
			top: y * cellSize,
			left: x * cellSize,
			duration: animationDurationRef.current,
			ease: "power2.out"
		});
	}, [x, y]);
	return html`
		<div
			ref=${ref}
			className="absolute top-0 left-0 rounded-md grid grid-cols-1 grid-rows-1"
			style=${{
				width: direction == HORIZONTAL ? cellSize * size : cellSize,
				height: direction == HORIZONTAL ? cellSize : cellSize * size,
				zIndex: id == 0 ? 100 : 10,
				boxShadow: id == 0 ? "0px 0px 20px 5px rgba(13, 255, 0, 0.9)" : null
			}}
		>
			<img
				src=${carImage}
				alt=${`car-${id}`}
				className="row-start-1 row-end-2 col-start-1 col-end-2"
				style=${{
					width: cellSize,
					height: cellSize * size,
					transformOrigin: `${cellSize / 2}px ${cellSize / 2}px`,
					rotate: `${direction == HORIZONTAL ? -90 : 0}deg`,
					filter: `hue-rotate(${seedToHue(`car-${id}-${size}`)}deg)`
				}}
			/>
			<div className="z-0 flex items-center justify-center row-start-1 row-end-2 col-start-1 col-end-2">
				<span className="font-bold text-4xl text-white">${symbol}</span>
			</div>
		</div>
	`;
};
export default CarBlock;
