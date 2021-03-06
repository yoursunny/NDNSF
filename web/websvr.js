var http = require('http');
var urlparse = require('url').parse;
var WebSocketListener = require('../face').WebSocketListener;


// ----------------------------------------------------------------
// class WebServer
var WebServer = function WebServer(port) {
  this.server = http.createServer(this.request.bind(this)).listen(port);
  console.log('WebServer('+port+')');
  this.routes = [];
  this.provide_op('/', this.op_index.bind(this));
  this.provide_op('/robots.txt', this.op_robots.bind(this));
};

// public method close
WebServer.prototype.close = function WebServer_close() {
  this.server.close();
};

// public method create_wslistener
WebServer.prototype.create_wslistener = function WebServer_create_wslistener(path) {
  return new WebSocketListener(this.server, path);
};

// private method request
WebServer.prototype.request = function WebServer_request(req, resp) {
  console.log('WebServer.request('+req.url+')');
  var parsed;
  try { parsed = urlparse(req.url, true); }
  catch(ex) { resp.writeHead(400); resp.end(); return; }
  for (var i=0; i<this.routes.length; ++i) {
    var route = this.routes[i];
    var m = false;
    if (typeof route.pattern == 'string') {
      m = route.pattern == parsed.pathname;
    } else if (route.pattern instanceof RegExp) {
      m = parsed.pathname.match(route.pattern);
    }
    if (!m) continue;
    route.handler(req, resp, parsed, m);
    return;
  }
  resp.writeHead(404); resp.end();
};

// public method provide_op
// handler(req, resp, url_parsed, url_match)
WebServer.prototype.provide_op = function WebServer_provide_op(pattern, handler) {
  this.routes.push({ pattern:pattern, handler:handler });
};

// private method op_index
WebServer.prototype.op_index = function WebServer_op_index(req, resp) {
  resp.end('<!doctype html><title>NDNSF</title><h1>NDNSF - NDN Slim Forwarder</h1><p><a href="http://yoursunny.com/p/NDNSF/">NDNSF homepage</a><p><a href="/mgr">NDNSF Manager</a>');
};

// private method op_robots
WebServer.prototype.op_robots = function WebServer_op_robots(req, resp) {
  resp.end('User-Agent: *\nDisallow: /');
};

// ----------------------------------------------------------------
exports.WebServer = WebServer;

