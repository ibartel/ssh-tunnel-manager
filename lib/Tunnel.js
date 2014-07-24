var SSH2 = require('ssh2'),
    net = require('net'),
    _ = require('underscore'),
    Promise = require('bluebird');

module.exports = SSHTunnel;

function SSHTunnel(options) {
    config = this.config = _.extend({}, options);

    this.log = function(message) {
        if (config.verbose) {
            this.emit('log', message);
        }
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

    this.connect = function(sshConfig, callback) {
        var resolver = Promise.defer();
        if (!sshConfig || typeof sshConfig === 'function' || !sshConfig.host || !sshConfig.username) {
            resolver.reject('You need to specify the ssh connection config');
            return resolver.promise;
        }

        this.sshConnection = new SSH2();

        this.sshConnection.on('ready', function() {
            this.tunnelHandler = new TunnelHandler(this, this.sshConnection);
            this.log("Successfully connected to host " + sshConfig.host);
            callback ? callback(this) : resolver.resolve(this);
        }.bind(this));
        this.sshConnection.on('error', function(err) {
            console.log(JSON.stringify(err,null,2));
            this.log("Error on SSH connection '" + err + "'");
        }.bind(this));
        this.sshConnection.on('close', function(hadError) {
            this.log("Connection to '" + sshConfig.host + "' closed" + (hadError ? " abnormally" : ""));
            this.tunnelHandler = null;
        }.bind(this));

        this.sshConnection.connect(sshConfig);

        return resolver.promise;
    };

    this.addTunnel = function(name, localPort, remoteAddr, remotePort) {
        return this.tunnelHandler ? this.tunnelHandler.addTunnel.apply(this.tunnelHandler, arguments) : Promise.reject('No connection open yet!');
    };
}

SSHTunnel.prototype.__proto__ = require('events').EventEmitter.prototype;

function TunnelHandler(app, sshConnection) {
    var activeTunnels = {};

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
                    resolver.reject(error);
                    return;
                }

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
                    app.log('Local connection on port ' + localPort + ' to ' + remoteAddr + ':' + remotePort + ' closed');
                    ssh.removeAllListeners();
                    ssh.end();
                });
                ssh.on('end', function() {
                    socket.removeAllListeners();
                    socket.end();
                });

                resolver.resolve(server);
            });
        });

        server.on('error', function(err) {
            if (err.code === 'EADDRINUSE') {
                resolver.reject('ERROR: port ' + localPort + ' is in use');
            }
        });

        server.listen(localPort);

        activeTunnels[name] = {
            server: server,
            localPort: localPort,
            remoteAddr: remoteAddr,
            remotePort: remotePort
        };

        return resolver.promise;
    };

    this.closeTunnel = function(name) {
        var resolver = Promise.defer();
        if (name && activeTunnels[name]) {
            var tunnel = activeTunnels[name];
            tunnel.close(function() {
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
