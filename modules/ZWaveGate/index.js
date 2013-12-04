/*** ZWave Gate module ********************************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) Z-Wave.Me, 2013

******************************************************************************/

// Concrete module constructor

function ZWaveGate (id, controller) {
    ZWaveGate.super_.call(this, id, controller);

    this.devices = {};

    // Load abstract ZWave device class
    executeFile(this.moduleBasePath()+"/classes/ZWaveDevice.js");

    // Load exact device classes
    executeFile(this.moduleBasePath()+"/classes/ZWaveBasicDevice.js");

    executeFile(this.moduleBasePath()+"/classes/ZWaveSwitchBinaryDevice.js");
    executeFile(this.moduleBasePath()+"/classes/ZWaveSwitchMultilevelDevice.js");
    executeFile(this.moduleBasePath()+"/classes/ZWaveSensorBinaryDevice.js");
    executeFile(this.moduleBasePath()+"/classes/ZWaveSensorMultilevelDevice.js");
    executeFile(this.moduleBasePath()+"/classes/ZWaveMeterDevice.js");
    executeFile(this.moduleBasePath()+"/classes/ZWaveBatteryDevice.js");
    executeFile(this.moduleBasePath()+"/classes/ZWaveFanModeDevice.js");
    executeFile(this.moduleBasePath()+"/classes/ZWaveThermostatDevice.js");
    executeFile(this.moduleBasePath()+"/classes/ZWaveDoorlockDevice.js");
}

// Module inheritance and setup

inherits(ZWaveGate, AutomationModule);

_module = ZWaveGate;

ZWaveGate.prototype.init = function (config) {
    ZWaveGate.super_.prototype.init.call(this, config);

    var self = this;

    this.onStructureUpdate = function () {
        self.handleStructureChanges.apply(self, arguments);
    };
    this.controller.on('zway.structureUpdate', this.onStructureUpdate);

    // If basicsEnabled, instantiate ZWaveBasic module
    if (this.config.basicsEnabled) {
        console.log("Creating Basic device");
        var vDevBasic = new ZWaveBasicDevice("ZWayVDev_Basic", self.controller);
        vDevBasic.init();
        vDevBasic.bindToDatapoints();
        this.controller.registerDevice(vDevBasic);
    }

    // Iterate zway.devices and emit xAdded events
    Object.keys(zway.devices).forEach(function (deviceId) {
        deviceId = parseInt(deviceId, 10);
        var device = zway.devices[deviceId];

        // Ignore Static PC Controllers for now
        if (2 == device.data.basicType.value && 1 == device.data.specificType.value) {
            console.log("Device", deviceId, "is a Static PC Controller. Ignoring for now");
            return;
        }

        // console.log("--- DEVICE", deviceId, "has", Object.keys(device.instances).length, "instances");
        self.controller.emit('zway.structureUpdate', ZWAY_DEVICE_CHANGE_TYPES[0x01], deviceId);

        Object.keys(device.instances).forEach(function (instanceId) {
            instanceId = parseInt(instanceId, 10);
            var instance = device.instances[instanceId];

            // console.log("--- DEVICE INSTANCE", deviceId, instanceId);
            self.controller.emit('zway.structureUpdate', ZWAY_DEVICE_CHANGE_TYPES[0x04], deviceId, instanceId);

            Object.keys(instance.commandClasses).forEach(function (commandClassId) {
                commandClassId = parseInt(commandClassId, 10);
                var commandClass = instance.commandClasses[commandClassId];

                // console.log("--- DEVICE INSTANCE COMMAND CLASS", deviceId, instanceId, commandClassId);
                self.controller.emit('zway.structureUpdate', ZWAY_DEVICE_CHANGE_TYPES[0x10], deviceId, instanceId, commandClassId);
            });
        });
    });
};

ZWaveGate.prototype.stop = function () {
    console.log("--- ZWaveGate.stop()");
    ZWaveGate.super_.prototype.stop.call(this);

    this.controller.off('zway.structureUpdate', this.onStructureUpdate);
};

// Module methods

ZWaveGate.prototype.handleStructureChanges = function (changeType, device, instance, commandClass) {
    // console.log("--- handleStructureChanges", changeType, device, instance, commandClass);

    if ("InstanceAdded" === changeType) {
        // Ignore instance 0 for multiinstance devices
        if (0 == instance && Object.keys(zway.devices[device].instances).length > 1) {
            console.log("Device", device, "is a multiinstance device. Ignoring instance 0", zway.devices[device].instances.length);
            return;
        };

        // Create ZWayDevice instance
        console.log("Creating device", device, "instance", instance, "virtual devices");
        this.createDevicesForInstance(device, instance);
    } else if ("CommandAdded" === changeType) {
        // Bind to the device's command class datapoints
        // this.bindDataPointListeners(device, instance, commandClass);
    }
};

