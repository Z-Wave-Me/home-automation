/*** LogicalRules Z-Way HA module *******************************************

Version: 1.2.1
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>, Niels Roche <nir@zwave.eu>, Yurkin Vitaliy <aivs@z-wave.me>
Description:
    Implements logical rules and activates scene on rule match.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function LogicalRules (id, controller) {
    // Call superconstructor first (AutomationModule)
    LogicalRules.super_.call(this, id, controller);

    var self = this;
    
    this.attachedList = [];
    
    this._testRule = function () { // wrapper to correct this and parameters in testRule
        self.testRule.call(self, null);
    };
}

inherits(LogicalRules, AutomationModule);

_module = LogicalRules;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

LogicalRules.prototype.init = function (config) {
    LogicalRules.super_.prototype.init.call(this, config);

    var self = this;
    
    this.config.tests.forEach(function(test) {
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
                }
            });
        }
    });    

    if (this.config.eventSource) {
        this.config.eventSource.forEach(function(scene) {
            self.controller.devices.on(scene, "change:metrics:level", self._testRule);
        });
    }
};

LogicalRules.prototype.stop = function () {
    var self = this;
    
    if (this.config.eventSource) {
        this.config.eventSource.forEach(function(scene) {
            self.controller.devices.off(scene, "change:metrics:level", self._testRule);
        });
    }
     
    this.config.tests.forEach(function(test) {
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
                }
            });
        }
    });

    this.attachedList = [];
    
    LogicalRules.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

LogicalRules.prototype.attachDetach = function (test, attachOrDetach) {
    if (this.config.triggerOnDevicesChange === false) { // this condition is used to allow empty triggerOnDevicesChange if old LogicalRules is used
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

LogicalRules.prototype.testRule = function (tree) {
    var res = null,
        topLevel = !tree;
        self = this;
    
    if (!tree) {
        tree = this.config;
    }
    
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
    
        tree.tests.forEach(function(test) {
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
    
    if (topLevel && res) {
        tree.action.switches && tree.action.switches.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
                    vDev.performCommand(devState.status);
                }
            }
        });
        tree.action.dimmers && tree.action.dimmers.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
                    vDev.performCommand("exact", { level: devState.status });
                }
            }
        });
        tree.action.locks && tree.action.locks.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                if (!devState.sendAction || (devState.sendAction && vDev.get("metrics:level") != devState.status)) {
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
    }

    return res;
};

LogicalRules.prototype.op = function (dval, op, val) {
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
