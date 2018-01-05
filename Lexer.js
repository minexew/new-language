const TOKEN_COMMA =         'COMMA';
const TOKEN_COMMENT =       'COMMENT';
const TOKEN_DOT =           'DOT';
const TOKEN_EQUAL =         'EQUAL';
const TOKEN_EXCLAMATION =   'EXCLAMATION';
const TOKEN_IDENT =         'IDENT';
const TOKEN_NEWLINE =       'NEWLINE';
const TOKEN_PAREN_L =       'PAREN_L';
const TOKEN_PAREN_R =       'PAREN_R';
const TOKEN_SHIFT_L =       'SHIFT_L';
const TOKEN_SLASH =         'SLASH';
const TOKEN_STRING =        'STRING';
const TOKEN_STRING2 =       'STRING2';

class SourcePoint {
    constructor(unit, line, column, byteOffset) {
        this.unit = unit;
        this.line = line;
        this.column = column;
        this.byteOffset = byteOffset;
    }

    toString() {
        return this.unit + ':' + this.line + ':' + this.column;
    }
}

// --------------------------------------------------------------------------

function isident(c) {
    return /^[a-zA-Z0-9_]$/.test(c);
}

class Lexer {
    constructor(unitName, source, displayErrors /* to be replaced with an ErrorSink */) {
        this.unitName = unitName;
        this.source = source;
        this.displayErrors = (displayErrors === undefined ? true : displayErrors);

        this.pos = 0;
        this.end = this.source.length;

        this.point = new SourcePoint(unitName, 1, 0, 0);
        this.nextPoint = new SourcePoint(unitName, 1, 1, 0);

        // indent counts number of leading spaces
        // it is cleared to null after a token is parsed
        // it is reset to 0 on new line
        this.indent = 0;

        this.hackConsumePreprocessorDirectives();
    }

    emitToken(type, span, value) {
        const token = {type: type, span: span, indent: this.indent, value: value};

        //console.log(token.type, token.span);
        //console.log('(indent', token.this.indent, ')', token.value);

        this.indent = null;
        return token;
    }

    hackConsumePreprocessorDirectives() {
        // A bit hacky, just like the C preprocessor itself
        while (this.nextPoint.column == 1 && this.source[this.pos] == '#') {
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
                    1,
                    lineEndIndex);      // FIXME: this is NOT correct
        }
    }

    parseError(what, point) {
        if (!point)
            point = this.point;

        const start = this.source.lastIndexOf('\n', this.pos);
        const end = this.source.indexOf('\n', this.pos);
        const preview = this.source.slice((start >= 0) ? start : 0,
                (end >= 0 ? end : this.source.length));

        if (this.displayErrors) {
            console.log(point.toString() + ': error: ' + what);
            console.log(preview);
            console.log(' '.repeat(point.column - 1) + '^');
        }

        throw new Error('Parse error at ' + point.toString() + ': ' + what);
    }

    read() {
        this.point = this.nextPoint;

        if (this.source[this.pos] === '\n') {
            this.nextPoint = new SourcePoint(
                    this.nextPoint.unit,
                    this.nextPoint.line + 1,
                    1,
                    this.nextPoint.byteOffset + 1);
        }
        else {
            this.nextPoint = new SourcePoint(
                    this.nextPoint.unit,
                    this.nextPoint.line,
                    this.nextPoint.column + (this.source[this.pos] === '\t' ? 8 : 1),
                    this.nextPoint.byteOffset + 1);
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
        return this.doParseToken();
    }

    doParseToken() {
        while (this.pos < this.end) {
            const start = this.nextPoint;

            if (this.readChar('\n')) {
                this.indent = 0;

                this.hackConsumePreprocessorDirectives();
            }
            else if (this.readSequence('/*')) {
                let comment = '';
                let depth = 1;

                while (this.pos < this.end) {
                    if (this.readSequence('/*')) {
                        depth++;
                    }
                    else if (this.readSequence('*/')) {
                        if (--depth == 0)
                            break;
                    }

                    comment += this.read();
                }

                // FIXME: check for EOF

                return this.emitToken(TOKEN_COMMENT, [start, this.point], comment);
            }
            else if (this.readSequence('//')) {
                let comment = '';

                while (this.pos < this.end && this.source[this.pos] !== '\n') {
                    comment += this.read();
                }

                return this.emitToken(TOKEN_COMMENT, [start, this.point], comment);
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

                if (this.source[this.pos] == '"' && !wasEscape) {
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

            return this.emitToken(TOKEN_STRING, [start, this.point], literal);
        }
        else if (this.readChar("'")) {
            let literal = '';
            let wasEscape = false;

            for (;;) {
                if (this.pos >= this.end) {
                    this.parseError("Reached end of input while parsing a string literal");
                }

                let wasEscapeNew = false;

                if (this.source[this.pos] == "'" && !wasEscape) {
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

            return this.emitToken(TOKEN_STRING2, [start, this.point], literal);
        }

        // Identifier
        if (isident(this.source[this.pos])) {
            let ident = "";

            while (this.pos < this.end && isident(this.source[this.pos])) {
                ident += this.read();
            }

            return this.emitToken(TOKEN_IDENT, [start, this.point], ident);
        }

        const literalTokens = {
            TOKEN_COMMA:        ',',
            TOKEN_DOT:          '.',
            TOKEN_EQUAL:        '=',
            TOKEN_EXCLAMATION:  '!',
            TOKEN_PAREN_L:      '(',
            TOKEN_PAREN_R:      ')',
            TOKEN_SHIFT_L:      '<<',
            TOKEN_SLASH:        '/',
        };

        for (const type in literalTokens) {
            if (literalTokens.hasOwnProperty(type)) {
                if (this.readSequence(literalTokens[type]))
                    return this.emitToken(type, [start, this.point]);
            }
        }

        this.parseError('Unexpected character', start);
    }
}

module.exports = Lexer;
