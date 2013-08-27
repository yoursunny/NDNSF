var fs = require('fs');
var ndn = require('ndn-on-node');
var Face = require('./face').Face;
var StreamFace = require('./face').StreamFace;
var TcpListener = require('./face').TcpListener;
var WebSocketFace = require('./face').WebSocketFace;
var WebSocketListener = require('./face').WebSocketListener;
var FaceMgr = require('./face').FaceMgr;
var WebServer = require('./web').WebServer;
var Fib = require('./core').Fib;
var Pit = require('./core').Pit;
var InternalClient = require('./core').InternalClient;
var StrategyModule = require('./strategy');

// ----------------------------------------------------------------
// read config

var config = {
  main: {
    "listen_tcp": { "port": 9695 },
    "listen_web": { "port": 9696, "ws": "/" },
    "mgr_base": "http://yoursunny.com/p/NDNSF/",
    "strategy_type": "SmartStrategy"
  },
  faces: [],
  operators: []
};
var key;

if (fs.existsSync('config/main.json')) {
  var config_main = JSON.parse(fs.readFileSync('config/main.json'));
  for (var k in config_main) config.main[k] = config_main[k];
}
if (fs.existsSync('config/keypair.json')) {
  var keypair = JSON.parse(fs.readFileSync('config/keypair.json'));
  key = new ndn.Key();
  key.fromPemString(keypair.pubkey, keypair.pvtkey);
} else {
  key = new ndn.NDN().getDefaultKey();
  console.log('config/keypair.json is missing, using NDN default keypair');
}
if (fs.existsSync('config/faces.json')) {
  config.faces = JSON.parse(fs.readFileSync('config/faces.json'));
}
if (fs.existsSync('config/operators.txt')) {
  config.operators = fs.readFileSync('config/operators.txt','utf8').split('\n');
}

// ----------------------------------------------------------------
// create basic components

var facemgr = new FaceMgr();
var fib = new Fib(facemgr);
var pit = new Pit();
var strategy = new (StrategyModule[config.main.strategy_type])(fib, pit, facemgr);

function new_face(face) {
  face.register(facemgr);
  face.on('recv', process_input);
}

function process_input(msg) {
  if (msg instanceof ndn.Interest) {
    strategy.interest(msg);
  } else if (msg instanceof ndn.ContentObject) {
    strategy.co(msg);
  }
}

var intclient = new InternalClient(key, config.operators);
intclient.register(fib);
intclient.on('send', process_input);
fib.provide_intclient(intclient);
facemgr.provide_intclient(intclient);

// ----------------------------------------------------------------
// create listeners, faces, and FIB entries

if (config.main.listen_tcp) {
  var tcplisten = new TcpListener(config.main.listen_tcp.port);
  tcplisten.on('accept', new_face);
}

if (config.main.listen_web) {
  var web = new WebServer(config.main.listen_web.port);
  intclient.provide_web(web, config.main.mgr_base);
  
  if (config.main.listen_web.ws) {
    var wslisten = web.create_wslistener(config.main.listen_web.ws);
    wslisten.on('accept', new_face);
  }
}

config.faces.forEach(function(config_face){
  var face;
  switch (config_face.type) {
    case 'tcp': {
      face = StreamFace.tcp(config_face.host, config_face.port);
      face.send(new ndn.Interest(new ndn.Name([])));//inform peer about our presence
    } break;
    case 'ws': {
      face = WebSocketFace.connect(config_face.address);
    } break;
  }
  if (!face) return;
  new_face(face);
  config_face.fib.forEach(function(config_fe){
    fib.add(new ndn.Name(config_fe.prefix), face.id);
  });
});

