import { HOME_RADIUS } from "../utils/constants.js"
import {
	makeUint32SharedArrayBuffer,
} from "../utils/sharedArrayBuffer.js"

const types = {
	0: {
		name: "home",
		color: "rgb(0, 50, 0)",
	},
	1: {
		name: "food",
		color: "rgb(0, 50, 50)",
	},
}

export default class Landmark {
	constructor(type = "", x = 0, y = 0) {
		this.buffers = {}
		this.x = x
		this.y = y
		this.type = type
		const collected = makeUint32SharedArrayBuffer(new Array(1).fill().map(() => 0))
		this.buffers.collected = collected[0]
		this.collected = collected[1]
	}

	update() {}

	draw(context) {
		context.fillStyle = types[this.type].color
		context.beginPath()
		context.arc(this.x, this.y, HOME_RADIUS, 0, Math.PI * 2)
		context.fill()
	}

	isInside(x, y) {
		return Math.hypot(this.x - x, this.y - y) <= HOME_RADIUS
	}

	toData() {
		return {
			buffers: this.buffers,
			x: this.x,
			y: this.y,
			type: this.type,
		}
	}

	fromData(data) {
		this.buffers = data.buffers
		this.x = data.x
		this.y = data.y
		this.type = data.type
		this.collected = new Uint32Array(this.buffers.collected)
	}
}