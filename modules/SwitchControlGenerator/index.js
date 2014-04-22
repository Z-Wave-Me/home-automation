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
        "SwitchMultilevel": 0x26
    };
    
    this.bindings = [];
    try {
        var insts = zway.devices[zway.controller.data.nodeId.value].instances;
        for (var i in insts) {
            (function(n) {
                var dataB = insts[n].Basic.data,
                    dataSML = insts[n].SwitchMultilevel.data;
                
                ZWaveGate.dataBind(self.bindings, zway.controller.data.nodeId.value, n, this.CC["Basic"], "level", function(type) {
                    self.handler(this.value ? "on" : "off", dataB.srcNodeId.value, dataB.srcInstanceId.value, n);
                }, "");
                ZWaveGate.dataBind(self.bindings, zway.controller.data.nodeId.value, n, this.CC["SwitchMultilevel"], "startChange", function(type) {
                    self.handler(this.value ? "downstart" : "upstart", dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n);
                }, "");
                ZWaveGate.dataBind(self.bindings, zway.controller.data.nodeId.value, n, this.CC["SwitchMultilevel"], "stopChange", function(type) {
                    self.handler(dataSML.startChange.value ? "downstop" : "upstop", dataSML.srcNodeId.value, dataSML.srcInstanceId.value, n);
                }, "");
            })(i);
        }
    } catch(e) {
        this.controller.addNotification("error", "SwitchControlGenerator failed to start: controller dataholder can not be loaded: " + e.toString(), "controller");
        return;
    };

    this.config.generated.forEach(function(name) {
        if (self.config.banned.indexOf(name) === -1) {
            self.controller.collection.create(name, {
                deviceType: "switchControl",
                metrics: {
                    icon: '',
                    title: name
                }
            }, this.widgetHandler);
        }
    });
    
    this.generated = this.config.generated; // used to stop after config changed
};

SwitchControlGenerator.prototype.stop = function () {
    try {
        ZWaveGate.dataUnbind(this.bindings);
    } catch(e) {
        this.controller.addNotification("error", "SwitchControlGenerator failed to stop: controller dataholder can not be unbinded: " + e.toString(), "controller");
    };
    
    this.bindings = null;

    var self = this;
    
    this.generated.forEach(function(name) {
        self.controller.collection.remove(name);
    });
    this.generated = null;

    SwitchControlGenerator.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

SwitchControlGenerator.prototype.widgetHandler = function(command) {
    this.performCommand("XXXXXXXXXXX", command);
};

SwitchControlGenerator.prototype.handler = function(cmd, srcNode, srcInst, dstInst) {
    var postfix = srcNode.toString() + ":" + srcInst.toString() + ":" + dstInst.toString(),
        name = "Switch_" + this.id + "_" + postfix;
    
    if (this.config.generated.indexOf(name) === -1) {
        if (this.config.banned.indexOf(name) !== -1) {
            return;
        }

        this.controller.collection.create(name, {
            deviceType: "switchControl",
            metrics: {
                icon: '',
                title: name
            }
        }, this.widgetHandler);
        
        this.config.generated.push(name);
        this.params = this.config;
        this.saveConfig();
    };
    
    var vDev = this.controller.collection.get(name);
    if (vDev === null) {
        this.controller.addNotification("critical", "SwitchControlGenerator: Virtual device should exist, but was not found", "controller");
        return;
    }
    
    this.widgetHandler.call(vDev, cmd);
};
