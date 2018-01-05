// https://stackoverflow.com/a/14482123/2524350
function nthIndex(str, pat, n){
    var L= str.length, i= -1;
    while(n-- && i++<L){
        i= str.indexOf(pat, i);
        if (i < 0) break;
    }
    return i;
}

function getSpanPreview(start, end, fileAccessor) {
    const source = fileAccessor.getFileContentsAsStringCached(start.unit);

    const lineStart = (start.line > 1) ? nthIndex(source, '\n', start.line - 1) : 0;
    const lineEnd = source.indexOf('\n', lineStart + 1);

    const preview = source.slice((lineStart >= 0) ? lineStart : 0,
            (lineEnd >= 0 ? lineEnd : source.length));

    let numColumns;

    if (start.unit === end.unit && start.line === end.line)
        numColumns = end.column - start.column + 1;
    else
        numColumns = 1;

    return [preview, ' '.repeat(start.column - 1) + '^'.repeat(numColumns)];
}

class DiagnosticsPrinter {
    constructor(fileAccessor) {
        this.fileAccessor = fileAccessor;
    }

    error(what, pointOrSpan) {
        let start, end;

        if (Array.isArray(pointOrSpan))
            [start, end] = pointOrSpan;
        else
            start = end = pointOrSpan;

        const preview = getSpanPreview(start, end, this.fileAccessor);

        this.line(start.toString() + ': error: ' + what);

        for (const row of preview)
            this.line(row);
    }

    errorGlobal(what) {
        this.line('error: ' + what);
    }

    warnGlobal(what) {
        this.line('warning: ' + what);
    }

    line(text) {
        console.log(text);
    }
}

module.exports = DiagnosticsPrinter;
