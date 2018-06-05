/*** Rules Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2018
-----------------------------------------------------------------------------
Author: Hans-Christian Göckeritz <hcg@zwave.eu>
Author: Niels Roche <nir@zwave.eu>
Author: Karsten Reichel <kar@zwave.eu>
Description:
	Bind actions on one device to other devices or scenes
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Rules(id, controller) {
	// Call superconstructor first (AutomationModule)
	Rules.super_.call(this, id, controller);

	var self = this;
	this.attachedList = [];
	this.reversActivated = false;

	this._testRule = function() { // wrapper to correct this and parameters in testRule
		self.testRule.call(self, null);
	}
}

inherits(Rules, AutomationModule);

_module = Rules;

/*"defaults": {
        "title": "__m_title__",
        "description": "__m_descr__",
        "simple": {
            "triggerEvent": {},
            "triggerDelay": 0,
            "targetElements": [],
            "sendNotifications": [],
            "reverseDelay": 0
        },
        "advanced": {
            "active": false,
            "triggerScenes" : [],
            "triggerDelay": 0,
            "logicalOperator" : "and",
            "tests" : [],
            "targetElements": [],
            "sendNotifications": [],
            "reverseDelay": 0,
            "triggerOnDevicesChange" : true
        },
        "reverse": false
    }*/

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Rules.prototype.init = function(config) {
	Rules.super_.prototype.init.call(this, config);

	var self = this,
		ifElement = self.config.simple.triggerEvent,
		/*
		color als trigger??
		{
		    deviceId: '',
		    deviceType: '',
		    level: '', //on, off, open, close, color, level
		    operator: <, = , > ,''
		}
		*/
		doReverse = self.config.reverse,
		advancedActive = self.config.advanced.active;
	triggered = 0;

	this.handlerLevel = function(sDev) {
		var operator = ifElement.operator || null,
			ifLevel = ifElement.level,
			ifType = ifElement.deviceType,
			check = false,
			value = sDev.get("metrics:level"),
			simple = self.config.simple;

		// - IF-THEN-PART
		if (!!operator && ifLevel) {
			check = self.op(value, operator, ifLevel);
		} else if (ifType === 'switchRGBW') {
			check = _.isEqual(sDev.get("metrics:color"), ifLevel);
		}

		var triggerTimeout = self.getConfigTimeout(simple.triggerDelay);
		var reverseTimeout = self.getConfigTimeout(simple.reverseDelay);

		if (check || value === ifLevel || sDev.get('deviceType') === 'toggleButton') {

			this.simpleTriggerTimer = setTimeout(function() {

				/*
				{
				    deviceId: '',
				    deviceType: '',
				    level: '', / color: { r: 0, g: 0, b: 0}, on, off, open, close, color
				    reverseLevel: '',
				    sendAction: true / false >> don't do this if level is already
				}
				*/

				// do action for all target devices 
				simple.targetElements.forEach(function(el) {
					self.shiftDevice(el);
				});

				simple.sendNotifications.forEach(function(notification) {
					self.sendNotification(notification, simple.triggerEvent, simple.targetElements);
				});

				self.reversActivated = true;
			}, triggerTimeout);
		} else if (doReverse && !check && self.reversActivated) {
			this.simpleReverseTimer = setTimeout(function() {
				self.performReverse(self.config.simple.targetElements);
			}, reverseTimeout);
		}
	};

	if (advancedActive) { // - LOGICAL-RULES-PART
		this.expertTriggerEventRule();
	}

	// Setup metric update event listener
	if (!advancedActive && ifElement && ifElement.deviceId) {
		self.controller.devices.on(ifElement.deviceId, 'change:metrics:level', this.handlerLevel);
	}
};

