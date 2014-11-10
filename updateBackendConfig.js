// This script transforms old formats to new

(function () {
  var config = loadObject("config.json");

  function getNewID(id) {
    var pattern1 = /^ZWayVDev_([0-9]+(:[0-9])+)$/,
      pattern2 = /^Remote_[0-9]+_([0-9]+(:[0-9])+)$/;
    
    if (id.match(pattern1)) {
      return id.replace(pattern1, "ZWayVDev_zway_$1").replace(/:/g, "-");
    } else if (id.match(pattern2)) {
      return id.replace(pattern2, "ZWayVDev_zway_Remote_$1").replace(/:/g, "-");
    } else {
      return id;
    }
  }

  if (config) {
    // Update IDs of devices created by SwitchControlGenerator and ZWaveGate
    Object.keys(config.vdevInfo).forEach(function(id) {
      var _id = getNewID(id);
      if (id !== _id) {
        console.log("Changing VDev ID from " + id + " to " + _id);
        config.vdevInfo[_id] = config.vdevInfo[id];
        delete config.vdevInfo[id];
      }
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
        } else if (obj[key].constructor === Array) {
          fixArray(obj[key]);
        } else if (typeof obj[key] === "object") {
          fixObject(obj[key]);
        }
      }
    }
    
    for (var indx in config.instances) {
      fixObject(config.instances[indx].params);
    }

    // profiles
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

    // instances
    if (config.hasOwnProperty('instances')) {
      if (config.instances.length > 0) {
        config.instances.forEach(function (instance) {
          // move title and description params
          instance.title = instance.params.title;
          instance.description = instance.params.description;
          delete instance.params.title;
          delete instance.params.description;

          // move status
          if (instance.params.hasOwnProperty('status')) {
            instance.active = instance.params.status === 'enable';
            delete instance.params.status;
          } else if (!instance.hasOwnProperty('active')) {
            instance.active = true;
          }

          // delete userView
          if (instance.hasOwnProperty('userView')) {
            delete instance.userView;
          }
        });
      }
    }

    config.modules_categories = [
      {
        "id": "automation",
        "name": "Automation",
        "description": "Create home automation rules",
        "icon": ""
      },
      {
        "id": "security",
        "name": "Security",
        "description": "Enhance security",
        "icon": ""
      },
      {
        "id": "peripherals",
        "name": "Peripherals",
        "description": "Z-Wave and other peripherals",
        "icon": ""
      },
      {
        "id": "surveillance",
        "name": "Video surevillance",
        "description": "Support for cameras",
        "icon": ""
      },
      {
        "id": "logging",
        "name": "Data logging",
        "description": "Logging to third party services",
        "icon": ""
      },
      {
        "id": "scripting",
        "name": "Scripting",
        "description": "Create custom scripts",
        "icon": ""
      },
      {
        "id": "devices",
        "name": "Devices",
        "description": "Create devices",
        "icon": ""
      },
      {
        "id": "scheduling",
        "name": "Schedulers",
        "description": "Time related functions",
        "icon": ""
      },
      {
        "id": "climate",
        "name": "Climate",
        "description": "Climate control",
        "icon": ""
      },
      {
        "id": "environment",
        "name": "Environment",
        "description": "Environment related date",
        "icon": ""
      },
      {
        "id": "scenes",
        "name": "Scenes",
        "description": "Light scenes",
        "icon": ""
      },
      {
        "id": "notifications",
        "name": "Notifications",
        "description": "SMS, E-mail and push notifications",
        "icon": ""
      },
      {
        "id": "tagging",
        "name": "Tagging",
        "description": "Tagging widgets",
        "icon": ""
      }
    ];
    
    saveObject("config.json", config);
  }
})();
