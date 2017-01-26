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

    // TODO: replace with tokens
    // list of saved sessions
    this.sessions = [];
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
    var profileSID = request.headers['ZWAYSession'];
    if (!profileSID) {
        var cookie,
            cookiesHeader = request.headers['Cookie'];
        if (cookiesHeader) {
            cookie = cookiesHeader.split(";").map(function(el) { return el.trim().split("="); }).filter(function(el) { return el[0] === "ZWAYSession" });
            if (!!cookie && !!cookie[0]) {
                profileSID = cookie[0][1];
            }
        }
    }
    
    return profileSID;
}

AuthController.prototype.resolve = function(request, requestedRole) {
    var role, session,
        self = this;

    var defaultProfile = _.filter(this.controller.profiles, function (profile) {
        return profile.login === 'admin' && profile.password === 'admin';
    });
    
    session = this.sessions[this.getSessionId(request)];

    if (!session) {
        // no session found or session expired

        // try Basic auth
        var authHeader = request.headers['Authorization'];
        if (authHeader && authHeader.substring(0, 6) === "Basic ") {
            authHeader = Base64.decode(authHeader.substring(6));
            if (authHeader) {
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
                // dont' treat find.z-wave.me as local user (connection comes from local ssh server)
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
            if (requestedRole === this.ROLE.ANONYMOUS) {
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

    if (!role) {
        role = session.role;
    }
    
    return {user: session.id, role: role};
};

AuthController.prototype.checkIn = function(profile, sid) {
  this.sessions[sid] = profile;
};

AuthController.prototype.forgottenPwd = function(email, token) {
    var self = this,
        success;

    if ( Object.keys(this.forgottenPwdCollector).length > 0) {
        Object.keys(this.forgottenPwdCollector).forEach(function(t){
            if (self.forgottenPwdCollector[t].email === email) {
                console.log('Tokenrequest already exists for e-mail:', email);
                success = false;
            }
        });
    } else {
        this.forgottenPwdCollector[token] = {
            email: email,
            expTime: Math.floor(new Date().getTime() / 1000) + 3600
        };

        success = true;
    }

    if (!self.expireTokens) {
        this.expireTokens = setInterval(function() {
            var expirationTime = Math.floor(new Date().getTime() / 1000);
            
            Object.keys(self.forgottenPwdCollector).forEach(function(tkn, i) {
                if (tkn.expTime < expirationTime) {
                    self.removeForgottenPwdEntry(i);
                }
            });
            
            if (self.forgottenPwdCollector.size === 0 && self.expireTokens) {
                clearInterval(self.expireTokens);
            }
        }, 600 * 1000);
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