/*** DeviceHistory Z-Way HA module *******************************************

Version: 1.0.0
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

DeviceHistory.prototype.init = function (config) {
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
        getDevH = [],
        countHistories = [];

    this.history = loadObject('history') || [];
    this.switchHistory = [];
    this.allDevices = [];
    this.exclDev = [];
    this.initial = true;

    // setting up device histories
    this.setupHistories = function(){

        // collect ids from excluded devices
        if(self.config.devices.length > 0) {
            _.unique(self.config.devices).forEach(function(devId){
                self.exclDev.push(self.controller.hashCode(devId));
            });
        }

        // collect ids from devices that are batteries or permanently hidden
        self.controller.devices.filter(function (dev){
            if((dev.get('deviceType') === 'battery' || dev.get('deviceType') === 'text' || dev.get('deviceType') === 'camera' || dev.get('deviceType') === 'switchRGBW' || dev.get('permanently_hidden') === true) && self.exclDev.indexOf(dev.h) === -1){
               self.exclDev.push(dev.h);
            }
        });

        // collect ids from devices that are polled regularly in app SensorsPolling
        self.controller.instances.filter(function (instance){
            if(instance.moduleId === 'SensorsPolling' && instance.active === 'true'){
                instance.params.devices.forEach(function (devId){
                    var h = self.controller.hashCode(devId);                
                    if(self.exclDev.indexOf(h) === -1){
                        self.exclDev.push(h);
                    }
                });
            }
        });

        // filter devices - not excluded
        self.allDevices = self.controller.devices.filter(function(dev){
            return self.exclDev.indexOf(dev.h) === -1;
        });

        if(self.initial === true){

            self.initial = false;

        } else {

            if(self.allDevices.length < self.history.length) {
                var cleanupHistory = [],
                    devices = [];

                self.allDevices.forEach(function (dev){
                   devices.push(dev.h);
                });
                
                cleanupHistory = self.history.filter(function (devHist) {
                    return devices.indexOf(devHist.h) > -1;
                });

                if(cleanupHistory.length === self.allDevices.length){
                    console.log("--- ", "clean up histories");
                    self.history = cleanupHistory;
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
                dev.set({"hasHistory": true});
            } 
                
            switch(devType){
                case 'sensorMultilevel':
                case 'sensorMultiline':
                case 'switchMultilevel':
                case 'thermostat':                       
                    lvl = dev.get("metrics:level");
                    self.storeData(dev, lvl);
                    break;
                case 'switchBinary':
                case 'sensorBinary':
                case 'toggleButton':
                case 'doorlock':
                    self.controller.devices.off(id,'change:metrics:level', self.collectBinaryData);
                    self.controller.devices.on(id,'change:metrics:level', self.collectBinaryData);
                    
                    self.transformBinaryValues(self.switchHistory, dev);
                    break;
                default: // 'doorlock', 'fan', 'switchControl'
                    break;
            }
        });
        console.log("--- ", "histories polled");
        self.switchHistory = [];
    };

    // collect metrics changes from binary sensors or switches
    this.collectBinaryData = function(dev){
        if(dev){
            var sH = self.switchHistory,
                h = dev.get('h'),
                switches = sH.filter(function(o){
                        return o.h === h;
                                    }),
                index = null,
                change;
            
            if(switches.length < 1){
                var item = {
                        h: h,
                        meta: []
                    };

                sH.push(item);
            }

            _.find(sH, function (data, idx) {
                if(data.h === h){
                    index = idx;
                    return;
                }
            });

            // set change object            
            change = {
                    t: Math.floor(new Date().getTime() /1000),
                    l: dev.get("metrics:level")
                };

            if(index !== null){
                sH[index]['meta'].push(change);
                self.switchHistory = sH;
            }
        }
    };

    // store whole history data on storage
    this.storeData = function(dev, lvl) {
        try {
            var self = this,
                h = dev.get('h'),
                history, change, histMetr, index;

            change = self.setChangeObject(lvl);
            
            // get history and metrics history
            history = self.setupMetricsHistory(dev, self.exclDev);

            _.find(history, function (data, idx) {
                if(data.h ===h){
                    index = idx;
                    return;
                }
            });

            histMetr = history[index]['mH'];

            // push only changes during the last 24 hrs
            if(histMetr.length < 288){
                histMetr.push(change);
            } else {
                histMetr.shift();
                histMetr.push(change);
            }

            self.controller.history = self.history;
        
        }catch(e){
            console.log("Can not store history of device '" + dev.get('id') + "' because:", e.toString());
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
    this.transformBinaryValues = function(historyArr, dev){
        var self = this,
            h = dev.get('h'),
            devLvl = dev.get("metrics:level"),
            dT = dev.get('deviceType'),
            arr, cntCh, cntOn, setlvl;

            try {
                arr = historyArr.filter(function(o){
                                        return o.h === h;
                                })[0]['meta'];
                cntCh = arr.length;

                if(dT === 'doorlock') {
                    cntOn = arr.filter(function(e) {
                                        return e.l === "open";
                                }).length;
                } else {
                    cntOn = arr.filter(function(e) {
                                        return e.l === "on";
                                }).length;
                }
                
                switch(cntOn){
                    case 0:
                        setlvl = 0;
                        break;
                    case cntCh:
                        setlvl = 1;
                        break;
                    default:
                        setlvl = 0.5;
                        break;
                }
            } catch (e){
                if (devLvl === "on" || devLvl === "open") {
                    setlvl = 1;
                }else {
                    setlvl = 0;
                }
            }
        self.storeData(dev, setlvl);
    };

    // polling function
    this.saveHistory = function () {
        saveObject("history", self.history);
    };

    this.controller.on("historyPolling.poll", self.setupHistories);
    this.controller.on("saveHistory.poll", self.saveHistory);

    // run first time to setting up histories
    this.setupHistories();
};

DeviceHistory.prototype.stop = function () {
    var self = this;

    // remove eventhandler 
    self.allDevices.forEach(function(dev) {
        var h = dev.h,
            devType = dev.get('deviceType');
        
        if(dev.get("hasHistory") === true){
           dev.set({"hasHistory": false});
        }

        switch(devType){
            case 'switchBinary':
            case 'sensorBinary':
            case 'toggleButton':
                self.controller.devices.off(h,'change:metrics:level', self.collectBinaryData);
                break;
            case 'doorlock':
                break;
            case 'fan':
                break;
            case 'switchControl':
                break;
            default:
                break;
        }
    });
    
    this.controller.emit("cron.removeTask", "historyPolling.poll");
    this.controller.off("historyPolling.poll", self.setupHistories);

    this.controller.emit("cron.removeTask", "saveHistory.poll");
    this.controller.off("saveHistory.poll", self.saveHistory);

    DeviceHistory.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
DeviceHistory.prototype.setChangeObject = function (lvl) {
    var date = new Date(),
        change = {
                id: Math.floor(date.getTime() / 1000),
                t: date.toISOString(),
                l: lvl
            };

    return change;
};

DeviceHistory.prototype.setupMetricsHistory = function (dev, exclDev){
    var self = this,
        h = dev.get('h'),
        index = null,
        item;

    if(exclDev.length > 0 && self.history.length > 0){
        self.history = self.history.filter(function(devHist){
            return exclDev.indexOf(devHist.h) === -1;
        });
    }    

    _.find(self.history, function (data, idx) {
        if(data.h === h){
            index = idx;
            return;
        }
    });
    
    // create new device entry if necessary
    if(self.history.length < 1 || index === null && exclDev.indexOf(h) === -1){
        item = {
                id: dev.get('id'),
                h: h,
                dT: dev.get("deviceType"),
                mH: []
            };

        self.history.push(item);
    }

    return self.history;
};