/* Mobile App Support
 *
 * 2018
 * Version 2.0.0 Beta
 *
 * Author: Michael Hensche
 */
function MobileAppSupport(id, controller) {
	MobileAppSupport.super_.call(this, id, controller);

	var self = this;

	self.ANDROID = "android";
	self.IOS = "ios";

	self.FCM_ANDROID_TOKEN = "AAAA8nWqXJU:APA91bFZwwNpcfQRjjsmU6LMv0LhEw4XoqCqOhyINwJQI2BOGCoFQAK1PcbVy-W9jtnqb4f0DoH6yGSi3Opc_v9T6uDinCL373CMjorKZk8mCkK8CknxCA2JC2T5YiuEWnkz-6Ng2IPD";
	self.FCM_IOS_TOKEN = "AAAA8nWqXJU:APA91bHLng5bi0STgF3ojBVsu-vMjM2ut7ywHjR1LIYHZWRLzWPMh1Fm6tGXNis6v3z7PF0NI9ouUiJO4YmMhWWTwWFBsjtXFsiuDYWDTJA7N82d6Ger9bNtL7dzjmk_s4iy6Egt7Qjc";

	// stores object references of callback function for removing event listener
	self.notificationCallbackWrapper = {};
}

inherits(MobileAppSupport, AutomationModule);

_module = MobileAppSupport;

MobileAppSupport.prototype.init = function(config) {
	MobileAppSupport.super_.prototype.init.call(this, config);

	var self = this;

	// transform old data
	var old_db_filename = 'MobileAppSupport_App_v100',
		// try to restore old MobileAppSupport
		oldMobileAppSupport = loadObject(old_db_filename);

	if(!!oldMobileAppSupport) {
		var apps = oldMobileAppSupport.data.map(function(app) {
			var obj = {
					token: app.token,
					title: app.title,
					os: app.os,
					notify: true,
					last_seen: Date.now(),
					created: new Date(app.created).getTime()
				};
			return obj;
		});

		self.config.apps = apps;

		// delete old MobileAppSupport after transformation
		saveObject(old_db_filename, null);
	}
	oldMobileAppSupport = undefined;


	if(self.config.hasOwnProperty('logLevelContainer') &&
	   self.config.hasOwnProperty('delete_phone') &&
	   self.config.hasOwnProperty('devices'))
	{
		var oldDevices = self.config.devices,
			devices = oldDevices.map(function(dev) {
				var entry = {};
				Object.keys(dev).forEach(function(k) {
					if(_.isObject(dev[k]) && dev[k].hasOwnProperty('dev_logLevel') && dev[k].dev_logLevel == 'notifications') {
						entry = {
							id: dev[k].dev_select,
							deviceType: dev.dev_filter.split('_')[2],
							msg: dev[k].dev_message ? dev[k].dev_message : '',
							level: null
						}

						if(dev[k].dev_matchValue && _.isObject(dev[k].dev_matchValue)) {
							entry.level = dev[k].dev_matchValue.dev_matchValueOperand;
							entry['operator'] = dev[k].dev_matchValue.dev_matchValueOperation;
						} else if(dev[k].dev_matchValue && _.isString(dev[k].dev_matchValue)) {
							entry.level = dev[k].dev_matchValue;
						}
					}
				});

				if(!_.isEmpty(entry)) {
					return entry;
				}
			});

		self.config.devices = devices;

		// delete old stuff
		delete self.config.logLevelContainer;
		delete self.config.delete_phone;
		delete self.config.phones;

		oldDevices = undefined;
	}
	self.saveConfig();

	this.notificationCallbackWrapper = function(notice) {
		self.config.devices.forEach(function(device) {
			var send = false;

			if(notice.source == device.id) {
				if(isNaN(device.level)) { // open/close/on/off/all
					if(device.level == notice.message.l || device.level == 'all') {
						send = true;
					}
				} else {
					if(device.operator) {
						var value = parseFloat(notice.message.l); // level
						if(!isNaN(value)) { // float or decimal value
							if(eval(value + device.operator + device.level)) {
								send = true;
							}
						} else {
							console.log("notice.message.l is string on/off/open/close")
							console.log("value", value);
							// TODO in case value is notice.message.l string on/off/open/close
						}
					}
				}
			}

			if(send) {
				if(device.msg !== "") { // custom message
					self.sendNotification(self.controller.prepareMessage(device.msg));
				} else { // generic message
					self.sendNotification(notice.message.dev + " : " + notice.message.l);
				}

			}
		});
	};

	self.controller.on('notifications.push', self.notificationCallbackWrapper);


	this.defineHandlers();
    this.externalAPIAllow();
	global["MobileAppSupportAPI"] = this.MobileAppSupportAPI;
}

