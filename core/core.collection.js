/* Initialized Core/Collection */

'use strict';
; (function () {
    /**
     * Extend function.
     * @exports Core/Collection
     */
    var Core = global.Core,
        Collection = Core.Base.Extend({
            models: [],
            length: 0,
            init: function (initData) {
                var self = this;

                //aliases
                self.each = self.forEach;
                self.detect = self.find;
                self.select = self.where;

                // set default model
                if (!self.model) {
                    self.model = Core.Model.Extend({});
                }

                // add models
                if (_.isArray(initData)) {
                    _.each(initData, function (data) {
                        self.add(data);
                    });
                }

                // set SaveObjectName
                self.saveObjectName = initData.saveObjectName;
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
            }
        });

    Collection.Extend = Core.Helpers.Extend;
    Core.Collection = Collection;

}());