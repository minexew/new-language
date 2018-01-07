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

    expectRule(method, displayName) {
        const node = method.apply(this);

        if (!node)
            this.syntaxError('Expected ' + displayName);

        return node;
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
        if (what === undefined)
            what = "Syntax error";

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

    argumentDeclList() {
        const start = this.consumeToken(Token.TOKEN_PAREN_L);

        if (!start)
            return null;

        const list = new ast.ArgumentDeclList(start.span);

        for (;;) {
            let type, name;

            const ident = this.identifier();

            if (this.consumeToken(Token.TOKEN_SLASH)) {
                // type/name

                type = ident;
                name = this.identifier();

                if (!name)
                    this.syntaxError("Expected variable name");
            }
            else {
                // just name

                type = null;
                name = ident;
            }

            // TODO: handle "as"
            const inputMode = null;

            list.pushArgument(name, type, inputMode);

            if (!this.consumeToken(Token.TOKEN_COMMA))
                break;
        }

        this.expectToken(Token.TOKEN_PAREN_R, "Expected ')'");
        return list;
    }

    argumentList() {
        const start = this.consumeToken(Token.TOKEN_PAREN_L);

        if (!start)
            return null;

        const list = new ast.ArgumentList(start.span);

        for (;;) {
            // Try a named argument first
            const namedArgument = this.namedArgumentName();

            if (namedArgument) {
                const [name, span] = namedArgument;
                const expression = this.expectRule(this.expression, 'expression');

                list.pushNamed(name, expression, span);
            }
            else {
                const expression = this.expression();

                if (!expression)
                    break;

                list.pushPositional(expression);
            }

            if (!this.consumeToken(Token.TOKEN_COMMA))
                break;
        }

        this.expectToken(Token.TOKEN_PAREN_R, "Expected ')'");
        return list;
    }

    block() {
        this.consumeNewlines();
        this.expectToken(Token.TOKEN_BLOCK_BEGIN);

        const block = new ast.Block();

        for (;;) {
            this.consumeNewlines();

            const statement = this.statement();

            if (!statement)
                break;

            block.pushStatement(statement);

            if (!this.consumeToken(Token.TOKEN_NEWLINE))
                break;
        }

        this.consumeNewlines();
        this.expectToken(Token.TOKEN_BLOCK_END);

        return block;
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
            this.expectToken(Token.TOKEN_BLOCK_END, "Expected variable, method, property or class declaration");
        }

        return class_;
    }

    classBody(class_) {
        for (;;) {
            this.consumeNewlines();

            if (this.consumeToken(Token.TOKEN_KEYWORD_VAR)) {
                if (this.consumeToken(Token.TOKEN_SLASH)) {
                }
                else {
                    this.consumeNewlines();
                    this.expectToken(Token.TOKEN_BLOCK_BEGIN);

                    for (;;) {
                        const ident = this.identifier();

                        if (!ident)
                            break;

                        class_.pushVariableDeclaration(ident);

                        if (!this.consumeToken(Token.TOKEN_NEWLINE))
                            break;
                    }

                    this.consumeNewlines();
                    this.expectToken(Token.TOKEN_BLOCK_END);
                }

                continue;
            }

            // Property declaration
            const property = this.classVariableDeclaration();

            if (property) {
                const [name, value, span] = property;
                class_.pushPropertyDeclaration(name, value, span);

                if (!this.consumeToken(Token.TOKEN_NEWLINE))
                    break;

                continue;
            }

            // Method declaration
            const method = this.procedure();

            if (method) {
                class_.pushProcedure(method);

                if (!this.consumeToken(Token.TOKEN_NEWLINE))
                    break;

                continue;
            }

            // Subclass declaration
            const classDeclaration = this.class_();

            if (classDeclaration) {
                class_.pushClassDeclaration(classDeclaration);

                // Can't do this, because for empty classes, any newlines will be consumed while looking for BLOCK_BEGIN
                //if (!this.consumeToken(Token.TOKEN_NEWLINE))
                //    break;

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

        const value = this.expression();

        if (!value)
            this.syntaxError("Expected expression after '='");

        return [name, value, assignment.span];
    }

    expression() {
        /*
        Order of operations (from BYOND guide):
            . : /               (expressionPath)
            ( ) ! ~ ++ -- -     (expressionUnaryOrCall)
            **
            * / %
            + -
            > < >= <=
            << >>               (expressionShift)
            == != <>
            &
            ^
            |
            &&
            ||
            ?
            = += -= etc.
        */

        const expr = this.expressionShift();

        if (!expr)
            return null;

        return expr;
    }

    expressionPath() {
        const absolutePath = this.absolutePath();

        if (absolutePath)
            return absolutePath;

        const relativePath = this.relativePath();

        if (relativePath)
            return relativePath;

        return this.literal();
    }

    expressionShift() {
        let expr = this.expressionUnaryOrCall();

        if (!expr)
            return null;

        for (;;) {
            const shift_l = this.consumeToken(Token.TOKEN_SHIFT_L);

            if (shift_l) {
                const right = this.expectRule(this.expressionUnaryOrCall, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.SHIFT_L, expr, right, shift_l.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionUnaryOrCall() {
        // Logical negation
        const exclamation = this.consumeToken(Token.TOKEN_EXCLAMATION);

        if (exclamation) {
            const expression = this.expectRule(this.expressionUnaryOrCall, 'expression');

            return new ast.UnaryExpression(ast.UnaryExpression.NOT, expression, exclamation.span);
        }

        let expr = this.expressionPath();

        if (!expr)
            return null;

        for (;;) {
            const arguments_ = this.argumentList();

            if (arguments_) {
                expr = new ast.CallExpression(expr, arguments_);
                continue;
            }

            break;
        }

        return expr;
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

    namedArgumentName() {
        const saved = this.saveContext();

        const name = this.identifier();

        if (!name) {
            this.restoreContext(saved);
            return null;
        }

        const equal = this.consumeToken(Token.TOKEN_EQUAL);

        if (!equal) {
            this.restoreContext(saved);
            return null;
        }

        return [name, equal.span];
    }

    procedure() {
        const saved = this.saveContext();

        const name = this.identifier();

        if (!name) {
            this.restoreContext(saved);
            return null;
        }

        const argList = this.argumentDeclList();

        if (!argList) {
            this.restoreContext(saved);
            return null;
        }

        const body = this.block();

        return new ast.Procedure(name, argList, body);
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
            if (!this.consumeToken(Token.TOKEN_SLASH))
                break;

            const nextIdentifier = this.identifier();

            if (!nextIdentifier)
                this.syntaxError("Expected identifier after '/'");

            path = new ast.Path(path, nextIdentifier, nextIdentifier.span);
        }

        return path;
    }

    statement() {
        const if_ = this.consumeToken(Token.TOKEN_KEYWORD_IF);

        if (if_) {
            this.expectToken(Token.TOKEN_PAREN_L, "Expected '('");
            const expression = this.expectRule(this.expression, "expression");
            this.expectToken(Token.TOKEN_PAREN_R, "Expected ')'");

            const body = this.block();

            return new ast.IfStatement(expression, body, if_.span);
        }

        const return_ = this.consumeToken(Token.TOKEN_KEYWORD_RETURN);

        if (return_) {
            // Optional
            const expression = this.expression();

            return new ast.ReturnStatement(expression, return_.span);
        }

        const expr = this.expression();

        if (expr) {
            /*if ( Token* tok = accept( Token_assignment ) )
            {
                auto span = tok->span;
                auto right = parseAddSubExpression();

                if (!right)
                    syntaxError("Expected expression after '='");

                statement = make_pooled<AstNodeAssignment>(move(expr), move(right), span);
            }
            else */
                return new ast.ExpressionStatement(expr, expr.span);
        }
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
