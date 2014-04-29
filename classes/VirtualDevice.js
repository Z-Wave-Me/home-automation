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
    this.collection = this.controller.devices;
    this.metrics = {};
    this.ready = false;
    this.location = null;
    this.tags = [];
    this.updateTime = 0;
    this.attributes = {
        id: this.id,
        metrics: this.metrics,
        tags: [],
        location: null
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

function inObj(obj, arr) {
    var result, findObj;

    while (arr.length > 0) {
        findObj = result === undefined ? obj : result;
        if (findObj.hasOwnProperty(arr[0])) {
            result = findObj[arr[0]];
        } else {
            break;
        }

        arr.shift();
    }

    return arr.length > 0 ? undefined : result;
}

function setObj(obj, arr, param) {
    var key;

    if (obj) {
        key = arr[0];
        arr.shift();
        if (arr.length === 0) {
            obj[key] = param;
        } else if (obj.hasOwnProperty(key) && arr.length > 0) {
            setObj(obj[key], arr, param);
        } else if (!obj.hasOwnProperty(key) && arr.length > 0) {
            obj[key] = {};
            setObj(obj[key], arr, param);
        }
    }
    return obj;
}

inherits(VirtualDevice, EventEmitter2);

_.extend(VirtualDevice.prototype, {
    initialize: function () {
        'use strict';
        _.bindAll(this, 'get', 'set');
        _.extend(this.attributes, this.collection.controller.getVdevInfo(this.id));
        _.defaults(this.attributes, this.defaults); // set default params
        _.defaults(this.attributes.metrics, this.defaults.metrics); // set default metrics
    },
    setReady: function () {
        this.ready = true;
        this.attributes.updateTime = Math.floor(new Date().getTime() / 1000);
    },
    get: function (param) {
        'use strict';
        var result;

        if (param.split(':').length === 1) {
            if (this.attributes.hasOwnProperty(param)) {
                result = this.attributes[param];
            }
        } else if (param.split(':').length > 1) {
            result = inObj(this.toJSON(), param.split(':'));
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

        if (_.isString(keyName) && typeof(val) != "undefined" && keyName.split(':').length === 1) {
            findObj = findX(this.attributes, keyName);
            if (findObj[keyName] === val) {
                changes.push(keyName);
                that.changed[keyName] = val;
            }
        } else {
            if (_.isString(keyName) && val !== undefined && keyName.split(':').length > 1) {
                setObj(current, keyName.split(':'), val);
                _.extend(that.attributes, current);
                changes.push(keyName);
            } else {
                attrs = _.extend(that.attributes, _.pick(keyName, accessAttrs));
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
        this.setReady();
    },
    deviceTitle: function () {
        return this.attributes.metrics.hasOwnProperty('title') ? this.attributes.metrics.title : this.id;
    },
    deviceIcon: function () {
        return this.metrics.icon = this.deviceType;
    },
    setMetricValue: function (name, value) {
        console.log("Deprecated setMetricValue(\"xx\") should be replaced by set(\"metrics:xx\")");
        
        var metrics = this.get('metrics');
        metrics[name] = value;
        this.controller.emit("device.metricUpdated", this.id, name, value);
        this.set({
            updateTime: Math.floor(new Date().getTime() / 1000),
            metrics: metrics
        });
        this.collection.emit("change:metrics:" + name, this, {name: value});
        this.emit("change:metrics:" + name, this, {name: value});
        this.collection.emit("change", this, {name: value});
        this.emit("change", this, {name: value});
    },
    getMetricValue: function (name) {
        console.log("Deprecated getMetricValue(\"xx\") should be replaced by get(\"metrics:xx\")");
        
        return this.metrics[name];
    },
    performCommand: function () {
        console.log("--- ", this.id, "performCommand processing:", JSON.stringify(arguments));
        if (typeof(this.handler) === "function") {
            return this.handler.apply(this, arguments);
        }
    }
});