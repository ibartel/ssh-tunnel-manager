var pathExtra = require('path-extra'),
    path = require('path'),
    yaml = require('js-yaml'),
    utils = require('./utils'),
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

    this.readTunnelFile = function(path) {
        try {
            return { success: true, data: yaml.safeLoad(fs.readFileSync(path, 'utf8')) };
        } catch (ex) {
            return { success: false, msg: 'Could not read file. Error:', error: ex };
        }
    };

    processConfig = function(rawConfig) {
        var result = utils.clone(rawConfig);
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
        this.config = new ConfigHolder(this, rawConfig);
    }

}

function ConfigHolder(manager, config) {

    this.connection = config.options.connection;

    this.rawTunnelConfig = config.tunnelGroups;

    // ssh connection profile specific

    this.defaultConnectionProfile = function() {
        var result = null;
        Object.keys(config.connectionProfiles).forEach(function(key) {
            if (config.connectionProfiles[key]["default"] === true) {
                result = {name: key, profile: config.connectionProfiles[key] };
            }
        });
        return result;
    };

    this.setDefaultProfile = function(name) {
        var profile = config.connectionProfiles[name];
        if (profile) {
            Object.keys(config.connectionProfiles).forEach(function(profileKey) {
                delete config.connectionProfiles[profileKey]['default'];
            });
            profile.default = true;
            manager.writeConfig();
        }
    };

    this.getConnectionProfiles = function() {
        return Object.keys(config.connectionProfiles);
    };

    this.getConnectionProfile = function(profile) {
        return config.connectionProfiles[profile] ? config.connectionProfiles[profile] : null;
    };

    this.addConnectionProfile = function(name, profile) {
        if (profile && profile.host && profile.username) {
            config.connectionProfiles[name] = profile;
        }
        manager.writeConfig();
    };

    this.removeConnectionProfile = function(name) {
        if (config.connectionProfiles[name]) {
            delete config.connectionProfiles[name];
        }
        manager.writeConfig();
    };

    // tunnel and tunnel groups specific

    this.getTunnelgroups = function() {
        return Object.keys(config.tunnelGroups);
    };

    this.getTunnels = function(group) {
        return config.tunnelGroups[group] ? Object.keys(config.tunnelGroups[group]) : null;
    };

    this.getTunnel = function(group, name) {
        if (!group || !name || !config.tunnelGroups[group] || !config.tunnelGroups[group][name]) {
            return null;
        }
        var tunnelString = this.applyVariables(config.tunnelGroups[group][name]),
            tunnelArr = tunnelString.split(':');

        if (tunnelArr && tunnelArr.length === 3) {
            return {sourcePort: tunnelArr[0], host: tunnelArr[1], destPort: tunnelArr[2] };
        }

        return null;
    };

    this.applyVariables = function(sourceString) {
        var result = sourceString;
        if (manager.customVars && Object.keys(manager.customVars).length) {
            Object.keys(manager.customVars).forEach(function(variable) {
                result = utils.replaceAll('{' + variable + '}', manager.customVars[variable], result);
            });
        }
        return result;
    };

    this.addTunnel = function(group, name, tunnel) {
        if (!config.tunnelGroups[group]) {
            config.tunnelGroups[group] = {};
        }
        config.tunnelGroups[group][name] = tunnel;
        manager.writeConfig();
    };

    this.removeTunnel = function(group, name) {
        if (group && name && config.tunnelGroups[group] && config.tunnelGroups[group][name]) {
            delete config.tunnelGroups[group][name];
        }
        if (group && !name) {
            delete config.tunnelGroups[group];
        }
        if (this.getTunnels(group) && this.getTunnels(group).length === 0) {
            delete config.tunnelGroups[group];
        }
        manager.writeConfig();
    };
}
