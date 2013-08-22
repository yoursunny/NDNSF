var ndn = require('ndn-on-node');
var Face = require('./face').Face;
var StreamFace = require('./face').StreamFace;
var TcpListener = require('./face').TcpListener;
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

var intclient = new InternalClient();
intclient.register(fib);
intclient.on('send', process_input);
fib.provide_intclient_commands(intclient);

var tcp = new TcpListener(9695);
tcp.on('accept', new_face);

var conn = StreamFace.tcp('e.hub.ndn.ucla.edu',9695);
conn.send(new ndn.Interest(new ndn.Name('/ndn/arizona.edu/ping/1')));
new_face(conn);
fib.add(new ndn.Name('/'), conn.id);

