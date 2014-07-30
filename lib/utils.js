var C = require('cli-color');

module.exports = new Utils();

function Utils() { }

Utils.prototype.appName = function() {
    return require('path').basename(process.argv[1]);
};

Utils.prototype.formatProfile = function(profile) {
    var result = profile.username + '@' + profile.host;
    var opts = [];
    if (profile.identity) {
        opts.push("using identity");
    }
    if (profile.password) {
        opts.push("using password");
    }
    if (opts.length) {
        result = result + " (" + opts.join(", ") + ")";
    }
    return result;
};

Utils.prototype.formatTunnel = function(name, tunnel) {
    return C.cyan(name) + ": " + C.blackBright("source port") + " = " + C.bold(tunnel.sourcePort) + ", " + C.blackBright("host") + " = " + C.bold(tunnel.host) + ", " + C.blackBright("dest port") + " = " + C.bold(tunnel.destPort);
};

Utils.prototype.parseTunnelString = function(tunnelString) {
    if (tunnelString && tunnelString.split(':').length) {
        var arr = tunnelString.split(':');
        return { sourcePort: tunnelString[0].trim(), host: tunnelString[1].trim(), destPort: tunnelString[2].trim() };
    }
    return {};
};

Utils.prototype.rejectValue = function(cliObj, message) {
    var result = [];
    result.push(C.red(message));
    result.push('  ' + C.magentaBright.bold(cliObj._name) + ' : ' + cliObj._title);
    return result.join('\n');
};

Utils.prototype.isNumber = function(val) {
  return ! isNaN (val-0) && val !== null && val !== "" && val !== false;
};

Utils.prototype.replaceAll = function(find, replace, str) {
  return str.replace(new RegExp(find, 'gi'), replace);
};

Utils.prototype.toJson = function(obj) {
    return JSON.stringify(obj, null, 4);
};