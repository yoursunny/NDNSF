var util = require('util');
var EventEmitter = require('events').EventEmitter;
var ndn = require('ndn-on-node');


// ----------------------------------------------------------------
// class InternalClient
var InternalClient = function InternalClient(key) {
  EventEmitter.call(this);
  this.key = key;
};
util.inherits(InternalClient, EventEmitter);

// public method ndndid
InternalClient.prototype.ndndid = function InternalClient_ndndid() {
  return this.key.publicKeyDigest;
};

// public method register
InternalClient.prototype.register = function InternalClient_register(fib) {
  fib.add(new ndn.Name('/%C1.M.S.localhost/%C1.M.SRV/ndnd'), this.serve_ndndid.bind(this));
  fib.add(new ndn.Name('/%C1.M.S.localhost/%C1.M.SRV/ccnd'), this.serve_ndndid.bind(this));
  fib.add(new ndn.Name(['ndnx', this.ndndid()]), this.command.bind(this));
  fib.add(new ndn.Name(['ccnx', this.ndndid()]), this.command.bind(this));
};

// private method send
InternalClient.prototype.send = function InternalClient_send(msg) {
  if (msg instanceof ndn.ContentObject) {
    if (!msg.signature) msg.sign(this.key);
  }
  msg.incoming_face = 0;
  this.emit('send', msg);
};

// public event send(msg)

// private method serve_ndndid
InternalClient.prototype.serve_ndndid = function InternalClient_serve_ndndid(interest) {
  var co = new ndn.ContentObject(interest.name, '');
  this.send(co);
};

// private method command
InternalClient.prototype.command = function InternalClient_command(interest) {
  var op = interest.name.getComponent(2).toString();
  var co = false;
  if (interest.name.size() >= 3) {
    try {
      co = ndn.ContentObject.parse(interest.name.getComponent(3));
    } catch(ex) { co = false; }
  }
  var f = this['op_'+op];
  if (f) f(op, interest, co, this.send.bind(this));
};

// public method provide_op
// f(op, interest, co, send_func)
InternalClient.prototype.provide_op = function InternalClient_provide_op(op, f) {
  this['op_'+op] = f;
};


// ----------------------------------------------------------------
exports.InternalClient = InternalClient;

