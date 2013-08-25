var util = require('util');
var ndn = require('ndn-on-node');
var Strategy = require('./strategy').Strategy;
var RttEstimator = require('./utils').RttEstimator;
var NamePrefixTable = require('./utils').NamePrefixTable;


// ----------------------------------------------------------------
// class SmartStrategy
// Upstreams responded recently are preferred. The upstream with lowest RTO is used.
// If no upstream has recently responded, a random upstream is picked.
// By probe_probability, another less preferred upstream is explored with a copy of Interest.
var SmartStrategy = function SmartStrategy(fib, pit, facemgr) {
  Strategy.call(this, fib, pit, facemgr);
  this.T = new NamePrefixTable();
};
util.inherits(SmartStrategy, Strategy);

// private property probe_probability
SmartStrategy.prototype.probe_probability = 0.1;

// private property estimation_valid_time
SmartStrategy.prototype.estimation_valid_time = 8000;

// private method seek_estimations
SmartStrategy.prototype.seek_estimations = function SmartStrategy_seek_estimations(name) {
  return this.T.renew_or_set(name.getPrefix(name.size()-1), 'estimations', {}, 2*this.estimation_valid_time);
};

// private method seek_estimation
SmartStrategy.prototype.seek_estimation = function SmartStrategy_seek_estimation(name, faceid) {
  var estimations = this.seek_estimations(name);
  var estimation = estimations[faceid];
  if (estimation) return estimation;
  return estimations[faceid] = new RttEstimator();
};

// protected method propagate
SmartStrategy.prototype.propagate = function SmartStrategy_propagate(pe, interest) {
  var fe = this.fib.lookup(interest);
  if (!fe) return;
  if (fe.handler) fe.handler(interest);
  if (fe.faceids.length == 0) {
    console.log('SmartStrategy.propagate('+interest.name.to_uri()+') no face');
    return;
  }
  
  var estimations = this.seek_estimations(interest.name);

  var now = Date.now(), valid_estimation_updated = now - this.estimation_valid_time, max_rto = 0;
  var upstreams = fe.faceids.map(function(faceid){
    var estimation = estimations[faceid];
    if (estimation && estimation.updated >= valid_estimation_updated) {
      var rto = estimation.rto();
      max_rto = Math.max(max_rto, rto);
      return { faceid:faceid, score:rto, rto:rto };
    }
    return { faceid:faceid, score:999999+Math.random() };
  }, this).sort(function(a,b){ return a.score - b.score; });
  if (max_rto == 0) max_rto = 500;
  
  var sent_i = false;
  upstreams.some(function(upstream, i) {
    if (this.propagate_to(pe, upstream.faceid, upstream.rto || max_rto*2)) {
      sent_i = i;
      return true;
    }
    return false;
  }, this);
  if (sent_i === false) {
    console.log('SmartStrategy.propagate('+interest.name.to_uri()+') no upstream');
    return;
  }
  
  var probe_i = false;
  if (sent_i !== false && sent_i+1 < upstreams.length && Math.random() < this.probe_probability) {
    probe_i = sent_i+1 + Math.floor((upstreams.length - sent_i-1) * Math.random());
    var upstream = upstreams[probe_i];
    if (!this.propagate_to(pe, upstream.faceid, upstream.rto || max_rto*2)) probe_i = false;
  }
  
  var disp_upstream = function(i) {
    var upstream = upstreams[i];
    return upstream.faceid + (upstream.rto ? '(rto='+Math.ceil(upstream.rto)+')' : '');
  };
  console.log('SmartStrategy.propagate('+interest.name.to_uri()+') to '+disp_upstream(sent_i) + (probe_i===false?'':' probe '+disp_upstream(probe_i)));
};

// protected method bind_pe
SmartStrategy.prototype.bind_pe = function SmartStrategy_bind_pe(pe) {
  Strategy.prototype.bind_pe.call(this, pe);
  pe.on('response', this.on_response.bind(this, pe));
  pe.on('lost', this.on_lost.bind(this, pe));
};

// private method on_response
SmartStrategy.prototype.on_response = function SmartStrategy_on_response(pe, faceid, expect, rtt) {
  if (expect < rtt) return;
  console.log('SmartStrategy.on_response('+pe.interest.name.to_uri()+') upstream '+faceid+' rtt='+rtt);
  var estimation = this.seek_estimation(pe.interest.name, faceid);
  estimation.reset_multiplier();
  estimation.measurement(rtt);
  estimation.updated = Date.now();
};

// private method on_lost
SmartStrategy.prototype.on_lost = function SmartStrategy_on_lost(pe, faceid, expect) {
  console.log('SmartStrategy.on_lost('+pe.interest.name.to_uri()+') upstream '+faceid);
  var estimation = this.seek_estimation(pe.interest.name, faceid);
  estimation.increase_multiplier();
};


// ----------------------------------------------------------------
exports.SmartStrategy = SmartStrategy;

