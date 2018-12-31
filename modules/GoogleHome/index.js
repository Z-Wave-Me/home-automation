/*** GoogleHome Z-Way HA module *******************************************

 Version: 0.1.0 beta
 (c) Z-Wave.Me, 2017
 -----------------------------------------------------------------------------
 Author: Michael Hensche <mh@zwave.eu>
 Description:

 ******************************************************************************/

function GoogleHome (id, controller) {
    // Call superconstructor first (AutomationModule)
    GoogleHome.super_.call(this, id, controller);

    this.HomeGraphAPIKey = "AIzaSyADXWi1oA0o8_hzzzPK0tjuzL7_BAqYakk";
    this.SYNC_URL = "https://homegraph.googleapis.com/v1/devices:requestSync?key=";

    // Report state
    this.GET_TOKEN_URL = "https://auth.zwave.eu/auth/web/getToken";
    this.REPORT_STATE_URL = "https://homegraph.googleapis.com/v1/devices:reportStateAndNotification";

    // namespaces
    this.NAMESPACE_SYNC = "action.devices.SYNC";
    this.NAMESPACE_QUERY = "action.devices.QUERY";
    this.NAMESPACE_EXECUTE = "action.devices.EXECUTE";
    NAMESPACE_DISCONNECT = "action.devices.DISCONNECT";

    // supportted device types
    this.THERMOSTAT = "action.devices.types.THERMOSTAT";
    this.LIGHT = "action.devices.types.LIGHT";
    this.OUTLET = "action.devices.types.OUTLET";
    this.SWITCH = "action.devices.types.SWITCH";
    this.SCENE = "action.devices.types.SCENE";

    //actions
    this.ONOFF = "action.devices.traits.OnOff";
    this.BRIGHTNESS = "action.devices.traits.Brightness";
    this.COLORSPECTRUM = "action.devices.traits.ColorSetting";
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

}

inherits(GoogleHome, AutomationModule);

_module = GoogleHome;

GoogleHome.prototype.init = function(config) {
    var self = this;

    GoogleHome.super_.prototype.init.call(this, config);

    this.remoteID = self.controller.getRemoteId();

    this.auth_token = null;

    this.report_state_token = {};

    if(self.config.devices.length > 0) {
        self.requestSync();
    }

    // report devices states
    setTimeout(function() {
        console.log("Report device states");
        var cnt = 0,
            tries= 10;

        var reportStateInterval = setInterval(function() {
            if(cnt >= tries) {
              clearInterval(reportStateInterval);
              return;
            }

            if(self.auth_token) {
              clearInterval(reportStateInterval);
              cnt = tries;
              self.getToken(function() {
                var response = {
                  requestId: createMessageId(),
                  agentUserId: self.remoteID.toString(),
                  payload: {
                    devices: {
                      states: {}
                    }
                  }
                };

                response.payload.devices.states = self.getDeviceStates();
                self.reportState(response);
              });
            }
            cnt++
        }, 5000);
    }, 10000); // 10 seconds

    this.defineHandlers();
    this.externalAPIAllow();
    global["GoogleHomeAPI"] = this.GoogleHomeAPI;
};

