class DiagnosticsDevNull {
    error(what, pointOrSpan) {}
    errorGlobal(what) {}
    warnGlobal(what) {}
}

module.exports = DiagnosticsDevNull;
