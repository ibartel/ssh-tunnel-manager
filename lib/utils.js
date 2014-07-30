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

Utils.prototype.toJson = function(obj) {
    return JSON.stringify(obj, null, 4);
};