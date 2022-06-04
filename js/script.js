const uiCanvas = document.getElementById("ui");
const fadeCanvas = document.getElementById("fade");
const mainCanvas = document.getElementById("main");

const side = Math.min(window.innerHeight, window.innerWidth) // * window.devicePixelRatio
mainCanvas.height = side
mainCanvas.width = side
fadeCanvas.height = side
fadeCanvas.width = side
uiCanvas.height = side
uiCanvas.width = side

const canvasWorker = new Worker("js/workers/canvas-worker.js", { type: "module" })
const processWorker = new Worker("js/workers/process-worker.js", { type: "module" });

const offscreenMain = mainCanvas.transferControlToOffscreen()
const offscreenFade = fadeCanvas.transferControlToOffscreen()
const offscreenUi = uiCanvas.transferControlToOffscreen()

requestAnimationFrame(() => {
	requestAnimationFrame(() => {
		canvasWorker.postMessage({
			side: side,
			main: offscreenMain,
			fade: offscreenFade,
			ui: offscreenUi,
		}, [offscreenMain, offscreenFade, offscreenUi]);
		processWorker.postMessage({
			side: side,
		})
	})
})


const channel = new MessageChannel();
canvasWorker.postMessage({port: channel.port1}, [channel.port1]);
processWorker.postMessage({port: channel.port2}, [channel.port2]);

mainCanvas.addEventListener('click', ({x, y}) => {
	processWorker.postMessage({
		type: 'mouse',
		mouse: {
			x: x * side / mainCanvas.offsetWidth,
			y: y * side / mainCanvas.offsetHeight,
		}
	})
})

let playing = true
document.addEventListener("visibilitychange", () => {
	playing = document.visibilityState === 'visible'
	const message = {
		type: 'toggle',
		status: playing
	}
	processWorker.postMessage(message)
	canvasWorker.postMessage(message)
})

window.addEventListener('keydown', (event) => {
	if(event.key === ' ') {
		event.preventDefault()
		playing = !playing
		const message = {
			type: 'toggle',
			status: playing
		}
		processWorker.postMessage(message)
		canvasWorker.postMessage(message)
	}
})
