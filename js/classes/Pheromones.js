import circularMedian from "../utils/circular-data-median.js"
import { PHEROMONE_DURATION, CHUNK_SIZE } from "../utils/constants.js"
import {
	makeInt16SharedArrayBuffer,
	makeFloat32SharedArrayBuffer,
	makeUint8SharedArrayBuffer,
	makeUint16SharedArrayBuffer,
} from "../utils/sharedArrayBuffer.js"

const types = {
	0: {
		color: (shade) => `rgb(0, ${shade}, 0)`
	},
	1: {
		color: (shade) => `rgb(${shade}, 0, 0)`
	}
}

export default class Pheromones {
	constructor(count = 0, side = 0) {
		this.pool = new Array(count).fill().map((_, i) => i)
		this.chunks = []
		this.perceiveMemo = []
		this.count = count
		this.side = side
		this.buffers = {}
		const x = makeInt16SharedArrayBuffer(new Array(count).fill())
		this.buffers.x = x[0]
		this.x = x[1]
		const y = makeInt16SharedArrayBuffer(new Array(count).fill())
		this.buffers.y = y[0]
		this.y = y[1]
		const angle = makeFloat32SharedArrayBuffer(new Array(count).fill())
		this.buffers.angle = angle[0]
		this.angle = angle[1]
		const lifetime = makeFloat32SharedArrayBuffer(new Array(count).fill())
		this.buffers.lifetime = lifetime[0]
		this.lifetime = lifetime[1]
		const type = makeUint8SharedArrayBuffer(new Array(count).fill())
		this.buffers.type = type[0]
		this.type = type[1]
		const undrawn = makeUint16SharedArrayBuffer(new Array(count).fill())
		this.buffers.undrawn = undrawn[0]
		this.undrawn = undrawn[1]
		const undrawnIndex = makeUint8SharedArrayBuffer(new Array(1).fill(0))
		this.buffers.undrawnIndex = undrawnIndex[0]
		this.undrawnIndex = undrawnIndex[1]
	}

	add(x, y, type, angle) {
		if (this.pool.length) {
			const i = this.pool.pop()
			this.x[i] = Math.round(x)
			this.y[i] = Math.round(y)
			this.angle[i] = angle
			this.lifetime[i] = PHEROMONE_DURATION
			this.type[i] = type
			this.undrawn[this.undrawnIndex[0]] = i
			this.undrawnIndex[0]++
		} else {
			console.log('no more pheromones')
		}
	}

	update(dt, entities) {
		// lifetime
		for (let i = 0; i < this.count; i++) {
			const before = this.lifetime[i]
			if (this.lifetime[i] >= 0) {
				this.lifetime[i] -= dt
			}
			if (this.lifetime[i] <= 0 && before > 0) {
				this.lifetime[i] = undefined
				this.pool.push(i)
			}
		}

		// chunking
		this.chunks = []
		this.perceiveMemo = []
		for (let i = 0; i < this.count; i++) {
			if (this.lifetime[i] > 0) {
				const type = this.type[i]
				const x = Math.floor(this.x[i] / CHUNK_SIZE)
				const y = Math.floor(this.y[i] / CHUNK_SIZE)
				if(!entities.ants.chunks[type]) {
					continue
				}
				if(!this.chunks[type]) {
					this.chunks[type] = []
				}
				if(!entities.ants.chunks[type][x]) {
					continue
				}
				if (!this.chunks[type][x]) {
					this.chunks[type][x] = []
				}
				if(!entities.ants.chunks[type][x][y]) {
					continue
				}
				if (!this.chunks[type][x][y]) {
					this.chunks[type][x][y] = []
				}
				this.chunks[type][x][y].push(this.angle[i])
			}
		}

		// for (let type = 0; type < this.chunks.length; type++) {
		// 	const typeGrid = this.chunks[type]
		// 	if (!typeGrid) {
		// 		continue
		// 	}
		// 	for (let x = 0; x < typeGrid.length; x++) {
		// 		const xVector = typeGrid[x]
		// 		if (!xVector) {
		// 			continue
		// 		}
		// 		for (let y = 0; y < xVector.length; y++) {
		// 			const angles = xVector[y]
		// 			if (!angles) {
		// 				continue
		// 			}
		// 			const median = circularMedian(angles)
		// 			xVector[y] = (median + Math.PI) % (Math.PI * 2)
		// 		}
		// 	}
		// }
	}

	perceive(_x, _y, type) {
		if (!this.chunks[type]) {
			return null
		}
		const x = Math.floor(_x / CHUNK_SIZE)
		const y = Math.floor(_y / CHUNK_SIZE)
		if (this.perceiveMemo[type]?.[x]?.[y]) {
			return this.perceiveMemo[type][x][y]
		}
		const angles = []
		for (let i = x - 1; i <= x + 1; i++) {
			for (let j = y - 1; j <= y + 1; j++) {
				const cell = this.chunks[type][i]?.[j]
				if (cell && cell !== Infinity) {
					angles.push(...cell)
				}
			}
		}

		// skip median if possible
		let result
		if (!angles.length) {
			result = null
		} else if (angles.length === 1) {
			result = angles[0]
		} else {
			const median = circularMedian(angles)
			if (median === Infinity)
				result = null
			else
				result = median + Math.PI
		}

		// memo
		if(!this.perceiveMemo[type]) {
			this.perceiveMemo[type] = []
		}
		if(!this.perceiveMemo[type][x]) {
			this.perceiveMemo[type][x] = []
		}
		this.perceiveMemo[type][x][y] = result

		return result
	}

	cumul = 0
	staticUi = false
	draw({fade, ui}, dt) {
		if(!this.staticUi) {
			this.staticUi = true
			for (let i = CHUNK_SIZE; i < this.side; i += CHUNK_SIZE) {
				ui.strokeStyle = '#222'
				ui.beginPath()
				ui.moveTo(i, 0)
				ui.lineTo(i, this.side)
				ui.moveTo(0, i)
				ui.lineTo(this.side, i)
				ui.stroke()
			}
		}

		this.cumul += dt
		if (this.cumul > 0.1) {
			const int = Math.floor(this.cumul / 0.1)
			this.cumul -= int * 0.1
			fade.globalCompositeOperation = 'darken'
			fade.fillStyle = `rgba(0, 0, 0, ${0.25 / PHEROMONE_DURATION})`
			fade.beginPath()
			fade.rect(0, 0, this.side, this.side)
			for (let i = 0; i < int; i++) {
				fade.fill()
			}
			fade.globalCompositeOperation = 'source-over'
		}
		for (let j = 0; j < this.undrawnIndex[0]; j++) {
			const i = this.undrawn[j]
			if (this.lifetime[i]) {
				fade.fillStyle = types[this.type[i]].color(255)
				fade.beginPath()
				fade.rect(this.x[i], this.y[i], 2, 2)
				fade.fill()
			}
		}
		this.undrawnIndex[0] = 0
	}

	toData() {
		return {
			buffers: this.buffers,
			count: this.count,
			side: this.side,
		}
	}

	fromData(data) {
		this.buffers = data.buffers
		this.x = new Int16Array(data.buffers.x)
		this.y = new Int16Array(data.buffers.y)
		this.angle = new Float32Array(data.buffers.angle)
		this.lifetime = new Float32Array(data.buffers.lifetime)
		this.type = new Uint8Array(data.buffers.type)
		this.undrawn = new Uint16Array(data.buffers.undrawn)
		this.undrawnIndex = new Uint8Array(data.buffers.undrawnIndex)
		this.count = data.count
		this.side = data.side
	}
}