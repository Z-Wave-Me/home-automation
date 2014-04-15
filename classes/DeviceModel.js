/*** Z-Way DeviceModel class ************************************

 Version: 1.0.0
 -------------------------------------------------------------------------------
 Author: Stanislav Morozov <morozov@z-wave.me>
 Copyright: (c) ZWave.Me, 2014

 ******************************************************************************/

var DeviceModel = function (deviceClass, collection) {
    'use strict';
    var that = this;
    if (!!collection) {
        that.collection = collection;
        that.cid = _.uniqueId('c');
    }
    that.deviceClass = deviceClass;
    that.deviceClass.model = that;
    that.attributes = {};
    that.changed = {};
    that._previousAttributes = {};
    _.defaults(that.attributes, that.defaults);
    that.set(that.deviceClass, {silent: true});
    _.extend(that.attributes, that.collection.controller.getVdevInfo(deviceClass.id));

    that.initialize.apply(this, arguments);
    return that;
};

inherits(DeviceModel, EventEmitter2);

_.extend(DeviceModel.prototype, {
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
        accessAttrs = options.accessAttrs || ["id", "deviceType", "metrics", "location", "tags", "updateTime"];

        attrs = _.extend(this.attributes, _.pick(attrs, accessAttrs));

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
        this.deviceClass.stop();
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
    }
});

/*
 device model function
 get
 set
 trigger
 on
 off
 save
 */