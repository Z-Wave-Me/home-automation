/*** DeviceHistory Z-Way HA module *******************************************

Version: 1.4.0
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

	// define excluded device types
	this.devTypes = ['sensorMultilevel','switchMultilevel','thermostat'],
	this.langFile = this.loadModuleLang();

	this.history = {}
	this.allDevices = [];
	this.initial = true;
	this.registeredVDevIds = [];
	this.storedDevHistories = [];

	this.exclSensors = this.controller.instances.filter(function (instance){
		return instance.moduleId === 'SensorsPolling' && instance.active === 'true';
	});
}

inherits(DeviceHistory, AutomationModule);

_module = DeviceHistory;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

_.extend(DeviceHistory.prototype, {
	init: function (config) {
		DeviceHistory.super_.prototype.init.call(this, config);

		var self = this;		

		// set history of excluded devices to false
		this.config.devices.forEach(function (devId) {
			var vDevd = self.controller.devices.get(devId);

			if (vDevd && vDevd.get('hasHistory') === true) {
				vDevd.set('hasHistory', false, {silent: true});
			}
		});

		this.initializeDevices();

		// try to restore old histories
		oldHistory = loadObject('history');

		if(!!oldHistory || (_.isArray(oldHistory) && oldHistory.length > 0)) {
			oldHistory.forEach(function(history){
				if (self.registeredVDevIds.indexOf(history.id) > -1 && self.devTypes.indexOf(history.dT) > -1) {
					self.history[history.id].set(history.mH);
				}
			});

			saveObject('history',null);
			oldHistory = undefined;
		} else {
			oldHistory = undefined;
		}

		// run first time to setting up histories
		this.setupHistories();

		this.assignDeviceListeners();
	},
	stop: function () {
		var self = this;

		// remove eventhandlers
		this.config.allRegisteredDevices.forEach(function(vDevId) {
			vDev = self.controller.devices.get(vDevId);

			if(vDev && vDev.get("hasHistory") === true){
				vDev.set("hasHistory", false,{ silent: true });
			}

			console.log('######################### ' + vDevId + ' #########################');
			console.log('###');
			console.log('### self.history:', JSON.stringify(self.history[vDevId]));
			console.log('###');
			console.log('###################################################################');

			if (self.history[vDevId]) {
				self.history[vDevId].finalize();
			}

			saveObject("history_"+vDevId, null);
			self.controller.devices.off(vDevId, self.storeData);
		});

		this.controller.devices.off('created', self.assignHistory);
		this.controller.history = [];


		DeviceHistory.super_.prototype.stop.call(this);
	},
	// ----------------------------------------------------------------------------
	// --- Module methods
	// ----------------------------------------------------------------------------
	setHistory: function (vdevId) {

		this.history[vdevId] = new LimitedArray(
			loadObject('history_' + vdevId) || [],
			function (arr) {
				saveObject('history_' + vdevId, arr);
			},
			3, // check it every 10 entries
			1000, // save up to 1000 entries (min 288 per day)
			function (devHistory){
				var now = Math.floor((new Date()).getTime() / 1000);
				return devHistory.id >= (now - 86400);
			}
		);
	},
	initializeDevices: function (){
	 	var self = this;

		this.config.allRegisteredDevices = this.updateDevList();

		//save into config
		this.saveConfig();

		// store whole history data on storage
		self.storeData = function(dev) {
			//try {
				var change = {
						id: Math.floor((new Date()).getTime() / 1000),
						l: dev.get("metrics:level")
					};
				
				self.history[dev.id].push(change);

				self.controller.history = self.history;
			
			/*} catch(e){
				console.log("Cannot store history of device '" + dev.get('metrics:title') + "' because:", e.toString());
				self.controller.addNotification('error', self.langFile.err_store_history + dev.get('metrics:title') + " ERROR: " + e.toString(), 'module', 'DeviceHistory');
			}*/
		};

		_.forEach(this.config.allRegisteredDevices, function(vdevId){
			var vDev = self.controller.devices.get(vdevId);
			
			// create new LimitedArray for 
			self.setHistory(vdevId);

			// set hasHistory true
			if(vDev && vDev.get("hasHistory") === false){
				vDev.set("hasHistory", true,{ silent: true });
			}

			self.controller.devices.off(vdevId, 'change:metrics:level', self.storeData);
			self.controller.devices.on(vdevId, 'change:metrics:level', self.storeData);

			self.controller.history[vdevId] = self.history[vdevId].get();
		});
	},
	assignDeviceListeners: function () {
		var self = this;

		// store whole history data on storage
		this.storeData = function(dev) {
			//try {
				var change = {
						id: Math.floor((new Date()).getTime() / 1000),
						l: dev.get("metrics:level")
					};
				
				self.history[dev.id].push(change);

				self.controller.history[dev.id] = self.history[dev.id].get();
			
			/*} catch(e){
				console.log("Cannot store history of device '" + dev.get('metrics:title') + "' because:", e.toString());
				self.controller.addNotification('error', self.langFile.err_store_history + dev.get('metrics:title') + " ERROR: " + e.toString(), 'module', 'DeviceHistory');
			}*/
		};

		this.assignHistory = function (vDev) {
			if (vDev && vDev.id &&
				vDev.get('permanently_hidden') === false &&			  						// only none permanently_hidden devices
				(!vDev.get('metrics:removed') || vDev.get('metrics:removed') === false) &&	// only none removed devices
				_.unique(self.config.devices).indexOf(vDev.id) === -1 &&	  				// in module excluded devices
				self.devTypes.indexOf(vDev.get('deviceType')) > -1 &&						// allowed device types
				self.exclSensors.indexOf(vDev.id) === -1) {									// excluded sensors

				// add to registered vDev list
				self.config.allRegisteredDevices.push(vDev.id);
				
				//save into config
				self.saveConfig();

				// set LimitedArray for history
				self.setHistory(vDev.id); 

				//assign level listener
				self.controller.devices.off(vDev.id, 'change:metrics:level', self.storeData);
				self.controller.devices.on(vDev.id, 'change:metrics:level', self.storeData);
			}
		};

		this.removeHistory = function (vDev) {
			if (vDev) {
				if (self.history[vDev.id]) {
					self.history[vDev.id].finalize();
					saveObject("history_"+vDev.id, null);
					delete self.history[vDev.id];
				}

				console.log('######################### ' + vDev.id + ' #########################');
				console.log('###');
				console.log('### self.history:', JSON.stringify(self.history));
				console.log('###');
				console.log('###################################################################');

				self.controller.devices.off(vDev.id, 'change:metrics:level', self.storeData);
			}
		};

		// assign listener to new vdev
		this.controller.devices.on('created', this.assignHistory);
		this.controller.devices.on('removed', this.removeHistory);
	},
	// return list of registered vDev IDs
	updateDevList: function () {
		var self = this;

		return this.controller.devices.filter(function(dev){
			return  dev.get('permanently_hidden') === false &&			  						// only none permanently_hidden devices
					(!dev.get('metrics:removed') || dev.get('metrics:removed') === false) && 	// only none removed devices
					_.unique(self.config.devices).indexOf(dev.id) === -1 &&	  					// in module excluded devices
					self.devTypes.indexOf(dev.get('deviceType')) > -1 &&						// allowed device types
					self.exclSensors.indexOf(dev.id) === -1;									// excluded sensors
		}).map(function(vdev) {
			return vdev.id;
		});
	},
	// setting up device histories
	setupHistories: function(){
		var self = this;
		// cleanup first after all virtual devices are created  
		storageContent = loadObject('__storageContent');

		if(!!storageContent) {

			/*_.forEach(storageContent, function (name) {
				if (name.indexOf('history_') > -1 && self.allRegisteredDevices.indexOf(name.substring(8)) < 0) {
					self.allRegisteredDevices.push(name.substring(8));
				}
			});*/

			this.storedDevHistories.forEach(function(historyFileName){
				if (!self.history[historyFileName.substring(8)]) {
					console.log('vDev', historyFileName.substring(8), 'not assigned to history. Stored histories will be removed ...')
					saveObject(historyFileName, null);
				}
			});
		}
		console.log("--- ", "histories updated");
	}
});