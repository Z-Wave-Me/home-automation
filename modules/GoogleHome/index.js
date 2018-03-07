/*** GoogleHome Z-Way HA module *******************************************

 Version: 0.0.9 beta
 (c) Z-Wave.Me, 2017
 -----------------------------------------------------------------------------
 Author: Michael Hensche <mh@zwave.eu>
 Description:

 ******************************************************************************/

function GoogleHome (id, controller) {
    // Call superconstructor first (AutomationModule)
    GoogleHome.super_.call(this, id, controller);

    this.HomeGraphAPIKey = "AIzaSyADXWi1oA0o8_hzzzPK0tjuzL7_BAqYakk";
    this.SYNC_URL = "https://homegraph.googleapis.com/v1/devices:requestSync?key="

    // namespaces
    this.NAMESPACE_SYNC = "action.devices.SYNC";
    this.NAMESPACE_QUERY = "action.devices.QUERY";
    this.NAMESPACE_EXECUTE = "action.devices.EXECUTE";

    // supportted device types
    this.THERMOSTAT = "action.devices.types.THERMOSTAT";
    this.LIGHT = "action.devices.types.LIGHT";
    this.OUTLET = "action.devices.types.OUTLET";
    this.SWITCH = "action.devices.types.SWITCH";
    this.SCENE = "action.devices.types.SCENE";

    //actions
    this.ONOFF = "action.devices.traits.OnOff";
    this.BRIGHTNESS = "action.devices.traits.Brightness";
    this.COLORSPECTRUM = "action.devices.traits.ColorSpectrum";
    this.COLORTEMPERATURE = "action.devices.traits.ColorTemperature";
    this.SCENE_ACTION = "action.devices.traits.Scene";
    this.TEMPERATURE_SETTING = "action.devices.traits.TemperatureSetting";

    //commands
    this.HANDLE_ONOF = "action.devices.commands.OnOff";
    this.HANDLE_BRIGHTNESS_ABSOLUTE = "action.devices.commands.BrightnessAbsolute";
    this.HANDLE_COLOR_ABSOLUTE = "action.devices.commands.ColorAbsolute";
    this.HANDLE_THERMOSTAT_TEMPERATURE_SETPOINT = "action.devices.commands.ThermostatTemperatureSetpoint";
    this.HANDLE_THERMOSTAT_TEMPERATURE_SET_RANGE = "action.devices.commands.ThermostatTemperatureSetRange";
    this.HANDLE_THERMOSTAT_SET_MODE = "action.devices.commands.ThermostatSetMode";
    this.HANDLE_ACTIVATE_SCENE = "action.devices.commands.ActivateScene";

    this.whiteListDeviceType = [{"switchBinary":[]}, {"switchMultilevel":[]}, {"switchRGBW":[]}, /*{"toggleButton":[]}, {"thermostat": []}, {"sensorMultilevel": ["temperature"]}*/];

    this.CC = {
        "SwitchBinary": 0x25,
        "SwitchMultilevel": 0x26,
        "SwitchColor": 0x33,
        "SceneActivation": 0x2b,
        "ThermostatMode": 0x40,
        "ThermostatSetPoint": 0x43,
        "ThermostatFanMode": 0x44,
        "DoorLock": 0x62,
        "CentralScene": 0x5b,
    };
}

inherits(GoogleHome, AutomationModule);

_module = GoogleHome;

GoogleHome.prototype.init = function(config) {
    var self = this;

    GoogleHome.super_.prototype.init.call(this, config);

    this.remoteID = self.controller.getRemoteId();


    this.requestSync = function(device) {
        var data = JSON.stringify({'agentUserId': self.remoteID.toString()});

        //console.log("data:", data);
        http.request({
            method: 'POST',
            url: self.SYNC_URL + self.HomeGraphAPIKey,
            async: true,
            data: data,
            headers: {
                "Content-Type": "application/json"
            },
            success: function(response) {
                console.log("SUCCESS: ", JSON.stringify(response, undefined, 4));
            },
            error: function(response) {
                console.log("ERROR: ",JSON.stringify(response, undefined, 4));
            }
        });    
    }

    var zway = global.ZWave && global.ZWave["zway"].zway;

    self.devices = zway.devices;

    this.buildDevicesList();

    setTimeout(function() {
        var _self = self;
        _self.controller.devices.on("created", _self.requestSync);
        _self.controller.devices.on("change:metrics:title", _self.requestSync);
        _self.controller.devices.on("removed", _self.requestSync);    
    }.bind(self), 60 * 1000);
    
    this.defineHandlers();
    this.externalAPIAllow();
    global["GoogleHomeAPI"] = this.GoogleHomeAPI;
};

