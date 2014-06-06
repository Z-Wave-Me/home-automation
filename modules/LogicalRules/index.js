/*** LogicalRules Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
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
                if (test.testType === "binary") {
                    self.attachDetach(test.testBinary, true);
                } else if (test.testType === "multilevel") {
                    self.attachDetach(test.testMultilevel, true);
                } else if (test.testType === "remote") {
                    self.attachDetach(test.testRemote, true);
                }
            });
        }
    });    
};

LogicalRules.prototype.stop = function () {
    var self = this;
    
    this.config.tests.forEach(function(test) {
        if (test.testType === "binary") {
            self.attachDetach(test.testBinary, false);
        } else if (test.testType === "multilevel") {
            self.attachDetach(test.testMultilevel, false);
        } else if (test.testType === "remote") {
            self.attachDetach(test.testRemote, false);
        } else if (test.testType === "nested") {
            test.testNested.tests.forEach(function(xtest) {
                if (test.testType === "binary") {
                    self.attachDetach(test.testBinary, false);
                } else if (test.testType === "multilevel") {
                    self.attachDetach(test.testMultilevel, false);
                } else if (test.testType === "remote") {
                    self.attachDetach(test.testRemote, false);
                }
            });
        }
    });

    LogicalRules.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

LogicalRules.prototype.attachDetach = function (test, attachOrDetach) {
    var vDev = this.controller.devices.get(test.device);
    
    if (!vDev) {
        this.controller.addNotification("error", "Can not get vDev " + test.device, "module");
        return;
    }
    
    if (attachOrDetach) {
        vDev.on("change:metrics:level", this._testRule);
    } else {
        vDev.off("change:metrics:level", this._testRule);
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
    
-        tree.tests.forEach(function(test) {
            if (test.testType === "multilevel") {
                res = res && self.op(self.controller.devices.get(test.testMultilevel.device).get("metrics:level"), test.testMultilevel.testOperator, test.testMultilevel.testValue);
            } else if (test.testType === "binary") {
                res = res && (self.controller.devices.get(test.testBinary.device).get("metrics:level") === test.testBinary.testValue);
            } else if (test.testType === "remote") {
                res = res && (self.controller.devices.get(test.testRemote.device).get("metrics:level") === test.testRemote.testValue);
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
                res = res || (self.controller.devices.get(test.testRemote.device).get("metrics:level") === test.testRemote.testValue);
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
        this.controller.devices.get(tree.action).performCommand("on");
    }
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
