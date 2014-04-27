/*** SecurityNotifications Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>     
Description:
    This module notifies when some sensor values changed

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SecurityNotifications (id, controller) {
    // Call superconstructor first (AutomationModule)
    SecurityNotifications.super_.call(this, id, controller);
}

inherits(SecurityNotifications, AutomationModule);

_module = SecurityNotifications;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SecurityNotifications.prototype.init = function (config) {
    SecurityNotifications.super_.prototype.init.call(this, config);

    var self = this;

    this.statusData = loadObject("SecurityNotifications" + this.id.toString());
    if (!this.statusData)
        this.statusData = {"armed": false};
    
    executeFile(this.moduleBasePath() + "/SecurityNotificationsDevice.js");
    this.vdev = new SecurityNotificationsDevice("SecurityNotifications", this.controller);
    this.vdev.setMetricValue("level", this.statusData.armed);
    this.vdev.init();
    this.controller.registerDevice(this.vdev);

    // Setup event listeners
    this.onMetricUpdated = function (vdevId, name, value) {
        var message,
            result,
            i;
        
        if (!self.get("metrics:level"))
            return;
        
        i = self.config.binary.map(function(el) { return el.id; }).indexOf(vdevId)
        if (i !== -1) {
            var dev = self.controller.devices.get(vdevId);
            if (dev.get("metrics:level") === self.config.binary[i].safeStatus) {
                message = "Device " + vdev.get("metrics:title") + " is back to safe.";
                result = false;
            } else {
                message = "Device " + vdev.get("metrics:title") + " triggered!";
                result = true;
            }
        }

        i = self.config.multilevel.map(function(el) { return el.id; }).indexOf(vdevId)
        if (i !== -1) {
            var dev = self.controller.devices.get(vdevId);
            if (dev.get("metrics:level") > self.config.multilevel[i].border && self.config.multilevel[i].greater) {
                message = "Device " + vdev.get("metrics:title") + " is back to safe.";
                result = false;
            } else (dev.get("metrics:level") < self.config.multilevel[i].border && !self.config.multilevel[i].greater) {
                message = "Device " + vdev.get("metrics:title") + " triggered!";
                result = true;
            }
        }
        
        if (message && self.vdev.get("metrics:level") === "on") {
            self.controller.addNotification("critical", message, "security");
            var dev = self.controller.devices.get(self.config.triggerScene);
            if (dev) {
                dev.performCommand(result ? "on" : "off");
            }
        }
    };
    
    this.controller.on('device.metricUpdated', this.onMetricUpdated);
};

SecurityNotifications.prototype.stop = function () {
    SecurityNotifications.super_.prototype.stop.call(this);

    this.controller.off('device.metricUpdated', this.onMetricUpdated);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
