/*** Security Z-Way HA module *******************************************

 Version: 1.0.1
 (c) Z-Wave.Me, 2018
 -----------------------------------------------------------------------------
 Author: Karsten Reichel <kar@zwave.eu>
 Description: Basic Security Module
 ******************************************************************************/
// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------
function Security(id, controller) {
	// Call superconstructor first (AutomationModule)
	Security.super_.call(this, id, controller);

	var self = this;

	this.minuteStandart = 60; //60
	this.secondStandart = 1; //1

	/**
	 * Static State Datas
	 * @type {{COFF: {value: number, name: string, code: string, vDevname: string}, CON: {value: number, name: string, code: string, vDevname: string}, CRESET: {value: number, name: string, code: string, vDevname: string}, TRIGGER: {value: number, name: string, code: string, vDevname: string}, TIMER: {value: number, name: string, code: string, vDevname: string}, FTIMER: {value: number, name: string, code: string, vDevname: string}, AUTOTOGGLE: {value: number, name: string, code: string, vDevname: string}}}
	 */
	this.performEnum = {
		COFF: {
			value: 0,
			name: "cOff",
			code: "OF",
			vDevname: "Security_Unarmed"
		},
		CON: {
			value: 1,
			name: "cOn",
			code: "ON",
			vDevname: "Security_Armed"
		},
		CRESET: {
			value: 2,
			name: "cReset",
			code: "RE",
			vDevname: "Security_Reset"
		},
		TRIGGER: {
			value: 3,
			name: "trigger",
			code: "TR",
			vDevname: "Alarm_Trigger"
		},
		TIMER: {
			value: 4,
			name: "timer",
			code: "TI",
			vDevname: "Alarm_Command_TimerStart"
		},
		FTIMER: {
			value: 5,
			name: "ftimer",
			code: "FT",
			vDevname: "Alarm_Command_TimerEnd"
		},
		AUTOTOGGLE: {
			value: 6,
			name: "automationToggle",
			code: "AT",
			vDevname: "Automation_switch"
		}
	};

	/**
	 * Stati an State can have
	 * @type {{INIT: string, STOPPED: string, RUNNING: string}}
	 */
	this.StateStatus = {
		INIT: "init",
		STOPPED: "stop",
		RUNNING: "run"
	};

	/**
	 * Static Transition Datas
	 * @type {{OFF: {value: number, name: string, code: string, vDevname: string, StateStatus: string}, PREON: {value: number, name: string, code: string, vDevname: string, StateStatus: string}, LIVEON: {value: number, name: string, code: string, vDevname: string, StateStatus: string}, ALARMED: {value: number, name: string, code: string, vDevname: string, StateStatus: string}, INITIAL: {value: number, name: string, code: string, vDevname: string, StateStatus: string}}}
	 */
	this.StateEnum = {
		OFF: {
			value: 0,
			name: "off",
			code: "O",
			vDevname: "Alarm_Off",
			StateStatus: this.StateStatus.STOPPED
		},
		PREON: {
			value: 1,
			name: "preON",
			code: "P",
			vDevname: "Alarm_Wait",
			StateStatus: this.StateStatus.STOPPED
		},
		LIVEON: {
			value: 2,
			name: "liveOn",
			code: "L",
			vDevname: "Alarm_Ready",
			StateStatus: this.StateStatus.STOPPED
		},
		ALARMED: {
			value: 3,
			name: "alarmed",
			code: "A",
			vDevname: "Alarm_Alarmed",
			StateStatus: this.StateStatus.STOPPED
		},
		INITIAL: {
			value: 4,
			name: "initial",
			code: "I",
			vDevname: "Alarm_Initial",
			StateStatus: this.StateStatus.STOPPED
		}
	};
}
inherits(Security, AutomationModule);
_module = Security;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------
//

/**
 * Datas an Extern Device needs for Controling the Module oder get Controled from the Module
 * @param self a Reference of this Module
 * @param device a Reference of the device
 * @param condition the Condition when something happends in the Module when device Level is condition
 * @param performE what Happend if Conditionb is true
 * @constructor
 */
Security.prototype.BusDatas = function(self, device, condition, performE) {
	this.self = self;
	this.device = device;
	this.condition = condition;
	this.performE = performE;
}

//State Definition
/**
 * Definition of an State
 * @param stateEnum the Unique State Datas
 * @param entry The first called Method of an State before it is Set
 * @param make the doing Method of an State can have an arg Parameter
 * @param exit the Method who called by exitin an state
 * @constructor
 */
Security.prototype.State = function(stateStatus, stateEnum, entry, make, exit) {
	var entry = entry;
	var make = make;
	var exit = exit;

	this.stateStatus = stateStatus;
	this.stateEnum = stateEnum;

	this.doEntry = function() {
		stateEnum.StateStatus = stateStatus.INIT;
		entry();
	};
	this.doMake = function(args) {
		if (stateEnum.StateStatus === stateStatus.INIT) {
			stateEnum.StateStatus = stateStatus.RUNNING;
			make(args);
		}
	};
	this.doExit = function() {
		if (stateEnum.StateStatus === stateStatus.RUNNING) {
			exit();
			stateEnum.StateStatus = stateStatus.STOPPED;
		}
	};
}

