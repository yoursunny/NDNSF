# NDNSF - NDN Slim Forwarder

[NDNSF](http://yoursunny.com/p/NDNSF/) is a lightweight [Named Data Networking](http://www.named-data.net/) forwarder based on [NDN-On-Node](https://github.com/named-data/NDN-On-Node), compatible with [NDNx](https://github.com/named-data/ndnx) and [CCNx](http://www.ccnx.org/).
NDNSF is tested on Ubuntu 12.04 and Windows 7.

NDNSF is not designed for speed, and is not a replacement of ndnd or [NDNFD](https://github.com/NDN-Routing/NDNFD).
NDNSF is not endorsed by NDN project group.

## Installation

1. Install Node.js v0.10.15 or above.
2. Download NDNSF source code.
3. Install dependencies: `npm install ndn-on-node ws`
4. Create configuration files: `cp -r config-sample config` (on linux) or `XCOPY /E config-sample config\` (on Windows)
5. Modify configuration files config/* if desired.

## Usage

* Start NDNSF by executing `nodejs .` or `node .` in NDNSF code directory.
    * Make sure any other programs that listens on port 9695 and 9696 are stopped.
* Ask local apps to use TCP or WebSocket transport instead of UNIX sockets:
    * NDN-On-Node apps and CCNx Java apps can be used directly.
    * NDNx apps need `NDN_LOCAL_TRANSPORT=tcp` environment variable.
    * CCNx apps need `CCN_LOCAL_TRANSPORT=tcp` environment variable.
    * NDN-JS apps can connect to `ws://localhost:9696/`
* Access NDNSF manager webapp at <http://localhost:9696/>

## Features

NDNSF supports the following features:

* FIB - Forwarding Information Base
* PIT - Pending Interest Table
* Prefix Registration Protocol: *selfreg* command only
* broadcast forwarding strategy
* smart forwarding strategy
* TCP transport
* WebSocket transport
* status web page with operator key authentication

NDNSF does not yet support:

* CS - Content Store
* ForwardingFlags
* UDP transport
* Face Management Protocol

