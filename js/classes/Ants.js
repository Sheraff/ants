import { HOME_RADIUS, PHEROMONE_PERIOD } from "../utils/constants.js";
import { randomFloat, randomInt } from "../utils/random.js";
import {
	makeFloat32SharedArrayBuffer,
	makeUint8SharedArrayBuffer,
} from "../utils/sharedArrayBuffer.js"

const LINEAR_SPEED = 70;
const ANGULAR_SPEED = Math.PI / 2;
const ANGULAR_ACCELERATION = Math.PI / 4
const SIZE = 2
const RAY_CAST_COUNT = 6

export default class Ants {
	/**
	 * @param {number} count
	 * @param {number} side
	 */
	constructor(count = 0, side = 0, home = { x: 0, y: 0 }) {
		this.count = count
		this.side = side
		this.buffers = {}
		const x = makeFloat32SharedArrayBuffer(new Array(count).fill().map(() => randomFloat(home.x - HOME_RADIUS / 2, home.x + HOME_RADIUS / 2)))
		this.buffers.x = x[0]
		this.x = x[1]
		const y = makeFloat32SharedArrayBuffer(new Array(count).fill().map(() => randomFloat(home.y - HOME_RADIUS / 2, home.y + HOME_RADIUS / 2)))
		this.buffers.y = y[0]
		this.y = y[1]
		const angle = makeFloat32SharedArrayBuffer(new Array(count).fill().map(() => randomFloat(0, Math.PI * 2)))
		this.buffers.angle = angle[0]
		this.angle = angle[1]
		const angularSpeed = makeFloat32SharedArrayBuffer(new Array(count).fill().map(() => 0))
		this.buffers.angularSpeed = angularSpeed[0]
		this.angularSpeed = angularSpeed[1]
		const hasFood = makeUint8SharedArrayBuffer(new Array(count).fill().map(() => 0))
		this.buffers.hasFood = hasFood[0]
		this.hasFood = hasFood[1]
		const lastPheromone = makeFloat32SharedArrayBuffer(new Array(count).fill().map(() => 0))
		this.buffers.lastPheromone = lastPheromone[0]
		this.lastPheromone = lastPheromone[1]
		const closest = makeUint8SharedArrayBuffer(new Array(count).fill().map(() => 0))
		this.buffers.closest = closest[0]
		this.closest = closest[1]
		this.closest[0] = 1
	}

	/** @param {number} dt */
	update(dt, entities) {
		for (let i = 0; i < this.count; i++) {
			const dx = LINEAR_SPEED * Math.cos(this.angle[i])
			const newX = this.x[i] + dx * dt
			this.x[i] = Math.min(Math.max(newX, 0 + SIZE), this.side - SIZE)
		}
		for (let i = 0; i < this.count; i++) {
			const dy = LINEAR_SPEED * Math.sin(this.angle[i])
			const newY = this.y[i] + dy * dt
			this.y[i] = Math.min(Math.max(newY, 0 + SIZE), this.side - SIZE)
		}
		for (let i = 0; i < this.count; i++) {
			const angleStrength = rayCast(this.x[i], this.y[i], this.angle[i], this.side)
			this.angularSpeed[i] += dt * ANGULAR_ACCELERATION * angleStrength
			if (angleStrength === 0 && this.angularSpeed[i]) {
				this.angularSpeed[i] -= dt * ANGULAR_ACCELERATION * Math.sign(this.angularSpeed[i])
			}
			const absAngularSpeed = Math.abs(this.angularSpeed[i])
			if (angleStrength === 0 && absAngularSpeed < 0.01) {
				this.angularSpeed[i] = Math.random() * ANGULAR_ACCELERATION * 2 - ANGULAR_ACCELERATION
			} else {
				this.angularSpeed[i] = Math.sign(this.angularSpeed[i]) * Math.min(absAngularSpeed, ANGULAR_SPEED)
			}
		}
		for (let i = 0; i < this.count; i++) {
			this.angle[i] += this.angularSpeed[i] * dt
			this.angle[i] %= Math.PI * 2
		}
		for (let i = 0; i < this.count; i++) {
			if (entities.home.isInside(this.x[i], this.y[i])) {
				this.hasFood[i] = 0
			} else if (entities.food.isInside(this.x[i], this.y[i])) {
				this.hasFood[i] = 1
			}
		}
		for (let i = 0; i < this.count; i++) {
			const lastPheromone = this.lastPheromone[i]
			this.lastPheromone[i] = lastPheromone + dt
			if (lastPheromone > PHEROMONE_PERIOD + Math.random() * PHEROMONE_PERIOD * 0.5) {
				this.lastPheromone[i] = 0
				entities.pheromones.add(this.x[i], this.y[i], this.hasFood[i])
			}
		}
	}

