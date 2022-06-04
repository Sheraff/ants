import { CHUNK_SIZE, HOME_RADIUS, PHEROMONE_PERIOD } from "../utils/constants.js";
import { randomFloat, randomInt } from "../utils/random.js";
import {
	makeFloat32SharedArrayBuffer,
	makeUint8SharedArrayBuffer,
} from "../utils/sharedArrayBuffer.js"

const LINEAR_SPEED = 70;
const ANGULAR_SPEED = Math.PI;
const ANGULAR_ACCELERATION = Math.PI
const SIZE = 2
const RAY_CAST_COUNT = 10

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
		this.chunks = []
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
			if (this.hasFood[i] && entities.home.isInside(this.x[i], this.y[i])) {
				this.hasFood[i] = 0
				entities.home.collected[0]++
				this.angularSpeed[i] = 0
				this.angle[i] += Math.PI
			} else if (!this.hasFood[i] && entities.food.isInside(this.x[i], this.y[i])) {
				this.hasFood[i] = 1
				this.angularSpeed[i] = 0
				this.angle[i] += Math.PI
			}
		}
		const rayCastForFood = new Set(['free', 'food'])
		const rayCastForHome = new Set(['free', 'home'])
		for (let i = 0; i < this.count; i++) {
			const {free, home, food} = rayCast(this.x[i], this.y[i], this.angle[i], this.side, entities, this.hasFood[i] ? rayCastForHome : rayCastForFood)
			let angularSpeed = this.angularSpeed[i]
			if (free === null) {
				angularSpeed += randomInt(0, 1) ? ANGULAR_ACCELERATION : -ANGULAR_ACCELERATION
			} else if (food !== null || home !== null) {
				angularSpeed = (food || home) * RAY_ANGLE_INTERVAL
			} else {
				const angle = entities.pheromones.perceive(this.x[i], this.y[i], this.hasFood[i] ? 0 : 1)
				if(angle !== null) {
					const diff = angle - this.angle[i]
					const mod = (diff + Math.PI) % (Math.PI * 2) - Math.PI
					angularSpeed += mod * dt
				} else if (free !== 0) {
					angularSpeed += dt * ANGULAR_ACCELERATION * free
				}
				else if (Math.abs(angularSpeed) < 0.03) {
					angularSpeed += randomFloat(-ANGULAR_ACCELERATION * 0.2, ANGULAR_ACCELERATION * 0.2)
				} else {
					angularSpeed -= dt * ANGULAR_ACCELERATION * Math.sign(angularSpeed)
				}
			}
			this.angularSpeed[i] = Math.sign(angularSpeed) * Math.min(Math.abs(angularSpeed), ANGULAR_SPEED)
		}
		for (let i = 0; i < this.count; i++) {
			this.angle[i] += this.angularSpeed[i] * dt
			this.angle[i] %= Math.PI * 2
		}
		for (let i = 0; i < this.count; i++) {
			const lastPheromone = this.lastPheromone[i] + dt
			if (lastPheromone > PHEROMONE_PERIOD + Math.random() * PHEROMONE_PERIOD * 0.5) {
				this.lastPheromone[i] = 0
				entities.pheromones.add(this.x[i], this.y[i], this.hasFood[i], this.angle[i])
			} else {
				this.lastPheromone[i] = lastPheromone
			}
		}
		this.chunks = []
		for (let i = 0; i < this.count; i++) {
			const type = this.hasFood[i] ? 0 : 1
			const x = Math.floor(this.x[i] / CHUNK_SIZE)
			const y = Math.floor(this.y[i] / CHUNK_SIZE)
			if(!this.chunks[type]){
				this.chunks[type] = []
			}
			if(!this.chunks[type][x]) {
				this.chunks[type][x] = []
			}
			if(!this.chunks[type][x][y]) {
				this.chunks[type][x][y] = true
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

	/** @param {Object<string, CanvasRenderingContext2D>} */
	draw({main}) {
		main.fillStyle = "limegreen"
		main.strokeStyle = "limegreen"
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
					const rayX = x + Math.cos(rayAngle) * LINEAR_SPEED
					const rayY = y + Math.sin(rayAngle) * LINEAR_SPEED
					main.strokeStyle = "orange"
					main.beginPath()
					main.moveTo(x, y)
					main.lineTo(rayX, rayY)
					main.stroke()
				}
			}
			// chunks
			if(closest) {
				const x1 = Math.floor(x / CHUNK_SIZE)
				const x2 = x - x1 * CHUNK_SIZE < CHUNK_SIZE / 2 ? x1 - 1 : x1 + 1
				const y1 = Math.floor(y / CHUNK_SIZE)
				const y2 = y - y1 * CHUNK_SIZE < CHUNK_SIZE / 2 ? y1 - 1 : y1 + 1
				for (let x of [x1, x2]) {
					for (let y of [y1, y2]) {
						main.strokeStyle = "red"
						main.strokeRect(x * CHUNK_SIZE, y * CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE)
					}
				}
			}
			// angularSpeed
			if(closest) {
				const angularSpeed = angle + this.angularSpeed[i]
				main.strokeStyle = "red"
				main.beginPath()
				main.moveTo(x, y)
				main.lineTo(x + Math.cos(angularSpeed) * LINEAR_SPEED, y + Math.sin(angularSpeed) * LINEAR_SPEED)
				main.stroke()
			}

			// body
			main.fillStyle = closest ? "red" : "white"
			main.beginPath()
			main.rect(Math.floor(x - SIZE / 2), Math.floor(y - SIZE / 2), SIZE, SIZE)
			main.fill()

			// front
			if(closest) {
				const rayX = x + Math.cos(angle) * LINEAR_SPEED / 2
				const rayY = y + Math.sin(angle) * LINEAR_SPEED / 2
				main.strokeStyle = "red"
				main.beginPath()
				main.moveTo(x, y)
				main.lineTo(rayX, rayY)
				main.stroke()
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
function rayCast(x, y, angle, max, entities, searchFor = new Set(['free'])) {
	const results = {
		free: null,
		home: null,
		food: null,
	}
	let remainingToFind = searchFor.size
	for (let rayIndex = 0; rayIndex <= RAY_CAST_COUNT && remainingToFind > 0; rayIndex++) {
		const odd = rayIndex & 1
		const evenCeil = (rayIndex + 1) & ~1
		const multiplier = evenCeil / 2 * (odd ? -1 : 1)
		const rayAngle = angle + multiplier * RAY_ANGLE_INTERVAL
		const rayX = x + Math.cos(rayAngle) * LINEAR_SPEED
		const rayY = y + Math.sin(rayAngle) * LINEAR_SPEED
		let free, home, food
		if (results.free === null && searchFor.has('free')) {
			if (rayX < max - SIZE && rayX > 0 + SIZE && rayY < max - SIZE && rayY > 0 + SIZE) {
				results.free = multiplier
				free = true
				remainingToFind--
			}
		}
		if (!free && results.home === null && searchFor.has('home')) {
			if (entities.home.isInside(rayX, rayY)) {
				results.home = multiplier
				home = true
				remainingToFind--
			}
		}
		if (!free && !home && results.food === null && searchFor.has('food')) {
			if (entities.food.isInside(rayX, rayY)) {
				results.food = multiplier
				food = true
				remainingToFind--
			}
		}
	}
	return results
}