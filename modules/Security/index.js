/*** Security Z-Way HA module *******************************************

 Version: 1.0.0
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
}
inherits(Security, AutomationModule);
_module = Security;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------
//
var minuteStandart = 60;//60
var secondStandart = 1;//1
/**
 * Static State Datas
 * @type {{COFF: {value: number, name: string, code: string, vDevname: string}, CON: {value: number, name: string, code: string, vDevname: string}, CRESET: {value: number, name: string, code: string, vDevname: string}, TRIGGER: {value: number, name: string, code: string, vDevname: string}, TIMER: {value: number, name: string, code: string, vDevname: string}, FTIMER: {value: number, name: string, code: string, vDevname: string}, AUTOTOGGLE: {value: number, name: string, code: string, vDevname: string}}}
 */
var performEnum = {
    COFF: {value: 0, name: "cOff", code: "OF", vDevname: "Security_Unarmed"},
    CON: {value: 1, name: "cOn", code: "ON", vDevname: "Security_Armed"},
    CRESET: {value: 2, name: "cReset", code: "RE", vDevname: "Security_Reset"},
    TRIGGER: {value: 3, name: "trigger", code: "TR", vDevname: "Alarm_Trigger"},
    TIMER: {value: 4, name: "timer", code: "TI", vDevname: "Alarm_Command_TimerStart"},
    FTIMER: {value: 5, name: "ftimer", code: "FT", vDevname: "Alarm_Command_TimerEnd"},
    AUTOTOGGLE: {value: 6, name: "automationToggle", code: "AT", vDevname: "Automation_switch"}
};
/**
 * Stati an State can have
 * @type {{INIT: string, STOPPED: string, RUNNING: string}}
 */
var StateStatus = {
    INIT: "init",
    STOPPED: "stop",
    RUNNING: "run"
};
/**
 * Static Transition Datas
 * @type {{OFF: {value: number, name: string, code: string, vDevname: string, StateStatus: string}, PREON: {value: number, name: string, code: string, vDevname: string, StateStatus: string}, LIVEON: {value: number, name: string, code: string, vDevname: string, StateStatus: string}, ALARMED: {value: number, name: string, code: string, vDevname: string, StateStatus: string}, INITIAL: {value: number, name: string, code: string, vDevname: string, StateStatus: string}}}
 */
var StateEnum = {
    OFF: {value: 0, name: "off", code: "O", vDevname: "Alarm_Off", StateStatus: StateStatus.STOPPED},
    PREON: {value: 1, name: "preON", code: "P", vDevname: "Alarm_Wait", StateStatus: StateStatus.STOPPED},
    LIVEON: {value: 2, name: "liveOn", code: "L", vDevname: "Alarm_Ready", StateStatus: StateStatus.STOPPED},
    ALARMED: {value: 3, name: "alarmed", code: "A", vDevname: "Alarm_Alarmed", StateStatus: StateStatus.STOPPED},
    INITIAL: {value: 4, name: "initial", code: "I", vDevname: "Alarm_Initial", StateStatus: StateStatus.STOPPED}
};
//State Definition
/**
 * Definition of an State
 * @param stateEnum the Unique State Datas
 * @param entry The first called Method of an State before it is Set
 * @param make the doing Method of an State can have an arg Parameter
 * @param exit the Method who called by exitin an state
 * @constructor
 */
function State(stateEnum, entry, make, exit) {
    this.stateEnum = stateEnum;
    var entry = entry;
    var make = make;
    var exit = exit;
    this.doEntry = function () {
        stateEnum.StateStatus = StateStatus.INIT;
        entry();
    };
    this.doMake = function (args) {
        if (stateEnum.StateStatus === StateStatus.INIT) {
            stateEnum.StateStatus = StateStatus.RUNNING;
            make(args);
        }

    };
    this.doExit = function () {
        if (stateEnum.StateStatus === StateStatus.RUNNING) {

            exit();
            stateEnum.StateStatus = StateStatus.STOPPED;
        }

    };

}
/**
 * Datas an Extern Device needs for Controling the Module oder get Controled from the Module
 * @param self a Reference of this Module
 * @param device a Reference of the device
 * @param condition the Condition when something happends in the Module when device Level is condition
 * @param performE what Happend if Conditionb is true
 * @constructor
 */
