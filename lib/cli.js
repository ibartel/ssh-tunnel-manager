var C = require('cli-color'),
    ConfigManager = require('./config');

var configManager = new ConfigManager();
    mainAction = require('./actions/main')(configManager),
    profileAction = require('./actions/profile')(configManager.config),
    tunnelAction = require('./actions/tunnel')(configManager.config);

module.exports = require('coa').Cmd()
    .name(process.argv[1]).title('SSH Tunnel manager - helps you to maintain your commonly used tunnels').helpful()
    .cmd().name('profile').title('Manage SSH connection profiles').helpful().apply(profiles).end()
    .cmd().name('tunnel').title('Manage tunnel groups and tunnels').helpful().apply(tunnels).end()

    .opt().name('profile').title('Specify which connection profile to use - if omitted use the default marked profile').only().val(profileAction.validators.profileExists).short('p').long('profile').end()
    .opt().name('tunnel').title('The tunnel group(s) to run, specify multiple times or use comma separated list').arr().short('t').long('tunnel').end()
    .opt().name('vars').title("Bla").only().arr().short('v').long('var').val(configManager.setVar).end()
    .opt().name('version').title('Show current version').long('version').only().flag().act(mainAction.version).end()
    .opt().name('file').title('Specify tunnel config file to run instead of using tunnel group of configuration').only().short('f').long('file').def('ssh-tunnels.yml').end()
    .completable()
    .act(mainAction.connect);

function profiles() {
    this.cmd()
            .name('list').title('List SSH connection profiles').helpful()
            .act(profileAction.list)
        .end()

        .cmd().name('add').title('Add SSH connection profile').helpful()
            .arg().name('name').title('connection profile name').req().end()
            .arg().name('userAndHost').title('User and host').val(profileAction.validators.userAndHost).req().end()
            .opt().name('identity').title('Use path and file to private key identity file').short('i').long('identity').end()
            .opt().name('password').title('Use password authentication (not recommended)').short('p').long('password').end()
            .opt().name('default').title('Make this profile the default one. Moves default if a default already set').flag().short('def').long('default').end()
            .act(profileAction.add)
        .end()

        .cmd().name('remove').title('Remove SSH connection profile').helpful()
            .arg().name('name').title('connection profile name').req().val(profileAction.validators.profileExists).end()
            .act(profileAction.remove)
        .end()

        .cmd().name('default').title('Marks a connection profile as default when no connection profile is specified').helpful()
            .arg().name('name').title('Name of the connection profile').val(profileAction.validators.profileExists).end()
            .act(profileAction.makeDefault)
        .end()
    ;
}

function tunnels() {
    this.cmd()
            .name('list').title('List tunnel groups and tunnels').helpful()
            .act(tunnelAction.list)
        .end()

        .cmd().name('add').title('Add new tunnel').helpful()
            .arg().name('name').title('Name of the tunnel').req().end()
            .arg().name('tunnelString').title('Specify tunnel as one value <sourceport>:<host>:<destport>').val(tunnelAction.validators.tunnelString).end()
            .opt().name('group').title('Specify the tunnel group. Also creates if the group does not exists').req().short('g').long('group').end()
            .opt().name('sourceport').title('Specify the local (source) port').short('source').long('source-port').val(tunnelAction.validators.isNumeric).end()
            .opt().name('host').title('The destination host to connect to (thru the tunnel)').short('host').long('host').end()
            .opt().name('destport').title('Specify the remote (destination) port').short('dest').long('dest-port').val(tunnelAction.validators.isNumeric).end()
            .opt().name('force').title('If the tunnel name already exists, overwrite').flag().short('f').long('force').end()
            .act(tunnelAction.add)
        .end()

        .cmd().name('remove').title('Remove tunnel or tunnel group ' + C.red('(if only group is specified all tunnels will be deleted as well)')).helpful()
            .arg().name('name').title('tunnel name (not group) to remove, specify -g for group').end()
            .opt().name('group').title('tunnel group to remove, if used without tunnel name the group including all tunnels will be removed').short('g').long('group').req().end()
            .act(tunnelAction.remove)
        .end()
    ;
}

