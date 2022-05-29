function makeTypedSharedArrayBuffer(Type, ratio, array){
	const length = ratio * array.length;
	const buffer = new SharedArrayBuffer(length);
	const view = new Type(buffer);
	for (let i = 0; i < array.length; i++) {
		view[i] = array[i];
	}
	return [buffer, view];
}

export const makeFloat32SharedArrayBuffer = makeTypedSharedArrayBuffer.bind(null, Float32Array, 4)
export const makeUint8SharedArrayBuffer = makeTypedSharedArrayBuffer.bind(null, Uint8Array, 1)
export const makeInt16SharedArrayBuffer = makeTypedSharedArrayBuffer.bind(null, Int16Array, 2)