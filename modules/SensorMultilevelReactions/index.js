/*** SensorMultilevelReactions HA module **************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Copyright: (c) Z-Wave.Me, 2013
Description: Configurable reactions on sensor multilevel reports events

******************************************************************************/

/* Config examples:
    "map": [
        {
            "reaction": "on", // valid are "on" or "off"
            "vDev": "ZWayVDev_16:0:48:1",
            "min": 30,
            "max": 70,
            "vDevAction": "ZWayVDev_17:0:37",
            "timeout": 3 // if 0, no auto-off/on function will be enabled
        },
        {
            "reaction": "onOff",
            "vDev": "ZWayVDev_16:0:48:1",
            "min": 30,
            "max": 70,
            "vDevAction": "ZWayVDev_17:0:37",
            "invert": true
        }
    ]
*/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SensorMultilevelReactions(id, controller) {
    // Call superconstructor first (AutomationModule)
    SensorMultilevelReactions.super_.call(this, id, controller);

    // Create instance variables
    this.map = [];
    this.activeTimers = {};
}

inherits(SensorMultilevelReactions, AutomationModule);

_module = SensorMultilevelReactions;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SensorMultilevelReactions.prototype.init = function(config) {
    // Call superclass' init (this will process config argument and so on)
    SensorMultilevelReactions.super_.prototype.init.call(this, config);

    this.map = this.config.map;

    var self = this;

    this.controller.on('device.metricUpdated', function() {
        return self.onUpdate.apply(self, arguments);
    });

    console.log("SensorMultilevel Reactions module enabled with", this.map.length, "reactions");
};

SensorMultilevelReactions.prototype.stop = function () {
    console.log("--- SensorMultilevelReactions.stop()");
    SensorMultilevelReactions.super_.prototype.stop.call(this);

    var self = this;

    Object.keys(this.activeTimers).forEach(function (timerId) {
        clearTimeout(self.activeTimers[timerId]);
        delete self.activeTimers[timerId];
    });
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

SensorMultilevelReactions.prototype.getReactions = function(deviceId) {
    return this.map.filter(function(item) {
        return item.vDev === deviceId;
    });
};

SensorMultilevelReactions.prototype.onUpdate = function(vDev, dataHolder, level) {
    var self = this;
    var workingMaps = this.getReactions(vDev);

    workingMaps.forEach(function(item) {
        if (!has_key(self.controller.devices, item.vDevAction)) {
            console.error("Error: Unknown vDev ID [" + item.vDevAction + "]");
            self.controller.emit('core.error', "Unknown vDev ID [" + item.vDevAction + "]");
            return;
        }

        var device = self.controller.devices[item.vDevAction];

        var inInterval = level >= item.min && level <= item.max;

        if ("onOff" === item.reaction) {
            device.performCommand((inInterval ^ item.invert) ? "on" : "off");
        } else if (("on" === item.reaction || "off" === item.reaction) && inInterval) {
            device.performCommand(item.reaction);

            if (item.timeout) {
                var timerId = "SensorMultilevelReactions:" + vDev + ":" + item.vDevAction;

                if ( !! self.activeTimers[timerId]) {
                    clearTimeout(self.activeTimers[timerId]);
                    delete self.activeTimers[timerId];
                }

                self.activeTimers[timerId] = setTimeout(function() {
                    delete self.activeTimers[timerId];
                    device.performCommand(item.reaction === "on" ? "off" : "on");
                }, item.timeout * 1000);
            }
        } else {
            self.controller.emit('core.error', "Unknown sensor SensorMultilevel raction type [" + item.reaction + "]");
        }
    });
};
