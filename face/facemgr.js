var util = require('util');
var EventEmitter = require('events').EventEmitter;
var ndn = require('ndn-on-node');


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

// public method provide_intclient
FaceMgr.prototype.provide_intclient = function FaceMgr_provide_intclient(intclient) {
  intclient.provide_op('faces', this.intclient_faces.bind(this));
};

// private method intclient_faces
FaceMgr.prototype.intclient_faces = function FaceMgr_intclient_faces(op, interest, co, send_func) {
  var facelist = [];
  for (var id in this.faces) {
    var face = this.faces[id];
    facelist.push({ id:parseInt(id), desc:face.desc() });
  }
  send_func(new ndn.ContentObject(interest.name, JSON.stringify(facelist)));
};


// ----------------------------------------------------------------
exports.FaceMgr = FaceMgr;

