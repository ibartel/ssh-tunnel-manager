var C = require('cli-color'),
    Q = require('q'),
    utils = require('../utils');

module.exports = function(config) {
    return {
        list: function() {
            var tunnelGroups = config.getTunnelgroups(),
                output = [];
            if (!tunnelGroups || !tunnelGroups.length) {
                output.push(C.white("There are no tunnels configured yet, use '" + utils.appName() + " tunnel add -h' to add a new one"));
            } else {
                output.push('Following Tunnels are configured:');
                tunnelGroups.forEach(function(group) {
                    var tunnelNames = config.getTunnels(group);
                    if (tunnelNames && tunnelNames.length) {
                        output.push('  tunnel group ' + C.blue(group));
                        tunnelNames.forEach(function(name) {
                            var tunnel = config.getTunnel(group, name);
                            tunnel && output.push('     ' + utils.formatTunnel(name, tunnel));
                        });
                    }
                });
            }
            return Q.resolve(output.join('\n'));
        },

        add: function(opts, args) {
            var tunnelNames = config.getTunnels(opts.group);
            if (tunnelNames && tunnelNames.length && !opts.force) {
                if (tunnelNames.indexOf(args.name) > -1) {
                    return Q.reject('Tunnel with name ' + C.cyan(args.name) + ' already exists in tunnel group ' + C.blue(opts.group) + '. Please use -f or --force when you want to overwrite');
                }
            }

            if (!args.tunnelString && !opts.host && !opts.sourceport && !opts.destport) {
                var validateErr = [];
                validateErr.push('Missing required argument:');
                validateErr.push('  ' + C.magentaBright.bold('TUNNELSTRING') + ' : Specifies the the tunnel as one string in format <source port>:<dest host>:<dest port>');
                validateErr.push('or');
                validateErr.push('  ' + C.magentaBright.bold('-SOURCE, --SOURCE-PORT') + ' : Specify the local (source) port');
                validateErr.push('  ' + C.magentaBright.bold('-HOST, --HOST') + ' : The destination host to connect to (thru the tunnel)');
                validateErr.push('  ' + C.magentaBright.bold('-DEST, --DEST-PORT') + ' : Specify the remote (destination) port');

                return Q.reject(validateErr.join('\n'));
            }
            var tunnel = {};
            var output = [];
            if (args.tunnelString && opts.host && opts.sourceport && opts.destport) {
                output.push(C.white('Tunnel string and options specified, using the values from tunnel string'));
                tunnel = args.tunnelString;
            } else if (!args.tunnelString && (!opts.host || !opts.sourceport || !opts.destport)) {
                var validateErr = [];
                validateErr.push('Missing required argument:');
                !opts.sourceport && validateErr.push('  ' + C.magentaBright.bold('-SOURCE, --SOURCE-PORT') + ' : Specify the local (source) port');
                !opts.host && validateErr.push('  ' + C.magentaBright.bold('-HOST, --HOST') + ' : The destination host to connect to (thru the tunnel)');
                !opts.destport && validateErr.push('  ' + C.magentaBright.bold('-DEST, --DEST-PORT') + ' : Specify the remote (destination) port');
                validateErr.push('\nOr use the ' + C.magentaBright.bold('TUNNELSTRING') + ' argument instead of specifying all options');

                return Q.reject(validateErr.join('\n'));
            } else if (args.tunnelString) {
                tunnel = args.tunnelString;
            } else {
                tunnel = opts.sourceport + ':' + opts.host + ':' + opts.destport;
            }
            if (!tunnel || tunnel.split(':').length !== 3) {
                return Q.reject("Wrong tunnel arguments specified, please use '" + utils.appName() + "tunnel add -h' to get the usage");
            }

            config.addTunnel(opts.group, args.name, tunnel);
            output.push('Successfully added tunnel ' + C.cyan(args.name) + ' to tunnel group ' + C.blue(opts.group) + '.');

            return Q.resolve(output.join('\n'));
        },

        remove: function(opts, args) {
            var tunnelNames = config.getTunnels(opts.group);
            if (!tunnelNames) {
                return Q.reject('Could not find tunnel group ' + C.blue(opts.group) + ". Use '" + utils.appName() + " tunnel list' to see available tunnels");
            }
            if (!args.name) {
                config.removeTunnel(opts.group);
                return Q.resolve('Successfully removed tunnel group ' + C.blue(opts.group) + '.');
            } else {
                if (tunnelNames.indexOf(args.name) === -1) {
                    return Q.reject('Could not find tunnel name ' + C.cyan(args.name) + ". Use '" + utils.appName() + " tunnel list' to see available tunnels");
                }
                config.removeTunnel(opts.group, args.name);
                return Q.resolve('Successfully removed tunnel name ' + C.cyan(args.name) + ' from tunnel group ' + C.blue(opts.group) + '.');
            }
        },

        validators: {
            tunnelString: function (val) {
                if (val && val.split(':').length === 3) {
                    return val;
                }
                return Q.reject(utils.rejectValue(this, 'Wrong format specified for tunnel string. Must be <source port>:<dest host>:<dest port>'));
            },
            tunnelGroup: function(val) {
                if (val) {
                    if (val.indexOf(',') === -1) {
                        if (!config.getTunnels(val)) {
                            return Q.reject(utils.rejectValue(this, 'Tunnel group name ' + C.cyan(val) + ' does not exists.'));
                        }
                    } else {
                        var names = val.split(',');
                        if (names && names.length) {
                            var invalid = [];
                            names.forEach(function(name) {
                                if (!config.getTunnels(name)) {
                                    invalid.push(name);
                                }
                            });
                            if (invalid && invalid.length) {
                                return Q.reject(utils.rejectValue(this, 'Follwing tunnel group names does not exists: ' + C.cyan(invalid.join(', ')) + '.'));
                            }
                        }
                    }
                } else {
                    return Q.reject(utils.rejectValue(this, 'No tunnel group name specified'));
                }
                return val;
            },
            isNumeric: function(val) {
                if (utils.isNumber(val)) {
                    return val;
                }
                return Q.reject(utils.rejectValue(this, 'Wrong format specified. Must be a number'));
            }
        }

    };
};
