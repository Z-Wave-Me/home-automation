/*** SR201Device Z-Way HA module *******************************************
Version: 2.3.8
(c) Z-Wave.Me, 2019
-----------------------------------------------------------------------------
Author: Jorge Rivera
Homepage: https://github.com/latchdevel/home-automation/tree/SR201Device
Description:
    Implements a binnary switch based on one relay channel of SR-201 ethernet relay board
******************************************************************************/
// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SR201Device (id, controller) {
    // Call superconstructor first (AutomationModule)
    SR201Device.super_.call(this, id, controller);
}

inherits(SR201Device, AutomationModule);

_module = SR201Device;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SR201Device.prototype.init = function (config) {
    SR201Device.super_.prototype.init.call(this, config);

    var self = this,
        icon = "",
        level = "",
        deviceType = this.config.deviceType;
        icon = "switch";
        level = "off";

    var defaults = {
        metrics: {
            title: self.getInstanceTitle()
        }
    };

    var overlay = {
            deviceType: deviceType,
            metrics: {
                icon: icon,
                level: level
            }
    };

    var vDev = self.controller.devices.create({
        deviceId: "SR201_Device_" + deviceType + "_" + this.id,
        defaults: defaults,
        overlay: overlay,
        handler: function (command, args) {

            if (command === "update") {
                self.update(this);
            }

            if (command === "on") {
                self.act(this, "On", null, "on" );
            }

            if (command === "off") {
                self.act(this, "Off", null, "off");
            }

        },
        moduleId: this.id
    });

    if (vDev && this.config["getterPollInterval_" + deviceType]) {
        this.timer = setInterval(function() {
            self.update(vDev);
        }, this.config["getterPollInterval_" + deviceType] * 1000);
    }
};

SR201Device.prototype.stop = function () {
    if (this.timer) {
        clearInterval(this.timer);
    }
    this.controller.devices.remove("SR201_Device_" + this.config.deviceType + "_" + this.id);

    SR201Device.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

SR201Device.prototype.update = function (vDev) {
    var self = this,
        deviceIp = this.config["deviceIp"].trim(),
        devicePort = parseInt(this.config["devicePort"]),
        channelNumber = parseInt(this.config["channelNumber"]);

    //addon get device name for detail error log
    var deviceName = vDev.get("metrics:title") == "" ? "Unknow device" : vDev.get("metrics:title");

    if ( !!deviceIp && Number.isInteger(devicePort) && devicePort > 0 && devicePort < 65536 ) {

        var client = new sockets.tcp();
        var result = null;

        client.onconnect = function() {
            this.send("00");
        };

        client.onrecv = function(data) {

            var msg = String.fromCharCode.apply(null, new Uint8Array(data));
            
            if (msg.length === 8){

                if (msg[channelNumber-1] === "1"){
                    result = "on";
                }else{
                    if (msg[channelNumber-1] === "0"){
                        result = "off";
                    }
                }

                if (result){
                    if ((self.config.skipEventIfSameValue !== true || result !== vDev.get("metrics:level"))) {
                        vDev.set("metrics:level", result);
                    }
                }else{
                    self.addNotification("error", deviceName + ": Invalid response parse: " + msg);
                    result = "error";
                } 

            }else{
                self.addNotification("error", deviceName + ": Invalid response: " + msg);
                result = "error";
            }

            this.close();
        
        };

        client.onclose = function() {   
            if (!result){
                self.addNotification("error", deviceName + ": Unable to connect. Host: " + deviceIp + " TCP port: " + devicePort );
            }
            this.close();
        };

        client.connect(deviceIp,devicePort);

    }else{
        self.addNotification("error", deviceName + ": Invalid config params. Host: " + this.config["deviceIp"] + " TCP port: " + this.config["devicePort"] );
    }
};

SR201Device.prototype.act = function (vDev, action, subst, selfValue) {
    var self = this,
        deviceIp = this.config["deviceIp"].trim(),
        devicePort = parseInt(this.config["devicePort"]),
        channelNumber = parseInt(this.config["channelNumber"]);
        deviceAction = action.toString().toLowerCase();

    //addon get device name for detail error log
    var deviceName = vDev.get("metrics:title") == "" ? "Unknow device" : vDev.get("metrics:title");

    /*
    console.log("DEBUG: (act) deviceName: " + deviceName );
    console.log("DEBUG: (act) deviceIP:   " + deviceIp );
    console.log("DEBUG: (act) devicePort: " + devicePort.toString() );
    console.log("DEBUG: (act) channelNumber: " + channelNumber.toString() );
    console.log("DEBUG: (act) action: " + action.toString().toLowerCase() );
    */

    if ( !!deviceIp && Number.isInteger(devicePort) && devicePort > 0 && devicePort < 65536 ) {

        var cmd = null;

        if (deviceAction === "on"){ 
            cmd = (10 + channelNumber).toString()
        }else{
            if (deviceAction === "off"){ 
                cmd = (20 + channelNumber).toString()
            }
        }

        if (cmd){ 
        
            var client = new sockets.tcp();
            var result = null;

            client.onconnect = function() {
                this.send(cmd);
            };

            client.onrecv = function(data) {

                var msg = String.fromCharCode.apply(null, new Uint8Array(data));
                
                if (msg.length === 8){

                    if (msg[channelNumber-1] === "1"){
                        result = "on";
                    }else{
                        if (msg[channelNumber-1] === "0"){
                            result = "off";
                        }
                    }

                    if (result === deviceAction){
                        if ((self.config.skipEventIfSameValue !== true || result !== vDev.get("metrics:level"))) {
                            vDev.set("metrics:level", result);
                        }
                    }else{
                        self.addNotification("error", deviceName + ": Unable to set device: " + action);
                        result = "error";
                    } 

                }else{
                    self.addNotification("error", deviceName + ": Invalid response: " + msg);
                    result = "error";
                }

                this.close();
            
            };

            client.onclose = function() {   
                if (!result){
                    self.addNotification("error", deviceName + ": Unable to connect. Host: " + deviceIp + " TCP port: " + devicePort );
                }
                this.close();
            };

            client.connect(deviceIp,devicePort);
        
        }else{
            self.addNotification("error", deviceName + ": Invalid action: " + deviceAction );
        }
    }else{
        self.addNotification("error", deviceName + ": Invalid config params. Host: " + this.config["deviceIp"] + " TCP port: " + this.config["devicePort"] );
    }
};

