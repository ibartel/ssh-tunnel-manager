var pathExtra = require('path-extra'),
    path = require('path'),
    yaml = require('js-yaml'),
    fs = require('fs'),
    Q = require('q'),
    _ = require('lodash');

module.exports = ConfigManager;

var CONFIG_NAME = 'tunnel-manager.yml',
    CONFIG_PATH = pathExtra.datadir('tunnel-manager');

function ConfigManager() {
    var options = {
            connection: {
                reconnect: true,
                reconnectDelay: 10000,
                reconnectTries: 10,
                tryKeyboard: true,
                defaultPort: 22
            }
        },
        configFile = CONFIG_PATH + path.sep + CONFIG_NAME,
        rawConfig = {},
        customVars = {};

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

    this.setVar = function(val) {
        if (val.indexOf(':') === -1) {
            return Q.reject("Variable must be in format VAR:VALUE");
        }
        var varAndVal = val.split(':'),
            variable = varAndVal[0] && varAndVal[0].trim(),
            value = varAndVal[1] && varAndVal[1].trim();

        if (!variable || !value) {
            return Q.reject("Variable must be in format VAR:VALUE");
        }

        customVars[variable] = value;
        return val;
    };

    this.customVars = customVars;

    if (!fs.existsSync(CONFIG_PATH)) {
        try {
            fs.mkdirSync(CONFIG_PATH);
            rawConfig = processConfig(rawConfig);
            this.config = new ConfigHolder(rawConfig);
        } catch (ex) {
            throw new Error("Could not create config directory: " + CONFIG_PATH);
        }
    } else {
        this.readConfig();
        this.config = new ConfigHolder(rawConfig);
    }

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
    };

    this.removeConnectionProfile = function(name) {
        if (config.connectionProfiles[name]) {
            delete config.connectionProfiles[name];
        }
    };

    // tunnel and tunnel groups
    this.getTunnelgroups = function() {
        return _.keys(config.tunnelGroups);
    };

    this.getTunnels = function(group) {
        return config.tunnelGroups[group] ? _.keys(config.tunnelGroups[group]) : null;
    };

    this.getTunnel = function(group, name) {
        if (!group || !name || !config.tunnelGroups[group] || !config.tunnelGroups[group][name]) {
            return null;
        }
        var tunnelString = config.tunnelGroups[group][name];
        var tunnelArr = tunnelString.split(':');
        if (tunnelArr && tunnelArr.length === 3) {
            return {sourcePort: tunnelArr[0], host: tunnelArr[1], destPort: tunnelArr[2] };
        }
        return null;
    };
}