ZWaveGate.prototype.createDevicesForInstance = function (deviceId, instanceId) {
    console.log("--- createDevicesForInstance("+deviceId+", "+instanceId+")");
    var self = this;
    var instance = zway.devices[deviceId].instances[instanceId];
    var instanceCommandClasses = Object.keys(instance.commandClasses);
    var instanceDevices = [];
    var deviceName = null;

    if (in_array(instanceCommandClasses, "64") || in_array(instanceCommandClasses, "67")) {
        deviceName = "ZWayVDev_"+deviceId+":"+instanceId+":Thermostat";

        if (self.controller.deviceExists(deviceName)) return;

        console.log("Creating Thermostat device");
        instanceDevices.push(new ZWaveThermostatDevice(deviceName, self.controller, deviceId, instanceId));
    }

    instanceCommandClasses.forEach(function (commandClassId) {
        commandClassId = parseInt(commandClassId, 10);

        // Ignore SwitchBinary if SwitchMultilevel exists
        if (0x25 === commandClassId && in_array(instanceCommandClasses, "38")) {
            console.log("Ignoring SwitchBinary due to SwitchMultilevel existence");
            return;
        }

        // Ignore incomplete interview on CC
        var zwayDev = zway.devices[deviceId].instances[instanceId].commandClasses[commandClassId];
        if (!zwayDev.data.interviewDone) {
            console.log("Incomplete interview on", deviceId, instanceId, commandClassId, ". Ignoring CC");
            return;
        }

        var deviceName = "ZWayVDev_"+deviceId+":"+instanceId+":"+commandClassId;

        // Do not recreate devices
        if (self.controller.deviceExists(deviceName)) return;

        if (0x25 === commandClassId) {
            console.log("Creating SwitchBinary device");
            instanceDevices.push(new ZWaveSwitchBinaryDevice(deviceName, self.controller, deviceId, instanceId));
        } else if (0x26 === commandClassId) {
            console.log("Creating SwitchMultilevel device");
            instanceDevices.push(new ZWaveSwitchMultilevelDevice(deviceName, self.controller, deviceId, instanceId));
        } else if (0x30 === commandClassId) {
            Object.keys(instance.commandClasses[0x30].data).forEach(function (sensorTypeId) {
                var sensorTypeId = parseInt(sensorTypeId, 10);
                if (!isNaN(sensorTypeId)) {
                    console.log("Creating SensorBinary device for sensor type id", sensorTypeId);
                    instanceDevices.push(new ZWaveSensorBinaryDevice(deviceName+":"+sensorTypeId, self.controller, deviceId, instanceId, sensorTypeId));
                }
            });
        } else if (0x31 === commandClassId) {
            Object.keys(instance.commandClasses[0x31].data).forEach(function (sensorTypeId) {
                var sensorTypeId = parseInt(sensorTypeId, 10);
                if (!isNaN(sensorTypeId)) {
                    console.log("Creating SensorMultilevel device for sensor type id", sensorTypeId);
                    instanceDevices.push(new ZWaveSensorMultilevelDevice(deviceName+":"+sensorTypeId, self.controller, deviceId, instanceId, sensorTypeId));
                }
            });
        } else if (0x32 === commandClassId) {
            Object.keys(instance.commandClasses[0x32].data).forEach(function (scaleId) {
                scaleId = parseInt(scaleId, 10);
                if (!isNaN(scaleId)) {
                    console.log("Creating Meter device for scale", scaleId);
                    instanceDevices.push(new ZWaveMeterDevice(deviceName+":"+scaleId, self.controller, deviceId, instanceId, scaleId));
                }
            });
        } else if (0x80 === commandClassId) {
            console.log("Creating Battery device");
            instanceDevices.push(new ZWaveBatteryDevice(deviceName, self.controller, deviceId, instanceId));
        } else if (0x62 === commandClassId) {
            console.log("Creating Doorlock device");
            instanceDevices.push(new ZWaveDoorlockDevice(deviceName, self.controller, deviceId, instanceId));
        } else if (0x44 === commandClassId) {
            console.log("Creating FanMode device");
            instanceDevices.push(new ZWaveFanModeDevice(deviceName, self.controller, deviceId, instanceId));
        }
    });

    instanceDevices.forEach(function (device) {
        console.log("--- Initializing device", device.id);
        device.init();
        device.bindToDatapoints();
        self.controller.registerDevice(device);
    });
};
