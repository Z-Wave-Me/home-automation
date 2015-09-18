
// Start webserver and set up handlers

ws = new WebServer(8083, function(req) {
	var q = req.url.substring(1).replace(/\//g, '.');
	if (!q) return null;
	
	var found = null;
	if (this.externalNames.some(function(ext) {
		found = ext;
		return (ext.name.length < q.length && q.slice(0, ext.name.length + 1) === ext.name + ".") || (ext.name === q);
	}) && found) {
		var auth = controller.auth.resolve(req, found.role);
		if (!auth) {

			return {
				status: 401,
				body: "Not logged in"
			};

		} else if (controller.auth.isAuthorized(auth.role, found.role)) {

			// fill user field
			req.user = auth.user;
			req.role = auth.role;
			
			var cache = this.evalCache || (this.evalCache = {});
			var handler = cache[found.name] || (cache[found.name] = evalPath(found.name));
			return handler(req.url.substring(found.name.length + 1), req);

		} else {

			return {
				status: 403,
				body: 'Permission denied'
			};
			
		}
	}
	
	return null;
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

