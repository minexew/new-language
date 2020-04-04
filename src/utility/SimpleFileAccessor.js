const fs = require('fs');

const {promisify} = require('util');

const readFileAsync = promisify(fs.readFile);

class SimpleFileAccessor {
    constructor() {
        this.cache = {};
    }

    async getFileContentsAsString(path) {
        if (!this.cache.hasOwnProperty(path)) {
            //console.log('[SimpleFileAccessor]', 'read', path);
            const file = await readFileAsync(path);
            //console.log(file);
            this.cache[path] = file.toString();
        }

        return this.cache[path];
    }

    getFileContentsAsStringCached(path) {
        if (this.cache.hasOwnProperty(path))
            return this.cache[path];
        else
            throw new Error('File is not available in cache.');
    }
}

module.exports = SimpleFileAccessor;
