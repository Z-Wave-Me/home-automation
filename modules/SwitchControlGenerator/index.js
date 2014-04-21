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

    this.bindings = {};
    try {
        var insts = zway.devices[zway.controller.data.nodeId.value].instances;
        for (var i in insts) {
            (function(n) {
                // !!! ADD HERE SwitchMultilevel dimming actions !!!
                self.bindings[n] = insts[n].Basic.data.level.bind(function(type, instId) {
                    self.handler(this.value ? "on" : "off", insts[n].Basic.data.srcNodeId.value, insts[n].Basic.data.srcInstanceId.value, instId);
                }, n);
            })(i);
        }
    } catch(e) {
        this.controller.addNotification("error", "SwitchControlGenerator failed to start: controller dataholder can not be loaded: " + e.toString(), "controller");
        return;
    };

    this.config.generated.forEach(function(name) {
        if (self.config.banned.indexOf(name) === -1) {
            self.controller.emit("switches.register", name, self.config.title, self.widgetHandler);
        }
    });
    
    this.generated = this.config.generated; // used to stop after config changed
};

SwitchControlGenerator.prototype.stop = function () {
    try {
        var insts = zway.devices[zway.controller.data.nodeId.value].instances;
        for (var i in this.bindings) {
            insts[i].Basic.data.level.unbind(this.bindings[i]);
        }
    } catch(e) {
        this.controller.addNotification("error", "SwitchControlGenerator failed to stop: controller dataholder can not be unbinded: " + e.toString(), "controller");
    };
    
    this.bindings = null;

    var self = this;
    
    this.generated.forEach(function(name) {
        self.controller.collection.remove(name);
    });

    SwitchControlGenerator.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

SwitchControlGenerator.prototype.widgetHandler = function(command) {
    this.setMetricValue("level", command);
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
                probeTitle: '',
                scaleTitle: '',
                level: '',
                icon: '',
                title: 'Remote ' + postfix
            }
        }, this.widgetHandler);
        
        console.log("!!! FIX THIS !!! in SwitchControlGenerator.prototype.handler");
        this.config.generated.push(name);
        this.params = this.config;
        this.controller.saveConfig();
    };
    
    var vDev = this.controller.findVirtualDeviceById(name);
    if (vDev === null) {
        this.controller.addNotification("critical", "SwitchControlGenerator: Virtual device should exist, but was not found", "controller");
        return;
    }
    
    this.widgetHandler.call(vDev, cmd);
};
