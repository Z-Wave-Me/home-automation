/*** ZWave Gate module ********************************************************

Version: 2.0.0
-------------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>
Copyright: (c) Z-Wave.Me, 2014

******************************************************************************/

function ZWaveGate (id, controller) {
    ZWaveGate.super_.call(this, id, controller);

    this.ZWAY_DEVICE_CHANGE_TYPES = {
        "DeviceAdded": 0x01,
        "DeviceRemoved": 0x02,
        "InstanceAdded": 0x04,
        "InstanceRemoved": 0x08,
        "CommandAdded": 0x10,
        "CommandRemoved": 0x20
    };

    this.ZWAY_DATA_CHANGE_TYPE = {
        "Updated": 0x01,       // Value updated or child created
        "Invalidated": 0x02,   // Value invalidated
        "Deleted": 0x03,       // Data holder deleted - callback is called last time before being deleted
        "ChildCreated": 0x04,  // New direct child node created

        // ORed flags
        "PhantomUpdate": 0x40, // Data holder updated with same value (only updateTime changed)
        "ChildEvent": 0x80     // Event from child node
    };

    this.CC = {
        "Basic": 0x20,
        "SwitchBinary": 0x25,
        "SwitchMultilevel": 0x26,
        "SceneActivation": 0x2b,
        "SensorBinary": 0x30,
        "SensorMultilevel": 0x31,
        "Meter": 0x32,
        "ThermostatMode": 0x40,
        "ThermostatSetPoint": 0x43,
        "ThermostatFanMode": 0x44,
        "DoorLock": 0x62,
        "Battery": 0x80
    };

    this.dataBindings = [];
    this.zwayBinding = null;
}

// Module inheritance and setup

inherits(ZWaveGate, AutomationModule);

_module = ZWaveGate;


ZWaveGate.prototype.init = function (config) {
    ZWaveGate.super_.prototype.init.call(this, config);

    var self = this;

    // Bind to all future CommandClasses changes
    this.zwayBinding = zway.bind(function (type, nodeId, instanceId, commandClassId) {
        if (type === self.ZWAY_DEVICE_CHANGE_TYPES["CommandAdded"]) {
            self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, "interviewDone", function(type) {
                if (this.value === true && type !== self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
                    self.parseAddCommandClass(nodeId, instanceId, commandClassId);
                } else {
                    self.parseDelCommandClass(nodeId, instanceId, commandClassId);
                }
            }, "value");
        } else {
            self.parseDelCommandClass(nodeId, instanceId, commandClassId);
        }
    }, this.ZWAY_DEVICE_CHANGE_TYPES["CommandAdded"] | this.ZWAY_DEVICE_CHANGE_TYPES["CommandRemoved"]);

    // Iterate all existing Command Classes
    Object.keys(zway.devices).forEach(function (nodeId) {
        nodeId = parseInt(nodeId, 10);
        var device = zway.devices[nodeId];

        // Ignore Static PC Controllers
        if (2 === device.data.basicType.value && 1 === device.data.specificType.value) {
            console.log("Device", nodeId, "is a Static PC Controller, ignoring");
            return;
        }

        Object.keys(device.instances).forEach(function (instanceId) {
            instanceId = parseInt(instanceId, 10);
            var instance = device.instances[instanceId];

            Object.keys(instance.commandClasses).forEach(function (commandClassId) {
                commandClassId = parseInt(commandClassId, 10);
                var commandClass = instance.commandClasses[commandClassId];
                
                self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, "interviewDone", function(type) {
                    if (this.value === true && type !== self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
                        self.parseAddCommandClass(nodeId, instanceId, commandClassId);
                    } else {
                        self.parseDelCommandClass(nodeId, instanceId, commandClassId);
                    }
                }, "value");
            });
        });
    });
    
    this.controller.on("ZWaveGate.dataBind", this.dataBind);
    this.controller.on("ZWaveGate.dataUnbind", this.dataUnbind);
};

ZWaveGate.prototype.stop = function () {
    console.log("--- ZWaveGate.stop()");
    ZWaveGate.super_.prototype.stop.call(this);

    // releasing bindings
    this.dataUnbind(this.dataBindings);
    zway.unbind(this.zwayBinding);

    this.controller.off("ZWaveGate.dataBind", this.dataBind);
    this.controller.off("ZWaveGate.dataUnbind", this.dataUnbind);
};

// Module methods

