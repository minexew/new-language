const Dmparser = require('../dmparser');
const SimpleFileAccessor = require('../SimpleFileAccessor');

describe('basics', function() {
	it('should parse this file', function() {
		return new Dmparser(new SimpleFileAccessor()).parseUnit('Your First World/main-a.dm');
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
})
