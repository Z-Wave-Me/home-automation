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

    var self = this,
        allDevices = self.controller.devices;

    allDevices.forEach(function(dev) {
        var devType = dev.get('deviceType');
        
        switch(devType){
            case 'sensorMultilevel':
            case 'sensorMultiline':
                self.setUpdateInterval(dev, 300, 244); // check every 5 min
                break;
            case 'battery':
                self.setUpdateInterval(dev, 1200, 12); // check every 2 hrs
                break;
            case 'switchBinary':
            case 'sensorBinary':
                self.controller.devices.on(dev.id,'change:metrics:level', self.storeHistoryBinary); // use eventhandler to store every change during last 24 hrs 
                break;
            case 'doorlock':
                break;
            case 'switchMultilevel':
            case 'thermostat':
                self.controller.devices.on(dev.id,'change:metrics:level', self.storeHistoryBinary); // use eventhandler to store every change during last 24 hrs
                break;
            case 'fan':
                break;
            case 'switchControl':
                break;
            case 'toggleButton':
                break;
            default:
                break;
        }
    });
};

DeviceHistory.prototype.stop = function () {
    var self = this,
        allDevices = self.controller.devices;

    if (this.timer){
        clearInterval(this.timer);
    }

    allDevices.forEach(function(dev) {
        var devType = dev.get('deviceType');
        
        if(devType === 'switchBinary' || devType === 'sensorBinary'){
                self.controller.devices.off(dev.id,'change:metrics:level', self.storeHistoryBinary);
        }
    });

    DeviceHistory.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
DeviceHistory.prototype.setUpdateInterval = function(dev, seconds, count){
    var self = this;

    this.timer = setInterval(function() {
            self.storeHistory(dev, count);
    }, seconds*1000);
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

    change = self.setChangeObject();
    
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