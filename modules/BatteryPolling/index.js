/******************************************************************************

Z-Way Home Automation Battery Polling module
 Version: 1.0.0
 (c) ZWave.Me, 2013

 -----------------------------------------------------------------------------
 Author:
     Serguei Poltorak <ps@z-wave.me>
     Gregory Sitnin <sitnin@z-wave.me>

 Description:

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function BatteryPolling (id, controller) {
    // Call superconstructor first (AutomationModule)
    BatteryPolling.super_.call(this, id, controller);
}

inherits(BatteryPolling, AutomationModule);

_module = BatteryPolling;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

BatteryPolling.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    BatteryPolling.super_.prototype.init.call(this, config);

    this.controller.emit('core.addWidget', {
        code: "batteryStatusWidget.js",
        templates: "batteryStatusWidget.html"
    });

    this.controller.emit("cron.addTask", "batteryPolling.poll", {
        minute: 0,
        hour: 0,
        weekDay: this.config.launchWeekDay,
        day: null,
        month: null
    });

    // Setup event listener
    this.controller.on('batteryPolling.poll', function () {
      for (var id in zway.devices) {
       zway.devices[id].Battery && zway.devices[id].Battery.Get();
      }
    });

    /*
    var widget = new ZWaveBatteryLowLevelWarningWidget("BatterLowLevelWidget", this.controller, 0, 0);
    widget.bindToDatapoints();
    this.controller.devices[widget.id] = widget;
    */
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

