/*** DummyDevice Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>, Ray Glendenning <ray.glendenning@gmail.com>
Description:
    Creates a Dummy device
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DummyDevice (id, controller) {
    // Call superconstructor first (AutomationModule)
    DummyDevice.super_.call(this, id, controller);
}

inherits(DummyDevice, AutomationModule);

_module = DummyDevice;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

DummyDevice.prototype.init = function (config) {
    DummyDevice.super_.prototype.init.call(this, config);

    var self = this;

    this.vDev = this.controller.devices.create(
        "DummyDevice_" + (this.config.deviceType === "switchMultilevel" ? "ml" : "bn") + "_" + this.id, { // different names to rebuild UI on change
        deviceType: this.config.deviceType,
        metrics: {
            probeTitle: '',
            scaleTitle: '',
            level: '',
            icon: '',
            title: 'Dummy ' + this.id
        }
    }, function(command, args) {
        var level = command;
        if (this.get('deviceType') === "switchMultilevel") {
            if (command === "on") {
                level = 99;
            } else if (command === "off") {
                level = 0;
            } else {
                level = args.level;
            }
        }
        this.set("metrics:level", level);
    });
};

DummyDevice.prototype.stop = function () {
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    DummyDevice.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
