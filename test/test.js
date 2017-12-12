const Dmparser = require('../dmparser');
const SimpleFileAccessor = require('../SimpleFileAccessor');

const assert = require('assert');

describe('basics', function() {
	it('should parse this file', function() {
		return new Dmparser(new SimpleFileAccessor()).parseUnit('Your First World/Your First World.dme');
	})

	it('should parse this file', function() {
		return new Dmparser(new SimpleFileAccessor()).parseUnit('Your First World/main-b.dm');
	})

	it('should parse this file', function() {
		return new Dmparser(new SimpleFileAccessor()).parseUnit('Your First World/main-c.dm');
	})

	it('should parse this file', function() {
		return new Dmparser(new SimpleFileAccessor()).parseUnit('Your First World/main-d.dm');
	})

	it('should parse this file', function() {
		return new Dmparser(new SimpleFileAccessor()).parseUnit('Your First World/main-e.dm');
	})

	it('should report correct location for diagnostics in included file', async function() {
		try {
			const promise = new Dmparser(new SimpleFileAccessor()).parseUnit('test/correct-diagnostic-include/a.dm');
			await promise;
			assert.fail();
		}
		catch (err) {
			assert.equal(err.message, 'Parse error at test/correct-diagnostic-include/b.dm:2:1: Unexpected character')
		}
	})

	it('preprocessor should report correct line for diagnostic', async function() {
		try {
			const promise = new Dmparser(new SimpleFileAccessor()).parseUnit('test/_compile_options.dm');
			await promise;
			assert.fail();
		}
		catch (err) {
			assert.equal(err.message, '(cpp) error # test/_compile_options.dm:76: #error: Your version of BYOND is too out-of-date to compile this project. Go to byond.com/download and update.')
		}
	})
})
