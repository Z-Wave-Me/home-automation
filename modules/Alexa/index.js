/*** Alexa Z-Way HA module *******************************************

 Version: 1.1.0
 (c) Z-Wave.Me, 2016
 -----------------------------------------------------------------------------
 Author: Michael Hensche <mh@zwave.eu>
 Description: Supports Alexa SmartHome Skill API version 2

 ******************************************************************************/

function Alexa (id, controller) {
    // Call superconstructor first (AutomationModule)
    Alexa.super_.call(this, id, controller);

    // namespaces
    this.NAMESPACE_CONTROL = "Alexa.ConnectedHome.Control";
    this.NAMESPACE_DISCOVERY = "Alexa.ConnectedHome.Discovery";
    this.NAMESPACE_QUERY = "Alexa.ConnectedHome.Query";

    // discovery
    this.REQUEST_DISCOVER = "DiscoverAppliancesRequest";
    this.RESPONSE_DISCOVER = "DiscoverAppliancesResponse";

    // control
    this.REQUEST_TURN_ON = "TurnOnRequest";
    this.RESPONSE_TURN_ON = "TurnOnConfirmation";
    this.REQUEST_TURN_OFF = "TurnOffRequest";
    this.RESPONSE_TURN_OFF = "TurnOffConfirmation";
    this.REQUEST_SET_PERCENTAGE = "SetPercentageRequest";
    this.RESPONSE_SET_PERCENTAGE = "SetPercentageConfirmation";
    this.REQUEST_INCREMENT_PERCENTAGE = "IncrementPercentageRequest";
    this.RESPONSE_INCREMENT_PERCENTAGE = "IncrementPercentageConfirmation";
    this.REQUEST_DECREMENT_PERCENTAGE = "DecrementPercentageRequest";
    this.RESPONSE_DECREMENT_PERCENTAGE = "DecrementPercentageConfirmation";
    this.REQUEST_SET_TARGET_TEMPERATURE = "SetTargetTemperatureRequest";
    this.RESPONSE_SET_TARGET_TEMPERATURE = "SetTargetTemperatureConfirmation";
    this.REQUEST_INCREMENT_TARGET_TEMPERATURE = "IncrementTargetTemperatureRequest";
    this.RESPONSE_INCREMENT_TARGET_TEMPERATURE = "IncrementTargetTemperatureConfirmation";
    this.REQUEST_DECREMENT_TARGET_TEMPERATURE = "DecrementTargetTemperatureRequest";
    this.RESPONSE_DECREMENT_TARGET_TEMPERATURE = "DecrementTargetTemperatureConfirmation";
    this.REQUEST_SET_LOCK_STATE = "SetLockStateRequest";
    this.RESPONSE_SET_LOCK_STATE = "SetLockStateConfirmation";
    this.REQUEST_SET_COLOR = "SetColorRequest";
    this.RESPONSE_SET_COLOR = "SetColorConfirmation";

    // query
    this.REQUEST_LOCK_STATE = "GetLockStateRequest";
    this.RESPONSE_GET_LOCK_STATE = "GetLockStateResponse";
    this.REQUEST_TARGET_TEMPERATURE = "GetTargetTemperatureRequest";
    this.RESPONSE_TARGET_TEMPERATURE = "GetTargetTemperatureResponse";
    this.REQUEST_TARGET_READING_TEMPERATURE = "GetTemperatureReadingRequest";
    this.RESPONSE_TARGET_READING_TEMPERATURE = "GetTemperatureReadingResponse";

    // errors
    this.ERROR_UNSUPPORTED_OPERATION = "UnsupportedOperationError";
    this.ERROR_UNEXPECTED_INFO = "UnexpectedInformationReceivedError";
    this.ERROR_NO_SUCH_TARGET = "NoSuchTargetError";
    this.ERROR_TARGET_OFFLINE = "TargetOfflineError";
    this.ERROR_VALUE_OUT_OF_RANGE = "ValueOutOfRangeError"; 


    this.whiteListDeviceType = [{"sensorMultilevel":["temperature"]}, {"switchBinary":[]}, {"toggleButton":[]}, {"switchMultilevel":[]}, {"thermostat":[]}, {"doorlock":[]}];
}

