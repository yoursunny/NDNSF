var util = require('util');
var EventEmitter = require('events').EventEmitter;
var WebSocket = require('ws');
var ndn = require('ndn-on-node');
var Face = require('./face').Face;


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
  console.log('WebSocketListener('+path+')');
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
exports.WebSocketFace = WebSocketFace;
exports.WebSocketListener = WebSocketListener;

