/*** PhilioHW Z-Way HA module *******************************************

Version: 1.0.1
(c) Z-Wave.Me, 2015
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Support for Philio hardware
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function PhilioHW (id, controller) {
    // Call superconstructor first (AutomationModule)
    PhilioHW.super_.call(this, id, controller);
}

inherits(PhilioHW, AutomationModule);

_module = PhilioHW;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

PhilioHW.prototype.init = function (config) {
    PhilioHW.super_.prototype.init.call(this, config);

    this.ZWAY_DATA_CHANGE_TYPE = {   
        "Updated": 0x01,       // Value updated or child created
        "Invalidated": 0x02,   // Value invalidated             
        "Deleted": 0x03,       // Data holder deleted - callback is called last time before being deleted
        "ChildCreated": 0x04,  // New direct child node created                                          
                                                                                                         
        // ORed flags                                                                                    
        "PhantomUpdate": 0x40, // Data holder updated with same value (only updateTime changed)          
        "ChildEvent": 0x80     // Event from child node                                                  
    };

    var self = this;

    this.bindings = [];

    this.zwayReg = function (zwayName) {
        var zway = global.ZWave && global.ZWave[zwayName].zway;
        
        if (!zway) {
            return;
        }
       
        if (!zway.ZMELEDBTN) {
            return;
        }

	self.bindings[zwayName] = [];

        if (zway.controller.data.philiohw) {
            self.registerButtons(zwayName);
        } else {
            self.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, "", function() {
                if (zway.controller.data.philiohw) {
                    self.controller.emit("ZWave.dataUnbind", self.bindings[zwayName]);
                    self.registerButtons(zwayName);
                }
            }, "");
            zway.ZMELEDBTN(true, 0x15, 0x10);
        }
    };
    
    this.zwayUnreg = function(zwayName) {
        // detach handlers
        if (self.bindings[zwayName]) {
            self.controller.emit("ZWave.dataUnbind", self.bindings[zwayName]);
        }
        self.bindings[zwayName] = null;
    };
    
    this.controller.on("ZWave.register", this.zwayReg);
    this.controller.on("ZWave.unregister", this.zwayUnreg);

    // walk through existing ZWave
    if (global.ZWave) {
        for (var name in global.ZWave) {
            this.zwayReg(name);
        }
    }
}

PhilioHW.prototype.stop = function () {
    // unsign event handlers
    this.controller.off("ZWave.register", this.zwayReg);
    this.controller.off("ZWave.unregister", this.zwayUnreg);

    // detach handlers
    for (var name in this.bindings) {
        this.controller.emit("ZWave.dataUnbind", this.bindings[name]);
    }
    
    this.bindings = [];

    PhilioHW.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

PhilioHW.prototype.registerButtons = function(zwayName) {
    var self = this;

    global.ZWave[zwayName].zway.ZMELEDBTN(0, 0x11, 0x20); // breathing LED

    this.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, "philiohw.tamper.state", function(type) {
        switch (this.value) {
            case 0:
                self.controller.addNotification("warning", "Controller removed from wall", "module", "PhilioHW");
                global.ZWave[zwayName].zway.ZMELEDBTN(0, 0x11, 0x10);
                break;
            case 2:
                self.controller.addNotification("warning", "Controller returned to normal position", "module", "PhilioHW");
                global.ZWave[zwayName].zway.ZMELEDBTN(0, 0x11, 0x20);
                break;
        }
    }, "");

    this.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, "philiohw.funcA.state", function(type) {
        switch (this.value) {
            case 3:
                system("/etc/btnd/wps_click.sh");
                break;
        }
    }, "");

    this.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, "philiohw.funcB.state", function(type) {
        switch (this.value) {
            case 3:
                if (global.ZWave[zwayName].zway.controller.data.controllerState.value === 0) {
                    global.ZWave[zwayName].zway.AddNodeToNetwork(true, true);
                } else if (global.ZWave[zwayName].zway.controller.data.controllerState.value === 1) {
                    global.ZWave[zwayName].zway.AddNodeToNetwork(false, false);
                }
                break;
            case 2:
                if (global.ZWave[zwayName].zway.controller.data.controllerState.value === 0) {
                    global.ZWave[zwayName].zway.RemoveNodeFromNetwork(true, true);
                } else if (global.ZWave[zwayName].zway.controller.data.controllerState.value === 5) {
                    global.ZWave[zwayName].zway.RemoveNodeFromNetwork(false, false);
                }
                break;
        }
    }, "");

    this.controller.emit("ZWave.dataBind", self.bindings[zwayName], zwayName, "controllerState", function(type) {
        if (this.value == 0) {
            global.ZWave[zwayName].zway.ZMELEDBTN(0, 0x10, 0x02); // idle
        } else if (this.value >= 1 && this.value <= 4) {
            global.ZWave[zwayName].zway.ZMELEDBTN(0, 0x10, 0x08); // including
        } else if (this.value >= 5 && this.value <= 7) {
            global.ZWave[zwayName].zway.ZMELEDBTN(0, 0x10, 0x10); // excluding
        } else {
            global.ZWave[zwayName].zway.ZMELEDBTN(0, 0x10, 0x20); // other
        }
    }, "");
};