/**
 * Get app data by firebase token
 * @param  {String} firbase token (unique)
 * @return {object} app object or null
 */
MobileAppSupport.prototype.getApp = function(token) {
	var self = this;

	// if an entry of app exist returns null
	var app = _.findWhere(self.config.apps, {
		token: token
	});// _.findWhere returns single object or undefined

	if(!app) {
		return null;
	} else {
		return app;
	}
}

/**
 * Add app to instance and save instance
 * @param {Object} app - app instance
 * @return {Number} status - 0 item allready exist - 1 new item inserted
 */
MobileAppSupport.prototype.registerApp = function(app) {
	var self  = this;

	// if an entry of app exist returns null
	var found = _.findWhere(self.config.apps, {
		token: app.token
	}); // _.findWhere returns single object or undefined

	if (found) {
		return 0;
	} else {
		// add new item and save config
		self.config.apps.push(app);
		this.saveConfig();
		return 1;
	}
}


/**
 * Remove app from instance and save instance
 * @param {String} token - app token
 * @return {Number} status - 0 item not exist
 * @return {Object} app object
 * {
 *      'token': 'duWC56vAtlI:APA91bGaTAbdjuDEoYHyy3zPesn7pkuEwzFpBBmnDx4ssBXcQYwdruCmkbXDpZFwz44zYul7D0CP55mhlGTBPvagfjUjcl8VeFrikR6zTy2w83FkwTvckDGA1SnXy1ym0A0erhBvI-pY',
 *		'title': 'MI-8 Phone',
 *		'os': 'android',
 *		'notify': true,
 *		'last_seen': 1545304924385,
 *		'created': 1545304924385
 * }
 */
MobileAppSupport.prototype.removeApp = function(token) {
	var self  = this;

	// if an entry of app exist returns null
	var app = _.findWhere(self.config.apps, {
		token: token
	}); // _.findWhere returns single object or undefined

	if (app) {
		// remove app form array
		self.config.apps = _.without(self.config.apps, _.findWhere(self.config.apps, app));
		// save new array
		this.saveConfig();
		return app;
	} else {
		return 0;
	}
}

/**
 * Update app in instance and save instance
 * @param {Object} app - app instance
 * @return {Number} status - 0 item not exist
 * @return {Object} app object
 * {
 *      'token': 'duWC56vAtlI:APA91bGaTAbdjuDEoYHyy3zPesn7pkuEwzFpBBmnDx4ssBXcQYwdruCmkbXDpZFwz44zYul7D0CP55mhlGTBPvagfjUjcl8VeFrikR6zTy2w83FkwTvckDGA1SnXy1ym0A0erhBvI-pY',
 *		'title': 'MI-8 Phone',
 *		'os': 'android',
 *		'notify': true,
 *		'last_seen': 1545304924385,
 *		'created': 1545304924385
 * }
 */
MobileAppSupport.prototype.updateApp = function(app) {
	var self  = this;

	// if an entry of app exist returns index
	var index = _.findIndex(self.config.apps, app); // _.findIndex retuns index or -1
	console.log("index", index);
	if (index > -1) {
		// udpate last_seen key
		app.last_seen = Date.now();
		// override entry with updated item
		self.config.apps[index] = app;
		// save new array
		this.saveConfig();
		return app;
	} else {
		return 0;
	}
}

/**
 * The method provides a template for app
 * @param {String} token - token addresses the app
 * @param {String} title - device name
 * @param {String} os - android/ios
 * @param {Number} active - indicator for sending notifications
 * @return {Object} app
 * {
 *      'token': 'duWC56vAtlI:APA91bGaTAbdjuDEoYHyy3zPesn7pkuEwzFpBBmnDx4ssBXcQYwdruCmkbXDpZFwz44zYul7D0CP55mhlGTBPvagfjUjcl8VeFrikR6zTy2w83FkwTvckDGA1SnXy1ym0A0erhBvI-pY',
 *		'title': 'MI-8 Phone',
 *		'os': 'android',
 *		'notify': true,
 *		'last_seen': 1545304924385,
 *		'created': 1545304924385
 * }
 */
