class Token {
    constructor(type, value, span) {
        this.type = type;
        this.value = (value !== undefined) ? value : null;      // TODO: is this good?
        this.span = span;
    }
}

Token.TOKEN_AND =           'AND';
Token.TOKEN_BLOCK_BEGIN =   'BLOCK_BEGIN';          // indent increase or '{'
Token.TOKEN_BLOCK_END =     'BLOCK_END';            // indent decrease or '}'
Token.TOKEN_COMMA =         'COMMA';
Token.TOKEN_COMMENT =       'COMMENT';              // not emitted at this point (should be optional)
Token.TOKEN_DOT =           'DOT';
Token.TOKEN_DOT_DOT =       'DOT_DOT';
Token.TOKEN_EQUAL =         'EQUAL';
Token.TOKEN_EQUAL_EQUAL =   'EQUAL_EQUAL';
Token.TOKEN_EXCLAMATION =   'EXCLAMATION';
Token.TOKEN_GREATER =       'GREATER';
Token.TOKEN_GREATER_EQUAL = 'GREATER_EQUAL';
Token.TOKEN_IDENT =         'IDENT';
Token.TOKEN_INTEGER =       'INTEGER';
Token.TOKEN_LESS =          'LESS';
Token.TOKEN_LESS_EQUAL =    'LESS_EQUAL';
Token.TOKEN_LOGIC_AND =     'LOGIC_AND';
Token.TOKEN_LOGIC_OR =      'LOGIC_OR';
Token.TOKEN_MINUS =         'MINUS';
Token.TOKEN_MINUS_MINUS =   'MINUS_MINUS';
Token.TOKEN_NEWLINE =       'NEWLINE';              // actual newline or ';'
Token.TOKEN_NOT_EQUAL =     'NOT_EQUAL';
Token.TOKEN_PAREN_L =       'PAREN_L';
Token.TOKEN_PAREN_R =       'PAREN_R';
Token.TOKEN_PIPE =          'PIPE';
Token.TOKEN_PLUS =          'PLUS';
Token.TOKEN_PLUS_PLUS =     'PLUS_PLUS';
Token.TOKEN_SHIFT_L =       'SHIFT_L';
Token.TOKEN_SLASH =         'SLASH';                // TODO: as it turns out, not all slashes are equivalent (whitespace matters)
Token.TOKEN_SQ_BRACKET_L =  'TOKEN_SQ_BRACKET_L';
Token.TOKEN_SQ_BRACKET_R =  'TOKEN_SQ_BRACKET_R';
Token.TOKEN_STRING_DQ =     'STRING_DQ';            // "string"
Token.TOKEN_STRING_SQ =     'STRING_SQ';            // 'string'

Token.TOKEN_KEYWORD_AS =        'KEYWORD_AS';
Token.TOKEN_KEYWORD_CONST =     'KEYWORD_CONST';
Token.TOKEN_KEYWORD_DEL =       'KEYWORD_DEL';
Token.TOKEN_KEYWORD_ELSE =      'KEYWORD_ELSE';
Token.TOKEN_KEYWORD_FOR =       'KEYWORD_FOR';
Token.TOKEN_KEYWORD_IF =        'KEYWORD_IF';
Token.TOKEN_KEYWORD_IN =        'KEYWORD_IN';
Token.TOKEN_KEYWORD_NEW =       'KEYWORD_NEW';
Token.TOKEN_KEYWORD_PROC =      'KEYWORD_PROC';
Token.TOKEN_KEYWORD_RETURN =    'KEYWORD_RETURN';
Token.TOKEN_KEYWORD_SET =       'KEYWORD_SET';
Token.TOKEN_KEYWORD_SPAWN =     'KEYWORD_SPAWN';
Token.TOKEN_KEYWORD_TMP =       'KEYWORD_TMP';
Token.TOKEN_KEYWORD_VAR =       'KEYWORD_VAR';
Token.TOKEN_KEYWORD_VERB =      'KEYWORD_VERB';

module.exports = Token;
