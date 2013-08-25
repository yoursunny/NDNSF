var ndn = require('ndn-on-node');


// ----------------------------------------------------------------
// class Strategy
var Strategy = function Strategy(fib, pit, facemgr) {
  this.fib = fib;
  this.pit = pit;
  this.facemgr = facemgr;
};

// public method interest
Strategy.prototype.interest = function Strategy_interest(interest) {
  console.log('Strategy.interest('+interest.name.to_uri()+' from '+interest.incoming_face+')');
  var pe = this.pit.seek(interest);
  if (pe.n_downstreams() >= 1) {// old PitEntry
    pe.add_downstream(interest);
    this.propagate(pe, interest);
    return;
  }
  pe.add_downstream(interest);
  this.bind_pe(pe);
  this.propagate(pe, interest);
};

// protected method propagate
Strategy.prototype.propagate = function Strategy_propagate(pe, interest) {
  var fe = this.fib.lookup(interest);
  if (!fe) {
    console.log('Strategy.propagate('+interest.name.to_uri()+') no FIB entry');
    return;
  }
  if (fe.handler) {
    console.log('Strategy.propagate('+interest.name.to_uri()+') handler');
    fe.handler(interest);
  }
  // broadcast strategy
  var sent_to = fe.faceids.filter(function(faceid){
    return this.propagate_to(pe, faceid);
  }.bind(this));
  if (sent_to.length > 0) console.log('Strategy.propagate('+interest.name.to_uri()+') to '+sent_to.join());
};

// protected method propagate_to
Strategy.prototype.propagate_to = function Strategy_propagate_to(pe, upstream, expect) {
  var face = this.facemgr.get(upstream);
  if (!face) return false;
  var nonce = pe.pick_nonce(upstream);
  if (!nonce) return false;
  pe.add_upstream(upstream, nonce, expect);
  pe.interest.nonce = nonce;
  face.send(pe.interest);
  return true;
};

// public method co
Strategy.prototype.co = function Strategy_co(co) {
  console.log('Strategy.co('+co.name.to_uri()+' from '+co.incoming_face+')');
  this.pit.match(co);
};

// protected method bind_pe
Strategy.prototype.bind_pe = function Strategy_bind_pe(pe) {
  pe.on('satisfy', this.send_co.bind(this));
};

// protected method send_co
// PitEntry.satisfy event handler
Strategy.prototype.send_co = function Strategy_send_co(faceid, co) {
  var face = this.facemgr.get(faceid);
  if (face) face.send(co);
};


// ----------------------------------------------------------------
exports.Strategy = Strategy;

