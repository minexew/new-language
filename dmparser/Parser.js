const ast = require('./ast');
const SourcePoint = require('./SourcePoint');
const Token = require('./Token');

class Parser {
    constructor(lexed, fileAccessor, diagnosticsSink) {
        this.lexed = lexed;
        this.fileAccessor = fileAccessor;
        this.diag = diagnosticsSink;

        this.pos = 0;
    }

    consumeNewlines() {
        while (this.consumeToken(Token.TOKEN_NEWLINE)) {
        }
    }

    consumeToken(type) {
        if (this.pos >= this.lexed.tokens.length)
            return null;

        const head = this.lexed.tokens[this.pos];
        
        //console.log(this.lexed.tokens[0].type, 'vs', type);

        if (head.type !== type)
            return null;

        //console.log('Consume', this.lexed.tokens[0]);

        if (head.span)
            this.lastGoodSpan = head.span;

        this.pos++;
        return head;
    }

    expectToken(type, errorMessage) {
        if (!this.consumeToken(type))
            this.syntaxError(errorMessage ? errorMessage : "Unexpected token");
    }

    finalCheck() {
        if (this.pos < this.lexed.tokens.length)
            this.syntaxError("Unparsed tokens remaining");
    }

    restoreContext(context) {
        this.pos = context;
    }

    saveContext() {
        // Save parsing context for look-ahead
        return this.pos;
    }

    syntaxError(what, pointOrSpan) {
        if (!pointOrSpan && this.pos < this.lexed.tokens.length) {
            const token = this.lexed.tokens[this.pos];
            pointOrSpan = token.span;      // might still be null
        }

        if (!pointOrSpan) {
            pointOrSpan = new SourcePoint(this.lastGoodSpan[1].unit, this.lastGoodSpan[1].line, this.lastGoodSpan[1].column + 1);
        }

        this.diag.error(what, pointOrSpan);
        throw new Error(what);
    }

    // parsing rules

    absolutePath() {
        const slash = this.consumeToken(Token.TOKEN_SLASH, null);

        if (!slash)
            return null;

        const namespace = new ast.RootNamespace(slash.span);

        const fullPath = this.relativePath(namespace);

        if (!fullPath)
            this.syntaxError("Expected path after '/'");

        return fullPath;
    }

    class_() {
        const path = this.relativePath();
        //console.log('decl path', path);

        if (!path)
            return null;

        const class_ = new ast.Class(path);

        this.consumeNewlines();
        if (this.consumeToken(Token.TOKEN_BLOCK_BEGIN)) {
            this.classBody(class_);

            this.consumeNewlines();
            this.expectToken(Token.TOKEN_BLOCK_END, "Expected variable, method or class declaration");
        }

        return class_;
    }

    classBody(class_) {
        for (;;) {
            this.consumeNewlines();

            // Variable declaration
            const variableDeclaration = this.classVariableDeclaration();

            if (variableDeclaration) {
                const [name, expression, span] = variableDeclaration;
                class_.pushVariableDeclaration(name, expression, span);
                continue;
            }

            // Method declaration
            // TODO

            // Subclass declaration
            const classDeclaration = this.class_();

            if (classDeclaration) {
                class_.pushClassDeclaration(classDeclaration);
                continue;
            }

            break;
        }
    }

    classVariableDeclaration() {
        const saved = this.saveContext();

        const name = this.identifier();

        if (!name) {
            this.restoreContext(saved);
            return null;
        }

        const assignment = this.consumeToken(Token.TOKEN_EQUAL, null);

        if (!assignment) {
            this.restoreContext(saved);
            return null;
        }

        const expression = this.expression();

        if (!expression)
            this.syntaxError("Expected expression after '='");

        return [name, expression, assignment.span];
    }

    expression() {
        const absolutePath = this.absolutePath();

        if (absolutePath)
            return absolutePath;

        return this.literal();
    }

    identifier() {
        const tok = this.consumeToken(Token.TOKEN_IDENT);

        if (tok)
            return new ast.Ident(tok.value, tok.span);

        return null;
    }

    literal() {
        const integer = this.consumeToken(Token.TOKEN_INTEGER);

        if (integer)
            return new ast.LiteralInteger(integer.value, integer.span);

        const doubleQuotedString = this.consumeToken(Token.TOKEN_STRING_DQ);

        if (doubleQuotedString)
            return new ast.LiteralString(doubleQuotedString.value, false, doubleQuotedString.span);

        const singleQuotedString = this.consumeToken(Token.TOKEN_STRING_SQ);

        if (singleQuotedString)
            return new ast.LiteralString(singleQuotedString.value, true, singleQuotedString.span);

        return null;
    }

    // a
    // a/b
    // a/b/c
    // a/b/.../y/z
    relativePath(namespace) {
        const identifier = this.identifier();

        if (!identifier)
            return null;

        let path = namespace ? new ast.Path(namespace, identifier, identifier.span) : identifier;

        for (;;) {
            const slash = this.consumeToken(Token.TOKEN_SLASH);

            if (!slash)
                break;

            const nextIdentifier = this.identifier();

            if (!nextIdentifier)
                this.syntaxError("Expected identifier after '/'");

            path = new ast.Path(path, nextIdentifier, nextIdentifier.span);
        }

        return path;
    }

    unit() {
        const unit = new ast.Unit(this.lexed.unitName);

        for (;;) {
            let class_;

            this.consumeNewlines();

            if (class_ = this.class_()) {
                unit.pushClassDeclaration(class_);
            }
            else
                break;
        }

        return unit;
    }
}

module.exports = Parser;
