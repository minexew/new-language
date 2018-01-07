const SourcePoint = require('./SourcePoint');
const Token = require('./Token');

// --------------------------------------------------------------------------

function isident(c) {
    return /^[a-zA-Z0-9_]$/.test(c);
}

function isnumeric(c) {
    return /^[0-9]$/.test(c);
}

class Lexer {
    constructor(unitName, source, diagnosticsSink, options) {
        this.unitName = unitName;
        this.source = source;
        this.diag = diagnosticsSink;

        this.options = Object.assign({
            coalesceNewlines: false,
        }, options);

        // Sometimes we need to emit more or less than one token, so to be general, everything goes through a FIFO queue
        this.tokenBacklog = [];

        this.pos = 0;
        this.end = this.source.length;

        this.point = new SourcePoint(unitName, 1, 0);
        this.nextPoint = new SourcePoint(unitName, 1, 1);

        // indent counts number of leading spaces
        // it is cleared to null after a token is parsed
        // it is reset to 0 on new line

        // Whenever a token is emitted and current indent is non-null (every first token on a line), indent is compared
        // to lastIndent, BLOCK_BEGIN/END is emitted and lastIndent is updated
        this.indent = 0;
        this.lastIndent = 0;

        this.indentUsed = undefined;
        this.indentSpaces = undefined;
        this.lastTokenWasNewline = false;
    }

    consumePreprocessorDirectives() {
        // A bit hacky, just like the C preprocessor itself
        while (this.nextPoint.column === 1 && this.source[this.pos] === '#') {
            let lineEndIndex = this.source.indexOf('\n', this.pos + 1);

            if (lineEndIndex === -1)
                lineEndIndex = this.source.length;

            const directive = this.source.slice(this.pos, lineEndIndex);
            //console.log(directive);

            // per https://gcc.gnu.org/onlinedocs/cpp/Preprocessor-Output.html
            const linemarker_re = /# (\d+) "([^"]+)" (\d+)/i;
            const [full, line, unit, flags] = directive.match(linemarker_re);
            //console.log([full, line, unit, flags]);

            this.pos = lineEndIndex + 1;
            this.nextPoint = new SourcePoint(
                unit,
                parseInt(line),
                1);
        }
    }

    emitToken(type, span, value) {
        let coalescedNewline = false;

        if (type === Token.TOKEN_NEWLINE) {
            // Newline is a special snowflake. It never begins/ends a block on its own, its span is set to null
            // (at least for now), and it resets indent to zero.

            // Handling it here is a bit dirty, but seems to cause the least code ugliness.

            if (this.options.coalesceNewlines && this.lastTokenWasNewline) {
                coalescedNewline = true;
            }

            this.lastTokenWasNewline = true;
        }
        else {
            this.lastTokenWasNewline = false;

            if (this.indent !== null) {
                while (this.indent > this.lastIndent) {
                    this.tokenBacklog.push(new Token(Token.TOKEN_BLOCK_BEGIN));         // TODO: do we care about span?
                    this.lastIndent++;
                }

                while (this.indent < this.lastIndent) {
                    this.tokenBacklog.push(new Token(Token.TOKEN_BLOCK_END));           // TODO: do we care about span?
                    this.lastIndent--;

                    // FIXME: The following is a hack. First, consider the following example:
                    //
                    // if (expr)
                    //     a()
                    // b()
                    //
                    // In this example, after a(), NEWLINE will be emitted followed by BLOCK_END and IDENT('b').
                    // However, the parser needs NEWLINEs to tell apart statements within a block. If the NEWLINE comes
                    // before BLOCK_END, it will be eaten by the 'if' statement code, and the parser will reject the
                    // following statement. (because it can't find a suitable separator)
                    // To remedy this, we insert another dummy NEWLINE token after each BLOCK_END. This is not
                    // necessary at the end of the file, because there are no further statements.
                    //
                    // A proper solution will involve some sort of look-ahead when emitting NEWLINES, so that the
                    // BLOCK_END token comes as early as possible.
                    // It might be sufficient to buffer newlines until another token is emitted, and if it is BLOCK_END,
                    // swap the two.
                    //
                    // Another solution would be modifying Parser code for block(), so that it doesn't require NEWLINE
                    // after block statements. That doesn't make much sense, though. The block really doesn't continue
                    // past the newline.
                    this.tokenBacklog.push(new Token(Token.TOKEN_NEWLINE));
                }
            }
        }

        if (!coalescedNewline) {
            const token = new Token(type, value, span);
            //console.log(token.type, token.span);
            //console.log('(indent', token.this.indent, ')', token.value);

            this.tokenBacklog.push(token);
        }

        this.indent = null;
    }