/**
 * sets the parameter to the Automation Controlling value
 * @param toSet parameter
 */
Security.prototype.setAutomation = function(toSet) {
	var self = this;
	self.vDev.set("metrics:Alevel", toSet);
};
/**
 * Initiate the Module
 * @param config Alpaca Datas
 */
Security.prototype.init = function(config) {
	Security.super_.prototype.init.call(this, config);
	var self = this;
	this.a = null;
	this.alarmDevice = null;
	//this.scheduletimer = null;
	this.alarmtimer = null;
	this.alarmSilenttimerS2 = null;
	this.alarmtimerS2 = null;
	this.alarmCtimer = null;
	this.sensorsDatas = config.input.table;
	this.lastTriggerList = [];
	this.ignorenamesList = [];
	this.onDatas = self.filterFor(config.controls.table, "armCondition");
	this.offDatas = self.filterFor(config.controls.table, "disarmCondition");
	this.resetDatas = self.filterFor(config.controls.table, "clearCondition");

	this.silentalarmDatas = config.silentAlarms.table;
	this.alarmDatas = config.alarms.table;
	this.confirmDatas = config.armConfirm.table;
	this.disconfirmDatas = config.disarmConfirm.table;
	this.cleanDatas = config.clean.table;

	this.silentalarmNots = config.silentAlarms.notification;
	this.alarmNots = config.alarms.notification;
	this.confirmNots = config.armConfirm.notification;
	this.disconfirmNots = config.disarmConfirm.notification;
	this.cleanNots = config.clean.notification;

	this.timeSchedule = config.schedules;
	this.cronListeningCollector = [];
	this.busDatas = new this.BusDatas(null, null, null, null);
	this.busDataMap = {};
	this.start = config.times.start;
	this.interval = config.times.interval;
	this.silent = config.times.silent;
	this.autoDeviceTrigger = "on";
		/**
	 * function who will Connected to devices who trigger the Alarm
	 * @param idev device
	 */
	this.sensorFunction = function sensorFunction(idev) {
		var busDatas;
		var vDevD;
		this.sensorFunctionIF = function() {
			if (busDatas) {
				vDevD = busDatas.self.controller.devices.get(busDatas.device);
				if (busDatas.condition === vDevD.get("metrics:level")) {
					if (busDatas.self.vDev.get("metrics:state") === self.StateEnum.LIVEON) {
						busDatas.self.lastTrigger(busDatas.self.lastTriggerList, vDevD);
					}
					if (busDatas.self.vDev.get("metrics:level") === "on") {
						busDatas.self.vDev.performCommand(self.performEnum.TRIGGER.name, {
							device: busDatas.device.toString()
						});
					}
					if (!busDatas.self.alarmDevice) {
						busDatas.self.alarmDevice = busDatas.device.toString();
					}
				}
			}
		};

		busDatas = self.busDataMap[idev.id + '#' + "on"];
		this.sensorFunctionIF();
		busDatas = self.busDataMap[idev.id + '#' + "off"];
		this.sensorFunctionIF();

	};
	/**
	 * function who will Connected to devices who Control the Module
	 * @param idev
	 */
	this.inputFunction = function inputFunction(idev) {
		var busDatas;
		var vDevD;
		this.inputFunctionIF = function() {
			if (busDatas) {
				vDevD = self.controller.devices.get(busDatas.device);

				if (busDatas.condition === vDevD.get("metrics:level") || busDatas.condition === true) {
					busDatas.self.vDev.performCommand(busDatas.performE.name, {
						device: busDatas.device.toString()
					});
					if (!busDatas.self.alarmDevice) {
						busDatas.self.alarmDevice = busDatas.device.toString();
					}

				}
			}
		};
		busDatas = self.busDataMap[idev.id + '#' + "on"];
		this.inputFunctionIF();
		busDatas = self.busDataMap[idev.id + '#' + "off"];
		this.inputFunctionIF();
		busDatas = self.busDataMap[idev.id + '#' + true];
		this.inputFunctionIF();
	};

	setTimeout(function(){ 
		console.log("------------------Security start"); 
		self.makeVDevs(config);
		self.wipeOwnVDevs();
		if (config.times.aktive) {
			self.setAutomation('on');
		} else {
			self.setAutomation('off');
		}
		self.initStates();
		self.state = self.initState;
		self.initDevices();
		self.state.doEntry();
		self.state.doMake();
		self.vDev.performCommand(self.performEnum.COFF.name);
	}, 30000);
};

/**
 * stops module and remove all injections and destroys all vdevs
 */
