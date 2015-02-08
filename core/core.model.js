/* Initialized Core/Model */

'use strict';
; (function () {
    /**
     * Core.Model.
     * @exports Core/Model
     */
    var Core = global.Core,
        Model = Core.Base.Extend({
            defaults: {},
            cid: null,
            id: null,
            changed: {},
            _previously: {},
            options: {},
            collection: null,
            attributes: {},
            init: function (initData) {
                var self = this,
                    currentDate = new Date(),
                    callDefaultFunc;

                _.extend(self.attributes, {
                    meta: {
                        updated: currentDate.toISOString(),
                        created: currentDate.toISOString()
                    }
                });

                // set default parameters
                if (_.isObject(self.defaults)) {
                    _.defaults(self.attributes, self.defaults);
                } else if (_.isFunction(self.defaults)) {
                    callDefaultFunc = self.defaults();
                    if (_.isObject(callDefaultFunc)) {
                        _.defaults(self.attributes, callDefaultFunc);
                    }
                }

                // set external params
                if (_.isObject(initData)) {
                    self.set(initData);
                }
            },
            has: function (name) {
                return Boolean(this.get(name));
            },
            get: function (name) {
                var self = this,
                    parent = self.attributes,
                    parts = name.split('.'),
                    result;

                for (var i = 0, len = parts.length; i < len; i += 1) {
                    if (parent[parts[i]] !== undefined && i === (len - 1)) {
                        result = _.isObject(parent[parts[i]]) ? _.clone(parent[parts[i]]) : parent[parts[i]];
                    } else if (parent[parts[i]] === undefined) {
                        result =  undefined;
                    }

                    parent = parent[parts[i]];
                }

                return result;
            },
            set: function (key, value, options) {
                var self = this,
                    currentDate = new Date(),
                    currentState = _.clone(self.attributes),
                    parent = self.attributes,
                    changed = false,
                    setPreviously = false,
                    parts;

                options = arguments.length < 3 ? value || {} : options || {};
                self.changed = {};

                if (typeof key === 'string') {
                    parts = key.split('.');

                    for (var i = 0, len = parts.length; i < len; i += 1) {
                        changed = parent[parts[i]] !== value;

                        if (changed && !setPreviously) {
                            self._previously = _.clone(self.attributes);
                            setPreviously = true;
                        }

                        parent[parts[i]] = (len - 1) === i ? value : {};
                        parent = parent[parts[i]];

                        if ((len - 1) === i && changed) {
                            self.attributes.meta.updated = currentDate.toISOString();
                            self.changed[parts[0]] = self.attributes[parts[0]];

                            if (!options.silent) {
                                self.trigger('change:' + parts.join(':'), self);
                            }
                        }
                    }
                } else if (_.isObject(key)) {
                    _.extend(self.attributes, key);
                    changed = JSON.stringify(currentState) !== JSON.stringify(self.attributes) && _.isEqual(currentState, self.attributes);

                    if (changed) {
                        _.extend(self.changed, key);
                        self.attributes.meta.updated = currentDate.toISOString();
                    }

                    if (!options.silent && changed) {
                        Object.keys(self.changed).forEach(function (key) {
                            self.trigger('change:' + key, self);
                        });
                    }
                }

                if (self.get('id')) {
                    self.id = self.get('id');
                } else if (!self.get('id') && self.hasOwnProperty('id')) {
                    delete self.id;
                }

                if (!options.silent && changed) {
                    self.trigger('change', self);
                }

                return self;
            },
            unset: function (param, options) {
                var self = this;
                self.set(param, undefined, options);
                return this;
            },
            save: function (attrs, options) {
                if (!this.collection) {
                    console.error('Model is not attached to collection');
                } else {
                    this.collection.save(options);
                }

                return this;
            },
            clear: function (attrs, options) {
                var self = this;
                options = options || {};

                self._previously = _.clone(self.attributes);
                self.changed = _.clone(self.attributes);
                self.attributes = {};

                if (!options.silent) {
                    self.trigger('change', self);
                }

                return self;
            },
            destroy: function (options) {
                var self = this;
                options = options || {};

                if (self.collection) {
                    self.collection.remove(self, options);
                }

                if (!options.silent) {
                    self.collection.trigger('destroy', self.collection, self);
                    self.trigger('destroy', self);
                }

                return self;
            },
            changedAttributes: function () {
                return _.clone(this.changed);
            },
            isNew: function () {
                return !Boolean(this.id);
            },
            toJSON: function () {
                return _.clone(this.attributes);
            },
            isValid: function () {
                return true;
            },
            isAttached: function () {
                return Boolean(this.collection);
            },
            keys: function () {
                return _.keys(this.toJSON());
            },
            values: function () {
                return _.values(this.toJSON());
            },
            pairs: function () {
                return _.pairs(this.toJSON());
            },
            invert: function () {
                return _.invert(this.toJSON());
            },
            pick: function () {
                return _.pick(this.toJSON(), Array.prototype.slice.call(arguments));
            },
            omit: function () {
                return _.omit(this.toJSON(), Array.prototype.slice.call(arguments));
            }
        });

    Model.Extend = Core.Helpers.Extend;
    Core.Model = Model;

}());