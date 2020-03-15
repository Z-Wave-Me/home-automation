/* Mobile App Support
 *
 * Z-Wave.Me, 2019
 * Version 3.0.0
 *
 * Author: Poltorak Serguei
 */

/* Module configuration format:
	config
		devices[]			- list of devices
			level			- open/close/on/off/all or a level to compare with
			operator		- to compare the level in case it is a number
			msg			- will be sent instead of the default message if not null
		apps[]				- list of phones
			token			- phone FCM token
			title			- phone name
			os			- target OS: ios/android
			last_seen		- last seen date
			created			- creation date
*/

function MobileAppSupport(id, controller) {
	MobileAppSupport.super_.call(this, id, controller);

	this.PNS = "https://pns.z-wave.me";
	this.ZWayTitle = "Z-Way Notification";
	this.URL = "/smarthome/#/events";
}

inherits(MobileAppSupport, AutomationModule);

_module = MobileAppSupport;

MobileAppSupport.prototype.init = function(config) {
	MobileAppSupport.super_.prototype.init.call(this, config);

	var self = this;

	this.defineHandlers();	
	this.externalAPIAllow("MobileAppSupportAPI");
	
	this.notificationChannelSender = function(to, message) {
		console.logJS(to,  message);
		if (to.indexOf(self.channelIDPrefix()) === 0) {
			self.sendNotification(to.substr(self.channelIDPrefix().length), message);
		}
	};
	
	this.config.apps.forEach(this.announceApp, this);
};

MobileAppSupport.prototype.stop = function() {
	this.config.apps.forEach(this.unannounceApp, this);
	
	this.externalAPIRevoke("MobileAppSupportAPI");

	MobileAppSupport.super_.prototype.stop.call(this);
};

MobileAppSupport.prototype.channelIDPrefix = function() {
	return this.constructor.name + "_" + this.id + "_";
};

MobileAppSupport.prototype.announceApp = function(app) {
	this.controller.registerNotificationChannel(this.channelIDPrefix() + app.token, app.user, app.title, this.notificationChannelSender);
};

MobileAppSupport.prototype.unannounceApp = function(app) {
	this.controller.unregisterNotificationChannel(this.channelIDPrefix() + app.token);
};

MobileAppSupport.prototype.getAppByToken = function(token) {
	return _.findWhere(this.config.apps, {
		token: token
	});
};

MobileAppSupport.prototype.registerApp = function(token, title, os, user, authToken) {
	var found_app = _.findWhere(this.config.apps, {
		token: token
	});
	
	if (!found_app) {
		// new app
		var app = this.generateApp(token, title, os, user, authToken);
		
		this.config.apps.push(app);
		
		this.announceApp(app);
		
		this.welcomeSignup(app); // default subscriptions
		
		var lang = this.loadModuleLang();
		this.sendNotification(token, lang.welcome);
		
		this.permanentAuthToken(app, user, authToken);
		
		// optimization - already done in removeAuthToken // this.saveConfig();
	} else {
		// existing
		if (found_app.user === user) {
			if (found_app.auth_token != authToken) {
				// just a re-login - no need to re-announce the channel - only update the auth token
				this.removeAuthToken(found_app, user, found_app.auth_token);
				found_app.auth_token = authToken;
				this.permanentAuthToken(found_app, user, found_app.auth_token);
			}
			
			found_app.title = title;
			found_app.last_seen = Date.now();
		} else {
			// re-register under new token
			var lang = this.loadModuleLang();
			this.unregisterApp(token);
			this.registerApp(token, title, os, user);
		}
	}
	
	return true;
};

MobileAppSupport.prototype.unregisterApp = function(token, user, authToken) {
	var app = _.findWhere(this.config.apps, {
		token: token
	});

	if (app) {
		var lang = this.loadModuleLang();
		this.sendNotification(token, lang.goodby);
		
		this.goodbySignout(app); // remove subscriptions
		
		this.config.apps = _.without(this.config.apps, _.findWhere(this.config.apps, app));
		this.saveConfig();
		
		this.unannounceApp(app);
		
		//!!! this.removeAuthToken(app, user, authToken);
		
		return true;
	}
	return false;
};

MobileAppSupport.prototype.generateApp = function(token, title, os, user, authToken) {
	return {
		token: token,
		title: title,
		os: os,
		user: user,
		auth_token: authToken,
		last_seen: Date.now(),
		created: Date.now()
	}
};

