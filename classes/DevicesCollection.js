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
    that.length = 0;
    that.initialize.apply(this, arguments);
};

inherits(DevicesCollection, EventEmitter2);

_.extend(DevicesCollection.prototype, {
    initialize: function () {
        'use strict';
        _.bindAll(this, 'updateLength', 'create');
        // Load exact device classes
        var path = 'classes/devices/';

        fs.list(path).forEach(function (deviceCLassName) {
            executeFile(path + deviceCLassName);
        });
    },
    updateLength: function () {
        this.length = _.size(this.models);
    },
    create: function (deviceId, defaults, handler) {
        var that = this,
            vDev = null;

        console.log("Creating device " + defaults.deviceType + " id = " + deviceId);
        vDev = new VirtualDevice(deviceId, that.controller, defaults, handler);

        if (vDev !== null) {
            vDev.init();
            that.add(vDev);
            that.updateLength();
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

        if (that.db.id.hasOwnProperty(identificator)) {
            delete that.db.id[identificator];
        } else if (that.db.cid.hasOwnProperty(identificator)) {
            delete that.db.cid[identificator];
        } else if (that.db.indexes.hasOwnProperty(model.index)) {
            delete that.db.indexes[model.index];
        }

        delete model.cid;

        // events
        that.emit('remove', model);
        that.emit('all', model);

        return model;
    },
    where: function (obj) {
        var models = this.toJSON(),
            devices = _.filter(models, function (model) {
                var check = true;
                for (var key in obj) {
                    check &= (model.hasOwnProperty(key) && model[key] === obj[key]);
                }
                return check;
            });

        return devices.length && !!devices ? devices : [];
    },
    findWhere: function (obj) {
        return _.first(this.where(obj));
    }
});

/*
advances method:
add
remove
get
reset
destroy
set
at - index
pop
sync
trigger
on
off
 */
