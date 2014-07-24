var SSH2 = require('ssh2'),
    net = require('net'),
    _ = require('underscore'),
    Promise = require('bluebird');

module.exports = SSHTunnel;

var defaultOptions = {
    reconnect: true,
    reconnectDelay: 10000,
    reconnectTries: 10
};

function SSHTunnel(options) {
    config = this.config = _.extend(defaultOptions, options);
    self = this;

    this.log = function(message) {
        self.emit('log', message);
    };

    this.fatal = function (message) {
        self.emit('fatal', message);
    };

    this.close = function(callback) {
        var resolver = Promise.defer();
        if (this.tunnelHandler) {
            this.tunnelHandler.closeTunnel().then(function() {
                this.sshConnection.end();
                callback ? callback() : resolver.resolve();
            }.bind(this))
        } else if (this.sshConnection) {
            this.sshConnection.end();
        } else {
            resolver.reject('No ssh connection open');
            return resolver.promise;
        }

        return resolver.promise;
    };

    reconnect = function (sshConfig, tunnelData) {
        var resolver = Promise.defer();

        var doConnect = function (retries) {
            retries = retries || 0;
            return self.connect(sshConfig).then(function (connection) {
                var tunnels = [];
                Object.keys(tunnelData).forEach(function (key) {
                    var tunnel = tunnelData[key];
                    tunnels.push(connection.addTunnel(tunnel.name, tunnel.localPort, tunnel.remoteAddr, tunnel.remotePort));
                });

                Promise.all(tunnels).then(function() {
                    resolver.resolve();
                }).catch(function (err) {
                    resolver.reject(err);
                });
            }).timeout(config.reconnectDelay)
                .catch(Promise.TimeoutError, function () {
                    if (retries < config.reconnectTries) {
                        return doConnect(retries + 1);
                    } else {
                        console.error("bailing out");
                        throw new Error("could not reconnect to " + sshConfig.host);
                    }
                }).catch(function (err) {
                    resolver.reject(err);
                });
        };

        doConnect(0);

        return resolver.promise;
    };

    this.connect = function (sshConfig, callback) {
        var resolver = Promise.defer(),
            self = this,
            log = this.log,
            fatal = this.fatal;

        if (!sshConfig || typeof sshConfig === 'function' || !sshConfig.host || !sshConfig.username) {
            resolver.reject('You need to specify the ssh connection config');
            return resolver.promise;
        }

        self.sshConnection = new SSH2();

        self.sshConnection.on('ready', function () {
            self.tunnelHandler = new TunnelHandler(self, self.sshConnection);
            log("Successfully connected to host " + sshConfig.host);
            callback ? callback(self) : resolver.resolve(self);
        });
        self.sshConnection.on('error', function(err) {
            if (err.code === 'ENOTFOUND') {
                fatal("Could not find host " + sshConfig.host);
            } else {
                fatal("Error on SSH connection '" + err + "'");
            }
        });
        self.sshConnection.on('close', function (hadError) {
            if (self.tunnelHandler && self.tunnelHandler.activeTunnels) {
                var tunnelData = _.extend({}, self.tunnelHandler.activeTunnels);
                self.tunnelHandler.closeTunnel().then(function () {
                    log("Connection to '" + sshConfig.host + "' closed" + (hadError ? " abnormally" : ""));
                    self.tunnelHandler = null;
                    if (config.reconnect) {
                        reconnect(sshConfig, tunnelData).then(function () {
                            log("Successfully reconnected to host + " + sshConfig.host);
                        }).catch(function() {
                            fatal("ERROR: Unable to reconnect to host " + sshConfig.host + " after " + config.reconnectTries + " tries.");
                        });
                    }
                });
            }
        });

        self.sshConnection.connect(sshConfig);

        return resolver.promise;
    };

    this.addTunnel = function(name, localPort, remoteAddr, remotePort) {
        return this.tunnelHandler ? this.tunnelHandler.addTunnel.apply(this.tunnelHandler, arguments) : Promise.reject('No connection open yet!');
    };

    this.removeTunnel = function (name) {
        return this.tunnelHandler ? this.tunnelHandler.closeTunnel.apply(this.tunnelHandler, arguments) : Promise.reject('No connection open yet!');
    };

}

SSHTunnel.prototype.__proto__ = require('events').EventEmitter.prototype;

function TunnelHandler(app, sshConnection) {
    var activeTunnels = this.activeTunnels = {};

    this.addTunnel = function(name, localPort, remoteAddr, remotePort) {
        var resolver = Promise.defer(),
            server = net.createServer();

        server.on('connection', function(socket) {
            var buffers = [],
                addBuffer = function (data) {
                    buffers.push(data);
                };

            socket.on('data', addBuffer);
            sshConnection.forwardOut('', 0, remoteAddr, remotePort, function(error, ssh) {
                if (error) {
                    app.fatal('Got error on ssh connection: ' + error);
                    return;
                }
                activeTunnels[name].active = true;

                while (buffers.length) {
                    ssh.write(buffers.shift());
                }
                socket.removeListener('data', addBuffer);

                ssh.on('data', function(buf) {
                    socket.write(buf);
                });
                socket.on('data', function(buf) {
                    ssh.write(buf);
                });
                socket.on('end', function() {
                    socket.removeAllListeners();
                    ssh.end();
                });
                ssh.on('end', function() {
                    ssh.removeAllListeners();
                    socket.end();
                    activeTunnels[name].active = false;
                });
            });
        });

        server.on('listening', function () {
            activeTunnels[name] = {
                name: name,
                active: false,
                server: server,
                localPort: localPort,
                remoteAddr: remoteAddr,
                remotePort: remotePort
            };
            app.log("Created new tunnel '" + name + "' from port " + localPort + " to " + remoteAddr + ":" + remotePort);
            resolver.resolve(activeTunnels[name]);
        });

        server.on('error', function(err) {
            if (err.code === 'EADDRINUSE') {
                app.fatal('Port ' + localPort + ' is in use');
                resolver.reject('Port ' + localPort + ' is in use');
            }
        });

        server.listen(localPort);

        return resolver.promise;
    };

    this.closeTunnel = function(name) {
        var resolver = Promise.defer();
        if (name && activeTunnels[name]) {
            var tunnel = activeTunnels[name];
            tunnel.server.close(function () {
                delete activeTunnels[name];
                app.log("Closed tunnel '" + name + "' to " + tunnel.remoteAddr + ":" + tunnel.remotePort);
                resolver.resolve();
            });
        } else if (!name) {
            var tunnels = [];
            for (var key in activeTunnels) {
                tunnels.push(this.closeTunnel(key));
            }
            Promise.all(tunnels).then(function() {
                resolver.resolve("All tunnels closed");
            });
        } else {
            return resolver.reject("No tunnel open with name '" + name + "'");
        }
        return resolver.promise;
    };
}
