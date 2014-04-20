/*** Z-Way HA Virtual Device base class ***************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013

******************************************************************************/

VirtualDevice = function (deviceId, controller, defaults, handler) {
    this.id = deviceId;
    this.handler = handler;
    this.accessAttrs = ["id", "deviceType", "metrics", "location", "tags", "updateTime"];
    this.controller = controller;
    this.collection = this.controller.collection;
    this.metrics = {};
    this.ready = false;
    this.location = null;
    this.tags = [];
    this.updateTime = 0;
    this.attributes = {
        id: this.id,
        metrics: this.metrics
    };
    this.changed = {};
    this.defaults = defaults || {};
    this._previousAttributes = {};
    if (!!this.collection) {
        this.cid = _.uniqueId('c');
    }
    this.initialize.apply(this, arguments);
    return this;
};

inherits(VirtualDevice, EventEmitter2);

_.extend(VirtualDevice.prototype, {
    initialize: function () {
        'use strict';
        _.bindAll(this, 'get', 'set');
        //this.set(this, {silent: true});

        _.extend(this.attributes, this.collection.controller.getVdevInfo(this.id));
        _.defaults(this.attributes, this.defaults); // set default params
        _.defaults(this.attributes.metrics, this.defaults.metrics); // set default metrics
    },
    get: function (param) {
        'use strict';
        var result;
        if (this.attributes.hasOwnProperty(param)) {
            result = this.attributes[param];
        }
        return result;
    },
    set: function (keyName, val, options) {
        var that = this,
            changes = [],
            current = _.clone(this.attributes),
            prev = this._previousAttributes,
            accessAttrs,
            attrs,
            findObj;

        function findX(obj, key) {
            var val = obj[key];
            if (val !== undefined) {
                return obj;
            }
            for (var name in obj) {
                var result = findX(obj[name]);
                if (result !== undefined) {
                    return obj;
                }
            }
            return undefined;
        }

        options = options || {};
        accessAttrs = options.accessAttrs || that.accessAttrs;

        if (_.isString(keyName) && !!val && keyName.split(':').length === 1) {
            findObj = findX(this.attributes, keyName);
            if (findObj[keyName] === val) {
                changes.push(keyName);
                that.changed[keyName] = val;
            }
        } else {
            if (!!options.merge || options.merge === undefined) {
                attrs = _.extend(that.attributes, _.pick(keyName, accessAttrs));
            } else {
                attrs = _.extend(that.attributes, _.pick(keyName, accessAttrs));
            }

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

        if (!options.setOnly) {
            that.save();
        }
        return this;
    },
    save: function (attrs, options) {
        if (!!attrs) {
            this.set(attrs, options);
        }
        this.collection.controller.setVdevInfo(this.id, this.attributes);
        this.collection.controller.saveConfig();
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
            this.metrics.icon = this.device.metrics.icon !== undefined ? this.device.metrics.icon : this.deviceIcon();
        } else {
            this.metrics.title  = this.deviceTitle();
            this.metrics.icon = this.deviceIcon();
        }
        this.ready = true;
    },
    deviceTitle: function () {
        return this.id;
    },
    deviceIcon: function () {
        return this.metrics.icon = this.deviceType;
    },
    setMetricValue: function (name, value) {
        var metrics = this.get('metrics');
        metrics[name] = value;
        this.controller.emit("device.metricUpdated", this.id, name, value);
        this.set({
            updateTime: Math.floor(new Date().getTime() / 1000),
            metrics: metrics
        });
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
    }
});