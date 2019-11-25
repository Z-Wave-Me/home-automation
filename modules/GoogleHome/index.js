/*** GoogleHome Z-Way HA module *******************************************

 Version: 0.0.2 beta
 (c) Z-Wave.Me, 2019
 -----------------------------------------------------------------------------
 Author: Avaliani Alexander <aam@z-wave.me>
 Description:

 ******************************************************************************/

function GoogleHome (id, controller) {
    // Call superconstructor first (AutomationModule)
    GoogleHome.super_.call(this, id, controller);
}

inherits(GoogleHome, AutomationModule);

_module = GoogleHome;

GoogleHome.prototype.init = function(config) {
    var self = this;

    GoogleHome.super_.prototype.init.call(this, config);

    this.HOMEGRAPH_URL = 'https://ghome.z-wave.me:5002/zway/api/v1.0/';
    this.GOOGLE_PROFILE_NAME = 'https://oauth-redirect.googleusercontent.com';
    
    this.deferredVDevCreation = [];
    this.deferredVDevCreationTimer = null;

    this.controller.devices.on('change:metrics:level', function(dev) {
      self.reportState(dev);
    });
    this.controller.devices.on('change:metrics:title', function(dev) {
      self.requestSyncDevices([dev]);
    });
    this.controller.devices.on('change:location', function(dev) {
      self.requestSyncDevices([dev]);
    });
    this.controller.devices.on('created', function(dev) {
      self.deferredVDevCreation.push(dev);
      if (self.deferredVDevCreationTimer) {
        clearTimeout(self.deferredVDevCreationTimer);
      }
      self.deferredVDevCreationTimer = setTimeout(function() {
        self.requestSyncDevices(self.deferredVDevCreation);
        self.deferredVDevCreation = [];
        self.deferredVDevCreationTimer = null;
      }, 10*1000);
    });
    this.controller.on('profile.updated', function(profile) {
      self.requestSyncProfiles(self.getActiveAgentUsers().filter(function(agentUser) {
        return agentUser.name === profile.login;
      }).map(function(agentUser) {
        return agentUser.agentId;
      }));
    });
};

GoogleHome.prototype.stop = function() {
    GoogleHome.super_.prototype.stop.call(this);
};

GoogleHome.prototype.requestSyncProfiles = function(agentUserIds) {
  if (agentUserIds.length != 0) {
    data = JSON.stringify({'agentUserIds': agentUserIds});
    http.request({
      method: 'POST',
      url: this.HOMEGRAPH_URL + 'requestSync',
      async: true,
      data: data,
      headers: {
        "Content-Type": "application/json"
      },
      success: function(response) {
        console.log("Google Home updated");
      },
      error: function(response) {
        console.log("Google Home update error: " + response.statusText + ", " + response.data);
      }
    });
  }
};

GoogleHome.prototype.requestSyncDevices = function(devices) {
    var self = this,
      agentUserIds = [];

    var agentUsers = this.getActiveAgentUsers();
    
    devices.forEach(function(dev) {
      agentUsers.forEach(function(agentUser) {
        if (agentUserIds.indexOf(agentUser.agentId) === -1 && self.controller.devicesByUser(agentUser.id).indexOf(dev.id) !== -1) {
          agentUserIds.push(agentUser.agentId);
        }
      });
    });

    this.requestSyncProfiles(agentUserIds);
}

GoogleHome.prototype.reportState = function(dev) {
  var self = this,
      data = [];
  
  // check every profile if its list of devices has changed and make request to server
  this.getActiveAgentUsers().forEach(function(profile) {
    if (self.controller.deviceByUser(dev.id, profile.id)) {
      data.push({
        agentUserId: profile.agentId,
        device: dev
      })
    }
  });

  if (data.length != 0) {
    http.request({
      method: 'POST',
      url: this.HOMEGRAPH_URL + 'reportState',
      async: true,
      data: JSON.stringify(data),
      headers: {
        "Content-Type": "application/json"
      },
      success: function(response) {
        // not to spam in the log // console.log("Google Home updated");
      },
      error: function(response) {
        console.log("Google Home update error: " + response.statusText + ", " + response.data + ", " + JSON.stringify(data));
      }
    });
  }
};

GoogleHome.prototype.getActiveAgentUsers = function() {
  var self = this;
  
  // get only active Google OAuth profiles
  return this.controller.profiles.filter(function(profile) {
    // TODO: Change this to some special mark of token
    return profile.login.indexOf(self.GOOGLE_PROFILE_NAME) !== -1;
  }).map(function(profile) {
    return {
      id: profile.id,
      name: profile.login,
      agentId: profile.uuid
    };
  });
}

// TODO: API to notify this module that the token has to be marked as Google Home (and the profile too)

// TODO: !!! Check that you can link two times the same profile with two Google accounts and Google will not complain on this (same agentId). In that case change agentID to tokenID
