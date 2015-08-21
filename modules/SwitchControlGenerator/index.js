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
        "SceneActivation": 0x2b,
        "CentralScene": 0x5b
    };
    
    this.generated = this.config.generated; // used to stop after config changed
    this.bindings = [];
    
    this.zwayReg = function (zwayName) {
        var zway = global.ZWave && global.ZWave[zwayName].zway;
        
        if (!zway) {
            return;
        }
        
        // create devices
        self.generated.filter(function(el) { return el.indexOf("ZWayVDev_" + zwayName + "_Remote_") === 0; }).forEach(function(name) {
            if (self.config.banned.indexOf(name) === -1) {
                self.controller.devices.create({
                    deviceId: name,
                    defaults: {
                        deviceType: "switchControl",
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
                    var val, par = {};
                    
                    if (this.value === 0) {
                        val = "off";
                    } else if (this.value === 255) {
                        val = "on";
                    } else {
                        val = "exact";
                        par = { level: this.value };
                    }
                    self.handler(zwayName, val, par, [dataB.srcNodeId.value, dataB.srcInstanceId.value, n]);
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchBinary"], "level", function(type) {
                    self.handler(zwayName, this.value ? "on" : "off", {}, [dataSB.srcNodeId.value, dataSB.srcInstanceId.value, n]);
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchMultilevel"], "level", function(type) {
                    var val, par = {};
                    
                    if (this.value === 0) {
                        val = "off";
                    } else if (this.value === 255) {
                        val = "on";
                    } else {
                        val = "exact";
                        par = { level: this.value };
                    }
                    self.handler(zwayName, val, par, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n]);
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchMultilevel"], "startChange", function(type) {
                    self.handler(zwayName, this.value ? "upstart" : "downstart", {}, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n]);
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["SwitchMultilevel"], "stopChange", function(type) {
                    self.handler(zwayName, dataSML.startChange.value ? "upstop" : "downstop", {}, [dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n]);
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["SceneActivation"], "currentScene", function(type) {
                    self.handler(zwayName, "on", {}, [dataSc.srcNodeId.value, dataSc.srcInstanceId.value, n, this.value]);
                }, "");
                self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, ctrlNodeId, n, self.CC["CentralScene"], "currentScene", function(type) {
                    self.handler(zwayName, "on", {}, [dataCSc.srcNodeId.value, dataCSc.srcInstanceId.value, n, this.value]);
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
        self.generated.filter(function(el) { return el.indexOf("ZWayVDev_" + zwayName + "_Remote_") === 0; }).forEach(function(name) {
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
};

SwitchControlGenerator.prototype.stop = function () {
    // unsign event handlers
    this.controller.off("ZWave.register", this.zwayReg);
    this.controller.off("ZWave.unregister", this.zwayUnreg);

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
        name = "ZWayVDev_" + zwayName + "_Remote_" + postfix;
        
    if (this.config.generated.indexOf(name) === -1) {
        if (!this.config.trapNew || this.config.banned.indexOf(name) !== -1) {
            return;
        }

        this.controller.devices.create({
            deviceId: name,
            defaults: {
                deviceType: "switchControl",
                metrics: {
                    icon: '',
                    title: "Button " + global.ZWave[zwayName].zway.devices[ids[0]].data.vendorString.value + " " + ids.slice(1).join("-"),
                    level: "",
                    change: ""
                }
            },
            overlay: {},
            handler: this.widgetHandler,
            moduleId: this.id
        });
        
        this.config.generated.push(name);
        this.saveConfig();
    }
    
    var vDev = this.controller.devices.get(name),
        moduleName = "SwitchControlGenerator",
        langFile = this.controller.loadModuleLang(moduleName);
    
    if (vDev === null) {
        this.controller.addNotification("critical", langFile.err, "controller", moduleName);
        return;
    }
    
    this.widgetHandler.call(vDev, cmd, par);
};
