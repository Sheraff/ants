import circularMedian from "../utils/circular-data-median.js"
import { PHEROMONE_DURATION, CHUNK_SIZE } from "../utils/constants.js"
import {
	makeInt16SharedArrayBuffer,
	makeFloat32SharedArrayBuffer,
	makeUint8SharedArrayBuffer,
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
	}

	add(x, y, type, angle) {
		if (this.pool.length) {
			const i = this.pool.pop()
			this.x[i] = Math.round(x)
			this.y[i] = Math.round(y)
			this.angle[i] = angle
			this.lifetime[i] = PHEROMONE_DURATION
			this.type[i] = type
		} else {
			console.log('no more pheromones')
		}
	}

	log(){
		console.log(this.chunks)
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

		for (let type = 0; type < this.chunks.length; type++) {
			const typeGrid = this.chunks[type]
			if (!typeGrid) {
				continue
			}
			for (let x = 0; x < typeGrid.length; x++) {
				const xVector = typeGrid[x]
				if (!xVector) {
					continue
				}
				for (let y = 0; y < xVector.length; y++) {
					const angles = xVector[y]
					if (!angles) {
						continue
					}
					const median = circularMedian(angles)
					xVector[y] = (median + Math.PI) % (Math.PI * 2)
				}
			}
		}
	}

	perceive(_x, _y, type) {
		const x = Math.floor(_x / CHUNK_SIZE)
		const y = Math.floor(_y / CHUNK_SIZE)
		if(!this.chunks[type]) {
			return null
		}
		const xVector = this.chunks[type][x]
		if (!xVector) {
			return null
		}
		const cell = xVector[y]
		if (!cell || cell === Infinity) {
			return null
		}
		return cell
	}

	draw(context) {
		const multiplier = 255 / PHEROMONE_DURATION
		for (let i = 0; i < this.count; i++) {
			if(this.lifetime[i]) {
				const shade = Math.round(this.lifetime[i] * multiplier)
				context.fillStyle = types[this.type[i]].color(shade)
				context.beginPath()
				context.rect(this.x[i], this.y[i], 1, 1)
				context.fill()
			}
		}
		for (let i = CHUNK_SIZE; i < this.side; i += CHUNK_SIZE) {
			context.strokeStyle = '#222'
			context.beginPath()
			context.moveTo(i, 0)
			context.lineTo(i, this.side)
			context.moveTo(0, i)
			context.lineTo(this.side, i)
			context.stroke()
		}
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
		this.count = data.count
		this.side = data.side
	}
}