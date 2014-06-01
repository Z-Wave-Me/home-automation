/*** ImportRemoteHA Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Imports devices from remote HA engine
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function ImportRemoteHA (id, controller) {
    // Call superconstructor first (AutomationModule)
    ImportRemoteHA.super_.call(this, id, controller);
    
    this.dT = 500; // 500 ms minimal delay between requests
}

inherits(ImportRemoteHA, AutomationModule);

_module = ImportRemoteHA;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------


////!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// Early creation !!!!!!!!!!!!!!!!!!!!!!!


ImportRemoteHA.prototype.init = function (config) {
    ImportRemoteHA.super_.prototype.init.call(this, config);

    var self = this;
    
    this.urlPrefix = this.config.url + "/ZAutomation/api/v1/devices";
    this.timestamp = 0;
    this.lastRequest = 0;
    this.timer = null;

    this.requestUpdate();
};

ImportRemoteHA.prototype.stop = function () {
    if (this.timer) {
        clearInterval(this.timer);
    }
    
    this.controller.devices.remove("HTTP_Device_" + this.config.deviceType + "_" + this.id); // !!!!!!!!!!!!!!!!!!!!!!!!
    
    ImportRemoteHA.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

ImportRemoteHA.prototype.requestUpdate = function () {
    var self = this;
    
    this.lastRequest = Date.now();
    
    http.request({
        url: this.urlPrefix + "?since=" + this.timestamp.toString(),
        method: "GET",
        async: true,
        success: function(response) {
            self.parseResponse(response)
        },
        error: function(response) {
            console.log("Can not make request: " + response.statusText); // don't add it to notifications, since it will fill all the notifcations on error
        },
        complete: function() {
            var dt = self.lastRequest + self.dT - Date.now();
            if (dt < 0) {
                dt = 1; // in 1 ms not to make recursion
            }
            
            if (self.timer) {
                clearInterval(self.timer);
            }
            
            self.timer = setInterval(function() {
                self.requestUpdate();
            }, dt);
        }
    });
};

ImportRemoteHA.prototype.parseResponse = function (response) {
    var self = this;
    
    if (response.status === 200, response.contentType === "application/json") {
        var data = response.data.data;
        
        this.timestamp = data.updateTime;
        
        data.devices.forEach(function(item) {
            var vDev = self.controller.devices.get("Remote_" + self.id + "_" + item.id);
            
            if (vDev) {
                for (var m in item.metrics) {
                    if (vDev.get("metrics:" + m) !== item.metrics[m]) {
                        vDev.set("metrics:" + m, item.metrics[m]);
                    }
                }
            } else {
                self.controller.devices.create("Remote_" + self.id + "_" + item.id, {
                    deviceType: item.deviceType,
                    metrics: item.metrics
                }, function(command, args) {
                    var argsFlat = "";
                    if (args) {
                        for (var key in args) {
                            argsFlat = (argsFlat ? "&" : "?") + key.toString() + "=" + args[key].toString();
                        }
                    }
                    
                    var remoteId = this.id.slice(("Remote_" + self.id + "_").length); // here this refers to current vDev
                    
                    http.request({
                        url: self.urlPrefix + "/" + remoteId + "/command/" + command + argsFlat,
                        method: "GET",
                        async: true,
                        error: function(response) {
                            console.log("Can not make request: " + response.statusText); // don't add it to notifications, since it will fill all the notifcations on error
                        }
                    });
                });
            }
        });
        
        if (data.structureChanged) {
            var removeList = this.controller.devices.filter(function(xDev) {
                var remove = false;
                
                if (xDev.id.indexOf("Remote_" + self.id + "_") === 0) {
                	return;
               	}

                data.devices.forEach(function(item) {
                    if (item.id === xDev.id) {
                        remove = true;
                        return false; // break
                    }
                });
                return !remove;
            }).map(function(yDev) { return yDev.id });
            
            removeList.forEach(function(item) {
                self.controller.devices.remove(item);
            });
        }
    }
};
