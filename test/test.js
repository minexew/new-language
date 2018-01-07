const DiagnosticsDevNull = require('../utility/DiagnosticsDevNull');
const DiagnosticsLogger = require('../utility/DiagnosticsLogger');
const DiagnosticsPrinter = require('../utility/DiagnosticsPrinter');
const Dmparser = require('../dmparser');
const SimpleFileAccessor = require('../utility/SimpleFileAccessor');
const TestUtil = require('../utility/TestUtil');
const TokenSerializer = require('../utility/TokenSerializer');

const assert = require('assert');

const sfa = new SimpleFileAccessor();
const diagPrint = new DiagnosticsPrinter(sfa);
//const diagNull = new DiagnosticsDevNull();

const defaultOptions = {coalesceNewlines: true};

describe('basics', function() {
    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/Your First World.dme', {});
        //TestUtil.dumpJson('test/Your First World.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/Your First World.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/main-a.dm', defaultOptions);
        //TestUtil.dumpJson('test/main-a.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-a.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/main-b.dm', defaultOptions);
        //TestUtil.dumpJson('test/main-b.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-b.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/main-c.dm', defaultOptions);
        //TestUtil.dumpJson('test/main-c.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-c.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/main-d.dm', defaultOptions);
        //TestUtil.dumpJson('test/main-d.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-d.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/main-e.dm', defaultOptions);
        //TestUtil.dumpJson('test/main-e.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-e.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should parse Your First World', async function() {
        return new Dmparser(sfa, diagPrint).parseUnit('test/Your First World/main-a.dm');
    });

    it('should report correct location for diagnostics in included file', async function() {
        const diag = new DiagnosticsLogger();

        try {
            const promise = new Dmparser(sfa, diag).lexUnit('test/correct-diagnostic-include/a.dm');
            await promise;
            assert.fail();
        }
        catch (err) {
            assert.deepEqual(diag.events, [
                    ['error', 'Unexpected character', {unit: 'test/correct-diagnostic-include/b.dm', line: 2, column: 1}]
            ]);
        }
    });

    it('should report correct line for preprocessor diagnostic', async function() {
        const diag = new DiagnosticsLogger();

        try {
            const promise = new Dmparser(sfa, diag).lexUnit('test/_compile_options.dm');
            await promise;
            assert.fail();
        }
        catch (err) {
            assert.deepEqual(diag.events, [
                    ['errorGlobal', '(cpp) error # test/_compile_options.dm:76: #error: Your version of BYOND is too out-of-date to compile this project. Go to byond.com/download and update.']
            ]);
        }
    });
});
