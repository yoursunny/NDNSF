var util = require('util');
var EventEmitter = require('events').EventEmitter;
var ndn = require('ndn-on-node');


// ----------------------------------------------------------------
// class Pit
var Pit = function Pit() {
  EventEmitter.call(this);
  this.T = {};
};
util.inherits(Pit, EventEmitter);

// private static method interest_key
Pit.interest_key = function Pit_interest_key(interest) {
  var xml = interest.to_xml();
  return xml.replace(/<(?:Nonce|\/Interest).*/, '');
};

// public method lookup
Pit.prototype.lookup = function Pit_lookup(interest) {
  var key = Pit.interest_key(interest);
  var entry = this.T[key];
  return (entry && !entry.consumed) ? entry : false;
};

// public method seek
Pit.prototype.seek = function Pit_seek(interest) {
  var key = Pit.interest_key(interest);
  var entry = this.T[key];
  if (!entry) this.T[key] = entry = new PitEntry(this, interest, key);
  if (entry.consumed) entry.reset();
  return entry;
};

// public method seek
Pit.prototype.seek2 = function Pit_seek(interest) {
  var key = Pit.interest_key(interest);
  var entry = this.T[key];
  var is_new = false;
  if (!entry) this.T[key] = entry = new PitEntry(this, interest, key);
  if (entry.consumed) entry.reset();
  return entry;
};

// public method match
Pit.prototype.match = function Pit_match(co) {
  var n_matches = 0;
  for (var key in this.T) {
    var entry = this.T[key];
    if (entry.interest.matches_name(co.name)) {
      entry.add_response(co);
      ++n_matches;
    }
  }
  return n_matches;
};

// public event consume(pit_entry, faceid)

// internal method delete_entry, accessed from PitEntry
Pit.prototype.delete_entry = function Pit_delete_entry(key) {
  delete this.T[key];
};

// ----------------------------------------------------------------
// PitEntry class
var PitEntry = function PitEntry(pit, interest, pit_key) {
  EventEmitter.call(this);
  this.pit = pit;
  this.pit_key = pit_key;
  this.consumed = false;
  this.interest = interest.clone();
  this.interest_lifetime = this.interest.interestLifetime ? this.interest.interestLifetime : 4000;
  this.downstreams = {};
  this.upstreams = {};
  this.rtt_records = {};
};
util.inherits(PitEntry, EventEmitter);

// public property interest

// public method has_nonce
PitEntry.prototype.has_nonce = function PitEntry_has_nonce(nonce) {
  for (var faceid in this.downstreams) { if (DataUtils.arraysEqual(nonce, this.downstreams[faceid].nonce)) return true; }
  for (var faceid in this.upstreams) { if (DataUtils.arraysEqual(nonce, this.upstreams[faceid].nonce)) return true; }
  return false;
};

// public static method gen_nonce
PitEntry.gen_nonce = function PitEntry_gen_nonce() {
  var nonce = new Buffer(12);
  for (var i=0; i<nonce.length; i+=4) nonce.writeUInt32BE(Math.floor(0x100000000*Math.random()), i);
  return nonce;
};

// public method n_downstreams
PitEntry.prototype.n_downstreams = function PitEntry_n_downstreams() {
  return Object.keys(this.downstreams).length;
};

// public method add_downstream
PitEntry.prototype.add_downstream = function PitEntry_add_downstream(interest) {
  var faceid = interest.incoming_face;
  if (!interest.nonce) interest.nonce = PitEntry.gen_nonce();
  var item = this.downstreams[faceid];
  if (!item) this.downstreams[faceid] = item = { faceid:faceid, created:Date.now() };
  item.renewed = Date.now();
  item.expires = item.renewed + this.interest_lifetime;
  item.nonce = interest.nonce;
  clearTimeout(item.expire_timer);
  item.expire_timer = setTimeout(this.downstream_expire.bind(this, faceid), this.interest_lifetime);
};

