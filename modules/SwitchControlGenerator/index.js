/*** SwitchControlGenerator Z-Way HA module *******************************************

Version: 1.0.0
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
        "SceneActivation": 0x2b
    };
    
    this.bindings = [];
    try {
        var ctrlNodeId = zway.controller.data.nodeId.value,
            insts = zway.devices[ctrlNodeId].instances;
        for (var i in insts) {
            (function(n) {
                var dataB = insts[n].Basic.data,
                    dataSB = insts[n].SwitchBinary.data,
                    dataSML = insts[n].SwitchMultilevel.data,
                    dataSc = insts[n].SceneActivation.data;
               
                controller.emit("ZWaveGate.dataBind", self.bindings, ctrlNodeId, n, self.CC["Basic"], "level", function(type) {
                    var val, par = {};
                    
                    if (this.value === 0) {
                        val = "off";
                    } else if (this.value === 255) {
                        val = "on";
                    } else {
                        val = "exact";
                        par = { level: this.value };
                    }
                    self.handler(val, par, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n]);
                }, "");
                controller.emit("ZWaveGate.dataBind", self.bindings, ctrlNodeId, n, self.CC["SwitchBinary"], "level", function(type) {
                    self.handler(this.value ? "on" : "off", {}, [dataSB.srcNodeId.value, dataSB.srcInstanceId.value, n]);
                }, "");
                controller.emit("ZWaveGate.dataBind", self.bindings, ctrlNodeId, n, self.CC["SwitchMultilevel"], "level", function(type) {
                    var val, par = {};
                    
                    if (this.value === 0) {
                        val = "off";
                    } else if (this.value === 255) {
                        val = "on";
                    } else {
                        val = "exact";
                        par = { level: this.value };
                    }
                    self.handler(val, par, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n]);
                }, "");
                controller.emit("ZWaveGate.dataBind", self.bindings, ctrlNodeId, n, self.CC["SwitchMultilevel"], "startChange", function(type) {
                    self.handler(this.value ? "upstart" : "downstart", {}, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n]);
                }, "");
                controller.emit("ZWaveGate.dataBind", self.bindings, ctrlNodeId, n, self.CC["SwitchMultilevel"], "stopChange", function(type) {
                    self.handler(dataSML.startChange.value ? "upstop" : "downstop", {}, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n]);
                }, "");
                controller.emit("ZWaveGate.dataBind", self.bindings, ctrlNodeId, n, self.CC["SceneActivation"], "currentScene", function(type) {
                    self.handler("on", {}, [dataSc.srcNodeId.value, dataSc.srcInstanceId.value, n, this.value]);
                }, "");
            })(i);
        }
    } catch(e) {
        this.controller.addNotification("error", "SwitchControlGenerator failed to start: controller dataholder can not be loaded: " + e.toString(), "controller");
        throw(e);
    };

    this.config.generated.forEach(function(name) {
        if (self.config.banned.indexOf(name) === -1) {
            self.controller.devices.create(name, {
                deviceType: "switchControl",
                metrics: {
                    icon: '',
                    title: name,
                    level: "",
                    change: ""
                }
            }, self.widgetHandler);
        }
    });
    
    this.generated = this.config.generated; // used to stop after config changed
};

SwitchControlGenerator.prototype.stop = function () {
    try {
        controller.emit("ZWaveGate.dataUnbind", this.bindings);
    } catch(e) {
        this.controller.addNotification("error", "SwitchControlGenerator failed to stop: controller dataholder can not be unbinded: " + e.toString(), "controller");
    };
    
    this.bindings = null;

    var self = this;
    
    if (this.generated) {
        this.generated.forEach(function(name) {
            self.controller.devices.remove(name);
        });
        this.generated = null;
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

SwitchControlGenerator.prototype.handler = function(cmd, par, ids) {
    var postfix = ids.join(":"),
        name = "Remote_" + this.id + "_" + postfix;
    
    if (this.config.generated.indexOf(name) === -1) {
        if (this.config.banned.indexOf(name) !== -1) {
            return;
        }

        this.controller.devices.create(name, {
            deviceType: "switchControl",
            metrics: {
                icon: '',
                title: name,
                level: "",
                change: ""
            }
        }, this.widgetHandler);
        
        this.config.generated.push(name);
        this.saveConfig();
    };
    
    var vDev = this.controller.devices.get(name);
    if (vDev === null) {
        this.controller.addNotification("critical", "SwitchControlGenerator: Virtual device should exist, but was not found", "controller");
        return;
    }
    
    this.widgetHandler.call(vDev, cmd, par);
};
