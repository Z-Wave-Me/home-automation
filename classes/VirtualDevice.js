/*** Z-Way HA Virtual Device base class ***************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013

******************************************************************************/

VirtualDevice = function (deviceId, controller, handler) {
    this.id = deviceId;
    this.handler = handler;
    this.accessAttrs = ["id", "deviceType", "metrics", "location", "tags", "updateTime"];
    this.controller = controller;
    this.collection = this.controller.collection;
    this.metrics = {};
    this.location = null;
    this.tags = [];
    this.updateTime = 0;
    this.attributes = {};
    this.changed = {};
    this._previousAttributes = {};
    if (!!this.collection) {
        this.cid = _.uniqueId('c');
    }
    this.initialize.apply(this, arguments);
    return this;
};

inherits(VirtualDevice, EventEmitter2);

_.extend(VirtualDevice.prototype, {
    defaults: {
        deviceType: 'baseType',
        metrics: {},
        location: '',
        tags: [],
        updateTime: ''
    },
    initialize: function () {
        'use strict';
        _.bindAll(this, 'get', 'set');
        this.set(this, {silent: true});
        _.extend(this.attributes, this.collection.controller.getVdevInfo(this.id));
        _.defaults(this.attributes, this.defaults);
    },
    get: function (param) {
        'use strict';
        var result;
        if (this.attributes.hasOwnProperty(param)) {
            result = this.attributes[param];
        }
        return result;
    },
    set: function (attrs, options) {
        var that = this,
            changes = [],
            current = this.attributes,
            prev = this._previousAttributes,
            accessAttrs;

        options = options || {};
        accessAttrs = options.accessAttrs || that.accessAttrs;

        attrs = _.extend(that.attributes, _.pick(attrs, accessAttrs));

        if (_.isObject(attrs)) {
            Object.keys(attrs).forEach(function (key) {
                if (!_.isEqual(current[key], attrs[key])) {
                    changes.push(attrs[key]);
                }
                if (!_.isEqual(prev[key], attrs[key])) {
                    that.changed[key] = attrs[key];
                } else {
                    delete that.changed[key];
                }
            });
        }

        if (!options.silent) {
            if (changes.length) {
                if (!!that.collection) {
                    that.collection.emit('change', that);
                    that.collection.emit('all', that);
                }
                that.emit('change', that);
                that.emit('all', that);
            }

            changes.forEach(function (key) {
                if (!!that.collection) {
                    that.collection.emit('change:' + key, that);
                }
                that.emit('change:' + key, that);
            });
        }

        return this;
    },
    toJSON: function () {
        return _.clone(this.attributes);
    },
    destroy: function () {
        this.unlink();
        this.collection.emit('destroy', this);
        this.remove();
    },
    unlink: function () {
        this.collection.remove(this.cid);
    },
    remove: function () {
        this.stopListening();
        return this;
    },
    stopListening: function () {
        this.removeAllListeners();
    },
    init: function () {
        console.log("--- VDev init(" + this.id + ")");
        this.device = this.controller.getVdevInfo(this.id);
        if (this.device !== undefined) {
            this.tags = this.device.tags;
            this.location = this.device.location;
            this.metrics.title = this.device.metrics.title !== undefined ? this.device.metrics.title : this.deviceTitle();
            this.metrics.iconBase = this.device.metrics.iconBase !== undefined ? this.device.metrics.iconBase : this.deviceIconBase();
        } else {
            this.metrics.title  = this.deviceTitle();
            this.metrics.iconBase = this.deviceIconBase();
        }
    },
    deviceTitle: function () {
        return this.id;
    },
    deviceIconBase: function () {
        return this.metrics.iconBase = this.deviceType;
    },
    setMetricValue: function (name, value) {
        this.updateTime = Math.floor(new Date().getTime() / 1000);
        this.metrics[name] = value;
        this.controller.emit("device.metricUpdated", this.id, name, value);
    },
    setVDevObject: function (id, object) {
        var excludeProp = ['deviceType', 'updateTime', 'id'],
            self = this,
            data = object.hasOwnProperty('data') ? object.data : object;

        this.updateTime = Math.floor(new Date().getTime() / 1000);
        Object.keys(data).forEach(function (key) {
            if (excludeProp.indexOf(key) === -1 && self.hasOwnProperty(key)) {
                self[key] = data[key];
                self.controller.emit("device.valueUpdate", self.id, key, self[key]);
            }
        });

        this.controller.setVdevInfo(id, object);
        this.controller.saveConfig();
    },
    getMetricValue: function (name) {
        return this.metrics[name];
    },
    performCommand: function () {
        console.log("--- " + this.constructor.name + ".performCommand processing...");
        if (typeof(this.handler) === "function") {
            return this.handler.apply(this, arguments);
        }
    },
    updateFromVdevInfo: function () {
        var self = this,
            info = this.controller.getVdevInfo(this.id);

        if (!!info) {
            Object.keys(info).forEach(function (key) {
                var value = info[key];
                if ("tags" === key) {
                    if (Array.isArray(value)) {
                        value.forEach(function (tag) {
                            if (!in_array(self.tags, tag)) {
                                self.tags.push(tag);
                            }
                        });
                    } else {
                        value.toString().split(",").forEach(function (tag) {
                            var _tag = tag.trim();
                            if (_tag.length > 0) {
                                if (!in_array(self.tags, _tag)) {
                                    self.tags.push(_tag);
                                }
                            }
                        });
                    }
                    console.log("--! Device", self.id, "tags is:", JSON.stringify(self.tags));
                    self.controller.emit("device.tagsUpdated", self.id, self.tags);
                } else if ("location" === key) {
                    var unchanged = false;
                    if (value !== null) {
                        if (self.controller.locations.hasOwnProperty(value)) {
                            self.location = value;
                        } else {
                            unchanged = true;
                            self.controller.emit("core.error", "Can't set location " + value + " to the device " + self.id + " -- location doesn't exist");
                        }

                    } else {
                        self.location = null;
                    }

                    if (!unchanged) {
                        console.log("--! Device", self.id, "location is:", self.location);
                        self.controller.emit("device.locationUpdated", self.id, self.location);
                    }
                } else {
                    self.setMetricValue(key, info[key]);
                }
            });
        }
    }
});