import Ants from '../classes/Ants.js'
import Landmark from '../classes/Landmark.js'
import Pheromones from '../classes/Pheromones.js'

/**
 * @typedef {Object} TransferableEntitySet
 * @property {Object<string, SharedArrayBuffer>} buffers
 */

/**
 * @typedef {Object} EntitySet
 * @property {(dx: number) => void} update
 * @property {(main: CanvasRenderingContext2D) => void} draw
 */

/** @type {Object<string, EntitySet>} */
const entities = {}
let main, fade, ui, side

{
	let port, started
	onmessage = async function({data}) {
		if (data.fade) {
			fade = data.fade.getContext("2d", {alpha: false})
		}
		if (data.ui) {
			ui = data.ui.getContext("2d")
		}
		if (data.main) {
			main = data.main.getContext("2d")
		}
		if (data.side) {
			side = data.side
		}
		if (data.port) {
			port = data.port
			listen(port)
		}
		if (!started && main && fade && ui && side && port) {
			started = true
			start()
		}
	}
}

let processFps = 0
function listen(port) {
	port.onmessage = ({data}) => {
		if (data.type === 'buffers') {
			Object.entries(data.entities).forEach(([type, entity]) => {
				entities[type].fromData(entity)
			})
		}
		if (data.type === 'fps') {
			processFps = data.fps
		}
	}
}

function start() {
	entities.home = new Landmark(0)
	entities.food = new Landmark(1)
	entities.pheromones = new Pheromones()
	entities.ants = new Ants()
	loop()
}

let fpsArray = []
function loop() {
	let lastTime = 0
	let lastMetricsPrint = lastTime
	let drawFps = 0

	ui.strokeStyle = "darkgray"
	ui.rect(0, 0, side, side)
	ui.stroke()

	const frame = () => {
		requestAnimationFrame((time) => {
			if (!lastTime) {
				lastTime = time
				return frame()
			}
			// timing
			const dt = (time - lastTime) / 1000
			lastTime = time

			// draw
			main.clearRect(0, 0, side, side)
			Object.values(entities).forEach((entity) => {
				entity.draw({main, fade, ui}, dt)
			})

			// metrics
			fpsArray.push(dt)
			if(time - lastMetricsPrint > 100) {
				lastMetricsPrint = time
				drawFps = Math.round(fpsArray.length / fpsArray.reduce((a, b) => a + b))
				if(fpsArray.length > 100) {
					fpsArray = fpsArray.slice(Math.max(0, fpsArray.length - 100))
				}
			}
			main.fillStyle = 'white'
			main.font = '25px monospace'
			main.fillText(`proc.: ${processFps} fps - draw: ${drawFps} fps - food: ${entities.home.collected[0]}`, 10, 50)

			// next
			frame()
		})
	}
	frame()
}
