/*** Main Automation webserver module *****************************************

Version:
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013

******************************************************************************/

// ----------------------------------------------------------------------------
// --- ZAutomationAPIWebRequest
// ----------------------------------------------------------------------------

executeFile("router.js");

function ZAutomationAPIWebRequest (controller) {
    ZAutomationAPIWebRequest.super_.call(this);

    this.router = new Router("/v1");
    this.controller = controller;
    this.res = {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: null
    };

    // bigger role value gives more power
    // space left for new roles
    // exact numbers are not important
    this.ROLE_ANONYMOUS = 100;
    this.ROLE_USER = 200;
    this.ROLE_ADMIN = 1000;
    
    // !!! replace with tokens
    this.sessions = [];

    this.registerRoutes();
};

var ZAutomationWebRequest = ZAutomationWebRequest || function() {};
inherits(ZAutomationAPIWebRequest, ZAutomationWebRequest);

_.extend(ZAutomationAPIWebRequest.prototype, {
    registerRoutes: function() {
        this.router.get("/status", this.ROLE_USER, this.statusReport);
        this.router.post("/login", this.ROLE_ANONYMOUS, this.verifyLogin);
        this.router.get("/notifications", this.ROLE_USER, this.exposeNotifications);
        this.router.get("/history", this.ROLE_USER, this.exposeHistory);
        this.router.get("/devices", this.ROLE_USER, this.listDevices);
        this.router.get("/restart", this.ROLE_ADMIN, this.restartController);
        this.router.get("/locations", this.ROLE_USER, this.listLocations);
        this.router.get("/profiles", this.ROLE_USER, this.listProfiles);
        this.router.get("/namespaces", this.ROLE_ADMIN, this.listNamespaces);
        this.router.post("/profiles", this.ROLE_ADMIN, this.createProfile);
        this.router.get("/locations/add", this.ROLE_ADMIN, this.addLocation);
        this.router.post("/locations", this.ROLE_ADMIN, this.addLocation);
        this.router.get("/locations/remove", this.ROLE_ADMIN, this.removeLocation);
        this.router.get("/locations/update", this.ROLE_ADMIN, this.updateLocation);
        this.router.get("/modules", this.ROLE_ADMIN, this.listModules);
        this.router.get("/modules/categories", this.ROLE_ADMIN, this.listModulesCategories);
        this.router.post("/modules/install", this.ROLE_ADMIN, this.installModule);
        this.router.get("/instances", this.ROLE_ADMIN, this.listInstances);
        this.router.post("/instances", this.ROLE_ADMIN, this.createInstance);

        this.router.post("/upload/image", this.ROLE_ADMIN, this.uploadImage);

        // patterned routes, right now we are going to just send in the wrapper
        // function. We will let the handler consumer handle the application of
        // the parameters.
        this.router.get("/devices/:v_dev_id/command/:command_id", this.ROLE_USER, this.performVDevCommandFunc);

        this.router.del("/locations/:location_id", this.ROLE_ADMIN, this.removeLocation, [parseInt]);
        this.router.put("/locations/:location_id", this.ROLE_ADMIN, this.updateLocation, [parseInt]);
        this.router.get("/locations/:location_id", this.ROLE_ADMIN, this.listLocations, [parseInt]);

        //this.router.put("/notifications/:notification_id", this.ROLE_USER, this.updateNotification, [parseInt]);
        //this.router.get("/notifications/:notification_id", this.ROLE_USER, this.getNotificationFunc, [parseInt]);
        this.router.del("/notifications/:notification_id", this.ROLE_USER, this.deleteNotifications, [parseInt]);

        this.router.del("/profiles/:profile_id", this.ROLE_ADMIN, this.removeProfile, [parseInt]);
        this.router.put("/profiles/:profile_id", this.ROLE_ADMIN, this.updateProfile, [parseInt]);
        this.router.get("/profiles/:profile_id", this.ROLE_USER, this.listProfiles, [parseInt]);

        this.router.put("/auth/update/:profile_id", this.ROLE_USER, this.updateProfileAuth, [parseInt]);

        this.router.put("/devices/:dev_id", this.ROLE_USER, this.setVDevFunc);
        this.router.get("/devices/:dev_id", this.ROLE_USER, this.getVDevFunc);

        this.router.get("/instances/:instance_id", this.ROLE_ADMIN, this.getInstanceFunc, [parseInt]);
        this.router.put("/instances/:instance_id", this.ROLE_ADMIN, this.reconfigureInstanceFunc, [parseInt]);
        this.router.del("/instances/:instance_id", this.ROLE_ADMIN, this.deleteInstanceFunc, [parseInt]);

        this.router.get("/modules/:module_id", this.ROLE_ADMIN, this.getModuleFunc);

        this.router.get("/modules/categories/:category_id", this.ROLE_ADMIN, this.getModuleCategoryFunc);

        this.router.get("/namespaces/:namespace_id", this.ROLE_ADMIN, this.getNamespaceFunc, [parseInt]);

        this.router.get("/history/:dev_id", this.ROLE_USER, this.getDevHist);

        this.router.get("/load/modulemedia/:module_name/:file_name", this.ROLE_ADMIN, this.loadModuleMedia);
        
        this.router.get("/load/image/:img_name", this.ROLE_ADMIN, this.loadImage);
    },

    // !!! Do we need it?
    statusReport: function () {
        var currentDateTime = new Date();

        if (Boolean(this.error)) {
            var reply = {
                error: "Internal server error. Please fill in bug report with request_id='" + this.error + "'",
                data: null,
                code: 503,
                message: "Service Unavailable"
            };
        } else {
            var reply = {
                error: null,
                data: 'OK',
                code: 200
            };
        }

        return reply;
    },
    verifyLogin: function() {
        var reply = {
                    error: null,
                    data: null,
                    code: 500
                };
        
        var reqObj;

        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
            return reply;
            return;
        }

        profile = _.find(this.controller.profiles, function (profile) {
            return profile.login === reqObj.login;
        });

        if (!!profile && reqObj.password === profile.password) {
            var sid = crypto.guid();
            this.sessions[sid] = profile;

            reply.code = 200;
            // !!! remove private data
            reply.data = {
                id: profile.id,
                sid: sid,
                role: profile.role,
                name: profile.name,
                last_login: profile.last_login,
                lang: profile.lang,
                color: profile.color,
                default_ui: profile.default_ui,
                dashboard: profile.dashboard,
                interval: profile.interval,
                rooms: profile.rooms,
                expert_view: profile.expert_view,
                hide_all_device_events: profile.hide_all_device_events,
                hide_system_events: profile.hide_system_events,
                hide_single_device_events: profile.hide_single_device_events
            };

            // !!! what to do with??? this.controller.defaultLang = profile.lang;
        } else {
            reply.code = 401;
            reply.error = "User login/password is wrong.";
        }
        
        return reply;
    },
    // Devices
    listDevices: function () {
        var nowTS = Math.floor(new Date().getTime() / 1000),
            reply = {
                error: null,
                data: {
                    structureChanged: false,
                    updateTime: nowTS,
                    devices: []
                }
            },
            since = this.req.query.hasOwnProperty("since") ? parseInt(this.req.query.since, 10) : 0,
            devices;

        reply.data.structureChanged = this.controller.lastStructureChangeTime >= since ? true : false;
        
        /*
        if (role !== 1 && profile) {
            if(profile.rooms && !!profile.rooms){
                devices = this.controller.devices.toJSON().filter(function(dev){
                    return profile.rooms.indexOf(parseInt(dev.location)) !== -1;
                });
            }
        } else
        */
        devices = this.controller.devicesByUser(this.req.user).toJSON();

        if(devices) {
            if (reply.data.structureChanged) {
                reply.data.devices = devices;
            } else {
                reply.data.devices = this.controller.devices.toJSON({since: reply.data.structureChanged ? 0 : since}); // !!! ???
            }

            if (Boolean(this.req.query.pagination)) {
                if(role !== 1){ /// !!! ???
                    reply.data.total_count = devices.length;
                }else{
                    reply.data.total_count = this.controller.devices.models.length;
                }                
            }
        } else {
            reply.code = 404;
            reply.error = 'No devices found.';
        }

        return reply;
    },
    getVDevFunc: function (vDevId) {
        var reply = {
                error: null,
                data: null
            };

        if (this.controller.devicesByUser(user).has(vDevId)) {
            reply.code = 200;
            reply.data = this.controller.devicesByUser(user).get(vDevId).toJSON();
        } else {
            reply.code = 404;
            reply.error = "Device " + vDevId + " doesn't exist";
        }
        return reply;
    },
    setVDevFunc: function (vDevId) {
        var reqObj,
            reply = {
                error: null,
                data: null
            },
            vDev = this.controller.devicesByUser(this.req.user).get(vDevId);

        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
        }

        if (vDevId) {
            reply.code = 200;
            reply.data = vDevId.set(reqObj);
        } else {
            reply.code = 404;
            reply.error = "Device " + vDevId + " doesn't exist";
        }
        return reply;
    },
    performVDevCommandFunc: function (vDevId, commandId) {
        var reply = {
                error: null,
                data: null,
                code: 200
            },
            result_execution_command,
            vDev = this.controller.devicesByUser(this.req.user).get(vDevId);

        if (vDev) {
            result_execution_command = vDev.performCommand.call(vDev.get(vDevId), commandId, this.req.query);
            reply.data = !!result_execution_command ? result_execution_command : null;
        } else {
            reply.data = null;
            reply.code = 404;
            reply.error = "Device " + vDevId + " doesn't exist";
        }
        return reply;
    },
    // Notifications
    exposeNotifications: function () {
        var notifications,
            reply = {
                error: null,
                data: null
            },
            since,
            redeemed,
            to;

        this.res.status = 200;
        since = this.req.query.hasOwnProperty("since") ? parseInt(this.req.query.since, 10) : 0;
        to = this.req.query.hasOwnProperty("to") ? parseInt(this.req.query.to, 10) : 0;
        redeemed = this.req.query.hasOwnProperty("redeemed") && (String(this.req.query.redeemed)) === 'true' ? true : false;

        profile = this.getProfileBySID(); // !!!
        
        if(profile !== null) {
            notifications = this.controller.listNotifications(since, to, profile, redeemed);

            reply.data = {
                updateTime: Math.floor(new Date().getTime() / 1000),
                notifications: notifications
            };

            if (Boolean(this.req.query.pagination)) {
                reply.data.total_count = this.controller.getCountNotifications();
            }

            reply.code = 200;
            reply.error = null;
        } else {
            reply.data = {
                updateTime: Math.floor(new Date().getTime() / 1000),
                notifications: []
            };
            reply.code = 404;
            reply.error = "Profile doesn't exist.";
        }

        return reply;
    },
    /*
    getNotificationFunc: function (notificationId) {
        return function () {
            var id = notificationId ? parseInt(notificationId) : 0,
                reply = {
                    data: null,
                    error: null,
                    code: 200
                },
                notification;

            if (id) {
                notification = this.controller.getNotification(id);
                if (notification) {
                    reply.code = 200;
                    reply.data = notification;
                } else {
                    reply.code = 404;
                    reply.error = "Notification " + notificationId + " doesn't exist";
                }
            } else {
                reply.code = 400;
                reply.error = "Argument id is required";
            }

            return reply;
        }
    },
    updateNotification: function (notificationId) {

        return function () {
            var reply = {
                    error: null,
                    data: "OK"
                },
                reqObj,
                notification = this.controller.getNotification(notificationId);

            if (Boolean(notification)) {

                try {
                    reqObj = JSON.parse(this.req.body);
                } catch (ex) {
                    reply.error = ex.message;
                }

                this.controller.updateNotification(notificationId, reqObj, function (notice) {
                    if (notice) {
                        reply.code = 200;
                        reply.data = notice;
                    } else {
                        reply.code = 500;
                        reply.data = null;
                        reply.error = "Object doesn't exist redeemed argument";
                    }
                });

            } else {
                reply.code = 404;
                reply.error = "Notification " + notificationId + " doesn't exist";
            }
            return reply;
        };
    },
    */
    deleteNotifications: function (notificationId) {
        // !!! Needed?
        var id = notificationId ? parseInt(notificationId) : 0,
            reply = {
                data: null,
                error: null,
                code: 200
            },
            before;

        before = this.req.query.hasOwnProperty("allPrevious") ? Boolean(this.req.query.allPrevious) : false;
        uid = this.req.query.hasOwnProperty("uid") ? parseInt(this.req.query.uid) : 0;
        
        if (id > 0 && before === false && !_.any(this.controller.notifications, function (notification) { return (notification.id === id && notification.h === uid);})) {
            reply.code = 404;
            reply.error = "Notification '" + id + "' with uid '" + uid + "' not found";
        } else if (id > 0 && before !== false && !_.any(this.controller.notifications, function (notification) { return (notification.id === id);})) {
            reply.code = 404;
            reply.error = "Notification " + id + " not found";
        } else if (before === true && !_.any(this.controller.notifications, function (notification) { return notification.id < id; })) {
            reply.code = 404;
            reply.error = "No notifications found older than unix timestamp: " + id;
        } else {
            this.controller.deleteNotifications(id, before, uid, function (notice) {
                if (notice) {
                    reply.code = 204;
                    reply.data = null;
                } else {
                    reply.code = 404;
                    reply.data = null;
                    reply.error = "Notifications not found.";
                }
            }, true);
        }
        return reply;
    },
    //locations
    listLocations: function (locationId) {
        var reply = {
                data: null,
                error: null
            },
            profile,
            role;

        profile = this.getProfileBySID();
        role = this.getUserRole();

        if (locationId === undefined){
            if(role === 1){
                reply.code = 200;
                reply.error = null;
                reply.data = this.controller.locations;
            } else if (role === 2){
                reply.code = 200;
                reply.error = null;
                reply.data = this.controller.locations.filter(function (location) {
                    return profile.rooms.indexOf(location.id) !== -1;
                });
            } else {
                reply.code = 404;
                reply.error = "Could not load locations.";
            }
        } else {
            var locations;

            if(role === 1){
                locations = this.controller.locations.filter(function (location) {
                    return location.id === locationId;
                });
            } else {
                locations = this.controller.locations.filter(function (location) {
                    return location.id === locationId && profile.rooms.indexOf(locationId) !== -1;
                });
            }

            if (locations.length > 0) {
                reply.data = locations[0];
                reply.code = 200;
            } else {
                reply.code = 404;
                reply.error = "Location " + locationId + " doesn't exist";
            }
        }

        return reply;
    },
    addLocation: function () {
        var title,
            reply = {
                error: null,
                data: null
            },
            reqObj,
            locProps = {},
            role;

        if (this.req.method === 'GET') {
            
            reqObj = this.req.query;
        
        } else if (this.req.method === 'POST') { // POST
            try {
                reqObj = JSON.parse(this.req.body);
            } catch (ex) {
                reply.code = 500;
                reply.error = "Cannot parse POST request. ERROR:" + ex.message;
            }
        }

        for (var property in reqObj) {
            if ( property !== 'id') {
                locProps[property] = reqObj[property] ? reqObj[property] : null;
            }
        }

        if (!!locProps.title) {
            this.controller.addLocation(locProps, function (data) {
                if (data) {
                    reply.code = 201;
                    reply.data = data;
                } else {
                    reply.code = 500;
                    reply.error = "Location doesn't created: Parsing the arguments has failed.";
                }
            });
        } else {
            reply.code = 500;
            reply.error = "Argument 'title' is required.";
        }

        return reply;
    },
    removeLocation: function (locationId) {
        if (this.req.method === 'GET') {
            id = parseInt(this.req.query.id);
        } else if (this.req.method === 'DELETE' && locationId === undefined) {
            try {
                reqObj = JSON.parse(this.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }
            id = reqObj.id;
        } else if (this.req.method === 'DELETE' && locationId !== undefined) {
            id = locationId;
        }

        if (!!id) {
            this.controller.removeLocation(id, function (result) {
                if (result) {
                    reply.code = 204;
                    reply.data = null;
                } else {
                    reply.code = 404;
                    reply.error = "Location " + id + " doesn't exist";
                }
            });
        } else {
            reply.code = 400;
            reply.error = "Argument id is required";
        }

        return reply;
    },
    updateLocation: function (locationId) {
        var id,
            title,
            user_img,
            default_img,
            img_type,
            reply = {
                error: null,
                data: null,
                code: 200
            },
            reqObj,
            role = this.getUserRole();

        if (this.req.method === 'GET') {
            id = parseInt(this.req.query.id);
            title = this.req.query.title;
        } else if (this.req.method === 'PUT') {
            try {
                reqObj = JSON.parse(this.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }
            id = locationId || reqObj.id;
            title = reqObj.title;
            user_img =reqObj.user_img || '';
            default_img = reqObj.default_img || '';
            img_type = reqObj.img_type || '';
        }

        if (!!title && title.length > 0) {
            this.controller.updateLocation(id, title, user_img, default_img, img_type, function (data) {
                if (data) {
                    reply.data = data;
                } else {
                    reply.code = 404;
                    reply.error = "Location " + id + " doesn't exist";
                }
            });
        } else {
            reply.code = 400;
            reply.error = "Arguments id & title are required";
        }

        return reply;
    },
    // modules
    listModules: function () {
        var reply = {
                error: null,
                data: [],
                code: 200
            },
            module = null;

        Object.keys(this.controller.modules).sort().forEach(function (className) {
            module = this.controller.getModuleData(className);
            module.className = className;
            if (module.singleton && _.any(this.controller.instances, function (instance) { return instance.moduleId === module.id; })) {
                module.created = true;
            } else {
                module.created = false;
            }
            reply.data.push(module);
        });

        return reply;
    },
    getModuleFunc: function (moduleId) {
        if (!this.controller.modules.hasOwnProperty(moduleId)) {
            reply.code = 404;
            reply.error = 'Instance ' + moduleId + ' not found';
        } else {
            reply.code = 200;
            reply.data = this.controller.getModuleData(moduleId);
        }
        
        return reply;
    },
    // modules categories
    listModulesCategories: function () {
        var reply = {
                error: null,
                data: null,
                code: 200
            };

        reply.data = this.controller.getListModulesCategories();

        return reply;
    },
    getModuleCategoryFunc: function (categoryId) {
        var reply = {
                error: null,
                data: null,
                code: 500
            };

        category = this.controller.getListModulesCategories(categoryId);

        if (!Boolean(category)) {
            reply.code = 404;
            reply.error = "Categories " + categoryId + " not found";
        } else {
            reply.code = 200;
            reply.data = category;
        }

        return reply;
    },
    // install module
    installModule: function () {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            moduleUrl = this.req.body.moduleUrl;
            
        var result = "in progress";

        installer.install(
            moduleUrl,
            function() {
                    result = "done";
            },  function() {
                    result = "failed";
            }
        );
        
        var d = (new Date()).valueOf() + 20000; // wait not more than 20 seconds
        
        while ((new Date()).valueOf() < d &&  result === "in progress") {
                processPendingCallbacks();
        }
        
        if (result === "in progress") {
                result = "failed";
        }

        if (result === "done") {
            reply.code = 201;
            reply.data = "Done";
        } else {
            reply.code = 500;
            reply.error = "Failed to install module " + moduleUrl;
        }

        return reply;
    },

    // instances
    listInstances: function () {
        var reply = {
                    error: null,
                    data: null,
                    code: 200
                };
        reply.data = this.controller.instances;

        return reply;
    },
    createInstance: function () {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            reqObj = this.req.reqObj,
            instance;

        if (this.controller.modules.hasOwnProperty(reqObj.moduleId)) {
            instance = this.controller.createInstance(reqObj);
            if (instance) {
                reply.code = 201;
                reply.data = instance;
            } else {
                reply.code = 500;
                reply.error = "Cannot instantiate module " + reqObj.moduleId;
            }
        } else {
            reply.code = 404;
            reply.error = "Module " + reqObj.moduleId + " doesn't exist";
        }

        return reply;
    },
    getInstanceFunc: function (instanceId) {
        var reply = {
                error: null,
                data: null,
                code: 500
            };

        instance = _.find(this.controller.instances, function (i) { return instanceId === i.id; });

        if (!Boolean(instance)) {
            reply.code = 404;
            reply.error = "Instance " + instanceId + " is not found";
        } else {
            reply.code = 200;
            reply.data = instance;
        }

        return reply;
    },
    reconfigureInstanceFunc: function (instanceId) {
        var reply = {
                error: null,
                data: null
            },
            reqObj = this.req.reqObj,
            instance;

        if (!_.any(this.controller.instances, function (instance) { return instanceId === instance.id; })) {
            reply.code = 404;
            reply.error = "Instance " + instanceId + " doesn't exist";
        } else {
            instance = this.controller.reconfigureInstance(instanceId, reqObj);
            if (instance) {
                reply.code = 200;
                reply.data = instance;
            } else {
                reply.code = 500;
                reply.error = "Cannot reconfigure module " + instanceId + " config";
            }
        }

        return reply;
    },
    deleteInstanceFunc: function (instanceId) {
        var reply = {
            error: null,
            data: null,
            code: 200
        };

        if (!_.any(this.controller.instances, function (instance) { return instance.id === instanceId; })) {
            reply.code = 404;
            reply.error = "Instance " + instanceId + " not found";
        } else {
            reply.code = 204;
            reply.data = null;
            this.controller.deleteInstance(instanceId);
        }
        
        return reply;
    },
    // profiles
    listProfiles: function (profileId) {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            profiles,
            profile,
            userId = this.controller.profileSID,
            role= this.getUserRole();

        if(userId !== '') {
            
            // list all profiles only if user has 'admin' permissions
            if (!_.isNumber(profileId) && role === 1) {
                profiles = this.controller.getListProfiles();
                if (!Array.isArray(profiles)) {
                    reply.code = 500;
                    reply.error = "Unknown error. profiles isn't array";
                } else {
                    reply.code = 200;
                    reply.data = profiles;
                }
            } else {
                // list target profile if user has 'admin' permissions
                // list only own profile if user has 'user' permissions otherwise response with error
                profile = this.controller.getProfile(profileId);

                if (role === 1 || (role === 2 && userId === profile.sid)){
                    
                    if (profile !== null) {
                        reply.code = 200;
                        reply.data = profile;
                    } else {
                        reply.code = 404;
                        reply.error = "Profile '" + profileId + "' doesn't exist";
                    }
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied. Cannot show foreign profile.";
                }
            }
        }
        return reply;
    },
    createProfile: function () {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            userId = this.controller.profileSID,
            role = this.getUserRole(),
            reqObj,
            profile;

        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
        }

        nameAllreadyExists = Boolean(_.find(this.controller.profiles, function (profile) {
                                        return profile.login === reqObj.login;
                                    }));

        if (reqObj.hasOwnProperty('name') && nameAllreadyExists === false) {
            profile = this.controller.createProfile(reqObj);
            if (profile !== undefined && profile.id !== undefined) {
                reply.data = profile;
                reply.code = 201;
            } else {
                reply.code = 500;
                reply.error = "Profile didn't created";
            }
        } else {
            reply.code = 400;
            reply.error = "Argument name is required or already exists.";
        }
        
        return reply;
    },
    updateProfile: function (profileId) {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            reqObj,
            profile,
            userId = this.controller.profileSID,
            role = this.getUserRole();

        profile = this.controller.getProfile(profileId);
        
        // update target profile if user has 'admin' permissions
        // update only own profile if user has 'user' permissions otherwise response with error
        if (role === 1 || (role === 2 && userId === profile.sid)){
            try {
                reqObj = JSON.parse(this.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }

            if (reqObj.hasOwnProperty('name')) {
                profile = this.controller.updateProfile(reqObj, profileId);
                if (profile !== undefined && profile.id !== undefined) {
                    reply.data = profile;
                    reply.code = 200;
                } else {
                    reply.code = 500;
                    reply.error = "Object (profile) didn't created";
                }
            } else {
                reply.code = 400;
                reply.error = "Argument id, positions is required";
            }
        } else {
            reply.code = 403;
            reply.error = "Permission denied. Cannot update foreign profile.";
        }

        return reply;
    },
    // different pipe for updating authentication values
    updateProfileAuth: function (profileId) {
        var reply = {
            error: null,
            data: null,
            code: 500
        },
        reqObj,
        profile,
        userProfileId = this.getProfileBySID().id;
        
        if(typeof this.req.body !== 'object'){
            reqObj = JSON.parse(this.req.body);
        } else{
            reqObj = this.req.body;
        }

        // make sure that every user can update authentications only on his own
        // - role independent - admin cannot change users authentications
        if (!!userProfileId && userProfileId === profileId) {
                
            profile = this.controller.updateProfileAuth(reqObj, userProfileId);
            
            if (profile !== undefined && profile.id !== undefined) {
                reply.data = profile;
                reply.code = 200;
            } else {
                reply.code = 500;
                reply.error = "Was not able to update password.";
            }
        } else {
            reply.code = 500;
            reply.error = "Could not change authentication values.";
        }

        return reply;
    },
    removeProfile: function (profileId) {
        var reply = {
            error: null,
            data: null,
            code: 500
            },
        profile,
        userId = this.controller.profileSID,
        role = this.getUserRole();

        profiles = this.controller.getListProfiles();

        // only admins are allowed to delete profiles
        // it is not possible to delete first profile (superadmin)
        if (_.isNumber(profileId) && role === 1 && profileId !== profiles[0].id) {
            
            profile = this.controller.getProfile(profileId);
            
            if (profile !== null) {
                this.controller.removeProfile(profileId);
                reply.data = null;
                reply.code = 204;
            } else {
                reply.code = 500;
                reply.error = "Could not delete profile: " + profileId;
            }
        } else {
            reply.code = 400;
            reply.error = "Argument 'id' is required. Please check if the id you want to remove is the correct one.";
        }

        return reply;
    },
    // namespaces
    listNamespaces: function () {
        var reply = {
            error: null,
            data: null,
            code: 500
        };

        this.controller.generateNamespaces(function (namespaces) {
            if (_.isArray(namespaces)) {
                reply.data = namespaces;
                reply.code = 200;
            } else {
                reply.error = "Namespaces array is null";
            }
        });      

        return reply;
    },
    getNamespaceFunc: function (namespaceId) {
       var reply = {
            error: null,
            data: null,
            code: 500
        },
        namespace;

        this.controller.generateNamespaces();
        namespace = this.controller.getListNamespaces(namespaceId);
        if (namespace) {
            reply.data = namespace;
            reply.code = 200;
        } else {
            reply.code = 404;
            reply.error = "Namespaces " + namespaceId + " doesn't exist";
        } 

        return reply;
    },
    // History
    exposeHistory: function () {
        var history,
            reply = {
                error: null,
                data: null
            };


        this.res.status = 200;
        history = this.controller.listHistories();

        if(history){
            reply.data = {
                updateTime: Math.floor(new Date().getTime() / 1000),
                history: history
            };
            reply.code = 200;
            
        } else {
            reply.code = 404;
            reply.error = "No device histories found.";
        }
            
        return reply;
    },
    getDevHist: function (vDevId) {
        var history,
            dev,
            reply = {
                error: null,
                data: null
            },
            since,
            show,
            sinceDevHist,
            view = [288,96,48,24,12,6];

        show = this.req.query.hasOwnProperty("show")? (view.indexOf(parseInt(this.req.query.show, 10)) > -1 ? parseInt(this.req.query.show, 10) : 0) : 0;
        since = this.req.query.hasOwnProperty("since") ? parseInt(this.req.query.since, 10) : 0;
        history = this.controller.listHistories();
        hash = this.controller.hashCode(vDevId);
        
        if(history){
            dev = history.filter(function(x){
                return x.h === hash;
            });
            
            if(dev){
                sinceDevHist = this.controller.getDevHistorySince(dev, since, show);            
                
                if (dev && sinceDevHist){         
                    reply.code = 200;
                    reply.data = {
                            id: vDevId,
                            since: since,
                            deviceHistory: sinceDevHist
                        };
                } else {
                    reply.code = 200;
                    reply.data = dev;
                }
            } else {
                reply.code = 404;
                reply.error = "History of device " + vDevId + " doesn't exist";
            }
        } else {
            reply.code = 404;
            reply.error = "No device histories found.";
        }
                
        return reply;
    },
    // restart
    restartController: function (profileId) {
        var reply = {
            error: null,
            data: null,
            code: 200
        };

        this.controller.restart();
        return reply;    
    },
    loadModuleMedia: function(moduleName,fileName) {
        var reply = {
                error: null,
                data: null,
                code: 200
            },
            obj;

        if((moduleName !== '' || !!moduleName || moduleName) && (fileName !== '' || !!fileName || fileName)){
            obj = this.controller.loadModuleMedia(moduleName,fileName);
    
            if(!this.controller.modules[moduleName]){
                reply.code = 404;
                reply.error = "Can't load file from app because app '" + moduleName + "' was not found." ;
                
                return reply;

            }else if (obj !== null) {
                this.res.status = 200;
                this.res.headers = { 
                    "Content-Type": obj.ct,
                    "Connection": "keep-alive"
                };
                this.res.body = obj.data;

                return this.res;

            } else {
                reply.code = 500;
                reply.error = "Failed to load file from module." ;
                
                return reply;
            } 
        } else {
            reply.code = 400;
            reply.error = "Incorrect app or file name" ;
            
            return reply;
        }
    },
    loadImage: function(imageName) {
        var reply = {
                error: null,
                data: null,
                code: 200
            },
            data;

        data = this.controller.loadImage(imageName);
    
        if (data !== null) {
            this.res.status = 200;
            this.res.headers = { 
                    "Content-Type": "image/(png|jpeg|gif)",
                    "Connection": "keep-alive"
                };
            this.res.body = data;

            return this.res;
        }else {
            reply.code = 500;
            reply.error = "Failed to load file." ;
            
            return reply;
        }
    },
    uploadImage: function() {
        var reply = {
                error: null,
                data: null,
                code: 200
            },
            file;

        if (this.req.method === "POST" && this.req.body.file_upload) {
            
            file = this.req.body.file_upload;
            
            if (file instanceof Array) {
                file = file[0];
            }
            
            if (file.name && file.content && file.length > 0) {

                // Create Base64 Object
                saveObject(file.name, Base64.encode(file.content));

                reply.code = 200;
                reply.data = file.name;

            }else {
                reply.code = 500;
                reply.error = "Failed to upload file" ;
            }
        }else {
            reply.code = 400;
            reply.error = "Invalid request" ;
        }
        return reply;
    }
});

