/*** SecurityMode Z-Way HA module *******************************************

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

function SecurityMode (id, controller) {
    // Call superconstructor first (AutomationModule)
    SecurityMode.super_.call(this, id, controller);

    var self = this;
    

    this._testRule = function () { // wrapper to correct this and parameters in testRule
        self.testRule.call(self, null);
    };
}

inherits(SecurityMode, AutomationModule);

_module = SecurityMode;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SecurityMode.prototype.init = function (config) {
    SecurityMode.super_.prototype.init.call(this, config);

    var self = this;

    this.api_key = config.action.api_key.toString();
    this.phone = config.action.phone.toString();
    this.message = config.action.message.toString();

    this.vDev = this.controller.devices.create(
        "SecurityMode_"+ this.id, {
        deviceType: "switchBinary",
        metrics: {
            probeTitle: '',
            scaleTitle: '',
            level: 'off',
            icon: '',
            title: 'SecurityMode ' + this.id
        }
    }, function(command, args) {
        this.set("metrics:level", command);
    });

    self.attachDetach(this.vDev.id, true);

    this.config.tests.forEach(function(test) {
        if (test.testType === "binary") {
            self.attachDetach(test.testBinary, true);
        } else if (test.testType === "multilevel") {
            self.attachDetach(test.testMultilevel, true);
        } else if (test.testType === "remote") {
            self.attachDetach(test.testRemote, true);
        }
    });    
};

SecurityMode.prototype.stop = function () {
    var self = this;

    if (this.vDev) {
        self.attachDetach(this.vDev.id, true);
    }
    
    this.config.tests.forEach(function(test) {
        if (test.testType === "binary") {
            self.attachDetach(test.testBinary, false);
        } else if (test.testType === "multilevel") {
            self.attachDetach(test.testMultilevel, false);
        } else if (test.testType === "remote") {
            self.attachDetach(test.testRemote, false);
        }
    });

    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    SecurityMode.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

SecurityMode.prototype.attachDetach = function (test, attachOrDetach) {
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

    if (vDev.get("deviceType") === "switchControl") {
        if (attachOrDetach) {
            vDev.on("change:metrics:change", this._testRule);
        } else {
            vDev.off("change:metrics:change", this._testRule);
        }
    }
};

SecurityMode.prototype.testRule = function (tree) {

    var res = null,
        topLevel = !tree;
        self = this;
    
    if (!tree) {
        tree = this.config;
    }
    
    if (this.vDev.get("metrics:level") == "off")
        return;

    res = false;
    tree.tests.forEach(function(test) {
        if (test.testType === "multilevel") {
            res = res || self.op(self.controller.devices.get(test.testMultilevel.device).get("metrics:level"), test.testMultilevel.testOperator, test.testMultilevel.testValue);
        } else if (test.testType === "binary") {
            res = res || (self.controller.devices.get(test.testBinary.device).get("metrics:level") === test.testBinary.testValue);
        } else if (test.testType === "remote") {
            var dev = self.controller.devices.get(test.testRemote.device);
            res = res || ((_.contains(["on", "off"], test.testRemote.testValue) && dev.get("metrics:level") === test.testRemote.testValue) || (_.contains(["upstart", "upstop", "downstart", "downstop"], test.testRemote.testValue) && dev.get("metrics:change") === test.testRemote.testValue));
        }
    });
    
    
    if (topLevel && res) {
        var self = this;

        http.request({
            method: 'POST',
            url: "http://sms.ru/sms/send",
            data: {
                api_id: self.api_key,
                to: self.phone,
                text: self.message
            }
        });

        tree.action.switches.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                vDev.performCommand(devState.status);
            }
        });
        tree.action.dimmers.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                vDev.performCommand("exact", { level: devState.status });
            }
        });
        tree.action.locks.forEach(function(devState) {
            var vDev = self.controller.devices.get(devState.device);
            if (vDev) {
                vDev.performCommand(devState.status);
            }
        });
        tree.action.scenes.forEach(function(scene) {
            var vDev = self.controller.devices.get(scene);
            if (vDev) {
                vDev.performCommand("on");
            }
        });
    }
};

SecurityMode.prototype.op = function (dval, op, val) {
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
