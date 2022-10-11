/* Mobile App Support
 *
 * Z-Wave.Me, 2022
 * Version 3.0.0
 *
 * Author: Poltorak Serguei
 */

/* Module configuration format:
	config
		apps[]				list of phones
			token		str	phone FCM token
			title		str	phone name
			profileName	str	name of the profile in the phone app
			os		str	target OS: ios/android
			app_profile	str	UUID of the profile in the app in case of multiple profiles
			user		int	user Id
			userName	str	user name
			auth_token	str	first digits of auth token to revoke it on delete
			last_seen	int	last seen date
			created		int	creation date
*/

function MobileAppSupport(id, controller) {
	MobileAppSupport.super_.call(this, id, controller);

	this.PNS = "https://pns.z-wave.me:5010/v1.0/push";
	this.URL = "/smarthome/#/events"; // TODO make URL specific to the event
}

inherits(MobileAppSupport, AutomationModule);

_module = MobileAppSupport;

MobileAppSupport.prototype.init = function(config) {
	MobileAppSupport.super_.prototype.init.call(this, config);

	var self = this;

	this.defineHandlers();
	this.externalAPIAllow("MobileAppSupportAPI");
	
	this.config.apps.forEach(this.announceApp, this);
}

MobileAppSupport.prototype.stop = function() {
	this.config.apps.forEach(this.unannounceApp, this);
	
	this.externalAPIRevoke("MobileAppSupportAPI");

	MobileAppSupport.super_.prototype.stop.call(this);
};

MobileAppSupport.prototype.channelID = function(token, app_profile) {
	return this.getName() + "_" + this.id + "_" + token + "_" + app_profile;
};

MobileAppSupport.prototype.announceApp = function(app) {
	var self = this;
	
	this.controller.registerNotificationChannel(this.channelID(app.token, app.app_profile), app.user, app.title + "(" + app.profileName + ")", function(message) {
		self.sendNotification(app.token, app.app_profile, message);
	});
};

MobileAppSupport.prototype.unannounceApp = function(app) {
	this.controller.unregisterNotificationChannel(this.channelID(app.token, app.app_profile));
};

MobileAppSupport.prototype.getAppByToken = function(token) {
	return _.findWhere(this.config.apps, {
		token: token
	});
};

MobileAppSupport.prototype.getAppByTokenAppProfile = function(token, app_profile) {
	return _.findWhere(this.config.apps, {
		token: token,
		app_profile: app_profile
	});
};

MobileAppSupport.prototype.getApps = function(user) {
	return this.config.apps.filter(function(app) { return user === undefined || app.user === user; });
};

MobileAppSupport.prototype.registerApp = function(token, title, profileName, os, app_profile, user, authToken) {
	var found_app = _.findWhere(this.config.apps, {
		token: token,
		app_profile: app_profile
	});
	
	if (!found_app) {
		// new app
		var app = this.generateApp(token, title, profileName, os, app_profile, user, authToken);
		
		this.config.apps.push(app);
		
		this.announceApp(app);
		
		var profile = this.controller.getProfile(user) || {};
		var lang = this.loadModuleLang();
		this.addNotification("notification", lang.m_welcome + ": " + app.title + " (" + profile.name + " / " + profile.login + ", " + profileName + ")", "module");
		
		this.permanentAuthToken(user, authToken);
		
		// optimization - already done in permanentAuthToken // this.saveConfig();
	} else {
		// existing
		if (found_app.user === user) {
			if (found_app.auth_token != authToken) {
				// just a re-login - no need to re-announce the channel - only update the auth token
				this.removeAuthToken(user, found_app.auth_token);
				found_app.auth_token = authToken;
				this.permanentAuthToken(user, found_app.auth_token);
			}
			
			found_app.title = title;
			found_app.profileName = profileName;
			found_app.last_seen = Date.now();
		} else {
			// re-register under new token
			var lang = this.loadModuleLang();
			this.unregisterApp(token, app_profile);
			this.registerApp(token, title, profileName, os, app_profile, user);
		}
	}
	
	return true;
};

