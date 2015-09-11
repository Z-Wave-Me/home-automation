/* Start Core/Base */
'use strict';
; (function () {
    /**
     * Router class
     * @constructor
     * @class Router
     */
    var Core = global.Core,
        Router = Core.Base.Extend({
            routes: [],
            _routes: [],
            delimeter: '\/',
            _methods: {},
            initialize: function (routes) {
                var self = this;

                routes = routes || [];
                self._routes = [];

                self.addRoutes(routes);
            },
            addRoutes: function (routes) {
                var self = this;

                Object.keys(routes).forEach(function (route) {
                    self.addRoute(route, routes[route]);
                });
            },
            addRoute: function (route, method) {
                var self = this;
                method = method || null;

                self._routes.push({
                    pattern: new RegExp('^' + route.replace(/:\w+/g, '(\\w+)') + '$'),
                    callback: method
                });
            },
            dispatch: function (request, callback) {
                var self = this,
                    result = null,
                    i = self._routes.length,
                    method = request.method || 'GET',
                    path = request.url,
                    defaultAllowMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
                    allowMethods = global.App ? global.App.config.remoting.allowMethods : defaultAllowMethods;

                request.path = request.url.replace(/\/ZAutomation+/, '');

                while (i--) {
                    var args = request.path.match(self._routes[i].pattern);
                    if (args) {
                        var eventObject = {
                                method: method,
                                params: args.slice(1),
                                req: request
                            };

                        if (_.isFunction(this._routes[i].callback)) {
                            result = self._routes[i].callback.call(self, eventObject);
                        } else if (_.isObject(this._routes[i].callback)) {
                            if (allowMethods.indexOf(method.toUpperCase()) !== -1 &&
                                _.isFunction(self._routes[i][method.toLowerCase()])) {
                                result = self._routes[i][method.toLowerCase()].call(self, eventObject, callback);
                            }
                        }

                        self.trigger(path, eventObject);
                    }
                }

                return result;
            },
            exists: function (request) {
                var self = this, i = self._routes.length,
                    path = request.url.replace(/\/ZAutomation+/, '');

                while (i--) {
                    var args = path.match(self._routes[i].pattern);
                    if (args) {
                        return true;
                    }
                }
            }
        });

    Router.Extend = Core.Helpers.Extend;
    Core.Router = Router;
}());