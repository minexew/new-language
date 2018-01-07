const SourcePoint = require('./SourcePoint');
const Token = require('./Token');

const ast = require('./ast');

class Parser {
    constructor(lexed, fileAccessor, diagnosticsSink) {
        this.lexed = lexed;
        this.fileAccessor = fileAccessor;
        this.diag = diagnosticsSink;
    }

    consumeNewlines() {
        while (this.consumeToken(Token.TOKEN_NEWLINE)) {
        }
    }

    consumeToken(type) {
        if (this.lexed.tokens.length < 1)
            return null;

        //console.log(this.lexed.tokens[0].type, 'vs', type);

        if (this.lexed.tokens[0].type !== type)
            return null;

        //console.log('Consume', this.lexed.tokens[0]);

        if (this.lexed.tokens[0].span)
            this.lastGoodSpan = this.lexed.tokens[0].span;

        return this.lexed.tokens.splice(0, 1)[0];
    }

    /*eof() {
        return this.lexed.tokens.length == 0;
    }*/

    expectToken(type, errorMessage) {
        if (!this.consumeToken(type))
            this.syntaxError(errorMessage ? errorMessage : "Unexpected token");
    }

    finalCheck() {
        if (this.lexed.tokens.length > 0)
            this.syntaxError("Unparsed tokens remaining");
    }

    syntaxError(what, pointOrSpan) {
        if (!pointOrSpan) {
            if (this.lexed.tokens.length < 1)
                throw new Error('FIXME');

            const token = this.lexed.tokens[0];
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

    classDeclarationBody(class_) {
        for (;;) {
            this.consumeNewlines();

            /*const identifier = this.identifier();

            if (!identifier)
                break;

            else {
                // Could be anything
            }*/

            const declaration = this.declaration();

            if (!declaration)
                break;

            class_.pushDeclaration(declaration);
        }
    }

    declaration() {
        // x
        // x = ...
        // x/y
        // x/y/z(a, b, c)

        const path = this.relativePath();
        //console.log('decl path', path);

        if (!path)
            return null;

        const assignment = this.consumeToken(Token.TOKEN_EQUAL, null);

        if (assignment) {
            // Definitely a member variable assignment

            const expr = this.expression();

            if (!expr)
                this.syntaxError("Expected expression after '='");

            return new ast.Assignment(path, expr, assignment.span);
        }

        // TODO: check if function declaration

        // Otherwise, class declaration
        this.consumeNewlines();

        const class_ = new ast.Class(path);

        if (this.consumeToken(Token.TOKEN_BLOCK_BEGIN)) {
            this.classDeclarationBody(class_);

            this.consumeNewlines();
            this.expectToken(Token.TOKEN_BLOCK_END);
        }

        return class_;
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
            let declaration;

            this.consumeNewlines();

            if (declaration = this.declaration()) {
                unit.pushDeclaration(declaration);
            }
            else
                break;
        }

        return unit;
    }
}

module.exports = Parser;
