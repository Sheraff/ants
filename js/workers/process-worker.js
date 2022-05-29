import Ants from '../classes/Ants.js'
import Landmark from '../classes/Landmark.js'
import Pheromones from '../classes/Pheromones.js'
import { PHEROMONE_DURATION, PHEROMONE_PERIOD } from '../utils/constants.js'

/**
 * @typedef {Object} EntitySet
 * @property {(dx: number) => void} update
 * @property {(context: CanvasRenderingContext2D) => void} draw
 * @property {Object<string, SharedArrayBuffer>} buffers
 */

/** @type {Object<string, EntitySet>} */
const entities = {}
let paused = false
let port
{
	let side, started
	onmessage = async function({data}) {
		if (data.side) {
			side = data.side
		}
		if (data.port) {
			port = data.port
		}
		if (!started && side && port) {
			started = true
			start(side)
			port.postMessage(
				{
					type: 'buffers',
					entities: Object.fromEntries(Object.entries(entities).map(([type, entity]) => [type, entity.toData()]))
				}
			)
		}
		if (data.type === 'mouse') {
			const {x, y} = data.mouse
			entities.ants.tagClosest(x, y)
		}
		if (data.type === 'toggle') {
			paused = !data.status
			if(started) {
				if (paused) {
					pause()
				} else {
					play()
				}
			}
		}
	}
}

/**
 * @param {number} side 
 */
function start(side) {
	const count = 500
	entities.home = new Landmark(0, side/10, side/10)
	entities.food = new Landmark(1, side - side/10, side - side/10)
	entities.pheromones = new Pheromones(count * (PHEROMONE_DURATION + PHEROMONE_PERIOD))
	entities.ants = new Ants(count, side, entities.home)
	if (!paused) {
		play()
	}
}

const fpsArray = []
let loopTimeoutId
function loop() {
	let lastTime = performance.now()
	const frame = () => {
		loopTimeoutId = setTimeout(() => {
			const time = performance.now()
			frame()
			const dt = (time - lastTime) / 1000
			lastTime = time

			Object.values(entities).forEach((entity) => entity.update(dt, entities))

			// for (const entity of Object.values(entities)) {
			// 	const chunks = entity.update(dt)
			// 	let chunk
			// 	do {
			// 		if (performance.now() - time > 1000 / 60) {
			// 			await new Promise(resolve => setTimeout(resolve, 0))
			// 		}
			// 		chunk = chunks.next()
			// 	} while(!chunk.done)
			// }

			fpsArray.push(dt)
			if(fpsArray.length > 100) {
				fpsArray.shift()
			}
		}, 0)
	}
	frame()
}

let metricsTimeoutId
function metrics() {
	metricsTimeoutId = setTimeout(() => {
		const fps = fpsArray.length / fpsArray.reduce((a, b) => a + b)
		port.postMessage({
			type: 'fps',
			fps: Math.round(fps),
		})
		metrics()
	}, 1000)
}

function pause() {
	clearTimeout(loopTimeoutId)
	clearTimeout(metricsTimeoutId)
}

function play() {
	loop()
	metrics()
}