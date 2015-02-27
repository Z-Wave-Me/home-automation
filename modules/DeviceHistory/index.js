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

    var self = this,
        exclDev = self.config.devices, 
        allDevices = self.controller.devices;
    
    this.switchHistory = [];

    // polling function
    this.setupHistories = function(){

        if(!exclDev){
            exclDev = self.config.devices;
        }

        if(!allDevices){
            allDevices = this.controller.devices;
        }

        // Setup histories
        allDevices.forEach(function(dev) {
            var id = dev.id;
            
            if(exclDev.indexOf(id) < 0){
                var devType = dev.get('deviceType');
                
                switch(devType){
                    case 'sensorMultilevel':
                    case 'sensorMultiline':
                        DeviceHistory.prototype.storeHistory(dev, 244);
                        console.log("--- ", "history polled for device:", id);
                        break;
                    case 'switchBinary':
                    case 'sensorBinary':
                        DeviceHistory.prototype.storeSwitchHistory(this.switchHistory, dev, 244);
                        console.log('switchHistory: '+ this.switchHistory);
                        break;
                    case 'toggleButton':
                    case 'switchMultilevel':
                    case 'thermostat':
                        console.log('switchHistory: '+ this.switchHistory);
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
            }
        });
    };

    this.storeSwitchData = function(dev){

        var id = dev.get('id'),
            lvl = dev.get("metrics:level"),
            lastEntry = new Date().getTime() /1000,
            index, change, item;      

        if(this.switchHistory.length < 1){
            item = {
                    id: id,
                    meta: []
                };

            this.switchHistory.push(item);
        }

        // set change object
        change = {
                t: Math.floor(lastEntry),
                l: lvl
            };
        
        for(var i = 0; i < this.switchHistory.length; i++){
            if(this.switchHistory[i]['id'] === id){
                this.switchHistory[i]['meta'].push(change);
            }
        }     
    };

    // Setup handlers
    this.setupHandlers = function(){
        allDevices.forEach(function(dev) {
            var id = dev.id;
            
            if(exclDev.indexOf(id) < 0){
                var devType = dev.get('deviceType');
                
                switch(devType){
                    case 'switchBinary':
                    case 'sensorBinary':
                    case 'toggleButton':
                    case 'switchMultilevel':
                    case 'thermostat':
                        self.controller.devices.on(id,'change:metrics:level', self.storeSwitchData); // use eventhandler to store every change during last 24 hrs 
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
            }
        });
    };

    this.controller.on("historyPolling.poll", this.setupHistories);

    // run first time to setting up histories
    this.setupHistories();
    this.setupHandlers();
};

DeviceHistory.prototype.stop = function () {
    var self = this,
        exclDev = self.config.devices, 
        allDevices = self.controller.devices;

    if (this.timer){
        clearInterval(this.timer);
    }

    // remove eventhandler 
    allDevices.forEach(function(dev) {
        var id = dev.id;
        
        if(exclDev.indexOf(id) < 0){
            var devType = dev.get('deviceType');
            
            switch(devType){
                case 'switchBinary':
                case 'sensorBinary':
                case 'toggleButton':
                case 'switchMultilevel':
                case 'thermostat':
                    self.controller.devices.off(id,'change:metrics:level', self.storeSwitchData); // use eventhandler to store every change during last 24 hrs 
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
        }
    });
    
    this.controller.emit("cron.removeTask", "historyPolling.poll");
    this.controller.off("historyPolling.poll", this.setupHistories);

    DeviceHistory.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
DeviceHistory.prototype.storeHistoryBinary = function(historyArr, dev, count){
        var id = dev.get('id'),
            lastEntry = new Date().getTime() /1000,
            lvl, history, change, histMetr;

        if(historyArr.indexOf("on") > -1 && historyArr.indexOf("off") > -1){
            lvl = "0.5";
        } else if ()
        

        // set change object
        change = DeviceHistory.prototype.setChangeObject(lvl);
        
        // get history and metrics history
        history = DeviceHistory.prototype.setupMetricsHistory(dev);
        histMetr = history[0]['mH'];

        // push only changes during the last 24 hrs
        if(histMetr.length < count){
            histMetr.push(change);    
        } else {
            histMetr.shift();
            histMetr.push(change);
        }

        DeviceHistory.prototype.saveHistory(id,history);
};

DeviceHistory.prototype.storeHistoryBinary = function(dev){
        var id = dev.get('id'),
            devType = dev.get('deviceType'),
            lvl = dev.get("metrics:level"),
            lastEntry = new Date().getTime() /1000,
            history, change, histMetr, firstEntry, ln, cId, getPara;

        // set change object
        change = DeviceHistory.prototype.setChangeObject(lvl);
        
        // get history and metrics history
        history = DeviceHistory.prototype.setupMetricsHistory(dev);
        histMetr = history[0]['mH'];

        // check date of the first item in metrics history
        if(histMetr.length > 0){
            firstEntry = new Date(histMetr[0]['t']).getTime() /1000;
        }else{
            firstEntry = lastEntry;
        }
        
        ln = histMetr.length;
        cId = change.id;
        getPara = function(param){
            if(ln > 0){
                return histMetr[ln-1][param];
            } else {
                return null;
            }
        };

        // avoid double entries (occurs only on events)
        if(getPara('id') != cId && getPara('l') != lvl) {
            
            // push only changes during the last 24 hrs    
            if(lastEntry - (24*3600) < firstEntry){
                histMetr.push(change);    
            } else {
                histMetr.shift();
                histMetr.push(change);
            }            
            
            DeviceHistory.prototype.saveHistory(id,history);
        }
};

DeviceHistory.prototype.storeHistory = function(dev, count) {
            
    var self = this,
        id = dev.get('id'),
        lvl= dev.get("metrics:level"),
        date = new Date(),
        history, item, change, histMetr;

    change = self.setChangeObject(lvl);
    
    // get history and metrics history
    history = self.setupMetricsHistory(dev);
    histMetr = history[0]['mH'];

    // push only changes during the last 24 hrs
    if(histMetr.length < count){
        histMetr.push(change);    
    } else {
        histMetr.shift();
        histMetr.push(change);
    }

    self.saveHistory(id,history);      
};

DeviceHistory.prototype.saveHistory = function (id, object) {
    saveObject(id + "history.json", object);
};

DeviceHistory.prototype.loadHistory = function (id) {
    return loadObject(id + "history.json");
};

DeviceHistory.prototype.setChangeObject = function (lvl) {
    var date = new Date(),
        change = {
                id: Math.floor(date.getTime() / 1000),
                t: date.toISOString(),
                l: lvl
            };

    return change;
};

DeviceHistory.prototype.setupMetricsHistory = function (dev){
    var self = this,
        id = dev.get('id'),
        history, item;
    
    // try to load device history
    try {
        history = self.loadHistory(id) || [];
    } catch (e) {
        console.log("Error loading history.json of device id '" + id + "' :", e.message);
    }
    
    // create new device entry if necessary
    if(history.length < 1){
        item = {
                id: id,
                dT: dev.get("deviceType"),
                mH: []
            };

        history.push(item);
    }

    // return metrics history array 
    return history; 
};