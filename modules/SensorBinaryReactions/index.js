/*** SensorBinaryReactions HA module *************************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Copyright: (c) Z-Wave.Me, 2013
Description: Configurable reactions on binary reports events

******************************************************************************/

/* Config examples:
    "map": [
        {
            "reaction": "on",
            "level": 255,
            "vDev": "ZWayVDev_16:0:48:1",
            "vDevAction": "ZWayVDev_17:0:37",
            "timeout": 3
            }
        },
        {
            "reaction": "off",
            "level": 255,
            "vDev": "ZWayVDev_16:0:48:1",
            "vDevAction": "ZWayVDev_17:0:37",
            "timeout": 0 // in that case no auto-on function will be enabled
            }
        },
        {
            "reaction": "onOff",
            "vDev": "ZWayVDev_16:0:48:1",
            "vDevAction": "ZWayVDev_17:0:37",
            "invert": false
            }
        }
    ]
*/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SensorBinaryReactions (id, controller) {
    // Call superconstructor first (AutomationModule)
    SensorBinaryReactions.super_.call(this, id, controller);

    // Create instance variables
    this.map = [];
    this.activeTimers = {};
}

inherits(SensorBinaryReactions, AutomationModule);

_module = SensorBinaryReactions;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SensorBinaryReactions.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    SensorBinaryReactions.super_.prototype.init.call(this, config);

    this.map = config.map;

    var self = this;

    this.controller.on('device.metricUpdated', function () {
    	return self.onUpdate.apply(self, arguments);
    });

    console.log("SensorBinary Reactions module enabled with", this.map.length, "reactions");
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

SensorBinaryReactions.prototype.getReactions = function (deviceId) {
	return this.map.filter(function (item) {
		return item.vDev === deviceId;
	});
}

SensorBinaryReactions.prototype.onUpdate = function (vDev, dataHolder, level) {
	var self = this;
	var workingMaps = this.getReactions(vDev);

	workingMaps.forEach(function (item) {
                if (!has_key(self.controller.devices, item.vDevAction)) {
                        console.error("Error: Unknown vDev ID ["+item.vDevAction+"]");
                        self.controller.emit('core.error', "Unknown vDev ID ["+item.vDevAction+"]");
                        return;
                }

                var device = self.controller.devices[item.vDevAction];

                if ("onOff" === item.reaction) {
                        device.performCommand(((level ? true : false) ^ item.invert) ? "on" : "off");
                } else if (("on" === item.reaction || "off" === item.reaction) && (item.level ? true : false) === level) {
                        device.performCommand(item.reaction);
                        
                        if (item.timeout) {
                                var timerId = "SensorBinaryReactions:" + vDev + ":" + item.vDevAction;

                                if (!!self.activeTimers[timerId]) {
                                        clearTimeout(self.activeTimers[timerId]);
                                        delete self.activeTimers[timerId];
                                };


                                self.activeTimers[timerId] = setTimeout(function () {
                                        delete self.activeTimers[timerId];
                                        device.performCommand(item.reaction === "on" ? "off" : "on");
                                }, item.timeout * 1000);
                        }
                } else {
                        self.controller.emit('core.error', "Unknown SensorBinary reaction type ["+item.reaction+"]");
                }
	});
}