MobileAppSupport.prototype.unregisterApp = function(token, app_profile) {
	var app = _.findWhere(this.config.apps, {
		token: token,
		app_profile: app_profile
	});

	if (app) {
		var profile = this.controller.getProfile(app.user) || {};
		var lang = this.loadModuleLang();
		this.addNotification("notification", lang.m_goodby + ": " + app.title + " (" + profile.name + " / " + profile.login + ", " + profile.profileName + ")", "module");
		
		this.config.apps = _.without(this.config.apps, _.findWhere(this.config.apps, app));
		this.saveConfig();
		
		this.unannounceApp(app);
		
		this.removeAuthToken(app.user, app.auth_token);
		
		return true;
	}
	return false;
};

MobileAppSupport.prototype.generateApp = function(token, title, profileName, os, app_profile, user, authToken) {
	return {
		token: token,
		title: title,
		profileName: profileName,
		os: os,
		app_profile: app_profile,
		user: user,
		auth_token: authToken,
		last_seen: Date.now(),
		created: Date.now()
	}
};

MobileAppSupport.prototype.permanentAuthToken = function(user, authToken) {
	var profile = this.controller.getProfile(user);
	if (profile) {
		this.controller.permanentToken(profile, authToken);
	}
};

MobileAppSupport.prototype.removeAuthToken = function(user, authToken) {
	var profile = this.controller.getProfile(user);
	if (profile) {
		this.controller.removeToken(profile, authToken);
	}
};

MobileAppSupport.prototype.sendNotification = function(token, app_profile, notification) {
	var app = this.config.apps.filter(function(app) { return app.token === token && app.app_profile === app_profile; })[0];
	
	if (app && app.os) {
		var message = {
			to: token,
			os: app.os,
			profileId: app.app_profile,
			url: this.URL,
			title: (app.profileName ? app.profileName : "Smart Home") + " " + this.controller.getRemoteId(),
			body: notification
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
			console.log("(Mobile App Support) Notification sent");
		},
		error: function(response) {
			console.log("(Mobile App Support) Notification send failed: " + JSON.stringify(response));
		}
	};

	try {
		http.request(req);
	} catch (e) {
		console.log("(Mobile App Support) Exception during notify listener.");
	}
};

// --------------- Public HTTP API -------------------

MobileAppSupport.prototype.externalAPIAllow = function (_name) {
	ws.allowExternalAccess(_name, this.controller.auth.ROLE.USER);
	ws.allowExternalAccess(_name + ".app", this.controller.auth.ROLE.USER);
	
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
		if (request.method == 'GET') {
			return {
				status: 200,
				body: _.clone(self.getApps(request.role === self.controller.auth.ROLE.ADMIN ? undefined : request.user)).map(function(app) {
					var profile = self.controller.getProfile(app.user);
					app.userName = profile ? profile.name : '';
					return app;
				})
			};
		} else if (request.method == 'POST') {
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
				reqObj.hasOwnProperty('profileId') && reqObj.profileId != '' &&
				reqObj.hasOwnProperty('token') && reqObj.token != ''&&
				reqObj.hasOwnProperty('title') && reqObj.title != ''
			) {
				if (self.registerApp(reqObj.token, reqObj.title, reqObj.profileName, reqObj.os, reqObj.profileId, request.user, request.authToken)) {
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

			if (
				reqObj &&
				reqObj.hasOwnProperty('token') && reqObj.token != '' &&
				reqObj.hasOwnProperty('profileId') && reqObj.profileId != ''
			) {
				var app = self.getAppByTokenAppProfile(reqObj.token, reqObj.profileId);
				
				if (
					app &&
					(request.role === self.controller.auth.ROLE.ADMIN || request.user == app.user) &&
					self.unregisterApp(reqObj.token, reqObj.profileId)
				) {
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
					body: 'Missing argument token or profileId'
				};
	   		}
		} else {
			return {
				status: 405,
				body: 'Method Not Allowed'
			}
		}
	};
	this.MobileAppSupportAPI.registerApp = this.MobileAppSupportAPI.app; // alias
};