inherits(Alexa, AutomationModule);

_module = Alexa;

Alexa.prototype.init = function(config) {
    var self = this;

    Alexa.super_.prototype.init.call(this, config);

    this.defineHandlers();
    this.externalAPIAllow();
    global["AlexaAPI"] = this.AlexaAPI;
};

Alexa.prototype.stop = function() {
    var self = this;

    delete global["AlexaAPI"];

    Alexa.super_.prototype.stop.call(this);
};

Alexa.prototype.handleDiscovery = function(event) {
    var self = this,
        appliances = self.buildAppliances(),
        header = self.createHeader(self.NAMESPACE_DISCOVERY, self.RESPONSE_DISCOVER),
        payload = {
            "discoveredAppliances": appliances
        };

    return self.createDirective(header, payload);
};

Alexa.prototype.handleControl = function(event) {
    var self = this,
        response = null,
        requestedName = event.header.name;

    switch (requestedName) {
        case self.REQUEST_TURN_ON :
            response = self.handleControlTurnOn(event);
            break;
        case self.REQUEST_TURN_OFF :
            response = self.handleControlTurnOff(event);
            break;
        case self.REQUEST_SET_PERCENTAGE :
            response = self.handleControlSetPercentage(event);
            break;
        case self.REQUEST_INCREMENT_PERCENTAGE :
            response = self.handleControlIncrementPercentage(event);
            break;
        case self.REQUEST_DECREMENT_PERCENTAGE :
            response = self.handleControlDecrementPercentage(event);
            break;
        case self.REQUEST_SET_TARGET_TEMPERATURE :
            response = self.handleControlSetTargetTemperature(event);
            break;
        case self.REQUEST_INCREMENT_TARGET_TEMPERATURE :
            response = self.handleControlIncrementTargetTemperature(event);
            break;
        case self.REQUEST_DECREMENT_TARGET_TEMPERATURE :
            response = self.handleControlDecrementTargetTemperature(event);
            break;
        case self.REQUEST_SET_LOCK_STATE :
            response = self.handleControlSetLockState(event);
            break;
        case self.REQUEST_SET_COLOR:
            response = self.handleControlSetColor(event);
            break;
        default:
            console.log("Error", "Unsupported operation" + requestedName);
            response = self.handleUnsupportedOperation();
            break;
    }
    return response;
};


/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "TurnOnRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "TurnOnConfirmation",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {}
   * }
   */
Alexa.prototype.handleControlTurnOn = function(event) {
     var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {};

    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.RESPONSE_TURN_ON);
        vDev.performCommand("on");    
    }
        
    return self.createDirective(header, {});
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "TurnOffRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "TurnOffConfirmation",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {}
   * }
   */
Alexa.prototype.handleControlTurnOff = function(event) {
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {};
   
    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.RESPONSE_TURN_OFF)
        vDev.performCommand("off");    
    }

    return self.createDirective(header, {});
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "SetPercentageRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        },
   *        "percentageState": {
   *            "value": 50.0
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "SetPercentageConfirmation",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {}
   * }
   */
Alexa.prototype.handleControlSetPercentage = function(event) {
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {};

    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.RESPONSE_SET_PERCENTAGE);
        var level = event.payload.percentageState.value;
        vDev.performCommand("exact", {level: level});
    }

    return self.createDirective(header, {});
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "IncrementPercentageRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        },
   *        "deltaPercentage": {
   *            "value": 10.0
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "IncrementPercentageConfirmation",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {}
   * }
   */
Alexa.prototype.handleControlIncrementPercentage = function(event) {
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {},
        maxLevel = 99,
        minLevel = 0,
        newLevel = 0,
        delta = event.payload.deltaPercentage.value,
        response = {};

    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.RESPONSE_INCREMENT_PERCENTAGE);
        var curLevel = vDev.get("metrics:level");
        if(curLevel + delta <= maxLevel) {
            newLevel = curLevel + delta;
        } else {
            newLevel = maxLevel;
        }

        vDev.performCommand("exact", {level: newLevel});
    }

    return self.createDirective(header, response);
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "DecrementPercentageRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        },
   *        "deltaPercentage": {
   *            "value": 10.0
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "DecrementPercentageConfirmation",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {}
   * }
   */
