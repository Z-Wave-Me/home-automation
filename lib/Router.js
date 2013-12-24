(function () {
    'use strict';
    window.Router = (function () {

        var Router = function (routes) {
            this.routes = routes || {
                GET: {},
                POST: {},
                PUT: {},
                DELETE: {},
                OPTIONS: {}
            };
        }

        Router.namedParam = /:\w+/g;
        Router.splatParam = /\*\w+/g;

        Router.prototype.route = function (method, route, callback) {
          route = route.replace(Router.namedParam, '([^\/]+)').replace(Router.splatParam, '(.*?)');
          return this.routes[method]["^" + route + "$"] = callback;
        };

        Router.prototype.notAllowed = function (method, path) {
            var obj = {code: 405, message: '405 Method Not Allowed', method: method, path: path};
            console.log(JSON.stringify(obj));
            return obj;
        }

        Router.prototype.notImplemented = function (method, path) {
            var obj = {code: 501, message: '501 Not Implemented', method: method, path: path};
            console.log(JSON.stringify(obj));
            return obj;
        }

        Router.prototype.checkRoutes = function(method, path) {
            var callback, regex, regexText, _ref, i = 0,
                check = this.routes.hasOwnProperty(method) ? Object.keys(this.routes[method]).length : null;

            if (check) {
                _ref = this.routes[method];
                for (regexText in _ref) {
                    callback = _ref[regexText];
                    regex = new RegExp(regexText);
                    if (regex.test(path)) {
                        console.log(regex.exec(path).slice(1))
                        callback.apply(window, regex.exec(path).slice(1));
                    } else if (i === Object.keys(_ref).length -1 && !regex.test(path)) {
                        this.notImplemented(method, path);
                    }
                }
            } else if (check === null) {
                this.notAllowed(method, path);
            } else {
                this.notImplemented(method, path);
            }
        };

        Router.prototype.navigate = function (method, path) {
            this.checkRoutes(method, path);
        };

        return Router;

    })();

}).call(this);



