var util = require('util');
var EventEmitter = require('events').EventEmitter;
var net = require('net');
var ndn = require('ndn-on-node');
ndn.BinaryXmlElementReader = require('ndn-on-node/lib/util/BinaryXMLElementReader.js').BinaryXmlElementReader;
var Face = require('./face').Face;


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
  console.log('TcpListener('+port+')');
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
exports.StreamFace = StreamFace;
exports.TcpListener = TcpListener;

