/*** HazardNotification Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2015
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
        Karsten Reichel <kar@zwave.eu>
        Michael Hensche <mh@zwave.eu>
Description:
    Filters all water sensors, fire sensors and creates a virtual device to monitor and control them together.
******************************************************************************/
// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------
function HazardNotification(id, controller) {
	// Call superconstructor first (AutomationModule)
	HazardNotification.super_.call(this, id, controller);
}

inherits(HazardNotification, AutomationModule);

_module = HazardNotification;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

HazardNotification.prototype.init = function(config) {
	HazardNotification.super_.prototype.init.call(this, config);

	var self = this,
		filteredSensorsFromDevices = [],
		hazardSensorMetrics = [],
		item = {};

	this.vDev = null;

	if (self.config.triggerEvent.length > 0 && !self.config.transformed) {
		var new_triggerEvents = [];

		/* transform each single entry to the new format: switches, thermostats, dimmers, locks, scenes 
		    {
		        deviceId: '',
		        deviceType: '',
		        level: '', // color: { r: 0, g: 0, b: 0}, on, off, open, close, color
		        sendAction: true || false >> don't do this if level is already triggered
		    }
		*/
		self.config.triggerEvent.forEach(function(entry) {
			vDev = self.controller.devices.get(entry.deviceId);

			new_triggerEvents.push({
				deviceId: entry.deviceId,
				deviceType: vDev ? vDev.get('deviceType') : '',
				level: entry.status && entry.status != 'level' ? entry.status : (entry.status === 'level' && entry.level ? entry.level : 0),
				sendAction: entry.sendAction || false
			});
		});

		// overwrite config devices list
		self.config.triggerEvent = _.uniq(new_triggerEvents);
		self.config.transformed = true;

		//save into config
		self.saveConfig();
	}

	// update vDev attributes (water and fire sensors)
	self.updateAttributes = function(dev) {
		var hazardSensors = [],
			sensor = [],
			indx = null;

		hazardSensors = self.vDev.get('metrics:sensors');

		sensor = hazardSensors.filter(function(sensor) {
			return sensor.id === dev.get('id');
		});

		if (sensor[0]) {
			// update sensor metrics
			sensor[0].metrics = dev.get('metrics');
		}
	};

	// add sensors to vDev (after server startup)
	self.updateIfHazardSensorsAreCreated = function(dev) {
		var indx = self.config.sensors.indexOf(dev.id);

		if (indx > -1 && hazardSensorMetrics.map(function(e) {
				return e.id;
			}).indexOf(dev.id) === -1) {

			if (filteredSensorsFromDevices.indexOf(dev) === -1) {
				filteredSensorsFromDevices.push(dev);
			}

			item = {
				id: dev.id,
				deviceType: dev.get('deviceType'),
				metrics: dev.get('metrics'),
				hasHistory: dev.get('hasHistory'),
				updateTime: dev.get('updateTime')
			};

			hazardSensorMetrics.push(item);

			// listen to sensor changes
			self.controller.devices.on(dev.id, 'change:[object Object]', self.updateAttributes);

			// setup arm mode (reinitialize vDev)
			if (self.vDev.get('metrics:state') === 'armed') {
				if (dev.get('metrics:level') === 'on') {
					self.setAlert();
				}

				// listen to sensor changes
				self.controller.devices.on(dev.id, 'change:metrics:level', self.throwAlert);
			}
		}
	};

	// activate armed modus
	self.setupArmed = function() {
		// if it is still alert set alert mode 
		if (self.getSensorLevels().length > 0 && self.getSensorLevels().indexOf('on') !== -1) {
			self.setAlert();
		} else {
			self.vDev.set('metrics:level', 'OK');
			self.vDev.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/HazardNotification/ok.png');
		}

		// listen to sensor changes
		filteredSensorsFromDevices.forEach(function(dev) {
			self.controller.devices.on(dev.id, 'change:metrics:level', self.throwAlert);
		});
	};

	// listener - what to do if sensors state has changed 
	self.throwAlert = function(dev) {

		//set alert mode
		if (dev.get('metrics:level') === 'on' && self.vDev.get('metrics:level') !== 'ALERT') {
			self.setAlert();
		}

		//set back armed mode if alert is OK and device is not disarmed
		if (dev.get('metrics:level') === 'off' &&
			self.vDev.get('metrics:level') === 'ALERT' &&
			self.getSensorLevels().length > 0 &&
			self.getSensorLevels().indexOf('on') === -1 &&
			self.vDev.get('metrics:state') !== 'disarmed') {

			self.vDev.set('metrics:level', 'OK!');
			var icon = config.hazardType == "fire" ? "fire_warning.png" : "leakage_warning.png";
			self.vDev.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/HazardNotification/' + icon);

			//send notification: OK
			//console.log('Leakage Protection state is "OK". Still armed ...');
			//stop sending notifications
			//console.log('Stop sending notifications ...');

			self.triggerNotification('revert');

			if (self.sendInterval) {
				//console.log('Stop - Clear send ...');
				clearInterval(self.sendInterval);
				self.sendInterval = undefined;
			}
		}
	};

	// set vDev to alert mode
	self.setAlert = function() {
		var icon = config.hazardType == "fire" ? "fire_alarm.png" : "leakage_alarm.png";
		self.vDev.set('metrics:level', 'ALERT');
		self.vDev.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/HazardNotification/' + icon);

		// trigger reaction
		self.triggerEvents();

		//start sending notifications
		//console.log('Alert detected. Start sending notifications ...');

		if (!self.sendInterval) {
			self.triggerNotification('alarm');
			self.sendInterval = setInterval(function() {
				//console.log('Send ...');
				self.triggerNotification('alarm');
			}, parseInt(config.notificationsInterval, 10) * 1000);
		}
	};

	self.triggerNotification = function(type) {
		_.forEach(config.sendNotifications, function(notification) {
			if (type == notification.firedOn) {
				var notificationType = '',
					notificationMessage = '';

				if (notification.target && notification.target !== '') {
					notificationType = notification.target.search('@') > -1 ? 'mail.notification' : 'push.notification';
					notificationMessage = !notification.message ? fallbackMessage : notification.message;

					self.addNotification(notificationType, notificationMessage, notification.target);
				}
			}
		});
	};

	self.triggerEvents = function() {
		_.forEach(config.triggerEvent, function(event) {
			/*var vDev = self.controller.devices.get(event.deviceId),
			    lvl = event.status == "lvl" ? event.level : event.status,
			    set = event.sendAction ? self.executeActions(event.sendAction, vDev, lvl) : true;
			if (vDev && set) {
			    self.setNewDeviceState(vDev, lvl);
			}*/

			self.shiftDevice(event);
		});
	};

	// listener - set vDev level back to OK if device is disarmed and sensor levels are all 'off'
	self.onPoll = function() {
		if (self.getSensorLevels().indexOf('on') === -1 && self.vDev) {
			self.vDev.set('metrics:level', 'OK');
			self.vDev.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/HazardNotification/ok.png');
			self.removePolling();
		}
	};

	// remove polling after disarm and sensor levels are ok
	self.removePolling = function() {

		if (self.timer) {
			//console.log('Clear check ...');
			clearInterval(self.timer);
			self.timer = undefined;
		}

		if (self.sendInterval) {
			//console.log('Clear send ...');
			clearInterval(self.sendInterval);
			self.sendInterval = undefined;
		}
	};

	self.checkState = function() {
		if (!self.timer) {
			self.timer = setInterval(function() {
				//console.log('Do check ...');
				self.onPoll();
			}, 10 * 1000);
		}
	};

	// get sensors from devices
	filteredSensorsFromDevices = self.controller.devices.filter(function(dev) {
		return self.config.sensors.indexOf(dev.id) > -1;
	});

	// create vDev metrics with sensor values
	filteredSensorsFromDevices.forEach(function(dev) {

		item = {
			id: dev.id,
			deviceType: dev.get('deviceType'),
			metrics: dev.get('metrics'),
			hasHistory: dev.get('hasHistory'),
			updateTime: dev.get('updateTime')
		};

		hazardSensorMetrics.push(item);

		// listen to sensor changes
		self.controller.devices.on(dev.id, 'change:[object Object]', self.updateAttributes);
	});

	var metr = self.controller.vdevInfo["HazardNotification_" + self.id] && self.controller.vdevInfo["HazardNotification_" + self.id].metrics ? self.controller.vdevInfo["HazardNotification_" + self.id].metrics : null,
		icon = config.hazardType == "fire" ? "fire_ok.png" : "leakage_ok.png";

	// create vDev
	self.vDev = self.controller.devices.create({
		deviceId: "HazardNotification_" + self.id,
		defaults: {
			deviceType: 'sensorMultiline',
			metrics: {
				multilineType: 'protection',
				title: self.getInstanceTitle(),
				icon: '/ZAutomation/api/v1/load/modulemedia/HazardNotification/' + icon,
				level: !!metr && metr.level ? metr.level : 'OK',
				state: !!metr && metr.state ? metr.state : 'disarmed'
			}
		},
		overlay: {
			metrics: {
				title: self.getInstanceTitle(),
				sensors: hazardSensorMetrics
			}
		},
		handler: function(command) {
			var cutDevId = [],
				cutIdNumbers = [],
				nodId = [];
			// arm
			if (command === 'arm' && hazardSensorMetrics.length > 0) {
				// set vDev state to armed
				self.vDev.set('metrics:state', 'armed');

				// remove polling
				self.removePolling();

				// set up arm mode
				self.setupArmed();

				self.triggerNotification('on');
			}
			// disarm
			if (command === 'disarm' && hazardSensorMetrics.length > 0) {
				// set vDev state to disarmed
				self.vDev.set('metrics:state', 'disarmed');

				// set up cron handler checking for alert
				if (self.getSensorLevels().indexOf('on') !== -1) {

					self.checkState();
				} else {
					self.vDev.set('metrics:level', 'OK');
					self.vDev.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/HazardNotification/' + icon);
				}

				//stop sending notifications
				//console.log('Disarmed. Stop sending notifications ...');

				self.triggerNotification('off');

				if (self.sendInterval) {
					//console.log('Disarmed - Clear send ...');
					clearInterval(self.sendInterval);
					self.sendInterval = undefined;
				}

				// remove listener of sensor changes
				filteredSensorsFromDevices.forEach(function(dev) {
					self.controller.devices.off(dev.id, 'change:metrics:level', self.throwAlert);
				});

				//if ALERT send basic off to each water anf fire detector
				if (self.vDev.get('metrics:level') === 'ALERT') {
					//get correct node id
					self.config.sensors.forEach(function(id) {
						cutDevId = id.split('_');
						cutIdNumbers = cutDevId[2].split('-');

						if (nodId.indexOf(cutIdNumbers[0]) === -1) {
							nodId.push(cutIdNumbers[0]);
						}
					});

					nodId.forEach(function(node) {
						// send via z-way api
						if (zway.devices[node].instances[0].commandClasses[32]) {
							zway.devices[node].instances[0].commandClasses[32].Set(0);
						}
					});
				}
			}

			//update
			if (command === 'update' && hazardSensorMetrics.length > 0) {
				filteredSensorsFromDevices.forEach(function(sensor) {
					try {
						sensor.performCommand('update');
					} catch (e) {
						self.controller.addNotification('device-info', 'Update has failed. Error:' + e, 'device-status', sensor.id);
					}
				});
			}
		},
		moduleId: self.id
	});

	// setup arm mode (reinitialize vDev)
	if (self.vDev.get('metrics:state') === 'armed') {
		self.setupArmed();
	}

	// refresh/create virtual device if sensors are created (after restart)
	self.controller.devices.on('created', self.updateIfHazardSensorsAreCreated);

};

