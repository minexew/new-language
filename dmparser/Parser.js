const ast = require('./ast');
const SourcePoint = require('./SourcePoint');
const Token = require('./Token');

// FIXME: unexpected nesting in procedure just throws up "Unexpected token"; better diagnostic is needed

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
        if (!this.consumeToken(type)) {
            if (errorMessage)
                this.syntaxError(errorMessage);
            else if (this.pos < this.lexed.tokens.length && this.lexed.tokens[this.pos].type == Token.TOKEN_NEWLINE)    // what?
                this.syntaxError("Expected token " + type);
            else
                this.syntaxError("Unexpected token");
        }
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

    // argumentDeclList() {
    //     const start = this.consumeToken(Token.TOKEN_PAREN_L);

    //     if (!start)
    //         return null;

    //     const list = new ast.ArgumentDeclList(start.span);

    //     for (;;) {
    //         const arg = this.nameAndType();

    //         if (!arg)
    //             break;

    //         const [name, type] = arg;

    //         list.pushArgument(name, type);

    //         if (!this.consumeToken(Token.TOKEN_COMMA))
    //             break;
    //     }

    //     this.expectToken(Token.TOKEN_PAREN_R, "Expected ')'");
    //     return list;
    // }

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

    blockOrSingleStatement() {
        const statement = this.statement();

        if (statement) {
            // Wrap statement in a Block
            const block = new ast.Block();
            block.pushStatement(statement);
            return block;
        }

        const block = this.block();

        if (block)
            return block;

        return null;
    }

    struct() {
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
                if (this.consumeToken(Token.TOKEN_SLASH)) {
                    const method = this.expectRule(this.procedure);

                    class_.pushProc(method, false);
                }
                else {
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
                }

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
        let isTmp = false;

        const tmp = this.consumeToken(Token.TOKEN_KEYWORD_TMP);

        if (tmp) {
            isTmp = true;
            this.expectToken(Token.TOKEN_SLASH);
        }

        const ident = this.identifier();

        if (!ident)
            return false;

        let value = null;
        const assignment = this.consumeToken(Token.TOKEN_EQUAL);

        if (assignment) {
            value = this.expectRule(this.expression);
        }

        class_.pushVariableDeclaration(new ast.VarStatement(ident, null, value, isTmp, ident.span));
        return true;
    }

    expression() {
        /*
        Operator precedence (per https://en.cppreference.com/w/c/language/operator_precedence):
            literals                (expressionAtomic)
            ( ) [ ]                 (expressionIndexOrCall)
            ++ -- + - ! ~           (expressionUnary)
            * / %                   (expressionMulDivRem)
            + -                     (expressionAddSub)
            << >>                   (expressionShift)
            as                      (expressionAs)
            > < >= <=               (expressionGreaterLess)
            == != <>                (expressionEqualNotEqual)
            &
            ^
            |                       (expressionBitwiseOr)
            &&                      (expressionLogicAnd)
            ||                      (expressionLogicOr)
            ..                      (expressionSlice)
            = += -= etc.
        */

        const expr = this.expressionSlice();

        if (!expr)
            return null;

        return expr;
    }

    expressionAddSub() {
        let expr = this.expressionMulDivRem();

        if (!expr)
            return null;

        for (;;) {
            const minus = this.consumeToken(Token.TOKEN_MINUS);

            if (minus) {
                const right = this.expectRule(this.expressionMulDivRem, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.SUBTRACT, expr, right, minus.span);
                continue;
            }

            const plus = this.consumeToken(Token.TOKEN_PLUS);

            if (plus) {
                const right = this.expectRule(this.expressionMulDivRem, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.ADD, expr, right, plus.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionAs() {
        let expr = this.expressionShift();

        if (!expr)
            return null;

        const as = this.consumeToken(Token.TOKEN_KEYWORD_AS);

        if (as) {
            const newType = this.expectRule(this.typeExpression, 'a type');
            expr = new ast.TypeCastExpression(expr, newType, as.span);
        }

        return expr;
    }

    expressionAtomic() {
        // const dot = this.consumeToken(Token.TOKEN_DOT);

        // if (dot) {
        //     return new ast.ReturnValueExpression(dot.span);
        // }

        // const dotdot = this.consumeToken(Token.TOKEN_DOT_DOT);

        // if (dotdot)
        //     return new ast.SuperMethodExpression(dotdot.span);

        const ident = this.identifier();

        if (ident)
            return ident;

        const literal = this.literal();

        if (literal)
            return literal;

        const paren = this.consumeToken(Token.TOKEN_PAREN_L);

        if (paren) {
            const expr = this.expectRule(this.expression);
            this.expectToken(Token.TOKEN_PAREN_R);
            return expr;
        }

        // const absolutePath = this.absolutePath();

        // if (absolutePath)
        //     return absolutePath;

        // const relativePath = this.relativePath();

        // if (relativePath)
        //     return relativePath;

        return null;
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
        let expr = this.expressionGreaterLess();

        if (!expr)
            return null;

        for (;;) {
            const equal = this.consumeToken(Token.TOKEN_EQUAL_EQUAL);

            if (equal) {
                const right = this.expectRule(this.expressionGreaterLess, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.EQUAL, expr, right, equal.span);
                continue;
            }

            const notEqual = this.consumeToken(Token.TOKEN_NOT_EQUAL);

            if (notEqual) {
                const right = this.expectRule(this.expressionGreaterLess, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.NOT_EQUAL, expr, right, notEqual.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionGreaterLess() {
        let expr = this.expressionAs();

        if (!expr)
            return null;

        for (;;) {
            const greater = this.consumeToken(Token.TOKEN_GREATER);

            if (greater) {
                const right = this.expectRule(this.expressionAs, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.GREATER_THAN, expr, right, greater.span);
                continue;
            }

            const greaterEqual = this.consumeToken(Token.TOKEN_GREATER_EQUAL);

            if (greaterEqual) {
                const right = this.expectRule(this.expressionAs, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.GREATER_EQUAL, expr, right, greaterEqual.span);
                continue;
            }

            const less = this.consumeToken(Token.TOKEN_LESS);

            if (less) {
                const right = this.expectRule(this.expressionAs, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.LESS_THAN, expr, right, less.span);
                continue;
            }

            const lessEqual = this.consumeToken(Token.TOKEN_LESS_EQUAL);

            if (lessEqual) {
                const right = this.expectRule(this.expressionAs, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.LESS_EQUAL, expr, right, lessEqual.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionIndexOrCall() {
        let expr = this.expressionAtomic();

        if (!expr)
            return null;

        for (;;) {
            const arguments_ = this.argumentList();

            if (arguments_) {
                expr = new ast.CallExpression(expr, arguments_);
                continue;
            }

            const dot = this.consumeToken(Token.TOKEN_DOT);

            if (dot) {
                const ident = this.expectRule(this.identifier);
                expr = new ast.MemberExpression(expr, ident, dot.span);
                continue;
            }

            const squareBracket = this.consumeToken(Token.TOKEN_SQ_BRACKET_L);

            if (squareBracket) {
                const maybeIndex = this.expression();

                this.expectToken(Token.TOKEN_SQ_BRACKET_R);
                expr = new ast.IndexExpression(expr, maybeIndex, squareBracket.span);
                continue;
            }

            const minusMinus = this.consumeToken(Token.TOKEN_MINUS_MINUS);

            if (minusMinus) {
                expr = new ast.UnaryExpression(ast.UnaryExpression.POSTFIX_DECREMENT, expr, minusMinus.span);
                continue;
            }

            const plusPlus = this.consumeToken(Token.TOKEN_PLUS_PLUS);

            if (plusPlus) {
                expr = new ast.UnaryExpression(ast.UnaryExpression.POSTFIX_INCREMENT, expr, plusPlus.span);
                continue;
            }

            break;
        }

        return expr;
    }

    // expressionPath() {
    //     const new_ = this.consumeToken(Token.TOKEN_KEYWORD_NEW);

    //     if (new_) {
    //         // TODO: should be this.path
    //         const className = this.expectRule(this.expressionAtomic, 'class name');
    //         const arguments_ = this.expectRule(this.argumentList, 'argument list');

    //         return new ast.NewExpression(className, arguments_, new_.span);
    //     }

    //     let expr = this.expressionAtomic();

    //     if (!expr)
    //         return null;

    //     for (;;) {
    //         const dot = this.consumeToken(Token.TOKEN_DOT);

    //         if (dot) {
    //             const varName = this.expectRule(this.identifier);

    //             expr = new ast.MemberExpression(expr, varName, dot.span);
    //             continue;
    //         }

    //         break;
    //     }

    //     return expr;
    // }

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

    expressionMulDivRem() {
        return this.expressionUnary();
    }

    expressionShift() {
        let expr = this.expressionAddSub();

        if (!expr)
            return null;

        for (;;) {
            const shift_l = this.consumeToken(Token.TOKEN_SHIFT_L);

            if (shift_l) {
                const right = this.expectRule(this.expressionAddSub, 'expression');
                expr = new ast.BinaryExpression(ast.BinaryExpression.SHIFT_L, expr, right, shift_l.span);
                continue;
            }

            break;
        }

        return expr;
    }

    expressionSlice() {
        let expr = this.expressionLogicOr();

        if (!expr)
            return null;

        const slice = this.consumeToken(Token.TOKEN_DOT_DOT);

        if (slice) {
            const end = this.expectRule(this.expressionLogicOr, 'expression');
            expr = new ast.SliceExpression(expr, end, slice.span);
        }

        return expr;
    }

    expressionUnary() {
        // Logical negation
        const exclamation = this.consumeToken(Token.TOKEN_EXCLAMATION);

        if (exclamation) {
            const expression = this.expectRule(this.expressionUnaryOrCall, 'expression');

            return new ast.UnaryExpression(ast.UnaryExpression.NOT, expression, exclamation.span);
        }

        return this.expressionIndexOrCall();
    }

    function_() {
        const func = this.consumeToken(Token.TOKEN_KEYWORD_FUNC);

        if (!func) {
            return null;
        }

        const name = this.expectRule(this.identifier);
        const inputTuple = this.expectRule(this.tupleTypeExpression);
        this.expectToken(Token.TOKEN_ARROW);
        const outputTuple = this.expectRule(this.tupleTypeExpression);
        const attributes = [];

        while (this.consumeToken(Token.TOKEN_KEYWORD_ATTRIBUTE)) {
            this.expectToken(Token.TOKEN_PAREN_L, "Expected '('");
            const attribute = this.expectRule(this.identifier);

            if (attribute.value !== 'extern') {
                this.syntaxError("Expected 'extern'");
            }

            attributes.push(attribute);
            this.expectToken(Token.TOKEN_PAREN_R, "Expected ')'");
        }

        let body = null;

        if (this.consumeToken(Token.TOKEN_COLON)) {
            this.consumeNewlines();
            this.expectToken(Token.TOKEN_BLOCK_BEGIN)
            body = this.blockBare();

            this.consumeNewlines();
            this.expectToken(Token.TOKEN_BLOCK_END, 'Expected statement');
        }

        return new ast.FunctionStatement(name, inputTuple, outputTuple, attributes, body, func.span);
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

    typeWithOptionalName() {
        // 2 possibilities:
        // typeExpression
        // identifier: typeExpression

        // Distinguishing is not straightforward, as both start with the same token, but interpret it differently
        // (Ident x TypeName)
        // However, the syntactic benefit is worth it here, so we go out of our way to make it work.

        const saved = this.saveContext();

        let maybeType = this.typeExpression();

        if (!maybeType) {
            this.restoreContext(saved);
            return null;
        }

        if (this.consumeToken(Token.TOKEN_COLON)) {
            this.restoreContext(saved);

            const name = this.expectRule(this.identifier);
            this.expectToken(Token.TOKEN_COLON);
            const type = this.expectRule(this.typeExpression, "a type");

            return [name, type];
        }
        else {
            const type = maybeType;
            return [null, type];
        }
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

    // procedure() {
    //     const saved = this.saveContext();

    //     const name = this.identifier();

    //     if (!name) {
    //         this.restoreContext(saved);
    //         return null;
    //     }

    //     const argList = this.argumentDeclList();

    //     if (!argList) {
    //         this.restoreContext(saved);
    //         return null;
    //     }

    //     let body;

    //     this.consumeNewlines();
    //     if (this.consumeToken(Token.TOKEN_BLOCK_BEGIN)) {
    //         // Parse `set` directives
    //         for (; ;) {
    //             this.consumeNewlines();

    //             if (this.consumeToken(Token.TOKEN_KEYWORD_SET)) {
    //                 const name = this.expectRule(this.identifier);

    //                 if (this.consumeToken(Token.TOKEN_KEYWORD_IN)) {
    //                     const expr = this.expectRule(this.expression);
    //                 }
    //                 else {
    //                     this.expectToken(Token.TOKEN_EQUAL);

    //                     this.syntaxError('Not implemented');
    //                 }

    //                 if (!this.consumeToken(Token.TOKEN_NEWLINE))
    //                     break;

    //                 continue;
    //             }

    //             break;
    //         }

    //         body = this.blockBare();

    //         this.consumeNewlines();
    //         this.expectToken(Token.TOKEN_BLOCK_END, 'Expected statement');
    //     }
    //     else {
    //         body = new ast.Block();
    //     }

    //     return new ast.Procedure(name, argList, body);
    // }

    // a
    // a/b
    // a/b/c
    // a/b/.../y/z
    // relativePath(namespace) {
    //     const identifier = this.identifier();

    //     if (!identifier)
    //         return null;

    //     let path = namespace ? new ast.Path(namespace, identifier, identifier.span) : identifier;

    //     for (;;) {
    //         if (!this.consumeToken(Token.TOKEN_SLASH))
    //             break;

    //         const nextIdentifier = this.identifier();

    //         if (!nextIdentifier)
    //             this.syntaxError("Expected identifier after '/'");

    //         path = new ast.Path(path, nextIdentifier, nextIdentifier.span);
    //     }

    //     return path;
    // }

    statement() {
        const del_ = this.consumeToken(Token.TOKEN_KEYWORD_DEL);

        if (del_) {
            const expression = this.expectRule(this.expression);

            return new ast.DelStatement(expression, del_.span);
        }

        const for_ = this.consumeToken(Token.TOKEN_KEYWORD_FOR);

        if (for_) {
            this.expectToken(Token.TOKEN_PAREN_L, "Expected '('");

            let loopVariable;       // loopVariable is a bit too polymorphic for my liking, substitution coul be a solution
                                    // but we'd need to allow returning multiple statements at once
            const varDecl = this.varStatement();

            if (varDecl) {
                loopVariable = varDecl;
            }
            else {
                const ident = this.identifier();

                if (ident) {
                    loopVariable = ident;
                }
                else {
                    this.syntaxError("Expected variable declaration or name");
                }
            }

            this.expectToken(Token.TOKEN_KEYWORD_IN);
            const expression = this.expectRule(this.expression);
            this.expectToken(Token.TOKEN_PAREN_R, "Expected ')'");

            const body = this.block();

            return new ast.ForListStatement(loopVariable, expression, body, for_.span);
        }

        const func = this.function_();

        if (func) {
            return func;
        }

        const if_ = this.consumeToken(Token.TOKEN_KEYWORD_IF);

        if (if_) {
            // this.expectToken(Token.TOKEN_PAREN_L, "Expected '('");
            const expression = this.expectRule(this.expression, "expression");
            // this.expectToken(Token.TOKEN_PAREN_R, "Expected ')'");
            this.expectToken(Token.TOKEN_COLON);

            const body = this.block();

            let elseBody = null;

            // Doesn't seem right at all that we have to save/restore here.
            // It's due to `block` expecting a newline after statement
            const saved = this.saveContext();

            this.consumeNewlines();
            const else_ = this.consumeToken(Token.TOKEN_KEYWORD_ELSE);

            if (else_) {
                elseBody = this.expectRule(this.blockOrSingleStatement, 'statement or block');
            }
            else
                this.restoreContext(saved);

            return new ast.IfStatement(expression, body, elseBody, if_.span);
        }

        const return_ = this.consumeToken(Token.TOKEN_KEYWORD_RETURN);

        if (return_) {
            // Optional
            const expression = this.expression();

            return new ast.ReturnStatement(expression, return_.span);
        }

        const spawn = this.consumeToken(Token.TOKEN_KEYWORD_SPAWN);

        if (spawn) {
            this.expectToken(Token.TOKEN_PAREN_L, "Expected '('");
            const expression = this.expectRule(this.expression, "expression");
            this.expectToken(Token.TOKEN_PAREN_R, "Expected ')'");

            const body = this.block();

            return new ast.SpawnStatement(expression, body, spawn.span);
        }

        const typeDecl = this.typeDeclaration();

        if (typeDecl) {
            return typeDecl;
        }

        const var_ = this.varStatement();

        if (var_) {
            return var_;
        }

        const expr = this.expression();

        if (expr) {
            const assignment = this.consumeToken(Token.TOKEN_EQUAL);

            if (assignment) {
                const value = this.expectRule(this.expression);

                return new ast.AssignmentStatement(expr, value, assignment.span);
            }

            const minusAssignment = this.consumeToken(Token.TOKEN_MINUS_EQUAL);

            if (minusAssignment) {
                const value = this.expectRule(this.expression);

                return new ast.MinusAssignmentStatement(expr, value, minusAssignment.span);
            }

            const plusAssignment = this.consumeToken(Token.TOKEN_PLUS_EQUAL);

            if (plusAssignment) {
                const value = this.expectRule(this.expression);

                return new ast.PlusAssignmentStatement(expr, value, plusAssignment.span);
            }

            return new ast.ExpressionStatement(expr, expr.span);
        }
    }

    tupleTypeExpression() {
        const begin = this.consumeToken(Token.TOKEN_PAREN_L)

        if (!begin) {
            return null;
        }

        const items = [];

        if (this.consumeToken(Token.TOKEN_NEWLINE)) {
            // Multi-line declaration
            this.expectToken(Token.TOKEN_BLOCK_BEGIN);

            for (;;) {
                this.consumeNewlines();

                const item = this.typeWithOptionalName();

                if (!item)
                    break;

                items.push(item);

                this.expectToken(Token.TOKEN_NEWLINE, "Expected declaration or ')'");
            }

            this.expectToken(Token.TOKEN_BLOCK_END);
            // FIXME: Eat the fake newline produced by Lexer after TOKEN_BLOCK_END (fix this hack)
            this.consumeNewlines();
        }
        else {
            for (;;) {
                this.consumeNewlines();

                const item = this.typeWithOptionalName();

                if (!item)
                    break;

                items.push(item);

                this.consumeNewlines();

                if (!this.consumeToken(Token.TOKEN_COMMA))
                    break;
            }
        }

        this.expectToken(Token.TOKEN_PAREN_R);

        return new ast.TupleType(items, begin.span);
    }

    typeDeclaration() {
        const type = this.consumeToken(Token.TOKEN_KEYWORD_TYPE);

        if (!type) {
            return null;
        }

        const name = this.expectRule(this.typeName, 'type name');

        let expr = null;

        if (this.consumeToken(Token.TOKEN_EQUAL)) {
            expr = this.expectRule(this.typeDeclarationExpression, 'type specification');
        }

        return new ast.TypeDeclarationStatement(name, expr, type.span);
    }

    typeDeclarationExpression() {
        const tuple = this.tupleTypeExpression();

        if (tuple) {
            return tuple;
        }

        return null;
    }

    typeExpression() {
        const pointer = this.consumeToken(Token.TOKEN_AND) || this.consumeToken(Token.TOKEN_ASTERISK);

        if (pointer) {
            const restOfType = this.expectRule(this.typeExpression);
            return new ast.PointerType(restOfType, pointer.span);
        }

        return this.typeName();
    }

    typeName() {
        const tok = this.consumeToken(Token.TOKEN_IDENT);

        if (tok)
            return new ast.TypeName(tok.value, tok.span);

        return null;
    }

    unit() {
        const body = this.blockBare();

        return new ast.Unit(this.lexed.unitName, body);
    }

    // var/type/name
    // (type is optional)
    varStatement() {
        const var_ = this.consumeToken(Token.TOKEN_KEYWORD_VAR);

        if (!var_)
            return null;

        const name = this.expectRule(this.identifier);

        this.expectToken(Token.TOKEN_EQUAL);

        const value = this.expectRule(this.expression);

        return new ast.VarStatement(name, value, var_.span);
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
