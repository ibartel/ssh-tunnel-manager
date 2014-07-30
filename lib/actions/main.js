var C = require('cli-color'),
    Q = require('q'),
    fs = require('fs'),
    sshTunnel = require('../sshTunnel'),
    utils = require('../utils');

module.exports = function(configManager) {

    var config = configManager.config,
        tunnelManager = new sshTunnel(config.connection);

    tunnelManager.on('log', function(message) {
        console.log(C.green('LOG:') + C.green(message));
    });

    tunnelManager.on('fatal', function(message) {
        console.log(C.red('ERROR:') + C.green(message));
    });

    return {
        connect: function(opts, args) {
            var defer = Q.defer(),
                nameAndProfile = config.defaultConnectionProfile();
                profile = nameAndProfile ? nameAndProfile.profile : null,
                output = [];

            console.log(JSON.stringify(args, null, 2));
            console.log(JSON.stringify(opts, null, 2));

            if (opts.profile) {
                profile = config.getConnectionProfile(opts.profile);
            }
            if (!profile) {
                output = ['Connection profile ' + (opts.profile ? C.cyan(opts.profile) + 'not found' : 'not specified') + ". Use '" + utils.appName() + " profile list' to see all profiles"];
                output.push("You can also set a connection profile as default by using '" + utils.appName() + " profile default <profile name>'");
                return Q.reject(output.join('\n'));
            }

            if ((!opts.tunnel || !opts.tunnel.length) && (!opts.file || !fs.existsSync(opts.file))) {
                output = ["There are no tunnels specified. You can use mutliple ways to use your tunnels:"];
                output.push("Use '" + utils.appName() + " -t <tunnel group name>'");
                output.push("Configure tunnels in a configuration file (default name is ssh-tunnels.yml)");
                output.push("If you want to use the default file you don't need to specify any options, if you named your configuration differently use '" + utils.appName() + " -f <tunnel conf file>'");
                return Q.reject(output.join('\n'));
            }

            var tunnelsToCreate = [];
            if (opts.file && fs.existsSync(opts.file)) {
                var result = configManager.readTunnelFile(opts.file);
                if (!result.success) {
                    output = [C.red(result.msg)];
                    output.push(C.blackBright(result.error.message));
                    output.push('\nPlease have a look at the included sample file ssh-tunnels.yml.sample!');
                    return Q.reject(output.join('\n'));
                } else {
                    output.push('Config file ' + C.green(opts.file) + ' found, setting up tunnels from this file');
                    if (result.data && Object.keys(result.data).length) {
                        var data = result.data;
                        Object.keys(data).forEach(function(name) {
                            var tunnelString = config.applyVariables(data[name]),
                                tunnelArr = tunnelString.split(':');

                            if (tunnelArr && tunnelArr.length === 3) {
                                tunnelsToCreate.push({
                                    sourcePort: tunnelArr[0],
                                    host: tunnelArr[1],
                                    destPort: tunnelArr[2],
                                    name: name
                                });
                            }
                        });
                    }
                }
            }
            if (opts.tunnel && opts.tunnel.length) {
                opts.tunnel.forEach(function(group) {
                    if (group && group.indexOf(',') === -1) {
                        // STOPPED HERE
                    }
                    console.log(group);
                })
            }

            console.log(utils.toJson(tunnelsToCreate));


            var makeTunnel = function(connection) {
                var tunnels = [
                    connection.addTunnel('mysql', 3306, 'localhost', 3306).catch(function(err) {
                        console.error(err)
                    }),
                    connection.addTunnel('github', 443, 'github.com', 443).catch(function(err) {
                        console.error(err)
                    })
                ];

                Q.all(tunnels).then(function() {
                    console.log("all done");
                }).catch(function(err) {
                    console.error(err);
                });
            };

            output.push('Connecting to ' + C.cyan(utils.formatProfile(profile)));

//            tunnelManager.connect(profile)
//                .then(makeTunnel)
//                .catch(function(error) {
//                    console.error(error);
//                });
            console.log(output.join('\n'));
            return defer.promise;
        },

        version: function() {
            var packageInfo = require('fs').readFileSync(__dirname + '/../../package.json');
            return utils.appName() + C.cyan(" v" + JSON.parse(packageInfo).version);
        }

    }

};
