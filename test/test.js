const AstSerializer = require("../src/utility/AstSerializer");
const DiagnosticsDevNull = require('../src/utility/DiagnosticsDevNull');
const DiagnosticsLogger = require('../src/utility/DiagnosticsLogger');
const DiagnosticsPrinter = require('../src/utility/DiagnosticsPrinter');
const Dmparser = require('../src/dmparser');
const SimpleFileAccessor = require('../src/utility/SimpleFileAccessor');
const TestUtil = require('../src/utility/TestUtil');
const TokenSerializer = require('../src/utility/TokenSerializer');

const assert = require('assert');

const sfa = new SimpleFileAccessor();
const diagPrint = new DiagnosticsPrinter(sfa);
//const diagNull = new DiagnosticsDevNull();

const defaultOptions = {coalesceNewlines: true};

describe('basics', function() {
    it('should correctly lex hello-world', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/hello-world.newlang', defaultOptions);
        //TestUtil.dumpJson('test/hello-world.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/hello-world.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly parse hello-world', async function() {
        const parsed = await new Dmparser(sfa, diagPrint).parseUnit('test/hello-world.newlang');
        //TestUtil.dumpJson('test/hello-world.ast.json', AstSerializer.serializeUnit(parsed), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/hello-world.ast.json'),
            AstSerializer.serializeUnit(parsed));
    });

    it('should produce identical AST whether or not newline coalescing is used', async function() {
        const parsed1 = await new Dmparser(sfa, diagPrint).parseUnit('test/hello-world.newlang', {coalesceNewlines: false});
        const parsed2 = await new Dmparser(sfa, diagPrint).parseUnit('test/hello-world.newlang', defaultOptions);

        assert.deepEqual(AstSerializer.serializeUnit(parsed1), AstSerializer.serializeUnit(parsed2));
    });
});

describe('real-world programs', function() {
    it('should correctly lex Lsh', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/lsh.newlang', defaultOptions);
        // TestUtil.dumpJson('test/lsh.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/lsh.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should correctly parse Lsh', async function() {
        const parsed = await new Dmparser(sfa, diagPrint).parseUnit('test/lsh.newlang');
        // TestUtil.dumpJson('test/lsh.ast.json', AstSerializer.serializeUnit(parsed), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/lsh.ast.json'),
            AstSerializer.serializeUnit(parsed));
    });

    it('should lex make-snailnet', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/make-snailnet.newlang', defaultOptions);
    });
});