GoogleHome.prototype.requestSync = function() {
  var self = this,
      data = JSON.stringify({'agentUserId': self.remoteID.toString()});

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

GoogleHome.prototype.getToken = function(callback) {
  var self = this,
      date = new Date(),
      curTime = date.getTime() / 1000;
  // get new token is token empty or token expired
  if(_.isEmpty(self.report_state_token) || curTime > self.report_state_token.expires) {
    http.request({
      url: self.GET_TOKEN_URL,
      method: 'GET',
      async: true,
      headers: {
        "Authorization": self.auth_token, // Bearer Token
        "Content-Type": "application/json"
      },
      success: function(response) {
        if(!response.data.error) {
          var d = new Date();
          var time = d.getTime() / 1000;

          self.report_state_token = response.data.token;
          self.report_state_token["expires"] = time + self.report_state_token.expires_in;
          callback();

        } else if(response.data.error == 'expired_token') {
          self.requestSync()
        }
      },
      error: function(error) {
        console.log("getToken error", JSON.stringify(error));
      }
    });
  } else {
    callback();
  }
}

/**
 * Send report state
 * @param  {obj} data
 */
GoogleHome.prototype.reportState = function(data) {
  console.log(" reportState data", JSON.stringify(data));
  var self = this;
  http.request({
    url: self.REPORT_STATE_URL,
    method: 'POST',
    async: true,
    data: JSON.stringify(data),
    headers: {
      "Authorization": self.report_state_token.token_type + " " + self.report_state_token.access_token,
      "X-GFE-SSL": "yes",
      "Content-Type": "application/json"
    },
    success: function(response) {
      console.log("reportState success", JSON.stringify(response));
    },
    error: function(error) {
      // 400 Bad request Invalid arguments
      // status -1 timeout reached
      console.log("reportState error", JSON.stringify(error));
    }
  });
};

/**
 * Return a list with device states
 * @return {object}
 * {
 *   "<vDevId>": {"on": false},
 *   "<vDevId>": {"on": true}
 * }
 */
GoogleHome.prototype.getDeviceStates = function() {
  var self = this,
      devices = self.controller.devices,
      active_devices = self.config.devices.map(function(dev) {return dev.id});

  var deviceList = devices.filter(function(device) {
        var vDev = self.controller.devices.get(device.id),
            pos = active_devices.indexOf(device.id);

        if(pos != -1) {
            return vDev;
        }
    });
    var stateReportList = {}
    deviceList.forEach(function(vDev) {

      switch(vDev.get("deviceType")) {
            case "switchBinary":
                stateReportList[vDev.id] =  {
                  "online": vDev.get("isfailed") ? false : true,
                  "on": vDev.get("metrics:level") == "on" ? true : false
                };
                break;
            case "switchMultilevel":
                stateReportList[vDev.id] =  {
                  "online": vDev.get("isfailed") ? false : true,
                  "brightness": parseInt(vDev.get("metrics:level"))
                };
                break;
            case "switchRGBW":
                var color = vDev.get("metrics:color");
                stateReportList[vDev.id] =  {
                  "online": vDev.get("isfailed") ? false : true,
                  "on": vDev.get("metrics:level") == "on" ? true : false,
                  "color": {
                    "spectrumRGB": parseInt(RGBToHex(color.r, color.g, color.b), 16) // spectrumRgb
                  }
                };
                break;
            case "toggleButton":
                stateReportList[vDev.id] =  {
                  "online": vDev.get("isfailed") ? false : true
                };
                break;
            case "sensorMultilevel":
            case "thermostat":
                stateReportList[vDev.id] =  {
                  "online": vDev.get("isfailed") ? false : true,
                  "thermostatTemperatureSetpoint":  parseInt(vDev.get("metrics:level"))
                };
                break;
        };
    });

    // console.log("stateReportList", JSON.stringify(stateReportList));
    return stateReportList;
}

  /**
   *
   * @param event
   * {
   *   "uid": "213456",
   *   "auth": "bearer xxx",
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf"
   * }
   * @param response
   * @return {{}}
   * {
   *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "devices": [{
   *         "id": "123",
   *         "type": "action.devices.types.Outlet",
   *         "traits": [
   *            "action.devices.traits.OnOff"
   *         ],
   *         "name": {
   *             "defaultNames": ["TP-Link Outlet C110"],
   *             "name": "Homer Simpson Light",
   *             "nicknames": ["wall plug"]
   *         },
   *         "willReportState: false,
   *         "attributes": {
   *         // None defined for these traits yet.
   *         },
   *         "roomHint": "living room",
   *         "config": {
   *           "manufacturer": "tplink",
   *           "model": "c110",
   *           "hwVersion": "3.2",
   *           "swVersion": "11.4"
   *         },
   *         "customData": {
   *           "fooValue": 74,
   *           "barValue": true,
   *           "bazValue": "sheepdip"
   *         }
   *       }, {
   *         "id": "456",
   *         "type": "action.devices.types.Light",
   *         "traits": [
   *           "action.devices.traits.OnOff",
   *           "action.devices.traits.Brightness",
   *           "action.devices.traits.ColorTemperature",
   *           "action.devices.traits.ColorSpectrum"
   *         ],
   *         "name": {
   *           "defaultNames": ["OSRAM bulb A19 color hyperglow"],
   *           "name": "lamp1",
   *           "nicknames": ["reading lamp"]
   *         },
   *         "willReportState: false,
   *         "attributes": {
   *           "TemperatureMinK": 2000,
   *           "TemperatureMaxK": 6500
   *         },
   *         "roomHint": "living room",
   *         "config": {
   *           "manufacturer": "osram",
   *           "model": "hg11",
   *           "hwVersion": "1.2",
   *           "swVersion": "5.4"
   *         },
   *         "customData": {
   *           "fooValue": 12,
   *           "barValue": false,
   *           "bazValue": "dancing alpaca"
   *         }
   *       }, {
   *         "id": "234"
   *         // ...
   *     }]
   *   }
   * }
   */
GoogleHome.prototype.handleSync = function(event) {
    var self = this,
        devices = self.buildDevicesList(),
        payload = {
            "agentUserId": self.remoteID.toString(),
            "devices": devices
        };

    return self.createResponse(event.requestId, payload);
};

  /**
   *
   * @param event
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "uid": "213456",
   *   "auth": "bearer xxx",
   *   "devices": [{
   *     "id": "123",
   *       "customData": {
   *         "fooValue": 12,
   *         "barValue": true,
   *         "bazValue": "alpaca sauce"
   *       }
   *   }, {
   *     "id": "234"
   *   }]
   * }
   * @param response
   * @return {{}}
   * {
   *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "devices": {
   *       "123": {
   *         "on": true ,
   *         "online": true
   *       },
   *       "456": {
   *         "on": true,
   *         "online": true,
   *         "brightness": 80,
   *         "color": {
   *           "name": "cerulian",
   *           "spectrumRGB": 31655
   *         }
   *       },
   *       ...
   *     }
   *   }
   * }
   */
GoogleHome.prototype.handleQuery = function(event) {
    var self = this,
        devices = event.inputs[0].payload.devices,
        payload = {
            "devices": {}
        };

    for(dev in devices) {
        var vDev = self.controller.devices.get(devices[dev].id),
            state = {};
        switch(vDev.get("deviceType")) {
            case "switchBinary":
                state = {
                    "online": true,
                    "on": vDev.get("metrics:level") == "on" ? true : false
                };
                break;
            case "switchMultilevel":
                state = {
                    "online": true,
                    "on": vDev.get("metrics:level") > 0 ? true : false,
                    "brightness": parseInt(vDev.get("metrics:level"))
                };
                break;
            case "toggleButton":
                state = {
                    "online": true,
                    "on": vDev.get("metrics:level") == "on" ? true : false
                };
                break;
            case "sensorMultilevel":
            case "thermostat":
                state = {
                    "online": true,
                    "thermostatMode": "heat",
                    "thermostatTemperatureSetpoint":  parseInt(vDev.get("metrics:level"))//,
                    /*"thermostatTemperatureAmbient": 25.1
                    "thermostatHumidityAmbient": 45.3*/
                };
                break;
            case "switchRGBW": {
                var color = vDev.get("metrics:color"),
                    spectrumInt = parseInt(RGBToHex(color.r, color.g, color.b), 16);

                state = {
                    "online": true,
                    "color": {
                      "name": "",
                      "spectrumRGB": spectrumInt
                    }
                };
            }
        };
        payload.devices[devices[dev].id] = state;
    }

    return self.createResponse(event.requestId, payload);
};

  /**
   * @param event:
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "uid": "213456",
   *   "auth": "bearer xxx",
   *   "commands": [{
   *     "devices": [{
   *       "id": "123",
   *       "customData": {
   *          "fooValue": 74,
   *          "barValue": false
   *       }
   *     }, {
   *       "id": "456",
   *       "customData": {
   *          "fooValue": 12,
   *          "barValue": true
   *       }
   *     }, {
   *       "id": "987",
   *       "customData": {
   *          "fooValue": 35,
   *          "barValue": false,
   *          "bazValue": "sheep dip"
   *       }
   *     }],
   *     "execution": [{
   *       "command": "action.devices.commands.OnOff",
   *       "params": {
   *           "on": true
   *       }
   *     }]
   *  }
   *
   * @param response
   * @return {{}}
   * {
   *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "commands": [{
   *       "ids": ["123"],
   *       "status": "SUCCESS"
   *       "states": {
   *         "on": true,
   *         "online": true
   *       }
   *     }, {
   *       "ids": ["456"],
   *       "status": "SUCCESS"
   *       "states": {
   *         "on": true,
   *         "online": true
   *       }
   *     }, {
   *       "ids": ["987"],
   *       "status": "OFFLINE",
   *       "states": {
   *         "online": false
   *       }
   *     }]
   *   }
   * }
   */
GoogleHome.prototype.handleExecute = function(event) {
    // console.log("event", JSON.stringify(event));
    var self = this,
        response = null,
        commands = event.inputs[0].payload.commands,
        payload = {
            commands: []
        };
    for(var i = 0; i < commands.length; i++) {
        var curCommand = commands[i];
        for(var j = 0; j < curCommand.execution.length; j++) {
            var curExec = curCommand.execution[j],
                devices = curCommand.devices;
            for(var k = 0; k < devices.length; k++) {
                switch(curExec.command) {
                    case self.HANDLE_ONOF :
                        response = self.handleOnOff(curExec, devices[k]);
                        break;
                    case self.HANDLE_BRIGHTNESS_ABSOLUTE :
                        response = self.handleBrightness(curExec, devices[k]);
                        break;
                    case self.HANDLE_COLOR_ABSOLUTE :
                        response = self.handleColorAbsolute(curExec, devices[k]);
                        break
                    case self.HANDLE_THERMOSTAT_TEMPERATURE_SETPOINT:
                        response = self.handleTemperatrueSetPoint(curExec, devices[k]);
                        break;
                    default:
                        console.log("Error", "Unsupported operation" + curExec.command);
                        break;
                }
                payload.commands.push(response);
            }
        }
    }

    return self.createResponse(event.requestId, payload);
};

/**
 *
 * @param event
 * {
 *   "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
 *   "inputs": [{
 *     "intent": "action.devices.DISCONNECT",
 *   }]
 * }
 */
GoogleHome.prototype.handleDisconnect = function(event) {
  var response = {};

  return response;
};

/**
 *
 * @param command
 * {
 *   "command": "action.devices.commands.OnOff",
 *   "params": {
 *       "on": true
 *   }
 * }
 * @param device
 * {
 *   "id": "123",
 *   "customData": {
 *      "fooValue": 74,
 *      "barValue": false
 *   }
 * }
 * @return {{}}
 * {
 *   "ids": ["123"],
 *   "status": "SUCCESS"
 *   "states": {
 *     "on": true,
 *     "online": true
 *   }
 * }
 */
GoogleHome.prototype.handleOnOff = function(exe, device) {
    var self = this,
        vDev = self.controller.devices.get(device.id),
        command = {};

    if(!vDev) {
        command = {
            "ids": [device.id],
            "status": "ERROR",
            "errorCode": "deviceNotFound"
        }
    } else if(vDev.get("metrics:isFailed")) {
        command = {
            "ids": [device.id],
            "status": "ERROR",
            "errorCode": "deviceOffline"
        }
    } else {
        if(exe.params.on) {
            vDev.performCommand("on");
        } else {
            vDev.performCommand("off");
        }
        command = {
            "ids": [device.id],
            "status": "SUCCESS",
            "states": {
                "on": exe.params.on,
                "online": true
            }
        }
    }
    return command;
};

/**
 *
 * @param command
 * {
 *   "command": "action.devices.commands.BrightnessAbsolute",
 *   "params": {
 *       "brightness": 65
 *   }
 * }
 * @param device
 * {
 *   "id": "123",
 *   "customData": {
 *      "fooValue": 74,
 *      "barValue": false
 *   }
 * }
 * @return {}
 * {
 *   "ids": ["123"],
 *   "status": "SUCCESS"
 *   "states": {
 *     "brightness": 65,
 *     "online": true
 *   }
 * }
 */
GoogleHome.prototype.handleBrightness = function(exe, device) {
    var self = this,
        command = {},
        vDev = self.controller.devices.get(device.id);

    if(!vDev) {
        command = {
            "ids": [device.id],
            "status": "ERROR",
            "errorCode": "deviceNotFound"
        }
    } else if(vDev.get("metrics:isFailed")) {
        command = {
            "ids": [device.id],
            "status": "ERROR",
            "errorCode": "deviceOffline"
        }
    } else {
        if(exe.params.brightness ) {
            vDev.performCommand("exact",{level: exe.params.brightness});
        }
        command = {
            "ids": [device.id],
            "status": "SUCCESS",
            "states": {
                "brightness": exe.params.brightness,
                "online": true
            }
        }
    }
    return command;
};

/**
 *
 * @param command
 * {
 *   "command": "action.devices.commands.ColorAbsolute",
 *   "params": {
 *      "color": {
 *         "name": "red"，
 *         "spectrumRGB": 16711680
 *      }
 *   }
 * }
 * @param device
 * {
 *   "id": "123",
 *   "customData": {
 *      "fooValue": 74,
 *      "barValue": false
 *   }
 * }
 * @return {}
 * {
 *   "ids": ["123"],
 *   "status": "SUCCESS"
 *   "states": {
 *     "color": {
 *         "name": "red",
 *         "spectrumRGB": 16711680
 *     },
 *     "online": true
 *   }
 * }
 */
GoogleHome.prototype.handleColorAbsolute = function(exe, device) {
    var self = this,
        spectrumInt = exe.params.color.spectrumRGB,
        rgb = {},
        spectrumHex = "#"+spectrumInt.toString(16);
        vDev = self.controller.devices.get(device.id),
        command = {};

        rgb = HexToRGB(spectrumHex);

        if(!vDev) {
            command = {
                "ids": [device.id],
                "status": "ERROR",
                "errorCode": "deviceNotFound"
            }
        } else if(vDev.get("metrics:isFailed")) {
            command = {
                "ids": [device.id],
                "status": "ERROR",
                "errorCode": "deviceOffline"
            }
        } else {
            command = {
                "ids": [device.id],
                "status": "SUCCESS",
                "states": {
                    "color": {
                        "name": exe.params.color.name,
                        "spectrumRgb": exe.params.color.spectrumRGB
                    },
                    "online": true
                }
            }
            vDev.performCommand("exact",{red: rgb.r, green: rgb.g, blue: rgb.b});
        }

    return command;
};

/**
 *
 * @param command
 * {
 *   "command": "action.devices.commands.ThermostatTemperatureSetpoint",
 *   "params": {
 *       "thermostatTemperatureSetpoint": 22.0
 *   }
 * }
 * @param device
 * {
 *   "id": "123",
 *   "customData": {
 *      "fooValue": 74,
 *      "barValue": false
 *   }
 * }
 * @return {}
 * {
 *   "ids": ["123"],
 *   "status": "SUCCESS"
 *   "states": {
 *     "thermostatMode": "cool",
 *     "thermostatTemperatureSetpoint": 22.0,
 *     "thermostatTemperatureAmbient": 25.1,
 *     "thermostatHumidityAmbient": 43.2
 *     "online": true
 *   }
 * }
 */
GoogleHome.prototype.handleTemperatrueSetPoint = function(exe, device) {
    var self = this,
        temperature = exe.params.thermostatTemperatureSetpoint,
        vDev = self.controller.devices.get(device.id),
        minTemp = vDev.get("metrics:min"),
        maxTemp = vDev.get("metrics:max"),
        command = {};

    if(!vDev) {
        command = {
            "ids": [device.id],
            "status": "ERROR",
            "errorCode": "deviceNotFound"
        }
    } else if(vDev.get("metrics:isFailed")) {
        command = {
            "ids": [device.id],
            "status": "ERROR",
            "errorCode": "deviceOffline"
        }
    } else if(temperature < minTemp || temperature > maxTemp){
        command = {
            "ids": [device.id],
            "status": "ERROR",
            "errorCode": "valueOutOfRange"
        }
    } else {
        command = {
            "ids": [device.id],
            "status": "SUCCESS",
            "thermostatTemperatureSetpoint": temperature,
            "online": true
        }
        vDev.performCommand("exact", {"level": parseInt(temperature)});
    }

    return command;
}

  /**
   *
   * @param requestId
   * @param payload
   * {
   *   "commands": [{
   *     "devices": [{
   *       "id": "123",
   *       "customData": {
   *         "fooValue": 12,
   *         "barValue": true,
   *         "bazValue": "alpaca sauce"
   *       }
   *     }, {
   *       "id": "456"
   *     },
   *     ...
   *     ],
   *     "execution": [{
   *       "command": "action.devices.commands.OnOff",
   *       "params": {
   *           "on": true
   *       }
   *   }]
   * }
   * @return {{}}
   * {
   *  "requestId": "ff36a3cc-ec34-11e6-b1a0-64510650abcf",
   *   "payload": {
   *     "devices": {
   *       "123": {
   *         "on": true ,
   *         "online": true
   *       },
   *       "456": {
   *         "on": true,
   *         "online": true,
   *         "brightness": 80,
   *         "color": {
   *           "name": "cerulian",
   *           "spectrumRGB": 31655
   *         }
   *       },
   *       ...
   *     }
   *   }
   * }
   */
GoogleHome.prototype.createResponse = function(requestId, payload) {
    return {
        "requestId": requestId,
        "payload": payload
    };
};

/**
 * addSendReportStateToDevice
 * @param {string} devId
 * @param {array} stateFuncArray
 */
GoogleHome.prototype.addSendReportStateToDevice = function(devId, stateFuncArray) {
  var self = this;

  self.sendReportState = function(device) {
    self.getToken(function() {
      var response = {
        requestId: createMessageId(),
        agentUserId: self.remoteID.toString(),
        payload: {
          devices: {
            states: {}
          }
        }
      },
      state = {};

      state[device.get("id")] = {};
      _.each(stateFuncArray, function(stateFunc) {
        var keys = Object.keys(stateFunc);
        _.each(keys, function(key) {
          var func = stateFunc[key],
              obj = func(device);
              _.extend(state[device.get("id")], obj);
        });
      });
      response.payload.devices.states = state;
      self.reportState(response);
    });
  };

  _.each(stateFuncArray, function(stateFunc) {
    var keys = Object.keys(stateFunc);
    _.each(keys, function(key) {
        self.controller.devices.on(devId, key, self.sendReportState);
    });
  });
}

/**
 * Create the device list
 */
GoogleHome.prototype.buildDevicesList = function() {
    var self = this,
        devices = self.controller.devices,
        locations = self.controller.locations,
        instances = self.controller.instances,
        active_devices = self.config.devices.map(function(dev) {return dev.id});

    var devicesList = devices.filter(function(device) {
        var vDev = self.controller.devices.get(device.id),
            pos = active_devices.indexOf(device.id);

        if(pos != -1) {
            return vDev;
        }
    }).map(function(vDev) {
       var dev = {
           "id": "", //Required
           "type": "", //Required
           "traits": [], //Required
           "name": {}, //Required
           "willReportState": true, //Required
           //"roomHint": "", //Optional will remove is no location set for device
           //"structureHint": "", //Optional
           //"deviceInfo": {}, //Optional
           //"attributes": {}, //Optional
           "customData": {} //Optional
       };

        switch(vDev.get("deviceType")) {
            case "switchBinary":
                dev.type = self.SWITCH;
                dev.traits.push(self.ONOFF);
                dev.willReportState = true;
                self.addSendReportStateToDevice(vDev.get("id"),
                  [{"change:metrics:level":
                    function(device) {
                        return {
                          "online": device.get("isfailed") ? false : true,
                          "on": device.get("metrics:level") == "on" ? true : false
                        }
                    }
                  }]
                );
                break;
            case "switchMultilevel":
                dev.type = self.SWITCH;
                dev.traits.push(self.ONOFF, self.BRIGHTNESS);
                self.addSendReportStateToDevice(vDev.get("id"),
                  [{"change:metrics:level":
                    function(device) {
                        return {
                          "online": device.get("isfailed") ? false : true,
                          "brightness":parseInt(device.get("metrics:level"))
                        }
                    }
                  }]
                );
                break;
            case "switchRGBW":
                dev.type = self.LIGHT;
                dev.traits.push(self.ONOFF, self.COLORSPECTRUM);
                dev["attributes"] = {
                  colorModel: "rgb",
                  commandOnlyColorSetting: false
                };
                self.addSendReportStateToDevice(vDev.get("id"),
                  [{"change:metrics:level":
                    function(device) {
                        return {
                          "online": device.get("isfailed") ? false : true,
                          "on": device.get("metrics:level") == "on" ? true : false
                        }
                    }
                  },
                  {"change:metrics:color":
                    function(device) {
                        var color = device.get("metrics:color");
                        return {
                          "online": device.get("isfailed") ? false : true,
                          "color":{"spectrumRGB": parseInt(RGBToHex(color.r, color.g, color.b), 16)} // spectrumRgb
                        };
                    }
                  }]
                );
                break;
            case "toggleButton":
                dev.traits.push(self.ONOFF);
                dev.type = self.SWITCH;
                var scene = _.find(instances, function(inst) {
                    return inst.id == vDev.get("creatorId") && inst.moduleId == "LightScene";
                });
                if(typeof scene !== 'undefined') {
                    dev.traits[self.SCENE_ACTION];
                    dev.type = self.SCENE;
                    dev.customData = {type: 'SCENE'};
                }
                self.addSendReportStateToDevice(vDev.get("id"),
                  [{"change:metrics:level":
                    function(device) {
                        return {
                          "online": device.get("isfailed") ? false : true,
                          "on": device.get("metrics:level") == "on" ? true : false
                        }
                    }
                  }]
                );
                break;
            case "sensorMultilevel":
            case "thermostat":
                dev.traits.push(self.TEMPERATURE_SETTING);
                dev.type = self.THERMOSTAT;
                dev.attributes = {
                    "availableThermostatModes": "heat",
                    "thermostatTemperatureUnit": "C"
                };
                self.addSendReportStateToDevice(vDev.get("id"),
                  [{"change:metrics:level":
                    function(device) {
                        return {
                          "online": device.get("isfailed") ? false : true,
                          "thermostatTemperatureSetpoint":  parseInt(vDev.get("metrics:level"))
                        }
                    }
                  }]
                );
                break;
            default:
                break;
        };

        dev.id = vDev.get("id");
        var pos = active_devices.indexOf(vDev.id),
            locationId = vDev.get("location");

        if(pos !== -1) {
            var deviceName = self.config.devices[pos].callName;
        } else {
            // fallback if no call name set
            var deviceName = vDev.get("metrics:title") == "" ? "Unknow device" : vDev.get("metrics:title");
        }

        var name = {
            "defaultNames": [dev.id], //Optional
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
        return dev;
    }, active_devices);

    return devicesList;
};

GoogleHome.prototype.stop = function() {
    var self = this;
    delete global["GoogleHomeAPI"];

    self.config.devices.forEach(function(dev) {
      var vDev = self.controller.devices.get(dev.id);
      if(vDev) {
        self.controller.devices.off(dev.id,"change:metrics:level", self.sendReportState);
        if(vDev.get("metrics:color")) {
          self.controller.devices.off(dev.id, "change:metrics:color", self.sendReportState);
        }
      }
    });

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

            self.auth_token = request.headers.Authorization;

            var requestedNamespace = reqObj.inputs[0].intent;
            switch(requestedNamespace) {
                case self.NAMESPACE_SYNC:
                    response = self.handleSync(reqObj);
                    break;
                case self.NAMESPACE_QUERY:
                    response = self.handleQuery(reqObj);
                    break;
                case self.NAMESPACE_EXECUTE:
                    response = self.handleExecute(reqObj);
                    break;
                case self.NAMESPACE_DISCONNECT:
                    response = self.handleDisconnect(reqObj);
                default:
                    console.log("Error: ", "Unsupported namespace: " + requestedNamespace);
                    var payload = {
                      errorCode: "notSupported"
                    };
                    response = self.createResponse(reqObj.requestId, payload);
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

function RGBToHex(r, g, b) {
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function createMessageId() {
    var d = new Date().getTime();

    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });

    return uuid;
};
