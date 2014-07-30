var C = require('cli-color'),
    Q = require('q'),
    fs = require('fs'),
    utils = require('../utils');

module.exports = function(configManager) {
    var config = configManager.config;

    return {

        list: function() {
            var profileKeys = config.getConnectionProfiles();
            if (!profileKeys || !profileKeys.length) {
                console.log(C.red("There are no connection profiles yet, use " + utils.appName() + " 'profile add -h' to add a new one"));
            } else {
                console.log("Following SSH connection profiles are configured:");
                profileKeys.forEach(function(profileKey) {
                    var profile = config.getConnectionProfile(profileKey);
                    console.log("  " + C.cyan(profileKey) + " - " + utils.formatProfile(profile));
                });
            }
        },

        add: function(opts, args) {
            if (!args || !args.name || !args.userAndHost) {
                return Q.reject(C.red("Wrong arguments supplied. Usage:\n") + utils.appName() + " profile add <profilename> <user>@<host>, do 'profile add -h' for addtional options");
            }
            var userAndHost = args.userAndHost.split('@');
            var name = args.name,
                profile = {
                    host: userAndHost[1],
                    username: userAndHost[0]
                };

            if (config.getConnectionProfile(name)) {
                return Q.reject("Connection profile with name '" + C.cyan(name) + "' already exists. Remove the old one first with profile remove command");
            }
            if (opts && opts.identity) {
                if (!fs.existsSync(opts.identity)) {
                    return Q.reject(C.red("Identity file '" + opts.identity + "' does not exists."));
                }
                profile.identity = opts.identity;
            }
            if (opts && opts.password) {
                profile.password = opts.password;
            }
            config.addConnectionProfile(name, profile);
            configManager.writeConfig();
            return Q.resolve("Successfully added connection profile '" + C.cyan(name) + "' to configuration file.");
        },

        remove: function(opts, args) {
            if (!args || !args.name) {
                return Q.reject("You need to specify the connection profile name you want to remove");
            }
            var profile = config.getConnectionProfile(args.name);
            if (!profile) {
                return Q.reject("Could not find connection profile with name '" + C.cyan(args.name) + "'. Use '" + utils.appName() + " profile list' to see available connection profiles");
            }
            config.removeConnectionProfile(args.name);
            configManager.writeConfig();
            return Q.resolve("Successfully removed connection profile '" + C.cyan(args.name) + "' from configuration file.");
        },

        validators: {
            userAndHost: function (val) {
                if (val.indexOf('@') > 0) {
                    return val;
                }
            }
        }
    };
};
