# NDNSF Configuration Files

This directory contains NDNSF configuration files. This directory must be renamed as `config` to take effect.

## main.json - Main Configuration

    "listen_tcp": { // listen for TCP connections
      "port": 9695 // local port number
    }
    // -- or --
    "listen_tcp": false // don't listen for TCP connections
    
    "listen_web": { // listen for HTTP requests
      "port": 9696 // local port number
      
      "ws": "/" // listen for WebSockets connections on path
      // -- or --
      "ws": false // don't listen for WebSockets connections
    }
    // -- or --
    "listen_web": false // don't listen for HTTP requests
    
    "mgr_base": "http://yoursunny.com/p/NDNSF/" // base URL of NDNSF manager webapp
    
    "strategy_type": "SmartStrategy" // forwarding strategy

## faces.json - Outgoing Faces

    {
      "type": "tcp" // connect to TCP peer
      "host": "e.hub.ndn.ucla.edu" // remote hostname or IP address
      "port": 9695 // remote port number
      "fib": [ // FIB entries for this face
        {
          "prefix": "/" // prefix as URI
        }
      ]
    }
    
    {
      "type": "ws" // connect to WebSocket address
      "address": "ws://a.ws.ndn.ucla.edu:9696/" // remote WebSocket address
      "fib": [ // FIB entries for this face
      ]
    }

## keypair.json - Router Key

Generate one on <http://yoursunny.com/p/NDNSF/?p=keypair>

## operators.txt - Trusted Operator Keys

Each line is a trusted operator key digest in HEX format.
NDNSF manager webapp will prompt you to add a digest into this file.

