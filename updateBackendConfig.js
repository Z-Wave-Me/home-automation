// This script transforms old formats to new

(function () {
  var config = loadObject("config.json");
      oldConfigJSON = JSON.stringify(config);

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
      });
    } else {
      // default profile
      config.profiles = [{
        id: 1,
        role: 1,
        login: 'admin',
        password: 'admin',
        name: 'Administrator',
        lang:'en',
        color:'#dddddd',
        dashboard: [],
        interval: 2000,
        rooms:[0],
        hide_all_device_events: false,
        hide_system_events: false,
        hide_single_device_events: []
      },
      {
        id: 2,
        role: 3,
        login: 'local',
        password: 'local',
        name: 'Local User',
        lang:'en',
        color:'#dddddd',
        dashboard: [0],
        interval: 2000,
        rooms:[0],
        hide_all_device_events: false,
        hide_system_events: false,
        hide_single_device_events: []
      }];
    }
    // add global location
    if (config.hasOwnProperty('locations') && Array.isArray(config.locations) && config.locations.filter(function (location){ return location.id === 0 && location.title === 'globalRoom';}).length === 0) {
      config.locations.push({
          id : 0,
          title: "globalRoom",
          user_img: "",
          default_img: "",
          img_type: ""
        });      
    } else {
      config.locations = [{
        id : 0,
        title: "globalRoom",
        user_img: "",
        default_img: "",
        img_type: ""
      }];
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

          if(instance.moduleId && (!instance.state || !instance.title)){
            var moduleMeta,
                moduleLang;
            try{
              try{
                moduleMeta = fs.loadJSON('modules/' + instance.moduleId + '/module.json');
                moduleLang = fs.loadJSON('modules/' + instance.moduleId + '/lang/en.json');
              } catch (e){
                  try{
                    moduleMeta = fs.loadJSON('userModules/' + instance.moduleId + '/module.json');
                    moduleLang = fs.loadJSON('userModules/' + instance.moduleId + '/lang/en.json');
                  } catch (e){
                    moduleLang = null;
                  }
              }

              if (moduleLang !== null) {
                  metaStringify = JSON.stringify(moduleMeta);
                  Object.keys(moduleLang).forEach(function (key) {
                      var regExp = new RegExp('__' + key + '__', 'g');
                      if (moduleLang[key]) {
                          metaStringify = metaStringify.replace(regExp, moduleLang[key]);
                      }
                  });
                  moduleMeta = JSON.parse(metaStringify);
              }

              instance.state = moduleMeta.state? moduleMeta.state : null;
              instance.title = !instance.title? moduleMeta.defaults.title : instance.title;
              instance.module = !instance.module? moduleMeta.defaults.title : instance.module;

            }catch (e){
              console.log('Could not set state of instance ' + instance.id + '. ERROR: ' + e);
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
              "enableAPI": true,
              "publicAPI": true,
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

        // Add modules by default: ZWave, RemoteAccess, InbandNotifier, Cron
        if(config.instances.filter(function(instance){ return instance.moduleId === 'ZWave'; }).length === 0) {
          config.instances.push({
            "id": maxInstanceId + 1,
            "moduleId": "ZWave",
            "params": {
              "name": "zway",
              "port": "/dev/ttyACM0",
              "enableAPI": true,
              "publicAPI": true,
              "createVDev": true,
              "config": "config",
              "translations": "translations",
              "ZDDX": "ZDDX"
            },
            "active": true,
            "module": "Z-Wave Network Access",
            "state":"hidden",
            "title": "Z-Wave Network Access",
            "description": "Allows accessing Z-Wave devices from attached Z-Wave transceiver.\n(Added by default)",
          });
        }

        if(config.instances.filter(function(instance){ return instance.moduleId === 'Cron'; }).length === 0) {
          config.instances.push({
            "id": maxInstanceId + 1,
            "moduleId": "Cron",
            "params": {},
            "active": true,
            "module": "System Clock (CRON)",
            "title": "System Clock (CRON)",
            "state" : "hidden",
            "description": "Scheduler used by other modules\n(Added by default)"
          });
        }

        if(config.instances.filter(function(instance){ return instance.moduleId === 'InbandNotifications'; }).length === 0) {
          config.instances.push({
            "id": maxInstanceId + 1,
            "moduleId": "InbandNotifications",
            "params": {},
            "active": true,
            "module": "Inband Notifier",
            "state" : "hidden",
            "title": "Inband Notifier",
            "description": "Creates and records the presentation of events in the event list (Eventlog).\n(Added by default)"
          });
        }

        if(config.instances.filter(function(instance){ return instance.moduleId === 'RemoteAccess'; }).length === 0) {
          
          config.instances.push({
            "id" : maxInstanceId + 1,
            "moduleId" : "RemoteAccess",
            "active" : true,
            "title" : "Remote Access",
            "description" : "Is necessary to configure remote access in SmartHome UI.",
            "params" : {
              "userId" : "",
              "actStatus" : "",
              "sshStatus" : "",
              "zbwStatus" : "",
              "pass" : "",
              "lastChange" : {}
            },
            "state" : "hidden",
            "module" : "Remote Access"
          });
        }

        /*
        if(config.instances.filter(function(instance){ return instance.moduleId === 'InbandNotifications'; }).length === 0) {
          config.instances.push({
            "id": 4,
            "moduleId": "InfoWidget",
            "params": {
                "headline":"Welcome to your Smart Home!",
                "text":"These small widgets will guide you during your first steps on our new SmartHome UI. \nIf you click on it you will get useful informations about navigation and functionality of SmartHome UI.",
                "imgURI":""
            },
            "active": true,
            "module": "Information Widget",
            "title": "Information Widget",
            "description": "This Module creates an information widget.\n(Added by default)"
          });
        }
        */
      }
    } else {

      // default instances
      config.instances = [{
              "id": 1,
              "moduleId": "ZWave",
              "params": {
                "name": "zway",
                "port": "/dev/ttyACM0",
                "enableAPI": true,
                "publicAPI": true,
                "createVDev": true,
                "config": "config",
                "translations": "translations",
                "ZDDX": "ZDDX"
              },
              "active": true,
              "module": "Z-Wave Network Access",
              "state":"hidden",
              "title": "Z-Wave Network Access",
              "description": "Allows accessing Z-Wave devices from attached Z-Wave transceiver.\n(Added by default)",
          },{
            "id": 2,
            "moduleId": "Cron",
            "params": {},
            "active": true,
            "module": "System Clock (CRON)",
            "title": "System Clock (CRON)",
            "state" : "hidden",
            "description": "Scheduler used by other modules\n(Added by default)"
          },{
            "id": 3,
            "moduleId": "InbandNotifications",
            "params": {},
            "active": true,
            "module": "Inband Notifier",
            "state" : "hidden",
            "title": "Inband Notifier",
            "description": "Creates and records the presentation of events in the event list (Eventlog).\n(Added by default)"
          },{
            "id" : 4,
            "moduleId" : "RemoteAccess",
            "active" : true,
            "title" : "Remote Access",
            "description" : "Is necessary to configure remote access in SmartHome UI.",
            "params" : {
              "userId" : "",
              "actStatus" : "",
              "sshStatus" : "",
              "zbwStatus" : "",
              "pass" : "",
              "lastChange" : {}
            },
            "state" : "hidden",
            "module" : "Remote Access"
          }/*,
          {
            "id": 4,
            "moduleId": "InfoWidget",
            "params": {
                "headline":"Welcome to your Smart Home!",
                "text":"These small widgets will guide you during your first steps on our new SmartHome UI. \nIf you click on it you will get useful informations about navigation and functionality of SmartHome UI.",
                "imgURI":""
            },
            "active": true,
            "module": "Information Widget",
            "title": "Information Widget",
            "description": "This Module creates an information widget.\n(Added by default)"
          }*/
      ];
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
            profile.hide_all_device_events = false;
            profile.hide_system_events = false;
            profile.hide_single_device_events = [];

            delete profile.description;
            delete profile.widgets;
            delete profile.positions;
        }

        if(profile.password && /^[a-f0-9]{32}$/.test(profile.password)){
            profile.password = 'admin';
        }
        if(!profile.rooms){
            profile.rooms = [0];
        }
        if(profile.rooms && Array.isArray(config.rooms)){
          if(profile.rooms.indexOf(0) === -1 || profile.rooms.length === 0){
            var globalRoom = [0];
            profile.rooms.concat(globalRoom);
          }
        }
      });

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
})();
