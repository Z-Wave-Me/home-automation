/*** BasicReactions HA module *************************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013
Description: Configurable reactions on zway.basic events

******************************************************************************/

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

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

BasicReactions.prototype.getReactions = function (channel, level) {
	return this.map.filter(function (item) {
		return item.channel === channel && item.level === level;
	});
}

BasicReactions.prototype.onBasic = function (channel, level) {
	var self = this;
	var workingMaps = this.getReactions(channel, level);

	workingMaps.forEach(function (item) {
		Object.keys(item.reactions).forEach(function (reactionType) {
			var reaction = item.reactions[reactionType];

			if (!has_key(self.controller.devices, reaction.vDev)) {
				console.error("Error: Unknown vDev ID ["+reaction.vDev+"]");
				self.controller.emit('core.error', "Unknown vDev ID ["+reaction.vDev+"]");
				return;
			}

			var device = self.controller.devices[reaction.vDev];

			if ("tempOn" === reactionType) {
				var timerId = device.id + ":" + channel + ":" + level;

				if (!!self.activeTimers[timerId]) {
					clearTimeout(self.activeTimers[timerId]);
					delete self.activeTimers[timerId];
				} else {
					device.performCommand("on");
				};

				self.activeTimers[timerId] = setTimeout(function () {
					delete self.activeTimers[timerId];
					device.performCommand("off");
				}, reaction.timeout * 1000);
			} else {
				self.controller.emit('core.error', "Unknown basic reaction type ["+reactionType+"]");
			}
		});
	});
}
