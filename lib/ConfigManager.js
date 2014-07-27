var path = require('path-extra'),
    yaml = require('js-yaml'),
    fs = require('fs'),
    _ = require('lodash');

module.exports = ConfigManager;

var CONFIG_FILE_NAME = 'tunnel-manager.yml',
    defaultOptions = {
        connection: {
            reconnect: true,
            reconnectDelay: 10000,
            reconnectTries: 10,
            tryKeyboard: true,
            defaultPort: 22
        }
    };

function ConfigManager() {
    var options = _.extend({}, defaultOptions),
        configPath = path.datadir('tunnel-manager'),
        configFile = configPath + require('path').sep + CONFIG_FILE_NAME,
        rawConfig = {};


    this.readConfig = function(path) {
        try {
            rawConfig = yaml.safeLoad(fs.readFileSync(path || configFile, 'utf8'));
            rawConfig = processConfig(rawConfig || {});
        } catch (ex) {
            rawConfig = processConfig({});
            this.writeConfig();
        }
    };

    processConfig = function(rawConfig) {
        var result = _.extend({}, rawConfig);
        if (!rawConfig.connectionProfiles) {
            result.connectionProfiles = {};
        }
        if (!rawConfig.tunnelGroups) {
            result.tunnelGroups = {};
        }
        if (!rawConfig.options) {
            result.options = options;
        }
        return result;
    };

    this.writeConfig = function(path) {
        try {
            fs.writeFileSync(path || configFile, yaml.safeDump(rawConfig, {indent: 4}), 'utf8');
        } catch (ex) {
            console.error("Could not write config file '" + (path || configFile) + "'");
        }
    };

    if (!fs.existsSync(configPath)) {
        try {
            fs.mkdirSync(configPath);
            processConfig(rawConfig);

        } catch (ex) {
            throw new Error("Could not create config directory: " + configPath);
        }
    } else {
        this.readConfig();
    }

    this.config = new ConfigHolder(rawConfig);


}

function ConfigHolder(config) {

    this.connection = config.options.connection;

    this.defaultConnectionProfile = function() {
        var result = null;
        Object.keys(config.connectionProfiles).forEach(function(key) {
            if (config.connectionProfiles[key]["default"] === true) {
                result = config.connectionProfiles[key];
            }
        });
        return result;
    };

    this.getConnectionProfiles = function() {
        return _.keys(config.connectionProfiles);
    };

    this.getConnectionProfile = function(profile) {
        return config.connectionProfiles[profile] ? config.connectionProfiles[profile] : null;
    };

    this.addConnectionProfile = function(name, profile) {
        if (profile && profile.host && profile.username) {
            config.connectionProfiles[name] = profile;
        }
        console.log(require('./utils').toJson(config));
    };

    this.removeConnectionProfile = function(name) {
        if (config.connectionProfiles[name]) {
            delete config.connectionProfiles[name];
        }
    };

}