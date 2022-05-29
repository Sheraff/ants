import Ants from './Ants.js'

{
	let context, side
	onmessage = async function({data}) {
		if (data.canvas) {
			context = data.canvas.getContext("2d");
		}
		if (data.side) {
			side = data.side
		}
		if (context && side) {
			start(context)
		}
	};
}

/**
 * @typedef {Object} EntitySet
 * @property {(dx: number) => void} update
 * @property {(context: CanvasRenderingContext2D) => void} draw
 */

/**
 * @param {CanvasRenderingContext2D} context 
 */
function start(context) {
	const ants = new Ants(500, context.canvas.width)
	loop(context, [ants])
}

/**
 * @param {CanvasRenderingContext2D} context 
 * @param {EntitySet[]} entities
 */
function loop(context, entities) {
	let lastTime
	context.font = '50px monospace'
	const fpsBuffer = []
	let droppedFrames = 0
	const frame = () => {
		requestAnimationFrame((time) => {
			frame()
			if(!lastTime) {
				lastTime = time
				return
			}
			const dt = (time - lastTime) / 1000
			lastTime = time

			entities.forEach(entity => entity.update(dt))
			context.clearRect(0, 0, context.canvas.width, context.canvas.height)
			context.strokeStyle = "darkgray"
			context.rect(0, 0, context.canvas.width, context.canvas.height)
			context.stroke()
			entities.forEach(entity => entity.draw(context))

			// FPS display
			const fps = Math.round(1 / dt)
			fpsBuffer.push(fps)
			const avg = Math.round(average(fpsBuffer))
			if(fpsBuffer.length > 50) {
				fpsBuffer.shift()
			}
			if (fps < avg) {
				const dropped = Math.round((avg / fps) - 1)
				// console.log({fps, avg, dropped})
				droppedFrames += dropped
			}
			context.fillStyle = "white"
			context.fillText(`${avg}fps, ${droppedFrames} dropped frames`, 20, context.canvas.height - 20)
		})
	}
	frame()
}

function average(array) {
	return array.reduce((a, b) => a + b) / array.length
}