/*** ScheduledScene Z-Way HA module *******************************************

Version: 2.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>
Description:
    This executes executes scene by cron

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
        var vDev = self.controller.devices.get(self.config.scene);
        if (vDev) {
            vDev.performCommand("on");
        }
    };

    // set up cron handler
    this.controller.on("scheduledScene.run", this.runScene);

    // add cron schedule
    var wds = this.config.weekdays.map(function(x) { return parseInt(x, 10); });
    
    if (wds.lenth == 7) {
        wds = [null]; // same as all - hack to add single cron record. NB! changes type of wd elements from integer to null
    }
    
    wds.forEach(function(wd) {
        this.controller.emit("cron.addTask", "scheduledScene.run", {
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

    this.controller.emit("cron.removeTask", "scheduledScene.run");
    this.controller.off("scheduledScene.run", this.runScene);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
