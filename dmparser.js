const Lexer = require('./Lexer');

const cpp = require('./dependencies/cpp.js/cpp');

class Dmparser {
    constructor(fileAccessor) {
        this.fileAccessor = fileAccessor;
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
                    console.log(err);
                    resumer(null);
                })
            },

            completion_func : (data) => {
                resolver(data);
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

    async lexUnit(unitName) {
        const source = await this.getPreprocessedUnit(unitName);
        //console.log('parseUnit source', source);

        const lexer = new Lexer(unitName, source);

        // TODO: is it ok/preferable to return array vs returning a generator?
        const tokens = [];

        for (;;) {
            const token = lexer.readToken();

            if (!token)
                break;

            tokens.push(token);
        }

        return tokens;
    }
}

module.exports = Dmparser;
