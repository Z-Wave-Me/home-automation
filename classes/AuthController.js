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
    
    // link to controller to get profiles
    this.controller = controller;
}

AuthController.prototype.resolve = function(request, requestedRole) {
    var role, session,
        self = this;
    
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
    session = this.sessions[profileSID];

    if (!session) {
        // no session found or session expired

        if (requestedRole === this.ROLE.USER) {
            // try to find Local user account
            if (request.peer.address === "127.0.0.1") {
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
