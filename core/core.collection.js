/* Start Core/Collection */

'use strict';
; (function () {
    /**
     * Extend function.
     * @exports Core/Collection
     */

    var Core = global.Core,
        API = Core.Base.Extend({
            collection: null,
            routes: {},
            getModelsFromCollection: function () {
                var self = this;

                return {
                    found: true,
                    error: null,
                    data: self.collection.toJSON()
                };
            },
            getModelFromCollection: function () {
                return {
                    found: true,
                    error: null,
                    data: {
                        id: 19
                    }
                };
            },
            checkExists: function () {
                return {
                    id: 20
                };
            },
            createModel: function () {
                return {
                    id: 45
                };
            },
            updateModel: function () {
                return {
                    id: 63
                };
            },
            countModels: function () {
                return {
                    count: 72
                };
            },
            deleteModel: function () {
                return {
                    id: 99
                };
            },
            initialize: function () {
                var self = this,
                    App = global.App,
                    prefix = self.prefix.toLowerCase();

                // - /
                self.routes[prefix] = function collectionMethods (request) {
                    if (request.method === 'GET') {
                        return collectionMethods.get.call(self, request);
                    } else if (request.method === 'POST') {
                        return collectionMethods.post.call(self, request);
                    }
                };

                self.routes[prefix].get = self.getModelsFromCollection;
                self.routes[prefix].post =  self.createModel;

                // /:id
                self.routes[prefix + '/:id'] = function modelsMethods (request) {
                    if (request.method === 'GET') {
                        return modelsMethods.get.call(self, request);
                    } else if (request.method === 'POST') {
                        return modelsMethods.post.call(self, request);
                    } else if (request.method === 'PUT') {
                        return modelsMethods.put.call(self, request);
                    } else if (request.method === 'HEAD') {
                        return modelsMethods.head.call(self, request);
                    } else if (request.method === 'DELETE') {
                        return modelsMethods.delete.call(self, request);
                    }
                };
                self.routes[prefix + '/:id'].get = self.getModelFromCollection;
                self.routes[prefix + '/:id'].post =  self.updateModel;
                self.routes[prefix + '/:id'].put =  self.updateModel;
                self.routes[prefix + '/:id'].head =  self.checkExists;
                self.routes[prefix + '/:id'].delete =  self.deleteModel;

                App.Router.addRoutes(self.routes);
            }
        }),
        Collection = Core.Base.Extend({
            models: [],
            length: 0,
            model: null,
            init: function () {
                var self = this;

                // defaults
                self.policy = self.policy || {};
                self.settings = self.settings || {};

                //aliases
                self.each = self.forEach;
                self.detect = self.find;
                self.select = self.where;

                // restore data
                self._loadDataFromFileSystem();

                // enable api
                if (self.policy.public) {
                    self._enableAPI.call(self);
                }

                // add listener
                self.on('all', self.save);
            },
            at: function (index) {
                return this.models[index] || undefined;
            },
            has: function (identificator) {
                return Boolean(this.get(identificator));
            },
            get: function (identificator) {
                return this.find(function (model) {
                    return model.id === identificator || model.cid === identificator;
                });
            },
            add: function (modelData) {
                var self = this,
                    model = modelData instanceof Core.Model ? modelData : new self.model(_.clone(modelData));

                model.cid = _.uniqueId('c');
                self.models.push(model);
                self._updateLength();

                return self.last();
            },
            remove: function (model) {
                var self = this;

                self.models = self.filter(function (m) {
                    return m !== model;
                });

                delete model.cid;
                model.remove();
                self._updateLength();
                self.trigger('remove', model);

                return model;
            },
            reset: function () {
                var self = this;
                self.models.forEach(function (m) {
                    self.remove(m);
                });
                self._updateLength();
                self.trigger('reset', self);

                return self;
            },
            size: function () {
                return this.models.length;
            },
            pluck: function (propertyName) {
                return _.pluck.call(this, this.toJSON(), propertyName);
            },
            filter: function (callback) {
                return _.filter.call(this, this.models, callback);
            },
            where: function (properties) {
                var self = this;

                return self.filter(function (model) {
                    return _.every(Object.keys(properties), function (key) {
                       return model[key] === properties[key];
                    });
                });
            },
            find: function (callback) {
                return _.find.call(this, this.models, callback);
            },
            findWhere: function (properties) {
                var self = this,
                    result = self.where(properties);

                if (result.length > 0) {
                    return _.first(result);
                } else {
                    return undefined;
                }
            },
            forEach: function (callback) {
                return _.each.call(this, this.models, callback);
            },
            indexOf: function (model) {
                return this.models.indexOf(model);
            },
            toJSON: function () {
                return _.map.call(this, this.models, function (model) {
                    return model.toJSON();
                });
            },
            _updateLength: function () {
                this.length = this.size();
            },
            first: function () {
                return _.first(this.models);
            },
            last: function () {
                return _.last(this.models);
            },
            save: function () {
                var self = this;

                if (self.policy && self.policy.dataSource === 'filesystem') {
                    global.saveObject(self.policy.file + '.json', self.toJSON());
                }
            },
            _loadDataFromFileSystem: function () {
                var self = this, data = [];

                if (self.policy && self.policy.dataSource === 'filesystem') {
                    data = global.loadObject(self.policy.file + ".json") || [];
                }

                data.forEach(self.add);
            },
            _enableAPI: function () {
                var self = this,
                    APIConstructor = API.Extend({
                        collection: self,
                        prefix: '/api/v1/' + self.settings.pluralName || self.settings.name + 's'
                    });

                self.api = new APIConstructor();
            }
        });

    API.Extend = Core.Helpers.Extend;
    Collection.Extend = Core.Helpers.Extend;
    Core.API = Collection;
    Core.Collection = Collection;
}());