Alexa.prototype.handleControlDecrementPercentage = function(event) {
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {},
        minLevel = 0,
        newLevel = 0,
        delta = event.payload.deltaPercentage.value;

    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.RESPONSE_DECREMENT_PERCENTAGE);
        var curLevel = vDev.get("metrics:level");

        if(curLevel - delta >= minLevel) {
            newLevel = curLevel - delta;
        } else {
            newLevel = minLevel;
        }

        vDev.performCommand("exact", {level: newLevel});
    }

    return self.createDirective(header, {});
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "SetTargetTemperatureRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        },
   *        "targetTemperature": {
   *            "value": 25.0
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "SetTargetTemperatureConfirmation",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {
   *         "targetTemperature": {
   *             "value": 25.0   
   *         },
   *         "temperatureMode": {
   *             "value" "AUTO"
   *         },
   *         "previousState": {
   *             "targetTemperature": {
   *                 "value": 21.0
   *             },
   *             "mode": {
   *                 "value": "AUTO"
   *             }   
   *         }
   *     }
   * }
   */
Alexa.prototype.handleControlSetTargetTemperature = function(event) {
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {},
        temperature = event.payload.targetTemperature.value,
        response = {};

    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
      var maxTemp = vDev.get("metrics:max"),
          minTemp = vDev.get("metrics:min"),
          prevTemp = vDev.get("metrics:level");

      if (temperature < minTemp || temperature > maxTemp) {
          header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_VALUE_OUT_OF_RANGE);
          response = {
              "minimumValue": minTemp,
              "maximumValue": maxTemp
          };
      } else {
          header = self.createHeader(self.NAMESPACE_CONTROL, self.RESPONSE_SET_TARGET_TEMPERATURE);
          vDev.performCommand("exact", {level: temperature});

          response = {
              "targetTemperature": {
                  "value": temperature
              },
              "temperatureMode": {
                  "value": "AUTO"
              },
              "previousState": {
                  "targetTemperature": {
                      "value": prevTemp
                  },
                  "mode": {
                      "value": "AUTO"
                  }
              }
          };
      }
    }
    return self.createDirective(header, response);
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "IncrementTargetTemperatureRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        },
   *        "deltaTemperature": {
   *            "value": 3.6
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "IncrementTargetTemperatureConfirmation",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {
   *         "previousState": {
   *             "targetTemperature": {
   *                 "value": 21.0
   *             },
   *             "mode": {
   *                 "value": "AUTO"
   *             }   
   *         }
   *         "targetTemperature": {
   *             "value": 24.6   
   *         },
   *         "temperatureMode": {
   *             "value" "AUTO"
   *         }
   *     }
   * }
   */
Alexa.prototype.handleControlIncrementTargetTemperature = function(event) {
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {},
        newTemp = 0,
        temperature = event.payload.deltaTemperature.value,
        response = {};

    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
      var maxTemp = vDev.get("metrics:max"),
          minTemp = vDev.get("metrics:min"),
          curTemp = vDev.get("metrics:level");

      if(curTemp + temperature > maxTemp) {
          header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_VALUE_OUT_OF_RANGE);
          response = {
              "minimumValue": minTemp,
              "maximumValue": maxTemp
          };
      } else {
          header = self.createHeader(self.NAMESPACE_CONTROL, self.RESPONSE_INCREMENT_TARGET_TEMPERATURE)
          
          newTemp = curTemp + temperature;

          vDev.performCommand("exact", {level: newTemp});

          response = {
              "previousState": {
                  "mode": {
                      "value": "AUTO"
                  },
                  "targetTemperature": {
                      "value": curTemp
                  }
              },
              "targetTemperature": {
                  "value": newTemp
              },
              "temperatureMode": {
                  "value": "AUTO"
              }
          };
      }
    }

    return self.createDirective(header, response);
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "DecrementTargetTemperatureRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        },
   *        "deltaTemperature": {
   *            "value": 2
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "DecrementTargetTemperatureConfirmation",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {
   *         "previousState": {
   *             "targetTemperature": {
   *                 "value": 23.0
   *             },
   *             "mode": {
   *                 "value": "AUTO"
   *             }   
   *         }
   *         "targetTemperature": {
   *             "value": 21.0   
   *         },
   *         "temperatureMode": {
   *             "value" "AUTO"
   *         }
   *     }
   * }
   */