HazardNotification.prototype.stop = function() {
	var self = this;

	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
		this.vDev = null;
	}

	this.controller.devices.filter(function(dev) {
		return self.config.sensors.indexOf(dev.id) > -1;
	}).forEach(function(dev) {
		self.controller.devices.off(dev.id, 'change:[object Object]', self.updateAttributes);
		self.controller.devices.off(dev.id, 'change:metrics:level', self.throwAlert);
	});

	this.controller.devices.off('created', self.updateIfHazardSensorsAreCreated);

	// remove polling
	this.removePolling();

	HazardNotification.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

HazardNotification.prototype.getSensorLevels = function() {
	var self = this;

	return self.vDev.get('metrics:sensors').map(function(sensor) {
		return sensor.metrics.level;
	});
};

/*// compare old and new level to avoid unnecessary updates
HazardNotification.prototype.newValueNotEqualsOldValue = function (vDev, valNew) {
    if (vDev && !!vDev) {
        var devType = vDev.get('deviceType'),
            vO = '';
        vN = _.isNaN(parseFloat(valNew)) ? valNew : parseFloat(valNew);

        switch (devType) {
            case 'switchRGBW':
                vO = typeof vN !== 'string' ? vDev.get('metrics:color') : vDev.get('metrics:level');

                if (valNew !== 'string') {
                    return _.isEqual(vO, vN);
                }
            case 'switchControl':
                if (_.contains(['on', 'off'], vN) || _.isNumber(vN)) {
                    vO = vDev.get('metrics:level');
                } else {
                    vO = vDev.get('metrics:change');
                }
            default:
                vO = vDev.get('metrics:level');
        }
        return vO !== vN;
    }
};

HazardNotification.prototype.executeActions = function (compareLevelsFirst, vDev, targetValue) {
    return (!compareLevelsFirst || (compareLevelsFirst && this.newValueNotEqualsOldValue(vDev, targetValue)));
};

HazardNotification.prototype.setNewDeviceState = function (vDev, type, new_level) {
    if (vDev && !!vDev) {
        switch (type) {
            case 'doorlock':
            case 'switchBinary':
                vDev.performCommand(new_level);
                break;
            case 'switchMultilevel':
            case 'thermostat':
                _.contains(['on', 'off'], new_level) ? vDev.performCommand(new_level) : vDev.performCommand("exact", {
                    level: new_level
                });
                break;
            case 'switchRGBW':
                if (_.contains(["on", "off"], new_level)) {
                    vDev.performCommand(new_level);
                } else {
                    vDev.performCommand("exact", {
                        red: new_level.red,
                        green: new_level.green,
                        blue: new_level.blue
                    });
                }
                break;
            case 'switchControl':
                if (_.contains(["on", "off"], new_level)) {
                    vDev.performCommand(new_level);
                } else if (_.contains(["upstart", "upstop", "downstart", "downstop"], new_level)) {
                    vDev.performCommand("exact", {
                        change: new_level
                    });
                } else {
                    vDev.performCommand("exact", {
                        level: new_level
                    });
                }
                break;
            case 'toggleButton':
                vDev.performCommand('on');
                break;
            default:
                vDev.performCommand(new_level);
        }
    }
};*/