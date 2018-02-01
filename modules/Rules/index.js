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
            "triggerOnDevicesChange" : true
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
        } else if (ifType === 'switchRGBW') {
            check = _.isEqual(sDev.get("metrics:color"), ifLevel);
        }
        
        var triggerTimeout = getConfigTimeout(simple.triggerDelay);
        var reverseTimeout = getConfigTimeout(simple.reverseDelay);

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
                    var vDev = self.controller.devices.get(el.deviceId),
                        id = el.deviceId,
                        set = executeActions(el.sendAction, vDev, el.level);

                    // check if levels are equal and if active don't trigger new state
                    if (vDev && set) {
                        setNewDeviceState(vDev, el.deviceType, el.level);
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
                self.attachDetach(scene, false);
            });
        }

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

    this.reversActivated = false;

	Rules.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

Rules.prototype.expertTriggerEventRule = function () {
    var self = this;
    console.log('### expertTriggerEventRule ... ');

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
Rules.prototype.attachDetach = function (test, attachOrDetach) {
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

Rules.prototype.testRule = function (tree) {
    var res = null,
        topLevel = !tree,
        self = this,
		langFile = self.loadModuleLang(),
	    doReverse = self.config.reverse || false,
		triggerTimeout = getConfigTimeout(self.config.advanced.triggerDelay),
        reverseTimeout = getConfigTimeout(self.config.advanced.reverseDelay);

    // if tests are false check if advanced is active
    if (!!!tree) { tree = this.config.advanced; }

    // loop through all tests and proof conditions
    if (_.contains(["and", "or"],tree.logicalOperator)) {
        res = self.runTests[tree.logicalOperator].call(self, tree);
    }

    if (topLevel && res) {
        this.advancedTriggerTimer = setTimeout( function() {
            tree.targetElements.forEach(function (el){
                var vDev = self.controller.devices.get(el.deviceId),
                    set = el.sendAction? executeActions(el.sendAction, vDev, el.level) : true;
                if (vDev && set) {
                    setNewDeviceState(vDev, el.deviceType, el.level)
                }
            });

            tree.sendNotifications.forEach(function (notification) {
                sendNotification(notification, tree.tests, tree.targetElements);
            });

            self.reversActivated = true;

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
        }, reverseTimeout);
    }

    return res;
};

Rules.prototype.runTests = {
    "and": function(tree){
        var res = true,
            self = this;

        tree.tests.forEach(function(test) {
            var vDev = test.type !== 'nested'? self.controller.devices.get(test.deviceId) : null,
                level = !!vDev? vDev.get("metrics:level") : undefined;

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
                    res = res && op(level, test.operator, test.level);
                    break;
                case 'switchRGBW':
                    res = res && _.isEqual(vDev.get('metrics:color'), test.level);
                    break;
                case 'toggleButton':
                case 'switchControl':
                    res = res && compareSwitchControl(vDev,test.level);
                    break;
                case 'time':
                    res = res && compareTime(test.level, test.operator);
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
    "or": function(tree){
        var res = false,
            self = this;

        tree.tests.forEach(function(test) {
            var vDev = test.type !== 'nested'? self.controller.devices.get(test.deviceId) : null,
                level = !!vDev? vDev.get("metrics:level") : undefined;

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
                    res = res || op(level, test.operator, test.level);
                    break;
                case 'switchRGBW':
                    res = res || _.isEqual(vDev.get('metrics:color'), test.level);
                    break;
                case 'toggleButton':
                case 'switchControl':
                    res = res || compareSwitchControl(vDev,test.level);
                    break;
                case 'time':
                    res = res && compareTime(test.level, test.operator);
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

function compareTime (time, operator) {
    var curTime = new Date(),
        time_arr = time.split(":").map(function(x) { return parseInt(x, 10); });
    
    return op(curTime.getHours() * 60 + curTime.getMinutes(), operator, time_arr[0] * 60 + time_arr[1]);
};