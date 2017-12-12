const Lexer = require('./Lexer');


class Dmparser {
    constructor(fileAccessor) {
        this.fileAccessor = fileAccessor;
    }

    parseUnit(unitName) {
        const source = this.fileAccessor.getFileContentsAsString(unitName);

        const lexer = new Lexer(unitName, source);

        for (;;) {
            const token = lexer.readToken();

            if (!token)
                break;
        }
    }
}

module.exports = Dmparser;
