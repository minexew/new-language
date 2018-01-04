const fs = require('fs');

class TestUtil {
    static async loadJsonFromFile(path) {
        const text = fs.readFileSync(path);

        return JSON.parse(text);
    }

    static async dumpJson(path, data, pretty) {
        fs.writeFileSync(path, JSON.stringify(data, undefined, pretty ? 2 : undefined));
    }
}

module.exports = TestUtil;
