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
        return agentUser.name;
      }));
    });
};

GoogleHome.prototype.requestSyncProfiles = function(agentUserIds) {
  if (agentUserIds.length != 0) {
    if (agentUserIds[0] != null) {
      data = JSON.stringify({'agentUserIds': agentUserIds});
      http.request({
        method: 'POST',
        url: 'https://testflask11.pagekite.me/zway/api/v1.0/requestSync',
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
  }
};

GoogleHome.prototype.requestSyncDevices = function(devices) {
    var self = this,
      agentUserIds = [];

    var agentUsers = this.getActiveAgentUsers();
    
    devices.forEach(function(dev) {
      agentUsers.forEach(function(agentUser) {
        if (agentUser.dev.indexOf(dev.id) !== -1 && agentUserIds.indexOf(agentUser.name) === -1) {
          agentUserIds.push(agentUser.name);
        }
      });
    });

    this.requestSyncProfiles(agentUserIds);
}

GoogleHome.prototype.reportState = function(dev) {
  var self = this,
      data = [];
  
  var agentUsers = this.getActiveAgentUsers();
  // check every profile if its list of devices has changed and make request to server
  agentUsers.forEach(function(profile) {
    if (profile.dev.indexOf(dev.id) != -1) {
      data.push({
        agentUserId: profile.name,
        devices: dev
      })
    }
  });

  if (data.length != 0) {
    http.request({
      method: 'POST',
      url: 'https://testflask11.pagekite.me/zway/api/v1.0/reportState',
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
  // get only active Google OAuth profiles with their devices list
  return this.controller.profiles.map(function(profile){
    if (profile.hasOwnProperty('redirect_uri')) {
      if (profile.redirect_uri.indexOf('googleusercontent')) {
        return {
          name: profile.login,
          dev: profile.devices
        }
      }
    }
  }).filter(function(o) {return o !== undefined});
}
