#!/usr/bin/env node

const Dmparser = require('./dmparser');
const fs = require('fs');

const argv = process.argv;
//console.log(argv);

class SimpleFileAccessor {
	getFileContentsAsString(path) {
		console.log('[SimpleFileAccessor]', 'read', path);
		const file = fs.readFileSync(path);
		//console.log(file);
		return file.toString();
	}
}

const parser = new Dmparser(new SimpleFileAccessor());
parser.parseUnit(argv[2]);