ZAutomationAPIWebRequest.prototype.dispatchRequest = function (method, url) {
    // Default handler is NotFound
    var handlerFunc = this.NotFound,
        validParams;

    if ("OPTIONS" === method) {
        handlerFunc = this.CORSRequest;
        // !!!! login ?
    } else {
        var matched = this.router.dispatch(method, url);
        if (matched) {
            var session = this.sessions[this.req.headers['Profile-SID']];

            if (!session && this.req.peer.address === "127.0.0.1") {
                session = {
                    role: this.ROLE_ANONYMOUS
                }; // localhost
            }
            
            // no session found or session expired
            // !!! change this to tokens
            if (!session && matched.role !== this.ROLE_ANONYMOUS) {
                return function() {
                    return {
                        error: 'Not logged in',
                        data: null,
                        code: 401
                    };
                };
            }
            
            // Role is less than allows
            if (session.role < matched.role) {
                return function() {
                    return {
                        error: 'Permission denied',
                        data: null,
                        code: 403
                    };
                };
            }
            
            // fill user field
            this.req.user = session.id;
            
            if (matched.params.length) {
                validParams = _.every(matched.params), function(p) { return !!p; };
                if (validParams) {
                    handlerFunc = function () {
                        matched.handler.apply(this, matched.params);
                    }
                }
            } else {
                handlerFunc = matched.handler;
            }
        }
    }

    // --- Proceed to checkout =)
    return handlerFunc;
};

ZAutomationAPIWebRequest.prototype.unauthorized = function() {
    var reply = {
            error: null,
            data: null,
            code: 200
        },
        file;

    return reply;
};