GoogleHome.prototype.handleSync = function(event) {
    var self = this,
        devices = self.buildDevicesList(),
        payload = {
            "agentUserId": self.remoteID.toString(), 
            "devices": devices
        };

    return self.createResponse(event.requestId, payload);
};

GoogleHome.prototype.handleQuery = function(event) {
    var self = this,
        device = event.inputs[0].payload.devices[0],
        states = {},
        vDev = self.controller.devices.get(device.id),
        payload = {
            "devices": {}
        };

    switch(vDev.get("deviceType")) {
        case "switchBinary":
            states = {
                "online": true,
                "on": vDev.get("metrics:level") == "on" ? true : false
            };
            break;
        case "switchMultilevel":
            states = {
                "online": true,
                "on": vDev.get("metrics:level") > 0 ? true : false,
                "brightness": parseInt(vDev.get("metrics:level"))
            };
            break;
        case "toggleButton":
            break;
        case "sensorMultilevel":
        case "thermostat":
            states = {
                "thermostatMode": "heat",
                "thermostatTemperatureSetpoint":  parseInt(vDev.get("metrics:level"))//,
                /*"thermostatTemperatureAmbient": 25.1
                "thermostatHumidityAmbient": 45.3*/
            };
            break;
    };

    payload.devices[device.id] = states;
    return self.createResponse(event.requestId, payload);
};

GoogleHome.prototype.handleExecute = function(event) {
    var self = this,
        response = null,
        exe = event.inputs[0].payload.commands[0].execution[0];

    console.log("EVENT:", JSON.stringify(event));

    switch(exe.command) {
        case self.HANDLE_ONOF :
            response = self.handleOnOff(event);
            break;
        case self.HANDLE_BRIGHTNESS_ABSOLUTE :
            response = self.handleBrightness(event);
            break;
        case self.HANDLE_COLOR_ABSOLUTE : 
            response = self.handleColorAbsolute(event);
    }

   return response;
};

GoogleHome.prototype.handleOnOff = function(event) {
    var self = this,
        devices = event.inputs[0].payload.commands[0].devices,
        exe = event.inputs[0].payload.commands[0].execution[0],
        commands = [];

    devices.forEach(function(dev) {
        console.log(dev.)

        var vdev = self.controller.devices.get(dev.id);
        commands.push({
            "ids": [dev.id],
            "status": "SUCCESS",
            "states": {
                "on": exe.params.on,
                "online": true
            }
        });
        if(exe.params.on) {
            vdev.performCommand("on");
        } else {
            vdev.performCommand("off");
        }

    });

    var payload = {
        "commands": commands
    };

    return self.createResponse(event.requestId, payload);
};

GoogleHome.prototype.handleBrightness = function(event) {
    var self = this,
        devices = event.inputs[0].payload.commands[0].devices,
        exe = event.inputs[0].payload.commands[0].execution[0],
        commands = [];

    devices.forEach(function(dev) {
        var vdev = self.controller.devices.get(dev.id);
        commands.push({
            "ids": [dev.id],
            "status": "SUCCESS",
            "states": {
                "brightness": exe.params.brightness,
                "online": true
            }
        });
        if(exe.params.brightness ) {
            vdev.performCommand("exact",{level: exe.params.brightness});
        }

    });

    var payload = {
        "commands": commands
    };

    return self.createResponse(event.requestId, payload);
};

GoogleHome.prototype.handleColorAbsolute = function(event) {
    var self = this,
        devices = event.inputs[0].payload.commands[0].devices,
        exe = event.inputs[0].payload.commands[0].execution[0],
        commands = [],
        spectrumInt = exe.params.color.spectrumRGB,
        rgb = {},
        spectrumHex = "#"+spectrumInt.toString(16);

    rgb = HexToRGB(spectrumHex);


    devices.forEach(function(dev) {
        var vdev = self.controller.devices.get(dev.id);

        commands.push({
            "ids": [dev.id],
            "status": "SUCCESS",
            "states": {
                "color": {
                    "name": exe.params.color.name,
                    "spectrumRGB": exe.params.color.spectrumRGB
                }
            }
        });
        console.log(JSON.stringify(rgb));
        //if(exe.params.brightness ) {
            vdev.performCommand("exact",{red: rgb.r, green: rgb.g, blue: rgb.b});
        //}

    });

    var payload = {
        "commands": commands
    };

    return self.createResponse(event.requestId, payload);
};


GoogleHome.prototype.createResponse = function(requestId, payload) {
    return {
        "requestId": requestId,
        "payload": payload
    };
};


