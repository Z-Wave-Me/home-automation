/* RaZOR
 *
 * OpenRemote, the Home of the Digital Home.
 * Adopted for Z-Wave.Me Z-Way
 * Copyright 2008-2013, OpenRemote Inc.
 *
 * See the contributors.txt file in the distribution for a
 * full listing of individual contributors.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

/*** OpenRemoteHelpers Z-Way HA module *******************************************

Description:
    This module provides HTTP helpers for OpenRemote integration.

Author: Pieter E. Zanstra
Converted into Z-Way HA module: Poltorak Serguei

Version 1.01.02       2015-02-12 (Pieter E. Zanstra)
Added a second argument to metrics command, so the user can select other attributes than the
default level-attribute (http://192.168.0.85:8083/OpenRemote/metrics/ZWayVDev_zway_26-0-37/icon)
Without the second argument the call returns all device attributes as json.
Closed the Switch statement with keyword default: to cater for erroneous function calls 

Version 1.01.01       2014-09-09 (Yurkin Vitaliy aivs@z-wave.me)
Added metrics command to get metrics (http://192.168.0.85:8083/OpenRemote/metrics/ZWayVDev_zway_26-0-37)

Version 1.01.01	      2014-02-28
Testing all functions and bugfixing (Yurkin Vitaliy aivs@z-wave.me)

Version 1.01.00       2013-12-11
Converted into Z-Way HA module

Version 1.00.009      2013-09-27
Updated installation instruction in this file

Version 1.00.008      2013-09-25
Adaptations for RazBerry v1.4 release
- .SetWithDuration has been abandoned so DimmerSet has been changed again.


Version 1.00.007      2013-08-07
- Added a number of SensorMultilevel variants (Humidity, Luminescence)

Version 1.00.006      2013-07-31
- Fixed error with DimmerSet function

Version 1.00.005      2013-07-21
- Fixed error in DimmerLevel
- Now use .SetWithDuration (0) instead of .Set in DimmerSet function
- Added function DimmerStatus (author Velouria)       

USAGE
General parameters used in the calls are:
N        the number that designates a Z-Wave device
I        the number that refers to an instance (e.g. a channel in a dual binary switch
         Use 0 for single binary switches. For dual switches use 1 and 2 for 
	     channels 1 and 2 respectively)
${param} This variable is an OpenRemote system parameter that is used e.g. for 
         passing values from a slider.
S		 Scale (e.g. Watt, kWh, etc.)

Status functions that return the value "on" or "off" are to be used in OpenRemote with 
sensors of the type:switch. Apply Regular expression: on|off in the http call. 		 

OpenRemote usage: http://IP:8083/OpenRemote/<Command>/N/I/...

SwitchBinaryOn/N/I
SwitchBinaryOff/N/I
SwitchBinaryStatus/N/I
    Add Regular Expression on|off in http call specification 
    Do use Sensor type:switch with this command
SwitchMultilevelSet/N/I/${param}
SwitchMultilevelLevel/N/I
    Returns exact dimmer level
SwitchMultilevelStatus/N/I
    Add Regular Expression on|off in http call specification 
    Do use Sensor type:switch with this command
AlarmStatus/N
    off means not triggered
SensorBinaryStatus/N/I/Type
    off means not triggered
ThermostatLevel/N
ThermostatSet/N/${param}
ThermostatSetMode/N/Mode
ThermostatModeName/N
    Do use RexExp [\w\s]{1,} in the http-call to get rid of quotes
BatteryLevel/N
    Do use Sensor type:Range with this command for use in slider
MeterLevel/N/I/S
    Use S=0 for kWh; S=2 for Watts;  
MeterReset/N/I
TemperatureLevel/N/I
HumidityLevel/N/I
SensorMultilevel/N/I/S
DoorLock/N
DoorUnlock/N

TODO:
- Add helpers for vDevs

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function OpenRemoteHelpers (id, controller) {
    // Call superconstructor first (AutomationModule)
    OpenRemoteHelpers.super_.call(this, id, controller);
}

inherits(OpenRemoteHelpers, AutomationModule);

_module = OpenRemoteHelpers;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

OpenRemoteHelpers.prototype.init = function (config) {
    OpenRemoteHelpers.super_.prototype.init.call(this, config);

    // define global handler for HTTP requests
    OpenRemote = function(url, request) {
        var params = url.split("/");
        params.shift(); // shift empty string before first /
        var cmd = params.shift();
        var N = params.shift();
        var I = params.shift();

        switch(cmd) {
            case "SwitchBinaryOn":
                zway.devices[N].instances[I].SwitchBinary.Set(255);
                return "on";
                
            case "SwitchBinaryOff":
                zway.devices[N].instances[I].SwitchBinary.Set(0);
                return "off";
                
            case "SwitchBinaryStatus":
                return zway.devices[N].instances[I].SwitchBinary.data.level.value ? "on" : "off";

            case "SwitchMultilevelSet":
                var level = params.shift();
                zway.devices[N].instances[I].SwitchMultilevel.Set(level);
                return level;
                
            case "SwitchMultilevelStatus":
                return zway.devices[N].instances[I].SwitchMultilevel.data.level.value ? "on" : "off";
                
            case "SwitchMultilevelLevel":
                return zway.devices[N].instances[I].SwitchMultilevel.data.level.value;
            
            case "StartLevelChange":
               var dir = params.shift();
               return zway.devices[N].instances[I].SwitchMultilevel.StartLevelChange(dir);

            case "StopLevelChange":
               return zway.devices[N].instances[I].SwitchMultilevel.StopLevelChange();
            
            case "AlarmStatus":
                // there are usually no instances for alarms
                return (zway.devices[N].AlarmSensor.data.level.value == 0) ? "off" : "on" ;
            
            case "SensorBinaryStatus":
                var T = params.shift(); // sensor type
                return (zway.devices[N].instances[I].SensorBinary.data[T].level.value == 0) ? "off" : "on" ;

            case "ThermostatLevel":
                var temp = I; // there are usually no instances for thermostats
                var mode = zway.devices[N].ThermostatMode ? zway.devices[N].ThermostatMode.data.mode.value : null;
                if (mode === null) {
                    // no ThemorstatMode CC - pick up first mode
                    for (var key in zway.devices[N].ThermostatSetPoint.data) {
                        var _modeId = parseInt(key, 10);
                        if (!isNaN(_modeId)) {
                            mode = _modeId;
                            break;
                        }
                    }
                }
                if (mode !== null) {
                    return zway.devices[N].ThermostatSetPoint.data[mode].setVal.value;
                }
                return 0;

            case "ThermostatSet":
                var temp = I; // there are usually no instances for thermostats
                var mode = zway.devices[N].ThermostatMode ? zway.devices[N].ThermostatMode.data.mode.value : null;
                if (mode === null) {
                    // no ThemorstatMode CC - pick up first mode
                    for (var key in zway.devices[N].ThermostatSetPoint.data) {
                        var _modeId = parseInt(key, 10);
                        if (!isNaN(_modeId)) {
                            mode = _modeId;
                            break;
                        }
                    }
                }
                if (mode !== null) {
                    zway.devices[N].ThermostatSetPoint.Set(mode, temp);
                    return temp;
                }
                return 0;

            case "ThermostatSetMode":
                var mode = I; // there are usually no instances for thermostats
        		if (! zway.devices[N].ThermostatMode.data[mode]) {
        		    for (var m in zway.devices[N].ThermostatMode.data) {
        		        if (zway.devices[N].ThermostatMode.data[m] && zway.devices[N].ThermostatMode.data[m].modeName && zway.devices[N].ThermostatMode.data[m].modeName.value.toLowerCase() == mode.toLowerCase()) {
        		            mode = m;
        		            break;
                                }
                            }
                        }
                zway.devices[N].ThermostatMode.Set(mode);
                return mode;

            case "ThermostatModeName":
                // there are usually no instances for thermostats
                if (zway.devices[N].ThermostatMode) {
                    var mode = zway.devices[N].ThermostatMode.data.mode.value;
                    return zway.devices[N].ThermostatMode.data[mode].modeName.value;
                } else {
                    // no ThemorstatMode CC - pick up first mode
                    for (var key in zway.devices[N].ThermostatSetPoint.data) {
                        var _modeId = parseInt(key, 10);
                        if (!isNaN(_modeId)) {
                            var mode = _modeId;
                            return zway.devices[N].ThermostatSetPoint.data[mode].modeName.value
                        }
                    }
                }
                return "?";

            case "BatteryLevel":
                // Battery is never in instances
                zway.devices[N].Battery.Get();
                return zway.devices[N].Battery.data.last.value;
            
            case "MeterLevel":
                var S = params.shift();
                zway.devices[N].instances[I].Meter.Get();
                return zway.devices[N].instances[I].Meter.data[S].val.value;
            
            case "MeterReset":
                zway.devices[N].instances[I].Meter.Reset();
                return 0; // just to return something
            
            case "TemperatureLevel":
                var S = 1;
                zway.devices[N].instances[I].SensorMultilevel.Get();
                return zway.devices[N].instances[I].SensorMultilevel.data[S].val.value;
                
            case "HumidityLevel":
                var S = 5;
                zway.devices[N].instances[I].SensorMultilevel.Get();
                return zway.devices[N].instances[I].SensorMultilevel.data[S].val.value;

            case "SensorMultilevel":
                var S = params.shift();
                zway.devices[N].instances[I].SensorMultilevel.Get();
                return zway.devices[N].instances[I].SensorMultilevel.data[S].val.value;

            case "DoorLock":
                // there are usually no instances for door locks
                zway.devices[N].DoorLock.Set(255);
                return "on";

            case "DoorUnLock":
                // there are usually no instances for door locks
                zway.devices[N].DoorLock.Set(0);
                return "off";

            case "DoorStatus":
                // there are usually no instances for door locks
                return zway.devices[N].DoorLock.data.level.value ? "on" : "off";

			case "DeviceName":
                return zway.devices[N].instances[I].NodeNaming.data.nodename.value;

            case "DeviceLocation":
               	return zway.devices[N].instances[I].NodeNaming.data.location.value;

            case "metrics":
                // used HA API for all device to get metrics
                if (I !== "") {
                  attrib = "metrics:" + I;
                  }
                else {
                   attrib = "metrics";
                  }
               return this.controller.devices.get(N).get(attrib);

// Your "case" statements may go after this line, but before keyword default:  !
				
			default:
			     return "Error: Function " + cmd  + " is not defined in OpenRemoteHelpers";
        }
    };
    ws.allowExternalAccess("OpenRemote", this.controller.auth.ROLE.USER); // login required
};

OpenRemoteHelpers.prototype.stop = function () {
    OpenRemoteHelpers.super_.prototype.stop.call(this);
	
	ws.revokeExternalAccess("OpenRemote");
    OpenRemote = null;
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------


