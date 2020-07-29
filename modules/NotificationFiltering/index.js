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
	
	var self = this;

	this.normalizeConfig();
	this.readConfig();

	this.handler = function(notice) {
		self.onNotificationHandler(notice);
	};
	this.controller.on('notifications.push', this.handler);
	
	// automaitcally delete and add default notification for devices
	if (this.config.autogenOnDeviceListUpdate) {
		this.handleDeviceListUpdate = function(params) {
			self.onDeviceListUpdate(params);
		};
		this.controller.on('profile.deviceListUpdated', this.handleDeviceListUpdate);
	}
};

NotificationFiltering.prototype.stop = function () {
	NotificationFiltering.super_.prototype.stop.call(this);
	
	if (this.config.autogenOnDeviceListUpdate) {
		this.controller.off('profile.deviceListUpdated', this.handleDeviceListUpdate);
	}
	this.controller.off('notifications.push', this.handler);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

NotificationFiltering.prototype.onNotificationHandler = function (notice) {
	var self = this;

	if (!notice || !notice.message) return;
	
	var sendTo = [];
	var defaultMessage = typeof notice.message === 'string' ? notice.message : (notice.message.dev + " : " + notice.message.l);
	
	Object.keys(self.logLevels).forEach(function (level) {
		if (
			(level === "errors" && (notice.level === "critical"|| notice.level === "error")) ||
			(level === "notifications" && (notice.level == "notification" || notice.level == "device-info" || notice.level == "info")) ||
			(level === "warnings" && notice.level == "warning")
		) {
			self.logLevels[level].forEach(function(ch) {
				sendTo.push({
					type: ch.type,
					user: ch.user,
					channel: ch.channel,
					message: defaultMessage
				});
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
					type: device.type,
					user: device.user,
					channel: device.channel,
					message: device.message ? device.message : defaultMessage
				});
			}
		}
	});

	sendTo.forEach(function(to) {
		if (to.type === "user") {
			self.controller.notificationUserChannelsSend(to.user, to.message);
		} else if (to.type === "channel") {
			self.controller.notificationChannelSend(to.channel, to.message);
		} else {
			self.controller.notificationAllChannelsSend(to.message);
		}
	});
};

NotificationFiltering.prototype.normalizeConfig = function() {
	var self = this;
	
	if (this.config.normalizeRules) {
		var users = _.compact(_.uniq(this.config.rules.filter(function(rule) { return rule.user && rule.recipient_type === "user"; }).map(function(rule) { return rule.user; })));
		var channels = _.compact(_.uniq(this.config.rules.filter(function(rule) { return rule.channel && rule.recipient_type === "channel"; }).map(function(rule) { return rule.channel; })));
		
		var newRules = [];
		
		users.forEach(function(user) {
			var userRules = self.config.rules.filter(function(rule) { return rule.user === user; });
			
			var logLevel = _.uniq(_.compact(_.flatten(userRules.map(function(rule) { return rule.logLevel ? rule.logLevel.split(',') : [""]; })))).join(',');
			var devices = [];
			
			userRules.forEach(function(rule) {
				rule.devices.forEach(function(dev) {
					devices = devices.concat(dev);
				});
			});
			newRules.push({
				recipient_type: "user",
				user: user,
				logLevel: logLevel,
				devices: devices
			});
		});
		
		channels.forEach(function(channel) {
			var channelRules = self.config.rules.filter(function(rule) { return rule.channel === channel; });
			
			var logLevel = _.uniq(_.compact(_.flatten(channelRules.map(function(rule) { return rule.logLevel ? rule.logLevel.split(',') : [""]; })))).join(',');
			var devices = [];
			
			channelRules.forEach(function(rule) {
				rule.devices.forEach(function(dev) {
					devices = devices.concat(dev);
				});
			});
			newRules.push({
				recipient_type: "channel",
				channel: channel,
				logLevel: logLevel,
				devices: devices
			});
		});
		
		var allRules = this.config.rules.filter(function(rule) { return rule.recipient_type === "all"; });
		if (allRules.length) {
			var logLevel = _.uniq(_.compact(_.flatten(allRules.map(function(rule) { return rule.logLevel ? rule.logLevel.split(',') : [""]; })))).join(',');
			var devices = [];
			
			allRules.forEach(function(rule) {
				rule.devices.forEach(function(dev) {
					devices = devices.concat(dev);
				});
			});
			newRules.push({
				recipient_type: "all",
				logLevel: logLevel,
				devices: devices
			});
		}
		
		this.config.rules = newRules;
	}
	this.saveConfig();
};

