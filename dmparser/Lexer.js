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
            if (this.indent !== null) {
                while (this.indent > this.lastIndent) {
                    this.tokenBacklog.push(new Token(Token.TOKEN_BLOCK_BEGIN));         // TODO: do we care about span?
                    this.lastIndent++;
                }

                while (this.indent < this.lastIndent) {
                    this.tokenBacklog.push(new Token(Token.TOKEN_BLOCK_END));           // TODO: do we care about span?
                    this.lastIndent--;
                }
            }

            this.lastTokenWasNewline = false;
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
                    this.nextPoint.column + (this.source[this.pos] === '\t' ? 8 : 1));
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
                if (this.indent !== null)
                    this.parseError('Spaces are currently not allowed for indentation. Please use tabs.')
            }
            else if (this.readChar('\t')) {
                if (this.indent !== null)
                    this.indent++;
            }
            else if (!this.readChar('\r'))
                break;
        }

        if (this.pos >= this.end)
            return null;

        const start = this.nextPoint;

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

        // TODO: Map should be used instead
        const literalTokens = {
            TOKEN_BLOCK_BEGIN:  '{',
            TOKEN_BLOCK_END:    '{',
            TOKEN_COMMA:        ',',
            TOKEN_DOT:          '.',
            TOKEN_EQUAL:        '=',
            TOKEN_EXCLAMATION:  '!',
            TOKEN_NEWLINE:      ';',
            TOKEN_PAREN_L:      '(',
            TOKEN_PAREN_R:      ')',
            TOKEN_SHIFT_L:      '<<',
            TOKEN_SLASH:        '/',
        };

        for (const type in literalTokens) {
            if (literalTokens.hasOwnProperty(type)) {
                if (this.readSequence(literalTokens[type]))
                    return this.emitToken(Token[type], [start, this.point]);
            }
        }

        this.parseError('Unexpected character', start);
    }
}

module.exports = Lexer;
