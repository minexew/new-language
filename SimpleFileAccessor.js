const fs = require('fs');

const {promisify} = require('util');

const readFileAsync = promisify(fs.readFile);

class SimpleFileAccessor {
    async getFileContentsAsString(path) {
        console.log('[SimpleFileAccessor]', 'read', path);
        const file = await readFileAsync(path);
        //console.log(file);
        return file.toString();
    }
}

module.exports = SimpleFileAccessor;
