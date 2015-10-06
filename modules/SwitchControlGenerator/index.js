/*** SwitchControlGenerator Z-Way HA module *******************************************

Version: 1.0.1
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Generates new widgets on the fly for Remote Switches and other devices sending control commands to controller
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SwitchControlGenerator (id, controller) {
    // Call superconstructor first (AutomationModule)
    SwitchControlGenerator.super_.call(this, id, controller);
}

inherits(SwitchControlGenerator, AutomationModule);

_module = SwitchControlGenerator;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SwitchControlGenerator.prototype.init = function (config) {
    SwitchControlGenerator.super_.prototype.init.call(this, config);

    var self = this;

    this.CC = {
        "Basic": 0x20,
        "SwitchBinary": 0x25,
        "SwitchMultilevel": 0x26,
        "SceneActivation": 0x2b,
        "CentralScene": 0x5b
    };

    this.ZWAY_DEVICE_CHANGE_TYPES = {
        "DeviceAdded": 0x01,
        "DeviceRemoved": 0x02,
        "InstanceAdded": 0x04,
        "InstanceRemoved": 0x08,
        "CommandAdded": 0x10,
        "CommandRemoved": 0x20,
        "ZDDXSaved": 0x100,
        "EnumerateExisting": 0x200
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

    
    this.generated = this.config.generated; // used to stop after config changed
    this.bindings = [];
    
    this.zwayReg = function (zwayName) {
        var zway = global.ZWave && global.ZWave[zwayName].zway;
        
        if (!zway) {
            return;
        }
        
        // create devices
        self.generated.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_") === 0; }).forEach(function(name) {
            if (self.config.banned.indexOf(name) === -1) {
                self.controller.devices.create({
                    deviceId: name,
                    defaults: {
                        deviceType: name[name.length-1] === "S" ? "toggleButton" : "switchControl",
                        metrics: {
                            icon: '',
                            title: "Button", // this is always not the initial creation, so the default title is already filled 
                            level: "",
                            change: ""
                        }
                    },
                    overlay: {},
                    handler: self.widgetHandler,
                    moduleId: this.id
                });
            }
        });
                
        self.bindings[zwayName] = [];

        self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, "lastExcludedDevice", function(type) {
            var _id = this.value;
            // remove vDev and cleanup vDev info
            self.generated.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_" + _id) === 0; }).forEach(function(name) {
                self.controller.devices.remove(name);
                self.controller.devices.cleanup(name);
            });
            // remove from generated and banned lists
            self.generated = self.generated.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_" + _id) !== 0; });
            self.config.generated = self.config.generated.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_" + _id) !== 0; });
            self.config.banned = self.config.banned.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_" + _id) !== 0; });
            self.saveConfig();
        }, "");

        var ctrlNodeId = zway.controller.data.nodeId.value,
            insts = zway.devices[ctrlNodeId].instances;
        for (var i in insts) {
            (function(n) {
                var dataB = insts[n].Basic.data,
                    dataSB = insts[n].SwitchBinary.data,
                    dataSML = insts[n].SwitchMultilevel.data,
                    dataSc = insts[n].SceneActivation.data,
                    dataCSc = insts[n].commandClasses[self.CC["CentralScene"]] && insts[n].commandClasses[self.CC["CentralScene"]].data || null; // TODO: replace with a shortcut once fixed bug in Z-Way
               
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["Basic"], "level", function(type) {
                    if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
                        self.remove(zwayName, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n, "B"]);
                    } else {
                        var val, par = {};
                        
                        if (this.value === 0) {
                            val = "off";
                        } else if (this.value === 255) {
                            val = "on";
                        } else {
                            val = "exact";
                            par = { level: this.value };
                        }
                        self.handler(zwayName, val, par, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n, "B"]);
                    }
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchBinary"], "level", function(type) {
                    if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
                        self.remove(zwayName, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n, "B"]);
                    } else {
                        self.handler(zwayName, this.value ? "on" : "off", {}, [dataSB.srcNodeId.value, dataSB.srcInstanceId.value, n, "B"]);
                    }
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchMultilevel"], "level", function(type) {
                    if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
                        self.remove(zwayName, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n, "B"]);
                    } else {
                        var val, par = {};
                        
                        if (this.value === 0) {
                            val = "off";
                        } else if (this.value === 255) {
                            val = "on";
                        } else {
                            val = "exact";
                            par = { level: this.value };
                        }
                        self.handler(zwayName, val, par, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n, "B"]);
                    }
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchMultilevel"], "startChange", function(type) {
                    if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
                        self.remove(zwayName, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n, "B"]);
                    } else {
                        self.handler(zwayName, this.value ? "upstart" : "downstart", {}, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n, "B"]);
                    }
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchMultilevel"], "stopChange", function(type) {
                    if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
                        self.remove(zwayName, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n, "B"]);
                    } else {
                        self.handler(zwayName, dataSML.startChange.value ? "upstop" : "downstop", {}, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n, "B"]);
                    }
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["SceneActivation"], "currentScene", function(type) {
                    if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
                        self.remove(zwayName, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n, "S"]);
                    } else {
                        self.handler(zwayName, "on", {}, [dataSc.srcNodeId.value, dataSc.srcInstanceId.value, n, this.value, "S"]);
                    }
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["CentralScene"], "currentScene", function(type) {
                    if (type === self.ZWAY_DATA_CHANGE_TYPE["Deleted"]) {
                        self.remove(zwayName, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n, "S"]);
                    } else {
                        self.handler(zwayName, "on", {}, [dataCSc.srcNodeId.value, dataCSc.srcInstanceId.value, n, this.value, "S"]);
                    }
                }, "");
            })(i);
        }
    };
    
    this.zwayUnreg = function(zwayName) {
        // detach handlers
        if (self.bindings[zwayName]) {
            self.controller.emit("ZWave.dataUnbind", self.bindings[zwayName]);
        }
        // remove devices
        self.generated.filter(function(el) { return !!el && el.indexOf("ZWayVDev_" + zwayName + "_Remote_") === 0; }).forEach(function(name) {
            self.controller.devices.remove(name);
        });
        self.bindings[zwayName] = null;
    };
    
    this.controller.on("ZWave.register", this.zwayReg);
    this.controller.on("ZWave.unregister", this.zwayUnreg);

    // walk through existing ZWave
    if (global.ZWave) {
        for (var name in global.ZWave) {
            this.zwayReg(name);
        }
    }
    
    this.api = function(zwayName /* srcNodeId, srcInstanceId, dstInstanceId, [sceneId], type */) {
        var _trapNew = self.config.trapNew;
        self.config.trapNew = true; // to force creation of new elements even if not allowed to do it on event trap
        self.handler(zwayName, "", {}, Array.prototype.slice.call(arguments, 1));
        self.config.trapNew = _trapNew;
    };
    
    this.controller.on("SwitchControlGenerator.register", this.api);
}

