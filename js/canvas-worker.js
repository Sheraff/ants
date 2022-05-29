import Ants from './Ants.js'

/**
 * @typedef {Object} TransferableEntitySet
 * @property {Object<string, SharedArrayBuffer>} buffers
 */

/**
 * @typedef {Object} EntitySet
 * @property {(dx: number) => void} update
 * @property {(context: CanvasRenderingContext2D) => void} draw
 */

/** @type {Object<string, EntitySet>} */
const entities = {}
let context, side

{
	let port, started
	onmessage = async function({data}) {
		if (data.canvas) {
			context = data.canvas.getContext("2d", { alpha: false })
		}
		if (data.side) {
			side = data.side
		}
		if (data.port) {
			port = data.port
			listen(port)
		}
		if (!started && context && side && port) {
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
	const ants = new Ants()
	entities.ants = ants
	loop()
}

let fpsArray = []
function loop() {
	let lastTime = 0
	let lastMetricsPrint = lastTime
	let drawFps = 0
	const frame = () => {
		requestAnimationFrame((time) => {
			// draw
			context.clearRect(0, 0, side, side)
			context.strokeStyle = "darkgray"
			context.rect(0, 0, side, side)
			context.stroke()
			Object.values(entities).forEach((entity) => {
				entity.draw(context)
			})

			// metrics
			const dt = (time - lastTime) / 1000
			lastTime = time
			fpsArray.push(dt)
			if(time - lastMetricsPrint > 100) {
				lastMetricsPrint = time
				drawFps = Math.round(fpsArray.length / fpsArray.reduce((a, b) => a + b))
				if(fpsArray.length > 100) {
					fpsArray = fpsArray.slice(Math.max(0, fpsArray.length - 100))
				}
			}
			context.fillStyle = 'white'
			context.font = '50px monospace'
			context.fillText(`process: ${processFps} fps - draw: ${drawFps}`, 10, 50)

			// next
			frame()
		})
	}
	frame()
}
