var C = require('cli-color'),
    Q = require('q'),
    fs = require('fs'),
    sshTunnel = require('../sshTunnel'),
    utils = require('../utils');

module.exports = function(configManager) {

    var config = configManager.config,
        tunnelManager = new sshTunnel(config.connection);

    tunnelManager.on('log', function(message) {
        console.log(C.green(message));
    });

    tunnelManager.on('error', function(error) {
        console.log(C.red(error));
    });

    tunnelManager.on('ssh-log', function(tunnelObj, type, msg) {
        console.log('[' + C.cyan(tunnelObj.name) + '] ' + C.white(msg));
    });

    tunnelManager.on('ssh-error', function(tunnelObj, type, error) {
        if (typeof error === 'object' && error.reason && error.reason === 'CONNECT_FAILED') {
            console.log('[' + C.cyan(tunnelObj.name) + '] no response on ' + C.white(tunnelObj.host + ':' + tunnelObj.destPort));
        } else {
            console.log('[' + C.cyan(tunnelObj.name) + '] ' + C.red('ERROR: ') + C.white(error));
        }
    });

    return {
        connect: function(opts, args) {
            var defer = Q.defer(),
                nameAndProfile = config.defaultConnectionProfile();
                profile = nameAndProfile ? nameAndProfile.profile : null,
                output = [];

//            console.log(JSON.stringify(args, null, 2));
//            console.log(JSON.stringify(opts, null, 2));

            if (opts.profile) {
                profile = config.getConnectionProfile(opts.profile);
            }
            if (!profile) {
                output = ['Connection profile ' + (opts.profile ? C.cyan(opts.profile) + 'not found' : 'not specified') + ". Use '" + utils.appName() + " profile list' to see all profiles"];
                output.push("You can also set a connection profile as default by using '" + utils.appName() + " profile default <profile name>'");
                return Q.reject(output.join('\n'));
            }

            if ((!opts.group || !opts.group.length) && (!opts.file || !fs.existsSync(opts.file))) {
                output = ["There are no tunnels specified. You can use mutliple ways to use your tunnels:"];
                output.push("Use '" + utils.appName() + " -t <tunnel group name>'");
                output.push("Configure tunnels in a configuration file (default name is ssh-tunnels.yml)");
                output.push("If you want to use the default file you don't need to specify any options, if you named your configuration differently use '" + utils.appName() + " -f <tunnel conf file>'");
                return Q.reject(output.join('\n'));
            }

            var tunnelsToCreate = [],
                missingVariables = [];

            function parseTunnelData(tunnelMap) {
                var result = {tunnelsToCreate: [], misingVars: []};
                Object.keys(tunnelMap).forEach(function(name) {
                    var tunnelString = config.applyVariables(tunnelMap[name]),
                        tunnelArr = tunnelString.split(':');

                    result.misingVars = result.misingVars.concat(utils.findMatches(/{(.+)}/g, tunnelString));

                    if (tunnelArr && tunnelArr.length === 3) {
                        result.tunnelsToCreate.push({
                            sourcePort: tunnelArr[0],
                            host: tunnelArr[1],
                            destPort: tunnelArr[2],
                            name: name
                        });
                    }
                });
                return result;
            };

            if (opts.file && fs.existsSync(opts.file)) {
                var result = configManager.readTunnelFile(opts.file);
                if (!result.success) {
                    output = [C.red(result.msg)];
                    output.push(C.white(result.error.message));
                    output.push('\nPlease have a look at the included sample file ssh-tunnels.yml.sample!');
                    return Q.reject(output.join('\n'));
                } else {
                    output.push('Config file ' + C.green(opts.file) + ' found, setting up tunnels from this file');
                    if (result.data && Object.keys(result.data).length) {
                        var ret = parseTunnelData(result.data);
                        tunnelsToCreate = tunnelsToCreate.concat(ret.tunnelsToCreate);
                        missingVariables = missingVariables.concat(ret.misingVars);
                    }
                }
            }
            if (opts.group && opts.group.length) {
                opts.group.forEach(function(group) {
                    if (group && group.indexOf(',') === -1) {
                        var ret = parseTunnelData(config.rawTunnelConfig[group]);
                        tunnelsToCreate = tunnelsToCreate.concat(ret.tunnelsToCreate);
                        missingVariables = missingVariables.concat(ret.misingVars);
                    } else {
                        var names = group.split(',');
                        names.forEach(function(name) {
                            var ret = parseTunnelData(config.rawTunnelConfig[name]);
                            tunnelsToCreate = tunnelsToCreate.concat(ret.tunnelsToCreate);
                            missingVariables = missingVariables.concat(ret.misingVars);
                        });
                    }
                })
            }

            if (utils.unique(missingVariables) && utils.unique(missingVariables).length) {
                return Q.reject('There are missing variables used in tunnels you specified: ' + C.red(utils.unique(missingVariables).join(', ')));
            }
            if (!tunnelsToCreate || tunnelsToCreate.length === 0) {
                return Q.reject("No tunnels found to start. Check your config via 'tunnel list' or specify a valid tunnel config file.");
            }

            var makeTunnel = function(connection) {
                var tunnels = [];

                function tunnelConnectError(err) {
                    console.error(C.red(err));
                };

                tunnelsToCreate.forEach(function(entry) {
                    tunnels.push(connection.addTunnel(entry.name, entry.sourcePort, entry.host, entry.destPort).catch(tunnelConnectError));
                });

                Q.all(tunnels).catch(function(err) {
                    console.error(err);
                });
            };

            output.push('Connecting to ' + C.cyan(utils.formatProfile(profile)));

            tunnelManager.connect(profile)
                .then(makeTunnel)
                .catch(function(error) {
                    console.error(error);
                });

            console.log(output.join('\n'));

            return defer.promise;
        },


        version: function() {
            var packageInfo = require('fs').readFileSync(__dirname + '/../../package.json');
            return utils.appName() + C.cyan(" v" + JSON.parse(packageInfo).version);
        },

        validators: {
            configFile: function(val) {
                if (fs.existsSync(val)) {
                    return val;
                }
                return Q.reject(utils.rejectValue(this, 'Specified tunnel config file ' + C.cyan(val) + ' does not exists.'));
            }
        }

    }

};
