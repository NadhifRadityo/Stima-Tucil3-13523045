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
