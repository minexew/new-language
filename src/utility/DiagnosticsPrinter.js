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

    const lineStart = (start.line > 1) ? (nthIndex(source, '\n', start.line - 1) + 1) : 0;
    const lineEnd = source.indexOf('\n', lineStart + 1);

    const line = source.slice((lineStart >= 0) ? lineStart : 0,
            (lineEnd >= 0 ? lineEnd : source.length));

    let indent = '';

    // Copy whitespace from beginning of line until start of span to achieve proper alignment
    // Tabs & spaces are kept, everything else is replaced with spaces

    // We can't do the same for the carets; while '\t' = TabWidth * ' ', there is no way to encode TabWidth * '^'

    for (let i = 0; 1 + i < start.column; i++) {
        if (line[i] === '\t' || line[i] === ' ')
            indent += line[i];
        else
            indent += ' ';
    }

    let numColumns;

    if (start.unit === end.unit && start.line === end.line)
        numColumns = end.column - start.column + 1;
    else
        numColumns = 1;

    return [line, indent + '^'.repeat(numColumns)];
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