function BusDatas(self, device, condition, performE) {
    this.self = self;
    this.device = device;
    this.condition = condition;
    this.performE = performE;
}
/**
 * sets the parameter to the Automation Controlling value
 * @param toSet parameter
 */
Security.prototype.setAutomation = function (toSet) {
    var self = this;
    self.vDev.set("metrics:Alevel", toSet);


};
/**
 * Initiate the Module
 * @param config Alpaca Datas
 */
Security.prototype.init = function (config) {
    Security.super_.prototype.init.call(this, config);
    var self = this;
    self.a = null;
    self.alarmDevice = null;
    self.sceduletimer = null;
    self.alarmtimer = null;
    self.alarmSilenttimerS2 = null;
    self.alarmtimerS2 = null;
    self.alarmCtimer = null;
    self.sensorsDatas = config.input.table;
    self.lastTriggerList = [];
    self.ignorenamesList = [];
    self.onDatas = self.filterFor(config.controls.table, "armCondition");
    self.offDatas = self.filterFor(config.controls.table, "disarmCondition");
    self.resetDatas = self.filterFor(config.controls.table, "clearCondition");
    
    self.silentalarmDatas = config.silentAlarms.table;
    self.alarmDatas = config.alarms.table;
    self.confirmDatas = config.armConfirm.table;
    self.disconfirmDatas = config.disarmConfirm.table;
    self.cleanDatas = config.clean.table;

    self.silentalarmNots = config.silentAlarms.notification;
    self.alarmNots = config.alarms.notification;
    self.confirmNots = config.armConfirm.notification;
    self.disconfirmNots = config.disarmConfirm.notification;
    self.cleanNots = config.clean.notification;    

    self.timeScedule = config.times.table;
    self.busDatas = new BusDatas(null, null, null, null);
    self.busDataMap = {};
    self.start = config.times.start;
    self.interval = config.times.interval;
    self.silent = config.times.silent;
    self.makeVDevs(config);
    self.wipeOwnVDevs();
    if (config.times.aktive) {
        self.setAutomation('on');
    } else {
        self.setAutomation('off');
    }

    /**
     * function who will Connected to devices who trigger the Alarm
     * @param idev device
     */
    this.sensorFunction = function sensorFunction(idev) {
        var busDatas;
        var vDevD;
        this.sensorFunctionIF = function () {
            if (busDatas) {
                vDevD = busDatas.self.controller.devices.get(busDatas.device);
                if (busDatas.condition === vDevD.get("metrics:level")) {
                    if (busDatas.self.vDev.get("metrics:state") === StateEnum.LIVEON) {
                        busDatas.self.lastTrigger(busDatas.self.lastTriggerList, vDevD);
                    }
                    if(busDatas.self.vDev.get("metrics:level")==="on") {
                        busDatas.self.vDev.performCommand(performEnum.TRIGGER.name, {device: busDatas.device.toString()});
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
        this.inputFunctionIF = function () {
            if (busDatas) {
                vDevD = self.controller.devices.get(busDatas.device);

                if (busDatas.condition === vDevD.get("metrics:level") || busDatas.condition === true) {
                    busDatas.self.vDev.performCommand(busDatas.performE.name, {device: busDatas.device.toString()});
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
    self.autoDeviceTrigger = "on";
    if (self.timeScedule && self.timeScedule[0]) {
        self.timeScedule = self.sceduleAnalyse(self.timeScedule);
    }
    self.initStates();
    self.state = self.initState;
    self.initDevices();
    self.state.doEntry();
    self.state.doMake();
    self.vDev.performCommand(performEnum.COFF.name);
};
/**
 * Method calls the wipeOwnVdevs for all Device Arrays
 */
Security.prototype.wipeOwnVDevs = function () {
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
Security.prototype.wipeOwnVDevsFromArray = function (array) {
    var self = this;
    self.ignorenamesList.forEach(function (input) {
        array.forEach(function (aInput, index) {
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
Security.prototype.lastTrigger = function (array, trigger) {
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
Security.prototype.filterFor = function (array, condition) {
    var output = [];
    array.forEach(function (input) {
            if (input[condition] === "on" || input[condition] === "off") {
                output.push(
                    {
                        devices: input.devices,
                        conditions: input[condition]
                    }
                );
            }


        }
    );
    return output;
};
/**
 * Method who injects the Methods for Alarmtriggering on an Device with some Condition for Triggering
 * @param device
 * @param condition
 */
Security.prototype.onSensor = function (device, condition) {
    var self = this;
    if (!self.busDataMap[device + '#' + condition]) {
        self.busDataMap[device + '#' + condition] = new BusDatas(self, device, condition, null);
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
Security.prototype.commandHandlingWithBidirektionalScene = function (args, vdevId, method) {
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
Security.prototype.makeVDevs = function () {
    var self = this;
    //Transition VDEVS
    self.vDevON = self.makeVDev(performEnum.CON.vDevname, 'toggleButton');
    self.vDevOFF = self.makeVDev(performEnum.COFF.vDevname, 'toggleButton');
    self.vDevRESET = self.makeVDev(performEnum.CRESET.vDevname, 'toggleButton');
    self.vDevTRIGGER = self.makeVDev(performEnum.TRIGGER.vDevname, 'toggleButton');
    //Alarm State VDEV
    self.vDevALARM = self.makeVDev(StateEnum.ALARMED.vDevname, 'toggleButton');
    //Automation VDEV
    self.vDevTimeScedule = self.makeVDev(performEnum.AUTOTOGGLE.vDevname, 'toggleButton');
    //Module VDEV
    self.vDev = self.controller.devices.create({
            deviceId: "Security_" + self.id,
            defaults: {
                deviceType: "sensorMultiline",
                metrics: {
                    multilineType: "securityControl",
                    title: self.getInstanceTitle(),
                    icon: "security",
                    state: StateEnum.OFF,
                    level: 'off',
                    scaleTitle: '',
                    Alevel: 'off',
                    Rlevel: 'off',
                    Clevel: performEnum.COFF.name,
                    start: self.start,
                    interval: self.interval,
                    lastTriggerList: []
                }
            },
            overlay: {},
            handler: function (command, args) {
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
                    case performEnum.COFF.name:
                        message = performEnum.COFF.name;
                        self.commandHandlingWithBidirektionalScene(args, self.vDevOFF.id, function () {
                            self.transition(self.canOff(), self.off, args);
                        });
                        break;
                    case performEnum.CRESET.name:
                        message = performEnum.CRESET.name;
                        self.commandHandlingWithBidirektionalScene(args, self.vDevRESET.id, function () {
                            self.transition(self.canReset(), self.preOn, args);
                        });
                        break;
                    case performEnum.CON.name:
                        message = performEnum.CON.name;
                        self.commandHandlingWithBidirektionalScene(args, self.vDevON.id, function () {
                            self.transition(self.canOn(), self.preOn, args);
                        });
                        break;
                    case performEnum.TRIGGER.name:
                        self.alarmDevice = args.device;
                        if (args.device && args.device !== self.vDevTRIGGER.id) {
                            self.a = args;
                        }
                        self.commandHandlingWithBidirektionalScene(args, self.vDevTRIGGER.id, function () {
                            self.transition(self.canTrigger(), self.alarmed, self.a);
                        });
                        break;
                    case performEnum.TIMER.name:
                        self.transition(self.canTimer(), self.liveOn, args);
                        break;
                    case performEnum.FTIMER.name:
                        self.transition(self.canTimer(), self.alarmed, args);
                        break;
                    case performEnum.AUTOTOGGLE.name:
                        if (args.device === self.vDevTimeScedule.id) {
                            if (self.vDev.get("metrics:Alevel") === 'on') {
                                self.setAutomation('off');
                            }
                            else {
                                self.setAutomation('on');
                            }
                            self.log("warning", "automation switched to" + "#" + self.vDev.get("metrics:Alevel"), true);
                        } else {
                            self.controller.devices.get(self.vDevTimeScedule.id).set("metrics:level", "on");
                        }

                        break;
                    default :
                        self.log("warning", "Security_ " + self.id + " unknown command " + command, false);
                        returnState = self.makeReturnState(2, command + 'is not available command');
                        return returnState;
                }
            },
            moduleId: this.id
        }
    )
    ;

};
/**
 * Deletes all Vdevs
 */
Security.prototype.destroyVDevs = function () {
    var self = this;
    self.destroyVDev(performEnum.CON.vDevname);
    self.destroyVDev(performEnum.COFF.vDevname);
    self.destroyVDev(performEnum.CRESET.vDevname);
    self.destroyVDev(performEnum.TRIGGER.vDevname);
    self.destroyVDev(StateEnum.ALARMED.vDevname);
    self.destroyVDev(performEnum.AUTOTOGGLE.vDevname);
};
/**
 * Makes an VDEV with name and Devicetype
 * @param name
 * @param devicetype
 * @returns {*} VDEV
 */
Security.prototype.makeVDev = function (name, devicetype) {
    var self = this;
    var title = name + " (" + self.id + ")";
    var id = "Security_" + self.id + name;
    self.ignorenamesList.push({"devices": id});
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
        handler: function (command) {

            this.set("metrics:level", command);
        },
        moduleId: this.id

    });
};
/**
 * Deletes an VDEV withj specifik name
 * @param vdevName
 */
Security.prototype.destroyVDev = function (vdevName) {
    var self = this;
    self.controller.devices.remove("Security_" + self.id + vdevName);

};
/**
 * Injects the Extern Module Control Devices
 * @param pE Transition to Trigger
 * @param device Device
 * @param condition Condition of the Devicelevel when trigger
 */
Security.prototype.onInput = function (pE, device, condition) {
    var self = this;
    if (!self.busDataMap[device + '#' + condition]) {
        self.busDataMap[device + '#' + condition] = new BusDatas(self, device, condition, pE);
    }
    if (self.controller.devices.get(device)) {
        self.controller.devices.on(device, "change:metrics:level",
            self.inputFunction
        )
        ;
    }

};
/**
 * Inits all vdevs and Used Devices and visebility
 */
Security.prototype.initDevices = function () {
    var self = this;
    if (self.sensorsDatas) {
        self.onSensorsAndConditionArray(self.sensorsDatas);
    }
    if (self.offDatas) {
        self.onInputArray(performEnum.COFF, self.offDatas);
    }
    if (self.onDatas) {
        self.onInputArray(performEnum.CON, self.onDatas);
    }
    if (self.resetDatas) {
        self.onInputArray(performEnum.CRESET, self.resetDatas);
    }
    self.onInput(performEnum.CON, self.vDevON.id, true);
    self.onInput(performEnum.COFF, self.vDevOFF.id, true);
    self.onInput(performEnum.CRESET, self.vDevRESET.id, true);
    self.onInput(performEnum.TRIGGER, self.vDevTRIGGER.id, true);
    self.onInput(performEnum.AUTOTOGGLE, self.vDevTimeScedule.id, true);
    this.vDevON.set('visibility', false, {silent: true});
    this.vDevOFF.set('visibility', false, {silent: true});
    this.vDevRESET.set('visibility', false, {silent: true});
    this.vDevTRIGGER.set('visibility', false, {silent: true});
    this.vDevALARM.set('visibility', false, {silent: true});
    this.vDevTimeScedule.set('visibility', false, {silent: true});
};
/**
 * removes all device Injections and removes all vdevs
 */
Security.prototype.stopDevices = function () {
    var self = this;
    if (self.sensorsDatas) {
        self.offSensorsAndConditionArray(self.sensorsDatas);
    }
    if (self.offDatas) {
        self.offInputArray(performEnum.COFF, self.offDatas);
    }
    if (self.onDatas) {
        self.offInputArray(performEnum.CON, self.onDatas);
    }
    if (self.resetDatas) {
        self.offInputArray(performEnum.CRESET, self.resetDatas);
    }
    self.offInput(performEnum.CON, self.vDevON.id, true);
    self.offInput(performEnum.COFF, self.vDevOFF.id, true);
    self.offInput(performEnum.CRESET, self.vDevRESET.id, true);
    self.offInput(performEnum.TRIGGER, self.vDevTRIGGER.id, true);
    self.offInput(performEnum.AUTOTOGGLE, self.vDevTimeScedule.id, true);

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
    self.log("warning", "Security_ " + self.id + " Stopped", false);

};
/**
 * iterates an array of devices for Injection to Control the Module
 * @param pE command for the devices
 * @param inputList
 */
Security.prototype.onInputArray = function (pE, inputList) {
    var self = this;
    inputList.forEach(function (input) {
            self.onInput(pE, input.devices, input.conditions);
        }
    );
};
/**
 * iterates an array of devices for Injection to Trigger Alarm
 * @param sensors
 */
Security.prototype.onSensorsAndConditionArray = function (sensors) {
    var self = this;
    sensors.forEach(
        function (args) {
            self.onSensor(args.devices, args.conditions);
        }
    );
};
/**
 * iterates an array of devices for remove Injection to Control the Module
 * @param pE
 * @param inputList
 */
Security.prototype.offInputArray = function (pE, inputList) {
    var self = this;

    inputList.forEach(function (input) {
            self.offInput(pE, input.devices, input.conditions);
        }
    );
};
/**
 * removes Injections off an Control device
 * @param pE
 * @param device
 */
Security.prototype.offInput = function (pE, device) {
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
Security.prototype.offSensorsAndConditionArray = function (sensors) {
    var self = this;
    sensors.forEach(
        function (args) {
            self.offSensor(args.devices, args.conditions);
        }
    );
};
/**
 * removes trigger function of an Alarm Sensor
 * @param device
 */
Security.prototype.offSensor = function (device) {
    var self = this;
    self.controller.devices.off(device, "change:metrics:level",
        self.sensorFunction
    );
};
/**
 * looks if sceduler is running
 * @returns {boolean}
 */
Security.prototype.sceduleAktive = function () {
    var self = this;
    if (self.controller.devices.get(self.vDevTimeScedule.id) && self.controller.devices.get(self.vDevTimeScedule.id).get("metrics:level")) {
        return self.controller.devices.get(self.vDevTimeScedule.id).get("metrics:level");
    } else {
        return false;
    }
};
/**
 * analyse the Sceduler if sth changed
 * @param timeScedule
 */
Security.prototype.scedule = function (timeScedule) {
    var self = this;
    self.sceduletimer = setInterval(function () {
        if (self.sceduleAktive()) {
            if (self.analyseScedule(timeScedule, "arm")) {
                self.vDev.performCommand(performEnum.CON.name);
            }
            if (self.analyseScedule(timeScedule, "disarm")) {
                self.vDev.performCommand(performEnum.COFF.name);
            }
        }

    }, minuteStandart * 500);

};
/**
 * checks if sceduler has to do sth
 * @param timeScedule
 * @param condition
 * @returns {boolean}
 */
Security.prototype.analyseScedule = function (timeScedule, condition) {
    var self = this;
    var back = false;
    var check = new Date();
    timeScedule.forEach(function (timeSet) {
        if (check.getHours() === timeSet.time.hour && check.getMinutes() === timeSet.time.minute &&
            timeSet.weekday === check.getDay() && timeSet.condition === condition) {
            back = true;
            return back;
        }
    });
    return back;


};
/**
 * reads the Alpaca Data for the scedules and make the Usefull for the Sceduler
 * @param timeScedule
 * @returns {Array}
 */
Security.prototype.sceduleAnalyse = function (timeScedule) {
    var self = this;
    var analysed = [];
    //TODO Refactor
    timeScedule.forEach(function (inPut) {
        Date.prototype.setDay = function (dayOfWeek) {
            var distance = ( (dayOfWeek - this.getDay()) % 7);
            this.setDate(this.getDate() + distance);
        };
        var time = {
            minute: parseInt(inPut.times.split(":")[1], 10),
            hour: parseInt(inPut.times.split(":")[0], 10)
        };
        var weekdays = [];
        if (inPut[0]) {
            weekdays.push(0);
        }
        if (inPut[1]) {
            weekdays.push(1);
        }
        if (inPut[2]) {
            weekdays.push(2);
        }
        if (inPut[3]) {
            weekdays.push(3);
        }
        if (inPut[4]) {
            weekdays.push(4);
        }
        if (inPut[5]) {
            weekdays.push(5);
        }
        if (inPut[6]) {
            weekdays.push(6);
        }
        weekdays.forEach(function (wd) {
            var fDate = new Date();
            fDate.setDay(wd);
            analysed.push({
                weekday: wd,
                time: time,
                condition: inPut.condition
            });
        });
    });
    return analysed;
};
/**
 * Main Method defines what happend at the State Methods and Changes
 */
Security.prototype.initStates = function () {
    var self = this;
    //--Initial-State--
    self.initState = new State(StateEnum.INITIAL,
        function () {
        }, function () {
            self.vDevALARM.performCommand("on");

        },
        function () {
        });
    //--OFF-State--
    self.off = new State(StateEnum.OFF, function () {
        self.vDev.set("metrics:state", StateEnum.OFF);
        self.vDev.set("metrics:level", 'off');
        self.vDev.set("metrics:Rlevel", 'off');
        self.vDev.set("metrics:Clevel", performEnum.COFF.name);
        self.vDev.set("metrics:state", StateEnum.OFF);
        self.endscedule();
    }, function (args) {
        self.scedule(self.timeScedule);
    }, function () {
    });
    //--Waiting-State--
    self.preOn = new State(StateEnum.PREON, function () {
        self.vDev.set("metrics:state", StateEnum.PREON);
        self.vDev.set("metrics:Clevel", performEnum.CON.name);
        self.vDev.set("metrics:Rlevel", 'off');
        self.vDev.set("metrics:level", 'pending');
        self.a = null;
    }, function (args) {
        self.cTimer();

    }, function () {

    });
    //--Online-State--
    self.liveOn = new State(StateEnum.LIVEON, function () {
        self.vDev.set("metrics:state", StateEnum.LIVEON);
        self.vDev.set("metrics:level", 'on');
    }, function (args) {
        if (self.confirmDatas) {
            self.confirmDatas.forEach(
                function (args) {
                    if (self.controller.devices.get(args.devices)) {
                        var vDev = self.controller.devices.get(args.devices);
                        vDev.performCommand("on");
                    }
                }
            );
        }

        if(typeof self.confirmNots.target !== 'undefined' || typeof self.confirmNots.mail_to_input !== 'undefined') {
            var mail;
            if(self.confirmNots.target.search('@') > 0 || (mail = typeof self.confirmNots.mail_to_input !== 'undefined')) {
                self.addNotification('mail.notification', typeof self.confirmNots.message === 'undefined' ? self.getInstanceTitle() + ' - arm' : self.confirmNots.message, mail ? self.confirmNots.mail_to_input : self.confirmNots.target);
            } else {
                self.addNotification('push.notification', typeof self.confirmNots.message === 'undefined' ? self.getInstanceTitle() + ' - arm' : self.confirmNots.message, self.confirmNots.target);
            }
        }

    }, function () {
        if (self.disconfirmDatas) {
            self.disconfirmDatas.forEach(
                function (args) {
                    if (self.controller.devices.get(args.devices)) {
                        var vDev = self.controller.devices.get(args.devices);
                        vDev.performCommand("on");
                    }
                }
            );
        }

        if(typeof self.disconfirmNots.target !== 'undefined' || typeof self.disconfirmNots.mail_to_input !== 'undefined') {
            var mail;
            if(self.disconfirmNots.target.search('@') > 0 || (mail = typeof self.disconfirmNots.mail_to_input !== 'undefined')) {
                self.addNotification('mail.notification', typeof self.disconfirmNots.message === 'undefined' ? self.getInstanceTitle() + ' - disarm' : self.disconfirmNots.message, mail ? self.disconfirmNots.mail_to_input : self.disconfirmNots.target);
            } else {
                self.addNotification('push.notification', typeof self.disconfirmNots.message === 'undefined' ? self.getInstanceTitle() + ' - disarm' : self.disconfirmNots.message, self.disconfirmNots.target);
            }
        }        
    });
    //--Alarming-State--
    self.alarmed = new State(StateEnum.ALARMED, function () {
        self.vDev.set("metrics:state", StateEnum.ALARMED);
        self.vDev.set("metrics:level", 'alarmed');
        self.vDev.set("metrics:Rlevel", 'on');
    }, function (args) {
        if (args && args.device) {
            self.alarmTriggering(self.controller.devices.get(args.device).get("metrics:title"));
        } else {
            self.alarmTriggering("By Scene");
        }

    }, function () {
        self.alarmCancel();
    });
};
/**
 * Triggering the Alarm and starts the repeat timer
 * @param alarmMsg
 */
Security.prototype.alarmTriggering = function (alarmMsg) {
    var self = this;
    if (self.interval) {
        self.time = minuteStandart * 1000 * self.interval;
    } else {
        self.time = minuteStandart * 1000;
    }
    if (self.silent) {
        self.time2 = secondStandart * 1000 * self.silent;
    } else {
        self.time2 = secondStandart * 1000;
    }
    if (!self.alarmtimer) {
        if (self.silent === 0) {
            self.triggerFunction(alarmMsg);
        }
        self.silenttriggerFunction(alarmMsg);
    }
    self.alarmtimerS2 = setInterval(function () {
            self.silenttriggerFunction(alarmMsg);
        }, self.time
    );

    self.alarmSilenttimerS2 = setInterval(function () {
            self.triggerFunction(alarmMsg);
            self.alarmtimer = setInterval(function () {
                    self.triggerFunction(alarmMsg);
                }, self.time
            );
            clearInterval(self.alarmtimerS2);
            clearInterval(self.alarmSilenttimerS2);
        }, self.time2
    );

};
/**
 * Triggers the silent Alarms and his Timers
 * @param alarmMsg
 */
Security.prototype.silenttriggerFunction = function (alarmMsg) {
    var self = this;
    self.log("error", "ALARM silent " + "Security_ " + self.id + " " + alarmMsg, false);

    if (self.silentalarmDatas) {
        self.silentalarmDatas.forEach(
            function (args) {
                if (self.controller.devices.get(args.devices)) {
                    var vDev = self.controller.devices.get(args.devices);
                    vDev.performCommand("on");
                }
            }
        );
    }

    if(typeof self.silentalarmNots.target !== 'undefined' || typeof self.silentalarmNots.mail_to_input !== 'undefined') {
        var mail;
        if(self.silentalarmNots.target.search('@') > 0 || (mail = typeof self.silentalarmNots.mail_to_input !== 'undefined')) {
            self.addNotification('mail.notification', typeof self.silentalarmNots.message === 'undefined' ? self.getInstanceTitle() + ' - arm' : self.silentalarmNots.message, mail ? self.silentalarmNots.mail_to_input : self.silentalarmNots.target);
        } else {
            self.addNotification('push.notification', typeof self.silentalarmNots.message === 'undefined' ? self.getInstanceTitle() + ' - arm' : self.silentalarmNots.message, self.silentalarmNots.target);
        }
    }    

};
/**
 * broadcast the Alarm to all Alarming devices and the Log and the own Alarm Scene Vdev
 * @param alarmMsg
 */
Security.prototype.triggerFunction = function (alarmMsg) {
    var self = this;
    self.log("error", "ALARM " + "Security_ " + self.id + " " + alarmMsg, false);
    self.controller.emit("alarm", self);
    self.vDevALARM.performCommand("on");
    if (self.alarmDatas) {
        self.alarmDatas.forEach(
            function (args) {
                if (self.controller.devices.get(args.devices)) {
                    var vDev = self.controller.devices.get(args.devices);
                    vDev.performCommand("on");
                }
            }
        );
    }

    if(typeof self.alarmNots.target !== 'undefined' || typeof self.alarmNots.mail_to_input !== 'undefined') {
        var mail;
        if(self.alarmNots.target.search('@') > 0 || (mail = typeof self.alarmNots.mail_to_input !== 'undefined')) {
            self.addNotification('mail.notification', typeof self.alarmNots.message === 'undefined' ? self.getInstanceTitle() + ' - arm' : self.alarmNots.message, mail ? self.alarmNots.mail_to_input : self.alarmNots.target);
        } else {
            self.addNotification('push.notification', typeof self.alarmNots.message === 'undefined' ? self.getInstanceTitle() + ' - arm' : self.alarmNots.message, self.alarmNots.target);
        }
    }       

};
/**
 * Second Main Method for State Transitions
 * @param condition before Condition when an Transition happends if wrong command gets ignored
 * @param newState state after the transition
 * @param args Arguments for the Make Method
 */
Security.prototype.transition = function (condition, newState, args) {
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
Security.prototype.cTimer = function () {
    var self = this;
    if (self.start) {
        self.time = secondStandart * 1000 * self.start;
    } else {
        self.time = secondStandart * 1000;
    }
    if (self.alarmCtimer) {
        clearInterval(self.alarmCtimer);
    }
    self.alarmCtimer = setInterval(function () {
        if (self.vDev) {
            if (self.allDevicesInit()) {
                self.vDev.performCommand(performEnum.TIMER.name);
            } else {
                if (!self.alarmDevice && self.lastTriggerList) {
                    self.alarmDevice = self.lastTriggerList[0].id;
                }
                self.vDev.performCommand(performEnum.FTIMER.name, {device: self.alarmDevice});

            }
            clearInterval(self.alarmCtimer);
        }
    }, self.time);

};
/**
 * Condition for Trigger Transition
 * @returns {boolean}
 */
Security.prototype.canTrigger = function () {
    var self = this;
    return self.state.stateEnum === StateEnum.LIVEON;

};
/**
 * Condition for Pending Transition
 * @returns {boolean}
 */
Security.prototype.canTimer = function () {
    var self = this;
    return self.state.stateEnum === StateEnum.PREON;

};
/**
 * Condition for get the Module alarm ready
 * @returns {boolean}
 */
Security.prototype.canOn = function () {
    var self = this;
    if (self.state.stateEnum !== StateEnum.OFF) {
        return false;
    }
    return true;
};
/**
 * Condition for get the Module off
 * @returns {boolean}
 */
Security.prototype.canOff = function () {
    var self = this;
    return [StateEnum.LIVEON, StateEnum.PREON, StateEnum.INITIAL].indexOf(self.state.stateEnum) !== -1;
};
/**
 * Condition for reset alarmed
 * @returns {boolean}
 */
Security.prototype.canReset = function () {
    var self = this;
    return self.state.stateEnum === StateEnum.ALARMED;
};
/**
 * Looks if all Devices are on the right state that the module can get alarm ready
 * @returns {boolean}
 */
Security.prototype.allDevicesInit = function () {
    var self = this;
    var back = true;
    if (self.sensorsDatas) {
        self.sensorsDatas.forEach(
            function (args) {
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
Security.prototype.makeReturnState = function (code, message) {
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
Security.prototype.log = function (level, message, stringify) {
    var self = this;
    if (stringify) {
        self.controller.addNotification(level, JSON.stringify(message, null, 4), "module", "PersonIdentificationModule");
        console.log(JSON.stringify(message, null, 4));
    } else {
        self.controller.addNotification(level, message, "module", "PersonIdentificationModule");
        console.log(message);
    }
};
Security.prototype.contains = function (array, obj) {
    var i = array.length;
    while (i--) {
        if (array[i] === obj) {
            return true;
        }
    }
    return false;
};
Security.prototype.test = function () {
    var self = this;
    self.alarmTriggering("x");
};

Security.prototype.doOnDeviceArray = function doOnDeviceArray(deviceArray, bin) {
    var self = this;
    deviceArray.forEach(function (name) {
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
Security.prototype.alarmCancel = function () {
    var self = this;
    clearInterval(self.alarmtimer);
    clearInterval(self.alarmtimerS2);
    clearInterval(self.alarmSilenttimerS2);
    self.alarmtimer = null;
    self.alarmSilenttimerS2 = null;
    self.alarmtimerS2 = null;
    self.doOnDeviceArray(self.alarmDatas,"off");
    self.log("warning", "Security_ " + "ALARM-END", false);
    if (self.vDevALARM) {
        self.vDevALARM.performCommand("on");
    }
    if (self.alarmDevice) {
        self.alarmDevice = null;
    }
    if (self.cleanDatas) {
        self.cleanDatas.forEach(
            function (args) {
                if (self.controller.devices.get(args.devices)) {
                    var vDev = self.controller.devices.get(args.devices);
                    vDev.performCommand("on");
                }
            }
        );
    }

    if(typeof self.cleanNots.target !== 'undefined' || typeof self.cleanNots.mail_to_input !== 'undefined') {
        var mail;
        if(self.cleanNots.target.search('@') > 0 || (mail = typeof self.cleanNots.mail_to_input !== 'undefined')) {
            self.addNotification('mail.notification', typeof self.cleanNots.message === 'undefined' ? self.getInstanceTitle() + ' - arm' : self.cleanNots.message, mail ? self.cleanNots.mail_to_input : self.cleanNots.target);
        } else {
            self.addNotification('push.notification', typeof self.cleanNots.message === 'undefined' ? self.getInstanceTitle() + ' - arm' : self.cleanNots.message, self.cleanNots.target);
        }
    }   
};
/**
 * Stops sceduling
 */
Security.prototype.endscedule = function () {
    var self = this;
    clearInterval(self.sceduletimer);

};
/**
 * stops module and remove all injections and destroys all vdevs
 */
Security.prototype.stop = function () {

    var self = this;
    self.alarmCancel();
    self.stopDevices();
    self.endscedule();
    if (self.vDev) {
        self.controller.devices.remove(this.vDev.id);

    }
    self.vDev = null;
    self.destroyVDevs();
    self = null;
    Security.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
