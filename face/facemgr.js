var util = require('util');
var EventEmitter = require('events').EventEmitter;


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
exports.FaceMgr = FaceMgr;