Alexa.prototype.handleControlDecrementTargetTemperature = function(event) {
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {},
        newTemp = 0,
        temperature = event.payload.deltaTemperature.value,
        response = {};

    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
      var minTemp = vDev.get("metrics:min"),
          maxTemp = vDev.get("metrics:max"),
          curTemp = vDev.get("metrics:level");

      if(curTemp - temperature < minTemp) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_VALUE_OUT_OF_RANGE);
        response = {
            "minimumValue": minTemp,
            "maximumValue": maxTemp
        };
      } else {

        newTemp = curTemp - temperature;

        header = self.createHeader(self.NAMESPACE_CONTROL, self.RESPONSE_DECREMENT_TARGET_TEMPERATURE);
        vDev.performCommand("exact", {level: newTemp});

        response = {
            "previousState": {
                "mode": {
                    "value": "AUTO"
                },
                "targetTemperature": {
                    "value": curTemp
                }
            },
            "targetTemperature": {
                "value": newTemp
            },
            "temperatureMode": {
                "value": "AUTO"
            }
        };
      }
    }
    
    return self.createDirective(header, response);
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "SetLockStateRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        },
   *        "lockState": "LOCKED"
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "SetLockStateConfirmation",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {
   *         "lockState": "LOCKED"
   *     }
   * }
   */
Alexa.prototype.handleControlSetLockState = function(event) {
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {},
        lockState = event.payload.targetTemperature;

    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.RESPONSE_SET_LOCK_STATE)
        var newLevel = lockState == "LOCKED" ? "close" : "open";

        vDev.performCommand("exact", {level: newLevel});

        var response = {
            "lockState": lockState
        };
    }

    return self.createDirective(header, response);
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "SetColorRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        },
   *        "color": {
   *            "hue": 0.0,
   *            "saturation": 1.0000,
   *            "brightness": 1.0000
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "SetColorConfirmation",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {
   *         "achievedState": {
   *             "color": {
   *                "hue": 0.0,
   *                "saturation": 1.0000,
   *                "brightness": 1.0000
   *            }
   *         }
   *     }
   * }
   */
Alexa.prototype.handleControlSetColor = function(event) {
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {},
        response = {},
        hue = event.payload.color.hue,
        saturation = event.payload.color.saturation,
        brightness = event.payload.color.brightness,
        color = hsvToRgb(hue, saturation, brightness);

    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
        var header = self.createHeader(self.NAMESPACE_CONTROL, self.RESPONSE_SET_COLOR);
        response = {
            "achievedState": {
              "color": {
                "hue": hue,
                    "saturation": saturation,
                    "brightness": brightness
                }
            }
        }
        vDev.performCommand("exact", {red: color.r, green: color.g, blue: color.b});
    }

    return self.createDirective(header, response);
}   

Alexa.prototype.handleQuery = function(event) {
    var self = this,
        response = null,
        requestedName = event.header.name;

    //console.log("Handle Query: ", JSON.stringify(event));

    switch (requestedName) {
        case self.REQUEST_LOCK_STATE :
            response = self.handleQueryLockState(event);
            break;
        case self.REQUEST_TARGET_TEMPERATURE :
            response = self.handleQueryTargetTemperature(event);
            break;
        case self.REQUEST_TARGET_READING_TEMPERATURE :
            response = self.handleQueryTargetReadingTemperature(event);
            break;
        default:
            console.log("Error", "Unsupported operation" + requestedName);
            response = self.handleUnsupportedOperation();
            break;
    }
    return response;
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "GetLockStateRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "GetLockStateResponse",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {
   *         "lockSate": "LOCKED",
   *         "applianceResponseTimestamp": "2017-01-12T23:20:50.52Z"
   *     }
   * }
   */
