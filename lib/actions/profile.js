var C = require('cli-color'),
    Q = require('q'),
    fs = require('fs'),
    utils = require('../utils');

module.exports = function(config) {
    return {

        list: function() {
            var profileKeys = config.getConnectionProfiles(),
                output = [];
            if (!profileKeys || !profileKeys.length) {
                output.push(C.red("There are no connection profiles yet, use " + utils.appName() + " 'profile add -h' to add a new one"));
            } else {
                output.push('Following SSH connection profiles are configured:');
                profileKeys.forEach(function(profileKey) {
                    var profile = config.getConnectionProfile(profileKey);
                    output.push('  ' + C.cyan(profileKey) + ' - ' + utils.formatProfile(profile));
                });
            }
            return Q.resolve(output.join('\n'));
        },

        add: function(opts, args) {
            if (!args || !args.name || !args.userAndHost) {
                return Q.reject(C.red("Wrong arguments supplied. Usage:\n") + utils.appName() + " profile add <profilename> <user>@<host>, do 'profile add -h' for addtional options");
            }
            var output = [],
                userAndHost = args.userAndHost.split('@'),
                name = args.name,
                profile = {
                    host: userAndHost[1],
                    username: userAndHost[0]
                };
            if (opts && opts.port) {
                profile.port = opts.port;
            }
            if (config.getConnectionProfile(name) && (!opts || !opts.force)) {
                return Q.reject("Connection profile with name '" + C.cyan(name) + "' already exists. Remove the old one first with profile remove command");
            }
            if (opts && opts.identity) {
                if (!fs.existsSync(opts.identity)) {
                    return Q.reject(C.red("Identity file '" + opts.identity + "' does not exists."));
                }
                profile.identity = opts.identity;
            }

            if (opts && opts.password && !opts['password-input']) {
                profile.password = opts.password;
            } else if (opts && opts['password-input'] && !opts.password) {
                profile.password = '';
            } else if (opts && opts.password && opts['password-input']) {
                return Q.reject("Please use password OR interactive password.");
            }

            if (opts.default) {
                var oldDefault = config.defaultConnectionProfile();
                if (oldDefault) {
                    delete oldDefault.profile['default'];
                    config.addConnectionProfile(oldDefault.name, oldDefault.profile);
                    output.push(C.white('Moved default flag from connection profile ' + C.cyan(oldDefault.name)));
                } else {
                    output.push(C.white('Set this profile as the default one'));
                }
                profile.default = true;
            }

            config.addConnectionProfile(name, profile);

            output.push('Successfully ' + (opts && opts.force ? 'edited' : 'added') + ' connection profile ' + C.cyan(name) + ' to configuration file.');
            return Q.resolve(output.join('\n'));
        },

        remove: function(opts, args) {
            config.removeConnectionProfile(args.name);
            return Q.resolve('Successfully removed connection profile ' + C.cyan(args.name) + ' from configuration file.');
        },

        makeDefault: function(opts, args) {
            var output = [];
            if (!args || !args.name) {
                var defaultProfile = config.defaultConnectionProfile();
                if (defaultProfile && defaultProfile.name) {
                    output.push('The current default connection profile is ' + C.cyan(defaultProfile.name) + ', specify also a profile name to change the default');
                } else {
                    output.push('No default connection profile set. Specify a profile name to set one');
                }
            } else {
                var defaultProfile = config.defaultConnectionProfile();
                if (defaultProfile && defaultProfile.name && defaultProfile.name.toLowerCase() === args.name.toLowerCase()) {
                    output.push(C.white('This profile is already marked as default'));
                } else {
                    if (defaultProfile && defaultProfile.name && defaultProfile.name.toLowerCase() !== args.name.toLowerCase()) {
                        output.push(C.white('Moved default flag from connection profile ' + C.cyan(defaultProfile.name) + ' to ' + C.cyan(args.name)));
                    } else {
                        output.push(C.white('Set default flag for connection profile ') + C.cyan(args.name));
                    }
                    config.setDefaultProfile(args.name);
                }
            }
            return Q.resolve(output.join('\n'));
        },

        validators: {
            userAndHost: function (val) {
                if (val.indexOf('@') > 0) {
                    return val;
                }
                return Q.reject(utils.rejectValue(this, 'Wrong format specified. Please use <loginuser>@<host>'));
            },
            profileExists: function(val) {
                var profile = config.getConnectionProfile(val);
                if (profile) {
                    return val;
                }
                return Q.reject(utils.rejectValue(this, 'Could not find connection profile with name ' + C.cyan(val)));
            }
        }
    };
};