Rules.prototype.stop = function() {
	var self = this;

	if (this.config.advanced.active) {
		if (this.config.advanced.triggerScenes) {
			this.config.advanced.triggerScenes.forEach(function(scene) {
				self.attachDetach(scene, false);
			});
		}

		// testType ... switchBinary, switchMultilevel, switchRGBW, doorlock, switchControl, time, sensorDiscrete, nested
		// nested testType ... switchBinary, switchMultilevel, switchRGBW, doorlock, switchControl, time, sensorDiscrete

		this.config.advanced.tests.forEach(function(test) {
			switch (test.type) {
				case 'switchBinary':
				case 'switchMultilevel':
				case 'sensorBinary':
				case 'sensorMultilevel':
				case 'switchRGBW':
				case 'doorlock':
				case 'switchControl':
				case 'toggleButton':
				case 'sensorDiscrete':
				case 'thermostat':
					self.attachDetach(test, false);
					break;
				case 'nested':
					test.tests.forEach(function(xtest) {
						self.attachDetach(xtest, false);
					});
					break;
				case 'time':
					break;
				default:
					break;
			}
		});

		this.attachedList = [];

	} else {
		// remove event IfElement listener
		self.controller.devices.off(self.config.simple.triggerEvent.deviceId, 'change:metrics:level', self.handlerLevel);
	}

	if (this.simpleReverseTimer) {
		clearTimeout(this.simpleReverseTimer);
		this.simpleReverseTimer = undefined;
	}

	if (this.advancedReverseTimer) {
		clearTimeout(this.advancedReverseTimer);
		this.advancedReverseTimer = undefined;
	}

	if (this.simpleTriggerTimer) {
		clearTimeout(this.simpleTriggerTimer);
		this.simpleTriggerTimer = undefined;
	}

	if (this.advancedTriggerTimer) {
		clearTimeout(this.advancedTriggerTimer);
		this.advancedTriggerTimer = undefined;
	}

	this.reversActivated = false;

	Rules.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

Rules.prototype.expertTriggerEventRule = function() {
	var self = this;

	// testType ... switchBinary, switchMultilevel, switchRGBW, doorlock, switchControl, time, sensorDiscrete, nested
	// nested testType ... switchBinary, switchMultilevel, switchRGBW, doorlock, switchControl, time, sensorDiscrete

	this.config.advanced.tests.forEach(function(test) {
		switch (test.type) {
			case 'switchBinary':
			case 'switchMultilevel':
			case 'sensorBinary':
			case 'sensorMultilevel':
			case 'switchRGBW':
			case 'doorlock':
			case 'switchControl':
			case 'toggleButton':
			case 'sensorDiscrete':
			case 'thermostat':
				/*
				    test = {
				        type: 'xxx',
				        deviceId: 'xxx',
				        level: 'xxx',
				        operator: '=', '!=', '<', '>', '<=', '>='
				    },
				    time = {
				        type: 'time',
				        level: 'xxx',
				        testOperator: '<=', '>='
				    }
				*/
				self.attachDetach(test, true);
				break;
			case 'nested':
				/*  
				nested = {
				    type: 'nested',
				    logicalOperator: 'and' // 'or'
				    tests: [{
				            type: 'xxx'
				            deviceId: 'xxx'
				            level: 'xxx'
				            testOperator: '=', '!=', '<', '>', '<=', '>='
				        },{
				            type: 'aaa'
				            deviceId: 'aaa'
				            level: 'aaa'
				            testOperator: '=', '!=', '<', '>', '<=', '>='
				        }
				    ]
				}     
				*/
				test.tests.forEach(function(xtest) {
					self.attachDetach(xtest, true);
				});
				break;
			case 'time':
				break;
			default:
				break;
		}
	});

	// TODO add sensorDiscrete as trigger
	this.config.advanced.triggerScenes.forEach(function(scene) {
		self.attachDetach(scene, true);
	});
};

// LogicalRuleMethods
Rules.prototype.attachDetach = function(test, attachOrDetach) {
	if (this.config.advanced.triggerOnDevicesChange === false) { // this condition is used to allow empty triggerOnDevicesChange if old LogicalRules is used
		return;
	}

	if (attachOrDetach) {
		if (this.attachedList.indexOf(test.deviceId) === -1) {
			this.attachedList.push(test.deviceId);
			this.controller.devices.on(test.deviceId, "change:metrics:level", this._testRule);
			this.controller.devices.on(test.deviceId, "change:metrics:change", this._testRule); //switchControl
		}
	} else {
		this.controller.devices.off(test.deviceId, "change:metrics:level", this._testRule);
		this.controller.devices.off(test.deviceId, "change:metrics:change", this._testRule); //switchControl
	}
};

Rules.prototype.testRule = function(tree) {
	var self = this,
		res = null,
		topLevel = !tree,
		self = this,
		langFile = this.loadModuleLang(),
		doReverse = this.config.reverse || false,
		triggerTimeout = this.getConfigTimeout(self.config.advanced.triggerDelay),
		reverseTimeout = this.getConfigTimeout(self.config.advanced.reverseDelay);

	// if tests are false check if advanced is active
	if (!!!tree) {
		tree = this.config.advanced;
	}

	// loop through all tests and proof conditions
	if (_.contains(["and", "or"], tree.logicalOperator)) {
		res = self.runTests[tree.logicalOperator].call(self, tree);
	}

	if (topLevel && res) {
		this.advancedTriggerTimer = setTimeout(function() {
			tree.targetElements.forEach(function(el) {
				self.shiftDevice(el);
			});

			tree.sendNotifications.forEach(function(notification) {
				self.sendNotification(notification, tree.tests, tree.targetElements);
			});

			self.reversActivated = true;

		}, triggerTimeout);
	} else if (doReverse && !res && self.reversActivated) {
		this.advancedReverseTimer = setTimeout(function() {
			self.performReverse(tree.targetElements);
		}, reverseTimeout);
	}

	return res;
};

Rules.prototype.runTests = {
	"and": function(tree) {
		var res = true,
			self = this;

		tree.tests.forEach(function(test) {
			var vDev = test.type !== 'nested' ? self.controller.devices.get(test.deviceId) : null,
				level = !!vDev ? vDev.get("metrics:level") : undefined;

			switch (test.type) {
				case 'doorlock':
				case 'switchBinary':
				case 'sensorBinary':
				case 'sensorDiscrete':
					res = res && (level === test.level);
					break;
				case 'thermostat':
				case 'switchMultilevel':
				case 'sensorMultilevel':
					res = res && self.op(level, test.operator, test.level);
					break;
				case 'switchRGBW':
					res = res && _.isEqual(vDev.get('metrics:color'), test.level);
					break;
				case 'toggleButton':
				case 'switchControl':
					res = res && self.compareSwitchControl(vDev, test.level);
					break;
				case 'time':
					res = res && self.compareTime(test.level, test.operator);
					break;
				case 'nested':
					res = res && self.testRule(test);
					break;
				default:
					break;
			}
		});

		return res;
	},
	"or": function(tree) {
		var res = false,
			self = this;

		tree.tests.forEach(function(test) {
			var vDev = test.type !== 'nested' ? self.controller.devices.get(test.deviceId) : null,
				level = !!vDev ? vDev.get("metrics:level") : undefined;

			switch (test.type) {
				case 'doorlock':
				case 'switchBinary':
				case 'sensorBinary':
				case 'sensorDiscrete':
					res = res || (level === test.level);
					break;
				case 'thermostat':
				case 'switchMultilevel':
				case 'sensorMultilevel':
					res = res || self.op(level, test.operator, test.level);
					break;
				case 'switchRGBW':
					res = res || _.isEqual(vDev.get('metrics:color'), test.level);
					break;
				case 'toggleButton':
				case 'switchControl':
					res = res || self.compareSwitchControl(vDev, test.level);
					break;
				case 'time':
					res = res || self.compareTime(test.level, test.operator);
					break;
				case 'nested':
					res = res || self.testRule(test);
					break;
				default:
					break;
			}
		});

		return res;
	}
}

Rules.prototype.performReverse = function(targetElements) {
	var self = this;

	if (targetElements && targetElements.length > 0) {
		targetElements.forEach(function(el) {
			if (el.reverseLevel !== null) {
				self.shiftDevice(el, true);
				/*var vDev = self.controller.devices.get(el.deviceId),
					id = el.deviceId,
					type = vDev ? vDev.get('deviceType') : '';

				if (vDev && !!vDev) {
					var set = self.executeActions(el.sendAction, vDev, el.reverseLevel);
					if (set) {
						self.setNewDeviceState(vDev, type, el.reverseLevel);
					}
					self.reversActivated = false;
				}*/
				self.reversActivated = false;
			}
		});
		self.reversActivated = false;
	}
};

Rules.prototype.sendNotification = function(notification, conditions, actions) {
	var notificationType = '',
		notificationMessage = '';

	if (notification.target && notification.target !== '') {
		notificationType = notification.target.search('@') > -1 ? 'mail.notification' : 'push.notification';
		notificationMessage = !notification.message ? 'Condition: ' + JSON.stringify(conditions) + ' Actions: ' + JSON.stringify(actions) : notification.message;

		this.addNotification(notificationType, notificationMessage + ' => ' + notification.target, notification.target);
	}
};

Rules.prototype.getConfigTimeout = function(configTimeout) {
	return !!!configTimeout ? 0 : Math.floor(configTimeout * 1000); // !!! > proof for undefined and null
};