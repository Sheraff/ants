{
	let context
	onmessage = async function({data}) {
		if (data.canvas) {
			context = data.canvas.getContext("2d");
		}
	};
}