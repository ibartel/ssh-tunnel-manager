var path = require('path-extra'),
    fs = require('fs'),
    _ = require('underscore');

module.exports = Config;

var defaultOptions = {
    configName: 'tunnel-manager.conf'
};

var testConfig = {
    "connectionProfiles": {
        "default": {
            "host": "my-chaos.net",
            "user": "sshtest",
            "pass": "test"
        },
        "integra": {
            "host": "qalogin.corp.mobile.de",
            "user": "ibartel"
        },
        "prod": {
            "host": "login.corp.mobile.de",
            "user": "ibartel"
        }
    },
    "tunnelGroups": {
        "testing": {
            "mysql": "3306:localhost:3306",
            "github": "443:github.com:443"
        },
        "replace": {
            "mysql": "3306:localhost{{INTEGRA}}-1:3306"
        }
    }
};

function Config(options) {
    var options = _.extend({}, defaultOptions, options),
        configPath = path.datadir('tunnel-manager'),
        configFile = configPath + require('path').sep + options.configName;

    if (!fs.existsSync(configPath)) {
        try {
            fs.mkdirSync(configPath);
        } catch (ex) {
            throw new Error("Could not create config directory: " + configPath);
        }
    }

    console.log(configFile);

    var rawConfig = {};
    try {
        rawConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch (ex) {
        console.error(ex);
        rawConfig = {};
    }

    console.log(JSON.stringify(rawConfig, null, 4));
}