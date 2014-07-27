var C = require('cli-color'),
    Q = require('q'),
    Tunnel = require('../Tunnel'),
    utils = require('../utils');

module.exports = function (configManager) {

    var tunnelManager = new Tunnel(configManager.config.connection);
    tunnelManager.on('log', function (message) {
        console.log(C.green('LOG:') + C.green(message));
    });

    tunnelManager.on('fatal', function (message) {
        console.log(C.red('ERROR:') + C.green(message));
    });

    this.connect = function (args, opts) {
        var defer = Q.defer();
        var profile = configManager.config.defaultConnectionProfile();
        if (args.profile) {
            profile = configManager.config.getConnectionProfile(args.profile);
            if (!profile) {
                return Q.reject(C.red("Profile not found. ") + "use '" + utils.appName() + " profile list' to see all profiles");
            }
        }

        var makeTunnel = function (connection) {
            var tunnels = [
                connection.addTunnel('mysql', 3306, 'localhost', 3306).catch(function (err) {
                    console.error(err)
                }),
                connection.addTunnel('github', 443, 'github.com', 443).catch(function (err) {
                    console.error(err)
                })
            ];

            Q.all(tunnels).then(function () {
                console.log("all done");
            }).catch(function(err) {
                console.error(err);
            });
        };

        console.log("Connecting to " + C.cyan(utils.formatProfile(profile)));

        tunnelManager.connect(profile)
            .then(makeTunnel)
            .catch(function (error) {
                console.error(error);
            });

        console.log(JSON.stringify(args, null, 2));
        console.log(JSON.stringify(opts, null, 2));

        return defer.promise;
    };

    this.version = function() {
        var packageInfo = require('fs').readFileSync(__dirname + '/../../package.json');
        return utils.appName() + C.cyan(" v" + JSON.parse(packageInfo).version);
    };

    return this;
};