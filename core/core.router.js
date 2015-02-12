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

                self.routes = routes;
                self._routes = [];

                Object.keys(routes).forEach(function (route) {
                    var method = typeof self.routes[route] === 'function' ? self.routes[route] : null;
                    self._routes.push({
                        pattern: new RegExp('^' + route.replace(/:\w+/g, '(\\w+)') + '$'),
                        callback: method
                    });
                });
            },
            dispatch: function (request) {
                var self = this,
                    i = self._routes.length,
                    method = request.method || 'GET',
                    path = request.url,
                    defaultAllowMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
                    allowMethods = global.App ? global.App.remoting.allowMethods : defaultAllowMethods;

                request.path = request.url.replace(/^.*\/\/[^\/]+/, '');

                while (i--) {
                    var args = request.path.match(self._routes[i].pattern);
                    if (args) {
                        var eventObject = {
                                method: method,
                                params: args.slice(1),
                                req: request
                            };

                        if (_.isFunction(this._routes[i].callback)) {
                            self._routes[i].callback.call(self, eventObject);
                        } else if (_.isObject(this._routes[i].callback)) {
                            if (allowMethods.indexOf(method.toUpperCase()) !== -1 &&
                                _.isFunction(self._routes[i][method.toLowerCase()])) {
                                self._routes[i][method.toLowerCase()].call(self, eventObject);
                            }
                        }

                        self.trigger(path, eventObject);
                    }
                }
            }
        });

    Router.Extend = Core.Helpers.Extend;
    Core.Router = Router;
}());