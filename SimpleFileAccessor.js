const fs = require('fs');

class SimpleFileAccessor {
    getFileContentsAsString(path) {
        console.log('[SimpleFileAccessor]', 'read', path);
        const file = fs.readFileSync(path);
        //console.log(file);
        return file.toString();
    }
}

module.exports = SimpleFileAccessor;
