

// ----------------------------------------------------------------
// class RttEstimator
var RttEstimator = function RttEstimator() {
  this.n_samples = 0;
  this.rtt = 1000.0;
  this.variance = 0;
  this.multiplier = 1;
  this.gain = 0.1;

  this.min_rto = 10.0;
  this.max_multiplier = 16;
};

// public method measurement
RttEstimator.prototype.measurement = function RttEstimator_measurement(m) {
  if (this.n_samples) {
    var err = m - this.rtt;
    this.rtt += err * this.gain;
    this.variance += (Math.abs(err) - this.variance) * this.gain;
  } else {
    this.rtt = m;
    this.variance = m/2;
  }
  ++this.n_samples;
};

// public method increase_multiplier
RttEstimator.prototype.increase_multiplier = function RttEstimator_increase_multiplier() {
  this.multiplier = Math.min(this.max_multiplier, this.multiplier*2);
};

// public method reset_multiplier
RttEstimator.prototype.reset_multiplier = function RttEstimator_reset_multiplier() {
  this.multiplier = 1;
}

// public method rto
RttEstimator.prototype.rto = function RttEstimator_rto() {
  return Math.max(this.min_rto, (this.rtt + 4*this.variance) * this.multiplier);
};


// ----------------------------------------------------------------
// class NamePrefixTable
// NamePrefixTable is solely used for strategy decision support.
// It does not act as FIB or PIT.
var NamePrefixTable = function NamePrefixTable() {
  this.T = {};
};

// private method entry_seek
NamePrefixTable.prototype.entry_seek = function NamePrefixTable_entry_seek(name, expires) {
  var name_key = name.to_uri();
  var entry = this.T[name_key];
  if (expires === false) return entry;
  if (!entry) this.T[name_key] = entry = { _expiry:0, _timer:0 };

  var now = Date.now(), expiry = now + expires;
  entry._expiry = Math.max(entry._expiry, expiry);
  clearTimeout(entry._timer);
  entry._timer = setTimeout(this.entry_expiry.bind(this, name_key), entry._expiry - now);
  
  return entry;
};

// private method entry_expiry
NamePrefixTable.prototype.entry_expiry = function NamePrefixTable_entry_expiry(name_key) {
  var now = Date.now;
  var entry = this.T[name_key];
  if (now >= entry._expiry) {
    delete this.T[name_key];
  } else {
    setTimeout(this.entry_expiry.bind(this, name_key), entry._expiry - now);
  }
};

// public method set
NamePrefixTable.prototype.set = function NamePrefixTable_add(name, key, value, expires) {
  if (!expires) expires = 2000;
  var entry = this.entry_seek(name, expires);
  entry[key] = value;
};

// public method renew_or_set
// If key exists, renew; otherwise, set to new_value or create_new_value().
NamePrefixTable.prototype.renew_or_set = function namePrefixTable_get(name, key, new_value, expires, create_new_value) {
  var entry = this.entry_seek(name, expires);
  if (entry[key] === undefined) {
    if (typeof new_value == 'undefined') {
      entry[key] = create_new_value();
    } else {
      entry[key] = new_value;
    }
  }
  return entry[key];
};

// public method get
NamePrefixTable.prototype.get = function namePrefixTable_get(name, key) {
  var entry = this.entry_seek(name, false);
  if (!entry) return undefined;
  return entry[key];
};


// ----------------------------------------------------------------
exports.RttEstimator = RttEstimator;
exports.NamePrefixTable = NamePrefixTable;

