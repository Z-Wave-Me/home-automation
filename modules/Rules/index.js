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

	this._testRule = function() { // wrapper to correct this and parameters in testRule
	    self.testRule.call(self, null);
	}
}

inherits(Rules, AutomationModule);

_module = Rules;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Rules.prototype.init = function (config) {
	Rules.super_.prototype.init.call(this, config);

	var self = this,
		ifElement = self.config.sourceDevice[self.config.sourceDevice.filterIf],
        breverse = self.config.reverse.activate,
        badvanced = self.config.advanced.activate;

	this.handlerLevel = function (sDev) {
		var that = self,
			operator = ifElement.operator,
			ifLevel = (ifElement.status === 'level' && ifElement.level) || (!ifElement.status && ifElement.level) ? ifElement.level : ifElement.status,
			check = false,
			value = sDev.get("metrics:level");

        // - IF-THEN-PART
        if (operator && ifLevel) {
            switch (operator) {
                case '>':
                    check = value > ifLevel;
                    break;
                case '=':
                    check = value === ifLevel;
                    break;
                case '<':
                    check = value < ifLevel;
                    break;
            }
        }
        if (!badvanced) {
            if (check || value === ifLevel || sDev.get('deviceType') === 'toggleButton') {
                var timeout = typeof self.config.delay.eventstart === 'undefined' ? 0 : (self.config.delay.eventstart * 1000);
                this.timer = setTimeout( function() {
                    self.config.targets.elements.forEach(function(el) {
                        var type = el.filterThen;

                        if (type === "notification") {
                            if (typeof el.notification.target !== 'undefined' || typeof el.notification.mail_to_input !== 'undefined') {
                                var mail;
                                if (el.notification.target.search('@') > 0 || (mail = typeof el.notification.mail_to_input !== 'undefined')) {
                                    self.addNotification('mail.notification', typeof el.notification.message === 'undefined' ? 'Source: ' + JSON.stringify(self.config.sourceDevice) + ' Target: ' + JSON.stringify(self.config.targets.elements) : el.notification.message, mail ? el.notification.mail_to_input : el.notification.target);
                                } else {
                                    self.addNotification('push.notification', typeof el.notification.message === 'undefined' ? 'Source: ' + JSON.stringify(self.config.sourceDevice) + ' Target: ' + JSON.stringify(self.config.targets.elements) : el.notification.message, el.notification.target);
                                }
                            }
                        } else {
                            var id = el[type].target,
                                lvl = el[type].status === 'level' && el[type].level? el[type].level : (el[type].status === 'color' && el[type].color? el[type].color: el[type].status),
                                vDev = that.controller.devices.get(id),
                                set = compareValues(vDev.get("metrics:level"), lvl);

                            if (breverse && el.reverseLVL === 'undefined') { el.reverseLVL = vDev.get("metrics:level"); }
                            if (vDev && (!el[type].sendAction || (el[type].sendAction && set))){ setNewDeviceState(vDev, type, lvl); }
                        }
                    });
                }, timeout);
            } else if (breverse && !check) {
                this.timer = setTimeout( function() {
                    self.config.targets.elements.forEach(function(el) {
                        var type = el.filterThen,
                            origin = el.reverseLVL;

                        if(type !== "notification" || origin !== 'undefined') {
                            var id = el[type].target,
                                vDev = that.controller.devices.get(id),
                                set = compareValues(vDev.get("metrics:level"), origin);

                            el.reverseLVL = 'undefined';
                            if (vDev && (!el[type].sendAction || (el[type].sendAction && set))){ setNewDeviceState(vDev, type, origin); }
                        }
                    });
                }, timeout);
            }
        }
	};

    if(badvanced)
    { // - LOGICAL-RULES-PART
        this.config.advanced.tests.forEach(function(test) {
            if (test.testType === "binary") {
                self.attachDetach(test.testBinary, true);
            } else if (test.testType === "multilevel") {
                self.attachDetach(test.testMultilevel, true);
            } else if (test.testType === "remote") {
                self.attachDetach(test.testRemote, true);
            } else if (test.testType === "nested") {
                test.testNested.tests.forEach(function(xtest) {
                    if (xtest.testType === "binary") {
                        self.attachDetach(xtest.testBinary, true);
                    } else if (xtest.testType === "multilevel") {
                        self.attachDetach(xtest.testMultilevel, true);
                    } else if (xtest.testType === "remote") {
                        self.attachDetach(xtest.testRemote, true);
                    } else if ( xtest.testType === "time") {
                        self.attachDetach(xtest.testTime, true);
                    }
                });
            }
        });

        if (this.config.advanced.eventSource) {
            this.config.advanced.eventSource.forEach(function(scene) {
                self.controller.devices.on(scene, "change:metrics:level", self._testRule);
            });
        }
    }

	// Setup metric update event listener
	if (!badvanced && ifElement && ifElement.device){
		self.controller.devices.on(ifElement.device, 'change:metrics:level', self.handlerLevel);
	}
};

