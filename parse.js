#!/usr/bin/env node

const Dmparser = require('./dmparser');
const SimpleFileAccessor = require('./SimpleFileAccessor');

const argv = process.argv;
//console.log(argv);

const parser = new Dmparser(new SimpleFileAccessor());
parser.parseUnit(argv[2]);
