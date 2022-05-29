import Ants from './Ants.js'

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
	const ants = new Ants(1500, side)
	entities.ants = ants
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

			Object.values(entities).forEach((entity) => entity.update(dt))

			fpsArray.push(dt)
			if(fpsArray.length > 100) {
				fpsArray.shift()
			}
		}, 16.6)
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