    parseError(what, point) {
        if (!point)
            point = this.point;

        this.diag.error(what, point);
        throw new Error(what);
    }

    read() {
        this.point = this.nextPoint;

        if (this.source[this.pos] === '\n') {
            this.nextPoint = new SourcePoint(
                    this.nextPoint.unit,
                    this.nextPoint.line + 1,
                    1);
        }
        else {
            this.nextPoint = new SourcePoint(
                    this.nextPoint.unit,
                    this.nextPoint.line,
                    this.nextPoint.column + 1);
        }

        return this.source[this.pos++];
    }

    // TODO: just drop this in favor of readSequence
    readChar(what) {
        if (this.pos < this.end && this.source[this.pos] === what) {
            this.read();
            return true;
        }
        else
            return false;
    }

    // TODO: rename to `match`
    readSequence(what) {
        if (this.pos + what.length <= this.end
                && this.source.slice(this.pos, this.pos + what.length) === what) {
            for (let i = 0; i < what.length; i++)
                this.read();

            return true;
        }
        else
            return false;
    }

    readToken() {
        // If FIFO is empty, attempt to fill it up
        while (this.tokenBacklog.length < 1) {
            if (this.pos < this.end)
                this.doParseToken();
            else {
                if (this.lastIndent > 0) {
                    this.tokenBacklog.push(new Token(Token.TOKEN_BLOCK_END));           // TODO: do we care about span?
                    this.lastIndent--;
                }
                else
                    return null;
            }
        }

        // Pop the first item in the FIFO
        return this.tokenBacklog.splice(0, 1)[0];
    }

