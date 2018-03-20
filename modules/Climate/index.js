/*** Climate Z-Way HA module *******************************************

 Version: 1.2.0 stable
 (c) Z-Wave.Me, 2017
 -----------------------------------------------------------------------------
 Author:    Niels Roche <nir@zwave.eu>,
            Martin Petzold <mp@zwave.eu>,
            Michael Hensche <mh@zwave.eu>,
            Karsten Reichel <kar@zwave.eu>
 Description:
 This module creates a central heat control that can control all thermostats of a room
 by defining a temperature sensor and a target temperature.

 ******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Climate(id, controller) {
    // Call superconstructor first (AutomationModule)
    Climate.super_.call(this, id, controller);
}

inherits(Climate, AutomationModule);

_module = Climate;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Climate.prototype.scheduleInputAnlayseAndAdd = function (timetable, schedule) {
    var self = this;

    timetable.scheduleTable.forEach(function (args) {
        var days = [];

        for (var i = 0; i <= 6; i++) {
            if (args[i]) {
                days.push(i);
            }
        }

        // is there already an schedule that has same start or end date
        // convert same end|start time
        // S1: 08:00 -> 22:00 
        // S2: 22:00 -> 08:00
        // -> S2: 22:01 -> 07:59
        startTime = args.stimes || '';
        endTime = args.etimes || '';

        schedule.forEach(function (s) {
        	if (s.RoomID === parseInt(args.rooms, 10)) {
        		if (_.isEqual(s.Weekday, days)) {
        			if (startTime === s.Endtime) {

        				hours = parseInt(startTime.substr(0,2),10);
        				minutes = parseInt(startTime.substr(3,2),10);

        				// add one minute
        				minutes++;

        				if (minutes > 59) {
        					minutes = 0;
        					hours++;
        					if (hours > 23) {
        						hours = 0;
        					}
        				}

        				if (minutes < 10) {
        					minutes = "0" + minutes;
        				}

        				if (hours < 10) {
        					hours = "0" + hours;
        				}        				
        				startTime = hours + ":" + minutes;
        			}
        			if (endTime === s.Starttime) {
        				hours = parseInt(endTime.substr(0,2),10);
        				minutes = parseInt(endTime.substr(3,2),10);

        				// remove one minute
        				minutes--;

        				if (minutes < 0) {
        					minutes = 59;
        					hours--;
        					if (hours < 0) {
        						hours = 23;
        					}
        				}

        				if (minutes < 10) {
        					minutes = "0" + minutes;
        				}

        				if (hours < 10) {
        					hours = "0" + hours;
        				}

        				endTime = hours + ":" + minutes;      				
        			}
        		}
        		// if selected days are not equal we need to loop all entries
        		else {
        			days = days.filter(function (d) {
        				if (s.Weekday.indexOf(d) > -1) {
        					modStartTime = startTime;
        					modEndTime = endTime;
							if (startTime === s.Endtime) {

		        				hours = parseInt(startTime.substr(0,2),10);
		        				minutes = parseInt(startTime.substr(3,2),10);

		        				// add one minute
		        				minutes++;

		        				if (minutes > 59) {
		        					minutes = 0;
		        					hours++;
		        					if (hours > 23) {
		        						hours = 0;
		        					}
		        				}

		        				if (minutes < 10) {
		        					minutes = "0" + minutes;
		        				}

		        				if (hours < 10) {
		        					hours = "0" + hours;
		        				}        				
		        				modStartTime = hours + ":" + minutes;
	        				}
	        				if (endTime === s.Starttime) {
		        				hours = parseInt(endTime.substr(0,2),10);
		        				minutes = parseInt(endTime.substr(3,2),10);

		        				// remove one minute
		        				minutes--;

		        				if (minutes < 0) {
		        					minutes = 59;
		        					hours--;
		        					if (hours < 0) {
		        						hours = 23;
		        					}
		        				}

		        				if (minutes < 10) {
		        					minutes = "0" + minutes;
		        				}

		        				if (hours < 10) {
		        					hours = "0" + hours;
		        				}

		        				modEndTime = hours + ":" + minutes;				
	        				}
	        				if (modStartTime !== startTime || modEndTime !== endTime) {
	        					schedule.push(
	            					{
						                "RoomID": parseInt(args.rooms, 10) || '',
						                "Room": "",
						                "Weekday": [d] || '',
						                "Starttime": modStartTime,
						                "Endtime": modEndTime,
						                "Temperature": args.temperature || ''
						            }
					        	);
					        	return false;
	        				}
	        				else {
	        					return true;
	        				}		
        				}
                        else
                        {
                            return true;
                        }
        			});
        		}
        	}
        });

        if (days.length)
        {
	        schedule.push(
	            {
	                "RoomID": parseInt(args.rooms, 10) || '',
	                "Room": "",
	                "Weekday": days || '',
	                "Starttime": startTime,
	                "Endtime": endTime,
	                "Temperature": args.temperature || ''
	            }
	        );
	    }
    });

    return schedule;
};



Climate.prototype.init = function (config) {
    Climate.super_.prototype.init.call(this, config);
    var self = this;
    self.fallbackOverTime=[];
    this.newRooms = self.config.roomSettings.roomTable;
    this.vDev = null;
    this.schedule = [];
    this.alreadyChangedThermostats = [];
    this.registerdSchedules = {};
    this.alarmTimer = {};
    this.fallbackThermostatSettings = {},
    this.langFile = self.controller.loadModuleLang("Climate"),
    this.schedule = self.scheduleInputAnlayseAndAdd(self.config.schedule, this.schedule);
    this.waitingTime = config.resetTime * 1000*60*60; // convert in hours
    self.initFunctions();
    this.createHouseControl();
    this.initialCCTurnON = function () {
        self.activateCC = setTimeout(function () {
            self.vDev.performCommand(self.vDev.get('metrics:state'));
        }, 20000);
    };

    this.pollReset =  function(){
        var now = (new Date()).getTime();

        //self.log("self.fallbackOverTime:", self.fallbackOverTime, true);

        Object.keys(self.resetList).forEach(function (resetEntry){
            var resetvDev = self.controller.devices.get(resetEntry);

            if (!!resetvDev) {
                //self.log("time diff:", now - self.resetList[resetEntry]);
                if (self.resetList[resetEntry] <= now) {
                    // check if a fallback level exists
                    entryExists = _.filter(self.fallbackOverTime, function (entry) {
                        return entry.id === resetvDev.id;
                    });

                    // set new level if values are not equal
                    if (entryExists[0] && ( parseFloat(entryExists[0].temperature) !== resetvDev.get("metrics:level"))) {
                        // add thermostat to the module trigger array or change list
                        if (self.alreadyChangedThermostats.indexOf(resetvDev.id) < 0) {
                            self.alreadyChangedThermostats.push(resetvDev.id);
                        }
                        resetvDev.performCommand("exact", { level: entryExists[0].temperature});

                        delete self.resetList[resetEntry];
                    }
                }
            }
        });
    }

    this.controller.on("ClimateReset_"+this.id+".poll", this.pollReset);
    this.controller.emit("cron.addTask", "ClimateReset_"+this.id+".poll", {
        minute: null,
        hour: null,
        weekDay: null,
        day: null,
        month: null
    });

    this.triggerControl = function(vdev){
        var isThermostat = vdev.get('deviceType') === 'thermostat',
            roomId = vdev.get('location');

        if (isThermostat && roomId > 0){

            var entryExists = _.filter(self.fallbackOverTime, function (entry) {
                return entry.id === vdev.id;
            })

            if (entryExists[0]){
                entryExists[0].temperature = vdev.get('metrics:level');
            } else {
                self.fallbackOverTime.push({id: vdev.id, temperature: vdev.get('metrics:level')});
            }

            //deregister thermostat
            self.controller.devices.off(vdev.id, "change:metrics:level", self.sensorFunction);
            //register thermostat
            self.controller.devices.on(vdev.id, "change:metrics:level", self.sensorFunction);
        }
    }

    this.controller.devices.on('created', this.triggerControl);
    this.controller.devices.forEach(this.triggerControl);

    // remove restart listener and timeouts
    this.removeInitListener = setTimeout(function () {

        self.controller.off('core.start', self.initialCCTurnON);

        if (self.activateCC) {
            clearTimeout(self.activateCC);
            self.activateCC = null;
        }
        if (self.removeInitListener) {
            clearTimeout(self.removeInitListener);
            self.removeInitListener = null;
        }

    }, 60000); // wait a minute*/

    // restart app after server restart
    this.controller.on('core.start', this.initialCCTurnON);
};

