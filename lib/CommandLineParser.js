var ConfigManager = require('./ConfigManager');

var configManager = new ConfigManager();

var mainAction = require('./actions/main')(configManager);

module.exports = require('coa').Cmd()
    .name(process.argv[1]).title('SSH Tunnel manager - helps you to maintain your commonly used tunnels').helpful()
    .cmd().name('profile').title('Manage SSH connection profiles').helpful().apply(profiles).end()
    .opt().name('profile').title('Specify which connection profile to use - if omitted use the default marked profile').only().short('p').end()
    .opt().name('tunnel').title('The tunnel group to run').req().only().arr().short('t').long('tunnel').end()
    .opt().name('version').title('Show current version').short('v').long('version').only().flag().act(mainAction.version).end()
    .opt().name('file').title('Specify tunnel config file to run instead of using tunnel group of configuration').only().short('f').long('file').def('tunnel-manager.yml').end()
    .completable()
    .act(mainAction.connect);

function profiles() {
    var profileAction = require('./actions/profile')(configManager);
    this.cmd()
            .name('list').title('List SSH connection profiles').helpful()
            .act(profileAction.list)
        .end()

        .cmd().name('add').title('Add SSH connection profile').helpful()
            .arg().name('name').title('connection profile name').end()
            .arg().name('userAndHost').title('User and host').val(profileAction.validators.userAndHost).end()
            .opt().name('identity').title('Use path and file to private key identity file').short('i').long('identity').end()
            .opt().name('password').title('Use password authentication (not recommended)').short('p').long('password').end()
            .act(profileAction.add)
        .end()

        .cmd().name('remove').title('Remove SSH connection profile').helpful()
            .arg().name('name').title('connection profile name').end()
            .act(profileAction.remove)
        .end()
    ;
}


