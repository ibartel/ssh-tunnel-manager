var Tunnel = require('./lib/Tunnel');

var ssh_config = {
    host: 'my-chaos.net',
    port: 22,
    username: 'sshtest',
    password: 'test'
};

var tunnelManager = new Tunnel({verbose: true});

tunnelManager.on('log', function(message) {
    console.log("LOG: " + JSON.stringify(message, null, 2));
});

tunnelManager.connect(ssh_config).done(function(connection) {
    connection.addTunnel('github', 443, 'github.com', 443).then(function(wasdas) {
        console.log("tunnel zu github da");
        console.log(wasdas);
    }).catch(function(error) {
        console.error("Error adding tunnel: " + error);
    });
//    connection.close().then(function() {
//        console.log("und tschuess");
//    }).catch(function(error) {
//        console.error("Schade schade");
//    })
}).catch(function(error) {
    console.error(error);
});
