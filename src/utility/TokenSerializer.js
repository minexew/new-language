const SpanSerializer = require('./SpanSerializer');

class TokenSerializer {
    // convert to a more compact representation
    static serializeList(tokens) {
        const ss = new SpanSerializer();

        return tokens.map((token) => {
            return [token.type, token.value, ss.serializeSpan(token.span)];
        });
    }
}

module.exports = TokenSerializer;
