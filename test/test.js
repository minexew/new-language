const AstSerializer = require("../utility/AstSerializer");
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
    it('should correctly lex Your First World and NOT coalesce newlines', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/Your First World.dme', {});
        //TestUtil.dumpJson('test/Your First World.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/Your First World.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly lex Your First World (main-a.dm)', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/main-a.dm', defaultOptions);
        //TestUtil.dumpJson('test/main-a.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-a.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly lex Your First World (main-b.dm)', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/main-b.dm', defaultOptions);
        //TestUtil.dumpJson('test/main-b.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-b.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly lex Your First World (main-c.dm)', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/main-c.dm', defaultOptions);
        //TestUtil.dumpJson('test/main-c.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-c.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly lex Your First World (main-d.dm)', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/main-d.dm', defaultOptions);
        //TestUtil.dumpJson('test/main-d.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-d.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly lex Your First World (main-e.dm)', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/Your First World/main-e.dm', defaultOptions);
        //TestUtil.dumpJson('test/main-e.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-e.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly parse Your First World (main-a.dm)', async function() {
        const parsed = await new Dmparser(sfa, diagPrint).parseUnit('test/Your First World/main-a.dm');
        //TestUtil.dumpJson('test/main-a.ast.json', AstSerializer.serializeUnit(parsed), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-a.ast.json'),
            AstSerializer.serializeUnit(parsed));
    });

    it('should correctly parse Your First World (main-b.dm)', async function() {
        const parsed = await new Dmparser(sfa, diagPrint).parseUnit('test/Your First World/main-b.dm');
        //TestUtil.dumpJson('test/main-b.ast.json', AstSerializer.serializeUnit(parsed), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-b.ast.json'),
            AstSerializer.serializeUnit(parsed));
    });

    it('should correctly parse Your First World (main-c.dm)', async function() {
        const parsed = await new Dmparser(sfa, diagPrint).parseUnit('test/Your First World/main-c.dm');
        //TestUtil.dumpJson('test/main-c.ast.json', AstSerializer.serializeUnit(parsed), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-c.ast.json'),
            AstSerializer.serializeUnit(parsed));
    });

    it('should correctly parse Your First World (main-d.dm)', async function() {
        const parsed = await new Dmparser(sfa, diagPrint).parseUnit('test/Your First World/main-d.dm');
        //TestUtil.dumpJson('test/main-d.ast.json', AstSerializer.serializeUnit(parsed), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-d.ast.json'),
            AstSerializer.serializeUnit(parsed));
    });

    it('should correctly parse Your First World (main-e.dm)', async function() {
        const parsed = await new Dmparser(sfa, diagPrint).parseUnit('test/Your First World/main-e.dm');
        //TestUtil.dumpJson('test/main-e.ast.json', AstSerializer.serializeUnit(parsed), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/main-e.ast.json'),
            AstSerializer.serializeUnit(parsed));
    });

    it('should parse Hello_World', async function() {
        return new Dmparser(sfa, diagPrint).parseUnit('test/Hello_World/Hello_World.dme');
    });

    it('should parse Say', async function() {
        return new Dmparser(sfa, diagPrint).parseUnit('test/Say/Say.dme');
    });

    it('should parse Turf', async function() {
        return new Dmparser(sfa, diagPrint).parseUnit('test/Turf/Turf.dme');
    });

    it('should parse Turf2', async function() {
        return new Dmparser(sfa, diagPrint).parseUnit('test/Turf2/Turf2.dme');
    });

    it('should parse Turf3', async function() {
        return new Dmparser(sfa, diagPrint).parseUnit('test/Turf3/Turf3.dme');
    });

    it('should parse Verb', async function() {
        return new Dmparser(sfa, diagPrint).parseUnit('test/Verbs/Verbs.dme');
    });

    it('should report correct location for diagnostics in included file', async function() {
        const diag = new DiagnosticsLogger();

        // TODO: use assert.throws
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

        // TODO: use assert.throws
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

    it('should report correct line for diagnostic after preprocessing', async function() {
        const diag = new DiagnosticsLogger();

        try {
            await new Dmparser(sfa, diag).lexUnit('test/correct-diagnostic-preprocessed/clown.dm');
            assert.fail();
        }
        catch (err) {
            assert.deepEqual(diag.events, [
                ['error', 'Unexpected character', {unit: 'test/correct-diagnostic-preprocessed/clown.dm', line: 16, column: 13}]
            ]);
        }
    });
});

describe('advanced', function() {
    it('should parse Step BYOND', async function() {
        return new Dmparser(sfa, diagPrint).parseUnit('test/Step BYOND/main.dm');
    });
});
