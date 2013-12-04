/*** BasicReactions HA module *************************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) Z-Wave.Me, 2013
Description: Configurable reactions on zway.basic events

******************************************************************************/

/* Config examples:
    "map": [
        {
            "reaction": "on",
            "level": 255,
            "channel": 10
            "vDevAction": "ZWayVDev_17:0:37",
            "timeout": 3
            }
        },
        {
            "reaction": "off",
            "level": 255,
            "channel": 10
            "vDevAction": "ZWayVDev_17:0:37",
            "timeout": 0 // in that case no auto-on function will be enabled
            }
        },
        {
            "reaction": "onOff",
            "channel": 10
            "vDevAction": "ZWayVDev_17:0:37",
            "invert": false
            }
        }
    ]
*/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function BasicReactions (id, controller) {
    // Call superconstructor first (AutomationModule)
    BasicReactions.super_.call(this, id, controller);

    // Create instance variables
    this.map = [];
    this.activeTimers = {};
}

inherits(BasicReactions, AutomationModule);

_module = BasicReactions;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

BasicReactions.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    BasicReactions.super_.prototype.init.call(this, config);

    this.map = config.map;

    var self = this;
    this.controller.on('zway.basic', function () {
        return self.onBasic.apply(self, arguments);
    });

    console.log("Basic Reactions module enabled with", this.map.length, "reactions");
};

BasicReactions.prototype.stop = function () {
    console.log("--- BasicReactions.stop()");
    BasicReactions.super_.prototype.stop.call(this);

    var self = this;

    Object.keys(this.activeTimers).forEach(function (timerId) {
        clearTimeout(self.activeTimers[timerId]);
        delete self.activeTimers[timerId];
    });
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

BasicReactions.prototype.getReactions = function (channel) {
    return this.map.filter(function (item) {
        return item.channel === channel;
    });
}

BasicReactions.prototype.onBasic = function (channel, level) {
    var self = this;
    var workingMaps = this.getReactions(channel);

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
                var timerId = "BasicReactions:" + vDev + ":" + item.vDevAction;

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
            self.controller.emit('core.error', "Unknown Basic reaction type ["+item.reaction+"]");
        }
    });
}
