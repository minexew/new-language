const Token = require('./Token');

class AstExpression {
}

class AstIdent extends AstExpression {
}

class AstUnit {
    constructor(unitName) {
        this.unitName = unitName;
    }
}

class Parser {
    constructor(lexed) {
        this.lexed = lexed;
    }

    eof() {
        return this.lexed.tokens.length == 0;
    }

    finalCheck() {
        if (this.lexed.tokens.length > 0)
            throw new Error("Unparsed tokens remaining");
    }

    unit() {
        const node = new AstUnit(this.lexed.unitName);
    }
}

module.exports = Parser;
