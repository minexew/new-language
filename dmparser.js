const Lexer = require('./dmparser/Lexer');
const Parser = require('./dmparser/Parser');

const cpp = require('./dependencies/cpp.js/cpp');

class Dmparser {
    constructor(fileAccessor, diagnosticsSink) {
        this.fileAccessor = fileAccessor;
        this.diagnosticsSink = diagnosticsSink;
    }

    async getPreprocessedUnit(unitName) {
        let resolver = null;
        let rejecter = null;

        const settings = {
            signal_char : '#',

            include_func : (file, is_global, resumer, error, included_from) => {
                // Ignore maps for now
                if (file.endsWith('.dmm')) {
                    resumer(' ');
                    return;
                }

                //console.log(included_from)

                this.fileAccessor.getFileContentsAsString(file).then(contents => {
                    resumer(contents);
                }).catch(err => {
                    // This records the underlying reason as well, which might (rarely) be non-trivial
                    // FIXME: shouldn't we re-use passed-in `error`?
                    this.diagnosticsSink.errorGlobal(err.message);

                    resumer(null);
                })
            },

            completion_func : (data) => {
                resolver(data);
            },

            warn_func: (message) => {
                this.diagnosticsSink.warnGlobal(message);
            },

            error_func: (message) => {
                this.diagnosticsSink.errorGlobal(message);

                rejecter(new Error(message));
            },
        };

        const pp = cpp.create(settings);
        const contents = await this.fileAccessor.getFileContentsAsString(unitName);

        // ugh
        return await new Promise((resolve, reject) => {
            resolver = resolve;
            rejecter = reject;
            pp.run(contents, unitName);
        })
    }

    async lexUnit(unitName, options) {
        const source = await this.getPreprocessedUnit(unitName);
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

    async parseUnit(unitName) {
        const lexed = await this.lexUnit(unitName);

        const parser = new Parser(lexed, this.fileAccessor, this.diagnosticsSink);
        const ast = parser.unit();

        parser.finalCheck();

        return ast;
    }
}

module.exports = Dmparser;
