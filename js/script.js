const canvas = document.querySelector("canvas");
const side = Math.min(window.innerHeight, window.innerWidth);
canvas.height = side * window.devicePixelRatio;
canvas.width = side * window.devicePixelRatio;
const worker = new Worker("js/canvas.js", { type: "module" });
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({side, canvas: offscreen}, [offscreen]);