GoogleHome.prototype.buildDevicesList = function() {
    var self = this;

    if (self.devices) {
        var devicesList = [];

        // get the physical device 
        for(device in self.devices) {
            var ctrlNodeId = zway.controller.data.nodeId.value
            if(parseInt(device) !== ctrlNodeId) {
                console.log("device", device);
                var dev = {
                   "id": device, //Required
                   "type": "", //Required
                   "traits": [], //Required
                   "name": {}, //Required
                   "willReportState": false,//, //Required
                   //"roomHint": "", //Optional will remove is no location set for device
                   //"structureHint": "", //Optional
                   //"deviceInfo": {}, //Optional
                   //"attributes": {}, //Optional
                   "customData": {
                    "type": "",
                    "vDevs": []
                   } //Optional
                };

                var commandClasses = self.devices[device].instances[0].commandClasses;
                var commandClassesIds = Object.keys(commandClasses);
                if(commandClassesIds.indexOf(parseInt(self.CC["SwitchColor"], 10).toString()) !== -1 &&
                   commandClassesIds.indexOf(parseInt(self.CC["SwitchMultilevel"], 10).toString()) !== -1) {
                    dev.type = self.LIGHT;
                    dev.customData.type = self.LIGHT;
                } 

                for(commandClassId in commandClasses) {

                    var cc = commandClasses[commandClassId];
                    commandClassId = parseInt(commandClassId, 10);

                    if(self.CC["SwitchBinary"] === commandClassId) {  
                        dev.type = self.SWITCH;
                        dev.customData.type = self.SWITCH;
                        dev.traits.push(self.ONOFF);
                    }

                    if(self.CC["SwitchMultilevel"] === commandClassId) {
                        if(dev.type == self.LIGHT) {
                            dev.traits.push(self.BRIGHTNESS, self.ONOFF);
                        }
                    }

                    if(self.CC["SwitchColor"] === commandClassId) {
                        var COLOR_SOFT_WHITE = 0,
                            COLOR_COLD_WHITE = 1,
                            COLOR_RED = 2,
                            COLOR_GREEN = 3,
                            COLOR_BLUE = 4;

                        var haveRGB = cc.data && cc.data[COLOR_RED] && cc.data[COLOR_GREEN] && cc.data[COLOR_BLUE] && true;

                        dev.type = self.LIGHT;

                        if(haveRGB) {
                            dev.traits.push(self.COLORSPECTRUM);
                            dev["attributes"] = {colorModel: "RGB"};    
                        } 
                    }
                }

                if(dev.type.length !== 0) {
                    var vDevId = "ZWayVDev_zway_"+device,
                        vDevs = self.controller.devices.filter(function(dev) {
                            if (dev.get("id").indexOf(vDevId) ==! -1) {return dev;}
                        });

                    _.each(vDevs, function(vDev) {
                        dev.customData.vDevs.push(vDev.get("id"));
                        if(vDev.get("deviceType") == "switchRGBW" || vDev.get("deviceType") == "switchBinary") {
                            var deviceName = vDev.get("metrics:title").replace(/\(([^)]+)\)/g, ''),
                                locationId = vDev.get("location"),
                                vDevId = vDev.get("id"),
                                name = {
                                    "defaultNames": [vDevId], //Optional
                                    "name": deviceName //, //Optional
                                    //"nicknames": [] //Optional
                                };

                            dev.name = name;

                            if(locationId !== 0) {
                                var location = _.find(locations, function(location) {
                                    return location.id === locationId;
                                });
                                var room = location.title;
                                dev.roomHint = room;
                            }
                        }
                    });  

                    devicesList.push(dev);

                }
            }
        }

        //virtual devices 
            


        console.log(JSON.stringify(devicesList, null, 4));
        return devicesList;
    }
}

// GoogleHome.prototype.buildDevicesList = function() {
//     var self = this,
//         devices = self.controller.devices,
//         locations = self.controller.locations,
//         instances = self.controller.instances;

//     var devicesList = devices.filter(function(device) {
//         var vDev = self.controller.devices.get(device.id);

//         wlDev = _.find(self.whiteListDeviceType, function(needle) {
//             if(Object.keys(needle) == vDev.get("deviceType")) {
//                 var instanc = _.find(instances, function(inst) {
//                     return inst.id == vDev.get("creatorId") && inst.moduleId == "MobileAppSupport";
//                 });
//                 if(typeof instanc == 'undefined') {
//                     return needle;
//                 }
//             }
//         });

//         if(typeof wlDev !== 'undefined') {
//             if(wlDev[Object.keys(wlDev)].length > 0) {
//                 if(wlDev[Object.keys(wlDev)].indexOf(vDev.get("probeType")) > -1) {
//                     return vDev;
//                 }
//             } else {
//                 return vDev;
//             }
//         }
//     }).map(function(vDev) {
//        var dev = {
//            "id": "", //Required
//            "type": "", //Required
//            "traits": [], //Required
//            "name": {}, //Required
//            "willReportState": false//, //Required
//            //"roomHint": "", //Optional will remove is no location set for device
//            //"structureHint": "", //Optional
//            //"deviceInfo": {}, //Optional
//            //"attributes": {}, //Optional
//            //"customData": {} //Optional
//        };

