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

// describe('basics', function() {
//     it('should correctly lex hello-world', async function() {
//         const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/hello-world.newlang', defaultOptions);
//         //TestUtil.dumpJson('test/hello-world.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
//         assert.deepEqual(await TestUtil.loadJsonFromFile('test/hello-world.lex.json'),
//                 TokenSerializer.serializeList(lexed.tokens));
//     });

//     it('should correctly parse hello-world', async function() {
//         const parsed = await new Dmparser(sfa, diagPrint).parseUnit('test/hello-world.newlang');
//         //TestUtil.dumpJson('test/hello-world.ast.json', AstSerializer.serializeUnit(parsed), true);
//         assert.deepEqual(await TestUtil.loadJsonFromFile('test/hello-world.ast.json'),
//             AstSerializer.serializeUnit(parsed));
//     });

//     it('should produce identical AST whether or not newline coalescing is used', async function() {
//         const parsed1 = await new Dmparser(sfa, diagPrint).parseUnit('test/hello-world.newlang', {coalesceNewlines: false});
//         const parsed2 = await new Dmparser(sfa, diagPrint).parseUnit('test/hello-world.newlang', defaultOptions);

//         assert.deepEqual(AstSerializer.serializeUnit(parsed1), AstSerializer.serializeUnit(parsed2));
//     });
// });

describe('real-world programs', function() {
    it('should correctly lex Lsh', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/lsh.newlang', defaultOptions);
        // TestUtil.dumpJson('test/lsh.lex.json', TokenSerializer.serializeList(lexed.tokens), true);
        assert.deepEqual(await TestUtil.loadJsonFromFile('test/lsh.lex.json'),
                TokenSerializer.serializeList(lexed.tokens));
    });

    it('should lex make-snailnet', async function() {
        const lexed = await new Dmparser(sfa, diagPrint).lexUnit('test/make-snailnet.newlang', defaultOptions);
    });
});
