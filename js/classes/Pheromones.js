import {
	makeInt16SharedArrayBuffer,
	makeFloat32SharedArrayBuffer,
} from "../utils/sharedArrayBuffer.js"

const DURATION = 5

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
	}

	add(x, y) {
		if (this.pool.length) {
			const i = this.pool.pop()
			this.x[i] = Math.round(x)
			this.y[i] = Math.round(y)
			this.lifetime[i] = DURATION
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
				this.x[i] = undefined
				this.y[i] = undefined
				this.lifetime[i] = undefined
				this.pool.push(i)
			}
		}
	}

	draw(context) {
		const multiplier = 255 / DURATION
		for (let i = 0; i < this.count; i++) {
			if(this.lifetime[i]) {
				const shade = Math.round(this.lifetime[i] * multiplier)
				context.fillStyle = `rgb(${shade}, 0, ${shade})`
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
		this.count = data.count
		this.nextIndex = data.nextIndex
	}
}