class AstUnit {
    constructor(unitName) {
        this.unitName = unitName;
    }
}

class Parser {
    constructor(lexed) {
        this.lexed = lexed;
    }

    finalCheck() {
        if (this.lexed.tokens.length > 0)
            throw new Error("Unparsed tokens left");
    }

    unit() {
        const node = new AstUnit(this.lexed.unitName);
    }
}

module.exports = Parser;