MobileAppSupport.prototype.permanentAuthToken = function(app, user, authToken) {
	var profile = this.controller.getProfile(user);
	if (profile) {
		this.controller.permanentToken(profile, authToken);
	}
};

MobileAppSupport.prototype.removeAuthToken = function(app, user, authToken) {
	if (app.auth_token === authToken && app.user === user) {
		var profile = this.controller.getProfile(user);
		if (profile) {
			this.controller.removeToken(profile, authToken);
		}
	}
};

MobileAppSupport.prototype.welcomeSignup = function(app) {
	// Add by default notifications filtering for that phone:
	//  - binary sensors (alarms)
	//  - doorlock sensors
	//  - errors (valid for admin only)
	this.controller.emit('notificationsfiltering.addDefault', this.channelIDPrefix() + app.token);
};

MobileAppSupport.prototype.goodbySignout = function(app) {
	// Remove notifications filtering for that phone
	this.controller.emit('notificationsfiltering.remove', this.channelIDPrefix() + app.token);
};

MobileAppSupport.prototype.sendNotification = function(token, notification) {
	var os = this.config.apps.filter(function(app) { return app.token === token; }).map(function(app) { return app.os; })[0];
	
	if (os) {
		var message = {
			to: token,
			os: os,
			notification: {
				title: this.ZWayTitle,
				body: notification
			},
			data: {
				url: this.URL,
				title: this.ZWayTitle,
				body: notification
			}
		};
		
		console.log("(Mobile App Support) send notification: " + JSON.stringify(notification));
		this.sendPushMessage(message);
	};
};

MobileAppSupport.prototype.sendPushMessage = function(message) {
	var req = {
		url: this.PNS,
		method: "POST",
		async: true,
		data: JSON.stringify(message),
		success: function(response) {
			//console.log("(Mobile App Support) Notify listener success");
		},
		error: function(response) {
			console.log("(Mobile App Support) Notify listener failed");
		}
	};

	try {
		console.logJS(req);
		http.request(req);
	} catch (e) {
		console.log("(Mobile App Support) Exception during notify listener.");
	}
};

// --------------- Public HTTP API -------------------

MobileAppSupport.prototype.externalAPIAllow = function (_name) {
	ws.allowExternalAccess(_name, this.controller.auth.ROLE.ADMIN);
	ws.allowExternalAccess(_name + ".app", this.controller.auth.ROLE.ADMIN);
	
	global[_name] = this[_name];
};

MobileAppSupport.prototype.externalAPIRevoke = function (_name) {
	delete global[_name];
	
	ws.revokeExternalAccess(_name);
	ws.revokeExternalAccess(_name + ".app");
};

MobileAppSupport.prototype.defineHandlers = function () {
	var self = this;

	this.MobileAppSupportAPI = function () {
		return {status: 400, body: "Bad MobileAppSupportAPI request "};
	};

	this.MobileAppSupportAPI.app = function(url, request) {
		if (request.method == 'POST') {
			var reqObj;
			try {
				reqObj = parseToObject(request.body);
			} catch (e) {
				return {
					status: 400,
					body: e.toString()
				};
			}
			
			if (
				reqObj &&
				reqObj.hasOwnProperty('os') && reqObj.os != '' &&
				reqObj.hasOwnProperty('token') && reqObj.token != ''&&
				reqObj.hasOwnProperty('title') && reqObj.title != ''
			) {
				if (self.registerApp(reqObj.token, reqObj.title, reqObj.os, request.user, request.authToken)) {
					return {
						status: 200,
						body: 'Registrated'
					};
				} else {
					return {
						status: 400,
						body: 'Already registrated'
					};
				}
			} else {
				return {
					status: 400,
					body: 'Missing arguments os, token, title'
				};
			}
		} else if (request.method == 'DELETE') {
			var reqObj;
			try {
				reqObj = parseToObject(request.body);
			} catch (e) {
				return {
					status: 400,
					body: e.toString()
				};
			}

			if (reqObj && reqObj.hasOwnProperty('token') && reqObj.token != '') {
				if (self.unregisterApp(reqObj.token, request.user, request.authToken)) {
					return {
						status: 200,
						body: 'Deleted'
					}
				} else {
					return {
						status: 400,
						body: 'Phone not found'
					};
				}

			} else {
				return {
					status: 400,
					body: 'Missing argument token'
				};
	   		}
		} else {
			return {
				status: 405,
				body: 'Method Not Allowed'
			}
		}
	};
};
