#!/usr/bin/env node

const DiagnosticsPrinter = require('./utility/DiagnosticsPrinter');
const Dmparser = require('./dmparser');
const SimpleFileAccessor = require('./utility/SimpleFileAccessor');

async function asyncMain() {
	const sfa = new SimpleFileAccessor();
	const parser = new Dmparser(sfa, new DiagnosticsPrinter(sfa));

	const argv = process.argv;
	//console.log(argv);

	await parser.parseUnit(argv[2]);
}

asyncMain().catch(err => {
	console.log(err);
	process.exit(-1);
});
