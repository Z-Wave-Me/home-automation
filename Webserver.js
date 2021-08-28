/*** Initialize Webserver and Handlers *****************************************

 Version:
 -------------------------------------------------------------------------------
 Author: Serguei Poltorak <ps@zwave.me>
 Copyright: (c) ZWave.Me, 2015

 ******************************************************************************/

ws = new WebServer(8083, function(req) {
	if (req.method === "OPTIONS") {
		return this.addHTTPHeaders({
			status: 200
		});
	}

	var found = ws.find(req);	
	if (found) {
		var auth = controller.auth.resolve(req, found.role);
		if (!auth) {
			return this.addHTTPHeaders({
				status: 401,
				body: "Not logged in"
			});
		} else if (controller.auth.isAuthorized(auth.role, found.role)) {
			return this.addHTTPHeaders(ws.execute(found.name, req, auth));
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
	var obj = JSON.parse(msg);
	
	var profile = controller.getProfile(user);
	if (obj.event === "httpEncapsulatedRequest") {
		var role = profile.role;
		
		// authentication data
		var auth = { user: user, role: role, token: "....." };

		// extract query string		
		var query = {};
		var url = obj.data.url;
		
		var i = url.indexOf("?");
		if (i > -1) {
			url.substring(i + 1).split("&").map(function(q) {
				var qq = q.split("=");
				query[qq[0]] = qq[1]
			});
			url = url.substring(0, i);
		}

		// body
		var body = obj.data.body;
		
		var req = {
			method: obj.data.method,
			url: url,
			fullUrl: obj.data.url,
			query: query,
			body: (typeof body === "string" || typeof body === "undefined") ? body : JSON.stringify(body),
			peer: {
				address: "....",
				port: 0000
			},
			headers: {},
			__authMethod: "....",
			user: auth.user,
			role: auth.role,
			authToken: auth.token
		};

		var found = ws.find(req);
		
		if (found && controller.auth.isAuthorized(role, found.role)) {
			return ws.execute(found.name, req, auth);
		} else {
			return {
				status: 404
			}
		}
	}
}, {
	document_root: "htdocs"
});

ws.find = function(req) {
	var q = req.url.substring(1).replace(/\//g, '.');
	if (!q) return null;
	
	var found = null;
	if (this.externalNames.some(function(ext) {
		found = ext;
		return (ext.name.length < q.length && q.slice(0, ext.name.length + 1) === ext.name + ".") || (ext.name === q);
	})) {
		return found;
	} else {
		return null;
	}
};

ws.execute = function(name, req, auth) {
	var cache = this.evalCache || (this.evalCache = {});
	var handler = cache[name] || (cache[name] = evalPath(name));
	return handler(req.url.substring(name.length + 1), req, auth);
};

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
