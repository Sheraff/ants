const canvas = document.querySelector("canvas");
const side = Math.min(window.innerHeight, window.innerWidth);
canvas.height = side * window.devicePixelRatio;
canvas.width = side * window.devicePixelRatio;

const canvasWorker = new Worker("js/canvas-worker.js", { type: "module" });
const offscreen = canvas.transferControlToOffscreen();
canvasWorker.postMessage({
	side: canvas.width,
	canvas: offscreen
}, [offscreen]);

const processWorker = new Worker("js/process-worker.js", { type: "module" });
processWorker.postMessage({
	side: canvas.width,
})

const channel = new MessageChannel();
canvasWorker.postMessage({port: channel.port1}, [channel.port1]);
processWorker.postMessage({port: channel.port2}, [channel.port2]);

canvas.addEventListener('click', ({x, y}) => {
	processWorker.postMessage({
		type: 'mouse',
		mouse: {
			x: x * canvas.width / canvas.offsetWidth,
			y: y * canvas.height / canvas.offsetHeight,
		}
	})
})

document.addEventListener("visibilitychange", (event) => {
	processWorker.postMessage({
		type: 'toggle',
		status: document.visibilityState === 'visible'
	})
})