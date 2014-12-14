/*** Z-Way DevicesCollection class ************************************

 Version: 1.0.0
 -------------------------------------------------------------------------------
 Author: Stanislav Morozov <morozov@z-wave.me>
 Copyright: (c) ZWave.Me, 2014

 ******************************************************************************/

DevicesCollection = function (controller) {
    var that = this;
    that.controller = controller;
    that.config = {};
    that.models = [];
    that.db = {
        cid: {},
        id: {},
        indexes: {},
        hardwareId: {}
    };
    that.changed = {
        remove: [],
        add: [],
        update: []
    };
    that.length = 0;
    that.initialize.apply(this, arguments);
};

inherits(DevicesCollection, EventEmitter2);

_.extend(DevicesCollection.prototype, {
    initialize: function () {
        'use strict';
        _.bindAll(this, 'updateLength', 'create');
    },
    updateLength: function () {
        this.length = _.size(this.models);
    },
    create: function (options) {
        var that = this,
            vDev = null;

        console.log("Creating device " + (options.overlay.deviceType || options.defaults.deviceType) + " " + options.deviceId);
        vDev = new VirtualDevice(_.extend(options, {controller: that.controller}));

        if (vDev !== null) {
            vDev.init();
            that.add(vDev);
            that.updateLength();
            that.emit('created', vDev);
        } else {
            console.log("Error creating device");
        }

        return vDev;
    },
    add: function (model) {
        if (model.hasOwnProperty('cid')) {
            if (this.db.cid[model.cid] === model) {
                delete this.db.cid[model.cid];
            }
            delete model.cid;
        }

        model.cid = _.uniqueId('c');
        this.db.cid[model.cid] = model;
        this.db.id[model.get('id')] = model;
        // add to collection
        this.models.push(model);
        model.index = this.models.indexOf(model);
        this.db.indexes[model.index] = model;
        return model;
    },
    has: function (identificator) {
        var result = false;
        if (this.db.id.hasOwnProperty(identificator) || this.db.cid.hasOwnProperty(identificator)) {
            result = true;
        }
        return result;
    },
    get: function (identificator) {
        var result;
        if (this.db.id.hasOwnProperty(identificator)) {
            result = this.db.id[identificator];
        } else if (this.db.cid.hasOwnProperty(identificator)) {
            result = this.db.cid[identificator];
        }
        return result;
    },
    first: function () {
        return _.first(this.models);
    },
    last: function () {
        return _.last(this.models);
    },
    size: function () {
        return _.size(this.models);
    },
    toJSON: function (options) {
        var models, result;
        options = options || {};

        models = this.models.filter(function (device) {
            return !!options.since ? !!device.ready && device.toJSON().updateTime >= options.since : !!device.ready;
        });

        models = models.map(function (model) {
            return model.toJSON();
        });

        return models;
    },
    remove: function (identificator) {
        var that = this,
            model = that.get(identificator);

        if (!model) {
            return;
        }

        that.models = that.models.filter(function (object) {
            return object.cid !== model.cid;
        });

        console.log("Deleting device " + model.get("deviceType") + " " + identificator);
        if (that.db.id.hasOwnProperty(identificator)) {
            delete that.db.id[identificator];
        } else if (that.db.cid.hasOwnProperty(identificator)) {
            delete that.db.cid[identificator];
        } else if (that.db.indexes.hasOwnProperty(model.index)) {
            delete that.db.indexes[model.index];
        }

        delete model.cid;

        // events
        that.emit('removed', model);
        that.controller.lastStructureChangeTime = Math.floor(new Date().getTime() / 1000);
        return model;
    },
    where: function (obj) {
        var that = this,
            check,
            devices = _.filter(that.models, function (model) {
            check = true;

            Object.keys(obj).forEach(function (key) {
                if (model.get(key) !== obj[key] && check) {
                    check = false;
                    return;
                }
            });

            return check;
        });

        return devices.length && Boolean(devices) ? devices : [];
    },
    findWhere: function (obj) {
        return _.first(this.where(obj));
    },
    filter: function (callback) {
        return _.filter(this.models, callback);
    },
    map: function (callback) {
        return _.map(this.models, callback);
    },
    each: function (callback) {
        return _.each(this.models, callback);
    },
    forEach: function (callback) {
        return this.each(callback);
    },
    on: function () {
        var vDevId = "",
            args = [];
        
        Array.prototype.push.apply(args, arguments);
        
        if (args.length < 2 || args.length > 3) {
            throw "Invalid number of arguments to on()";
        }
        
        if (args.length > 2) {
            vDevId = args.shift() + ":";
        }
        
        return EventEmitter2.prototype.on.call(this, vDevId + args[0], args[1]);
    },
    off: function () {
        var vDevId = "",
            args = [];
        
        Array.prototype.push.apply(args, arguments);
        
        if (args.length < 2 || args.length > 3) {
            throw "Invalid number of arguments to off()";
        }
        
        if (args.length > 2) {
            vDevId = args.shift() + ":";
        }
        
        return EventEmitter2.prototype.off.call(this, vDevId + args[0], args[1]);
    }
});
