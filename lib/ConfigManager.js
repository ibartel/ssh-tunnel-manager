var path = require('path-extra'),
    fs = require('fs'),
    _ = require('underscore');

module.exports = ConfigManager;

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

function ConfigManager(options) {
    var options = _.extend({}, defaultOptions, options),
        configPath = path.datadir('tunnel-manager'),
        configFile = configPath + require('path').sep + options.configName,
        rawConfig = {};


    this.readConfig = function(path) {
        try {
            rawConfig = JSON.parse(fs.readFileSync(path || configFile, 'utf8'));
        } catch (ex) {
            console.error("Could not read configuration file '" + (path || configFile) + "'");
            rawConfig = {};
        }

        if (!rawConfig.connectionProfiles) {
            rawConfig.connectionProfiles = {"default": {}};
        }
        if (!rawConfig.tunnelGroups) {
            rawConfig.tunnelGroups = {};
        }
    };

    this.writeConfig = function(path) {
        try {
            fs.writeFileSync(path || configFile, JSON.stringify(rawConfig, null, 4), 'utf8');
        } catch (ex) {
            console.error("Could not write config file '" + (path || configFile) + "'");
        }
    }

    if (!fs.existsSync(configPath)) {
        try {
            fs.mkdirSync(configPath);
        } catch (ex) {
            throw new Error("Could not create config directory: " + configPath);
        }
    } else {
        this.readConfig();
    }

    this.config = new ConfigHolder(this, rawConfig);


}

function ConfigHolder(service, config) {

    this.defaultSshProfile = function() {
        return config.connectionProfiles.default ? config.connectionProfiles.default : null;
    };

    this.getSshProfiles = function() {
        return Object.keys(config.connectionProfiles);
    };

    this.getSshProfile = function(profile) {
        return config.connectionProfiles[profile] ? config.connectionProfiles[profile] : null;
    };

    this.addSshProfile = function(name, profile) {
        if (profile && profile.host && profile.user) {
            config.connectionProfiles[name] = profile;
        }
    }

}