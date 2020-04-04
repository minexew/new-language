const Lexer = require('./dmparser/Lexer');
const Parser = require('./dmparser/Parser');
const SemanticCompiler = require('./dmparser/SemanticCompiler');

class Dmparser {
    constructor(fileAccessor, diagnosticsSink) {
        this.fileAccessor = fileAccessor;
        this.diagnosticsSink = diagnosticsSink;
    }

    async lexUnit(unitName, options) {
        const source = await this.fileAccessor.getFileContentsAsString(unitName);
        //console.log('parseUnit source', source);

        const lexer = new Lexer(unitName, source, this.diagnosticsSink, options);

        // TODO: is it ok/preferable to return array vs returning a generator?
        const tokens = [];

        for (;;) {
            const token = lexer.readToken();

            if (!token)
                break;

            tokens.push(token);
        }

        return {'unitName': unitName, 'tokens': tokens};
    }

    async parseUnit(unitName, lexerOptions) {
        const lexed = await this.lexUnit(unitName, lexerOptions || {coalesceNewlines: true});

        const parser = new Parser(lexed, this.fileAccessor, this.diagnosticsSink);
        const ast = parser.unit();

        parser.finalCheck();

        return ast;
    }

    async compileUnit(unitName) {
        const ast = this.parseUnit(unitName);

        const sema = new SemanticCompiler();
        const program = sema.compileUnit(ast);
    }
}

module.exports = Dmparser;
