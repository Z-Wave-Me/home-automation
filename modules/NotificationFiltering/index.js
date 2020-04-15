/*** NotificationFiltering Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2020
-----------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function NotificationFiltering (id, controller) {
	// Call superconstructor first (AutomationModule)
	NotificationFiltering.super_.call(this, id, controller);
}

inherits(NotificationFiltering, AutomationModule);

_module = NotificationFiltering;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

NotificationFiltering.prototype.init = function (config) {
	NotificationFiltering.super_.prototype.init.call(this, config);

	this.handler = this.onNotificationHandler();
	
	this.devices = [];
	this.logLevels = {};

	var self = this;

	config.channels.forEach(function(group) {
		var channel = group.channel;
		
		if (group.logLevel) {
			group.logLevel.split(',').forEach(function(logLevel) {
				if (!self.logLevels[logLevel]) self.logLevels[logLevel] = [];
				self.logLevels[logLevel].push(group.channel);
			});
		}
		
		group.devices.forEach(function(device) {
			var d, ml = false;
			
			if (device.dev_toggleButton) {
				d = device.dev_toggleButton;
			} else if (device.dev_switchControl) {
				d = device.dev_switchControl;
				ml = true;
			} else if (device.dev_switchBinary) {
				d = device.dev_switchBinary;
			} else if (device.dev_switchMultilevel) {
				d = device.dev_switchMultilevel;
				ml = true;
			} else if (device.dev_sensorBinary) {
				d = device.dev_sensorBinary;
			} else if (device.dev_sensorMultilevel) {
				d = device.dev_sensorMultilevel;
				ml = true;
			} else if (device.dev_sensorMultiline) {
				d = device.dev_sensorMultiline;
				ml = true;
			} else if (device.dev_fan) {
				d = device.dev_fan;
				ml = true;
			} else if (device.dev_doorLock) {
				d = device.dev_doorLock;
				ml = true;
			} else if (device.dev_thermostat) {
				d = device.dev_thermostat;
				ml = true;
			} else {
				return;
			}
			
			var comparator = null;
			if (ml) {
				if (d.dev_matchValue && d.dev_matchValue.dev_matchValueOperation && d.dev_matchValue.dev_matchValue !== 'all' && d.dev_matchValue.dev_matchValueOperand) {
					comparator = d.dev_matchValue.dev_matchValueOperation + d.dev_matchValue.dev_matchValueOperand;
				}
			} else {
				if (d.dev_matchValue && d.dev_matchValue !== 'all') {
					comparator = "=='" + d.dev_matchValue + "'";
				}
			}
			
			// each device can be present multiple times with different channels
			self.devices.push({
				"id": d.dev_select,
				"message": d.dev_message,
				"comparator": comparator,
				"channel": channel
			});
		});
	});

	this.controller.on('notifications.push', this.handler);
};

NotificationFiltering.prototype.stop = function () {
	NotificationFiltering.super_.prototype.stop.call(this);
	
	this.controller.off('notifications.push', this.handler);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

NotificationFiltering.prototype.onNotificationHandler = function () {
	var self = this;

	return function(notice) {
		var sendTo = [];
		var defaultMessage = notice.message.dev + " : " + notice.message.l;
		
		Object.keys(self.logLevels).forEach(function (level) {
			if (
				(level === "errors" && (notice.level === "critical"|| notice.level === "error")) ||
				(level === "notifications" && (notice.level == "notification" || notice.level == "device-info" || notice.level == "info")) ||
				(level === "warnings" && notice.level == "warning")
			) {
				sendTo.push({
					channel: self.logLevels[level],
					message: defaultMessage
				});
			}
		});
		
		self.devices.forEach(function (device) {
			if (notice.source == device.id) {
				var send = true;
				if (device.comparator !== null) {
					var value = parseFloat(notice.message.l);
					if (isNaN(value)) {
						if (eval("'" + notice.message.l + "'" + device.comparator) === false) {
							send = false;
						}
					} else {
						if (eval(value + device.comparator) === false) {
							send = false;
						}								
					}
				}
				
				if (send) {
					sendTo.push({
						channel: device.channel,
						message: device.message ? device.message : defaultMessage
					});
				}
			}
		});


		sendTo.forEach(function(to){
			self.controller.notificationChannelSend(to.channel, to.message);
		});
	};
};
