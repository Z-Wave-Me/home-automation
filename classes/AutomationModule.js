/*** Z-Way HA Automation module base class ************************************

Version: 1.0.0
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013

******************************************************************************/

AutomationModule = function(id, controller) {
	var self = this;

	this.id = id;
	this.controller = controller;
	this.meta = this.getMeta();

	this.actions = {};
	this.actionFuncs = {};
	this.metrics = {};

	this.config = {};
};

AutomationModule.prototype.defaultConfig = function(config) {
	var result = {},
		self = this;

	if (this.meta.hasOwnProperty("defaults") && _.isObject(this.meta.defaults)) {
		Object.keys(_.omit(this.meta.defaults, 'title', 'description')).forEach(function(key) {
			result[key] = self.meta.defaults[key];
		});
	}

	if (!!config) {
		Object.keys(config).forEach(function(key) {
			result[key] = config[key];
		});
	}

	return result;
};

AutomationModule.prototype.init = function(config) {
	console.log("--- Starting module " + this.meta.defaults.title);
	if (!!config) {
		this.saveNewConfig(config);
	} else {
		this.loadConfig();
	}
};

AutomationModule.prototype.saveNewConfig = function(config) {
	if (!!config) {
		this.config = this.defaultConfig(config);
		this.saveConfig();
	}
};

AutomationModule.prototype.stop = function() {
	console.log("--- Stopping module " + this.meta.defaults.title);
};

AutomationModule.prototype.loadConfig = function() {
	var self = this;
	var cfg = loadObject("cfg" + this.id);
	if ("object" === typeof cfg) {
		Object.keys(cfg).forEach(function(key) {
			self.config[key] = cfg[key];
		});
	}
};

AutomationModule.prototype.saveConfig = function(config) {
	var that = this,
		index = this.controller.instances.indexOf(_.find(this.controller.instances, function(model) {
			return model.id === that.id;
		}));

	this.controller.instances[index].params = config || this.config;
	this.controller.saveConfig();
};

AutomationModule.prototype.getName = function() {
	return this.constructor.name;
};

// This method returns JSON representation
AutomationModule.prototype.toJSON = function() {
	return {
		module: this.getName(),
		id: this.id,
		config: this.config
	};
};

AutomationModule.prototype.runAction = function(actionId, args, callback) {
	// Run action function with actionId on instance if exists
	if (this.actionFuncs.hasOwnProperty(actionId)) {
		this.actionFuncs[actionId].call(this, args, callback);
	}
};

AutomationModule.prototype.getMeta = function() {
	if (!this.meta) {
		this.meta = this.controller.getModuleData(this.constructor.name);
		this.meta.id = this.constructor.name;
	}
	return this.meta;
};

AutomationModule.prototype.loadModuleJSON = function(filename) {
	return fs.loadJSON(this.meta.location + "/" + filename);
};

AutomationModule.prototype.getInstanceTitle = function() {
	var instanceId = this.id;

	var instanceTitle = this.controller.instances.filter(function(instance) {
		return instance.id === instanceId;
	});

	return instanceTitle[0] && instanceTitle[0].title ? instanceTitle[0].title : this.constructor.name + ' ' + instanceId;
};

AutomationModule.prototype.loadModuleLang = function() {
	return this.controller.loadModuleLang(this.getName());
};

AutomationModule.prototype.addNotification = function(severity, message, type) {
	this.controller.addNotification(severity, message, type, this.getName());
};

AutomationModule.prototype.prepareHTTPResponse = function(body) {
	var result = {},
		ret = {
			status: 500,
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
				"Access-Control-Allow-Headers": "Authorization",
				"Content-Type": "application/json",
				"Connection": "keep-alive"
			},
			body: {
				code: 500,
				message: "500 Something went wrong.",
				error: null,
				data: null
			}
		};

	return body ? _.extend(ret, {
		status: body.code ? body.code : ret.status,
		body: body
	}) : ret;
}

// ----------------------------------------------------------------------------
// --- Logical methods (Rules, Scenes, Schedules, HazardNotification)
// ----------------------------------------------------------------------------

