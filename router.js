// Make this testable by pulling in underscore from the parent module
if (typeof _ === "undefined" && typeof module !== "undefined" && module.parent) {
  var _ = module.parent.exports._;
}

Router = function(namespace) {
  this.routes = {};
  this.namespace = namespace || "/v1";
};

Router.prototype = {
  get: function(path, role, handler, preprocessors) {
	return this.addRoute("GET", path, role, handler, preprocessors);
  },

  post: function(path, role, handler, preprocessors) {
	return this.addRoute("POST", path, role, handler, preprocessors);
  },

  put: function(path, role, handler, preprocessors) {
	return this.addRoute("PUT", path, role, handler, preprocessors);
  },

  del: function(path, role, handler, preprocessors) {
	return this.addRoute("DELETE", path, role, handler, preprocessors);
  },

  addRoute: function(method, path, role, handler, preprocessors) {
	var ns = this.routes[this.namespace] = this.routes[this.namespace] || {},
		preprocessors = preprocessors || [],
		route;

	ns[method] = ns[method] || {};

	if (ns[method][path]) {
	  console.error("Path already registered, ignoring...");
	  return;
	}

	if (_.contains(path, ":")) {
	  var route = this._parseRoute(path, preprocessors);
	  ns[method].patterns = ns[method].patterns || [];
	  ns[method].patterns.push(_.extend(route, {role: role, handler: handler, preprocessors: preprocessors}));
	} else {
	  ns[method][path] = {role: role, handler: handler, preprocessors: preprocessors};
	}

	return this;
  },

  /**
   * The assumption that we only support :variable_format, we will only check
   * for alphanumeric and underscores.
   */
  _parseRoute: function(path, preprocessors) {
	var parts = path.split("/"),
		parameters = [];

	var pattern = _.map(parts, function(segment, index) {
	  if (segment.length > 0 && segment.indexOf(':') !== -1) {
		// Keep track of the parameters we've replaced
		parameters.push(segment.slice(1));
		return index == parts.length - 1 ? "(.+)" : "([^/]+)"; // last argument can contain /
	  }
	  return segment;
	}).join("/");

	return {params: parameters, pattern: new RegExp(pattern)};
  },

  dispatch: function(method, url) {
	var parts = url.split("/"),
		namespace = _.first(parts, 2).join("/"),
		path = "/" + _.rest(parts, 2).join("/"),
		lookup, role, handler, params, preprocessors;

	var ns = this.routes[namespace];
	if (ns && ns[method]) {
	  handler = ns[method][path];
	  if (handler) {
		return {role: handler.role, handler: handler.handler, params: []};
	  } else {
		_.find(ns[method].patterns, function(r) {
		  var matches = r.pattern.exec(path);
		  if (!!matches) {
			params = matches.slice(1);
			role = r.role;
			handler = r.handler;
			preprocessors = r.preprocessors;
			return true;
		  }
		});

		if (params && handler) {
		  params = _.map(params, function(param, i) {
			  var proc = preprocessors[i] || _.identity;
			  return proc(param);
		  });
		  return {role: role, handler: handler, params: params};
		}
	  }
	}
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = Router;
};
