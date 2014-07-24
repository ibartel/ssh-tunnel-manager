var Tunnel = require('./lib/Tunnel'),
    Config = require('./lib/Config'),
    Promise = require('bluebird');

path = require('path-extra');

var ssh_config = {
    host: 'my-chaos.net',
    port: 22,
    username: 'sshtest',
    password: 'test'
};

var config = new Config();

var tunnelManager = new Tunnel({verbose: true});

tunnelManager.on('log', function(message) {
    console.log("LOG: " + JSON.stringify(message, null, 2));
});

tunnelManager.on('closed', function (data) {
    console.log(data);
    tunnelManager.reconnect(data.config, data.tunnel).catch(console.err);
});

var makeTunnel = function (connection) {
    var tunnels = [
        connection.addTunnel('mysql', 3306, 'localhost', 3306).catch(function (err) {
            console.error(err)
        }),
        connection.addTunnel('github', 443, 'github.com', 443).catch(function (err) {
            console.error(err)
        })
    ];

    Promise.all(tunnels).then(function () {
        console.log("all done");
    });
};

tunnelManager.connect(ssh_config)
    .then(makeTunnel)
    .catch(function (error) {
        console.error(error);
    });