/*	compare old and new level to avoid unnecessary updates

	vDev	[string]			// device object
	valNew	[string/number]		// device level like: {color: { r: 0, g: 0, b: 0}}, 'on', 'off', 'open', 'close', [level]
*/
AutomationModule.prototype.newValueNotEqualsOldValue = function(vDev, valNew) {
	if (vDev) {
		var vO = '';

		vN = _.isNaN(parseFloat(valNew)) ? valNew : parseFloat(valNew);

		switch (vDev.get('deviceType')) {
			case 'switchRGBW':

				vO = typeof vN !== 'string' ? vDev.get('metrics:color') : vDev.get('metrics:level');

				if (valNew !== 'string') {
					return !_.isEqual(vO, vN);
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
	} else {
		return false;
	}
};

/*
	set a new device state

	vDev		[string]			// device object
	new_level	[string/number]		// device level like: {color: { r: 0, g: 0, b: 0}}, 'on', 'off', 'open', 'close', [level]
*/
AutomationModule.prototype.setNewDeviceState = function(vDev, new_level) {
	if (vDev) {
		switch (vDev.get('deviceType')) {
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
						red: new_level.r,
						green: new_level.g,
						blue: new_level.b
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
};

/*
	execute a device action based on compareLevels flag

	compareLevels 	[boolean]	// flag if device level should be checked first before triggering the command
	vDev			[string]	// device object
	targetValue		[string]	// target value
*/
AutomationModule.prototype.executeActions = function(compareLevels, vDev, targetValue) {
	return (!compareLevels || (compareLevels && this.newValueNotEqualsOldValue(vDev, targetValue)));
};

/*
	simply compare two values with help of logical operators

	dval 	[string]	// device value that should be check against condition
	op		[string]	// operator for comparisation: '=', '<', '>', '<=', '>=', '!='
	val		[string]	// condition value
*/
AutomationModule.prototype.op = function(dval, op, val) {
	if (op === "=") {
		return dval === val;
	} else if (op === "!=") {
		return dval !== val;
	} else if (op === ">") {
		return dval > val;
	} else if (op === "<") {
		return dval < val;
	} else if (op === ">=") {
		return dval >= val;
	} else if (op === "<=") {
		return dval <= val;
	}

	return null; // error!!
};

/*
	simply compare switchControl level or changes

	vDev 		[object]	// device object
	targetValue	[string]	// target value that should be switched
*/
AutomationModule.prototype.compareSwitchControl = function(vDev, targetValue) {
	if (vDev) {
		return (_.contains(["on", "off"], targetValue) && vDev.get('metrics:level') === targetValue) || (_.contains(["upstart", "upstop", "downstart", "downstop"], targetValue) && vDev.get("metrics:change") === targetValue)
	} else {
		return false;
	}
};

/*
	simply compare times in format HH:mm with current time

	time 		[string]	// format HH:mm
	operator	[string]	// operators for comparisation: '<=', '>=' (others doesn't make sence)
*/
AutomationModule.prototype.compareTime = function(time, operator) {
	var curTime = new Date(),
		time_arr = time.split(":").map(function(x) {
			return parseInt(x, 10);
		});

	return this.op(curTime.getHours() * 60 + curTime.getMinutes(), operator, time_arr[0] * 60 + time_arr[1]);
};

/*	switches a vDev based on it's known object stored in modules config

	reverseLevel			[boolean]				// don't do this if level is already triggered
	el = {
	    deviceId: '',			[string], MUST				// device ID
	    deviceType: '',			[string], MUST				// device type
	    level: '', 				[string/number], MUST		// device level like: {color: { r: 0, g: 0, b: 0}}, 'on', 'off', 'open', 'close', [level]
	    sendAction: false, 		[boolean], MUST				// don't do this if level is already triggered
	    reverseLevel: '',   	[string/number], OPTIONAL	// device reverse level like: {color: { r: 0, g: 0, b: 0}}, 'on', 'off', 'open', 'close', [level]
	    operator: ''			[string], OPTIONAL			// operator for comparisation: '=', '<', '>', '<=', '>=', '!='
	}
*/
AutomationModule.prototype.shiftDevice = function(el, reverse) {
	var vDev = this.controller.devices.get(el.deviceId),
		lvl = reverse && el.reverseLevel !== undefined && !!el.reverseLevel? el.reverseLevel : el.level,
		set = this.executeActions(el.sendAction, vDev, lvl);

	// check if levels are equal and if active don't trigger new state
	if (vDev && set) {
		this.setNewDeviceState(vDev, lvl);
	}
};