class SpanSerializer {
    constructor() {
        this.lastUnit = null;
    }

    formatUnit(unit) {
        if (unit !== this.lastUnit) {
            if (unit.indexOf(';') !== -1)
                throw Error("Forbidden character in unit name.");

            this.lastUnit = unit;
            return unit;
        }
        else
            return '';
    }

    serializeSpan(span) {
        // TODO: might want to enforce that span is at least `null`, but not `undefined`
        if (!span)
            return null;
        else
            return this.formatUnit(span[0].unit) + ';' + span[0].line + ';' + span[0].column + ';' +
                this.formatUnit(span[1].unit) + ';' + span[1].line + ';' + span[1].column;
    }
}

module.exports = SpanSerializer;
