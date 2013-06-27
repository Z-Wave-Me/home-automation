// Concrete module constructor

function ZWaveGate (id, controller) {
    ZWaveGate.super_.call(this, id, controller);
}

// Module inheritance and setup

inherits(ZWaveGate, AutomationModule);

_module = ZWaveGate;

ZWaveGate.prototype.init = function (config) {
    ZWaveGate.super_.prototype.init.call(this, config);

    var self = this;

    this.controller.on('zway.deviceUpdate', function () {
        self.onDeviceUpdate.apply(self, arguments);
    });

    // Bind to the zway tree structure changes
    zway.bind(function(type, nodeId, instanceId, commandClassId) {
        self.controller.emit("zway.deviceUpdate", ZWAY_DEVICE_CHANGE_TYPES[type], nodeId, instanceId, commandClassId);
    }, 0xff); // 0x01 | 0x04 | 0x10

    // Bind on dataPoint changes
    Object.keys(zway.devices).forEach(function (device) {
        device = parseInt(device, 10);
        Object.keys(zway.devices[device].instances).forEach(function (instance) {
            instance = parseInt(instance, 10);
            Object.keys(zway.devices[device].instances[instance].commandClasses).forEach(function (commandClass) {
                commandClass = parseInt(commandClass, 10);
                self.controller.emit('zway.deviceUpdate', ZWAY_DEVICE_CHANGE_TYPES[0x10], device, instance, commandClass);
            });
        });
    });
}

ZWaveGate.prototype.onDeviceUpdate = function (changeType, device, instance, commandClass) {
    var self = this;

    var knownCommandClasses = {
        0x20: ["level", "mylevel"],
        0x25: ["level"],
        0x26: ["level"],
        0x30: ["level"],
        0x31: ["*.val"]
    }

    if ("CommandAdded" == changeType) {
        if (knownCommandClasses.hasOwnProperty(commandClass)) {
            console.log("Attaching to the new device instance command class", device, instance, commandClass);
            var dataHolders = knownCommandClasses[commandClass];
            dataHolders.forEach(function (dataHolder) {
                var zwayDev = zway.devices[device].instances[instance].commandClasses[commandClass];
                var dhPath = dataHolder.split(".");
                if (1 === dhPath.length) {
                    zwayDev.data[dataHolder].bind(function (changeType, args) {
                        if (0x01 == changeType) {
                            self.controller.emit('zway.dataUpdate', changeType, device, instance, commandClass, dataHolder, this.value, args);
                        }
                    });
                } else {
                    Object.keys(zwayDev.data).forEach(function (key) {
                        key = parseInt(key, 10);
                        if (!isNaN(key)) {
                            var hcArgs = {}
                            console.log("--- SENSOR TYPE", key, zwayDev.data[key].sensorTypeString.value);
                            hcArgs.sensorType = zwayDev.data[key].sensorTypeString.value;
                            zwayDev.data[key][dhPath[1]].bind(function (changeType, args) {
                                if (0x01 == changeType) {
                                    self.controller.emit('zway.dataUpdate', changeType, device, instance, commandClass, key+"."+dhPath[1], this.value, args);
                                }
                            }, hcArgs);
                        }
                    });
                }
            });
        }
    }
}
