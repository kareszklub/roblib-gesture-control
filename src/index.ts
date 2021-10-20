import { init, move } from '../node_modules/@kareszklub/roblib-client/out/lib.js';

//@ts-expect-error
await init(io, 'http://192.168.0.1:5000/io');
console.log('Initing...');

// settings
let model: any, webcam: any, labelContainer, maxPredictions;

type Command = 'forward' | 'left' | 'right' | 'back' | 'buzz' | 'idle';
type Prediciton = { className: Command; probability: number; };

let lastPredicts: Prediciton[][] = [];
const PREDICTS_LENGTH = 5;
// const REFRESH_RATE = 10;
const SPEED = 20;

// Load the image model and setup the webcam
document
	.getElementById('start-button')
	?.addEventListener('click', async function() {
		const url = './', modelURL = url + 'model.json', metadataURL = url + 'metadata.json';

		// load the model and metadata
		// Refer to tmImage.loadFromFiles() in the API to support files from a file picker
		// or files from your local hard drive

		//@ts-expect-error shitty, I know
		model = await tmImage.load(modelURL, metadataURL);
		maxPredictions = model.getTotalClasses();

		// Convenience function to setup a webcam
		const flip = true; // whether to flip the webcam
		//@ts-expect-error shitty, I know
		webcam = new tmImage.Webcam(212, 212, flip); // width, height, flip
		await webcam.setup(); // request access to the webcam
		webcam.play();
		window.requestAnimationFrame(loop);

		// append elements to the DOM
		document.getElementById('webcam-container')?.appendChild(webcam.canvas);
		labelContainer = document.getElementById('label-container');
		for (let i = 0; i < maxPredictions; i++)
			// and class labels
			labelContainer?.appendChild(document.createElement('div'));
	});

function cyclePredicts(newest: Prediciton[]) {
	if (lastPredicts.length < PREDICTS_LENGTH) {
		lastPredicts.unshift(newest);
		return;
	}

	lastPredicts.pop();
	lastPredicts.unshift(newest);
}

// get command key to execute
function getAvgPred(): Command {
	let results: { [ p in Command ]: number; } = { forward: 0, left: 0, right: 0, back: 0, buzz: 0, idle: 0 };

	for (let i = 0; i < lastPredicts.length; i++)
		for (const { className, probability } of lastPredicts[i])
			results[className] += probability;

	let maxKey: Command = 'idle';
	for (const [key, value] of Object.entries(results))
		if (value > results[maxKey])
			maxKey = key as Command;

	return maxKey;
}

// emit command to flask server
function execCommand(command: Command) {

	switch (command) {

		case 'forward':
			move({ left: SPEED, right: SPEED });
			break;

		case 'back':
			move({ left: -SPEED * 0.75, right: -SPEED * 0.75 });
			break;

		case 'right':
			move({ left: SPEED, right: -SPEED });
			break;

		case 'left':
			move({ left: -SPEED, right: SPEED });
			break;

		case 'idle':
			// TODO check wtf this does
			//@ts-expect-error dunno, weird code my friend

			// don't spam with unnecessary requests
			if (lastPredicts[lastPredicts.length - 1] != 'idle')
				move();
			break;
	}
}

async function handleWebcamData(predicitons: Prediciton[]) {

	cyclePredicts(predicitons);
	const command = getAvgPred();
	execCommand(command);
}

// run the webcam image through the image model
async function predict() {
	handleWebcamData(await model.predict(webcam.canvas));
}

let run = true;
async function loop() {
	webcam.update(); // update the webcam frame
	if (run)
		await predict();
	window.requestAnimationFrame(loop);

	// await sleep(REFRESH_RATE);
}