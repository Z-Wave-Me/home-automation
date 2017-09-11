/*** DeviceHistory Z-Way HA module *******************************************

Version: 1.2.1
(c) Z-Wave.Me, 2015
-----------------------------------------------------------------------------
Author: Niels Roche <nir@zwave.eu>
Description:
    Creates a module that stores 24h data of specific devices.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DeviceHistory (id, controller) {
    // Call superconstructor first (AutomationModule)
    DeviceHistory.super_.call(this, id, controller);
}

inherits(DeviceHistory, AutomationModule);

_module = DeviceHistory;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

_.extend(DeviceHistory.prototype, {
    init: function (config) {
        DeviceHistory.super_.prototype.init.call(this, config);
       
        // add cron schedule every 5 minutes
        this.controller.emit("cron.addTask", "historyPolling.poll", {
            minute: [0, 59, 5],
            hour: null,
            weekDay: null,
            day: null,
            month: null
        });

        this.controller.emit("cron.addTask", "saveHistory.poll", {
            minute: 0,
            hour: [0, 23, 1],
            weekDay: null,
            day: null,
            month: null
        });

        var self = this,
            // define excluded device types
            exclDevTypes = ['battery','text','camera','switchRGBW','sensorMultiline'],
            langFile = this.loadModuleLang();

        this.history = loadObject('history') || [];
        this.switchHistory = [];
        this.allDevices = [];
        this.initial = true;

        this.exclSensors = this.controller.instances.filter(function (instance){
            return instance.moduleId === 'SensorsPolling' && instance.active === 'true';
        });

        config.devices.forEach(function (devId) {
            var d = self.controller.devices.get(devId);

            if (d && d.get('hasHistory') === true) {
                d.set('hasHistory', false, {silent: true});
            }
        });

        this.allDevices = this.controller.devices.filter(function(dev){
            return  dev.get('permanently_hidden') === false &&              // only none permanently_hidden devices
                    dev.get('removed') === false &&                         // only none removed devices
                    _.unique(config.devices).indexOf(dev.id) === -1 &&      //in module excluded devices
                    exclDevTypes.indexOf(dev.get('deviceType')) === -1 &&   //excluded device types
                    self.exclSensors.indexOf(dev.id) === -1;                //excluded sensors
        });

        this.addListenerToBinaryVDevs = function(vDev) {
            var id = vDev.id,
                devType = vDev.get('deviceType'),
                pushed = false;
            
            if ((vDev.get('permanently_hidden') === false &&                // only none permanently_hidden devices
                    vDev.get('removed') === false &&                         // only none removed devices
                         _.unique(config.devices).indexOf(id) === -1 &&     //in module excluded devices
                            exclDevTypes.indexOf(devType) === -1 &&         //excluded device types
                                self.exclSensors.indexOf(id) === -1) &&     //excluded sensors
                                    _.findIndex(self.allDevices, function(dev, index, array) {
                                       return dev.id === id;
                                    }) < 0) {
                
                if(vDev.get("hasHistory") === false){
                    vDev.set("hasHistory", true, { silent: true });
                }

                self.allDevices.push(vDev);
                pushed = true;
            }            

            // add listener to binary device types
            if(pushed) {
                switch(devType){
                    case 'switchBinary':
                    case 'switchControl':
                    case 'sensorBinary':
                    case 'toggleButton':
                    case 'doorlock':
                        self.controller.devices.on(id,'change:metrics:level', self.collectBinaryData);
                        break;
                    default: //all others ...
                        break;
                }
            }
        };

        this.removeFromDevList = function(vDev) {
            var index = _.findIndex(self.allDevices, function(dev, index, array) {
                       return dev.id === vDev.id;
                    });

            if (index > -1) {
                self.allDevices.splice(index,1);
            }
        };

        this.removeListenerToBinaryVDevs = function() {
            self.allDevices.forEach(function(dev) {
                var id = dev.id,
                    devType = dev.get('deviceType');
                    
                switch(devType){
                    case 'switchBinary':
                    case 'switchControl':
                    case 'sensorBinary':
                    case 'toggleButton':
                    case 'doorlock':
                        self.controller.devices.off(id,'change:metrics:level', self.collectBinaryData);
                        break;
                    default: // all others ...
                        break;
                }
            });
        };

        // setting up device histories
        this.setupHistories = function(){

            // cleanup first after  all virtual devices are created  
            if(self.initial === true){            
                self.initial = false;        
            } else {
                if(self.allDevices.length > 0 && self.allDevices.length < self.history.length) {
                    var cleanedUpHistory = [],
                        devices = [];

                    devices = self.allDevices.map(function (dev){
                       return dev.get('id');
                    });
                    
                    cleanedUpHistory = self.history.filter(function (devHist) {
                        return devices.indexOf(devHist.id) > -1;
                    });

                    if(cleanedUpHistory.length === self.allDevices.length){
                        console.log("--- ", "clean up histories");
                        self.history = cleanedUpHistory;
                    }
                }
            }

            // Setup histories
            self.allDevices.forEach(function(dev) {
                var id = dev.id,
                    h = dev.h,
                    devType = dev.get('deviceType'),
                    lvl;

                if(dev.get("hasHistory") === false){
                    dev.set("hasHistory", true, { silent: true });
                } 
                    
                switch(devType){
                    case 'sensorMultilevel':
                    case 'switchMultilevel':
                    case 'thermostat':                       
                        lvl = dev.get("metrics:level");
                        self.storeData(dev, lvl);
                        break;
                    case 'switchBinary':
                    case 'switchControl':
                    case 'sensorBinary':
                    case 'toggleButton':
                    case 'doorlock':                        
                        self.transformBinaryValues(dev);
                        break;
                    default: //'fan', 'switchControl'
                        break;
                }
            });
            console.log("--- ", "histories polled");
            self.switchHistory = [];
        };

        // collect metrics changes from binary sensors or switches
        this.collectBinaryData = function (dev){
            if(dev){
                var devId = dev.id,
                    h = dev.h,
                    index = null,
                    change;

                index = _.findIndex(self.switchHistory, function (data, idx) {
                    if(data.h === h || data.id === devId){
                        index = idx;
                        return;
                    }
                });

                if(self.switchHistory.length < 1 || index === null){
                    var item = {
                            id: dev.id,
                            meta: []
                        };

                    self.switchHistory.push(item);
                }

                // set change object
                change = self.setChangeObject(dev.get("metrics:level"));          

                if (index === null){
                    index = self.switchHistory.length - 1;
                }

                if (self.switchHistory[index]) {
                    self.switchHistory[index].meta.push(change);
                }
            }
        };

        // store whole history data on storage
        this.storeData = function(dev, lvl) {
            try {
                var devId = dev.id,
                    h = dev.h,
                    index = null,
                    history, change, histMetr, item;

                change = self.setChangeObject(lvl);
                
                // find dev history and set index
                _.find(self.history, function (data, idx) {
                    if(data.h === h || data.id === devId){
                        index = idx;
                        return;
                    }
                });
                
                // create new device entry if necessary
                if(self.history.length < 1 || index === null){
                    item = {
                            id: dev.id,
                            //h: h, // hashed device id
                            dT: dev.get("deviceType"),
                            mH: []
                        };

                    self.history.push(item);
                    index = self.history.length - 1;
                }
                
                // push only changes during the last 24 hrs
                histMetr = self.history[index].mH.filter(function (ch){
                    return ch.id >= (change.id - 86400);
                });
                
                if(histMetr.length < 288){ // 86400 s (24 h) = 288 * 300 s (5 min)
                    histMetr.push(change);
                } else {
                    histMetr.shift();
                    histMetr.push(change);
                }

                self.history[index].mH = histMetr;

                self.controller.history = self.history;
            
            } catch(e){
                console.log("Cannot store history of device '" + dev.get('metrics:title') + "' because:", e.toString());
                self.addNotification('error', langFile.err_store_history + dev.get('metrics:title') + " ERROR: " + e.toString(), 'module', 'DeviceHistory');
            }
        };

        /* 
         * handle metrics changes for binary devices:
         * 
         * whole last 5 minutes:
         * 0 ... off
         * 0.5 ... something happens
         * 1 ... on
         */
        this.transformBinaryValues = function(dev){
            var devId = dev.id,
                h = dev.h,
                devLvl = dev.get("metrics:level"),
                dT = dev.get('deviceType'),
                arr, cntCh, cntOn, setlvl;

                try {
                    arr = self.switchHistory.filter(function(o){
                            return o.h === h || o.id === devId;
                    })[0].meta;

                    cntCh = arr.length;

                    cntOn = arr.filter(function(meta) {
                        return  meta.l === "open" || //doorlock
                                meta.l === "on";     //binaries
                    }).length;

                    switch(cntOn){
                        case 0:
                            setlvl = 0;
                            break;
                        case cntCh:
                            setlvl = 1;
                            break;
                        default:
                            if (dT === 'toggleButton') {
                                setlvl = 1;
                            } else {
                                setlvl = 0.5;
                            }
                            break;
                    }
                } catch (e){

                    // set level of toggleButton default to off if it wasn't triggered 
                    if(dT === 'toggleButton') {
                        var devJSON = dev.toJSON(),
                            lastPoll = Math.round((new Date()).getTime()/1000) - 60;

                        if (devJSON.updateTime > lastPoll){
                            setlvl = 1;
                        } else {
                            setlvl = 0;
                        }

                    } else {
                        if (devLvl === "on" || devLvl === "open") {
                            setlvl = 1;
                        } else {
                            setlvl = 0;
                        }
                    }                    
                }
            self.storeData(dev, setlvl);
        };

        // polling function
        this.saveHistory = function () {
            saveObject("history", self.history);
        };

        // set initial event listeners to already existing vDevs
        this.allDevices.forEach(function(dev) {
            var id = dev.id,
                devType = dev.get('deviceType');

            if(dev.get("hasHistory") === false){
                dev.set("hasHistory", true, { silent: true });
            } 
                
            switch(devType){
                case 'switchBinary':
                case 'switchControl':
                case 'sensorBinary':
                case 'toggleButton':
                case 'doorlock':
                    self.controller.devices.on(id,'change:metrics:level', self.collectBinaryData);
                    break;
                default: 
                    break;
            }
        });

        this.controller.on("historyPolling.poll", self.setupHistories);
        this.controller.on("saveHistory.poll", self.saveHistory);
        
        this.controller.devices.on('created', self.addListenerToBinaryVDevs);
        this.controller.devices.on('removed', self.removeFromDevList);

        // run first time to setting up histories
        this.setupHistories();
    },
    stop: function () {
        var self = this;

        // remove eventhandler 
        this.removeListenerToBinaryVDevs();

        this.allDevices.forEach(function(vDev) {
            if(vDev.get("hasHistory") === true){
                vDev.set("hasHistory", true,{ silent: true });
            } 
        });
        
        this.controller.emit("cron.removeTask", "historyPolling.poll");
        this.controller.off("historyPolling.poll", self.setupHistories);

        this.controller.emit("cron.removeTask", "saveHistory.poll");
        this.controller.off("saveHistory.poll", self.saveHistory);

        this.controller.devices.off('created', self.addListenerToBinaryVDevs);
        this.controller.devices.off('removed', self.removeFromDevList);

        DeviceHistory.super_.prototype.stop.call(this);
    },
    // ----------------------------------------------------------------------------
    // --- Module methods
    // ----------------------------------------------------------------------------
    setChangeObject: function (lvl) {
        var date = new Date(),
            change = {
                id: Math.floor(date.getTime() / 1000),
                l: lvl
            };

        return change;
    }
});