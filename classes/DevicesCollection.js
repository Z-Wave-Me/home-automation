/*** Z-Way DevicesCollection class ************************************

 Version: 1.0.0
 -------------------------------------------------------------------------------
 Author: Stanislav Morozov <morozov@z-wave.me>
 Copyright: (c) ZWave.Me, 2014

 ******************************************************************************/

DevicesCollection = function (controller) {
    this.controller = controller;
    this.config = {};
    this.models = [];
    this.indexes = {};
    this.db = {
        cid: {},
        id: {},
        indexes: {},
        hardwareId: {}
    };
    this.length = 0;
    this.initialize.apply(this, arguments);
};

inherits(DevicesCollection, EventEmitter2);

_.extend(DevicesCollection.prototype, {
    initialize: function () {
        'use strict';
        _.bindAll(this, 'updateLength', 'create');
        this.create('0', '0', 0);
    },
    updateLength: function () {
        this.length = _.size(this.models);
    },
    create: function (deviceId, instanceId, commandClassId) {
        console.log("--- createDevicesForInstance(" + deviceId + ", " + instanceId + ")");

        var that = this,
            instance = commandClassId !== 0 ? zway.devices[deviceId].instances[instanceId] : null,
            instanceDevices = [],
            deviceName = "ZWayVDev_" + deviceId + ":" + instanceId + ":" + commandClassId,
            model;


        if (0x25 === commandClassId) {
            console.log("Creating SwitchBinary device");
            instanceDevices.push(new ZWaveSwitchBinaryDevice(deviceName, that.controller, deviceId, instanceId));
        } else if (0x26 === commandClassId) {
            console.log("Creating SwitchMultilevel device");
            instanceDevices.push(new ZWaveSwitchMultilevelDevice(deviceName, that.controller, deviceId, instanceId));
        } else if (0x30 === commandClassId) {
            Object.keys(instance.commandClasses[0x30].data).forEach(function (sensorTypeId) {
                var sensorTypeId = parseInt(sensorTypeId, 10);
                if (!isNaN(sensorTypeId)) {
                    console.log("Creating SensorBinary device for sensor type id", sensorTypeId);
                    instanceDevices.push(new ZWaveSensorBinaryDevice(deviceName + ":" + sensorTypeId, that.controller, deviceId, instanceId, sensorTypeId));
                }
            });
        } else if (0x31 === commandClassId) {
            Object.keys(instance.commandClasses[0x31].data).forEach(function (sensorTypeId) {
                var sensorTypeId = parseInt(sensorTypeId, 10);
                if (!isNaN(sensorTypeId)) {
                    console.log("Creating SensorMultilevel device for sensor type id", sensorTypeId);
                    instanceDevices.push(new ZWaveSensorMultilevelDevice(deviceName + ":" + sensorTypeId, that.controller, deviceId, instanceId, sensorTypeId));
                }
            });
        } else if (0x32 === commandClassId) {
            Object.keys(instance.commandClasses[0x32].data).forEach(function (scaleId) {
                scaleId = parseInt(scaleId, 10);
                if (!isNaN(scaleId)) {
                    console.log("Creating Meter device for scale", scaleId);
                    instanceDevices.push(new ZWaveMeterDevice(deviceName + ":" + scaleId, that.controller, deviceId, instanceId, scaleId));
                }
            });
        } else if (0x80 === commandClassId) {
            console.log("Creating Battery device");
            instanceDevices.push(new ZWaveBatteryDevice(deviceName, that.controller, deviceId, instanceId));
        } else if (0x62 === commandClassId) {
            console.log("Creating Doorlock device");
            instanceDevices.push(new ZWaveDoorlockDevice(deviceName, that.controller, deviceId, instanceId));
        } else if (0x44 === commandClassId) {
            console.log("Creating FanMode device");
            instanceDevices.push(new ZWaveFanModeDevice(deviceName, that.controller, deviceId, instanceId));
        } else if (0 === commandClassId) {
            console.log("Creating Basic device");
            instanceDevices.push(new ZWaveBasicDevice(deviceName, that.controller));
        }

        instanceDevices.forEach(function (deviceClass) {
            deviceClass.init();
            deviceClass.bindToDatapoints();
            model = new DeviceModel(deviceClass, that);
            that.updateLength();
            that.add(model);
        });

        return instanceDevices;
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
        var models = this.models.map(function (model) {
                return model.toJSON();
            });

        options = options || {};

        if (options.since) {
            models = models.filter(function (device) {
                return device.updateTime >= options.since;
            });
        }
        return models;
    },
    remove: function (identificator) {
        var that = this,
            model = that.get(identificator);

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
        that.collection.emit('remove', model);
        that.collection.emit('all', model);

        return model;
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
where
findWhere
clone
trigger
on
off
 */