    doParseToken() {
        this.consumePreprocessorDirectives();

        while (this.pos < this.end) {
            const start = this.nextPoint;

            if (this.readChar('\n')) {
                this.emitToken(Token.TOKEN_NEWLINE);      // TODO: do we care about span?
                this.indent = 0;
                return;
            }
            else if (this.readSequence('/*')) {
                let comment = '';
                let depth = 1;

                while (this.pos < this.end) {
                    if (this.readSequence('/*')) {
                        depth++;
                    }
                    else if (this.readSequence('*/')) {
                        if (--depth === 0)
                            break;
                    }

                    comment += this.read();
                }

                // FIXME: check for EOF

                return this.emitToken(Token.TOKEN_COMMENT, [start, this.point], comment);
            }
            else if (this.readSequence('//')) {
                let comment = '';

                while (this.pos < this.end && this.source[this.pos] !== '\n') {
                    comment += this.read();
                }

                return this.emitToken(Token.TOKEN_COMMENT, [start, this.point], comment);
            }
            else if (this.readChar(' ')) {
                if (this.indent !== null) {
                    if (this.indentUsed === '\t')
                        this.parseError('Inconsistent indentation -- mixing tabs and spaces');
                    else
                        this.indentUsed = ' ';

                    if (this.indentSpaces === undefined) {
                        // Learn indentation depth

                        this.indentSpaces = 1;

                        while (this.readChar(' '))
                            this.indentSpaces++;
                    }
                    else {
                        for (let i = 1; i < this.indentSpaces; i++) {
                            if (!this.readChar(' '))
                                this.parseError('Inconsistent indentation');
                        }
                    }

                    this.indent++;
                }
            }
            else if (this.readChar('\t')) {
                if (this.indent !== null) {
                    if (this.indentUsed === ' ')
                        this.parseError('Inconsistent indentation -- mixing tabs and spaces');
                    else
                        this.indentUsed = '\t';

                    this.indent++;
                }
            }
            else if (!this.readChar('\r'))
                break;
        }

        if (this.pos >= this.end)
            return null;

        const start = this.nextPoint;
        
        const literalTokens = new Map([
            // keywords
            [Token.TOKEN_KEYWORD_AS,        'as'],
            [Token.TOKEN_KEYWORD_CONST,     'const'],
            [Token.TOKEN_KEYWORD_DEL,       'del'],
            [Token.TOKEN_KEYWORD_FOR,       'for'],
            [Token.TOKEN_KEYWORD_IF,        'if'],
            [Token.TOKEN_KEYWORD_IN,        'in'],
            [Token.TOKEN_KEYWORD_NEW,       'new'],
            [Token.TOKEN_KEYWORD_PROC,      'proc'],
            [Token.TOKEN_KEYWORD_RETURN,    'return'],
            [Token.TOKEN_KEYWORD_SET,       'set'],
            [Token.TOKEN_KEYWORD_TMP,       'tmp'],
            [Token.TOKEN_KEYWORD_VAR,       'var'],
            [Token.TOKEN_KEYWORD_VERB,      'verb'],

            // multi-character tokens
            [Token.TOKEN_DOT_DOT,           '..'],
            [Token.TOKEN_LOGIC_AND,         '&&'],
            [Token.TOKEN_LOGIC_OR,          '||'],
            [Token.TOKEN_MINUS_MINUS,       '--'],
            [Token.TOKEN_PLUS_PLUS,         '++'],
            [Token.TOKEN_SHIFT_L,           '<<'],

            // single-character tokens
            [Token.TOKEN_BLOCK_BEGIN,       '{'],
            [Token.TOKEN_BLOCK_END,         '}'],
            [Token.TOKEN_COMMA,             ','],
            [Token.TOKEN_DOT,               '.'],
            [Token.TOKEN_EQUAL,             '='],
            [Token.TOKEN_EXCLAMATION,       '!'],
            [Token.TOKEN_MINUS,             '-'],
            [Token.TOKEN_NEWLINE,           ';'],
            [Token.TOKEN_PAREN_L,           '('],
            [Token.TOKEN_PAREN_R,           ')'],
            [Token.TOKEN_PLUS,              '+'],
            [Token.TOKEN_SLASH,             '/'],
        ]);

        for (const type of literalTokens.keys()) {
            if (this.readSequence(literalTokens.get(type)))
                return this.emitToken(type, [start, this.point]);
        }

        // String literal
        if (this.readChar('"')) {
            let literal = '';
            let wasEscape = false;

            for (;;) {
                if (this.pos >= this.end) {
                    this.parseError("Reached end of input while parsing a string literal");
                }

                let wasEscapeNew = false;

                if (this.source[this.pos] === '"' && !wasEscape) {
                    this.read();
                    break;
                }

                if (this.source[this.pos] === '\\' && !wasEscape)
                    wasEscapeNew = true;
                else if ( wasEscape && this.source[this.pos] === 't' )
                    literal += '\t';
                else if ( wasEscape && this.source[this.pos] === 'n' )
                    literal += '\n';
                else
                    literal += this.source[this.pos];

                wasEscape = wasEscapeNew;
                this.read();
            }

            return this.emitToken(Token.TOKEN_STRING_DQ, [start, this.point], literal);
        }
        else if (this.readChar("'")) {
            let literal = '';
            let wasEscape = false;

            for (;;) {
                if (this.pos >= this.end) {
                    this.parseError("Reached end of input while parsing a string literal");
                }

                let wasEscapeNew = false;

                if (this.source[this.pos] === "'" && !wasEscape) {
                    this.read();
                    break;
                }

                if (this.source[this.pos] === '\\' && !wasEscape)
                    wasEscapeNew = true;
                else if ( wasEscape && this.source[this.pos] === 't' )
                    literal += '\t';
                else if ( wasEscape && this.source[this.pos] === 'n' )
                    literal += '\n';
                else
                    literal += this.source[this.pos];

                wasEscape = wasEscapeNew;
                this.read();
            }

            return this.emitToken(Token.TOKEN_STRING_SQ, [start, this.point], literal);
        }

        // Numeric
        if (isnumeric(this.source[this.pos])) {
            let integer = "";

            while (this.pos < this.end && (isnumeric(this.source[this.pos]) || this.source[this.pos] === '.')) {
                if (this.source[this.pos] === '.')
                    this.parseError("Decimals are not yet supported");

                integer += this.read();
            }

            return this.emitToken(Token.TOKEN_INTEGER, [start, this.point], parseInt(integer));
        }

        // Identifier
        if (isident(this.source[this.pos])) {
            let ident = "";

            while (this.pos < this.end && isident(this.source[this.pos])) {
                ident += this.read();
            }

            return this.emitToken(Token.TOKEN_IDENT, [start, this.point], ident);
        }

        this.parseError('Unexpected character', start);
    }
}

module.exports = Lexer;