Alexa.prototype.handleQueryLockState = function(event) {
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {},
        response = {};


    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
        var curLevel = vDev.get("metrics:level"),
            updateTime = new Date(vDev.get("updateTime") * 1000),
            lockState = curLevel == "open" ? "UNLOCKED" : "LOCKED";
        
        header = self.createHeader(self.NAMESPACE_QUERY, self.RESPONSE_GET_LOCK_STATE);
        
        response = {
            "lockState": lockState,
            "applianceResponseTimestamp": self.ISODateString(updateTime)
        };
    }

    return self.createDirective(header, response);
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "GetTargetTemperatureRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "GetTargetTemperatureResponse ",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {
   *         "targetTemperature": {
   *             "value": 23.00,
   *             "scale": "CELSIUS"
   *         },
   *         "applianceResponseTimestamp": "2017-01-12T23:20:50.52Z",
   *         "temperatureMode": {
   *             "value": "HEAT",
   *             "friendlyName": ""
   *         }
   *     }
   * }
   */
Alexa.prototype.handleQueryTargetTemperature = function(event){
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {},
        response = {};

    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
        var curTemp = Math.round(vDev.get("metrics:level")),
            updateTime = new Date(vDev.get("updateTime") * 1000);
        
        header = self.createHeader(self.NAMESPACE_QUERY, self.RESPONSE_TARGET_TEMPERATURE),

        response = {
            "targetTemperature": {
                "value": curTemp,
                "scale": "CELSIUS"
            },
            "applianceResponseTimestamp": self.ISODateString(updateTime),
            "temperatureMode": {
                "value": "AUTO",
                "friendlyName": ""
            }
        };
    }

    return self.createDirective(header, response);
};

/**
   *
   * @param event
   * {
   *  "header": {
   *       "messageId": "01ebf625-0b89-4c4d-b3aa-32340e894688",
   *        "name": "GetTemperatureReadingRequest",
   *        "namespace": "Alexa.ConnectedHome.Control",
   *        "payloadVersion": "2"
   *  },
   *  "payload": {
   *        "accessToken": "[OAuth token here]",
   *        "appliance": {
   *            "additionalApplianceDetails": {
   *                {"device": "[Z-Way Device ID]"}
   *            },
   *            "applianceId": "[Device ID]"
   *        }
   *    }
   * }
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "GetTemperatureReadingResponse ",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {
   *         "temperatureReading": {
   *             "value": 23.00,
   *             "scale": "CELSIUS"
   *         },
   *         "applianceResponseTimestamp": "2017-01-12T23:20:50.52Z"
   *     }
   * }
   */
Alexa.prototype.handleQueryTargetReadingTemperature = function(event){
    var self = this,
        vDev = self.getvDev(event.payload.appliance.additionalApplianceDetails.device),
        header = {},
        response = {};

    if(!vDev) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_NO_SUCH_TARGET);
    } else if(vDev.get("metrics:isFailed")) {
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_TARGET_OFFLINE);
    } else {
        var curTemp = Math.round(vDev.get("metrics:level")),
            updateTime = new Date(vDev.get("updateTime") * 1000);

        header = self.createHeader(self.NAMESPACE_QUERY, self.RESPONSE_TARGET_READING_TEMPERATURE)
        
        response = {
            "temperatureReading": {
                "value": curTemp,
                "scale": "CELSIUS"
            },
            "applianceResponseTimestamp": self.ISODateString(updateTime)
        };
    }

    return self.createDirective(header, response);
};


/**
   *
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "UnsupportedOperationError",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {}
   * }
   */
Alexa.prototype.handleUnsupportedOperation = function() {
    var self = this,
        header = self.createHeader(self.NAMESPACE_CONTROL, self.ERROR_UNSUPPORTED_OPERATION);
    return self.createDirective(header, {});
};


/**
   * @param fault
   * @return {{}}
   * {
   *     "header": {
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "UnexpectedInformationReceivedError",
   *         "namespace": "Alexa.ConnectedHome.Control",
   *         "payloadVersion": "2"
   *     },
   *     "payload": {
   *         "faultingParameter": "[FAULT]"
   *     }
   * }
   */
Alexa.prototype.handleUnexpectedInfo = function(fault) {
    var self = this,
        header = self.createHeader(NAMESPACE_CONTROL, ERROR_UNEXPECTED_INFO);

    var payload = {
        "faultingParameter" : fault
    };

    return createDirective(header,payload);
};