NotificationFiltering.prototype.readConfig = function () {
	var self = this;

	this.devices = [];
	this.logLevels = {};
	
	// normalize rules (keep each user/channel/all only once)
	// TODO
	
	// parse rules
	this.config.rules.forEach(function(rule) {
		var recipientType = rule.recipient_type,
		    user = rule.user,
		    channel = rule.channel;
		
		if (rule.logLevel) {
			rule.logLevel.split(',').forEach(function(logLevel) {
				if (!self.logLevels[logLevel]) self.logLevels[logLevel] = [];
				self.logLevels[logLevel].push({type: recipientType, user: user, channel: rule.channel});
			});
		}
		
		rule.devices.forEach(function(device) {
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
				"type": recipientType,
				"user": user,
				"channel": channel
			});
		});
	});
};

NotificationFiltering.prototype.addRule = function(userId, deviceId, deviceType, matchValueOperation, matchValue) {
	var dev = {};
	
	dev["dev_filter"] = deviceType;
	dev[deviceType] = {};
	dev[deviceType]["dev_select"] =  deviceId;
	if (matchValueOperation) dev[deviceType]["dev_matchValueOperation"] = matchValueOperation;
	if (matchValue) dev[deviceType]["dev_matchValue"] = matchValue;
	
	console.log("Adding rule for user " + userId + " for device " + deviceId);
	this.config.rules.push({
		recipient_type: "user",
		user: userId,
		devices: [dev]
	});
};

NotificationFiltering.prototype.removeUserDeviceRules = function(userId, deviceId) {
	var self = this;
	
	this.config.rules.forEach(function(rule) {
		if (rule.recipient_type === "user" && rule.user === userId || rule.recipient_type === "channel" && self.controller.getNotificationChannel(rule.channel) && self.controller.getNotificationChannel(rule.channel).user === userId) {
			console.log("Removing rule for user " + userId + " for device " + deviceId);
			rule.devices = rule.devices.filter(function(dev) { return dev[dev["dev_filter"]]["dev_select"] !== deviceId });
		}
	});
	// clean empty
	this.config.rules = this.config.rules.filter(function(rule) { return rule.devices.length || rule.logLevel });
};

NotificationFiltering.prototype.onDeviceListUpdate = function (params) {
	var self = this;
	
	var userId = params.profile.id;
	
	params.deleted.forEach(function(id) {
		self.removeUserDeviceRules(userId, id);
	});
	
	params.added.forEach(function(id) {
		var dt = self.controller.devices.get(id).get('deviceType'),
		    pt = self.controller.devices.get(id).get('probeType');
		
		// Notify on alarm trigger
		if (
			dt === "sensorBinary" && ["general_purpose", "smoke", "co", "flood", "door-window", "tamper", "motion"].indexOf(pt) > -1 ||
			dt === "sensorBinary" && ["alarmSensor_general_purpose", "alarmSensor_smoke", "alarmSensor_co", "alarmSensor_coo", "alarmSensor_heat", "alarmSensor_flood", "alarmSensor_door", "alarmSensor_burglar", "alarmSensor_power", "alarmSensor_system", "alarmSensor_emergency", "alarmSensor_clock"].indexOf(pt) > -1 ||
			dt === "sensorBinary" && ["alarm_smoke", "alarm_co", "alarm_coo", "alarm_heat", "alarm_flood", "alarm_burglar", "alarm_power", "alarm_system", "alarm_emergency", "alarm_clock", "siren", "gas"].indexOf(pt) > -1
		) {
			self.addRule(userId, id, "dev_sensorBinary", null, "on");
		}
		
		// Notify on siren on
		if (dt === "switchBinary" && pt === "siren") {
			self.addRule(userId, id, "dev_switchBinary", null, "on");
		}
		
		
		// Notify on valve open/close
		if (dt === "switchBinary" && pt === "valve") {
			self.addRule(userId, id, "dev_switchBinary", null, "all");
		}
		
		// Notify on doorlock open/close
		if (dt === "switchBinary" && pt === "doorlock") {
			self.addRule(userId, id, "dev_doorLock", null, "all");
		}
		
		// Notify on low battery
		if (dt === "sensorMultilevel" && pt === "battery" || dt === "battery") {
			self.addRule(userId, id, "dev_sensorMultilevel", "<", 10);
		}
	});
	
	this.normalizeConfig();
	this.readConfig();
};
