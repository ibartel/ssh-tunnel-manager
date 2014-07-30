var C = require('cli-color'),
    utils = require('../utils');

module.exports = function(configManager) {
    var config = configManager.config;

    return {
        list: function() {
            var tunnelGroups = config.getTunnelgroups();
            if (!tunnelGroups || !tunnelGroups.length) {
                console.log(C.red("There are no tunnels configured yet,") + " use " + utils.appName() + " 'tunnel add -h' to add a new one");
            } else {
                console.log("Following Tunnels are configured:");
                tunnelGroups.forEach(function(group) {
                    var tunnelNames = config.getTunnels(group);
                    if (tunnelNames && tunnelNames.length) {
                        console.log("  tunnel group " + C.blue(group));
                        tunnelNames.forEach(function(name) {
                            var tunnel = config.getTunnel(group, name);
                            tunnel && console.log("     " + utils.formatTunnel(name, tunnel));
                        });
                    }
                });
            }
        },

        validators: {
            tunnelString: function (val) {
                if (val && val.split(':').length === 3) {
                    return val;
                }
            }
        }

    };
};