ZWaveGate.prototype.dataBind = function(dataBindings, nodeId, instanceId, commandClassId, path, func, type) {
    var data = zway.devices[nodeId].instances[instanceId].commandClasses[commandClassId].data,
        pathArr = path ? path.split(".") : [];

    if (!func) {
        console.log("Function passed to dataBind is undefined");
        return;
    }

    while (pathArr.length) {
        data = data[pathArr.shift()];
        if (!data) {
            break;
        }
    }
    
    if (data) {
        dataBindings.push({
            "nodeId": nodeId,
            "instanceId": instanceId,
            "commandClassId": commandClassId,
            "path": path,
            "func": data.bind(func, null, type === "child")
        });
        if (type === "value") {
            func.call(data, this.ZWAY_DATA_CHANGE_TYPE.Updated);
        }
    } else {
        console.log("Can not find data path:", nodeId, instanceId, commandClassId, path);
    }
};

ZWaveGate.prototype.dataUnbind = function(dataBindings) {
    dataBindings.forEach(function (item) {
        if (zway.devices[item.nodeId] && zway.devices[item.nodeId].instances[item.instanceId] && zway.devices[item.nodeId].instances[item.instanceId].commandClasses[item.commandClassId]) {
            var data = zway.devices[item.nodeId].instances[item.instanceId].commandClasses[item.commandClassId].data,
                pathArr = item.path ? item.path.split(".") : [];

            while (pathArr.length) {
                data = data[pathArr.shift()];
                if (!data) {
                    break;
                }
            }
            
            if (data) {
                data.unbind(item.func);
            } else {
                console.log("Can not find data path:", item.nodeId, item.instanceId, item.commandClassId, item.path);
            }
        }
    });
    dataBindings = null;
};

