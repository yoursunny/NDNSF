# NDNSF - NDN Slim Forwarder

NDNSF is a lightweight [Named Data Networking](http://www.named-data.net/) forwarder based on [NDN-On-Node](https://github.com/named-data/NDN-On-Node). NDNSF is probably the first NDN forwarder that runs on Windows.

NDNSF is compatible with [NDNx](https://github.com/named-data/ndnx) and [CCNx](http://www.ccnx.org/). NDNSF is not designed for speed, and is not a replacement of ndnd or [NDNFD](https://github.com/NDN-Routing/NDNFD).

## Installation

1. Install Node.js v0.10.15 or above.
2. Download NDNSF source code.
3. In the directory containing NDNSF source code, execute `npm install ndn-on-node` (v0.0.21 or above).
3. In the directory containing NDNSF source code, execute `npm install ws` (v0.4.29 or above).
4. Stop any other programs that listens on port 9695 and 9696.
5. Execute `nodejs .` or `node .` to start NDNSF.

## Usage

* A TCP connection to e.hub.ndn.ucla.edu is made automatically, and a WebSocket connection to ws://a.ws.ndn.ucla.edu:9696/ is made automatically. FIB entry ndn:/ is added towards these faces. There's currently no way to make a new outgoing connection.
* Ask local apps to use TCP transport instead of UNIX sockets:
    * NDN-On-Node apps can be used directly.
    * NDNx apps need `NDN_LOCAL_TRANSPORT=tcp` environment variable.
    * CCNx apps need `CCN_LOCAL_TRANSPORT=tcp` environment variable.
* A WebSocketListener listens on port 9696.
    * NDN-JS apps can connect to `ws://localhost:9696/`

## Features

NDNSF supports the following features:

* FIB - Forwarding Information Base
* PIT - Pending Interest Table
* Prefix Registration Protocol: *selfreg* command only
* broadcast forwarding strategy
* TCP transport
* WebSocket transport

NDNSF does not yet support:

* CS - Content Store
* ForwardingFlags
* smarter forwarding strategies
* UDP transport
* Face Management Protocol
* status web page

