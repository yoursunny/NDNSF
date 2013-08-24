var http = require('http');
var urlparse = require('url').parse;


// ----------------------------------------------------------------
// class WebServer
var WebServer = function WebServer(port) {
  this.svr = http.createServer(this.request.bind(this)).listen(port);
  this.routes = [];
  this.provide_op('/robots.txt', this.op_robots.bind(this));
};

// public method close
WebServer.prototype.close = function WebServer_close() {
  this.svr.close();
};

// private method request
WebServer.prototype.request = function WebServer_request(req, resp) {
  var parsed;
  try { parsed = urlparse(req.url, true); }
  catch(ex) { resp.writeHead(400); resp.end(); }
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

// private method op_robots
WebServer.prototype.op_robots = function WebServer_op_robots(req, resp) {
  resp.end('User-Agent: *\nDisallow: /');
};

// ----------------------------------------------------------------
exports.WebServer = WebServer;

