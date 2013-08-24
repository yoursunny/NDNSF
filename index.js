var ndn = require('ndn-on-node');
var Face = require('./face').Face;
var StreamFace = require('./face').StreamFace;
var TcpListener = require('./face').TcpListener;
var WebSocketFace = require('./face').WebSocketFace;
var WebSocketListener = require('./face').WebSocketListener;
var WebServer = require('./websvr').WebServer;
var FaceMgr = require('./face').FaceMgr;
var Fib = require('./fib').Fib;
var Pit = require('./pit').Pit;
var InternalClient = require('./intclient').InternalClient;
var Strategy = require('./strategy').Strategy;

var facemgr = new FaceMgr();
var fib = new Fib(facemgr);
var pit = new Pit();
var strategy = new Strategy(fib, pit, facemgr);

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

//var key = new ndn.Key(); key.fromPemFile('./non.pub', './non.pem');
var key = new ndn.NDN().getDefaultKey();
var intclient = new InternalClient(key);
intclient.register(fib);
intclient.on('send', process_input);
fib.provide_intclient_commands(intclient);

var tcplisten = new TcpListener(9695);
tcplisten.on('accept', new_face);

var tcpconn = StreamFace.tcp('e.hub.ndn.ucla.edu',9695);
tcpconn.send(new ndn.Interest(new ndn.Name('/ndn/arizona.edu/ping/1')));
new_face(tcpconn);
fib.add(new ndn.Name('/'), tcpconn.id);

var web = new WebServer(9696);

var wslisten = web.create_wslistener('/');
wslisten.on('accept', new_face);

var wsconn = WebSocketFace.connect('ws://a.ws.ndn.ucla.edu:9696/');
new_face(wsconn);
fib.add(new ndn.Name('/'), wsconn.id);

