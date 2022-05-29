import { PHEROMONE_DURATION } from "../utils/constants.js"
import {
	makeInt16SharedArrayBuffer,
	makeFloat32SharedArrayBuffer,
	makeUint8SharedArrayBuffer,
} from "../utils/sharedArrayBuffer.js"

const types = {
	0: {
		color: (shade) => `rgb(0, ${shade}, ${shade})`
	},
	1: {
		color: (shade) => `rgb(${shade}, 0, ${shade})`
	}
}

export default class Pheromones {
	constructor(count = 0) {
		this.pool = new Array(count).fill().map((_, i) => i)
		this.count = count
		this.buffers = {}
		const x = makeInt16SharedArrayBuffer(new Array(count).fill())
		this.buffers.x = x[0]
		this.x = x[1]
		const y = makeInt16SharedArrayBuffer(new Array(count).fill())
		this.buffers.y = y[0]
		this.y = y[1]
		const lifetime = makeFloat32SharedArrayBuffer(new Array(count).fill())
		this.buffers.lifetime = lifetime[0]
		this.lifetime = lifetime[1]
		const type = makeUint8SharedArrayBuffer(new Array(count).fill())
		this.buffers.type = type[0]
		this.type = type[1]
	}

	add(x, y, type = 0) {
		if (this.pool.length) {
			const i = this.pool.pop()
			this.x[i] = Math.round(x)
			this.y[i] = Math.round(y)
			this.lifetime[i] = PHEROMONE_DURATION
			this.type[i] = type
		} else {
			console.log('no more pheromones')
		}
	}

	update(dt) {
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
	}

	toData() {
		return {
			buffers: this.buffers,
			count: this.count,
			nextIndex: this.nextIndex,
		}
	}

	fromData(data) {
		this.buffers = data.buffers
		this.x = new Int16Array(data.buffers.x)
		this.y = new Int16Array(data.buffers.y)
		this.lifetime = new Float32Array(data.buffers.lifetime)
		this.type = new Uint8Array(data.buffers.type)
		this.count = data.count
		this.nextIndex = data.nextIndex
	}
}