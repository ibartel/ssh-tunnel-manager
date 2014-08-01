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
        opts.push('using identity');
    }
    if (profile.password) {
        opts.push('using password');
    }
    if (!profile.password && typeof profile.password !== 'undefined') {
        opts.push('using interactive password');
    }
    if (opts.length) {
        result = result + ' (' + opts.join(', ') + ')';
    }
    if (profile.default) {
        result = result + ' ' + C.magentaBright('[default]');
    }
    return result;
};

Utils.prototype.formatTunnel = function(name, tunnel) {
    return C.cyan(name) + ': ' + C.white('source port') + ' = ' + C.bold(tunnel.sourcePort) + ", " + C.white('host') + ' = ' + C.bold(tunnel.host) + ', ' + C.white('dest port') + ' = ' + C.bold(tunnel.destPort);
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

Utils.prototype.findMatches = function(find, str) {
    var matches = [];
    var match;
    while (match = find.exec(str)) {
        matches.push(match[1]);
    }
    return matches;
};

Utils.prototype.unique = function(ary) {
   var u = {}, a = [];
   for(var i = 0, l = ary.length; i < l; ++i){
      if(u.hasOwnProperty(ary[i])) {
         continue;
      }
      a.push(ary[i]);
      u[ary[i]] = 1;
   }
   return a;
};

Utils.prototype.replaceAll = function(find, replace, str) {
  return str.replace(new RegExp(find, 'gi'), replace);
};

Utils.prototype.clone = function(obj) {
    return clone(obj);

    function clone(obj) {
        // Handle the 3 simple types, and null or undefined
        if (null == obj || "object" != typeof obj) return obj;

        // Handle Date
        if (obj instanceof Date) {
            var copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        // Handle Array
        if (obj instanceof Array) {
            var copy = [];
            for (var i = 0, len = obj.length; i < len; i++) {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }

        // Handle Object
        if (obj instanceof Object) {
            var copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
            }
            return copy;
        }

        throw new Error("Unable to copy obj! Its type isn't supported.");
    }
};

Utils.prototype.toJson = function(obj) {
    return JSON.stringify(obj, null, 4);
};