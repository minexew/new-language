class TokenSerializer {
    // convert to a more compact representation
    static serializeList(tokens) {
        let lastUnit;

        const formatUnit = (unit) => {
            if (unit != lastUnit) {
                if (unit.indexOf(';') !== -1)
                    throw RuntimeError("Forbidden character in unit name.");

                lastUnit = unit;
                return unit;
            }
            else
                return '';
        };

        const formatSpan = (span) => {
            let str = formatUnit(span[0].unit) + ';' + span[0].line + ';' + span[0].column + ';' +
                    formatUnit(span[1].unit) + ';' + span[1].line + ';' + span[1].column;
            return str;
        }

        return tokens.map((token) => {
            return [token.type, token.indent, token.value, formatSpan(token.span)];
        });
    }
}

module.exports = TokenSerializer;
