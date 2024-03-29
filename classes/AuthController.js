/*** Automation Webserver Auth Controller *************************************

Version:
-------------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Copyright: (c) ZWave.Me, 2015

******************************************************************************/
'use strict';

function AuthController (controller) {
	// available roles
	this.ROLE = {
		ADMIN: 1,
		USER: 2,
		LOCAL: 3,
		ANONYMOUS: 4
	};

	this.forgottenPwdCollector = {};
	
	// link to controller to get profiles
	this.controller = controller;
}

AuthController.prototype.isAuthorized = function(myRole, requiredRole) {
	if (!requiredRole) {
		// no role required, allow access
		return true;
	}

	return myRole <= requiredRole;
}

AuthController.prototype.getSessionId = function(request) {
	// check if session id is specified in cookie or header
	var profileSID;
	
	// first try Authorization Bearer
	var authHeader = request.headers['Authorization'];
	if (authHeader && authHeader.indexOf('Bearer ') === 0) {
		profileSID = authHeader.substr('Bearer '.length).split('/')[1];
		if (profileSID) {
			request.__authMethod = 'Authorization Bearer';
			return profileSID;
		}
	}
	
	// second try ZWAYSession
	profileSID = request.headers['ZWAYSession'];
	if (profileSID) {
		request.__authMethod = 'ZWAYSession';
		return profileSID;
	}
	
	// third try cookie
	var cookiesHeader = request.headers['Cookie'];
	var cookiesIgnore = !!request.headers['ZWAYSessionCookieIgnore'];
	if (cookiesHeader && !cookiesIgnore) {
		var cookie = cookiesHeader.split(";").map(function(el) { return el.trim().split("="); }).filter(function(el) { return el[0] === "ZWAYSession" });
		if (!!cookie && !!cookie[0]) {
			request.__authMethod = 'Cookie';
			return cookie[0][1];
		}
	}
	
	return '';
}

AuthController.prototype.resolve = function(request, requestedRole) {
	var user, role, token, session,
		self = this;

	if (request.user && request.role && request.authToken) {
		user = request.user;
		role = request.role;
		token = request.authToken;
		
		if ((role === this.ROLE.LOCAL || role === this.ROLE.ANONYMOUS) && requestedRole === this.ROLE.USER) {
			role = this.ROLE.USER;
		}
	} else {
		var defaultProfile = _.filter(this.controller.profiles, function (profile) {
			return profile.login === 'admin' && profile.password === 'admin';
		});
		
		var noAnonymous = false;
		
		var reqSession = self.getSessionId(request);
		if (reqSession) {
			noAnonymous = true;
			
			var removedExpired = false;
			session = _.find(this.controller.profiles, function(profile) {
				var _profile, toRemove = [];
				
				_profile = _.find(profile.authTokens, function(authToken) {
					// remove expired tokens
					if (authToken.expire > 0 && authToken.expire < Date.now()) {
						toRemove.push(authToken.sid);
						removedExpired = true;
					}
					if (authToken.sid == reqSession) {
						// make the Authorization Bearer always permanent
						if (authToken.expire != 0 && request.__authMethod == 'Authorization Bearer') {
							self.controller.permanentToken(profile, authToken.sid);
						}
						
						// Update last seen and IP
						authToken.lastSeen = Date.now();
						authToken.ip = self.getClientIP(request);
						
						return true;
					}
				});
				toRemove.forEach(function(token) {
					self.controller.removeToken(profile, token, true); // skip save
				});
				
				return _profile;
			});
			if (removedExpired) this.controller.saveConfig(false);
		}

		if (!session) {
			// no session found or session expired

			// try Basic auth
			var authHeader = request.headers['Authorization'];
			if (authHeader && authHeader.substring(0, 6) === "Basic ") {
				authHeader = Base64.decode(authHeader.substring(6));
				if (authHeader) {
					noAnonymous = true;
					
					var authInfo = authHeader.split(':');
					if (authInfo.length === 2 && authInfo[0].length > 0) {
						var profile = _.find(this.controller.profiles, function (profile) {
							return profile.login === authInfo[0];
						});
					
						if (profile && (!profile.salt && profile.password === authInfo[1] || profile.salt && profile.password === hashPassword(authInfo[1], profile.salt))) {
							// auth successful, use selected profile
							session = profile;
						}
					}
				}
			}

			if (!session && requestedRole === this.ROLE.USER) {
				// try to find Local user account
				if (request.peer.address === "127.0.0.1" && defaultProfile.length < 1 && !this.controller.config.firstaccess) {
					// don't treat find.z-wave.me as local user (connection comes from local ssh server)
					if (!(request.headers['Cookie'] && request.headers['Cookie'].split(";").map(function(el) { return el.trim().split("="); }).filter(function(el) { return el[0] === "ZBW_SESSID" }))) {
						// TODO: cache this in future
						session = _.find(this.controller.profiles, function (profile) {
							return profile.role === self.ROLE.LOCAL;
						});
					}
				}
				
				// try to find Anonymous user account
				if (!session) {
					// TODO: cache this in future
					session = _.find(this.controller.profiles, function (profile) {
						return profile.role === self.ROLE.ANONYMOUS;
					});
				}
			}

			if (!session) {
				// no session found, but requested role is anonymous - use dummy session.
				if (requestedRole === this.ROLE.ANONYMOUS && !noAnonymous) {
					session = {
						id: -1, // non-existant ID
						role: this.ROLE.ANONYMOUS
					};
				} else {
					return null;
				}
			}
		}

		// change role type, if we found matching local/anonymous user (real user, not dummy with -1)
		if (session.id !== -1 && (session.role === this.ROLE.LOCAL || session.role === this.ROLE.ANONYMOUS)) {
			role = this.ROLE.USER;
		}

		user = session.id;
		
		if (!role) {
			role = session.role;
		}
		
		token = reqSession.substr(0, 6);
	}
	
	// save in request fields for handling in API and to allow subsequent call of this function
	request.user = user;
	request.role = role;
	request.authToken = token;
	
	return {user: user, role: role, token: token};
};

