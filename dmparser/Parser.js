const Token = require('./Token');

class AstExpression {
    constructor(span) {
        this.span = span;
    }
}

class AstIdent extends AstExpression {
    constructor(value, span) {
        super(span);
        this.value = value;
    }
}

class AstLiteral extends AstExpression {
    constructor(span) {
        super(span);
    }
}

/*

 class AstNodeLiteralBoolean : public AstNodeLiteral
 {
 public:
 AstNodeLiteralBoolean(bool value, SourceSpan span)
 : AstNodeLiteral(AstNodeLiteral::Type::boolean, span), value(value) {
 }

 const bool value;
 };

 class AstNodeLiteralInteger : public AstNodeLiteral
 {
 public:
 AstNodeLiteralInteger(Int_t value, SourceSpan span)
 : AstNodeLiteral(AstNodeLiteral::Type::integer, span), value(value) {
 }

 const Int_t value;
 };

 class AstNodeLiteralObject : public AstNodeLiteral
 {
 public:
 explicit AstNodeLiteralObject(SourceSpan span)
 : AstNodeLiteral(AstNodeLiteral::Type::object, span) {
 }

 void addProperty(std::string&& propertyName, pool_ptr<AstNodeExpression>&& expression) {
 properties.emplace_back(std::move(propertyName), std::move(expression));
 }

 const auto& getProperties() const { return properties; }

 private:
 // not a map, accessed mostly in order
 std::vector<std::pair<std::string, pool_ptr<AstNodeExpression>>> properties;
 };

 class AstNodeLiteralReal : public AstNodeLiteral
 {
 public:
 AstNodeLiteralReal(Real_t value, SourceSpan span)
 : AstNodeLiteral(AstNodeLiteral::Type::real, span), value(value) {
 }

 const Real_t value;
 };
*/
class AstLiteralString extends AstLiteral {
    constructor(text, span) {
        super(span);
        this.text = text;
    }
}

class AstUnit {
    constructor(unitName) {
        this.unitName = unitName;
    }
}

class AstStatement {
    constructor(span) {
        this.span = span;
    }
}

class AstAssignment extends AstStatement {
    constructor(target, expression, span) {
        super(span);
        this.target = target;
        this.expression = expression;
    }

    /*SourceSpan getFullSpan() const override { return SourceSpan::union_(target->getFullSpan(), expression->getFullSpan()); }

    const AstNodeExpression* getExpression() const { return expression.get(); }
    pool_ptr<AstNodeExpression> getExpression2() const { return expression; }
    const AstNodeExpression* getTarget() const { return target.get(); }
    pool_ptr<AstNodeExpression> getTarget2() const { return target; }

    private:
        const pool_ptr<AstNodeExpression> target, expression;*/
}

class Parser {
    constructor(lexed, fileAccessor, diagnosticsSink) {
        this.lexed = lexed;
        this.fileAccessor = fileAccessor;
        this.diag = diagnosticsSink;
    }

    consumeToken(type, requiredIndent) {
        if (this.lexed.tokens[0].type !== type)
            return null;

        if (requiredIndent === undefined) {
        }
        else if (requiredIndent === null) {
            if (this.lexed.tokens[0].indent !== null)
                return null;
        }
        else {
            if (this.lexed.tokens[0].indent < requiredIndent)
                return null;
        }

        return this.lexed.tokens.splice(0, 1)[0];
    }

    /*eof() {
        return this.lexed.tokens.length == 0;
    }*/

    finalCheck() {
        if (this.lexed.tokens.length > 0)
            this.syntaxError("Unparsed tokens remaining");
    }

    syntaxError(what, span) {
        if (!span) {
            if (this.lexed.tokens.length < 1)
                throw new Error('FIXME');

            const token = this.lexed.tokens[0];
            span = token.span;
        }

        this.diag.error(what, span);
        throw new Error(what);
    }

    // parsing rules

    classDeclarationBody(path, indent) {
        for (;;) {
            const identifier = this.identifier(indent);

            if (!identifier)
                break;

            const assignment = this.consumeToken(Token.TOKEN_EQUAL, null);

            if (assignment) {
                const expr = this.expression();

                if (!expr)
                    this.syntaxError("Expected expression after '='");

                const node = new AstAssignment(path, expr, assignment.span);
            }
            else
                this.syntaxError("FIXME");
        }
    }

    declaration() {
        // x
        // x = ...
        // x/y
        // x/y/z(a, b, c)

        // TODO: what about indent?
        const identifier = this.identifier('??');

        if (!identifier)
            return null;

        const path = [identifier];

        // parse slashes
        for (;;) {
            const slash = this.consumeToken(Token.TOKEN_SLASH, null);

            if (slash) {
                const nextIdentifier = this.identifier(null);

                if (!nextIdentifier)
                    this.syntaxError("Expected identifier after '/'");

                path.push(nextIdentifier);

                continue;
            }

            break;
        }

        // TODO: parse function declaration

        // class declaration
        return this.classDeclarationBody(path, identifier.indent + 1);
    }

    expression() {
        return this.literal();
    }

    identifier(requiredIndent) {
        const tok = this.consumeToken(Token.TOKEN_IDENT, requiredIndent);

        if (tok)
            return new AstIdent(tok.value, tok.span);

        return null;
    }

    literal() {
        const string = this.consumeToken(Token.TOKEN_STRING, null);

        if (string)
            return new AstLiteralString(string.value, string.span);

        return null;
    }

    unit() {
        const node = new AstUnit(this.lexed.unitName);

        for (;;) {
            let declaration;

            if (declaration = this.declaration()) {
                ;
            }
            else
                break;
        }
    }
}

module.exports = Parser;
