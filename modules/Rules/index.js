/*** Rules Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2017
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

function Rules (id, controller) {
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
            "triggerOnDevicesChange" : true,
        },
        "reverse": false
    }*/

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Rules.prototype.init = function (config) {
	Rules.super_.prototype.init.call(this, config);

	var self = this,
		ifElement = self.config.simple.triggerEvent,
        /*
        color als trigger??
        {
            deviceId: '',
            deviceType: '',
            level: '',
            status: '', //on, off, open, close, color, level
            operator: <, = , > ,''
        }
        */
        doReverse = self.config.reverse,
        advancedActive = self.config.advanced.active;
        triggered = 0;

	this.handlerLevel = function (sDev) {
		var operator = ifElement.operator || null,
			ifLevel = ifElement.level,
            ifType = ifElement.deviceType,
			check = false,
			value = sDev.get("metrics:level"),
            simple = self.config.simple;

        // - IF-THEN-PART
        if (!!operator && ifLevel) {
            check = op(value, operator, ifLevel);
            /*switch (operator) {
                case '>':
                    check = value > ifLevel;
                    break;
                case '=':
                    check = value === ifLevel;
                    break;
                case '<':
                    check = value < ifLevel;
                    break;
            }*/
        } else if (ifType === 'switchRGBW') {
            check = _.isEqual(sDev.get("metrics:color"), ifLevel);
        }
        
        var triggerTimeout = getConfigTimeout(simple.triggerDelay);
        var reverseTimeout = getConfigTimeout(simple.reverseDelay);

        console.log('####', check, value === ifLevel, sDev.get('deviceType') === 'toggleButton');

        if (check || value === ifLevel || sDev.get('deviceType') === 'toggleButton') {
            
            this.simpleTriggerTimer = setTimeout( function() {

                /*
                {
                    deviceId: '',
                    deviceType: '',
                    level: '', / color: { r: 0, g: 0, b: 0}
                    status: '', //on, off, open, close, color, level
                    reverseLevel: '',
                    sendAction: true / false >> don't do this if level is already
                }
                */

                // do action for all target devices 
                simple.targetElements.forEach( function(el) {
                    console.log('el:', JSON.stringify(el));
                    var vDev = self.controller.devices.get(el.deviceId),
                        id = el.deviceId,
                        //lvl = el.status === 'level' && el.level? el.level : (el.status === 'color' && el.color? el.color: el.status),
                        set = executeActions(el.sendAction, vDev, el.targetLevel);

                    // check if levels are equal and if active don't trigger new state
                    if (vDev && set) {
                        setNewDeviceState(vDev, el.deviceType, el.targetLevel);
                    }
                });

                simple.sendNotifications.forEach(function (notification) {
                    sendNotification(notification, simple.triggerEvent, simple.targetElements);
                });

                self.reversActivated = true;
            }, triggerTimeout);
        } else if (doReverse && !check && self.reversActivated) {
            this.simpleReverseTimer = setTimeout( function() {
                self.config.simple.targetElements.forEach(function(el) {
                    var vDev = self.controller.devices.get(el.deviceId),
                        id = el.deviceId,
                        type = vDev? vDev.get('deviceType') : '';

                    if (el.reverseLevel !== '') {
                        var set = executeActions(el.sendAction, vDev, el.reverseLevel);
                        if (vDev && set) { 
                            setNewDeviceState(vDev, type, el.reverseLevel);
                        }
                    }
                });
                self.reversActivated = false;
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

Rules.prototype.stop = function () {
	var self = this;

    if(this.config.advanced.active) {
        if (this.config.advanced.triggerScenes) {
            this.config.advanced.triggerScenes.forEach(function(scene) {
                self.controller.devices.off(scene, "change:metrics:level", self._testRule);
            });
        }

        // testType ... switchBinary, switchMultilevel, switchRGBW, doorlock, switchControl, time, sensorDiscrete, nested
        // nested testType ... switchBinary, switchMultilevel, switchRGBW, doorlock, switchControl, time, sensorDiscrete

        this.config.advanced.tests.forEach(function(test) {
            switch(test.type) {
                case 'switchBinary':
                case 'switchMultilevel':
                case 'switchRGBW':
                case 'doorlock':
                case 'switchControl':
                case 'time':
                case 'sensorDiscrete':
                    self.attachDetach(test, false);
                    break;
                case 'nested':
                    test.tests.forEach(function(xtest) {
                        self.attachDetach(xtest, false);
                    });
                    break;
                default:
                    break;
            }
            /*if (test.testType === "switchBinary") {
                self.attachDetach(test.testSwitchBinary, false);
            } else if (test.testType === "switchMultilevel") {
                self.attachDetach(test.testSwitchMultilevel, false);
            } else if (test.testType === "color") {
                self.attachDetach(test.testColor, false);
            } else if (test.testType === "doorlock") {
                self.attachDetach(test.testDoorlock, false);
            } else if (test.testType === "switchControl") {
                self.attachDetach(test.testSwitchControl, false);
            } else if (test.testType === "time") {
                self.attachDetach(test.testTime, false);
            } else if (test.testType === "sensorDiscrete") {
                self.attachDetach(test.testSensorDiscrete, false);
            } else if (test.testType === "nested") {
                test.testNested.tests.forEach(function(xtest) {
                    if (xtest.testType === "switchBinary") {
                        self.attachDetach(xtest.testSwitchBinary, false);
                    } else if (xtest.testType === "switchMultilevel") {
                        self.attachDetach(xtest.testSwitchMultilevel, false);
                    } else if (xtest.testType === "color") {
                        self.attachDetach(xtest.testColor, false);
                    } else if (xtest.testType === "doorlock") {
                        self.attachDetach(xtest.testDoorlock, false);
                    } else if (xtest.testType === "switchControl") {
                        self.attachDetach(xtest.testSwitchControl, false);
                    } else if(xtest.testType === "time") {
                        self.attachDetach(xtest.testTime, false);
                    } else if ( xtest.testType === "sensorDiscrete") {
                        self.attachDetach(xtest.testSensorDiscrete, false);
                    }
                });
            }*/
        });

        this.attachedList = [];

    } else {
        // remove event IfElement listener
        self.controller.devices.off(self.config.simple.triggerEvent.deviceId,'change:metrics:level', self.handlerLevel);
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

	Rules.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

Rules.prototype.expertTriggerEventRule = function () {

    // testType ... switchBinary, switchMultilevel, switchRGBW, doorlock, switchControl, time, sensorDiscrete, nested
    // nested testType ... switchBinary, switchMultilevel, switchRGBW, doorlock, switchControl, time, sensorDiscrete

    this.config.advanced.tests.forEach(function(test) {
        switch(test.type) {
            case 'switchBinary':
            case 'switchMultilevel':
            case 'sensorBinary':
            case 'sensorMultilevel':
            case 'switchRGBW':
            case 'doorlock':
            case 'switchControl':
            case 'toggleButton':
            case 'time': 
            case 'sensorDiscrete':
            case 'thermostat':
                /*
                    test = {
                        type: 'xxx',
                        deviceId: 'xxx',
                        testValue: 'xxx',
                        testOperator: '=', '!=', '<', '>', '<=', '>='
                    },
                    time = {
                        type: 'time',
                        testValue: 'xxx',
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
                            testValue: 'xxx'
                            testOperator: '=', '!=', '<', '>', '<=', '>='
                        },{
                            type: 'aaa'
                            deviceId: 'aaa'
                            testValue: 'aaa'
                            testOperator: '=', '!=', '<', '>', '<=', '>='
                        }
                    ]
                }     
                */
                test.tests.forEach(function(xtest) {
                    self.attachDetach(xtest, true);
                });
                break;
            default:
                break;
        }

        /*if (test.testType === "switchBinary") {
            self.attachDetach(test.testSwitchBinary, true);
        } else if (test.testType === "switchMultilevel") {
            self.attachDetach(test.testSwitchMultilevel, true);
        } else if (test.testType === "color") {
            self.attachDetach(test.testColor, true);
        } else if (test.testType === "doorlock") {
            self.attachDetach(test.testDoorlock, true);
        } else if (test.testType === "switchControl") {
            self.attachDetach(test.testSwitchControl, true);
        } else if ( test.testType === "time") {
            self.attachDetach(test.testTime, true);
        } else if ( test.testType === "sensorDiscrete") {
            self.attachDetach(test.testSensorDiscrete, true);
        } else if (test.testType === "nested") {
            test.testNested.tests.forEach(function(xtest) {
                if (xtest.testType === "switchBinary") {
                    self.attachDetach(xtest.testSwitchBinary, true);
                } else if (xtest.testType === "switchMultilevel") {
                    self.attachDetach(xtest.testSwitchMultilevel, true);
                } else if (xtest.testType === "color") {
                    self.attachDetach(xtest.testColor, true);
                } else if (xtest.testType === "doorlock") {
                    self.attachDetach(xtest.testDoorlock, true);
                } else if (xtest.testType === "switchControl") {
                    self.attachDetach(xtest.testSwitchControl, true);
                } else if ( xtest.testType === "time") {
                    self.attachDetach(xtest.testTime, true);
                } else if ( xtest.testType === "sensorDiscrete") {
                    self.attachDetach(xtest.testSensorDiscrete, true);
                }
            });
        }*/
    });

    // TODO add sensorDiscrete as trigger
    this.config.advanced.triggerScenes.forEach(function(scene) {
        self.controller.devices.on(scene.deviceId, "change:metrics:level", self._testRule);
    });
};

// LogicalRuleMethods
Rules.prototype.attachDetach = function (test, attachOrDetach) {
    if (this.config.advanced.triggerOnDevicesChange === false) { // this condition is used to allow empty triggerOnDevicesChange if old LogicalRules is used
        return;
    }

    if (attachOrDetach) {
        if (this.attachedList.indexOf(test.device) === -1) {
            this.attachedList.push(test.device);
            this.controller.devices.on(test.device, "change:metrics:level", this._testRule);
            this.controller.devices.on(test.device, "change:metrics:change", this._testRule);
        }
    } else {
        this.controller.devices.off(test.device, "change:metrics:level", this._testRule);
        this.controller.devices.off(test.device, "change:metrics:change", this._testRule);
    }
};

Rules.prototype.testRule = function (tree) {
    var res = null,
        topLevel = !tree,
        self = this,
		langFile = self.loadModuleLang(),
	    doReverse = self.config.reverse || false,
		triggerTimeout = getConfigTimeout(self.config.advanced.triggerDelay),
        reverseTimeout = getConfigTimeout(self.config.advanced.reverseDelay);

    if (!tree) { tree = this.config.advanced; }

    if (tree.logicalOperator === "and") {
        res = true;

        tree.tests.forEach(function(test) {
            var vDev = test.type !== 'nested'? self.controller.devices.get(test.deviceId) : null,
                level = !!vDev? vDev.get("metrics:level") : undefined;

            switch (test.type) {
                case 'doorlock':
                case 'switchBinary':
                case 'sensorBinary':
                case 'sensorDiscrete':
                    res = res && (level === test.testValue);
                    break;
                case 'thermostat':
                case 'switchMultilevel':
                case 'sensorMultilevel':
                    res = res && op(level, test.testOperator, test.testValue);
                    break;
                case 'switchRGBW':
                    res = res && _.isEqual(vDev.get('metrics:color'), test.testValue);
                    break;
                case 'toggleButton':
                case 'switchControl':
                    res = res && compareSwitchControl(vDev,test.testValue);
                    break;
                case 'time':
                    res = res && compareTime().call(self, test.testOperator);
                    break;
                case 'nested':
                    res = res && self.testRule(test);
                    break;
                default:
                    break;
            }

            /*if (test.testType === "switchMultilevel") {
                res = res && self.op(self.controller.devices.get(test.testSwitchMultilevel.device).get("metrics:level"), test.testSwitchMultilevel.testOperator, test.testSwitchMultilevel.testValue);
            } else if (test.testType === "switchBinary") {
                res = res && (self.controller.devices.get(test.testSwitchBinary.device).get("metrics:level") === test.testSwitchBinary.testValue);
            } else if (test.testType === "doorlock") {
                res = res && (self.controller.devices.get(test.testDoorlock.device).get("metrics:level") === test.testDoorlock.testValue);
            } else if (test.testType === "thermostat") {
                res = res && (self.controller.devices.get(test.testThermostat.device).get("metrics:level") === test.testThermostat.testValue);
            } else if (test.testType === "sensorDiscrete") {
                res = res && (self.controller.devices.get(test.testSensorDiscrete.device).get("metrics:level") === test.testSensorDiscrete.testValue);
            } else if (test.testType === "switchControl") {
                var dev = self.controller.devices.get(test.testSwitchControl.device);
                res = res && ((_.contains(["on", "off"], test.testSwitchControl.testValue) && dev.get("metrics:level") === test.testSwitchControl.testValue) || (_.contains(["upstart", "upstop", "downstart", "downstop"], test.testSwitchControl.testValue) && dev.get("metrics:change") === test.testSwitchControl.testValue));
            } else if (test.testType === "time") {
                var curTime = new Date(),
                    time_arr = test.testTime.testValue.split(":").map(function(x) { return parseInt(x, 10); });
                res = res && self.op(curTime.getHours() * 60 + curTime.getMinutes(), test.testTime.testOperator, time_arr[0] * 60 + time_arr[1]);
            } else if (test.testType === "nested") {
                res = res && self.testRule(test.testNested);
            }*/
        });
    } else if (tree.logicalOperator === "or") {
        res = false;

        var vDev = test.type !== 'nested'? self.controller.devices.get(test.deviceId) : null,
            level = !!vDev? vDev.get("metrics:level") : undefined;

            switch (test.type) {
                case 'doorlock':
                case 'switchBinary':
                case 'sensorBinary':
                case 'sensorDiscrete':
                    res = res || (level === test.testValue);
                    break;
                case 'thermostat':
                case 'switchMultilevel':
                case 'sensorMultilevel':
                    res = res || op(level, test.testOperator, test.testValue);
                    break;
                case 'switchRGBW':
                    res = res || _.isEqual(vDev.get('metrics:color'), test.testValue);
                    break;
                case 'toggleButton':
                case 'switchControl':
                    res = res || compareSwitchControl(vDev,test.testValue);
                    break;
                case 'time':
                    res = res && compareTime().call(self, test.testOperator);
                    break;
                case 'nested':
                    res = res || self.testRule(test);
                    break;
                default:
                    break;
            }

        /*tree.tests.forEach(function(test) {
            if (test.testType === "switchMultilevel") {
                res = res || self.op(self.controller.devices.get(test.testSwitchMultilevel.device).get("metrics:level"), test.testSwitchMultilevel.testOperator, test.testSwitchMultilevel.testValue);
            } else if (test.testType === "switchBinary") {
                res = res || (self.controller.devices.get(test.testSwitchBinary.device).get("metrics:level") === test.testSwitchBinary.testValue);
            } else if (test.testType === "switchControl") {
                var dev = self.controller.devices.get(test.testSwitchControl.device);
                res = res || ((_.contains(["on", "off"], test.testSwitchControl.testValue) && dev.get("metrics:level") === test.testSwitchControl.testValue) || (_.contains(["upstart", "upstop", "downstart", "downstop"], test.testSwitchControl.testValue) && dev.get("metrics:change") === test.testSwitchControl.testValue));
            } else if (test.testType === "time") {
                var curTime = new Date(),
                    time_arr = test.testTime.testValue.split(":").map(function(x) { return parseInt(x, 10); });
                res = res || self.op(curTime.getHours() * 60 + curTime.getMinutes(), test.testTime.testOperator, time_arr[0] * 60 + time_arr[1]);
            } else if (test.testType === "nested") {
                res = res || self.testRule(test.testNested);
            }
        });*/
    }

    if (topLevel && res) {
        this.advancedTriggerTimer = setTimeout( function() {
            tree.targetElements.forEach(function (el){
                var vDev = self.controller.devices.get(el.deviceId),
                    set = el.sendAction? executeActions(el.sendAction, vDev, el.targetLevel) : true;
                if (vDev && set) {
                    setNewDeviceState(vDev, el.deviceType, el.level)
                }
            });

            tree.sendNotifications.forEach(function (notification) {
                sendNotification(notification, tree.tests, tree.targetElements);
            });

            self.reversActivated = true;
            /*
            tree.targetElements.switches && tree.targetElements.switches.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (doReverse && devState.reverseLVL === 'undefined') { devState.reverseLVL = vDev.get("metrics:level"); }
                    if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
                        vDev.performCommand(devState.status);
                    }
                }
            });
            tree.targetElements.dimmers && tree.targetElements.dimmers.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (doReverse && devState.reverseLVL === 'undefined') { devState.reverseLVL = vDev.get("metrics:level"); }
                    if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
                        vDev.performCommand("exact", { level: devState.status });
                    }
                }
            });
            tree.targetElements.thermostats && tree.targetElements.thermostats.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (doReverse && devState.reverseLVL === 'undefined') { devState.reverseLVL = vDev.get("metrics:level"); }
                    if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
                        vDev.performCommand("exact", { level: devState.status });
                    }
                }
            });
            tree.targetElements.locks && tree.targetElements.locks.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (doReverse && devState.reverseLVL === 'undefined') { devState.reverseLVL = vDev.get("metrics:level"); }
                    if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
                        vDev.performCommand(devState.status);
                    }
                }
            });
            tree.targetElements.scenes && tree.targetElements.scenes.forEach(function(scene) {
                var vDev = self.controller.devices.get(scene);
                if (vDev) {
                    vDev.performCommand("on");
                }
            });
            tree.targetElements.notification && tree.targetElements.notification.forEach(function(notification) {
                if(typeof notification.target !== 'undefined' || typeof notification.mail_to_input !== 'undefined') {
                    var mail;
                    if(notification.target.search('@') > 0 || (mail = typeof notification.mail_to_input !== 'undefined')) {
                        self.addNotification('mail.notification', typeof notification.message === 'undefined' ? 'Conditions: ' + JSON.stringify(self.config.conditions) + ' Actions: ' + JSON.stringify(self.config.action) : notification.message, mail ? notification.mail_to_input : notification.target);
                    } else {
                        self.addNotification('push.notification', typeof notification.message === 'undefined' ? 'Conditions: ' + JSON.stringify(self.config.conditions) + ' Actions: ' + JSON.stringify(self.config.action) : notification.message, notification.target);
                    }
                }
            });
            */
        }, triggerTimeout);
    } else if (doReverse && !res && self.reversActivated) {
        this.advancedReverseTimer = setTimeout( function() {
            tree.targetElements.forEach(function (el){
                var vDev = self.controller.devices.get(el.deviceId);
                if (vDev) {
                    setNewDeviceState(vDev, el.deviceType, el.reverseLevel);
                }
                self.reversActivated = false;
            });



            /*tree.targetElements.switches && tree.targetElements.switches.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (devState.reverseLVL !== 'undefined') {
                        vDev.performCommand(devState.reverseLVL);
                        devState.reverseLVL = 'undefined';
                    }
                }
            });
            tree.targetElements.dimmers && tree.targetElements.dimmers.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (devState.reverseLVL !== 'undefined') {
                        vDev.performCommand("exact", { level: devState.reverseLVL });
                        devState.reverseLVL = 'undefined';
                    }
                }
            });
            tree.targetElements.thermostats && tree.targetElements.thermostats.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (devState.reverseLVL !== 'undefined') {
                        vDev.performCommand("exact", { level: devState.reverseLVL });
                        devState.reverseLVL = 'undefined';
                    }
                }
            });
            tree.targetElements.locks && tree.targetElements.locks.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (devState.reverseLVL !== 'undefined') {
                        vDev.performCommand(devState.reverseLVL);
                        devState.reverseLVL = 'undefined';
                    }
                }
            });*/
        }, reverseTimeout);
    }

    return res;
};

function sendNotification (notification, conditions, actions) {
    var notificationType = '',
        notificationMessage = '';

    if(notification.target && notification.target !== '') {
        notificationType = notification.target.search('@') > -1? 'mail.notification' : 'push.notification';
        notificationMessage = !notification.message? 'Condition: ' + JSON.stringify(conditions) + ' Actions: ' + JSON.stringify(actions) : notification.message;

        this.controller.addNotification(notificationType, notificationMessage, notification.target);
    }
};

op = function (dval, op, val) {
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

// compare old and new level to avoid unnecessary updates
function compareValues(vDev,valNew){
    if (vDev && !!vDev) {
        var devType = vDev.get('deviceType'),
            vO = devType === 'switchRGBW'? vDev.get('metrics:color') : vDev.get('metrics:color');
            vN = _.isNaN(parseFloat(valNew))? valNew : parseFloat(valNew);
        
        switch (devType) {
            case 'switchRGBW':
                vO = vDev.get('metrics:color');
                return _.isEqual(vO,vN);
            case 'switchControl':
                if (_.contains(['on','off'], vN)) {
                    vO = vDev.get('metrics:level');
                } else {
                    vO = vDev.get('metrics:change');
                }
                return vO !== vN;
            default:
                vO = vDev.get('metrics:level');
                return vO !== vN;
        }
    }
};

function setNewDeviceState(vDev, type, new_level){
    if (vDev && !!vDev) {
        switch(type) {
            case 'doorlock':
            case 'switchBinary':
                    vDev.performCommand(new_level);
                break;
            case 'switchMultilevel':
            case 'thermostat':
                    _.contains(['on','off'], new_level)? vDev.performCommand(new_level) : vDev.performCommand("exact", { level: new_level });
                break;                        
            case 'switchRGBW':
                    vDev.performCommand("exact", { color: new_level}); //{r:, g:, b:}
                break;
            case 'switchControl':
                if (_.contains(["on", "off"], new_level)) {
                    vDev.performCommand(new_level);
                } else if (_.contains(["upstart", "upstop", "downstart", "downstop"], new_level)) {
                    vDev.performCommand("exact", { change: new_level });
                }
                break;
            case 'toggleButton':
                vDev.performCommand('on');
                break;
            default:
                vDev.performCommand(new_level);
        }
    }

    /*if (vDev.get("deviceType") === type && (type === "switchMultilevel" || type === "thermostat" || type === "switchRGBW")) {
        if (new_level === 'on' || new_level === 'off'){
            vDev.performCommand(new_level);
        } else if (typeof new_level === 'object') {
            vDev.performCommand("exact", new_level);
        } else {
            vDev.performCommand("exact", { level: new_level });
        }
    } else if (vDev.get("deviceType") === "toggleButton" && type === "scene") {
        vDev.performCommand("on");
    } else if (vDev.get("deviceType") === type) {
        vDev.performCommand(new_level);
    }*/
};

function getConfigTimeout (configTimeout) {
    return !!!configTimeout? 0 : Math.floor(configTimeout * 1000); // !!! > proof for undefined and null
};

function executeActions (compareLevelsFirst, vDev, targetValue) {
    return (!compareLevelsFirst || (compareLevelsFirst && compareValues(vDev, targetValue)));
};

function compareSwitchControl (vDev, targetValue) {
    if (!!vDev && vDev) {
        return (_.contains(["on", "off"], targetValue) && vDev.get('metrics:level') === targetValue) || (_.contains(["upstart", "upstop", "downstart", "downstop"], targetValue) && vDev.get("metrics:change") === targetValue)
    } else {
        return false;
    }
};

function compareTime (operator) {
    /*var curTime = new Date(),
        time_arr = test.testTime.testValue.split(":").map(function(x) { return parseInt(x, 10); });
        res = res || self.op(curTime.getHours() * 60 + curTime.getMinutes(), test.testOperator, time_arr[0] * 60 + time_arr[1]);*/
    var curTime = new Date(),
        time_arr = test.testTime.testValue.split(":").map(function(x) { return parseInt(x, 10); });
    
    return op(curTime.getHours() * 60 + curTime.getMinutes(), operator, time_arr[0] * 60 + time_arr[1]);
};