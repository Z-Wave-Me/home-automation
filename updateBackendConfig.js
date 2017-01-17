// This script transforms old formats to new

(function () {
  var config,
      oldConfigJSON = JSON.stringify(config),
      skins = loadObject("userSkins.json"),
      notifications = loadObject("notifications");

  try {
    config = loadObject("config.json");
  } catch (e) {
    console.log("Error loading config.json! Using default config.");
    config = fs.loadJSON("defaultConfigs/config.json");
    saveObject("config.json", config);
  }
  
  if (config) {
    // Change profiles data
    if (config.hasOwnProperty('profiles') && Array.isArray(config.profiles) && config.profiles.length > 0) {
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

        if (!profile.email) {
          profile.email = '';
        }

        // add default skin entry
        if (profile.skin) {
          delete profile.skin;
        }
      });
    } else {
      // default profile
      config.profiles = [{
        id: 1,
        role: 1,
        login: 'admin',
        password: 'admin',
        email:'',
        name: 'Administrator',
        lang:'en',
        color:'#dddddd',
        dashboard: [],
        interval: 2000,
        rooms:[0],
        expert_view: false,
        hide_all_device_events: false,
        hide_system_events: false,
        hide_single_device_events: []
      },
      {
        id: 2,
        role: 3,
        login: 'local',
        password: 'local',
        email:'',
        name: 'Local User',
        lang:'en',
        color:'#dddddd',
        dashboard: [],
        interval: 2000,
        rooms:[],
        expert_view: false,
        hide_all_device_events: false,
        hide_system_events: false,
        hide_single_device_events: []
      }];
    }
    
    // add global location if not present
    if (config.hasOwnProperty('locations') && Array.isArray(config.locations) && config.locations.filter(function (location) { return location.id === 0;}).length === 0) {
      config.locations.push({
          id : 0,
          title: "globalRoom",
          user_img: "",
          default_img: "",
          img_type: ""
        });      
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

          // delete state
          if (instance.hasOwnProperty('state')) {
            delete instance.state;
          }

          // delete module
          if (instance.hasOwnProperty('module')) {
            delete instance.module;
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
              "enableAPI": true,
              "publicAPI": false,
              "createVDev": true,
              "config": "config",
              "translations": "translations",
              "ZDDX": "ZDDX",
            },
            "active": true,
            "moduleId": "ZWave",
            "module":"Z-Wave Network Access",
            "state":"hidden",
            "title": "Z-Wave Network Access",
            "description": "Allows accessing Z-Wave devices from attached Z-Wave transceiver.\n(Added by backend updater script)",
            "id": maxInstanceId + 1
          });
        }
      }
    }

    // Remove modules_categories from config
    if (config.hasOwnProperty('modules_categories')) {
      delete config.modules_categories;
    }
      
    // Add permanently_hidden, h, visibility, hasHistory properties
    Object.keys(config.vdevInfo).forEach(function(id) {
      if (!config.vdevInfo[id].hasOwnProperty('permanently_hidden')) {
        console.log("Adding to VDev " + id + " new property permanently_hidden");
        config.vdevInfo[id].permanently_hidden = false;
      }
      if (!config.vdevInfo[id].hasOwnProperty('h')) {
        var hashCode = function(str) {
            var hash = 0, i, chr, len;
            if (this.length === 0) {
                return hash;
            }
            for (i = 0, len = str.length; i < len; i++) {
                chr   = str.charCodeAt(i);
                hash  = ((hash << 5) - hash) + chr;
                hash  = hash & hash; // Convert to 32bit integer
            }
            return hash;
        };
        config.vdevInfo[id].h = hashCode(id);
      }
      if (!config.vdevInfo[id].hasOwnProperty('hasHistory')) {
        config.vdevInfo[id].hasHistory = false;
      }
      if (!config.vdevInfo[id].hasOwnProperty('visibility')) {
        config.vdevInfo[id].visibility = true;
      }
      if (config.vdevInfo[id].location == null) {
        config.vdevInfo[id].location = 0;
      }
    });

    // Change IDs to new notation

    {      
      function getNewID(id) {
        var pattern1 = /^ZWayVDev_([0-9]+(:[0-9]+)+)$/,
          pattern2 = /^Remote_[0-9]+_([0-9]+(:[0-9]+)+)$/,
          pattern3 = /^ZWayVDev_(.*)_Remote_[0-9]+-[0-9]+-[0-9]+$/,
          pattern4 = /^ZWayVDev_(.*)_Remote_[0-9]+-[0-9]+-[0-9]+-[0-9]+$/;
        
        if (id.match(pattern1)) {
          // replace : to - in Z-Way vDev
          return id.replace(pattern1, "ZWayVDev_zway_$1").replace(/:/g, "-");
        } else if (id.match(pattern2)) {
          // replace : to - in Z-Way Remote vDev and add ZWayVDev_zway_ prefix (removing module id from name)
          return id.replace(pattern2, "ZWayVDev_zway_Remote_$1").replace(/:/g, "-");
        } else if (id.match(pattern3)) {
          // add -B suffixes to ZWayVDev_zway_Remote (switchControl buttons)
          return id.replace(pattern3, "$&-B");
        } else if (id.match(pattern4)) {
          // add -S suffixes to ZWayVDev_zway_Remote (toggleButton scenes)
          return id.replace(pattern4, "$&-S");
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
          } else if (typeof element === "object" && element && element.constructor && element.constructor === Array) {
            fixArray(element);
          } else if (typeof element === "object" && element) {
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
          } else if (typeof obj[key] === "object" && obj[key] && obj[key].constructor && obj[key].constructor === Array) {
            fixArray(obj[key]);
          } else if (typeof obj[key] === "object" && obj[key]) {
            fixObject(obj[key]);
          }
        }
      }
      
      for (var indx in config.instances) {
        fixObject(config.instances[indx].params);
      }
    }
    
    // Transform profile to user profile
    
    {
      var counter = 0;
      config.profiles && config.profiles.forEach(function(profile) {
        if (!profile.login) {
            profile.login = "admin" + (counter++ ? counter.toString(10) : "");
            profile.password = "admin";
            profile.role = 1;
            profile.lang = "en";
            profile.color = "#dddddd";
            profile.default_ui = 1;
            profile.dashboard = profile.positions;
            profile.interval = 2000;
            profile.rooms = [0];
            expert_view: false,
            profile.hide_all_device_events = false;
            profile.hide_system_events = false;
            profile.hide_single_device_events = [];

            delete profile.description;
            delete profile.widgets;
            delete profile.positions;
        }

        // delete profile.sid 
        if(profile.sid){
            delete profile.sid;
        }
        
        // change MD5 hashed passwords back to string
        // replace it with profile.login or 'admin' as fallback
        // affects versions below rc39
        if(profile.password && /^[a-f0-9]{32}$/.test(profile.password)){            
            profile.password = profile.login? profile.login : 'admin';
        }

        // add room 0 if no rooms exists
        if(!profile.rooms){
            profile.rooms = [0];
        }
        
        // transform room if it is no array
        if(profile.rooms && !Array.isArray(profile.rooms)){
            profile.rooms = !isNaN(profile.rooms) && profile.rooms % 1 === 0? [profile.rooms] : [];
        }

        // add room 0 if rooms exists but room 0 is missing
        if(profile.role === 1 && profile.rooms && Array.isArray(profile.rooms)){
          if(profile.rooms.indexOf(0) === -1){
            profile.rooms.push(0);
          }
        }

        // remove room 0 form non admin profiles
        if (profile.role !== 1 && profile.rooms.indexOf(0) > -1) {
            profile.rooms.splice(profile.rooms.indexOf(0),1);
        }

        // transform positions into dashboard
        if(Array.isArray(profile.positions)){
          var unique = function (array) {
              var a = array.concat();
              for(var i=0; i<a.length; ++i) {
                  for(var j=i+1; j<a.length; ++j) {
                      if(a[i] === a[j])
                          a.splice(j--, 1);
                  }
              }

              return a;
          };
          
          profile.dashboard = profile.dashboard? unique(profile.dashboard.concat(profile.positions)) : (!profile.dashboard ? profile.positions : []);

          delete profile.positions;
        }

        if(!profile.expert_view && (profile.role === 1 || profile.role === 3)){
          profile.expert_view = false;
        }

        // delete profile.passwordConfirm 
        if(profile.passwordConfirm){
            delete profile.passwordConfirm;
        }
      });
  
      // add local user if he not exists
      if (config.profiles && config.profiles.filter(function(profile){ return profile.login === 'local';}).length === 0) {
            config.profiles.push({
                id: config.profiles.length + 1,
                role: 3,
                login: 'local',
                password: 'local',
                name: 'Local User',
                lang:'en',
                color:'#dddddd',
                dashboard: [],
                interval: 2000,
                rooms:[0],
                expert_view: false,
                hide_all_device_events: false,
                hide_system_events: false,
                hide_single_device_events: []
            });
      }
    
      // Save changes
      
      if (oldConfigJSON !== JSON.stringify(config)) { // do we need to update the config?
        try {
          saveObject("config.json", config);
        } catch (e) {
          console.log("Error: can not write back config.json to storage: ", e);
        }
      }
    }
  }

  if (skins) {
    try {

      if (skins === null) {
        skins = [{
              name: "default",
              title: "Default",
              description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.",
              version: "1.0.3",
              icon: true,
              author: "Martin Vach",
              homepage: "http://www.zwave.eu",
              active: true
        }];
      } else {
        skins.forEach(function(skin) {
          if (skin.name === 'default' && !skin.hasOwnProperty('active')) {
            skin.active = true;
          } else if (!skin.hasOwnProperty('active')) {
            skin.active = false;
          }
        });
      }

      saveObject("userSkins.json", skins);
    } catch (e) {
      console.log("Error: can not write userSkins.json to storage: ", e);
    }
  }

  // change notification property h into uts and delete h
  if (notifications) {
        try {
            notifications.forEach(function(notification){
                if(notification.hasOwnProperty('id') && notification.id.toString().length === 10) {
                    notification.id = Math.floor(notification.id*1000);
                }

                if(notification.hasOwnProperty('h')) {
                    delete notification.h;
                }
            });

            saveObject('notifications', notifications);
        } catch (e) {
            console.log("Error: Cannot write notifications to storage: ", e.message);
        }

    }
})();
