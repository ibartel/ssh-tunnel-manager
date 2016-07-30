# SSH Tunnel Manager

NodeJS based applicaton for easy managing SSH tunnels. Tunnels are managed within groups, if you only need one tunnel then the ssh command is probably better suited. You can specify multiple connection profiles such for integration and production systems. As for integration system you often need to specify dynamic hostnames - SSH tunnel manager also supports this via variables.
In addition to the configuration file there is also support to specify (or use a default) tunnel configuration file. This is helpful for application maintainers who have the best knowledge about services used in this application. Contributors then only need to start the tunnel manager in this directory or specify this file on startup.

---

## Why another tunnel manager

First of all when you are reading this you might came here for a reason. However there are more:
* NodeJS based and runs on the common OS systems like linux,mac or windows without having more installed than node.
* Easy to use on command line and still powerful in configuration
* Detached tunnel and connection configuration (it's up to you to consider this pro or con)
* Support for variables in host names for tunnels (a feature most important to me)

---

## Features

* organize tunnels in groups
* multiple connection profiles (with default support)
* reconnect if the tunnel host is no reachable while tunnels are setup
* tunnel config files in addition to global config
* variables in remote hosts to support "dynamic" tunnels
* full CLI interface for intuitive configuring (no need to edit config manually)
* easy to use even for people not experienced with ssh

## Installation

	$ npm install -g ssh-tunnel-manager

## Usage

	$ ssh-tunnel-manager --help

The CLI interface uses commands and sub commands to configure the tunnels. Commands und subcommands are
* profile
  * list
  * add
  * remove
  * default
* tunnel
  * list
  * add
  * remove

The configuration section will cover the most, generally you can always use

    $ ssh-tunnel-manager <COMMAND> --help

or

    $ ssh-tunnel-manager <COMMAND> <SUBCOMMAND> --help

### Setting up tunnels

If you haven't done any configuration you would be prompted on first startup. You might better go first reading the configuration section.

If you want to run a configured tunnel and setup a profile as default you simply run

    $ ssh-tunnel-manager -t <NAME>

If you have a file call _ssh-tunnels.yml_ where tunnels are setup it's even easier

    $ ssh-tunnel-manager

If you want a specific connection profile or don't have one set as default use

    $ ssh-tunnel-manager -p <PROFILE NAME>

or

    $ ssh-tunnel-manager -p <PROFILE NAME> -t <TUNNEL GROUP>

You can use the _-t_ or _--tunnel_ option multiple times or use a comma separated string to run more tunnel groups

    $ ssh-tunnel-manager -p <PROFILE NAME> -t <TUNNEL GROUP> -t <TUNNEL GROUP>

or

    $ ssh-tunnel-manager -p <PROFILE NAME> -t <TUNNEL GROUP,TUNNEL_GROUP,...>

#### Using variables

If the tunnels to run requires variables to be set you'll be prompted so. The use would then be

    $ ssh-tunnel-manager -v VAR:VALUE -v VAR2:VALUE2


### Configuration

Configuration files are stored in the OS config directory tunnel-manager/tunnel-manager.yml. You don't have do edit the configuration manually. You can configure everything with the CLI interface.

#### Connection profiles

Connection profiles are used to switch between hosts you tunnel thru. This may be handy if you have multiple VPNs but still have the same remote services you want to tunnel to. You can specify a profile as default so you don't have to specify a profile when you want to start tunnels.

##### Showing the configured connection profiles

    $ ssh-tunnel-manager profile list

##### Adding connection profiles

To get help adding a connection profile use

    $ ssh-tunnel-manager profile add --help

Basically the following syntax

    $ ssh-tunnel-manager profile add <NAME> <USER@HOST> [-port <HOST PORT>] [-i <FILE TO PRIVATE KEY>] [-p <PASSWORD>] [--password-interactive] [--default]

**NAME** is the name you use on command line to specify the connection profile you want to use. You can create as many as you want, but use only one at a time

**USER@HOST** specifies the _username_ you want to use to connect to the _host_ to tunnel thru.

**HOST PORT** is the host port you connect to the _host_ to tunnel thru. defaults to port 22.

**FILE TO PRIVATE KEY** is a SSH identity file you want to use. ie. ~/.ssh/id_dsa (**NOTE:** its _not_ the public key!)

**PASSWORD** if you want to connect to this host using a password (_NOT RECOMMENDED_). If you want to enter your password but not store it use the _--password-interactive_ instead of _-p_. Note that the server needs to support this!

##### Removing connection profiles

    $ ssh-tunnel-manager profile remove <NAME>

#### Tunnel groups and tunnels

Tunnel groups are just names which holds a list of tunnels. In most cases you need to setup a bunch of tunnels and it would be just bad usability to specify all tunnels (tho in theory you can have a group with only one tunnel so you are not limited to to this). Each tunnel must have a group assigned - beside the list option you always need to provide the group. If the group exists on create the tunnel will just added to the existing group. If you remove all tunnels from a group the group itself is also removed.

##### Listing all configured tunnels

    $ ssh-tunnel-manager tunnel list

##### Adding a tunnel

To get a help for creating use

    $ ssh-tunnel-manager tunnel add --help

In short version the syntax us as following

    $ ssh-tunnel-manager tunnel add -g <GROUP> <NAME> <TUNNEL STRING> [--source-port <PORT>] [--host <REMOTE HOST>] [--dest-port <PORT>] [--force]

**GROUP** is the name of the tunnel group. If the group does not exists yet it will be created.

**NAME** the name of the tunnel. For easier identifying the log messages

**TUNNEL STRING** an alternative (quicker) way to specifiy the tunnel in a format of _source port_:_host_:_dest_port_

##### Removing a tunnel

    $ ssh-tunnel-manager tunnel remove -g <GROUP> [<NAME>]

**GROUP** the name of the group you want to remove (if no <NAME> is specified the whole group is removed!)

**NAME** the name of the tunnel to remove. Can be left blank to remove all tunnels in the specified group

### Tunnel configuration files (not global config!)

Tunnel configuration files are used in addition to the global configured ones to make it simply to maintain required tunnels where the application actually is maintained. The default tunnel configuration searched for when no file is specified is **ssh-tunnels.yml** in the current directory. If can use _-f TUNNEL CONFIG_ to specify a different path or filename. The format of the tunnel is YAML (like the global configuration). Example tunnel-config is included in this module (look at ssh-tunnels.yml.samle). Basically the format is:

```yaml
NAME: SOURCE_PORT:HOST:DEST_PORT
NAME: SOURCE_PORT:HOST:DEST_PORT
NAME: SOURCE_PORT:HOST:DEST_PORT
```

The thinking behind is to put a file named _ssh-tunnels.yml_ to an application and define all tunnels for this application in there. A user of this application then doesn't need to have much knowledge on his own what tunnels this application requires. If the tunnels using variables which aren't defined on start of the ssh-tunnel-manager you are requested to pass the values for the variables.

### Examples

```shell
ssh-tunnel-manager profile add qa sampleman@qagateway.de --defaut
ssh-tunnel-manager tunnel add -g db geodb 3308:geodb.qa.company.de:3306
ssh-tunnel-manager tunnel add -g db customerdb 3308:customerdb.qa.{ENV}.company.de:3306
ssh-tunnel-manager tunnel add -g db statistics 27017:statdb.qa.{ENV}.company.de:27017
ssh-tunnel-manager tunnel add -g services geodb 8085:geoservice.qa.company.de:8000
ssh-tunnel-manager tunnel add -g services statservice 8086:statservice.qa.{ENV}.qa.company.de:8000

ssh-tunnel-manager -t db,services -v env:myteam

```