Climate.prototype.stop = function () {
    var self = this;
    self.newRooms.forEach(function (room) {
        self.regTH('off', room.room);
    });

    var devID = "Climate_" + self.id;

    self.vDev = null;

    self.controller.devices.remove(devID);

    for (var key in self.registerdSchedules) {
        self.registerdSchedules[key].forEach(function (pollEntry) {
            self.controller.emit("cron.removeTask", pollEntry);
            //console.log('remove task ...', self.registerdSchedules[key]);
            if (key === 'start') {
                self.controller.off(pollEntry, self.pollByStart);
            } else {
                self.controller.off(pollEntry, self.pollByEnd);
            }
        });

        // clean registry 
        self.registerdSchedules[key] = [];
    }

    if (self.activateCC) {
        clearTimeout(self.activateCC);
        self.activateCC = null;
    }

    if (self.removeInitListener) {
        clearTimeout(self.removeInitListener);
        self.removeInitListener = null;
    }

    this.controller.emit("cron.removeTask", "ClimateReset_"+this.id+".poll");
    this.controller.off("ClimateReset_"+this.id+".poll", this.pollReset);

    this.controller.off('core.start', self.initialCCTurnON);

    Climate.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

Climate.prototype.createHouseControl = function () {

    // use vdevinfo if it exists
    var self = this,
        vdevEntry = this.controller.vdevInfo["Climate_" + this.id] && this.controller.vdevInfo["Climate_" + this.id].metrics ? this.controller.vdevInfo["Climate_" + this.id].metrics : undefined;

    this.pollByStart = function (filter) {

        var pollIdentifier = this.event || filter,
            identifierArr = pollIdentifier.split('.'),
            locId = parseInt(identifierArr[1], 10),
            schedulePreset = null,
            thermostats = [],
            metrRooms = [];

        /*
         * identifierArr[1] ... room name
         * identifierArr[7] ... '-' separeated temperature
         * 
         */

        schedulePreset = identifierArr[7] !== 'poll' ? identifierArr[7].replace('-', '.') : null;

        //get thermostats
        thermostats = self.controller.devices.filter(function (device) {
            return device.get('deviceType') === 'thermostat' &&
                device.get('location') === locId;
        });

        if (thermostats.length > 0) {

            // create fallback values 
            self.createFallbackThermostatSettings(locId, thermostats);

            if (self.vDev === null) {
                self.vDev = self.controller.devices.get('Climate_' + self.id);
            }

            metrRooms = self.vDev.get('metrics:rooms');

            // update value in widget
            metrRooms.forEach(function (room) {
                if (parseInt(room.room, 10) === locId) {

                    // get modus temperature
                    if (!!schedulePreset) {
                        switch (schedulePreset) {
                            case 'F':
                                temp = 6;
                                break;
                            case 'E':
                                temp = parseFloat(room.energySave);
                                break;
                            case 'C':
                                temp = room.comfort;
                                break;                                
                            default:
                                temp = schedulePreset;
                        }
                    }

                    room.targetTemp = 't ~ ' + temp;
                }
            });

            self.vDev.set('metrics:rooms', metrRooms);

            thermostats.forEach(function (thermostat) {
                self.performChangesOnThermostats(thermostat,temp);
            });
        }
    };

    this.pollByEnd = function () {
        //console.log('do by end ...');

        var pollIdentifier = this.event,
            identifierArr = pollIdentifier.split('.'),
            locId = parseInt(identifierArr[1], 10),
            thermostats = [],
            metrRooms = [];


        /*
         * identifierArr[1] ... room name
         * identifierArr[7] ... '-' separeated temperature
         * 
         */

        //schedulePreset = identifierArr[7] !== 'poll'? identifierArr[7].replace('-', '.') : null;

        //get thermostats
        thermostats = self.controller.devices.filter(function (device) {
            return device.get('deviceType') === 'thermostat' &&
                device.get('location') === locId;
        });

        if (thermostats.length > 0) {

            metrRooms = self.vDev.get('metrics:rooms');

            // get all rooms controlled by climate app, and update them
            // update value in widget
            metrRooms.forEach(function (room) {
                if (parseInt(room.room, 10) === locId) {
                    if (room.fallback) {
                        temp = room.fallback == 'F' ? 6 : (room.fallback == 'C' ? room.comfort : parseFloat(room.energySave));
                    }
                    else {
                        temp = parseFloat(room.energySave);
                    }

                    room.targetTemp = temp;
                }
            });

            self.vDev.set('metrics:rooms', metrRooms);

            thermostats.forEach(function (thermostat) {
                self.performChangesOnThermostats(thermostat,temp);
            });
        }
    };

    this.configureSchedules = function (roomId) {
        var subString = 'Climate.' + roomId + '.',
            tempSet = false;

        if (typeof self.registerdSchedules['start'] === 'undefined' || typeof self.registerdSchedules['end'] === 'undefined')
            return false;

        var scheduleFilter = self.registerdSchedules['start'].concat(self.registerdSchedules['end']);

        scheduleFilter = scheduleFilter.filter(function (schedule) {
            return ~schedule.indexOf(subString);
        });



        _.forEach(scheduleFilter, function (scheduleEntry) {
            var scheduleItems = scheduleEntry.split('.'),
                now = new Date(),
                startStop = scheduleItems[4],
                m = parseInt(scheduleItems[6], 10),
                h = parseInt(scheduleItems[5], 10),
                d = parseInt(scheduleItems[3], 10);

            self.controller.emit("cron.addTask", scheduleEntry, {
                minute: m,
                hour: h,
                weekDay: d,
                day: null,
                month: null
            });

            if (startStop === 'start') {
                self.controller.on(scheduleEntry, self.pollByStart);
            } else if (startStop === 'end') {
                self.controller.on(scheduleEntry, self.pollByEnd);
            }

            /*
             * filter for start /end - by index of or substring 'Climate.1.0.2.'
             * check if start <= n < end
             * check logic
             *
             * */
            if (now.getDay() === d) {
                if (startStop === 'start') {
                    var nowTs = now.getTime(),
                        midnight = (new Date()).setHours(23, 59),
                        startI = startStop === 'start' ? (new Date()).setHours(h, m) : undefined,
                        endI = startStop === 'end' ? (new Date()).setHours(h, m) : undefined,
                        compareString = scheduleItems[0] + '.' + scheduleItems[1] + '.' + scheduleItems[2] + '.' + d;

                    if (startStop === 'start') {
                        endI = getTime(scheduleFilter, compareString + '.end');
                    } else {
                        startI = getTime(scheduleFilter, compareString + '.start');
                    }

                    // check if end is next day
                    if (startStop === 'start' && ((!endI && startI) || (startI && endI && endI < startI))) {
                        nextDay = d === 6 ? 0 : d + 1;
                        newCS = scheduleItems[0] + '.' + scheduleItems[1] + '.' + scheduleItems[2] + '.' + nextDay;

                        endI = getTime(scheduleFilter, compareString + '.end') + 86400000; // add 24h
                    }

                    if ((!startI && endI && nowTs < endI) ||
                        (!endI && startI && startI <= midnight) ||  // if now is between start and end AND if end is on new day
                        (startI && endI && startI <= nowTs && nowTs < endI)) { // if now is between start and end
                        self.pollByStart(scheduleEntry);
                        tempSet = true;
                    }
                }
            }
        });

        return tempSet;
    }

    function getTime(filterArray, compareString) {
        var time = 0,
            filter = [];

        filterArray.forEach(function (entry) {
            if (entry.indexOf(compareString) > -1) {
                filter = entry.split('.');
                time = (new Date().setHours(parseInt(filter[5], 10), parseInt(filter[6], 10)));
            }
        });

        return time;
    }

    self.vDev = self.controller.devices.create({
        deviceId: "Climate_" + this.id,
        defaults: {
            deviceType: "sensorMultiline",
            metrics: {
                multilineType: "Climate",
                icon: "Climate",
                rooms: self.newRooms
            }
        },
        overlay: {
            metrics: {
                multilineType: "Climate",
                title: self.getInstanceTitle(this.id),
                icon: "Climate",
                state: vdevEntry && vdevEntry.state ? vdevEntry.state : 'energySave',
                rooms: self.newRooms
            }
        },
        /*
         * commands:
         * comfort ... set comfort temperature
         * energySave ... set energy saving temperature
         * frostProtection ... set frost protection temperature
         * schedule ... activate configured schedule
         * custom ... (only on climate vDev) activate custom configurations
         */
        handler: function (command, args) {
            var argRoom = !args || args.room === "null" ? null : parseInt(args.room, 10),
                currTemp = null,
                roomCmd = command;

            // do commands for each room entry
            self.newRooms.forEach(function (room, index) {

                var roomId = parseInt(room.room, 10);

                if (argRoom === null || argRoom === roomId) {

                    // set custom configs if configured
                    if (argRoom === null && command === 'custom') {
                        roomCmd = room.state;
                    }

                    var thermostats = self.getThermostats(roomId),
                        // set the current temperature depending on performed command
                        setCurrTemp = function (cmd) {
                            switch (cmd) {
                                case 'comfort':
                                    currTemp = parseFloat(room.comfort);
                                    break;
                                case 'energySave':
                                    currTemp = parseFloat(room.energySave);
                                    break;
                                case 'frostProtection':
                                    currTemp = 6;
                                    break;
                                default:
                                    currTemp = null;
                            }
                        };

                    // set current temperature
                    if (roomCmd !== 'schedule') {
                        setCurrTemp(roomCmd);
                    }

                    // set thermostat temperature
                    if (!!currTemp) {
                        thermostats.forEach(function (device) {
                            self.performChangesOnThermostats(device,currTemp);
                        });

                        // update room target temperature
                        room.targetTemp = currTemp;
                    }

                    // activate schedule by room or if comfort mode for all rooms is choosen
                    if ((argRoom === null && command === 'schedule' && room.state !== 'schedule') || (argRoom === null && command === 'custom' && roomCmd === 'schedule') || (!!argRoom && roomCmd === 'schedule')) {
                        // activate schedule
                        self.checkEntry(thermostats, room);

                        if (!self.configureSchedules(roomId)) {
                            currTemp = parseFloat(room.energySave);
                            thermostats.forEach(function (device) {
                                self.performChangesOnThermostats(device,currTemp);
                            });

                            // update room target temperature
                            room.targetTemp = currTemp;
                        }
                    }

                    // clean up schedules after revoking it by room or if a none 'comfort' mode for all rooms is choosen
                    if ((argRoom === null && self.vDev.get('metrics:state') === 'schedule' && command !== 'schedule') || (!!argRoom && room.state === 'schedule' && roomCmd !== 'schedule')) {
                        var subString = 'Climate.' + roomId + '.';

                        // delete all thermostat fallback setting for this room
                        if (self.fallbackThermostatSettings[roomId]) {
                            delete self.fallbackThermostatSettings[roomId];
                        }

                        for (var startStop in self.registerdSchedules) {
                            var newScheduleRegistry = [];

                            // search in registry for all regsitered schedules that schould be removed from Cron
                            newScheduleRegistry = _.filter(self.registerdSchedules[startStop], function (schedule) {
                                return ~schedule.indexOf(subString);
                            });

                            // clean up registered schedules
                            self.registerdSchedules[startStop] = _.filter(self.registerdSchedules[startStop], function (schedule) {
                                return !~schedule.indexOf(subString);
                            });

                            // remove schedules from Cron
                            _.forEach(newScheduleRegistry, function (scheduleEntry) {
                                self.controller.emit("cron.removeTask", scheduleEntry);
                                if (startStop === 'start') {
                                    self.controller.off(scheduleEntry, self.pollByStart);
                                } else if (startStop === 'end') {
                                    self.controller.off(scheduleEntry, self.pollByEnd);
                                }
                            });
                        }
                    }

                    room.state = roomCmd;
                }
            });

            if (!!argRoom) {
                // set state to custom
                this.set('metrics:state', 'custom');
                this.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/Climate/Climate_custom.png');
            } else {
                this.set('metrics:state', command);
                this.set('metrics:icon', command === 'custom'? '/ZAutomation/api/v1/load/modulemedia/Climate/Climate_custom.png' : 'Climate');
            }

            //this.set('metrics:state', command);

            this.set('metrics:rooms',self.newRooms);
        },
        moduleId: this.id
    });

    // handle room settings on instances start
    self.newRooms.forEach(function (room, i) {
        var roomId = parseInt(room.room, 10);

        // transform devicesByRoom structure into correct output
        for (var key in room) {
            var index = key.indexOf('devicesByRoom_');
            if (~index) {
                room["mainSensor"] = room[key];
            } else if (key === 'room') {
                room[key] = parseInt(room[key], 10);
            }
        }
        // check for the stored state
        room.state = vdevEntry && vdevEntry.rooms[i] && vdevEntry.rooms[i].state ? vdevEntry.rooms[i].state : "energySave";
        room.energySave = parseFloat(room.energySave);
        room.targetTemp = vdevEntry && vdevEntry.rooms[i] && vdevEntry.rooms[i].targetTemp ? parseFloat(vdevEntry.rooms[i].targetTemp) : parseFloat(room.comfort);

        // activate schedule if exists
        if (self.schedule) {
            room.hasSchedule = _.findWhere(self.schedule, {'RoomID': roomId}) ? true : false;
        } else {
            room.hasSchedule = false;
        }


        if (room.state === 'schedule') {
            // activate schedule
            var thermostats = self.getThermostats(roomId);

            // prepare schedule entries
            self.checkEntry(thermostats, room);

            // set and activate schedule entries for rooms
            self.configureSchedules(roomId);
        }

        //deregister reset
        self.regTH('off', room.room);
        //register reset
        self.regTH('on', room.room);
    });

    self.vDev.performCommand(self.vDev.get('metrics:state'));
};

Climate.prototype.performChangesOnThermostats=function (thermostat,temp) {
    var self = this;
    var entryExists = _.filter(self.fallbackOverTime, function (entry) {
        return entry.id === thermostat.id;
    })
    if (entryExists[0]){
        entryExists[0].temperature=temp;
    } else {
        self.fallbackOverTime.push({id: thermostat.id, temperature: temp});
    }

    // add thermostat to the module trigger array or change list
    if (self.alreadyChangedThermostats.indexOf(thermostat.id) < 0) {
        self.alreadyChangedThermostats.push(thermostat.id);
    }
    
    // perform command on thermostat
    thermostat.performCommand("exact", {
        "level": String(temp)
    });
};

Climate.prototype.initFunctions = function () {
    var self = this;
    self.resetList = {}; 

    self.sensorFunction = function sensorFunction(idev) {
        if (self.vDev) {
            // ignore devices listed on reset list 
            if (self.alreadyChangedThermostats.indexOf(idev.id) < 0) {
                self.resetList[idev.id] = (new Date()).getTime() + self.waitingTime;
                //self.log("Set reset time:", self.resetList[idev.id]);
            
            // remove thermostat from the module trigger array and reset reset timer if existing
            } else {
                if (self.alreadyChangedThermostats.indexOf(idev.id) > 0 && self.resetList[idev.id]) {
                    delete self.resetList[idev.id];
                }
                self.alreadyChangedThermostats = _.filter(self.alreadyChangedThermostats, function(id){
                    return id !== idev.id;
                });
            }
        }
    }
};

/*
 * un/register thermostats for the reset
 */
Climate.prototype.regTH = function (action,roomId) {
    var self = this;
    var roomId = parseInt(roomId, 10);
    var thermostatsGL = this.getThermostats(roomId);

    thermostatsGL.forEach(function (device) {
        self.controller.devices[action](device.id, "change:metrics:level", self.sensorFunction);
    });
};

/*
 * checks schedule data content
 * handles weekdays and checks for their validation
 */
Climate.prototype.checkEntry = function (thermostats, room) {
    var self = this;

    if (_.isArray(thermostats) && thermostats.length > 0 &&
        self.schedule && self.schedule.length > 0) {

        var roomSchedules = self.schedule.filter(function (entry) {
            return parseInt(entry.RoomID, 10) === parseInt(room.room, 10);
        });

        // create listeners for each schedule of the destinated room
        roomSchedules.forEach(function (rSc, index) {
            // check if there is a '1-3' string and create schedules for each day
            if (_.isArray(rSc.Weekday) && rSc.Weekday.length > 0) {
                rSc.Weekday.forEach(function (day) {
                    self.initializeSchedules(day, rSc, index);
                });
            } else {
                self.controller.addNotification('error', self.langFile.err_wrong_date_format, 'module', 'Climate');
            }
        });

    } else if (self.schedule && _.isArray(thermostats) && thermostats.length < 1) {
        var thisRoom = self.controller.getLocation(self.controller.locations,room.room);
        var roomName = thisRoom ? thisRoom.title : room.room;
        self.controller.addNotification('warning', self.langFile.err_no_thermostats + roomName, 'module', 'Climate');
    } else {
        self.controller.addNotification('warning', self.langFile.err_parsing_schedule_data, 'module', 'Climate');
    }
};

/* 
 * checks validation of time input
 * and creates schedule identifiers for registry
 */
Climate.prototype.initializeSchedules = function (day, rSc, index) {
    var self = this,
        transformHour = function (hour) {
            return hour === 24 ? 0 : hour;
        },
        startHour = transformHour(parseInt(rSc.Starttime.substring(0, 2), 10)),
        startMinute = parseInt(rSc.Starttime.substring(3, 5), 10),
        endHour = transformHour(parseInt(rSc.Endtime.substring(0, 2), 10)),
        endMinute = parseInt(rSc.Endtime.substring(3, 5), 10),
        start = 0,
        end = 0,
        newDay = day === 6 ? 0 : (day + 1),
        setStart = null,
        setEnd = null,
        tempOrModus = rSc.Temperature;

    if (tempOrModus !== '') {

        if (_.isNumber(tempOrModus) && (tempOrModus < 5 || tempOrModus > 29)) {
            self.controller.addNotification('warning', self.langFile.err_temp_out_of_range, 'module', 'Climate');
        } else {
            setStart = tempOrModus.toString();
            setEnd = null;
        }
    } else {
        self.controller.addNotification('warning', self.langFile.err_temp_entry, 'module', 'Climate');
    }

    if ((startHour >= 0 && startHour < 24 ) && (endHour >= 0 && endHour < 24 ) && // check  0 >= hours < 24
        (startMinute >= 0 && startMinute < 60) && (endMinute >= 0 && endMinute < 60)) { // check  0 >= min < 60
        // check first if second time is on next day
        if (startHour > endHour || (startHour === endHour && startMinute > endMinute)) {
            // add cron start
            self.createSchedule('start', startMinute, startHour, setStart, day, rSc.RoomID, index);

            // add cron stop on next day
            self.createSchedule('end', endMinute, endHour, setEnd, newDay, rSc.RoomID, index);

        } else {
            // add cron start
            self.createSchedule('start', startMinute, startHour, setStart, day, rSc.RoomID, index);

            // add cron end
            self.createSchedule('end', endMinute, endHour, setEnd, day, rSc.RoomID, index);
        }
    } else if ((startHour < 0 && startHour > 24 ) && (endHour < 0 && endHour > 24 ) &&
        (startMinute < 0 && startMinute > 60) && (endMinute < 0 && endMinute > 60)) {

        self.controller.addNotification('warning', self.langFile.err_wrong_time_format, 'module', 'Climate');
    } else {

        self.controller.addNotification('warning', self.langFile.err_something_went_wrong, 'module', 'Climate');
    }
};

/* 
 * adds schedule identifier to registry
 * 
 */
Climate.prototype.createSchedule = function (startStop, min, hour, setTempOrModus, weekDay, roomId, scheduleIndex) {
    var temperature = !!setTempOrModus ? "." + setTempOrModus.replace(/\.|\,/ig, '-') : '',
        pollIdentifier = "Climate." + roomId + "." + scheduleIndex + "." + weekDay + "." + startStop + "." + hour + "." + min + temperature + ".poll";

    if (!this.registerdSchedules[startStop]) {
        this.registerdSchedules[startStop] = [];
    }

    // add identifier
    if (!~this.registerdSchedules[startStop].indexOf(pollIdentifier)) {
        this.registerdSchedules[startStop].push(pollIdentifier);
    }
};

/* 
 * necessary after ending schedule or interval
 * to restore all thermostats state
 */
Climate.prototype.createFallbackThermostatSettings = function (roomId, thermostatArr) {
    var self = this;


    _.forEach(thermostatArr, function (thermostat) {
        var thermostatEntry = {
                id: thermostat.id,
                level: thermostat.get('metrics:level')
            },
            entryExists = [];

        // if empty create new
        if (!self.fallbackThermostatSettings[roomId]) {
            self.fallbackThermostatSettings[roomId] = [];

            self.fallbackThermostatSettings[roomId].push(thermostatEntry);
        }

        // check if entry exists
        entryExists = _.filter(self.fallbackThermostatSettings[roomId], function (entry) {
            return entry.id === thermostatEntry.id;
        });

        if (entryExists < 1) {
            // add new one
            self.fallbackThermostatSettings[roomId].push(thermostatEntry);
        } else if (entryExists[0]) {
            // update thermostat level
            if (!_.isEqual(entryExists[0]['level'], thermostatEntry['level'])) {
                entryExists[0]['level'] = thermostatEntry['level'];
            }
        }
    });
};

Climate.prototype.getInstanceTitle = function (instanceId) {
    var instanceTitle = this.controller.instances.filter(function (instance) {
        return instance.id === instanceId;
    });

    return instanceTitle[0] && instanceTitle[0].title ? instanceTitle[0].title : 'Climate Control ' + this.id;
};

/* 
 * filter for all thermostats
 * if surrendered also by room id
 */
Climate.prototype.getThermostats = function (roomId) {
    var self = this;

    if (roomId) {
        return self.controller.devices.filter(function (device) {
            return device.get("deviceType") === "thermostat" &&
                parseInt(device.get("location"), 10) === roomId;
        });
    } else {
        return self.controller.devices.filter(function (device) {
            return device.get("deviceType") === "thermostat";
        });
    }
};

Climate.prototype.log = function (message, value, stringify) {
    var self = this;
    if (stringify) {
        console.log('##################################');
        console.log('##');
        console.log('##', message, JSON.stringify(value, null, 1));
        console.log('##');
        console.log('##################################');
    } else {
        console.log('##################################');
        console.log('##');
        console.log('##', message, value);
        console.log('##');
        console.log('##################################');
    }
};