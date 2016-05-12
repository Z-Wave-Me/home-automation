/*** ScheduledScene Z-Way HA module *******************************************

Version: 2.1.2
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>, Niels Roche <nir@zwave.eu>
Description:
    This executes scene by cron

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function ScheduledScene (id, controller) {
    // Call superconstructor first (AutomationModule)
    ScheduledScene.super_.call(this, id, controller);
}

inherits(ScheduledScene, AutomationModule);

_module = ScheduledScene;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

ScheduledScene.prototype.init = function (config) {
    ScheduledScene.super_.prototype.init.call(this, config);

    var self = this;

    this.runScene = function() {
        self.config.switches.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
                    vDev.performCommand(devState.status);
                }
            }
        });
        self.config.thermostats.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
                    vDev.performCommand("exact", { level: devState.status });
                }
            }
        });
        self.config.dimmers.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
                    vDev.performCommand("exact", { level: devState.status });
                }
            }
        });
        self.config.locks.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
                    vDev.performCommand(devState.status);
                }
            }
        });
        self.config.scenes.forEach(function(scene) {
            var vDev = self.controller.devices.get(scene);
            if (vDev) {
                vDev.performCommand("on");
            }
        });
    };

    // set up cron handler
    this.controller.on("scheduledScene.run."+self.id, this.runScene);

    // add cron schedule
    var wds = this.config.weekdays.map(function(x) { return parseInt(x, 10); });
    
    if (wds.length == 7) {
        wds = [null]; // same as all - hack to add single cron record. NB! changes type of wd elements from integer to null
    }
    
    wds.forEach(function(wd) {
        this.controller.emit("cron.addTask", "scheduledScene.run."+self.id, {
            minute: parseInt(self.config.time.split(":")[1], 10),
            hour: parseInt(self.config.time.split(":")[0], 10),
            weekDay: wd,
            day: null,
            month: null
        });
    });
};

ScheduledScene.prototype.stop = function () {
    ScheduledScene.super_.prototype.stop.call(this);

    this.controller.emit("cron.removeTask", "scheduledScene.run."+this.id);
    this.controller.off("scheduledScene.run."+this.id, this.runScene);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
