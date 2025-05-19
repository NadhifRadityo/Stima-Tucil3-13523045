import React from "react";
import CarBlock from "./CarBlock.mjs";
import { html } from "./shared.mjs";

const CELL_SIZE = 64;

export const BoardView = ({ ref, board, carPositions, animationDuration = 0.5 }) => {
	const { width, height, cars, walls, exitPosition } = board;
	return html`
		<div
			ref=${ref}
			className="relative bg-gray-200 border border-gray-700 mx-auto"
			style=${{
				width: width * CELL_SIZE,
				height: height * CELL_SIZE,
				display: "grid",
				gridTemplateColumns: `repeat(${width}, ${CELL_SIZE}px)`,
				gridTemplateRows: `repeat(${height}, ${CELL_SIZE}px)`
			}}
		>
			${[...Array(width * height)].map((_, i) => html`
				<div key=${i} className="border border-gray-300" />
			`)}
			<img
				src="/public/assets/exit.png"
				className="absolute"
				style=${{
					top: Math.floor(exitPosition / width) * CELL_SIZE,
					left: (exitPosition % width) * CELL_SIZE,
					width: CELL_SIZE,
					height: CELL_SIZE,
					zIndex: 5
				}}
				alt="exit"
			/>
			<div
				className="absolute"
				style=${{
					boxShadow: "0px 0px 20px 5px rgba(255, 0, 0, 0.9)",
					top: Math.floor(exitPosition / width) * CELL_SIZE,
					left: (exitPosition % width) * CELL_SIZE,
					width: CELL_SIZE,
					height: CELL_SIZE,
					zIndex: 110
				}}
				alt="exit"
			/>
			${walls.map((pos, i) => html`
				<img
					key=${i}
					src="/public/assets/wall.png"
					className="absolute"
					style=${{
						top: Math.floor(pos / width) * CELL_SIZE,
						left: (pos % width) * CELL_SIZE,
						width: CELL_SIZE,
						height: CELL_SIZE,
						zIndex: 1
					}}
					alt="wall"
				/>
			`)}
			${cars.map((car, idx) => {
				const pos = carPositions[idx];
				const x = pos % width;
				const y = Math.floor(pos / width);
				return html`
					<${CarBlock}
						key=${idx}
						id=${car.id}
						symbol=${car.symbol}
						x=${x}
						y=${y}
						size=${car.size}
						direction=${car.direction}
						cellSize=${CELL_SIZE}
						animationDuration=${animationDuration}
					/>
				`;
			})}
		</div>
	`;
};
export default BoardView;
