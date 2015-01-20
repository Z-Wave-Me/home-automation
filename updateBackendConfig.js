// This script transforms old formats to new

(function () {
  var config = loadObject("config.json");

  if (config) {
    // Change profiles data
    if (config.hasOwnProperty('profiles')) {
      if (config.profiles.length > 0) {
        config.profiles.forEach(function (profile) {
          if (profile.hasOwnProperty('groups')) {
            delete profile.groups;
          }

          if (profile.hasOwnProperty('active')) {
            delete profile.active;
          }

          if (Array.isArray(profile.positions)) {
            profile.positions = profile.positions.filter(function (position) {
              return typeof position === 'string';
            });
          } else {
            profile.positions = [];
          }
        });
      } else {
        config.profiles = [];
      }
    }
    
    // Change instances data
    if (config.hasOwnProperty('instances')) {

      if (config.instances.length > 0) {
        config.instances.forEach(function (instance) {
          // move title and description params
          if (instance.params) {
            if (instance.params.hasOwnProperty('title') || instance.params.hasOwnProperty('description')) {
              instance.title = instance.params.title;
              instance.description = instance.params.description;
              delete instance.params.title;
              delete instance.params.description;
            }

            // move status
            if (instance.params.hasOwnProperty('status')) {
              instance.active = instance.params.status === 'enable';
              delete instance.params.status;
            } else if (!instance.hasOwnProperty('active')) {
              instance.active = true;
            }
          }

          // delete userView
          if (instance.hasOwnProperty('userView')) {
            delete instance.userView;
          }
        });
      }
      
      // Remove Z-Wave Gate, Z-Wave Dead detection and add Z-Wave Binding
      
      if (config.instances.length > 0) {
        var toDelete=[];
        
        config.instances.forEach(function(el, indx) {
          if (el.moduleId && (el.moduleId === "ZWaveDeadDetection" || el.moduleId === "ZWaveGate")) {
            console.log("Removing module " + el.moduleId);
            toDelete.push(indx)
          }
        });
        
        toDelete.reverse().forEach(function(el) {
          config.instances.splice(el, 1)
        });
        
        var maxInstanceId = Math.max.apply(null, config.instances.map(function(el) {
          return el.id;
        }));
        
        if (toDelete.length) {
          console.log("Adding module ZWave");
          config.instances.push({
            "params": {
              "name": "zway",
              "port": "/dev/ttyAMA0",
              "config": "config",
              "translations": "translations",
              "ZDDX": "ZDDX",
            },
            "active": true,
            "moduleId": "ZWave",
            "title": "Z-Wave binding",
            "description": "Loads Z-Wave engine\n(Added by backend updater script)",
            "id": maxInstanceId + 1
          });
        }
      }
    }
      
    // Add permanently_hidden property
    Object.keys(config.vdevInfo).forEach(function(id) {
      if (!config.vdevInfo[id].hasOwnProperty('permanently_hidden')) {
        console.log("Adding to VDev " + id + " new property permanently_hidden");
        config.vdevInfo[id].permanently_hidden = false;
      }
    });

    // Change IDs to new notation

    {      
      function getNewID(id) {
        var pattern1 = /^ZWayVDev_([0-9]+(:[0-9]+)+)$/,
          pattern2 = /^Remote_[0-9]+_([0-9]+(:[0-9]+)+)$/;
        
        if (id.match(pattern1)) {
          return id.replace(pattern1, "ZWayVDev_zway_$1").replace(/:/g, "-");
        } else if (id.match(pattern2)) {
          return id.replace(pattern2, "ZWayVDev_zway_Remote_$1").replace(/:/g, "-");
        } else {
          return id;
        }
      }

      // Update IDs of devices created by SwitchControlGenerator and ZWaveGate
      Object.keys(config.vdevInfo).forEach(function(id) {
        var _id = getNewID(id);
        if (id !== _id) {
          console.log("Changing VDev ID from " + id + " to " + _id);
          config.vdevInfo[_id] = config.vdevInfo[id];
          delete config.vdevInfo[id];
        }
      });
      
      // Update IDs in profiles    
      config.profiles && config.profiles.forEach(function(profile) {
        profile.positions && profile.positions.forEach(function(id, index) {
          var _id = getNewID(id);
          if (id !== _id) {
            console.log("Changing widget ID from " + id + " to " + _id);
            profile.positions[index] = _id;
          }
        });
      });

      // Update IDs in modules params
      function fixArray(arr) {
        arr.forEach(function(element, index) {
          if (typeof element === "string") {
            if (element != getNewID(element)) {
              console.log("Changing ID in params (array) from " + element + " to " + getNewID(element));
              arr[index] = getNewID(element);
            }
          } else if (element.constructor === Array) {
            fixArray(element);
          } else if (typeof element === "object") {
            fixObject(element);
          }
        });
      }
      
      function fixObject(obj) {
        for (var key in obj) {
          if (typeof obj[key] === "string") {
            if (obj[key] != getNewID(obj[key])) {
              console.log("Changing ID in params (object) from " + obj[key] + " to " + getNewID(obj[key]));
              obj[key] = getNewID(obj[key]);
            }
          } else if (obj[key].constructor && obj[key].constructor === Array) {
            fixArray(obj[key]);
          } else if (typeof obj[key] === "object") {
            fixObject(obj[key]);
          }
        }
      }
      
      for (var indx in config.instances) {
        fixObject(config.instances[indx].params);
      }
    }
    
    saveObject("config.json", config);
  }
})();
