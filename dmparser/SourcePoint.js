class SourcePoint {
    constructor(unit, line, column) {
        this.unit = unit;
        this.line = line;
        this.column = column;
    }

    toString() {
        return this.unit + ':' + this.line + ':' + this.column;
    }
}

module.exports = SourcePoint;
