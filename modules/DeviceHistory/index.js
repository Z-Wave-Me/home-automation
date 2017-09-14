/*** DeviceHistory Z-Way HA module *******************************************

Version: 1.3.0
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

		this.history = this.controller.setHistory();
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

		this.updateDevList = function () {
			return self.controller.devices.filter(function(dev){
				return  dev.get('permanently_hidden') === false &&			  // only none permanently_hidden devices
						(!dev.get('metrics:removed') || dev.get('metrics:removed') === false) &&						 // only none removed devices
						_.unique(config.devices).indexOf(dev.id) === -1 &&	  //in module excluded devices
						exclDevTypes.indexOf(dev.get('deviceType')) === -1 &&   //excluded device types
						self.exclSensors.indexOf(dev.id) === -1;				//excluded sensors
			});
		};
		this.allDevices = this.updateDevList();

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

			if (self.allDevices.length === 0) {
				self.allDevices = self.updateDevList();
			}

			// Setup histories
			self.allDevices.forEach(function(dev) {
				var id = dev.id,
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
					default: //'fan',
						break;
				}
			});
			console.log("--- ", "histories polled");
		};

		// collect metrics changes from binary sensors or switches

		// store whole history data on storage
		this.storeData = function(dev, lvl) {
			try {
				var devId = dev.id,
					index = null,
					history, change, histMetr, item;

				change = self.setChangeObject(lvl);
				
				// find dev history and set index
				_.find(self.history, function (data, idx) {
					if(data.id === devId){
						index = idx;
						return;
					}
				});
				
				// create new device entry if necessary
				if(self.history.length < 1 || index === null){
					item = {
							id: dev.id,
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

		// polling function
		this.saveHistory = function () {
			saveObject("history", self.history);
		};

		this.controller.on("historyPolling.poll", self.setupHistories);
		this.controller.on("saveHistory.poll", self.saveHistory);

		// run first time to setting up histories
		this.setupHistories();
		this.saveHistory();
	},
	stop: function () {
		var self = this;

		// remove eventhandler

		this.allDevices.forEach(function(vDev) {
			if(vDev.get("hasHistory") === true){
				vDev.set("hasHistory", false,{ silent: true });
			} 
		});
		
		this.controller.emit("cron.removeTask", "historyPolling.poll");
		this.controller.off("historyPolling.poll", self.setupHistories);

		this.controller.emit("cron.removeTask", "saveHistory.poll");
		this.controller.off("saveHistory.poll", self.saveHistory);

		saveObject("history", null);

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