MobileAppSupport.prototype.generateApp = function(token, title, os) {
	var self = this;

	return {
		'token': token,
		'title': title,
		'os': os,
		'notify': true,
		'last_seen': Date.now(),
		'created': Date.now()
	}
};

/**
 * Wrapper function for sendPushMessage
 * @param  {[type]} notification [description]
 */
MobileAppSupport.prototype.sendNotification = function(notification) {
	var self = this;

	var appData = self.config.apps

	console.log("(Mobile App Support) send notification: " + JSON.stringify(notification));

	appData.forEach(function(app) {
		var message = {
			to: app.token,
			notification: {
				title: "App Notification", // TODO depends on app os
				body: notification
			}
		}

		if (message) {
			self.sendPushMessage(message, app.os);
		}
	});
};

/**
 * Send message to firbase
 * @param  {Obejct} message
 * @param  {String} os      andoird/ios
 */
MobileAppSupport.prototype.sendPushMessage = function(message, os) {
	var self = this;

	var fcmToken;

	if (os === self.ANDROID) {
		fcmToken = self.FCM_ANDROID_TOKEN;
	} else if (os === self.IOS) {
		fcmToken = self.FCM_IOS_TOKEN;
	}

	if (fcmToken) {
		var req = {
			url: "https://fcm.googleapis.com/fcm/send",
			method: "POST",
			headers: {
				'Authorization': 'key=' + fcmToken,
				'Content-Type': 'application/json'
			},
			async: true,
			data: JSON.stringify(message), // message contains also device token (to: ...)
			success: function(response) {
				console.log("(Mobile App Support) Notify listener success");
				// console.log(JSON.stringify(response, null, 4));
			},
			error: function(response) {
				console.log("(Mobile App Support) Notify listener failed");
				// console.log(JSON.stringify(response, null, 4));
			}
		};

		try {
			console.log(JSON.stringify(req, null, 4));
			http.request(req);
		} catch (e) {
			console.log("(Mobile App Support) Exception during notify listener.");
		}
	}
};

/**
 * remove callbacks
 */
MobileAppSupport.prototype.removeCallbacks = function() {
	var self = this;
	// remove notification callback
	if (typeof self.notificationCallbackWrapper === "function") {
		self.controller.off('notifications.push', self.notificationCallbackWrapper);
		self.notificationCallbackWrapper = {};
	}
};

MobileAppSupport.prototype.stop = function() {
	var self = this;

	// remove event callbacks 'change:metrics:level', 'notifications.push'
	self.removeCallbacks();

	delete global["ZWaveAPI"];

	MobileAppSupport.super_.prototype.stop.call(self);
};

// --------------- Public HTTP API -------------------


MobileAppSupport.prototype.externalAPIAllow = function (name) {
    var _name = !!name ? ("MobileAppSupport." + name) : "MobileAppSupportAPI";

    ws.allowExternalAccess(_name, this.controller.auth.ROLE.ADMIN);
    ws.allowExternalAccess(_name + ".registerApp", this.controller.auth.ROLE.ADMIN);
    ws.allowExternalAccess(_name + ".removeApp", this.controller.auth.ROLE.ADMIN);
    ws.allowExternalAccess(_name + ".updateApp", this.controller.auth.ROLE.ADMIN);
};

MobileAppSupport.prototype.externalAPIRevoke = function (name) {
    var _name = !!name ? ("MobileAppSupport." + name) : "MobileAppSupportAPI";

    ws.revokeExternalAccess(_name);
    ws.revokeExternalAccess(_name + ".registerApp");
    ws.revokeExternalAccess(_name + ".removeApp");
    ws.revokeExternalAccess(_name + ".updateApp");
};

