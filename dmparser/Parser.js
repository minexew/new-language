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

    /**
     * If a token of the specified type is at the head of token stream, remove and return it.
     * @param type
     * @returns {?Token}
     */
    consumeToken(type) {
        if (this.pos >= this.lexed.tokens.length)
            return null;

        const head = this.lexed.tokens[this.pos];
        
        //console.log(this.lexed.tokens[this.pos].type, 'vs', type);

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

        if (!node) {
            if (!displayName)
                displayName = method.name;

            this.syntaxError('Expected ' + displayName);
        }

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

    lookahead() {
        // only use this for debugging
        return this.lexed.tokens[this.pos];
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
            const decl = this.variableDeclarationBare();

            if (!decl)
                break;

            const [name, type] = decl;

            let inputMode = null;
            let inSet = null;

            if (this.consumeToken(Token.TOKEN_KEYWORD_AS)) {
                inputMode = this.expectRule(this.identifier, 'input mode');
            }
            else if (this.consumeToken(Token.TOKEN_KEYWORD_IN)) {
                inSet = this.expectRule(this.identifier, 'set');
            }

            list.pushArgument(name, type, inputMode, inSet);

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

        const block = this.blockBare();

        this.consumeNewlines();
        this.expectToken(Token.TOKEN_BLOCK_END);

        return block;
    }

    blockBare() {
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
            this.expectToken(Token.TOKEN_BLOCK_END, "Expected var, verb, proc, property or class declaration");
        }

        return class_;
    }

    classBody(class_) {
        for (;;) {
            this.consumeNewlines();

            // proc
            if (this.consumeToken(Token.TOKEN_KEYWORD_PROC)) {
                this.consumeNewlines();
                this.expectToken(Token.TOKEN_BLOCK_BEGIN);

                for (;;) {
                    const method = this.procedure();

                    if (!method)
                        break;

                    class_.pushProc(method, true);

                    if (!this.consumeToken(Token.TOKEN_NEWLINE))
                        break;
                }

                this.consumeNewlines();
                this.expectToken(Token.TOKEN_BLOCK_END);

                continue;
            }

            // var
            if (this.consumeToken(Token.TOKEN_KEYWORD_VAR)) {
                if (this.consumeToken(Token.TOKEN_SLASH)) {
                    if (!this.classVariableDeclaration(class_, true)) {
                        this.syntaxError('Expected variable declaration');
                    }
                }
                else {
                    this.consumeNewlines();
                    this.expectToken(Token.TOKEN_BLOCK_BEGIN);

                    for (;;) {
                        if (!this.classVariableDeclaration(class_, false)
                                || !this.consumeToken(Token.TOKEN_NEWLINE))
                            break;
                    }

                    this.consumeNewlines();
                    this.expectToken(Token.TOKEN_BLOCK_END);
                }

                continue;
            }

            // verb
            if (this.consumeToken(Token.TOKEN_KEYWORD_VERB)) {
                this.consumeNewlines();
                this.expectToken(Token.TOKEN_BLOCK_BEGIN);

                for (;;) {
                    const method = this.procedure();

                    if (!method)
                        break;

                    class_.pushVerb(method);

                    if (!this.consumeToken(Token.TOKEN_NEWLINE))
                        break;
                }

                this.consumeNewlines();
                this.expectToken(Token.TOKEN_BLOCK_END);

                continue;
            }

            // Property declaration
            const property = this.classPropertyDeclaration();

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
                class_.pushProc(method, false);

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

    classPropertyDeclaration() {
        const saved = this.saveContext();

        const name = this.identifier();

        if (!name) {
            this.restoreContext(saved);
            return null;
        }

        const assignment = this.consumeToken(Token.TOKEN_EQUAL);

        if (!assignment) {
            this.restoreContext(saved);
            return null;
        }

        const value = this.expectRule(this.expression);

        return [name, value, assignment.span];
    }

    classVariableDeclaration(class_, isInline) {
        let value = null;
        let isTmp = false;

        const tmp = this.consumeToken(Token.TOKEN_KEYWORD_TMP);

        if (tmp) {
            isTmp = true;
            this.expectToken(Token.TOKEN_SLASH);
        }

        const ident = this.identifier();

        if (!ident)
            return false;

        const assignment = this.consumeToken(Token.TOKEN_EQUAL);

        if (assignment) {
            value = this.expectRule(this.expression);
        }

        class_.pushVariableDeclaration(new ast.VarStatement(ident, null, value, isTmp, ident.span));
        return true;
    }

    expression() {
        /*
        Order of operations (from BYOND guide):
            literals, /         (expressionAtomic)
            new . : /               (expressionPath)    -- this shouldn't actually include : / right?
            ( ) ! ~ ++ -- -     (expressionUnaryOrCall)
            **
            * / %
            + -                 (expressionAddSub)
            > < >= <=           (expressionGreaterLess)
            << >>               (expressionShift)
            == != <>            (expressionEqualNotEqual)
            &
            ^
            |                   (expressionBitwiseOr)
            &&                  (expressionLogicAnd)
            ||                  (expressionLogicOr)
            ?
            = += -= etc.
        */

        const expr = this.expressionLogicOr();

        if (!expr)
            return null;

        return expr;
    }

    expressionAddSub() {
        let expr = this.expressionUnaryOrCall();

        if (!expr)
            return null;

        for (;;) {
            const minus = this.consumeToken(Token.TOKEN_MINUS);

            if (minus) {
                const right = this.expectRule(this.expressionUnaryOrCall, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.SUBTRACT, expr, right, minus.span);
                continue;
            }

            const plus = this.consumeToken(Token.TOKEN_PLUS);

            if (plus) {
                const right = this.expectRule(this.expressionUnaryOrCall, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.ADD, expr, right, plus.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionAtomic() {
        const dot = this.consumeToken(Token.TOKEN_DOT);

        if (dot) {
            return new ast.ReturnValueExpression(dot.span);
        }

        const dotdot = this.consumeToken(Token.TOKEN_DOT_DOT);

        if (dotdot)
            return new ast.SuperMethodExpression(dotdot.span);

        const literal = this.literal();

        if (literal)
            return literal;

        const absolutePath = this.absolutePath();

        if (absolutePath)
            return absolutePath;

        const relativePath = this.relativePath();

        if (relativePath)
            return relativePath;
    }

    expressionBitwiseOr() {
        let expr = this.expressionEqualNotEqual();

        if (!expr)
            return null;

        for (;;) {
            const bitwiseOr = this.consumeToken(Token.TOKEN_PIPE);

            if (bitwiseOr) {
                const right = this.expectRule(this.expressionEqualNotEqual, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.BITWISE_OR, expr, right, bitwiseOr.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionEqualNotEqual() {
        let expr = this.expressionShift();

        if (!expr)
            return null;

        for (;;) {
            const equal = this.consumeToken(Token.TOKEN_EQUAL_EQUAL);

            if (equal) {
                const right = this.expectRule(this.expressionShift, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.EQUAL, expr, right, equal.span);
                continue;
            }

            const notEqual = this.consumeToken(Token.TOKEN_EQUAL_EQUAL);

            if (notEqual) {
                const right = this.expectRule(this.expressionShift, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.NOT_EQUAL, expr, right, notEqual.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionGreaterLess() {
        let expr = this.expressionAddSub();

        if (!expr)
            return null;

        for (;;) {
            const greater = this.consumeToken(Token.TOKEN_GREATER);

            if (greater) {
                const right = this.expectRule(this.expressionAddSub, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.GREATER_THAN, expr, right, greater.span);
                continue;
            }

            const greaterEqual = this.consumeToken(Token.TOKEN_GREATER_EQUAL);

            if (greaterEqual) {
                const right = this.expectRule(this.expressionAddSub, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.GREATER_EQUAL, expr, right, greaterEqual.span);
                continue;
            }

            const less = this.consumeToken(Token.TOKEN_LESS);

            if (less) {
                const right = this.expectRule(this.expressionAddSub, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.LESS_THAN, expr, right, less.span);
                continue;
            }

            const lessEqual = this.consumeToken(Token.TOKEN_LESS_EQUAL);

            if (lessEqual) {
                const right = this.expectRule(this.expressionAddSub, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.LESS_EQUAL, expr, right, lessEqual.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionPath() {
        const new_ = this.consumeToken(Token.TOKEN_KEYWORD_NEW);

        if (new_) {
            // TODO: should be this.path
            const className = this.expectRule(this.expressionAtomic, 'class name');
            const arguments_ = this.expectRule(this.argumentList, 'argument list');

            return new ast.NewExpression(className, arguments_, new_.span);
        }

        let expr = this.expressionAtomic();

        if (!expr)
            return null;

        for (;;) {
            const dot = this.consumeToken(Token.TOKEN_DOT);

            if (dot) {
                const varName = this.expectRule(this.identifier);

                expr = new ast.MemberExpression(expr, varName, dot.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionLogicAnd() {
        let expr = this.expressionBitwiseOr();

        if (!expr)
            return null;

        for (;;) {
            const logicAnd = this.consumeToken(Token.TOKEN_LOGIC_AND);

            if (logicAnd) {
                const right = this.expectRule(this.expressionBitwiseOr, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.LOGIC_AND, expr, right, logicAnd.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionLogicOr() {
        let expr = this.expressionLogicAnd();

        if (!expr)
            return null;

        for (;;) {
            const logicOr = this.consumeToken(Token.TOKEN_LOGIC_OR);

            if (logicOr) {
                const right = this.expectRule(this.expressionLogicAnd, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.LOGIC_OR, expr, right, logicOr.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionShift() {
        let expr = this.expressionGreaterLess();

        if (!expr)
            return null;

        for (;;) {
            const shift_l = this.consumeToken(Token.TOKEN_SHIFT_L);

            if (shift_l) {
                const right = this.expectRule(this.expressionGreaterLess, 'expression');
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

            const minusMinus = this.consumeToken(Token.TOKEN_MINUS_MINUS);

            if (minusMinus) {
                expr = new ast.UnaryExpression(ast.UnaryExpression.POSTFIX_DECREMENT, expression, minusMinus.span);
                continue;
            }

            const plusPlus = this.consumeToken(Token.TOKEN_PLUS_PLUS);

            if (plusPlus) {
                expr = new ast.UnaryExpression(ast.UnaryExpression.POSTFIX_INCREMENT, expression, plusPlus.span);
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

        let body;

        this.consumeNewlines();
        if (this.consumeToken(Token.TOKEN_BLOCK_BEGIN)) {
            // Parse `set` directives
            for (; ;) {
                this.consumeNewlines();

                if (this.consumeToken(Token.TOKEN_KEYWORD_SET)) {
                    const name = this.expectRule(this.identifier);

                    if (this.consumeToken(Token.TOKEN_KEYWORD_IN)) {
                        const expr = this.expectRule(this.expression);
                    }
                    else {
                        this.expectToken(Token.TOKEN_EQUAL);

                        this.syntaxError('Not implemented');
                    }

                    if (!this.consumeToken(Token.TOKEN_NEWLINE))
                        break;

                    continue;
                }

                break;
            }

            body = this.blockBare();

            this.consumeNewlines();
            this.expectToken(Token.TOKEN_BLOCK_END, 'Expected statement');
        }
        else {
            body = new ast.Block();
        }

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
        const del_ = this.consumeToken(Token.TOKEN_KEYWORD_DEL);

        if (del_) {
            const expression = this.expectRule(this.expression);

            return new ast.DelStatement(expression, del_.span);
        }

        const for_ = this.consumeToken(Token.TOKEN_KEYWORD_FOR);

        if (for_) {
            this.expectToken(Token.TOKEN_PAREN_L, "Expected '('");
            const varDecl = this.expectRule(this.variableDeclaration, 'variable declaration');
            this.expectToken(Token.TOKEN_KEYWORD_IN);
            const expression = this.expectRule(this.expression);
            this.expectToken(Token.TOKEN_PAREN_R, "Expected ')'");

            const body = this.block();

            return new ast.ForListStatement(varDecl, expression, body, for_.span);
        }

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

        // TODO: var

        const expr = this.expression();

        if (expr) {
            const assignment = this.consumeToken(Token.TOKEN_EQUAL);

            if (assignment) {
                const value = this.expectRule(this.expression);

                return new ast.AssignmentStatement(expr, value, assignment.span);
            }
            else
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

    // var/type/name
    // (type is optional)
    variableDeclaration() {
        const var_ = this.consumeToken(Token.TOKEN_KEYWORD_VAR);

        if (!var_)
            return null;

        this.expectToken(Token.TOKEN_SLASH);

        const [name, type] = this.expectRule(this.variableDeclarationBare, 'variable name');

        const isTmp = false;
        return new ast.VarStatement(name, type, null, isTmp, var_.span);
    }

    // type/type2/type3/name
    // (type is optional)
    variableDeclarationBare() {
        // For shit like var/atom/movable/o, the only way to parse is to buffer everything first and then analyze

        const ident = this.identifier();

        if (!ident)
            return null;

        const parts = [[ident, null]];

        for (;;) {
            const slash = this.consumeToken(Token.TOKEN_SLASH);

            if (!slash)
                break;

            const next = this.expectRule(this.identifier);

            parts.push([next, slash.span]);
        }

        const [name, _] = parts.pop();

        let type = null;

        for (const [part, span] of parts) {
            if (!type)
                type = part;
            else
                type = new ast.Path(type, part, span);
        }

        return [name, type];
    }
}

module.exports = Parser;