//         switch(vDev.get("deviceType")) {
//             case "switchBinary":
//                 dev.type = self.SWITCH;
//                 dev.traits.push(self.ONOFF);
//                 break;
//             case "switchMultilevel":
//                 dev.type = self.SWITCH;
//                 dev.traits.push(self.ONOFF, self.BRIGHTNESS);
//                 break;
//             case "switchRGBW":
//                 dev.type = self.LIGHT;
//                 dev.traits.push(self.ONOFF, self.BRIGHTNESS, self.COLORSPECTRUM);
//                 dev["attributes"] = {colorModel: "RGB"};
//                 break;
//             /*case "toggleButton":
//                 dev.traits.push(self.ONOFF);
//                 dev.type = self.SWITCH;
//                 var scene = _.find(instances, function(inst) {
//                     return inst.id == vDev.get("creatorId") && inst.moduleId == "LightScene";
//                 });
//                 if(typeof scene !== 'undefined') {
//                     dev.traits[self.SCENE_ACTION];
//                     dev.type = self.SCENE;
//                 }
//                 break;
//             case "sensorMultilevel":
//             case "thermostat":
//                 dev.traits.push(self.TEMPERATURE_SETTING);
//                 dev.type = self.THERMOSTAT;
//                 dev.attributes = {
//                     "thermostatTemperatureUnit": "C"
//                 };
//                 break;*/
//         };

//         dev.id = vDev.get("id");

//         var locationId = vDev.get("location"),
//             deviceName = vDev.get("metrics:title").replace(/\(([^)]+)\)/g, ''),
//             name = {
//                 "defaultNames": [dev.id], //Optional
//                 "name": deviceName //, //Optional
//                 //"nicknames": [] //Optional
//             };
//             console.log("devicename", deviceName);
//         dev.name = name;
//         if(locationId !== 0) {
//             var location = _.find(locations, function(location) {
//                 return location.id === locationId;
//             });
//             var room = location.title;
//             dev.roomHint = room;
//         }
//         return dev;
//     });

//     return devicesList;
// };


GoogleHome.prototype.stop = function() {
    var self = this;

    self.controller.devices.off("created", this.requestSync);
    self.controller.devices.off('change:metrics:title', this.requestSync);
    self.controller.devices.off("removed", this.requestSync);

    delete global["GoogleHomeAPI"];

    GoogleHome.super_.prototype.stop.call(this);
};

// --------------- Public HTTP API -------------------


GoogleHome.prototype.externalAPIAllow = function (name) {
    var _name = !!name ? ("GoogleHome." + name) : "GoogleHomeAPI";

    ws.allowExternalAccess(_name, this.controller.auth.ROLE.ADMIN);
    ws.allowExternalAccess(_name + ".callAction", this.controller.auth.ROLE.ADMIN);
};

GoogleHome.prototype.externalAPIRevoke = function (name) {
    var _name = !!name ? ("GoogleHome." + name) : "GoogleHomeAPI";

    ws.revokeExternalAccess(_name);
    ws.revokeExternalAccess(_name + ".callAction");
};

GoogleHome.prototype.defineHandlers = function () {
    var self = this;

    this.GoogleHomeAPI = function () {
        return {status: 400, body: "Bad GoogleHomeAPI request "};
    };

    this.GoogleHomeAPI.callAction = function (url, request) {
        console.log("Received data from Google Home");
        console.log("request:", JSON.stringify(request));


        if (request.method === "POST" && request.body) {
            reqObj = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

            var requestedNamespace = reqObj.inputs[0].intent;
            switch(requestedNamespace) {
                case self.NAMESPACE_SYNC:
                    response = self.handleSync(reqObj);
                    break;
                /*case self.NAMESPACE_QUERY:
                    response = self.handleQuery(reqObj);
                    break;*/
                case self.NAMESPACE_EXECUTE:
                    response = self.handleExecute(reqObj);
                    break;
                default:
                    console.log("Error: ", "Unsupported namespace: " + requestedNamespace);
                    break;
            }
            console.log("Return Response to Google Home");
            console.log("response:", JSON.stringify(response));
            return response;
        }
    };
};

function HexToRGB(hex) {
    var c = hex.substring(1).split('');
    if(c.length == 3){
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x'+c.join('');    
    return {r: (c>>16)&255, g: (c>>8)&255, b: c&255};
}