	tagClosest(x, y) {
		let closestIndex = 0
		let closestDistance = Infinity
		for (let i = 0; i < this.count; i++) {
			const distance = Math.hypot(this.x[i] - x, this.y[i] - y)
			if (distance < closestDistance) {
				closestDistance = distance
				closestIndex = i
			}
		}
		for (let i = 0; i < this.count; i++) {
			this.closest[i] = 0
		}
		this.closest[closestIndex] = 1
		return closestIndex
	}

	/** @param {CanvasRenderingContext2D} context */
	draw(context) {
		context.fillStyle = "limegreen"
		context.strokeStyle = "limegreen"
		for (let i = 0; i < this.count; i++) {
			const x = Math.round(this.x[i])
			const y = Math.round(this.y[i])
			const angle = this.angle[i]
			const closest = this.closest[i]
			// rays
			if(closest) {
				for (let rayIndex = 0; rayIndex <= RAY_CAST_COUNT; rayIndex++) {
					const odd = rayIndex & 1
					const evenCeil = (rayIndex + 1) & ~1
					const multiplier = evenCeil / 2 * (odd * 2 - 1)
					const rayAngle = angle + multiplier * RAY_ANGLE_INTERVAL
					const rayX = x + Math.cos(rayAngle) * LINEAR_SPEED * 2
					const rayY = y + Math.sin(rayAngle) * LINEAR_SPEED * 2
					context.strokeStyle = rayIndex === 0 
						? "purple"
						: odd ? "orange" : "blue"
					context.beginPath()
					context.moveTo(x, y)
					context.lineTo(rayX, rayY)
					context.stroke()
				}
			}

			// body
			context.fillStyle = closest ? "red" : "white"
			context.beginPath()
			context.rect(Math.floor(x - SIZE / 2), Math.floor(y - SIZE / 2), SIZE, SIZE)
			context.fill()

			// front
			if(closest) {
				const rayX = x + Math.cos(angle) * LINEAR_SPEED / 2
				const rayY = y + Math.sin(angle) * LINEAR_SPEED / 2
				context.strokeStyle = "red"
				context.beginPath()
				context.moveTo(x, y)
				context.lineTo(rayX, rayY)
				context.stroke()
			}
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
		this.x = new Float32Array(data.buffers.x)
		this.y = new Float32Array(data.buffers.y)
		this.angle = new Float32Array(data.buffers.angle)
		this.angularSpeed = new Float32Array(data.buffers.angularSpeed)
		this.hasFood = new Uint8Array(data.buffers.hasFood)
		this.lastPheromone = new Float32Array(data.buffers.lastPheromone)
		this.closest = new Uint8Array(data.buffers.closest)
		this.count = data.count
		this.side = data.side
	}
}

const RAY_ANGLE_INTERVAL = Math.PI / (RAY_CAST_COUNT + 1)
function rayCast(x, y, angle, max) {
	for (let rayIndex = 0; rayIndex <= RAY_CAST_COUNT; rayIndex++) {
		const odd = rayIndex & 1
		const evenCeil = (rayIndex + 1) & ~1
		const multiplier = evenCeil / 2 * (odd ? -1 : 1)
		const rayAngle = angle + multiplier * RAY_ANGLE_INTERVAL
		const rayX = x + Math.cos(rayAngle) * LINEAR_SPEED * 2
		const rayY = y + Math.sin(rayAngle) * LINEAR_SPEED * 2
		if (rayX < max - SIZE && rayX > 0 + SIZE && rayY < max - SIZE && rayY > 0 + SIZE) {
			return multiplier
		}
	}
}