ZWaveGate.prototype.parseAddCommandClass = function (nodeId, instanceId, commandClassId) {
    nodeId = parseInt(nodeId, 10);
    instanceId = parseInt(instanceId, 10);
    commandClassId = parseInt(commandClassId, 10);

    var self = this,
        instance = zway.devices[nodeId].instances[instanceId],
        instanceCommandClasses = Object.keys(instance.commandClasses),
        cc = instance.commandClasses[commandClassId],
        separ = ":",
        vDevIdPrefix = "ZWayVDev_",
        vDevIdNI = nodeId + separ + instanceId,
        vDevIdC = commandClassId,
        vDevId = vDevIdPrefix + vDevIdNI + separ + vDevIdC,
        defaults;
        // vDev is not in this scope, but in {} scope for each type of device to allow reuse it without closures

    try {
        if (!cc.data.supported.value)
            return; // do not handle unsupported Command Classes

        // Ignore SwitchBinary if SwitchMultilevel exists
        if (this.CC["SwitchBinary"] === commandClassId && in_array(instanceCommandClasses, this.CC["SwitchMultilevel"]) && instanceCommandClasses[this.CC["SwitchMultilevel"]].data.supported.value) {
            console.log("Ignoring SwitchBinary due to SwitchMultilevel existence");
            return;
        }
        if (this.CC["SwitchMultilevel"] === commandClassId && this.controller.devices.get(vDevIdPrefix + vDevIdNI + separ + this.CC["SwitchBinary"])) {
            console.log("Removing SwitchBinary due to SwitchMultilevel existence");
            this.controller.devices.remove(vDevIdPrefix + vDevIdNI + separ + this.CC["SwitchBinary"]);
        }

        if (this.CC["SwitchBinary"] === commandClassId && !self.controller.devices.get(vDevId)) {
            defaults = {
                deviceType: "switchBinary",
                metrics: {
                    level: '',
                    icon: 'switch',
                    title: 'Switch ' + vDevIdNI
                }
            };
            var vDev = self.controller.devices.create(vDevId, defaults, function (command) {
                if ("on" === command) {
                    cc.Set(true);
                } else if ("off" === command) {
                    cc.Set(false);
                }
            });
            if (vDev) {
                self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, "level", function () {
                    vDev.set("metrics:level", this.value ? "on" : "off");
                }, "value");
            }
        } else if (this.CC["SwitchMultilevel"] === commandClassId && !self.controller.devices.get(vDevId)) {
            defaults = {
                deviceType: "switchMultilevel",
                metrics: {
                    level: '',
                    icon: 'multilevel',
                    title: 'Dimmer ' + vDevIdNI
                }
            };
            var vDev = self.controller.devices.create(vDevId, defaults, function(command, args) {
                var newVal;
                if ("on" === command) {
                    newVal = 255;
                } else if ("off" === command) {
                    newVal = 0;
                } else if ("min" === command) {
                    newVal = 10;
                } else if ("max" === command) {
                    newVal = 99;
                } else if ("increase" === command) {
                    newVal = this.metrics.level + 10;
                    if (0 !== newVal % 10) {
                        newVal = Math.round(newVal / 10) * 10;
                    }
                    if (newVal > 99) {
                        newVal = 99;
                    }

                } else if ("decrease" === command) {
                    newVal = this.metrics.level - 10;
                    if (newVal < 0) {
                        newVal = 0;
                    }
                    if (0 !== newVal % 10) {
                        newVal = Math.round(newVal / 10) * 10;
                    }
                } else if ("exact" === command) {
                    newVal = parseInt(args.level, 10);
                    if (newVal < 0) {
                        newVal = 0;
                    } else if (newVal === 255) {
                        newVal = 255;
                    } else if (newVal > 99) {
                        if (newVal === 100) {
                            newVal = 99;
                        } else {
                            newVal = null;
                        }
                        
                    } 
                }

                if (0 === newVal || !!newVal) {
                    cc.Set(newVal);
                }
            });
            if (vDev) {
                self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, "level", function() {
                    vDev.set("metrics:level", this.value);
                }, "value");
            }
        } else if (this.CC["SensorBinary"] === commandClassId) {
            defaults = {
                deviceType: 'sensorBinary',
                metrics: {
                    probeTitle: '',
                    scaleTitle: '',
                    icon: '',
                    level: '',
                    title: ''
                }
            };
            Object.keys(cc.data).forEach(function (sensorTypeId) {
                sensorTypeId = parseInt(sensorTypeId, 10);
                if (!isNaN(sensorTypeId) && !self.controller.devices.get(vDevId + separ + sensorTypeId)) {
                    defaults.metrics.probeTitle = cc.data[sensorTypeId].sensorTypeString.value;
                    defaults.metrics.title =  'Sensor ' + vDevIdNI + separ + vDevIdC + separ + sensorTypeId;
                    // aivs // Motion icon for Sensor Binary by default
                    defaults.metrics.icon = "motion";

                    if (sensorTypeId == 2) {
                            defaults.metrics.icon = "smoke";
                    } else if (sensorTypeId == 3 || sensorTypeId == 4) {
                            defaults.metrics.icon = "co";
                    } else if (sensorTypeId == 6) {
                            defaults.metrics.icon = "flood";
                    } else if (sensorTypeId == 7) {
                            defaults.metrics.icon = "cooling";
                    } else if (sensorTypeId == 10) {
                            defaults.metrics.icon = "door";
                    } else if (sensorTypeId == 12) {
                            defaults.metrics.icon = "motion";
                    }
                    
                    var vDev = self.controller.devices.create(vDevId + separ + sensorTypeId, defaults, function(command) {
                        if (command === "update") {
                            cc.Get(sensorTypeId);
                        }
                    });
                    if (vDev) {
                        self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, sensorTypeId + ".level", function(type) {
                            if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
                                self.controller.devices.remove(vDevId + separ + sensorTypeId);
                            } else {
                                vDev.set("metrics:level", this.value ? "on" : "off");
                            }
                        }, "value");
                    }
                }
            });
            self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, "", function(type) {
                if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
                    self.parseAddCommandClass(nodeId, instanceId, commandClassId);
                }
            }, "child");
        } else if (this.CC["SensorMultilevel"] === commandClassId) {
            defaults = {
                deviceType: "sensorMultilevel",
                metrics: {
                    probeTitle: '',
                    scaleTitle: '',
                    level: '',
                    icon: '',
                    title: ''
                }
            };
            Object.keys(cc.data).forEach(function (sensorTypeId) {
                sensorTypeId = parseInt(sensorTypeId, 10);
                if (!isNaN(sensorTypeId) && !self.controller.devices.get(vDevId + separ + sensorTypeId)) {
                    defaults.metrics.probeTitle = cc.data[sensorTypeId].sensorTypeString.value;
                    defaults.metrics.scaleTitle = cc.data[sensorTypeId].scaleString.value;
                    defaults.metrics.title =  'Sensor ' + vDevIdNI + separ + vDevIdC + separ + sensorTypeId;
                    if (sensorTypeId == 1) {
                            defaults.metrics.icon = "temperature";
                    } else if (sensorTypeId == 3) {
                            defaults.metrics.icon = "luminosity";
                    } else if (sensorTypeId == 4 || sensorTypeId == 15 || sensorTypeId == 16) {
                            defaults.metrics.icon = "energy";
                    } else if (sensorTypeId == 5) {
                            defaults.metrics.icon = "humidity";
                    }
                    var vDev = self.controller.devices.create(vDevId + separ + sensorTypeId, defaults, function(command) {
                        if (command === "update") {
                            cc.Get(sensorTypeId);
                        }
                    });
                    if (vDev) {
                        self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, sensorTypeId + ".val", function(type) {
                            if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
                                self.controller.devices.remove(vDevId + separ + sensorTypeId);
                            } else {
                                vDev.set("metrics:level", this.value);
                            }
                        }, "value");
                    }
                }
            });
            self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, "", function(type) {
                if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
                    self.parseAddCommandClass(nodeId, instanceId, commandClassId);
                }
            }, "child");
        } else if (this.CC["Meter"] === commandClassId) {
            defaults = {
                deviceType: 'sensorMultilevel',
                metrics: {
                    probeTitle: '',
                    scaleTitle: '',
                    level: '',
                    icon: 'meter',
                    title: ''
                }
            };
            Object.keys(cc.data).forEach(function (scaleId) {
                scaleId = parseInt(scaleId, 10);
                if (!isNaN(scaleId) && !self.controller.devices.get(vDevId + separ + scaleId)) {
                    defaults.metrics.probeTitle = cc.data[scaleId].sensorTypeString.value;
                    defaults.metrics.scaleTitle = cc.data[scaleId].scaleString.value;
                    defaults.metrics.title =  'Meter ' + vDevIdNI + separ + vDevIdC + separ + scaleId;
                    var vDev = self.controller.devices.create(vDevId + separ + scaleId, defaults, function(command) {
                        if (command === "update") {
                            cc.Get(scaleId);
                        }
                    });
                    if (vDev) {
                        self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, scaleId + ".val", function(type) {
                            if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
                                self.controller.devices.remove(vDevId + separ + scaleId);
                            } else {
                                vDev.set("metrics:level", this.value);
                            }
                        }, "value");
                    }
                }
            });
            self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, "", function(type) {
                if (type !== self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
                    self.parseAddCommandClass(nodeId, instanceId, commandClassId);
                }
            }, "child");
        } else if (this.CC["Battery"] === commandClassId && !self.controller.devices.get(vDevId)) {
            defaults = {
                deviceType: 'battery',
                metrics: {
                    probeTitle: 'Battery',
                    scaleTitle: '%',
                    level: '',
                    icon: 'battery',
                    title: 'Battery ' + vDevIdNI
                }
            };
            var vDev = self.controller.devices.create(vDevId, defaults, function(command) {
                        if (command === "update") {
                            cc.Get();
                        }
                    });
            if (vDev) {
                self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, "last", function() {
                    vDev.set("metrics:level", this.value);
                }, "value");
            }
        } else if (this.CC["DoorLock"] === commandClassId && !self.controller.devices.get(vDevId)) {
            defaults = {
                deviceType: 'doorlock',
                metrics: {
                    mode: '',
                    icon: 'door',
                    title: 'Door Lock ' + vDevIdNI
                }
            };

            var vDev = self.controller.devices.create(vDevId, defaults, function(command) {
                if ("open" === command) {
                    cc.Set(0);
                } else if ("close" === command) {
                    cc.Set(255);
                }
            });
            if (vDev) {
                self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, "mode", function() {
                    vDev.set("metrics:mode", this.value === 255 ? "close" : "open");
                }, "value");
            }
    /*

    not finished yet

        } else if (this.CC["ThermostatFanMode"] === commandClassId && !self.controller.devices.get(vDevId)) {
            defaults = {
                deviceType: "fan",
                metrics: {
                    level: '',
                    icon: 'fan',
                    title: 'Fan ' + vDevIdNI
                }
            };
            var vDev = self.controller.devices.create(vDevId, defaults, "fan");
            if (vDev) {
                self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, "mode", function() {
                    vDev.set("metrics:currentMode", this.value);
                }, "value");
                self.dataBind(self.dataBindings, nodeId, instanceId, commandClassId, "on", function() {
                    vDev.set("metrics:state", this.value);
                }, "value");

                var modes = {};
                Object.keys(cc.data).forEach(function (modeId) {
                    modeId = parseInt(modeId, 10);
                    if (!isNaN(modeId)) {
                        modes[modeId] = {
                            id: modeId,
                            title: cc.data[modeId].modeName.value
                        };
                    }
                });  
                this.set("metrics:modes", modes);
                // !!! изменение
            }
    */
        } else if (this.CC["ThermostatMode"] === commandClassId || this.CC["ThermostatSetPoint"] === commandClassId) {
            var currentMode = null,
                scaleTitle = null,
                withMode = in_array(instanceCommandClasses, this.CC["ThermostatMode"]),
                withTemp = in_array(instanceCommandClasses, this.CC["ThermostatSetPoint"]),
                deviceNamePrefix = "ZWayVDev_" + nodeId + ":" + instanceId + ":Thermostat:",
                deviceName = deviceNamePrefix + (withMode ? "M" : "") +  (withTemp ? "T" : "");

            if (withMode && !instance.ThermostatMode.data.interviewDone.value || withTemp && !instance.ThermostatSetPoint.data.interviewDone.value) {
                return; // skip not finished interview
            }
            
            if (self.controller.devices.get(deviceName)) {
                return; // skip duplicate
            }
            
            defaults = {
                deviceType: 'thermostat',
                metrics: {
                    mode: null,
                    modes: {},
                    icon: 'thermostat',
                    title: 'Thermostat ' + vDevIdNI
                }
            };
            
            if (withMode) {
                currentMode = instance.ThermostatMode.data.mode.value;            
                
                Object.keys(instance.ThermostatMode.data).forEach(function (mode) {
                    mode = parseInt(mode, 10);
                    if (!isNaN(mode)) {
                        defaults.metrics.modes[mode] = {
                            id: mode,
                            title: instance.ThermostatMode.data[mode].modeName.value
                        };
                    }
                });
            }
            
            if (withTemp) {
                Object.keys(instance.ThermostatSetPoint.data).forEach(function (mode) {
                    mode = parseInt(mode, 10);
                    
                    var _data = instance.ThermostatSetPoint.data[mode];
                    if (!isNaN(mode)) {
                        if (currentMode === null) {
                            currentMode = mode; // find first available mode (should be the only if no current mode in ThermostatMode CC)
                        }
                        if (!scaleTitle) {
                            scaleTitle = _data.scaleString.value;
                        }
                        
                        if (!defaults.metrics.modes[mode]) {
                            defaults.metrics.modes[mode] ={
                                id: mode,
                                name: _data.modeName.value
                            };
                        }

                        defaults.metrics.modes[mode].min = _data.min ? _data.min.value : 0;
                        defaults.metrics.modes[mode].max = _data.max ? _data.max.value : 30;
                        defaults.metrics.modes[mode].level = _data.val.value;
                    }
                });
            }
                
            if (currentMode === null) {
                return; // skip broken CC
            }
            
            defaults.metrics.mode = currentMode;
            if (scaleTitle) {
                defaults.metrics.scaleTitle = scaleTitle;
            }
            
            var vDev = self.controller.devices.create(deviceName, defaults, function(command, args) {
                if (command === "setMode" && withMode) {
                    instance.ThermostatMode.Set(args.mode);
                } else if (command === "setTemp" && withTemp) {
                    instance.ThermostatSetPoint.Set(parseInt(args.mode), parseFloat(args.temp));
                    if (instance.ThermostatMode.data.mode != args.mode) {
                        instance.ThermostatMode.Set(args.mode);
                    }
                }
            });
            
            if (vDev) {
                if (withMode) {
                    self.dataBind(self.dataBindings, nodeId, instanceId, self.CC["ThermostatMode"], "mode", function(type) {
                        if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
                            self.controller.devices.remove(deviceName);
                        } else {        
                            vDev.set("metrics:mode", this.value);
                        }
                    }, "value");
                }

                if (withTemp) {
                    Object.keys(instance.ThermostatSetPoint.data).forEach(function (mode) {
                        mode = parseInt(mode, 10);
                        if (!isNaN(mode)) {
                            self.dataBind(self.dataBindings, nodeId, instanceId, self.CC["ThermostatSetPoint"], mode + ".val", function(type) {
                                if (type === self.ZWAY_DATA_CHANGE_TYPE.Deleted) {
                                    self.controller.devices.remove(deviceName);
                                } else {
                                    vDev.set("metrics:modes:" + mode + ":level", this.value);
                                }
                            }, "value");
                        }
                    });
                }
            }
        }
    } catch (e) {
        controller.addNotification("error", "Can not create vDev based on " + nodeId + ":" + instanceId + ":" + commandClassId + ": " + e.toString(), "core");
        console.log(e.stack);
    }
};

ZWaveGate.prototype.parseDelCommandClass = function (nodeId, instanceId, commandClassId) {
    nodeId = parseInt(nodeId, 10);
    instanceId = parseInt(instanceId, 10);
    commandClassId = parseInt(commandClassId, 10);

    var self = this,
        separ = ":",
        vDevIdPrefix = "ZWayVDev_",
        vDevIdNI = nodeId + separ + instanceId,
        vDevIdC = commandClassId,
        vDevId = vDevIdPrefix + vDevIdNI + separ + vDevIdC;

    this.controller.devices.remove(vDevId);
};
