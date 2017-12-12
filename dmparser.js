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

            include_func : (file, is_global, resumer, error) => {
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
                rejecter(err);
            },
        };

        const pp = cpp.create(settings);
        const contents = await this.fileAccessor.getFileContentsAsString(unitName);

        // ugh
        return await new Promise((resolve, reject) => {
            resolver = resolve;
            rejecter = reject;
            pp.run(contents);
        })
    }

    async parseUnit(unitName) {
        const source = await this.getPreprocessedUnit(unitName)
        this.fileAccessor.getFileContentsAsString(unitName);

        const lexer = new Lexer(unitName, source);

        for (;;) {
            const token = lexer.readToken();

            if (!token)
                break;
        }
    }
}

module.exports = Dmparser;
