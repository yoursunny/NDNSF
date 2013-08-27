var ndn = require('ndn-on-node');
ndn.ForwardingEntry = require('ndn-on-node/lib/ForwardingEntry').ForwardingEntry;


// ----------------------------------------------------------------
// class Fib
var Fib = function Fib(facemgr) {
  this.T = {};
  facemgr.on('unregister', this.delete_face.bind(this));
};

// private method get
Fib.prototype.get = function Fib_get(prefix) {
  var uri = prefix.to_uri();
  var entry = this.T[uri];
  return entry;
};

// private method seek
Fib.prototype.seek = function Fib_seek(prefix) {
  var uri = prefix.to_uri();
  var entry = this.T[uri];
  if (!entry) this.T[uri] = entry = { prefix:prefix, faceids:[], handler:false };
  return entry;
};

// public method add
Fib.prototype.add = function Fib_add(prefix, faceid_or_handler) {
  var entry = this.seek(prefix);
  if (typeof faceid_or_handler == 'number') {
    var faceid = faceid_or_handler;
    console.log('Fib.add('+prefix.to_uri()+','+faceid+')');
    if (entry.faceids.indexOf(faceid) == -1) entry.faceids.push(faceid);
  } else if (typeof faceid_or_handler == 'function') {
    var handler = faceid_or_handler;
    console.log('Fib.add('+prefix.to_uri()+',handler)');
    entry.handler = handler;
  }
};

// public method lookup
Fib.prototype.lookup = function Fib_lookup(interest) {
  for (var name = interest.name; ; name = name.getPrefix(name.size()-1)) {
    var entry = this.get(name);
    if (entry) return entry;
    if (name.size() == 0) break;
  }
  return false;
};

// private method delete_face
Fib.prototype.delete_face = function Fib_delete_face(faceid) {
  for (var uri in this.T) {
    var entry = this.T[uri];
    var i = entry.faceids.indexOf(faceid);
    if (i >= 0) entry.faceids.splice(i, 1);
    if (entry.faceids.length == 0 && entry.handler === false) {
      delete this.T[uri];
    }
  }
};

// public method provide_intclient
Fib.prototype.provide_intclient = function Fib_provide_intclient_commands(intclient) {
  this.intclient = intclient;
  intclient.provide_op('selfreg', this.intclient_command.bind(this));
  intclient.provide_op('fib', this.intclient_fib.bind(this));
};

// private method intclient_command
Fib.prototype.intclient_command = function Fib_intclient_op(op, interest, co, send_func) {
  var d = new ndn.BinaryXMLDecoder(co.content);
  var fe = new ndn.ForwardingEntry();
  fe.from_ccnb(d);
  if (fe.action != op) return;
  
  switch (op) {
    case 'selfreg': {
      console.log('Fib.selfreg('+fe.prefixName.to_uri()+','+interest.incoming_face+')');
      this.add(fe.prefixName, interest.incoming_face);
      fe.faceID = interest.incoming_face;
    } break;
    default:
      return;
  }
  
  fe.action = null;
  fe.ccndID = this.intclient.ndndid();
  fe.lifetime = 3600;
  
  send_func(new ndn.ContentObject(interest.name, fe.encodeToBinary()));
};

// private method intclient_fib
Fib.prototype.intclient_fib = function Fib_intclient_fib(op, interest, co, send_func) {
  var fiblist = [];
  for (var uri in this.T) {
    var entry = this.T[uri];
    fiblist.push({ prefix:uri, faceids:entry.faceids.concat(entry.handler?[0]:[]) });
  }
  send_func(new ndn.ContentObject(interest.name, JSON.stringify(fiblist)));
};


// ----------------------------------------------------------------
exports.Fib = Fib;

