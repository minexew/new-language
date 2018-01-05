class Token {
    constructor(type, indent, value, span) {
        this.type = type;
        this.indent = indent;
        this.value = value || null;
        this.span = span;
    }
}

Token.TOKEN_COMMA =         'COMMA';
Token.TOKEN_COMMENT =       'COMMENT';
Token.TOKEN_DOT =           'DOT';
Token.TOKEN_EQUAL =         'EQUAL';
Token.TOKEN_EXCLAMATION =   'EXCLAMATION';
Token.TOKEN_IDENT =         'IDENT';
Token.TOKEN_NEWLINE =       'NEWLINE';
Token.TOKEN_PAREN_L =       'PAREN_L';
Token.TOKEN_PAREN_R =       'PAREN_R';
Token.TOKEN_SHIFT_L =       'SHIFT_L';
Token.TOKEN_SLASH =         'SLASH';
Token.TOKEN_STRING =        'STRING';
Token.TOKEN_STRING2 =       'STRING2';

module.exports = Token;