Rules.prototype.stop = function () {
	var self = this;

    if(this.config.advanced.activate) {
        if (this.config.advanced.eventSource) {
            this.config.advanced.eventSource.forEach(function(scene) {
                self.controller.devices.off(scene, "change:metrics:level", self._testRule);
            });
        }

        this.config.advanced.tests.forEach(function(test) {
            if (test.testType === "binary") {
                self.attachDetach(test.testBinary, false);
            } else if (test.testType === "multilevel") {
                self.attachDetach(test.testMultilevel, false);
            } else if (test.testType === "remote") {
                self.attachDetach(test.testRemote, false);
            } else if (test.testType === "nested") {
                test.testNested.tests.forEach(function(xtest) {
                    if (xtest.testType === "binary") {
                        self.attachDetach(xtest.testBinary, false);
                    } else if (xtest.testType === "multilevel") {
                        self.attachDetach(xtest.testMultilevel, false);
                    } else if (xtest.testType === "remote") {
                        self.attachDetach(xtest.testRemote, false);
                    } else if(xtest.testType === "time") {
                        self.attachDetach(xtest.testTime, false);
                    }
                });
            }
        });

        this.attachedList = [];

    } else {
        // remove event listener
        self.controller.devices.off(self.config.sourceDevice[self.config.sourceDevice.filterIf].device,'change:metrics:level', self.handlerLevel);
    }

	Rules.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// compare old and new level to avoid unnecessary updates
function compareValues(valOld,valNew){
    var vO = _.isNaN(parseFloat(valOld))? valOld : parseFloat(valOld),
        vN = _.isNaN(parseFloat(valNew))? valNew : parseFloat(valNew);

    return vO !== vN;
}

function setNewDeviceState(vDev, target, new_level){
    if (vDev.get("deviceType") === target && (target === "switchMultilevel" || target === "thermostat" || target === "switchRGBW")) {
        if (new_level === 'on' || new_level === 'off'){
            vDev.performCommand(new_level);
        } else if (typeof new_level === 'object') {
            vDev.performCommand("exact", new_level);
        } else {
            vDev.performCommand("exact", { level: new_level });
        }
    } else if (vDev.get("deviceType") === "toggleButton" && target === "scene") {
        vDev.performCommand("on");
    } else if (vDev.get("deviceType") === target) {
        vDev.performCommand(new_level);
    }
}

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
		langFile = self.loadModuleLang()
		breverse = self.config.reverse.activate,
		timeout = typeof self.config.advanced.delay.eventstart === 'undefined' ? 0 : (self.config.advanced.delay.eventstart * 1000);

    if (!tree) { tree = this.config.advanced; }

    if (tree.logicalOperator === "and") {
        res = true;

        tree.tests.forEach(function(test) {
            if (test.testType === "multilevel") {
                res = res && self.op(self.controller.devices.get(test.testMultilevel.device).get("metrics:level"), test.testMultilevel.testOperator, test.testMultilevel.testValue);
            } else if (test.testType === "binary") {
                res = res && (self.controller.devices.get(test.testBinary.device).get("metrics:level") === test.testBinary.testValue);
            } else if (test.testType === "remote") {
                var dev = self.controller.devices.get(test.testRemote.device);
                res = res && ((_.contains(["on", "off"], test.testRemote.testValue) && dev.get("metrics:level") === test.testRemote.testValue) || (_.contains(["upstart", "upstop", "downstart", "downstop"], test.testRemote.testValue) && dev.get("metrics:change") === test.testRemote.testValue));
            } else if (test.testType === "time") {
                var curTime = new Date(),
                    time_arr = test.testTime.testValue.split(":").map(function(x) { return parseInt(x, 10); });
                res = res && self.op(curTime.getHours() * 60 + curTime.getMinutes(), test.testTime.testOperator, time_arr[0] * 60 + time_arr[1]);
            } else if (test.testType === "nested") {
                res = res && self.testRule(test.testNested);
            }
        });
    } else if (tree.logicalOperator === "or") {
        res = false;

        tree.conditions.tests.forEach(function(test) {
            if (test.testType === "multilevel") {
                res = res || self.op(self.controller.devices.get(test.testMultilevel.device).get("metrics:level"), test.testMultilevel.testOperator, test.testMultilevel.testValue);
            } else if (test.testType === "binary") {
                res = res || (self.controller.devices.get(test.testBinary.device).get("metrics:level") === test.testBinary.testValue);
            } else if (test.testType === "remote") {
                var dev = self.controller.devices.get(test.testRemote.device);
                res = res || ((_.contains(["on", "off"], test.testRemote.testValue) && dev.get("metrics:level") === test.testRemote.testValue) || (_.contains(["upstart", "upstop", "downstart", "downstop"], test.testRemote.testValue) && dev.get("metrics:change") === test.testRemote.testValue));
            } else if (test.testType === "time") {
                var curTime = new Date(),
                    time_arr = test.testTime.testValue.split(":").map(function(x) { return parseInt(x, 10); });
                res = res || self.op(curTime.getHours() * 60 + curTime.getMinutes(), test.testTime.testOperator, time_arr[0] * 60 + time_arr[1]);
            } else if (test.testType === "nested") {
                res = res || self.testRule(test.testNested);
            }
        });
    }
    else if (tree.conditions.logicalOperator === " none")
    {
        self.controller.addNotification("error", langFile.WrongOperator, "module", "Rules");
    }

    if (topLevel && res) {
        this.advancedtimer = setTimeout( function() {
            tree.action.switches && tree.action.switches.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (breverse && devState.reverseLVL === 'undefined') { devState.reverseLVL = vDev.get("metrics:level"); }
                    if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
                        vDev.performCommand(devState.status);
                    }
                }
            });
            tree.action.dimmers && tree.action.dimmers.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (breverse && devState.reverseLVL === 'undefined') { devState.reverseLVL = vDev.get("metrics:level"); }
                    if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
                        vDev.performCommand("exact", { level: devState.status });
                    }
                }
            });
            tree.action.thermostats && tree.action.thermostats.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (breverse && devState.reverseLVL === 'undefined') { devState.reverseLVL = vDev.get("metrics:level"); }
                    if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
                        vDev.performCommand("exact", { level: devState.status });
                    }
                }
            });
            tree.action.locks && tree.action.locks.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (breverse && devState.reverseLVL === 'undefined') { devState.reverseLVL = vDev.get("metrics:level"); }
                    if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") !== devState.status)) {
                        vDev.performCommand(devState.status);
                    }
                }
            });
            tree.action.scenes && tree.action.scenes.forEach(function(scene) {
                var vDev = self.controller.devices.get(scene);
                if (vDev) {
                    vDev.performCommand("on");
                }
            });
            tree.action.notification && tree.action.notification.forEach(function(notification) {
                if(typeof notification.target !== 'undefined' || typeof notification.mail_to_input !== 'undefined') {
                    var mail;
                    if(notification.target.search('@') > 0 || (mail = typeof notification.mail_to_input !== 'undefined')) {
                        self.addNotification('mail.notification', typeof notification.message === 'undefined' ? 'Conditions: ' + JSON.stringify(self.config.conditions) + ' Actions: ' + JSON.stringify(self.config.action) : notification.message, mail ? notification.mail_to_input : notification.target);
                    } else {
                        self.addNotification('push.notification', typeof notification.message === 'undefined' ? 'Conditions: ' + JSON.stringify(self.config.conditions) + ' Actions: ' + JSON.stringify(self.config.action) : notification.message, notification.target);
                    }
                }
            });
        }, timeout);
    } else if (breverse && !res) {
        this.advancedtimer_reverse = setTimeout( function() {
            tree.action.switches && tree.action.switches.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (devState.reverseLVL !== 'undefined') {
                        vDev.performCommand(devState.reverseLVL);
                        devState.reverseLVL = 'undefined';
                    }
                }
            });
            tree.action.dimmers && tree.action.dimmers.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (devState.reverseLVL !== 'undefined') {
                        vDev.performCommand("exact", { level: devState.reverseLVL });
                        devState.reverseLVL = 'undefined';
                    }
                }
            });
            tree.action.thermostats && tree.action.thermostats.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (devState.reverseLVL !== 'undefined') {
                        vDev.performCommand("exact", { level: devState.reverseLVL });
                        devState.reverseLVL = 'undefined';
                    }
                }
            });
            tree.action.locks && tree.action.locks.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    if (devState.reverseLVL !== 'undefined') {
                        vDev.performCommand(devState.reverseLVL);
                        devState.reverseLVL = 'undefined';
                    }
                }
            });
        }, timeout);
    }

    return res;
};

Rules.prototype.op = function (dval, op, val) {
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