Security.prototype.stop = function() {

	this.alarmCancel();
	this.stopDevices();
	this.endschedule();

	if (this.vDev) {
		this.controller.devices.remove(this.vDev.id);
	}

	this.vDev = null;
	this.destroyVDevs();
	Security.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

/**
 * Method calls the wipeOwnVdevs for all Device Arrays
 */
Security.prototype.wipeOwnVDevs = function() {
	var self = this;
	self.wipeOwnVDevsFromArray(self.alarmDatas);
	self.wipeOwnVDevsFromArray(self.confirmDatas);
	self.wipeOwnVDevsFromArray(self.disconfirmDatas);
	self.wipeOwnVDevsFromArray(self.resetDatas);

};
/**
 * Methode who deletes all VDevs from the Security Module out of his
 * own inputs
 * @param array
 */
Security.prototype.wipeOwnVDevsFromArray = function(array) {
	var self = this;
	self.ignorenamesList.forEach(function(input) {
		array.forEach(function(aInput, index) {
			if (input.devices === aInput.devices) {
				//self.log("error","hit",true);
				array.splice(index, 1);
			}
		});

	});
};
/**
 * Methode who fills an Array with The Triggers of an Alarm
 * @param array
 * @param trigger
 */
Security.prototype.lastTrigger = function(array, trigger) {
	var self = this;
	if (array.length < 11) {
		trigger.get("metrics:title");
		array[array.length] = {
			id: trigger.get("id"),
			name: trigger.get("metrics:title"),
			time: new Date(),
			state: trigger.get("metrics:level")
		};
	} else {
		array.unshift(trigger);
	}
	self.vDev.set("metrics:lastTriggerList", array);
};
/**
 * Method who filters an Array on an condition value of its objects and Return it than
 * @param array
 * @param condition
 * @returns {Array}
 */
Security.prototype.filterFor = function(array, condition) {
	var output = [];
	array.forEach(function(input) {
		if (input[condition] === "on" || input[condition] === "off") {
			output.push({
				devices: input.devices,
				conditions: input[condition]
			});
		}


	});
	return output;
};
/**
 * Method who injects the Methods for Alarmtriggering on an Device with some Condition for Triggering
 * @param device
 * @param condition
 */
Security.prototype.onSensor = function(device, condition) {
	var self = this;
	if (!self.busDataMap[device + '#' + condition]) {
		self.busDataMap[device + '#' + condition] = new this.BusDatas(self, device, condition, null);
	}
	self.controller.devices.on(device, "change:metrics:level",
		self.sensorFunction
	);
};
/**
 * looks after commands if they come from extern or from the module
 * @param args argument of the command
 * @param vdevId Id of the Command sender
 * @param method method to perform
 */
Security.prototype.commandHandlingWithBidirektionalScene = function(args, vdevId, method) {
	var self = this;
	if (args && args.device && args.device === vdevId) {
		method();
	} else {
		self.controller.devices.get(vdevId).set("metrics:level", "on");
	}
};
/**
 * Initiate all Vdevs for the Module
 */
Security.prototype.makeVDevs = function() {
	var self = this;
	//Transition VDEVS
	self.vDevON = self.makeVDev(this.performEnum.CON.vDevname, 'toggleButton');
	self.vDevOFF = self.makeVDev(this.performEnum.COFF.vDevname, 'toggleButton');
	self.vDevRESET = self.makeVDev(this.performEnum.CRESET.vDevname, 'toggleButton');
	self.vDevTRIGGER = self.makeVDev(this.performEnum.TRIGGER.vDevname, 'toggleButton');
	//Alarm State VDEV
	self.vDevALARM = self.makeVDev(this.StateEnum.ALARMED.vDevname, 'toggleButton');
	//Automation VDEV
	self.vDevTimeSchedule = self.makeVDev(this.performEnum.AUTOTOGGLE.vDevname, 'toggleButton');
	//Module VDEV
	self.vDev = self.controller.devices.create({
		deviceId: "Security_" + self.id,
		defaults: {
			deviceType: "sensorMultiline",
			metrics: {
				multilineType: "securityControl",
				title: self.getInstanceTitle(),
				icon: "security",
				state: self.StateEnum.OFF,
				level: 'off',
				scaleTitle: '',
				Alevel: 'off',
				Rlevel: 'off',
				Clevel: this.performEnum.COFF.name,
				start: self.start,
				interval: self.interval,
				lastTriggerList: []
			}
		},
		overlay: {},
		handler: function(command, args) {
			var returnState = {
				'code': 2,
				'runningState': "undefined"
			};
			var message = command;
			switch (command) {
				case "test":
					self.test();
					returnState = self.makeReturnState(1, "test Security_" + self.id);
					return returnState;
				case self.performEnum.COFF.name:
					message = self.performEnum.COFF.name;
					self.commandHandlingWithBidirektionalScene(args, self.vDevOFF.id, function() {
						self.transition(self.canOff(), self.off, args);
					});
					break;
				case self.performEnum.CRESET.name:
					message = self.performEnum.CRESET.name;
					self.commandHandlingWithBidirektionalScene(args, self.vDevRESET.id, function() {
						self.transition(self.canReset(), self.preOn, args);
					});
					break;
				case self.performEnum.CON.name:
					message = self.performEnum.CON.name;
					self.commandHandlingWithBidirektionalScene(args, self.vDevON.id, function() {
						self.transition(self.canOn(), self.preOn, args);
					});
					break;
				case self.performEnum.TRIGGER.name:
					self.alarmDevice = args.device;
					if (args.device && args.device !== self.vDevTRIGGER.id) {
						self.a = args;
					}
					self.commandHandlingWithBidirektionalScene(args, self.vDevTRIGGER.id, function() {
						self.transition(self.canTrigger(), self.alarmed, self.a);
					});
					break;
				case self.performEnum.TIMER.name:
					self.transition(self.canTimer(), self.liveOn, args);
					break;
				case self.performEnum.FTIMER.name:
					self.transition(self.canTimer(), self.alarmed, args);
					break;
				case self.performEnum.AUTOTOGGLE.name:
					if (args.device === self.vDevTimeSchedule.id) {
						if (self.vDev.get("metrics:Alevel") === 'on') {
							self.setAutomation('off');
						} else {
							self.setAutomation('on');
						}
						self.log("warning", "automation switched to " + "#" + self.vDev.get("metrics:Alevel"), false);
					} else {
						self.controller.devices.get(self.vDevTimeSchedule.id).set("metrics:level", "on");
					}

					break;
				default:
					self.log("warning", "Security_" + self.id + " unknown command " + command, false);
					returnState = self.makeReturnState(2, command + 'is not available command');
					return returnState;
			}
		},
		moduleId: this.id
	});

};
/**
 * Deletes all Vdevs
 */
Security.prototype.destroyVDevs = function() {
	var self = this;
	self.destroyVDev(this.performEnum.CON.vDevname);
	self.destroyVDev(this.performEnum.COFF.vDevname);
	self.destroyVDev(this.performEnum.CRESET.vDevname);
	self.destroyVDev(this.performEnum.TRIGGER.vDevname);
	self.destroyVDev(this.StateEnum.ALARMED.vDevname);
	self.destroyVDev(this.performEnum.AUTOTOGGLE.vDevname);
};
/**
 * Makes an VDEV with name and Devicetype
 * @param name
 * @param devicetype
 * @returns {*} VDEV
 */
Security.prototype.makeVDev = function(name, devicetype) {
	var self = this;
	var title = name + " (" + self.id + ")";
	var id = "Security_" + self.id + name;
	self.ignorenamesList.push({
		"devices": id
	});
	return self.controller.devices.create({
		deviceId: id,
		defaults: {
			deviceType: devicetype,
			metrics: {
				level: 'on',
				title: title
			}
		},
		overlay: {
			deviceType: devicetype,
			probeType: self.id + name
		},
		handler: function(command) {

			this.set("metrics:level", command);
		},
		moduleId: this.id

	});
};
/**
 * Deletes an VDEV withj specifik name
 * @param vdevName
 */
Security.prototype.destroyVDev = function(vdevName) {
	var self = this;
	self.controller.devices.remove("Security_" + self.id + vdevName);

};
/**
 * Injects the Extern Module Control Devices
 * @param pE Transition to Trigger
 * @param device Device
 * @param condition Condition of the Devicelevel when trigger
 */
Security.prototype.onInput = function(pE, device, condition) {
	var self = this;
	if (!self.busDataMap[device + '#' + condition]) {
		self.busDataMap[device + '#' + condition] = new this.BusDatas(self, device, condition, pE);
	}
	if (self.controller.devices.get(device)) {
		self.controller.devices.on(device, "change:metrics:level",
			self.inputFunction
		);
	}

};
/**
 * Inits all vdevs and Used Devices and visebility
 */
Security.prototype.initDevices = function() {
	var self = this;
	if (self.sensorsDatas) {
		self.onSensorsAndConditionArray(self.sensorsDatas);
	}
	if (self.offDatas) {
		self.onInputArray(this.performEnum.COFF, self.offDatas);
	}
	if (self.onDatas) {
		self.onInputArray(this.performEnum.CON, self.onDatas);
	}
	if (self.resetDatas) {
		self.onInputArray(this.performEnum.CRESET, self.resetDatas);
	}
	self.onInput(this.performEnum.CON, self.vDevON.id, true);
	self.onInput(this.performEnum.COFF, self.vDevOFF.id, true);
	self.onInput(this.performEnum.CRESET, self.vDevRESET.id, true);
	self.onInput(this.performEnum.TRIGGER, self.vDevTRIGGER.id, true);
	self.onInput(this.performEnum.AUTOTOGGLE, self.vDevTimeSchedule.id, true);
	this.vDevON.set('visibility', false, {
		silent: true
	});
	this.vDevOFF.set('visibility', false, {
		silent: true
	});
	this.vDevRESET.set('visibility', false, {
		silent: true
	});
	this.vDevTRIGGER.set('visibility', false, {
		silent: true
	});
	this.vDevALARM.set('visibility', false, {
		silent: true
	});
	this.vDevTimeSchedule.set('visibility', false, {
		silent: true
	});
};
/**
 * removes all device Injections and removes all vdevs
 */
Security.prototype.stopDevices = function() {
	var self = this;
	if (self.sensorsDatas) {
		self.offSensorsAndConditionArray(self.sensorsDatas);
	}
	if (self.offDatas) {
		self.offInputArray(this.performEnum.COFF, self.offDatas);
	}
	if (self.onDatas) {
		self.offInputArray(this.performEnum.CON, self.onDatas);
	}
	if (self.resetDatas) {
		self.offInputArray(this.performEnum.CRESET, self.resetDatas);
	}
	self.offInput(this.performEnum.CON, self.vDevON.id, true);
	self.offInput(this.performEnum.COFF, self.vDevOFF.id, true);
	self.offInput(this.performEnum.CRESET, self.vDevRESET.id, true);
	self.offInput(this.performEnum.TRIGGER, self.vDevTRIGGER.id, true);
	self.offInput(this.performEnum.AUTOTOGGLE, self.vDevTimeSchedule.id, true);

	if (self.vDevON) {
		self.controller.devices.remove(self.vDevON.id);
		self.vDevON = null;
	}
	if (self.vDevOFF) {
		self.controller.devices.remove(self.vDevOFF.id);
		self.vDevOFF = null;
	}
	if (self.vDevRESET) {
		self.controller.devices.remove(self.vDevRESET.id);
		self.vDevRESET = null;
	}
	if (self.vDevTRIGGER) {
		self.controller.devices.remove(self.vDevTRIGGER.id);
		self.vDevTRIGGER = null;
	}
	if (self.vDevALARM) {
		self.controller.devices.remove(self.vDevALARM.id);
		self.vDevALARM = null;
	}
	self.log("warning", "Security_" + self.id + " Stopped", false);

};
/**
 * iterates an array of devices for Injection to Control the Module
 * @param pE command for the devices
 * @param inputList
 */
Security.prototype.onInputArray = function(pE, inputList) {
	var self = this;
	inputList.forEach(function(input) {
		self.onInput(pE, input.devices, input.conditions);
	});
};
/**
 * iterates an array of devices for Injection to Trigger Alarm
 * @param sensors
 */
Security.prototype.onSensorsAndConditionArray = function(sensors) {
	var self = this;
	sensors.forEach(
		function(args) {
			self.onSensor(args.devices, args.conditions);
		}
	);
};
/**
 * iterates an array of devices for remove Injection to Control the Module
 * @param pE
 * @param inputList
 */
Security.prototype.offInputArray = function(pE, inputList) {
	var self = this;

	inputList.forEach(function(input) {
		self.offInput(pE, input.devices, input.conditions);
	});
};
/**
 * removes Injections off an Control device
 * @param pE
 * @param device
 */
Security.prototype.offInput = function(pE, device) {
	var self = this;
	if (self.controller.devices.get(device)) {
		self.controller.devices.off(device, "change:metrics:level",
			self.inputFunction
		);
	}


};
/**
 * iterates an array of devices for remove Injection to Trigger Alarm
 * @param sensors
 */
Security.prototype.offSensorsAndConditionArray = function(sensors) {
	var self = this;
	sensors.forEach(
		function(args) {
			self.offSensor(args.devices, args.conditions);
		}
	);
};
/**
 * removes trigger function of an Alarm Sensor
 * @param device
 */
Security.prototype.offSensor = function(device) {
	var self = this;
	self.controller.devices.off(device, "change:metrics:level",
		self.sensorFunction
	);
};
/**
 * looks if scheduler is running
 * @returns {boolean}
 */
Security.prototype.scheduleActive = function() {
	var self = this;
	if (self.controller.devices.get(self.vDevTimeSchedule.id) && self.controller.devices.get(self.vDevTimeSchedule.id).get("metrics:level")) {
		return self.controller.devices.get(self.vDevTimeSchedule.id).get("metrics:level");
	} else {
		return false;
	}
};
/**
 * analyse the Scheduler if sth changed
 * @param timeSchedule
 */
Security.prototype.schedule = function() {
	var self = this;
	/*self.scheduletimer = setInterval(function() {
		if (self.scheduleActive()) {
			if (self.analyseSchedule(timeSchedule, "arm")) {
				self.vDev.performCommand(self.performEnum.CON.name);
			}
			if (self.analyseSchedule(timeSchedule, "disarm")) {
				self.vDev.performCommand(self.performEnum.COFF.name);
			}
		}

	}, this.minuteStandart * 500);*/
	console.log('### timeSchedule:', JSON.stringify(this.timeSchedule));
	console.log('### this.scheduleActive():', this.scheduleActive());

	if (this.scheduleActive() && this.timeSchedule) {
		Object.keys(this.timeSchedule).forEach(function(weekday) {
			var times = ['arm', 'disarm'];
			if (self.timeSchedule[weekday].length > 0) {
				self.timeSchedule[weekday].forEach(function(entry) {
					times.forEach(function(time) {
						try {
							var min = parseInt(entry[time].split(":")[1], 10),
								hour = parseInt(entry[time].split(":")[0], 10),
								listenerName = time + '.' + entry[time] + '.' + weekday + '.poll';

							// add cron schedule every week
							self.controller.emit("cron.addTask", listenerName, {
								minute: min,
								hour: hour,
								weekDay: parseInt(weekday, 10),
								day: null,
								month: null
							});

							if (time === 'arm') {
								self.controller.on(listenerName, self.pollArm);
							} else if (time === 'disarm') {
								self.controller.on(listenerName, self.pollDisarm);
							}

							if (self.cronListeningCollector.indexOf(listenerName) < 0) {
								self.cronListeningCollector.push(listenerName);
							}
						} catch (e) {
							console.log('Security schedule error:', e.toString());
						}

					})
				});
			}
		});
	} else {
		this.cronListeningCollector.forEach(function(listenerName) {
			var condition = listenerName.split('.')[0];

			self.controller.emit("cron.removeTask", "listenerName");

			if (condition === 'arm') {
				self.controller.off(listenerName, self.pollArm);
			} else if (condition === 'disarm') {
				self.controller.off(listenerName, self.pollDisarm);
			}
		});
	}

	console.log('### this.cronListeningCollector:', JSON.stringify(this.cronListeningCollector));
};

Security.prototype.pollArm = function() {
	if (this.vDev) {
		this.vDev.performCommand(self.performEnum.CON.name);
	}
};

Security.prototype.pollDisarm = function() {
	if (this.vDev) {
		this.vDev.performCommand(self.performEnum.COFF.name);
	}
};

/**
 * checks if scheduler has to do sth
 * @param timeSchedule
 * @param condition
 * @returns {boolean}
 */
Security.prototype.analyseSchedule = function(timeSchedule, condition) {
	var self = this;
	var back = false;
	var check = new Date();
	timeSchedule.forEach(function(timeSet) {
		if (check.getHours() === timeSet.time.hour && check.getMinutes() === timeSet.time.minute &&
			timeSet.weekday === check.getDay() && timeSet.condition === condition) {
			back = true;
			return back;
		}
	});
	return back;


};
/**
 * reads the Alpaca Data for the schedules and make the Usefull for the Scheduler
 * @param timeSchedule
 * @returns {Array}
 */
Security.prototype.scheduleAnalyse = function(timeSchedule) {
	var self = this,
		analysed = [];

	/*Date.prototype.setDay = function (dayOfWeek) {
	    var distance = ( (dayOfWeek - this.getDay()) % 7);
	    this.setDate(this.getDate() + distance);
	};*/
	/*for (var i = 0; i <= 6; i++) {
	    if (inPut[i].length > 0) {
	        weekdays.push(i);
	    }
	}*/

	Object.keys(timeSchedule).forEach(function(key) {
		var time = {
			minute: parseInt(timeSchedule[key].time.split(":")[1], 10),
			hour: parseInt(timeSchedule[key].time.split(":")[0], 10)
		};

		if (timeSchedule[key].length > 0) {

			analysed.push({
				weekday: key,
				time: time,
				condition: timeSchedule[key].condition
			});
		}
	});

	return analysed;
};
/**
 * Main Method defines what happend at the State Methods and Changes
 */
Security.prototype.initStates = function() {
	var self = this;
	//--Initial-State--
	self.initState = new this.State(this.StateStatus, this.StateEnum.INITIAL,
		function() {},
		function() {
			self.vDevALARM.performCommand("on");

		},
		function() {});
	//--OFF-State--
	self.off = new this.State(this.StateStatus, this.StateEnum.OFF, function() {
		self.vDev.set("metrics:state", self.StateEnum.OFF);
		self.vDev.set("metrics:level", 'off');
		self.vDev.set("metrics:Rlevel", 'off');
		self.vDev.set("metrics:Clevel", self.performEnum.COFF.name);
		self.vDev.set("metrics:state", self.StateEnum.OFF);
		self.endschedule();
		self.shiftTriggerDevices(self.disconfirmDatas, self.disconfirmNots, 'disarm');
	}, function(args) {
		self.schedule();
	}, function() {});
	//--Waiting-State--
	self.preOn = new this.State(this.StateStatus, this.StateEnum.PREON, function() {
		self.vDev.set("metrics:state", self.StateEnum.PREON);
		self.vDev.set("metrics:Clevel", self.performEnum.CON.name);
		self.vDev.set("metrics:Rlevel", 'off');
		self.vDev.set("metrics:level", 'pending');
		self.a = null;
	}, function(args) {
		self.cTimer();

	}, function() {

	});
	//--Online-State--
	self.liveOn = new this.State(this.StateStatus, this.StateEnum.LIVEON, function() {
		self.vDev.set("metrics:state", self.StateEnum.LIVEON);
		self.vDev.set("metrics:level", 'on');
	}, function(args) {
		self.shiftTriggerDevices(self.confirmDatas, self.confirmNots, 'arm');
	}, function() {
		//self.shiftTriggerDevices(self.disconfirmDatas, self.disconfirmNots, 'disarm');
	});
	//--Alarming-State--
	self.alarmed = new this.State(this.StateStatus, this.StateEnum.ALARMED, function() {
		self.vDev.set("metrics:state", self.StateEnum.ALARMED);
		self.vDev.set("metrics:level", 'alarmed');
		self.vDev.set("metrics:Rlevel", 'on');
	}, function(args) {
		if (args && args.device) {
			self.alarmTriggering(self.controller.devices.get(args.device).get("metrics:title"));
		} else {
			self.alarmTriggering("By Scene");
		}

	}, function() {
		self.alarmCancel();
	});
};
/**
 * Triggering the Alarm and starts the repeat timer
 * @param alarmMsg
 */
Security.prototype.alarmTriggering = function(alarmMsg) {
	var self = this;

	if (self.interval) {
		self.alarmInterval = this.minuteStandart * 1000 * self.interval;
	} else {
		self.alarmInterval = null;
	}
	if (self.silent) {
		self.alarmDelay = this.secondStandart * 1000 * self.silent;
	} else {
		self.alarmDelay = null;
	}

	if (!self.alarmtimer) {
		self.silenttriggerFunction(alarmMsg);

		// if no silent alarm, immediately fire normal alarm
		if (!self.alarmDelay) {
			self.triggerFunction(alarmMsg);

			// if needed setup repeat of alarm
			if (self.alarmInterval) {
				self.alarmtimer = setInterval(function() {
					self.triggerFunction(alarmMsg);
				}, self.alarmInterval);
			}
		// else wait for specific time
		} else {
			self.alarmtimerS2 = setInterval(function() {

				clearInterval(self.alarmtimerS2);
				self.alarmtimerS2 = null;

				// trigger alarm
				self.triggerFunction(alarmMsg);

				// if needed setup repeat of alarm
				if (self.alarmInterval) {
					self.alarmtimer = setInterval(function() {
						self.triggerFunction(alarmMsg);
					}, self.alarmInterval);
				}
			}, self.alarmDelay);
		}
	}
};
/**
 * Triggers the silent Alarms and his Timers
 * @param alarmMsg
 */
Security.prototype.silenttriggerFunction = function(alarmMsg) {
	this.log("error", "ALARM silent " + "Security_" + this.id + " " + alarmMsg, false);

	this.shiftTriggerDevices(this.silentalarmDatas, this.silentalarmNots, 'arm');
};
/**
 * broadcast the Alarm to all Alarming devices and the Log and the own Alarm Scene Vdev
 * @param alarmMsg
 */
Security.prototype.triggerFunction = function(alarmMsg) {
	this.log("error", "ALARM " + "Security_" + this.id + " " + alarmMsg, false);
	this.controller.emit("alarm", this);
	this.vDevALARM.performCommand("on");

	this.shiftTriggerDevices(this.alarmDatas, this.alarmNots, 'arm');
};
/**
 * Second Main Method for State Transitions
 * @param condition before Condition when an Transition happends if wrong command gets ignored
 * @param newState state after the transition
 * @param args Arguments for the Make Method
 */
Security.prototype.transition = function(condition, newState, args) {
	var self = this;
	if (condition) {
		self.state.doExit();
		newState.doEntry();
		self.state = newState;
		self.state.doEntry();
		self.state.doMake(args);

	}
};
/**
 * Timer for pending Alarm Module can get Alarmed, if some sensor has wrong state at end of pending, it gets alarmed
 */
Security.prototype.cTimer = function() {
	var self = this;
	if (self.start) {
		self.time = this.secondStandart * 1000 * self.start;
	} else {
		self.time = this.secondStandart * 1000;
	}
	if (self.alarmCtimer) {
		clearInterval(self.alarmCtimer);
	}
	self.alarmCtimer = setInterval(function() {
		if (self.vDev) {
			if (self.allDevicesInit()) {
				self.vDev.performCommand(self.performEnum.TIMER.name);
			} else {
				if (!self.alarmDevice && self.lastTriggerList) {
					self.alarmDevice = self.lastTriggerList[0].id;
				}
				self.vDev.performCommand(self.performEnum.FTIMER.name, {
					device: self.alarmDevice
				});

			}
			clearInterval(self.alarmCtimer);
		}
	}, self.time);

};
/**
 * Condition for Trigger Transition
 * @returns {boolean}
 */
Security.prototype.canTrigger = function() {
	var self = this;
	return self.state.stateEnum === this.StateEnum.LIVEON;

};
/**
 * Condition for Pending Transition
 * @returns {boolean}
 */
Security.prototype.canTimer = function() {
	var self = this;
	return self.state.stateEnum === this.StateEnum.PREON;

};
/**
 * Condition for get the Module alarm ready
 * @returns {boolean}
 */
Security.prototype.canOn = function() {
	var self = this;
	if (self.state.stateEnum !== this.StateEnum.OFF) {
		return false;
	}
	return true;
};
/**
 * Condition for get the Module off
 * @returns {boolean}
 */
Security.prototype.canOff = function() {
	var self = this;
	return [this.StateEnum.LIVEON, this.StateEnum.PREON, this.StateEnum.INITIAL].indexOf(self.state.stateEnum) !== -1;
};
/**
 * Condition for reset alarmed
 * @returns {boolean}
 */
Security.prototype.canReset = function() {
	var self = this;
	return self.state.stateEnum === this.StateEnum.ALARMED;
};
/**
 * Looks if all Devices are on the right state that the module can get alarm ready
 * @returns {boolean}
 */
Security.prototype.allDevicesInit = function() {
	var self = this;
	var back = true;
	if (self.sensorsDatas) {
		self.sensorsDatas.forEach(
			function(args) {
				if (self.controller.devices.get(args.devices) && self.controller.devices.get(args.devices).get("metrics:level") === args.conditions) {
					back = false;
					self.lastTrigger(self.lastTriggerList, self.controller.devices.get(args.devices));
				}
			}
		);
	}
	return back;
};
/**
 * making the HTML REST RETURN for an command
 * @param code
 * @param message
 * @returns {{code: *, runningState: *, modulinfo: {id: string}}}
 */
Security.prototype.makeReturnState = function(code, message) {
	var self = this;
	return {
		'code': code,
		'runningState': message,
		'modulinfo': {
			id: "Security_" + self.id
		}
	};
};
/**
 * writing log to console and UI
 * @param level
 * @param message
 * @param stringify
 */
Security.prototype.log = function(level, message, stringify) {
	var self = this;
	if (stringify) {
		self.controller.addNotification(level, JSON.stringify(message, null, 4), "module", "Security");
		//console.log(JSON.stringify(message, null, 4));
	} else {
		self.controller.addNotification(level, message, "module", "Security");
		//console.log(message);
	}
};

Security.prototype.contains = function(array, obj) {
	var i = array.length;
	while (i--) {
		if (array[i] === obj) {
			return true;
		}
	}
	return false;
};
Security.prototype.test = function() {
	var self = this;
	self.alarmTriggering("x");
};

Security.prototype.doOnDeviceArray = function doOnDeviceArray(deviceArray, bin) {
	var self = this;
	deviceArray.forEach(function(name) {
		if (self.controller.devices.get(name.devices)) {
			switch (self.controller.devices.get(name.devices).get("deviceType")) {
				case 'switchBinary':
					self.controller.devices.get(name.devices).performCommand(bin);
					break;
			}
		}
	});
};
/**
 * Ends the Alarm and cleans the timer
 */
Security.prototype.alarmCancel = function() {
	clearInterval(this.alarmtimer);
	clearInterval(this.alarmtimerS2);
	clearInterval(this.alarmSilenttimerS2);
	this.alarmtimer = null;
	this.alarmSilenttimerS2 = null;
	this.alarmtimerS2 = null;
	this.doOnDeviceArray(this.alarmDatas, "off");
	this.log("warning", "Security_" + "ALARM-END", false);
	if (this.vDevALARM) {
		this.vDevALARM.performCommand("on");
	}
	if (this.alarmDevice) {
		this.alarmDevice = null;
	}

	this.shiftTriggerDevices(this.cleanDatas, this.cleanNots, 'arm');
};

/**
 * Stops scheduling
 */
Security.prototype.endschedule = function() {
	var self = this;

	this.cronListeningCollector.forEach(function(listenerName) {
		var condition = listenerName.split('.')[0];

		self.controller.emit("cron.removeTask", listenerName);

		if (condition === 'arm') {
			self.controller.off(listenerName, self.pollArm);
		} else if (condition === 'disarm') {
			self.controller.off(listenerName, self.pollDisarm);
		}
	});
};

/*
 * shift all devices that are triggered on state change
 */
Security.prototype.shiftTriggerDevices = function(datas, notification, level) {
	var self = this;

	if (datas) {
		datas.forEach(function(args) {
			// args([deviceID],[level],[sendAction])
			var vDev = self.controller.devices.get(args.devices),
				type = vDev.get('deviceType') || null,
				level = vDev.get('metrics:level'),
				set = args.sendAction ? args.level !== vDev.get('metrics:level') : true;

			if (vDev && set) {
				switch (type) {
					case 'switchMultilevel':
						_.contains(['on', 'off'], args.level) ? vDev.performCommand(args.level) : vDev.performCommand("exact", {
							level: args.level
						});
						break;
					case 'switchRGBW':
						_.contains(['on', 'off'], new_level) ? vDev.performCommand(args.level) : vDev.performCommand("exact", {
							red: args.level.r,
							green: args.level.g,
							blue: args.level.b
						});
						break;
					case 'toggleButton':
						vDev.performCommand('on');
						break;
					default:
						vDev.performCommand(args.level);
				}
			}
		});
	}

	if (typeof notification.target && notification.target !== '') {
		this.controller.notificationChannelSend(notification.target, notification.message ? notification.message : this.getInstanceTitle());
	}
};