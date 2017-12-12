const Lexer = require('./Lexer');

const cpp = require('./dependencies/cpp.js/cpp');

const path = require('path');

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

                // TODO: will this work if 'file' is absolute? (not that it ever is)
                console.log(included_from)
                const relative_path = path.join(path.dirname(included_from), file);

                this.fileAccessor.getFileContentsAsString(relative_path).then(contents => {
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
                rejecter(err);
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

    async parseUnit(unitName) {
        const source = await this.getPreprocessedUnit(unitName);
        //console.log('parseUnit source', source);

        const lexer = new Lexer(unitName, source);

        for (;;) {
            const token = lexer.readToken();

            if (!token)
                break;
        }
    }
}

module.exports = Dmparser;