MobileAppSupport.prototype.defineHandlers = function () {
    var self = this;

    this.MobileAppSupportAPI = function () {
        return {status: 400, body: "Bad MobileAppSupportAPI request "};
    };

    /**
     * [registerApp description]
     * @param  {string} url
     * @param  {object} request
     * @return {object} response
     */
    this.MobileAppSupportAPI.registerApp = function(url, request) {
    	// console.log("registerApp");
    	// console.log("url", url);
    	// console.log("request", JSON.stringify(request, null, 4));

    	if(request.method == 'POST') {
	    	// body data {
	    	// 		os: 'andorid',
	    	// 		token: 'sdfsdfklösdfskldjflskjdflskjdf',
	    	// 		title: 'Test Phone'
	    	// 	}
	    	try {
				var reqObj = parseToObject(request.body);
			} catch (e) {
				return {
					status: 400,
					body: e.toString()
				};
			}

			if(reqObj &&
			   reqObj.hasOwnProperty('os') && reqObj.os != '' &&
			   reqObj.hasOwnProperty('token') && reqObj.token != ''&&
			   reqObj.hasOwnProperty('title') && reqObj.title != '')
		    {
	    		var app = self.generateApp(reqObj.token, reqObj.title, reqObj.os),
	    			status = self.registerApp(app);

	    		if(status) { // 1
	    			return {
	    				status: 200,
	    				body: 'App successfull registrated'
	    			};
	    		} else { // 0
	    			return {
	    				status: 500,
	    				body: 'App allready registrated'
	    			};
	    		}
	    	} else {
	    		return {
	    			status: 400,
	    			body: 'Argument os, token, title is required.'
	    		};
	    	}
	   	} else {
	   		return {
    			status: 405,
    			body: 'Method Not Allowed'
    		}
	   	}
    }

    /**
     * [removeApp description]
     * @param  {string} url
     * @param  {object} request
     * @return {object} response
     */
    this.MobileAppSupportAPI.removeApp = function(url, request) {
    	// console.log("removeApp");
    	// console.log("url", url);
    	// console.log("request", JSON.stringify(request, null, 4));

    	if(request.method == 'DELETE') {
    		// body data {
	    	// 		token: 'sdfsdfklösdfskldjflskjdflskjdf',
	    	// 	}
	    	try {
				var reqObj = parseToObject(request.body);
			} catch (e) {
				return {
					status: 400,
					body: e.toString()
				};
			}

	    	if(reqObj && reqObj.hasOwnProperty('token') && reqObj.token != '') {
	    		var app = self.removeApp(reqObj.token);

	    		if(app) { // app object
	    			return {
	    				status: 200,
	    				body: 'App ' + app.title + ' removed.'
	    			}
	    		} else { // 0
	    			return {
	    				status: 500,
	    				body: 'App not found or allready deleted.'
	    			};
	    		}

	    	} else {
	    		return {
	    			status: 400,
	    			body: 'Argument token is required.'
	    		};
	   		}
    	} else {
    		return {
    			status: 405,
    			body: 'Method Not Allowed'
    		}
    	}
    }

    /**
     * [updateApp description]
     * @param  {string} url
     * @param  {object} request
     * @return {object} response
     */
    this.MobileAppSupportAPI.updateApp = function(url, request) {
    	// console.log("updateApp");
    	// console.log("url", url);
    	// console.log("request", JSON.stringify(request, null, 4));

    	if(request.method == 'PUT') {
    		// body data {
	    	// 		os: 'andorid',
	    	// 		token: 'sdfsdfklösdfskldjflskjdflskjdf',
	    	// 		title: 'Test Phone'
	    	// 	}
	    	try {
				var reqObj = parseToObject(request.body);
			} catch (e) {
				return {
					status: 400,
					body: e.toString()
				};
			}

	    	if(reqObj && reqObj.hasOwnProperty('token') && reqObj.token != '') {
	    		var app = self.getApp(reqObj.token);

	    		if(app) { // app object
	    			app.title = reqObj.hasOwnProperty('title') ? reqObj.title : app.title;

	    			self.updateApp(app)

	    			return {
	    				status: 200,
	    				body: 'App updated.'
	    			}
	    		} else { // 0
	    			return {
	    				status: 500,
	    				body: 'App not found'
	    			};
	    		}
	    	} else {
	    		return {
	    			status: 400,
	    			body: 'Argument token is required.'
	    		};
	   		}
    	} else {
    		return {
    			status: 405,
    			body: 'Method Not Allowed'
    		}
    	}
    }
};
