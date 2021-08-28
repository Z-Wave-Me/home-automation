/*** Initialize Webserver and Handlers *****************************************

 Version:
 -------------------------------------------------------------------------------
 Author: Serguei Poltorak <ps@zwave.me>
 Copyright: (c) ZWave.Me, 2015

 ******************************************************************************/

ws = new WebServer(8083, function(req) {
	var q = req.url.substring(1).replace(/\//g, '.');
	if (!q) return null;
	
	if (req.method === "OPTIONS") {
		return this.addHTTPHeaders({
			status: 200
		});
	}
	
	var found = null;
	if (this.externalNames.some(function(ext) {
		found = ext;
		return (ext.name.length < q.length && q.slice(0, ext.name.length + 1) === ext.name + ".") || (ext.name === q);
	}) && found) {
		var auth = controller.auth.resolve(req, found.role);
		if (!auth) {
			return this.addHTTPHeaders({
				status: 401,
				body: "Not logged in"
			});
		} else if (controller.auth.isAuthorized(auth.role, found.role)) {
			// fill user field
			req.user = auth.user;
			req.role = auth.role;
			req.authToken = auth.token;
			
			var cache = this.evalCache || (this.evalCache = {});
			var handler = cache[found.name] || (cache[found.name] = evalPath(found.name));
			return this.addHTTPHeaders(handler(req.url.substring(found.name.length + 1), req));
		} else {
			return this.addHTTPHeaders({
				status: 403,
				body: 'Permission denied'
			});
		}
	}
	
	return null;
}, function(req) {
	var auth = controller.auth.resolve(req, controller.auth.ROLE.USER);
	if (!auth) {
		return 0; // there is no profile with Id = 0
	} else {
		return auth.user;
	}
}, function(user, msg) {
}, {
	document_root: "htdocs"
});

ws.externalNames = []; // array of object {name, role}
ws.allowExternalAccess = function(name, role) {
	// refresh cache anyways, even if adding duplicate name
	if (this.evalCache)
		delete this.evalCache[name];

	var idx = this.externalNames.map(function (ext) { return ext.name}).indexOf(name);
	if (idx >= 0) return;

	this.externalNames.push({name: name, role: role || controller.auth.ROLE.ADMIN});
	this.externalNames.sort(function(x, y) {
		return (y.name.length - x.name.length) || (x.name > y.name ? 1 : -1);
	});
};
ws.revokeExternalAccess = function(name) {
	// remove cached handler (if any)
	if (this.evalCache)
		delete this.evalCache[name];

	var idx = this.externalNames.map(function (ext) { return ext.name}).indexOf(name);
	if (idx === -1) return;
	
	this.externalNames.splice(idx, 1);
};

// Standard HTTP headers: HTTP and keep-laive
ws.allow_headers = [
		'Authorization',
		'Accept-Ranges',
		'Content-Encoding',
		'Content-Length',
		'Content-Range',
		'Content-Type',
		'ETag',
		'X-API-VERSION',
		'Date',
		'Cache-Control',
		'If-None-Match',
		'Content-Language',
		'Accept-Language',
		'X-ZBW-SESSID',
		'ZWAYSession'
	].join(', ');

ws.addHTTPHeaders = function (ret) {
	if (!ret.headers) ret.headers = {};
	ret.headers['Access-Control-Allow-Origin'] = '*';
	ret.headers['Access-Control-Allow-Methods'] = 'GET, PUT, POST, DELETE, OPTIONS';
	ret.headers['Access-Control-Allow-Headers'] = this.allow_headers;
	ret.headers['Access-Control-Expose-Headers'] = this.allow_headers;
	ret.headers['Connection'] = 'keep-alive';
	ret.headers['Date'] = (new Date()).toUTCString();
	
	return ret;
};
