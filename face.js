var util = require('util');
var EventEmitter = require('events').EventEmitter;
var net = require('net');
var WebSocket = require('ws');
var ndn = require('ndn-on-node');
ndn.BinaryXmlElementReader = require('ndn-on-node/lib/util/BinaryXMLElementReader.js').BinaryXmlElementReader;


// ----------------------------------------------------------------
// class Face
var Face = function Face() {
  EventEmitter.call(this);
  this.closed = false;
  this.close_on_error = true;
};
util.inherits(Face, EventEmitter);

Face.prototype.register = function Face_register(facemgr) {
  facemgr.register(this);// sets this.id
};

// public property id

// public abstract method desc
Face.prototype.desc = function Face_desc(msg) {
  throw new Error('not implemented');
};

// public method send
Face.prototype.send = function Face_send(msg) {
  if (this.closed) return;
  if (msg instanceof ndn.Interest || msg instanceof ndn.ContentObject) {
    var pkt = msg.encodeToBinary();
    this.sendpkt(pkt);
  }
};

// protected abstract method sendpkt
Face.prototype.sendpkt = function Face_sendpkt(pkt) {
  throw new Error('not implemented');
};

// protected property close_on_error

// protected method recvpkt
// pkt must be a complete message
Face.prototype.recvpkt = function Face_recvpkt(pkt) {
  try {
    var d = new ndn.BinaryXMLDecoder(pkt);
    if (d.peekStartElement(ndn.CCNProtocolDTags.Interest)) {
      var interest = new ndn.Interest();
      interest.from_ccnb(d);
      this.recv(interest);
    } else if (d.peekStartElement(ndn.CCNProtocolDTags.ContentObject)) {
      var co = new ndn.ContentObject();
      co.from_ccnb(d);
      this.recv(co);
    }
  } catch(ex) {
    if (this.close_on_error) this.close();
  }
};

// protected method recv
Face.prototype.recv = function Face_recv(msg) {
  if (this.closed) return;
  msg.incoming_face = this.id;
  this.emit('recv', msg);
};

// public event recv(Interest|ContentObject)

// public method close
Face.prototype.close = function Face_close() {
  this.closed = true;
  this.close_internal();
  this.emit('close');
};

// protected abstract method close_internal
Face.prototype.close_internal = function Face_close_internal() {
  throw new Error('not implemented');
};

// public event close()
// Face is closed locally or by remote peer.

// protected method end
// invoked when face is closed by remote peer
Face.prototype.end = function Face_end() {
  if (this.closed) return;
  this.closed = true;
  this.emit('end');
  this.emit('close');
};

// public event end()


// ----------------------------------------------------------------
// class StreamFace
var StreamFace = function StreamFace(sock) {
  Face.call(this);
  this.sock = sock;
  this.address = this.sock.remoteAddress+':'+this.sock.remotePort;
  this.sock.on('data', this.recvchunk.bind(this))
  this.sock.on('end', this.end.bind(this));
  this.element_reader = new ndn.BinaryXmlElementReader({ onMessage: this.recvpkt.bind(this) });
};
util.inherits(StreamFace, Face);

// public static method tcp
StreamFace.tcp = function StreamFace_tcp(host, port) {
  var sock = net.connect(port, host);
  var face = new StreamFace(sock);
  face.address = host+':'+port;
  return face;
};

// public method desc
StreamFace.prototype.desc = function StreamFace_desc(msg) {
  return 'StreamFace('+this.id+') '+this.address;
};

// protected method sendpkt
StreamFace.prototype.sendpkt = function StreamFace_sendpkt(pkt) {
  this.sock.write(pkt);
};

// private method recvchunk
StreamFace.prototype.recvchunk = function StreamFace_recvchunk(chunk) {
  var buf = (chunk instanceof Buffer) ? chunk : new Buffer(chunk);
  this.element_reader.onReceivedData(buf);
};