SwitchControlGenerator.prototype.stop = function () {
    // unsign event handlers
    this.controller.off("ZWave.register", this.zwayReg);
    this.controller.off("ZWave.unregister", this.zwayUnreg);
    this.controller.off("SwitchControlGenerator.register", this.api);

    // detach handlers
    for (var name in this.bindings) {
        this.controller.emit("ZWave.dataUnbind", this.bindings[name]);
    }
    
    this.bindings = [];

    var self = this;
    
    // remove devices
    if (this.generated) {
        this.generated.forEach(function(name) {
            self.controller.devices.remove(name);
        });
        this.generated = [];
    }

    SwitchControlGenerator.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

SwitchControlGenerator.prototype.widgetHandler = function(command, params) {
    if (command === "on" || command === "off") {
        this.set("metrics:level", command);
    }
    if (command === "exact") {
        this.set("metrics:level", params.level);
    }
    if (command === "upstart" || command === "upstop" || command === "downstart" || command === "downstop") {
        this.set("metrics:change", command);
    }
};

SwitchControlGenerator.prototype.handler = function(zwayName, cmd, par, ids) {
    var postfix = ids.join("-"),
        type = ids[ids.length - 1],
        name = "ZWayVDev_" + zwayName + "_Remote_" + postfix;
        
    if (this.config.generated.indexOf(name) === -1) {
        if (!this.config.trapNew || this.config.banned.indexOf(name) !== -1) {
            return;
        }

        var vendor = "";
        try {
            vendor = global.ZWave[zwayName].zway.devices[ids[0]].data.vendorString.value;
        } catch (e) {
        }
        
        this.controller.devices.create({
            deviceId: name,
            defaults: {
                deviceType: type === "S" ? "toggleButton" : "switchControl",
                metrics: {
                    icon: '',
                    title: "Button " + vendor + " " + ids.slice(0, -1).join("-"),
                    level: "",
                    change: ""
                }
            },
            overlay: {},
            handler: this.widgetHandler,
            moduleId: this.id
        });
        
        this.config.generated.push(name);
        this.generated = this.config.generated;
        this.saveConfig();
    }

    var vDev = this.controller.devices.get(name);
    
    if (vDev === null) {
        var moduleName = "SwitchControlGenerator",
            langFile = this.controller.loadModuleLang(moduleName);
        this.controller.addNotification("critical", langFile.err, "controller", moduleName);
        return;
    }
    
    this.widgetHandler.call(vDev, cmd, par);
};

SwitchControlGenerator.prototype.remove = function(zwayName, ids) {
    var postfix = ids.join("-"),
        name = "ZWayVDev_" + zwayName + "_Remote_" + postfix;
        
    if (this.config.generated.indexOf(name) === -1) {
        this.controller.devices.remove(name);
    }
};
