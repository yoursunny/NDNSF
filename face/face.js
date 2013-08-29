var util = require('util');
var EventEmitter = require('events').EventEmitter;
var ndn = require('ndn-on-node');


// ----------------------------------------------------------------
// class Face
var Face = function Face() {
  EventEmitter.call(this);
  this.closed = false;
  this.counters = {
    SI:0,// sent Interests
    SC:0,// sent ContentObjects
    RI:0,// received Interests
    RC:0,// received ContentObjects
  };
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

// internal property counters, used by FaceMgr

// public method send
Face.prototype.send = function Face_send(msg) {
  if (this.closed) return;
  if (msg instanceof ndn.Interest) ++this.counters.SI;
  if (msg instanceof ndn.ContentObject) ++this.counters.SC;
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
Face.prototype.close_on_error = true;

// protected method recvpkt
// pkt must be a complete message
Face.prototype.recvpkt = function Face_recvpkt(pkt) {
  var msg = false;
  try {
    var d = new ndn.BinaryXMLDecoder(pkt);
    if (d.peekStartElement(ndn.CCNProtocolDTags.Interest)) {
      var interest = new ndn.Interest();
      interest.from_ccnb(d);
      msg = interest;
    } else if (d.peekStartElement(ndn.CCNProtocolDTags.ContentObject)) {
      var co = new ndn.ContentObject();
      co.from_ccnb(d);
      msg = co;
    }
  } catch(ex) {
    msg = false;
    console.log('Face.recvpkt() decode error from '+this.id+(this.close_on_error?', closing':''));
    if (this.close_on_error) this.close();
  }
  if (msg !== false) this.recv(msg);
};

// protected method recv
Face.prototype.recv = function Face_recv(msg) {
  if (this.closed) return;
  if (msg instanceof ndn.Interest) ++this.counters.RI;
  if (msg instanceof ndn.ContentObject) ++this.counters.RC;
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
exports.Face = Face;

