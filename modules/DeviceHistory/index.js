/*** DeviceHistory Z-Way HA module *******************************************

 Version: 2.0.0
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
	// Call supervarructor first (AutomationModule)
	DeviceHistory.super_.call(this, id, controller);

	// define excluded device types
	this.devTypes = ['sensorMultilevel'];
	this.langFile = this.loadModuleLang();

	this.history = {};
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

		this.defineHandlers();
		this.externalAPIAllow();
		global["HistoryAPI"] = this.HistoryAPI;

		// set history of excluded devices to false
		this.config.devices.forEach(function (devId) {
			var vDevd = self.controller.devices.get(devId);

			if (vDevd && vDevd.get('hasHistory') === true) {
				vDevd.set('hasHistory', false, {silent: true});
			}
		});

		this.initializeDevices();

		// try to restore old histories
		var oldHistory = loadObject('history');

		if(!!oldHistory || (_.isArray(oldHistory) && oldHistory.length > 0)) {
			oldHistory.forEach(function(history){
				if (self.registeredVDevIds.indexOf(history.id) > -1 && self.devTypes.indexOf(history.dT) > -1) {
					self.history[history.id].set(history.mH);
				}
			});

			saveObject('history', null, true);
			oldHistory = undefined;
		} else {
			oldHistory = undefined;
		}

		this.assignDeviceListeners();

		// cleanup storage content list after 30 secs
		setTimeout(function(){
			// run first time to setting up histories
			self.setupHistories();
		}, 30000);
	},
	stop: function () {
		var self = this;

		// remove eventhandlers
		this.config.allRegisteredDevices.forEach(function(vDevId) {
			var vDev = self.controller.devices.get(vDevId);

			if(vDev && vDev.get("hasHistory") === true){
				vDev.set("hasHistory", false,{ silent: true });
			}

			self.removeHistory(vDev);
		});

		this.controller.devices.off('created', self.assignHistory);
		this.controller.devices.off('removed', this.removeHistory);

		this.externalAPIRevoke();
		delete global["HistoryAPI"];


		DeviceHistory.super_.prototype.stop.call(this);
	},
	// ----------------------------------------------------------------------------
	// --- Module methods
	// ----------------------------------------------------------------------------
	setHistory: function (vdevId) {

		this.history[vdevId] = new LimitedArray(
			loadObject('history_' + vdevId) || [],
			function (arr) {
				saveObject('history_' + vdevId, arr, true);
			},
			100, // check it every 100 entries
			0, // save unlimited entries
			function (devHistory){
				var now = Math.floor(Date.now() / 1000);
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
		this.storeData = function(dev) {
			try {
				var change = {
					id: Math.round(Date.now() / 1000),
					l: +dev.get("metrics:level")
				};

				self.history[dev.id].push(change);

			} catch(e) {
				self.addNotification('error', self.langFile.err_store_history + dev.get('metrics:title') + " ERROR: " + e.toString(), 'module');
			}
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
		});
	},
	assignDeviceListeners: function () {
		var self = this;

		this.assignHistory = function (vDev) {
			if (vDev && vDev.id &&
				vDev.get('permanently_hidden') === false &&			  						// only none permanently_hidden devices
				_.unique(self.config.devices).indexOf(vDev.id) === -1 &&	  				// in module excluded devices
				self.devTypes.indexOf(vDev.get('deviceType')) > -1 &&						// allowed device types
				self.exclSensors.indexOf(vDev.id) === -1) {									// excluded sensors

				// add to registered vDev list
				self.config.allRegisteredDevices.push(vDev.id);

				//save into config
				self.saveConfig();

				// set LimitedArray for history
				self.setHistory(vDev.id);

				self.addNotification('info', self.langFile.info_add_history + vDev.get('metrics:title'), 'module');

				//assign level listener
				self.controller.devices.off(vDev.id, 'change:metrics:level', self.storeData);
				self.controller.devices.on(vDev.id, 'change:metrics:level', self.storeData);

				if (vDev && vDev.get('hasHistory') === false) {
					vDev.set('hasHistory', true, {silent: true});
				}
			}
		};

		this.removeHistory = function (vDev) {

			if (vDev && self.config.allRegisteredDevices.indexOf(vDev.id) > -1) {
				// remove history array
				if (self.history[vDev.id]) {
					self.history[vDev.id].finalize();
					saveObject("history_"+vDev.id, null, true);
					delete self.history[vDev.id];
				}

				self.addNotification('info', self.langFile.info_remove_history + vDev.get('metrics:title'), 'module');

				self.controller.devices.off(vDev.id, 'change:metrics:level', self.storeData);

				// remove from registry
				self.config.allRegisteredDevices = self.config.allRegisteredDevices.filter(function(devId){
					return devId !== vDev.id;
				});

				// unassign history
				if (vDev && vDev.get('hasHistory') === true) {
					vDev.set('hasHistory', false, {silent: true});
				}
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
				_.unique(self.config.devices).indexOf(dev.id) === -1 &&	  					// in module excluded devices
				self.devTypes.indexOf(dev.get('deviceType')) > -1 &&						// allowed device types
				self.exclSensors.indexOf(dev.id) === -1;									// excluded sensors
		}).map(function(vdev) {
			return vdev.id;
		});
	},
	// setting up device histories
	setupHistories: function(){
		var self = this,
			storedDevHistories = [];

		// cleanup first after all virtual devices are created
		if(__storageContent) {

			_.forEach(__storageContent, function (name) {
				if (name.indexOf('history_') > -1) {
					storedDevHistories.push(name.substring(8));
				}
			});

			storedDevHistories.forEach(function(historyFileName){
				if (!self.history[historyFileName]) {
					self.addNotification('info', historyFileName + self.langFile.info_transformation, 'module');
					saveObject('history_' + historyFileName, null, true);
				}
			});
		}
	},
	// --------------- Public HTTP API -------------------
	externalAPIAllow: function () {
		ws.allowExternalAccess('HistoryAPI', this.controller.auth.ROLE.USER);
		ws.allowExternalAccess('HistoryAPI.Get', this.controller.auth.ROLE.USER);
		ws.allowExternalAccess('HistoryAPI.Delete', this.controller.auth.ROLE.USER);
	},
	externalAPIRevoke: function () {
		ws.revokeExternalAccess('HistoryAPI');
		ws.revokeExternalAccess('HistoryAPI.Get');
		ws.revokeExternalAccess('HistoryAPI.Delete');
	},
	defineHandlers: function () {
		var self = this;

		this.HistoryAPI = function() {
			return { status: 400, body: "Bad HistoryAPI request " };
		};

		this.HistoryAPI.Get = function (url, request) {
			var q = request.query || null,
				since = parseInt(url.substring(1), 10) || 0,
				items = q && q.hasOwnProperty('show') ? parseInt(q.show, 10) : 0,
				devId = q && q.hasOwnProperty('id') ? q.id : null,
				now = Math.floor(Date.now() / 1000),
				body = {
					updateTime: now
				};
			var sec = 0;
			var entries = [];
			var averageEntries = [];

			if (devId && self.history[devId]) {
				var hist = self.history[devId].get();

				// create output with n (= show) values - 1440, 288, 96, 48, 24, 12, 6
				if (items > 0 && items <= 1440) {
					sec = 86400 / items; // calculate seconds of range

					// calculate averaged value of all meta values between 'sec' range
					for (var i = 0; i < items; i++) {
						var from = Math.floor(now - sec * (items - i));
						var to = Math.floor(now - sec * (items - (i + 1)));

						// filter values between from and to
						var range = hist.filter(function (metric) {
							return metric.id >= from && metric.id <= to;
						});

						var l = null;
						// calculate level
						if (range.length > 0) {
							l = range.reduce(function (acc, cur) {
								return +cur.l + acc;
							}, 0) / range.length;
							if (l === +l && l !== (l | 0)) { // round to one position after '.'
								l = +l.toPrecision(3);
							}
						}

						// push new averaged entry to

						averageEntries.push({
							id: to,
							l: l
						});
					}
					entries = averageEntries;
				} else {
					entries = hist;
				}

				// filter meta entries by since
				body.history = since > 0 ? entries.filter(function (metric) {
					return metric.id >= since;
				}) : entries;
				body.code = 200;
			} else if (devId && !self.history[devId]) {
				body.code = 404;
				body.message = 'Not Found.';

			} else {
				body.histories = {};
				body.code = 200;
				self.config.allRegisteredDevices.forEach(function (vDevId) {
					body.histories[vDevId] = _.filter(self.history[vDevId].get(), function (entry) {
						return entry.id >= since;
					});
				});
			}

			return self.prepareHTTPResponse(body);
		};

		this.HistoryAPI.Delete = function(url, request) {
			var q = request.query || null,
				vDevId = q && q.hasOwnProperty('id')? q.id : null,
				body = {
					updateTime: Math.floor(Date.now() / 1000)
				};

			if (vDevId && self.history[vDevId]) {
				self.history[vDevId].set([]);

				var vdev = self.controller.devices.get(vDevId);

				self.addNotification('info', self.langFile.info_clear_id_history + vdev? vdev.get('metrics:title') : vDevId, 'module');

				body.code = 201;

			} else if (vDevId && !self.history[vDevId]) {
				body.code = 404;
				body.message = 'Not Found.';

			} else {

				self.addNotification('info', self.langFile.info_clear_all_histories, 'module');

				self.config.allRegisteredDevices.forEach(function(devId){
					if(self.history[devId]) {
						self.history[devId].set([]);
					}
				});

				body.code = 201;
			}

			return self.prepareHTTPResponse(body);
		};
	}
});