AuthController.prototype.checkIn = function(profile, req, permanent) {
	var sid;
	
	// generate a new sid
	do {
		sid = crypto.guid();
		
		// and make sure it is unique (first 6 letters can be used to show to the user and to delete sid)
		var found = _.find(this.controller.profiles, function(profile) {
			_.find(profile.authTokens, function(authToken) {
				authToken.sid.substr(0, 6) == sid.substr(0, 6);
			});
		});
		if (!found) break;
	} while(true);
	
	// save user agent
	var userAgent;
	if (req && req.headers && req.headers['User-Agent']) {
		userAgent = req.headers['User-Agent'];
	}
	
	// save auth token in the profile
	if (!profile.authTokens) {
		profile.authTokens = [];
	}
	
	var TTL = 7 * 24 * 60 * 60 * 1000; // 1 week in ms
	var d = Date.now();
	
	profile.authTokens.push({
		sid: sid,
		agent: userAgent,
		date: d,
		lastSeen: d,
		ip: this.getClientIP(req),
		expire: permanent ? 0 : (d + TTL)
	});
	
	this.controller.saveConfig(false);
	
	return sid
};

AuthController.prototype.forgottenPwd = function(email, token) {
	var self = this,
		success = true,
		setToken = function(){
			self.forgottenPwdCollector[token] = {
				email: email,
				expTime: Math.floor(Date.now() / 1000) + 600 // 10 min
			};
		};

	if (Object.keys(this.forgottenPwdCollector).length > 0) {
		Object.keys(this.forgottenPwdCollector).forEach(function(t){
			if (self.forgottenPwdCollector[t].email === email) {
				success = false;
			}
		});
		if (success) {
			setToken();
		}
	} else {
		setToken();
	}

	if (!this.expireTokens) {
		this.expireTokens = setInterval(function() {
			var expirationTime = Math.floor(Date.now() / 1000);
			
			Object.keys(self.forgottenPwdCollector).forEach(function(tkn) {
				if (self.forgottenPwdCollector[tkn].expTime < expirationTime) {
					self.removeForgottenPwdEntry(tkn);
				}
			});
			
			if (Object.keys(self.forgottenPwdCollector).length < 1 && self.expireTokens) {
				clearInterval(self.expireTokens);
				self.expireTokens = null;
			}
		}, 60 * 1000); // check each minute
	}

	return success;
};

AuthController.prototype.removeForgottenPwdEntry = function(token) {
	if (this.forgottenPwdCollector[token]){
		delete this.forgottenPwdCollector[token];
	}
};

AuthController.prototype.getForgottenPwdToken = function(token) {
	var result = null;

	if (this.forgottenPwdCollector[token]){
		result = this.forgottenPwdCollector[token];
	}

	return result;
};

AuthController.prototype.getClientIP = function(request) {
	var ip = request.peer.address;
	
	if (request.peer.address === "127.0.0.1") {
		// don't treat find.z-wave.me as local user (connection comes from local ssh server)
		if (request.headers['Cookie'] && request.headers['Cookie'].split(";").map(function(el) { return el.trim().split("="); }).filter(function(el) { return el[0] === "ZBW_SESSID" }) && request.headers['X-Forwarded-For']) {
			ip = request.headers['X-Forwarded-For'].split(",")[0].trim();
		}
	}
	
	return ip;
};
