const Lexer = require('./Lexer');
const Parser = require('./Parser');

const cpp = require('./dependencies/cpp.js/cpp');

class Dmparser {
    constructor(fileAccessor) {
        this.fileAccessor = fileAccessor;
    }

    // TODO: warn+error callbacks instead of displayErrors
    async getPreprocessedUnit(unitName, displayErrors) {
        displayErrors = (displayErrors === undefined ? true : displayErrors);

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
                    // Desirability debatable
                    if (displayErrors)
                        console.log(err);

                    resumer(null);
                })
            },

            completion_func : (data) => {
                resolver(data);
            },

            warn_func: (message) => {
                console.log(displayErrors);

                if (displayErrors)
                    console.log(message);
            },

            error_func: (err) => {
                rejecter(new Error(err));
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

    async lexUnit(unitName, displayErrors) {
        const source = await this.getPreprocessedUnit(unitName, displayErrors);
        //console.log('parseUnit source', source);

        const lexer = new Lexer(unitName, source, displayErrors);

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
        const lexed = await this.lexUnit(unitName, true);

        const parser = new Parser(lexed);
        const ast = parser.unit();

        parser.finalCheck();

        return ast;
    }
}

module.exports = Dmparser;
