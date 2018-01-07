class DiagnosticsLogger {
    constructor() {
        this.events = [];
    }

    error(what, pointOrSpan) {
        this.events.push(['error', what, pointOrSpan]);
    }

    errorGlobal(what) {
        this.events.push(['errorGlobal', what]);
    }

    warnGlobal(what) {
        this.events.push(['warnGlobal', what]);
    }
}

module.exports = DiagnosticsLogger;
