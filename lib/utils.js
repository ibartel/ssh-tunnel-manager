module.exports = new Utils();

function Utils() { }

Utils.prototype.appName = function() {
    return require('path').basename(process.argv[1]);
};

Utils.prototype.formatProfile = function(profile) {
    var result = profile.username + '@' + profile.host;
    if (profile.identity) {
        result = result + " (using identity)"
    }
    return result;
};

Utils.prototype.toJson = function(obj) {
    return JSON.stringify(obj, null, 4);
};