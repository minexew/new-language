class Token {
    constructor(type, value, span) {
        this.type = type;
        this.value = (value !== undefined) ? value : null;      // TODO: is this good?
        this.span = span;
    }
}

Token.TOKEN_BLOCK_BEGIN =   'BLOCK_BEGIN';          // indent increase or '{'
Token.TOKEN_BLOCK_END =     'BLOCK_END';            // indent decrease or '}'
Token.TOKEN_COMMA =         'COMMA';
Token.TOKEN_COMMENT =       'COMMENT';              // not emitted at this point (should be optional)
Token.TOKEN_DOT =           'DOT';
Token.TOKEN_EQUAL =         'EQUAL';
Token.TOKEN_EXCLAMATION =   'EXCLAMATION';
Token.TOKEN_IDENT =         'IDENT';
Token.TOKEN_INTEGER =       'INTEGER';
Token.TOKEN_NEWLINE =       'NEWLINE';              // actual newline or ';'
Token.TOKEN_PAREN_L =       'PAREN_L';
Token.TOKEN_PAREN_R =       'PAREN_R';
Token.TOKEN_SHIFT_L =       'SHIFT_L';
Token.TOKEN_SLASH =         'SLASH';                // TODO: as it turns out, not all slashes are equivalent (whitespace matters)
Token.TOKEN_STRING_DQ =     'STRING_DQ';            // "string"
Token.TOKEN_STRING_SQ =     'STRING_SQ';            // 'string'

module.exports = Token;
