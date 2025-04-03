import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}

export function flyAndScale(node, { duration = 300, delay = 0 }) {
  return {
    delay,
    duration,
    css: (t) => `
      transform: scale(${t}) translateY(${(1 - t) * 10}px);
      opacity: ${t};
    `,
  };
}
