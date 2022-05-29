const LINEAR_SPEED = 70;
const ANGULAR_SPEED = Math.PI / 2;
const ANGULAR_ACCELERATION = Math.PI / 4
const SIZE = 10
const RAY_CAST_COUNT = 8

function randomInt(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default class Ants {
	/**
	 * @param {number} count
	 * @param {number} side
	 */
	constructor(count, side) {
		this.count = count
		this.side = side
		this.x = new Float32Array(new Array(count).fill().map(() => randomInt(0, side)))
		this.y = new Float32Array(new Array(count).fill().map(() => randomInt(0, side)))
		this.angle = new Float32Array(new Array(count).fill().map(() => Math.random() * Math.PI * 2))
		this.angularSpeed = new Float32Array(new Array(count).fill().map(() => 0))
	}

	/** @param {number} dt */
	update(dt) {
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
	}

	/** @param {CanvasRenderingContext2D} context */
	draw(context) {
		context.fillStyle = "limegreen"
		for (let i = 0; i < this.count; i++) {
			// rays
			// for (let rayIndex = 1; rayIndex <= RAY_CAST_COUNT; rayIndex++) {
			// 	const odd = rayIndex & 1
			// 	const evenCeil = (rayIndex + 1) & ~1
			// 	const multiplier = evenCeil / 2 * (odd * 2 - 1)
			// 	const angle = this.angle[i] + multiplier * Math.PI / (RAY_CAST_COUNT + 1)
			// 	const rayX = this.x[i] + Math.cos(angle) * LINEAR_SPEED * 2
			// 	const rayY = this.y[i] + Math.sin(angle) * LINEAR_SPEED * 2
			// 	context.strokeStyle = odd ? "pink" : "white"
			// 	context.beginPath()
			// 	context.moveTo(this.x[i], this.y[i])
			// 	context.lineTo(rayX, rayY)
			// 	context.stroke()
			// }

			// body
			context.beginPath()
			context.arc(this.x[i], this.y[i], SIZE, 0, Math.PI * 2)
			context.fill()

			// front
			// const rayX = this.x[i] + Math.cos(this.angle[i]) * LINEAR_SPEED / 2
			// const rayY = this.y[i] + Math.sin(this.angle[i]) * LINEAR_SPEED / 2
			// context.strokeStyle = "red"
			// context.beginPath()
			// context.moveTo(this.x[i], this.y[i])
			// context.lineTo(rayX, rayY)
			// context.stroke()
		}
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