Alexa.prototype.getvDev = function(deviceId) {
    var self = this,
        vDev = self.controller.devices.get(deviceId);

    return vDev;
};

/**
   * @param namespace
   * @param name
   * @return {{}}
   * {
   *     
   *         "messageId": "26fa11a8-accb-4f66-a272-8b1ff7abd722",
   *         "name": "[name]",
   *         "namespace": "[namespace]",
   *         "payloadVersion": "2"
   *     
   * }
   */
Alexa.prototype.createHeader = function(namespace, name) {
    var self = this;
    return {
        "messageId": self.createMessageId(),
        "namespace": namespace,
        "name": name,
        "payloadVersion": "2"
    };
};

/**
   * @param header
   * @param payload
   * @return {{}}
   * {
   *     "header": {
   *         ["header"]
   *     },
   *     "payload": {
   *         ["payload"]
   *     }
   * }
   */
Alexa.prototype.createDirective = function(header, payload) {
    return {
        "header" : header,
        "payload" : payload
    };
};

Alexa.prototype.buildAppliances = function() {
    var self = this,
        devices = self.controller.devices,
        locations = self.controller.locations,
        moduleName = "Alexa",
        langFile = self.controller.loadModuleLang(moduleName),
        instances = self.controller.instances,
        active_devices = self.config.devices.map(function(dev) {return dev.id}); 

    var appliances = devices.filter(function(device) {
        var vDev = self.controller.devices.get(device.id),
            pos = active_devices.indexOf(device.id);
        
        if(pos != -1) {
            return vDev;
        }
    }).map(function(vDev) {
        var appliance = {
            "applianceId": "",
            "friendlyDescription": "undefined",
            "friendlyName": "undefined",
            "isReachable": true,
            "manufacturerName": "undefined",
            "modelName": "undefined",
            "version": "undefined",
            "additionalApplianceDetails": {},
            "actions": [],
            "applianceTypes": []
        };

        switch(vDev.get("deviceType")) {
            case "switchBinary":
                appliance.actions.push("turnOn", "turnOff");
                break;
            case "switchMultilevel":
                appliance.actions.push("turnOn", "turnOff", "setPercentage", "incrementPercentage", "decrementPercentage");
                break;
            case "sensorMultilevel":
                appliance.actions.push("getTargetTemperature", "getTemperatureReading");
                break;
            case "toggleButton":
                appliance.actions.push("turnOn");
                var scene = _.find(instances, function(inst) {
                   return inst.id == vDev.get("creatorId") && inst.moduleId == "LightScene";
                });
                if(typeof scene !== 'undefined') {appliance.applianceTypes.push("SCENE_TRIGGER");}
                break;
            case "thermostat":
                appliance.actions.push("setTargetTemperature", "incrementTargetTemperature", "decrementTargetTemperature", "getTargetTemperature", "getTemperatureReading");
                appliance.applianceTypes.push("THERMOSTAT");
                break;
            case "doorlock":
                appliance.actions.push("getLockState", "setLockState");
                appliance.applianceTypes.push("SMARTLOCK");
                break;
            case "switchRGBW":
                appliance.actions.push("setColor", "turnOff", "turnOn");
                appliance.applianceTypes.push("LIGHT");
                break;
        }

        appliance.applianceId = vDev.id.replace(/[^\w_\-=#;:?@&]/g, '_'); // replace not allowed characters
        appliance.friendlyDescription;

        var pos = active_devices.indexOf(vDev.id),
            locationId = vDev.get("location");
        if(pos !== -1) {
            var deviceName = self.config.devices[pos].callName;
        } else {
            // fallback if no call name set
            var deviceName = vDev.get("metrics:title") == "" ? "Unknow device" : vDev.get("metrics:title");
        }

        if(locationId !== 0 && self.config.assign_room) {
            var location = _.find(locations, function(location) {
               return location.id === locationId;
            });
            var room = location.title;
            friendlyName = deviceName + " " + room;
            appliance.friendlyDescription = deviceName + " " + room + " connected via Z-Way";
        } else {
            friendlyName = deviceName;
            appliance.friendlyDescription = deviceName + " connected via Z-Way";
        }

        appliance.friendlyName = friendlyName;
        appliance.modelName = vDev.get("deviceType");
        appliance.additionalApplianceDetails = {"device": vDev.id};
        return appliance;
    }, active_devices);
    
    return appliances;
};

Alexa.prototype.createMessageId = function() {
    var d = new Date().getTime();

    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });

    return uuid;
};