// private method downstream_expire
PitEntry.prototype.downstream_expire = function PitEntry_downstream_expire(faceid) {
  this.emit('timeout', faceid);
  delete this.downstreams[faceid];
  if (this.is_all_expired()) this.delete_entry();
};

// public event timeout(faceid)
// Downstream times out.

// public method add_upstream
PitEntry.prototype.add_upstream = function PitEntry_add_upstream(faceid, nonce, expect) {
  var item = this.upstreams[faceid];
  if (!item) this.upstreams[faceid] = item = { faceid:faceid, created:Date.now() };
  item.renewed = Date.now();
  item.expires = item.renewed + this.interest_lifetime;
  item.nonce = nonce;
  clearTimeout(item.expire_timer);
  item.expire_timer = setTimeout(this.upstream_expire.bind(this, faceid), this.interest_lifetime);
  
  if (!expect) expect = this.interest_lifetime;
  var rr = this.get_rr(faceid);
  rr.sent = item.renewed;
  rr.expect = expect;
  clearTimeout(rr.timer);
  rr.timer = setTimeout(this.upstream_lost.bind(this, faceid), expect);
};

// private method upstream_expire
PitEntry.prototype.upstream_expire = function PitEntry_upstream_expire(faceid) {
  this.emit('expire', faceid);
  delete this.upstreams[faceid];
  if (this.is_all_expired()) this.delete_entry();
};

// public event expire
// Upstream expires.

// private method is_all_expired
PitEntry.prototype.is_all_expired = function PitEntry_is_all_expired() {
  return Object.keys(this.downstreams).length + Object.keys(this.upstreams).length == 0;
};

// public method pick_nonce
// returns a nonce to use for upstream
PitEntry.prototype.pick_nonce = function PitEntry_pick_nonce(upstream_faceid) {
  for (var faceid in this.downstreams) {
    if (faceid != upstream_faceid) return this.downstreams[faceid].nonce;
  }
  return false;
};

// internal property consumed, accessed from Pit

// internal method add_response, accessed from Pit
PitEntry.prototype.add_response = function PitEntry_add_response(co) {
  if (!this.consumed) this.satisfy(co);

  var faceid = co.incoming_face;
  var rr = this.get_rr(faceid);
  clearTimeout(rr.timer);
  
  if (rr.sent) {
    var rtt = Date.now()-rr.sent;
    this.emit('response', faceid, rr.expect, rtt);
  }
};

// private method satisfy
PitEntry.prototype.satisfy = function PitEntry_satisfy(co) {
  var now = Date.now(), delete_time = now;
  for (var faceid in this.downstreams) {
    this.emit('satisfy', faceid, co);
    delete_time = Math.max(delete_time, this.downstreams[faceid].expires);
  }
  this.consumed = true;
  this.delete_timer = setTimeout(this.delete_entry.bind(this), delete_time-now+1);
};

// public event satisfy(faceid,co)
// Downstream is satisfied. A handler should send co to downstream.

// private method delete_entry
PitEntry.prototype.delete_entry = function PitEntry_delete_entry() {
  this.pit.delete_entry(this.pit_key);
};

// internal method reset, accessed from Pit
PitEntry.prototype.reset = function PitEntry_reset() {
  clearTimeout(this.delete_timer);
  this.consumed = false;
  this.downstreams = [];
  this.upstreams = [];
};

// private method get_rr(faceid)
PitEntry.prototype.get_rr = function PitEntry_get_rr(faceid) {
  var rr = this.rtt_records[faceid];
  if (!rr) this.rtt_records[faceid] = rr = { sent:0, expect:0, timer:0 };
  return rr;
};

// public event response(faceid,expect,rtt)
// Upstream replies within or after expect time.

// private method upstream_lost
PitEntry.prototype.upstream_lost = function PitEntry_upstream_timeout(faceid) {
  var rr = this.get_rr(faceid);
  this.emit('lost', faceid, rr.expect);
};

// public method lost(faceid,expect)
// Upstream does not reply within expect time.


// ----------------------------------------------------------------
exports.Pit = Pit;
exports.PitEntry = PitEntry;

