#!/usr/bin/env node

const Dmparser = require('./dmparser');
const SimpleFileAccessor = require('./SimpleFileAccessor');

async function asyncMain() {
	const parser = new Dmparser(new SimpleFileAccessor());

	const argv = process.argv;
	//console.log(argv);

	await parser.parseUnit(argv[2]);
}

asyncMain().catch(err => {
	console.log(err);
	process.exit(-1);
});
