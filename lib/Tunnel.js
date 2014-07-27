var SSH2 = require('ssh2'),
    net = require('net'),
    fs = require('fs'),
    _ = require('lodash'),
    Q = require('q');

module.exports = SSHTunnel;

var defaultOptions = {
    reconnect: false,
    defaultPort: 22
};

function SSHTunnel(options) {
    config = this.config = _.extend({}, options || defaultOptions);
    self = this;

    this.log = function(message) {
        self.emit('log', message);
    };

    this.fatal = function (message) {
        self.emit('fatal', message);
    };

    this.close = function(callback) {
        var defer = Q.defer();
        if (this.tunnelHandler) {
            this.tunnelHandler.closeTunnel().then(function() {
                this.sshConnection.end();
                callback ? callback() : defer.resolve();
            }.bind(this))
        } else if (this.sshConnection) {
            this.sshConnection.end();
        } else {
            defer.reject('No ssh connection open');
        }

        return defer.promise;
    };

    reconnect = function (sshConfig, tunnelData) {
        var defer = Q.defer();

        var doConnect = function (retries) {
            retries = retries || 0;
            return self.connect(sshConfig).then(function (connection) {
                var tunnels = [];
                Object.keys(tunnelData).forEach(function (key) {
                    var tunnel = tunnelData[key];
                    tunnels.push(connection.addTunnel(tunnel.name, tunnel.localPort, tunnel.remoteAddr, tunnel.remotePort));
                });

                Q.all(tunnels).then(function() {
                    defer.resolve();
                }).catch(function(err) {
                    defer.reject(err);
                });
            }).timeout(config.reconnectDelay)
                .catch(function() {
                    if (retries < config.reconnectTries) {
                        return doConnect(retries + 1);
                    } else {
                        console.error("bailing out");
                        throw new Error("could not reconnect to " + sshConfig.host);
                    }
                });
        };

        doConnect(0);

        return defer.promise;
    };

    this.connect = function (sshConfig, callback) {
        var defer = Q.defer(),
            self = this,
            log = this.log,
            fatal = this.fatal;

        if (!sshConfig || typeof sshConfig === 'function' || !sshConfig.host || !sshConfig.username) {
            defer.reject('You need to specify the ssh connection config');
            return defer.promise;
        }

        if (!sshConfig.port) {
            sshConfig.port = config.defaultPort;
        }
        sshConfig.tryKeyboard = config.tryKeyboard;

        if (sshConfig.identity) {
            if (fs.existsSync(sshConfig.identity)) {
                sshConfig.privateKey = fs.readFileSync(sshConfig.identity);
            }
            delete sshConfig.identity;
        }

        self.sshConnection = new SSH2();

        self.sshConnection.on('keyboard-interactive', function(name, instructions, lang, prompts, finish) {
            console.log(JSON.stringify(arguments, null, 2));
        });

        self.sshConnection.on('ready', function () {
            self.tunnelHandler = new TunnelHandler(self, self.sshConnection);
            log("Successfully connected to host " + sshConfig.host);
            callback ? callback(self) : defer.resolve(self);
        });
        self.sshConnection.on('error', function(err) {
            if (err.code === 'ENOTFOUND') {
                fatal("Could not find host " + sshConfig.host);
            } else if (err.level === "connection-timeout") {
                fatal("Connection timed out for host " + sshConfig.host);
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

        return defer.promise;
    };

    this.addTunnel = function(name, localPort, remoteAddr, remotePort) {
        return this.tunnelHandler ? this.tunnelHandler.addTunnel.apply(this.tunnelHandler, arguments) : Q.reject('No connection open yet!');
    };

    /*
    this.removeTunnel = function (name) {
        return this.tunnelHandler ? this.tunnelHandler.closeTunnel.apply(this.tunnelHandler, arguments) : Q.reject('No connection open yet!');
    };
    */
}

SSHTunnel.prototype.__proto__ = require('events').EventEmitter.prototype;

function TunnelHandler(app, sshConnection) {
    var activeTunnels = this.activeTunnels = {};

    this.addTunnel = function(name, localPort, remoteAddr, remotePort) {
        var defer = Q.defer(),
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
            defer.resolve(activeTunnels[name]);
        });

        server.on('error', function(err) {
            if (err.code === 'EADDRINUSE') {
                app.fatal('Port ' + localPort + ' is in use');
                defer.reject('Port ' + localPort + ' is in use');
            }
        });

        server.listen(localPort);

        return defer.promise;
    };

    this.closeTunnel = function(name) {
        var defer = Q.defer();
        if (name && activeTunnels[name]) {
            var tunnel = activeTunnels[name];
            tunnel.server.close(function () {
                delete activeTunnels[name];
                app.log("Closed tunnel '" + name + "' to " + tunnel.remoteAddr + ":" + tunnel.remotePort);
                defer.resolve();
            });
        } else if (!name) {
            var tunnels = [];
            for (var key in activeTunnels) {
                tunnels.push(this.closeTunnel(key));
            }
            Q.all(tunnels).then(function() {
                defer.resolve("All tunnels closed");
            });
        } else {
            return defer.reject("No tunnel open with name '" + name + "'");
        }
        return defer.promise;
    };
}