// protected method close_internal
StreamFace.prototype.close_internal = function StreamFace_close_internal() {
  this.sock.end();
};


// ----------------------------------------------------------------
// class TcpListener
var TcpListener = function TcpListener(port) {
  EventEmitter.call(this);
  this.closed = false;
  this.server = net.createServer(this.accept.bind(this)).listen(port);
};
util.inherits(TcpListener, EventEmitter);

// private method accept
TcpListener.prototype.accept = function TcpListener_accept(c) {
  var face = new StreamFace(c);
  this.emit('accept', face);
};

// public event accept(StreamFace)

// public method close
TcpListener.prototype.close = function TcpListener_close() {
  if (this.closed) return;
  this.closed = true;
  this.server.close();
};


// ----------------------------------------------------------------
// class WebSocketFace
var WebSocketFace = function WebSocketFace(sock) {
  Face.call(this);
  this.sock = sock;
  this.address = this.sock.url ? this.sock.url : this.sock._socket.remoteAddress+':'+this.sock._socket.remotePort;
  this.sock.on('message', this.recvwsmsg.bind(this))
  this.sock.on('close', this.end.bind(this));
};
util.inherits(WebSocketFace, Face);

// public static method connect
WebSocketFace.connect = function WebSocketFace_connect(url) {
  var sock = new WebSocket(url);
  return new WebSocketFace(sock);
};

// public method desc
WebSocketFace.prototype.desc = function WebSocketFace_desc(msg) {
  return 'WebSocketFace('+this.id+') '+this.address;
};

// protected method sendpkt
WebSocketFace.prototype.sendpkt = function WebSocketFace_sendpkt(pkt) {
  this.sock.send(pkt, { binary:true, mask:false });
};

// private method recvwsmsg
WebSocketFace.prototype.recvwsmsg = function WebSocketFace_recvwsmsg(pkt) {
  this.recvpkt(pkt);
};

// protected method close_internal
WebSocketFace.prototype.close_internal = function WebSocketFace_close_internal() {
  this.sock.close();
};



// ----------------------------------------------------------------
// class WebSocketListener
var WebSocketListener = function WebSocketListener(http_server, path) {
  EventEmitter.call(this);
  this.closed = false;
  this.server = new WebSocket.Server({ server:http_server, path:path });
  this.server.on('connection', this.accept.bind(this));
};
util.inherits(WebSocketListener, EventEmitter);

// private method accept
WebSocketListener.prototype.accept = function WebSocketListener_accept(c) {
  var face = new WebSocketFace(c);
  this.emit('accept', face);
};

// public event accept(WebSocketFace)

// public method close
WebSocketListener.prototype.close = function WebSocketListener_close() {
  if (this.closed) return;
  this.closed = true;
  this.server.close();
};


// ----------------------------------------------------------------
// class FaceMgr
var FaceMgr = function FaceMgr() {
  EventEmitter.call(this);
  this.last_id = 0;
  this.faces = {};
};
util.inherits(FaceMgr, EventEmitter);

// public method register
FaceMgr.prototype.register = function FaceMgr_register(face){
  var id = ++this.last_id;
  this.faces[id] = face;
  face.id = id;
  face.on('close', this.unregister.bind(this, id));
  console.log('FaceMgr.register() '+face.desc());
  this.emit('register', id);
};

// public event register(faceid)

// private method unregister
FaceMgr.prototype.unregister = function FaceMgr_unregister(faceid){
  delete this.faces[faceid];
  this.emit('unregister', faceid);
};

// public event unregister(faceid)

// public method get
FaceMgr.prototype.get = function FaceMgr_get(id) {
  return this.faces[id];
};


// ----------------------------------------------------------------
exports.Face = Face;
exports.StreamFace = StreamFace;
exports.TcpListener = TcpListener;
exports.WebSocketFace = WebSocketFace;
exports.WebSocketListener = WebSocketListener;
exports.FaceMgr = FaceMgr;

