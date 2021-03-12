/*** Heating Z-Way HA module *******************************************

 Version: 1.3 stable
 (c) Z-Wave.Me, 2021
 -----------------------------------------------------------------------------
 Author:    Niels Roche <nir@zwave.eu>,
            Martin Petzold <mp@zwave.eu>,
            Michael Hensche <mh@zwave.eu>,
            Karsten Reichel <kar@zwave.eu>,
            Vitaliy Yurkin <aivs@z-wave.me>
 Description:
 This module creates a central heat control that can control all thermostats of a room
 by defining a temperature sensor and a target temperature.

 ******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Heating(id, controller) {
    // Call superconstructor first (AutomationModule)
    Heating.super_.call(this, id, controller);
}

inherits(Heating, AutomationModule);

_module = Heating;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Heating.prototype.prepareSchedule = function(rooms) {
    var self = this,
        schedule = [];
    _.each(rooms, function(data, roomID) {

        _.each(data.schedule, function(sc, day) {
            _.each(sc, function(s) {
                // is there already some schedule with same start && end && temp ? -> just add day to list
                sched = _.filter(schedule, function(entry) {
                    return entry.RoomID == roomID && entry.Starttime == s.stime && entry.Endtime == s.etime && entry.Temperature == s.temp;
                });

                if (!_.isEmpty(sched)) {
                    sched[0].Weekday.push(day);
                } else {
                    // add schedule
                    schedule.push({
                        "RoomID": roomID,
                        "Room": "",
                        "Weekday": [day],
                        "Starttime": s.stime,
                        "Endtime": s.etime,
                        "Temperature": s.temp
                    });
                }
            });
        });
    });

    return schedule;
};

Heating.prototype.init = function(config) {
    Heating.super_.prototype.init.call(this, config);
    var self = this;
    self.fallbackOverTime = [];
    //"room": _.findIndex(self.config.roomSettings,function(obj) {return obj === sc}),
    this.newRooms = _.map(self.config.roomSettings, function(sc, roomId) {
        return {
            "room": roomId,
            "comfort": sc.comfortTemp,
            "energySave": sc.energySaveTemp,
            "frostProtection": sc.frostProtectionTemp,
            "fallback": sc.fallbackTemp,
            "mainSensor": sc.sensorId
        }
    });
    this.vDev = null;
    this.alreadyChangedThermostats = [];
    this.registerdSchedules = {};
    this.alarmTimer = {};
    this.fallbackThermostatSettings = {};
    this.langFile = self.controller.loadModuleLang("Heating");
    this.schedule = self.prepareSchedule(self.config.roomSettings);
    this.waitingTime = self.config.resetTime * 1000 * 60 * 60; // convert in hours
    self.initFunctions();
    this.createHouseControl();

    this.pollReset = function() {
        var now = (new Date()).getTime();

        //self.log("self.fallbackOverTime:", self.fallbackOverTime, true);

        Object.keys(self.resetList).forEach(function(resetEntry) {
            var resetvDev = self.controller.devices.get(resetEntry);

            if (!!resetvDev) {
                //self.log("time diff:", now - self.resetList[resetEntry]);
                if (self.resetList[resetEntry] <= now) {
                    // check if a fallback level exists
                    entryExists = _.filter(self.fallbackOverTime, function(entry) {
                        return entry.id === resetvDev.id;
                    });

                    // set new level if values are not equal
                    if (entryExists[0] && (parseFloat(entryExists[0].temperature) !== resetvDev.get("metrics:level"))) {
                        // add thermostat to the module trigger array or change list
                        if (self.alreadyChangedThermostats.indexOf(resetvDev.id) < 0) {
                            self.alreadyChangedThermostats.push(resetvDev.id);
                        }
                        resetvDev.performCommand("exact", {
                            level: entryExists[0].temperature
                        });

                        delete self.resetList[resetEntry];
                    }
                }
            }
        });
    }

    this.controller.on("HeatingReset_" + this.id + ".poll", this.pollReset);
    this.controller.emit("cron.addTask", "HeatingReset_" + this.id + ".poll", {
        minute: null,
        hour: null,
        weekDay: null,
        day: null,
        month: null
    });

    this.triggerControl = function(vdev) {
        var isThermostat = vdev.get('deviceType') === 'thermostat',
            roomId = vdev.get('location');

        if (isThermostat && roomId > 0) {

            var state = self.config.roomSettings[roomId].state,
                stateName = state + "Temp";
            if (state === "schedule") {
                var now = new Date(),
                    today = (now.getDay()).toString(),
                    minutesToday = (now.getHours() * 60) + now.getMinutes(),
                    scheduleFound = false;

                _.forEach(self.schedule, function(entry) {
                    if (parseInt(entry.RoomID) === roomId) {
                        var Starttime = entry.Starttime,
                            Endtime = entry.Endtime,
                            sHours = parseInt(Starttime.substr(0, 2), 10),
                            sMinutes = parseInt(Starttime.substr(3, 2), 10),
                            eHours = parseInt(Endtime.substr(0, 2), 10),
                            eMinutes = parseInt(Endtime.substr(3, 2), 10),
                            startMinutesToday = (sHours * 60) + sMinutes,
                            endMinutesToday = (eHours * 60) + eMinutes === 0 ? 24*60 : (eHours * 60) + eMinutes,
                            weekday = entry.Weekday;

                        // If time in schedule range set schedule temperature
                        if (weekday.indexOf(today) >= 0 && minutesToday >= startMinutesToday && minutesToday < endMinutesToday) {
                            // Set temperature from schedule
                            scheduleFound = true;
                            self.performChangesOnThermostats(vdev, parseFloat(entry.Temperature));
                        }
                    }
                });
                // If schedule is not found set energySave
                if (scheduleFound == false) {
                    self.performChangesOnThermostats(vdev, self.config.roomSettings[roomId].energySaveTemp);
                }
            }
            else {
                // Set temperature from state frostProtection/energySave/comfort
                self.performChangesOnThermostats(vdev, self.config.roomSettings[roomId][stateName]);
            }


            var entryExists = _.filter(self.fallbackOverTime, function(entry) {
                return entry.id === vdev.id;
            })
            if (entryExists[0]) {
                entryExists[0].temperature = vdev.get('metrics:level');
            } else {
                self.fallbackOverTime.push({
                    id: vdev.id,
                    temperature: vdev.get('metrics:level')
                });
            }
            //deregister thermostat
            self.controller.devices.off(vdev.id, "change:metrics:level", self.sensorFunction);
            //register thermostat
            self.controller.devices.on(vdev.id, "change:metrics:level", self.sensorFunction);
        }
    }

    this.controller.devices.on('created', this.triggerControl);

    this.updateRoomsList = function(id) {
        delete self.config.roomSettings[id];
        self.saveConfig();
        var newRooms = self.vDev.get('metrics:rooms').filter(function(el) { return parseInt(el.room) != id });
        self.vDev.set('metrics:rooms', newRooms);
    }

    // update the list of rooms after deleting a room
    this.controller.on('location.removed', this.updateRoomsList);
};

Heating.prototype.stop = function() {
    var self = this;
    self.newRooms.forEach(function(room) {
        self.regTH('off', room.room);
    });

    var devID = "Heating_" + self.id;

    self.vDev = null;

    self.controller.devices.remove(devID);

    for (var key in self.registerdSchedules) {
        self.registerdSchedules[key].forEach(function(pollEntry) {
            self.controller.emit("cron.removeTask", pollEntry);
            if (key === 'start') {
                self.controller.off(pollEntry, self.pollByStart);
            } else {
                self.controller.off(pollEntry, self.pollByEnd);
            }
        });

        // clean registry 
        self.registerdSchedules[key] = [];
    }

    this.controller.emit("cron.removeTask", "HeatingReset_" + this.id + ".poll");
    this.controller.off("HeatingReset_" + this.id + ".poll", this.pollReset);
    this.controller.devices.off('created', this.triggerControl);
    this.controller.off('location.removed', this.updateRoomsList);

    Heating.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

Heating.prototype.createHouseControl = function() {

    // use vdevinfo if it exists
    var self = this,
        vdevEntry = this.controller.vdevInfo["Heating_" + this.id] && this.controller.vdevInfo["Heating_" + this.id].metrics ? this.controller.vdevInfo["Heating_" + this.id].metrics : undefined;

    this.pollByStart = function(filter) {
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
        thermostats = self.getThermostats(locId);

        if (thermostats.length > 0) {

            // create fallback values 
            self.createFallbackThermostatSettings(locId, thermostats);

            if (self.vDev === null) {
                self.vDev = self.controller.devices.get('Heating_' + self.id);
            }

            metrRooms = self.vDev.get('metrics:rooms');
            // update value in widget
            metrRooms.forEach(function(room) {
                if (parseInt(room.room, 10) === locId) {

                    // get modus temperature
                    if (!!schedulePreset) {
                        switch (schedulePreset) {
                            case 'F':
                                temp = parseFloat(room.frostProtection);;
                                break;
                            case 'E':
                                temp = parseFloat(room.energySave);
                                break;
                            case 'C':
                                temp = parseFloat(room.comfort);
                                break;
                            default:
                                temp = parseFloat(schedulePreset);
                        }
                    }
                    room.targetTemp = 't ~ ' + temp;
                }
            });

            self.vDev.set('metrics:rooms', metrRooms);

            thermostats.forEach(function(thermostat) {
                self.performChangesOnThermostats(thermostat, temp);
            });
        }
    };

    this.pollByEnd = function() {
        var pollIdentifier = this.event,
            identifierArr = pollIdentifier.split('.'),
            locId = parseInt(identifierArr[1], 10),
            thermostats = [],
            metrRooms = [];

        // If the end time is equal to the start time do not run the end command
        var isEndTimeEqualStartTime = false;
        _.forEach(self.registerdSchedules['start'], function(scheduleStart) {
            var scheduleStartArray = scheduleStart.split('.');
            var scheduleEndArray = pollIdentifier.split('.');
            if (scheduleStartArray[3] === scheduleEndArray[3] &&
                scheduleStartArray[5] === scheduleEndArray[5] &&
                scheduleStartArray[6] === scheduleEndArray[6]) {
                isEndTimeEqualStartTime = true;
            }
        });
        if (isEndTimeEqualStartTime) return;

        /*
         * identifierArr[1] ... room name
         * identifierArr[7] ... '-' separeated temperature
         * 
         */

        //schedulePreset = identifierArr[7] !== 'poll'? identifierArr[7].replace('-', '.') : null;

        //get thermostats
        thermostats = self.getThermostats(locId);

        if (thermostats.length > 0) {

            metrRooms = self.vDev.get('metrics:rooms');
            // get all rooms controlled by Heating app, and update them
            // update value in widget
            metrRooms.forEach(function(room) {
                if (parseInt(room.room, 10) === locId) {
                    if (room.fallback) {
                        temp = room.fallback == 'F' ? parseFloat(room.frostProtection) : (room.fallback == 'C' ? parseFloat(room.comfort) : parseFloat(room.energySave));
                    } else {
                        temp = parseFloat(room.energySave);
                    }

                    room.targetTemp = temp;
                }
            });

            self.vDev.set('metrics:rooms', metrRooms);

            thermostats.forEach(function(thermostat) {
                self.performChangesOnThermostats(thermostat, temp);
            });
        }
    };

    this.configureSchedules = function(roomId) {
        var subString = 'Heating.' + roomId + '.',
            tempSet = false;

        if (typeof self.registerdSchedules['start'] === 'undefined' || typeof self.registerdSchedules['end'] === 'undefined') {
            // Create listeners for each schedule of the each rooms
            self.schedule.forEach(function(rSc, index) {
                // check if there is a '1-3' string and create schedules for each day
                if (_.isArray(rSc.Weekday) && rSc.Weekday.length > 0) {
                    rSc.Weekday.forEach(function(day) {
                        self.initializeSchedules(day, rSc, index);
                    });
                }
            });
        }


        var scheduleFilter = self.registerdSchedules['start'].concat(self.registerdSchedules['end']);

        scheduleFilter = scheduleFilter.filter(function(schedule) {
            return ~schedule.indexOf(subString);
        });

        _.forEach(scheduleFilter, function(scheduleEntry) {
            var scheduleItems = scheduleEntry.split('.'),
                now = new Date(),
                startStop = scheduleItems[4],
                m = parseInt(scheduleItems[6], 10),
                h = parseInt(scheduleItems[5], 10),
                d = parseInt(scheduleItems[3], 10);


            // At first remove, so that there are no duplicates
            self.controller.emit("cron.removeTask", scheduleEntry);
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
             * filter for start/end - by index of or substring 'Heating.1.0.2.'
             * check if start <= n < end
             * check logic
             *
             * */
            if (now.getDay() === d) {
                if (startStop === 'start') {
                    var nowTs = now.getTime(),
                        midnight = (new Date()).setHours(24, 0),
                        startI = (new Date()).setHours(h, m),
                        compareString = scheduleItems[0] + '.' + scheduleItems[1] + '.' + scheduleItems[2] + '.' + d,
                        endI = getTime(scheduleFilter, compareString + '.end');

                    // check if end is next day
                    if ((!endI && startI) || (startI && endI && endI < startI)) {
                        nextDay = d === 6 ? 0 : d + 1;
                        newCS = scheduleItems[0] + '.' + scheduleItems[1] + '.' + scheduleItems[2] + '.' + nextDay;
                        endI = getTime(scheduleFilter, newCS + '.end') + 86400000; // add 24h
                    }
                    if ((!startI && endI && nowTs < endI) ||
                        (!endI && startI && startI <= midnight) || // if now is between start and end AND if end is on new day
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

        filterArray.forEach(function(entry) {
            if (entry.indexOf(compareString) > -1) {
                filter = entry.split('.');
                time = (new Date().setHours(parseInt(filter[5], 10), parseInt(filter[6], 10)));
            }
        });

        return time;
    }

    self.vDev = self.controller.devices.create({
        deviceId: "Heating_" + this.id,
        defaults: {
            deviceType: "sensorMultiline",
            metrics: {
                multilineType: "climateControl",
                icon: "climatecontrol",
                rooms: self.newRooms
            }
        },
        overlay: {
            metrics: {
                multilineType: "climateControl",
                title: self.getInstanceTitle(),
                icon: "climatecontrol",
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
         * custom ... (only on Heating vDev) activate custom configurations
         */
        handler: function(command, args) {
            var argRoom = !args || args.room === "null" ? null : parseInt(args.room, 10),
                roomCmd = command;

            // do commands for each room entry
            self.newRooms.forEach(function(room, index) {
                var currTemp,
                    roomId = parseInt(room.room, 10);
                if (argRoom === null || argRoom === roomId) {

                    // set custom configs if configured
                    if (argRoom === null && command === 'custom') {
                        roomCmd = room.state;
                    }

                    // Set state for room
                    if (command !== 'custom') {
                        self.config.roomSettings[roomId].state = command;
                    }

                    var thermostats = self.getThermostats(roomId);

                    // set current temperature
                    switch (roomCmd) {
                        case 'comfort':
                            currTemp = parseFloat(room.comfort);
                            break;
                        case 'energySave':
                            currTemp = parseFloat(room.energySave);
                            break;
                        case 'frostProtection':
                            currTemp = parseFloat(room.frostProtection);
                            break;
                        case 'schedule':
                        default:
                            currTemp = null;
                    }

                    // set thermostat temperature
                    if (!!currTemp) {
                        thermostats.forEach(function(device) {
                            self.performChangesOnThermostats(device, currTemp);
                        });

                        // update room target temperature
                        room.targetTemp = currTemp;
                    }

                    // activate schedule by room or if comfort mode for all rooms is choosen
                    if ((argRoom === null && command === 'schedule') || (argRoom === null && command === 'custom' && roomCmd === 'schedule') || (!!argRoom && roomCmd === 'schedule')) {
                        // activate schedule
                        self.checkEntry(thermostats, room);
                        if (!self.configureSchedules(roomId)) {
                            currTemp = parseFloat(room.energySave);
                            thermostats.forEach(function(device) {
                                self.performChangesOnThermostats(device, currTemp);
                            });

                            // update room target temperature
                            room.targetTemp = currTemp;
                        }
                    }

                    // clean up schedules after revoking it by room or if a none 'comfort' mode for all rooms is choosen
                    if ((argRoom === null && self.vDev.get('metrics:state') === 'schedule' && command !== 'schedule') || (!!argRoom && room.state === 'schedule' && roomCmd !== 'schedule')) {
                        var subString = 'Heating.' + roomId + '.';

                        // delete all thermostat fallback setting for this room
                        if (self.fallbackThermostatSettings[roomId]) {
                            delete self.fallbackThermostatSettings[roomId];
                        }

                        for (var startStop in self.registerdSchedules) {
                            // search in registry for all regsitered schedules that should be removed from Cron
                            var newScheduleRegistry = _.filter(self.registerdSchedules[startStop], function(schedule) {
                                return ~schedule.indexOf(subString);
                            });

                            // clean up registered schedules
                            self.registerdSchedules[startStop] = _.filter(self.registerdSchedules[startStop], function(schedule) {
                                return !~schedule.indexOf(subString);
                            });

                            // remove schedules from Cron
                            _.forEach(newScheduleRegistry, function(scheduleEntry) {
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

            self.saveConfig();

            if (!!argRoom) {
                // set state to custom
                this.set('metrics:state', 'custom');
                this.set('metrics:icon', '/ZAutomation/api/v1/load/modulemedia/Heating/heating_custom.png');
            } else {
                this.set('metrics:state', command);
                this.set('metrics:icon', command === 'custom' ? '/ZAutomation/api/v1/load/modulemedia/Heating/heating_custom.png' : 'climatecontrol');
            }

            this.set('metrics:rooms', self.newRooms);
        },
        moduleId: this.id
    });

    // handle room settings on instances start
    self.newRooms.forEach(function(room, i) {
        var roomId = parseInt(room.room, 10);

        // check for the stored state
        room.state = self.config.roomSettings[roomId].state;
        room.energySave = parseFloat(room.energySave);
        room.targetTemp = vdevEntry && vdevEntry.rooms[i] && vdevEntry.rooms[i].targetTemp ? parseFloat(vdevEntry.rooms[i].targetTemp) : parseFloat(room.comfort);

        // activate schedule if exists
        if (self.schedule) {
            room.hasSchedule = _.findWhere(self.schedule, {
                'RoomID': roomId.toString()
            }) ? true : false;
        } else {
            room.hasSchedule = false;
        }

        if (room.state === 'schedule') {
            // activate schedule
            var thermostats = self.getThermostats(roomId);

            // prepare schedule entries
            self.checkEntry(thermostats, room);

            // set and activate schedule entries for rooms
            //self.configureSchedules(roomId);
        }

        //deregister reset
        self.regTH('off', room.room);
        //register reset
        self.regTH('on', room.room);
    });

    self.vDev.performCommand(self.vDev.get('metrics:state'));
};

Heating.prototype.performChangesOnThermostats = function(thermostat, temp) {
    var self = this;
    var entryExists = _.filter(self.fallbackOverTime, function(entry) {
        return entry.id === thermostat.id;
    })
    if (entryExists[0]) {
        entryExists[0].temperature = temp;
    } else {
        self.fallbackOverTime.push({
            id: thermostat.id,
            temperature: temp
        });
    }

    // add thermostat to the module trigger array or change list
    if (self.alreadyChangedThermostats.indexOf(thermostat.id) < 0) {
        self.alreadyChangedThermostats.push(thermostat.id);
    }

    // perform command on thermostat
    thermostat.performCommand("exact", {"level": temp});
};

Heating.prototype.initFunctions = function() {
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
                self.alreadyChangedThermostats = _.filter(self.alreadyChangedThermostats, function(id) {
                    return id !== idev.id;
                });
            }
        }
    }
};

/*
 * un/register thermostats for the reset
 */
Heating.prototype.regTH = function(action, roomId) {
    var self = this;
    var roomId = parseInt(roomId, 10);
    var thermostatsGL = this.getThermostats(roomId);

    thermostatsGL.forEach(function(device) {
        self.controller.devices[action](device.id, "change:metrics:level", self.sensorFunction);
    });
};

/*
 * checks schedule data content
 * handles weekdays and checks for their validation
 */
Heating.prototype.checkEntry = function(thermostats, room) {
    var self = this;

    if (_.isArray(thermostats) && thermostats.length > 0 &&
        self.schedule && self.schedule.length > 0) {

        var roomSchedules = self.schedule.filter(function(entry) {
            return parseInt(entry.RoomID, 10) === parseInt(room.room, 10);
        });

        // create listeners for each schedule of the destinated room
        roomSchedules.forEach(function(rSc, index) {
            // check if there is a '1-3' string and create schedules for each day
            if (_.isArray(rSc.Weekday) && rSc.Weekday.length > 0) {
                rSc.Weekday.forEach(function(day) {
                    self.initializeSchedules(day, rSc, index);
                });
            } else {
                console.log("---  Heating_" + self.id,self.langFile.err_wrong_date_format);
            }
        });

    } else if (self.schedule && _.isArray(thermostats) && thermostats.length < 1) {
        var thisRoom = self.controller.getLocation(self.controller.locations, room.room);
        var roomName = thisRoom ? thisRoom.title : room.room;
        console.log("---  Heating_" + self.id,self.langFile.err_no_thermostats + roomName);
    } else {
        console.log("---  Heating_" + self.id,self.langFile.err_parsing_schedule_data);
    }
};

/* 
 * checks validation of time input
 * and creates schedule identifiers for registry
 */
Heating.prototype.initializeSchedules = function(day, rSc, index) {
    var self = this,
        transformHour = function(hour) {
            return hour % 24;
        },
        startHour = transformHour(parseInt(rSc.Starttime.substring(0, 2), 10)),
        startMinute = parseInt(rSc.Starttime.substring(3, 5), 10),
        endHour = transformHour(parseInt(rSc.Endtime.substring(0, 2), 10)),
        endMinute = parseInt(rSc.Endtime.substring(3, 5), 10),
        start = 0,
        end = 0,
        newDay = (parseInt(day) + 1) % 7,
        setStart = null,
        setEnd = null,
        tempOrModus = rSc.Temperature;

    if (tempOrModus !== '') {
        if (_.isNumber(tempOrModus) && (tempOrModus < 5 || tempOrModus > 29)) {
            self.controller.addNotification('warning', self.langFile.err_temp_out_of_range, 'module', 'Heating');
        } else {
            setStart = tempOrModus.toString();
            setEnd = null;
        }
    } else {
        self.controller.addNotification('warning', self.langFile.err_temp_entry, 'module', 'Heating');
    }

    if ((startHour >= 0 && startHour < 24) && (endHour >= 0 && endHour < 24) && // check  0 >= hours < 24
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
    } else if ((startHour < 0 && startHour > 24) && (endHour < 0 && endHour > 24) &&
        (startMinute < 0 && startMinute > 60) && (endMinute < 0 && endMinute > 60)) {
        console.log("---  Heating_" + self.id,self.langFile.err_wrong_time_format);
    } else {
        console.log("---  Heating_" + self.id,self.langFile.err_something_went_wrong);
    }
};

/* 
 * adds schedule identifier to registry
 * 
 */
Heating.prototype.createSchedule = function(startStop, min, hour, setTempOrModus, weekDay, roomId, scheduleIndex) {
    var temperature = !!setTempOrModus ? "." + setTempOrModus.replace(/\.|\,/ig, '-') : '',
        pollIdentifier = "Heating." + roomId + "." + scheduleIndex + "." + weekDay + "." + startStop + "." + hour + "." + min + temperature + ".poll";

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
Heating.prototype.createFallbackThermostatSettings = function(roomId, thermostatArr) {
    var self = this;


    _.forEach(thermostatArr, function(thermostat) {
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
        entryExists = _.filter(self.fallbackThermostatSettings[roomId], function(entry) {
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

/* 
 * filter for all thermostats
 * if surrendered also by room id
 */
Heating.prototype.getThermostats = function(roomId) {
    var self = this;
    // tbf - rrom id should be always present, if not, there is some misconfiguration 
    if (roomId) {
        return self.controller.devices.filter(function(device) {
            return device.get("deviceType") === "thermostat" &&
                parseInt(device.get("location"), 10) === roomId;
        });
    } else {
        return self.controller.devices.filter(function(device) {
            return device.get("deviceType") === "thermostat";
        });
    }
};

Heating.prototype.log = function(message, value, stringify) {
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