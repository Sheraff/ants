function makeTypedSharedArrayBuffer(Type, ratio, array){
	const length = ratio * array.length;
	const buffer = new SharedArrayBuffer(length);
	const view = new Type(buffer);
	for (let i = 0; i < array.length; i++) {
		view[i] = array[i];
	}
	return [buffer, view];
}

/**
 * @template TypedArray
 * @callback TypedSharedBuffer
 * @param {Array<number>} array 
 * @returns {[SharedArrayBuffer, TypedArray]}
 */

export const makeFloat32SharedArrayBuffer = /** @type {TypedSharedBuffer<Float32Array>} */(makeTypedSharedArrayBuffer.bind(null, Float32Array, 4))
export const makeUint8SharedArrayBuffer = /** @type {TypedSharedBuffer<Uint8Array>} */(makeTypedSharedArrayBuffer.bind(null, Uint8Array, 1))
export const makeUint16SharedArrayBuffer = /** @type {TypedSharedBuffer<Uint16Array>} */(makeTypedSharedArrayBuffer.bind(null, Uint16Array, 2))
export const makeUint32SharedArrayBuffer = /** @type {TypedSharedBuffer<Uint32Array>} */(makeTypedSharedArrayBuffer.bind(null, Uint32Array, 4))
export const makeInt16SharedArrayBuffer = /** @type {TypedSharedBuffer<Int16Array>} */(makeTypedSharedArrayBuffer.bind(null, Int16Array, 2))