Alexa.prototype.ISODateString = function (d) {
    function pad(n) {return n<10 ? '0'+n : n}
    return d.getUTCFullYear()+'-'
        + pad(d.getUTCMonth()+1)+'-'
        + pad(d.getUTCDate())+'T'
        + pad(d.getUTCHours())+':'
        + pad(d.getUTCMinutes())+':'
        + pad(d.getUTCSeconds())+'Z';
};

// --------------- Public HTTP API -------------------


Alexa.prototype.externalAPIAllow = function (name) {
    var _name = !!name ? ("Alexa." + name) : "AlexaAPI";

    ws.allowExternalAccess(_name, this.controller.auth.ROLE.USER);
    ws.allowExternalAccess(_name + ".callActions", this.controller.auth.ROLE.USER);
};

Alexa.prototype.externalAPIRevoke = function (name) {
    var _name = !!name ? ("Alexa." + name) : "AlexaAPI";

    ws.revokeExternalAccess(_name);
    ws.revokeExternalAccess(_name + ".callActions");
};

Alexa.prototype.defineHandlers = function () {
    var self = this;

    this.AlexaAPI = function () {
        return {status: 400, body: "Bad AlexaAPI request "};
    };

    this.AlexaAPI.callActions = function (url, request) {
        console.log("Received data from Alexa Skill");
        //console.log("request:", JSON.stringify(request, null , 4));
        if (request.method === "POST" && request.body) {
            reqObj = typeof request.body === "string" ? JSON.parse(request.body) : request.body;

            var requestedNamespace = reqObj.header.namespace;

            switch(requestedNamespace) {
                case self.NAMESPACE_DISCOVERY:
                    response = self.handleDiscovery(reqObj);
                    break;
                case self.NAMESPACE_CONTROL:
                    response = self.handleControl(reqObj);
                    break;
                case self.NAMESPACE_QUERY:
                    response = self.handleQuery(reqObj);
                    break;
                default:
                    console.log("Error: ", "Unsupported namespace: " + requestedNamespace);
                    self.handleUnexpectedInfo(requestedNamespace);
                    break;
            }
            console.log("Return Response to Alexa Skill");
            //console.log("response:", JSON.stringify(response, null, 4));
            return response;
        }
    };
};

/**
* HSV/HSB to RGB color conversion
*
* H runs from 0 to 360 degrees
* S and V run from 0 to 100
*
*/
function hsvToRgb(h, s, v) {
    var r, g, b;
    var i;
    var f, p, q, t;
     
    // Make sure our arguments stay in-range
    h = Math.max(0, Math.min(360, h));
    s = Math.max(0, Math.min(100, s));
    v = Math.max(0, Math.min(100, v));
    // We accept saturation and value arguments from 0 to 100 because that's
    if(s == 0) {
        // Achromatic (grey)
        r = g = b = v;
        return {
            r:Math.round(r * 255), 
            g:Math.round(g * 255), 
            b:Math.round(b * 255)
        };
    }
     
    h /= 60; // sector 0 to 5
    i = Math.floor(h);
    f = h - i; // factorial part of h
    p = v * (1 - s);
    q = v * (1 - s * f);
    t = v * (1 - s * (1 - f));
     
    switch(i) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
     
        case 1:
            r = q;
            g = v;
            b = p;
            break;
     
        case 2:
            r = p;
            g = v;
            b = t;
            break;
     
        case 3:
            r = p;
            g = q;
            b = v;
            break;
     
        case 4:
            r = t;
            g = p;
            b = v;
            break;
     
        default: // case 5:
            r = v;
            g = p;
            b = q;
    }
     
    return {
        r:Math.round(r * 255), 
        g:Math.round(g * 255), 
        b:Math.round(b * 255)
    };
}