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
        countHistories = [],
        exclSensors = [],
        // define excluded device types
        exclDevTypes = ['battery','text','camera','switchRGBW'];

    this.history = loadObject('history') || [];
    this.switchHistory = [];
    this.allDevices = [];
    this.initial = true;

    // setting up device histories
    this.setupHistories = function(){

        // get excluded sensors
        exclSensors = self.controller.instances.filter(function (instance){
            return instance.moduleId === 'SensorsPolling' && instance.active === 'true';
        });

        self.allDevices = self.controller.devices.filter(function(dev){
            return  dev.get('permanently_hidden') === false &&                  // only none permanently_hidden devices
                    _.unique(self.config.devices).indexOf(dev.id) === -1 &&     //in module excluded devices
                    exclDevTypes.indexOf(dev.get('deviceType')) === -1 &&       //excluded device types
                    exclSensors.indexOf(dev.id) === -1;                          //excluded sensors
        });

        // cleanup first after  all virtual devices are created  
        if(self.initial === true){            
            self.initial = false;        
        } else {
            if(self.allDevices.length > 0 && self.allDevices.length < self.history.length) {
                var cleanedUpHistory = [],
                    devices = [];

                devices = self.allDevices.map(function (dev){
                   return dev.get('h');
                });
                
                cleanedUpHistory = self.history.filter(function (devHist) {
                    return devices.indexOf(devHist.h) > -1;
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
                index = null,
                change;

            _.find(sH, function (data, idx) {
                if(data.h === h){
                    index = idx;
                    return;
                }
            });

            if(sH.length < 1 || index === null){
                var item = {
                        h: h,
                        meta: []
                    };

                sH.push(item);
            }

            // set change object            
            change = self.setChangeObject(dev.get("metrics:level"));

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
                index = null,
                history, change, histMetr, item;

            change = self.setChangeObject(lvl);
            
            // find dev history and set index
            _.find(self.history, function (data, idx) {
                if(data.h === h){
                    index = idx;
                    return;
                }
            });
            
            // create new device entry if necessary
            if(self.history.length < 1 || index === null){
                item = {
                        id: dev.get('id'),
                        h: h, // hashed device id
                        dT: dev.get("deviceType"),
                        mH: []
                    };

                self.history.push(item);
                index = self.history.length - 1;
            }
            
            // push only changes during the last 24 hrs
            histMetr = self.history[index]['mH'].filter(function (ch){
                return ch.id >= (change.id - 86400);
            });
            
            if(histMetr.length < 288){ // 86400 s (24 h) = 288 * 300 s (5 min)
                histMetr.push(change);
            } else {
                histMetr.shift();
                histMetr.push(change);
            }

            self.history[index]['mH'] = histMetr;

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

                cntOn = arr.filter(function(meta) {
                    return  meta.l === "open" || //doorlock
                            meta.l === "on";                            //binaries
                }).length;

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
                l: lvl
            };

    return change;
};