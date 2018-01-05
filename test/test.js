const DiagnosticsDevNull = require('../DiagnosticsDevNull');
const DiagnosticsLogger = require('../DiagnosticsLogger');
const DiagnosticsPrinter = require('../DiagnosticsPrinter');
const Dmparser = require('../dmparser');
const SimpleFileAccessor = require('../SimpleFileAccessor');
const TestUtil = require('../TestUtil');
const TokenSerializer = require('../TokenSerializer');

const assert = require('assert');

const sfa = new SimpleFileAccessor();
const diagPrint = new DiagnosticsPrinter(sfa);
const diagNull = new DiagnosticsDevNull();

describe('basics', function() {
    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('Your First World/Your First World.dme');
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/Your First World.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    })

    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('Your First World/main-a.dm');
        //TestUtil.dumpJson('test/main-a.lex.json', TokenSerializer.serializeList(tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-a.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    })

    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('Your First World/main-b.dm');
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-b.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    })

    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('Your First World/main-c.dm');
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-c.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    })

    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('Your First World/main-d.dm');
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-d.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    })

    it('should correctly lex Your First World', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('Your First World/main-e.dm');
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-e.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    })

    it('should parse Your First World', async function() {
        return new Dmparser(sfa, diagPrint).parseUnit('Your First World/main-a.dm');
    })

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
    })

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
    })
})
