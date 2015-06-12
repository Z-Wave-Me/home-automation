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

    this.registerRoutes();
};

var ZAutomationWebRequest = ZAutomationWebRequest || function() {};
inherits(ZAutomationAPIWebRequest, ZAutomationWebRequest);

_.extend(ZAutomationAPIWebRequest.prototype, {
    registerRoutes: function() {
        this.router.get("/status", this.statusReport);
        this.router.post("/login", this.verifyLogin());
        this.router.get("/notifications", this.exposeNotifications());
        this.router.get("/history", this.exposeHistory());
        this.router.get("/devices", this.listDevices);
        this.router.get("/restart", this.restartController);
        this.router.get("/locations", this.listLocations());
        this.router.get("/profiles", this.listProfiles());
        this.router.get("/namespaces", this.listNamespaces);
        this.router.post("/profiles", this.createProfile());
        this.router.get("/locations/add", this.addLocation());
        this.router.post("/locations", this.addLocation());
        this.router.get("/locations/remove", this.removeLocation());
        this.router.get("/locations/update", this.updateLocation());
        this.router.get("/modules", this.listModules);
        this.router.get("/modules/categories", this.listModulesCategories);
        this.router.post("/modules/install", this.installModule());
        this.router.get("/instances", this.listInstances);
        this.router.post("/instances", this.createInstance());

        this.router.post("/upload/image", this.uploadImage);

        // TODO: Should we remove these as they are no longer available?
        // this.router.post("/namespaces", this.createNamespace());
        // this.router.get("/notifications/markRead", this.markNotificationsRead());
        // this.router.post("/schemas", this.createSchema());

        // patterned routes, right now we are going to just send in the wrapper
        // function. We will let the handler consumer handle the application of
        // the parameters.
        this.router.get("/devices/:v_dev_id/command/:command_id", this.performVDevCommandFunc);

        this.router.del("/locations/:location_id", this.removeLocation, [parseInt]);
        this.router.put("/locations/:location_id", this.updateLocation, [parseInt]);
        this.router.get("/locations/:location_id", this.listLocations, [parseInt]);

        this.router.put("/notifications/:notification_id", this.updateNotification, [parseInt]);
        this.router.get("/notifications/:notification_id", this.getNotificationFunc, [parseInt]);
        this.router.del("/notifications/:notification_id", this.deleteNotifications, [parseInt]);

        this.router.del("/profiles/:profile_id", this.removeProfile, [parseInt]);
        this.router.put("/profiles/:profile_id", this.updateProfile, [parseInt]);
        this.router.get("/profiles/:profile_id", this.listProfiles, [parseInt]);

        this.router.put("/auth/update/:profile_id", this.updateProfileAuth, [parseInt]);

        this.router.put("/devices/:dev_id", this.setVDevFunc);
        this.router.get("/devices/:dev_id", this.getVDevFunc);

        this.router.get("/instances/:instance_id", this.getInstanceFunc);
        this.router.put("/instances/:instance_id", this.reconfigureInstanceFunc, [parseInt]);
        this.router.del("/instances/:instance_id", this.deleteInstanceFunc, [parseInt]);

        this.router.get("/modules/:module_id", this.getModuleFunc);

        this.router.get("/modules/categories/:category_id", this.getModuleCategoryFunc);

        this.router.get("/namespaces/:namespace_id", this.getNamespaceFunc, [parseInt]);

        this.router.get("/history/:dev_id", this.getDevHist);

        this.router.get("/load/modulemedia/:module_name/:file_name", this.loadModuleMedia);
        
        this.router.get("/load/image/:img_name", this.loadImage);
    },
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

        this.initResponse(reply);
    },
    verifyLogin: function() {
        var that = this,
            reply = {
                    error: null,
                    data: null,
                    code: 500
                };
        
        return function () {
            var reqObj;

            try {
                reqObj = JSON.parse(that.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }

            profile = _.find(that.controller.profiles, function (profile) {
                return profile.login === reqObj.login;
            });

            if(!!profile && reqObj.password === profile.password){

                reply.code = 200;
                reply.data = {
                    id: profile.id,
                    sid: profile.sid,
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

                that.controller.profileSID = profile.sid;
                that.controller.defaultLang = profile.lang;
            } else {
                reply.code = 404;
                reply.error = "User login/password is wrong.";
            }
            
            this.initResponse(reply);
        };
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
            that = this,
            profile = that.getProfileBySID(),
            role = that.getUserRole(),
            devices;

        reply.data.structureChanged = that.controller.lastStructureChangeTime >= since ? true : false;
        
        if(that.controller.profileSID !== ''){
            if(role !== 1 && profile){
                if(profile.rooms && !!profile.rooms){
                    devices = that.controller.devices.toJSON().filter(function(dev){
                        return profile.rooms.indexOf(parseInt(dev.location)) !== -1;
                    });
                }            
            }else{
                devices = that.controller.devices.toJSON();
            }

            if(devices){
                if (reply.data.structureChanged) {
                    reply.data.devices = devices;
                } else {
                    reply.data.devices = that.controller.devices.toJSON({since: reply.data.structureChanged ? 0 : since});
                }

                if (Boolean(that.req.query.pagination)) {
                    if(role !== 1){
                        reply.data.total_count = devices.length;
                    }else{
                        reply.data.total_count = that.controller.devices.models.length;
                    }                
                }
            } else {
                reply.code = 404;
                reply.error = 'No devices found.';
            }
        } else {
            reply.code = 401;
            reply.error = 'Not logged in';
        }
        
        that.initResponse(reply);
    },
    getVDevFunc: function (vDevId) {
        var that = this,
            reply = {
                error: null,
                data: null
            };

        return function () {
            if (that.controller.devices.get(vDevId)) {
                reply.code = 200;
                //reply.data = {
                //   meta: that._vdevMetaOnly(controller.devices[vDevId]),
                //   data: controller.getVdevInfo(vDevId)
                //}
                reply.data = that.controller.devices.get(vDevId).toJSON();
            } else {
                reply.code = 404;
                reply.error = "Device " + vDevId + " doesn't exist";
            }
            that.initResponse(reply);
        };
    },
    setVDevFunc: function (vDevId) {
        var that = this,
            reqObj,
            reply = {
                error: null,
                data: null
            };

        return function () {
            try {
                reqObj = JSON.parse(that.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }

            if (that.controller.devices.has(vDevId)) {
                reply.code = 200;
                reply.data = that.controller.devices.get(vDevId).set(reqObj);
            } else {
                reply.code = 404;
                reply.error = "Device " + vDevId + " doesn't exist";
            }
            that.initResponse(reply);
        };
    },
    performVDevCommandFunc: function (vDevId, commandId) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 200
            },
            result_execution_command;

        return function () {

            if (that.controller.devices.has(vDevId)) {
                result_execution_command = that.controller.devices.get(vDevId).performCommand.call(that.controller.devices.get(vDevId), commandId, that.req.query);
                reply.data = !!result_execution_command ? result_execution_command : null;
            } else {
                reply.data = null;
                reply.code = 404;
                reply.error = "Device " + vDevId + " doesn't exist";
            }
            that.initResponse(reply);
        };
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
            to,
            userId,
            that = this,
            listProf = that.controller.getListProfiles().length;


        return function () {
            if(that.controller.profileSID !== ''){
                that.res.status = 200;
                since = that.req.query.hasOwnProperty("since") ? parseInt(that.req.query.since, 10) : 0;
                to = that.req.query.hasOwnProperty("to") ? parseInt(that.req.query.to, 10) : 0;
                redeemed = that.req.query.hasOwnProperty("redeemed") && (String(that.req.query.redeemed)) === 'true' ? true : false;

                profile = that.getProfileBySID();
                
                if(profile !== null) {
                    notifications = that.controller.listNotifications(since, to, profile, redeemed);

                    reply.data = {
                        updateTime: Math.floor(new Date().getTime() / 1000),
                        notifications: notifications
                    };

                    if (Boolean(that.req.query.pagination)) {
                        reply.data.total_count = that.controller.getCountNotifications();
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
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            that.initResponse(reply);
        };
    },
    getNotificationFunc: function (notificationId) {
        return function () {
            var that = this,
                id = notificationId ? parseInt(notificationId) : 0,
                reply = {
                    data: null,
                    error: null,
                    code: 200
                },
                notification;

            if (id) {
                notification = that.controller.getNotification(id);
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

            that.initResponse(reply);
        };
    },
    updateNotification: function (notificationId) {

        return function () {
            var reply = {
                    error: null,
                    data: "OK"
                },
                that = this,
                reqObj,
                notification = that.controller.getNotification(notificationId);

            if (Boolean(notification)) {

                try {
                    reqObj = JSON.parse(this.req.body);
                } catch (ex) {
                    reply.error = ex.message;
                }

                that.controller.updateNotification(notificationId, reqObj, function (notice) {
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
            that.initResponse(reply);
        };
    },
    deleteNotifications: function (notificationId) {

        return function () {
            
            var that = this,
                id = notificationId ? parseInt(notificationId) : 0,
                reply = {
                    data: null,
                    error: null,
                    code: 200
                },
                before,
                role = that.getUserRole();

            if(that.controller.profileSID !== ''){
                if(role === 1){
                    
                    before = that.req.query.hasOwnProperty("allPrevious") ? Boolean(that.req.query.allPrevious) : false;
                    uid = that.req.query.hasOwnProperty("uid") ? parseInt(that.req.query.uid) : 0;
                    
                    if (id > 0 && before === false && !_.any(that.controller.notifications, function (notification) { return (notification.id === id && notification.h === uid);})) {
                        reply.code = 404;
                        reply.error = "Notification '" + id + "' with uid '" + uid + "' not found";
                    } else if (id > 0 && before !== false && !_.any(that.controller.notifications, function (notification) { return (notification.id === id);})) {
                        reply.code = 404;
                        reply.error = "Notification " + id + " not found";
                    } else if (before === true && !_.any(that.controller.notifications, function (notification) { return notification.id < id; })) {
                        reply.code = 404;
                        reply.error = "No notifications found older than unix timestamp: " + id;
                    } else {
                        that.controller.deleteNotifications(id, before, uid, function (notice) {
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
                } else {
                    reply.code = 403;
                    reply.data = null;
                    reply.error = "Permission denied.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            this.initResponse(reply);
        };
    },
    //locations
    listLocations: function (locationId) {
        var that = this,
            reply = {
                data: null,
                error: null
            },
            profile,
            role;

        return function () {
            if(that.controller.profileSID !== ''){
                profile = that.getProfileBySID();
                role = that.getUserRole();

                if (locationId === undefined){
                    if(role === 1){
                        reply.code = 200;
                        reply.error = null;
                        reply.data = that.controller.locations;
                    } else if (role === 2){
                        reply.code = 200;
                        reply.error = null;
                        reply.data = that.controller.locations.filter(function (location) {
                            return profile.rooms.indexOf(location.id) !== -1;
                        });
                    } else {
                        reply.code = 404;
                        reply.error = "Could not load locations.";
                    }
                } else {
                    var locations;

                    if(role === 1){
                        locations = that.controller.locations.filter(function (location) {
                            return location.id === locationId;
                        });
                    } else {
                        locations = that.controller.locations.filter(function (location) {
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
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            that.initResponse(reply);
        };
    },
    addLocation: function () {
        var title,
            reply = {
                error: null,
                data: null
            },
            reqObj,
            that = this,
            locProps = {},
            role;

        return function () {
            if(that.controller.profileSID !== ''){
                role = that.getUserRole();
                
                if(role === 1){
                    if (that.req.method === 'GET') {
                        
                        reqObj = that.req.query;
                    
                    } else if (that.req.method === 'POST') { // POST
                        try {
                            reqObj = JSON.parse(that.req.body);
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
                        that.controller.addLocation(locProps, function (data) {
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
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }
            
            that.initResponse(reply);
        };
    },
    removeLocation: function (locationId) {
        var that = this,
            id,
            reply = {
                error: null,
                data: null
            },
            reqObj,
            role;

        return function () {
            if(that.controller.profileSID !== ''){            
                role = that.getUserRole();

                if(role === 1){

                    if (that.req.method === 'GET') {
                        id = parseInt(that.req.query.id);
                    } else if (that.req.method === 'DELETE' && locationId === undefined) {
                        try {
                            reqObj = JSON.parse(that.req.body);
                        } catch (ex) {
                            reply.error = ex.message;
                        }
                        id = reqObj.id;
                    } else if (that.req.method === 'DELETE' && locationId !== undefined) {
                        id = locationId;
                    }

                    if (!!id) {
                        that.controller.removeLocation(id, function (result) {
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
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            that.initResponse(reply);
        };
    },
    updateLocation: function (locationId) {
        var that = this,
            id,
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
            role;

        return function () {
            if(that.controller.profileSID !== ''){
                role = that.getUserRole();

                if(role === 1){

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
                        that.controller.updateLocation(id, title, user_img, default_img, img_type, function (data) {
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
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            this.initResponse(reply);
        };
    },
    // modules
    listModules: function () {
        var that = this,
            reply = {
                error: null,
                data: [],
                code: 200
            },
            module = null,
            role = that.getUserRole();

        if(that.controller.profileSID !== ''){
            if(role === 1){

                Object.keys(that.controller.modules).sort().forEach(function (className) {
                    module = that.controller.getModuleData(className);
                    module.className = className;
                    if (module.singleton && _.any(that.controller.instances, function (instance) { return instance.moduleId === module.id; })) {
                        module.created = true;
                    } else {
                        module.created = false;
                    }
                    reply.data.push(module);
                });
            } else {
                reply.code = 403;
                reply.error = "Permission denied.";
            }
        } else {
            reply.code = 401;
            reply.error = 'Not logged in';
        }

        this.initResponse(reply);
    },
    getModuleFunc: function (moduleId) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            role;

        return function () {
            if(that.controller.profileSID !== ''){
                role = that.getUserRole();

                if(role === 1){

                    if (!that.controller.modules.hasOwnProperty(moduleId)) {
                        reply.code = 404;
                        reply.error = 'Instance ' + moduleId + ' not found';
                    } else {
                        reply.code = 200;
                        reply.data = that.controller.getModuleData(moduleId);
                    }
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            this.initResponse(reply);
        };
    },
    // modules categories
    listModulesCategories: function () {
        var that = this,
                reply = {
                    error: null,
                    data: null,
                    code: 200
                },
                role = this.getUserRole();

        if(role === 1){
            reply.data =that.controller.getListModulesCategories();
        } else {
            reply.code = 403;
            reply.error = "Permission denied.";
        }

        this.initResponse(reply);
    },
    getModuleCategoryFunc: function (categoryId) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            role;

        return function () {
            if(that.controller.profileSID !== ''){
                role = that.getUserRole();

                if(role === 1){
                    category = that.controller.getListModulesCategories(categoryId);

                    if (!Boolean(category)) {
                        reply.code = 404;
                        reply.error = "Categories " + categoryId + " not found";
                    } else {
                        reply.code = 200;
                        reply.data = category;
                    }
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            this.initResponse(reply);
        };
    },
    // install module
    installModule: function () {
        return function () {
            
                var reply = {
                        error: null,
                        data: null,
                        code: 500
                    },
                    moduleUrl = this.req.body.moduleUrl,
                    that = this,
                    role = that.getUserRole();
            
            if(that.controller.profileSID !== ''){
                if(role === 1){
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
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            this.initResponse(reply);
        };
    },

    // instances
    listInstances: function () {
        var that = this,
            reply = {
                    error: null,
                    data: null,
                    code: 200
                };
        if(that.controller.profileSID !== ''){
            reply.data = that.controller.instances;
        } else {
            reply.code = 401;
            reply.error = 'Not logged in';
        }

        this.initResponse(reply);
    },
    createInstance: function () {
        return function () {
            
                var reply = {
                        error: null,
                        data: null,
                        code: 500
                    },
                    reqObj = this.req.reqObj,
                    that = this,
                    instance,
                    role = that.getUserRole();
            
            if(that.controller.profileSID !== ''){
                if(role === 1){
                    if (that.controller.modules.hasOwnProperty(reqObj.moduleId)) {
                        instance = that.controller.createInstance(reqObj);
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
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            this.initResponse(reply);
        };
    },
    getInstanceFunc: function (instanceId) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            role;

        return function () {
            if(that.controller.profileSID !== ''){
                role = that.getUserRole();
                
                if(role === 1){
                    if(isNaN(instanceId)){
                        instance = _.filter(that.controller.instances, function (i) { return instanceId === i.moduleId; });
                    } else {
                        instance = _.find(that.controller.instances, function (i) { return parseInt(instanceId) === i.id; });
                    }
                    if (!Boolean(instance)) {
                        reply.code = 404;
                        reply.error = "Instance " + instanceId + " is not found";
                    } else {
                        reply.code = 200;
                        reply.data = instance;
                    }
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            this.initResponse(reply);
        };
    },
    reconfigureInstanceFunc: function (instanceId) {
        var that = this,
            reply = {
                error: null,
                data: null
            },
            instance,
            role;

        return function () {
            try {
                var reqObj = JSON.parse(this.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }

            if(that.controller.profileSID !== ''){
                role = that.getUserRole();

                if(role === 1){
                    if (!_.any(that.controller.instances, function (instance) { return instanceId === instance.id; })) {
                        reply.code = 404;
                        reply.error = "Instance " + instanceId + " doesn't exist";
                    } else {
                        instance = that.controller.reconfigureInstance(instanceId, reqObj);
                        if (instance) {
                            reply.code = 200;
                            reply.data = instance;
                        } else {
                            reply.code = 500;
                            reply.error = "Cannot reconfigure module " + instanceId + " config";
                        }
                    }
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }


            this.initResponse(reply);
        };
    },
    deleteInstanceFunc: function (instanceId) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 200
            },
            role;

        return function () {
            if(that.controller.profileSID !== ''){
                role = that.getUserRole();
                
                if(role === 1){
                    if (!_.any(that.controller.instances, function (instance) { return instance.id === instanceId; })) {
                        reply.code = 404;
                        reply.error = "Instance " + instanceId + " not found";
                    } else {
                        reply.code = 204;
                        reply.data = null;
                        that.controller.deleteInstance(instanceId);
                    }
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            this.initResponse(reply);
        };
    },
    // profiles
    listProfiles: function (profileId) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            profiles,
            profile,
            userId,
            role;

        return function () {
            userId = that.controller.profileSID;
            
            if(userId !== ''){
                role= that.getUserRole();
                    
                // list all profiles only if user has 'admin' permissions
                if (!_.isNumber(profileId) && role === 1) {
                    profiles = that.controller.getListProfiles();
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
                    profile = that.controller.getProfile(profileId);
                    if (profile && profile !== null) {
                        if (role === 1 || (role === 2 && userId === profile.sid)){ 
                            reply.code = 200;
                            reply.data = profile;
                        } else {
                            reply.code = 403;
                            reply.error = "Permission denied. Cannot show foreign profile.";
                        }
                    } else {
                        reply.code = 404;
                        reply.error = "Profile '" + profileId + "' doesn't exist";
                    }
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            this.initResponse(reply);
        };
    },
    createProfile: function () {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            userId,
            role,
            reqObj,
            profile;

        return function () {
            userId = that.controller.profileSID;
            
            if(userId !== ''){
                role = that.getUserRole();
                    
                // only users with 'admin' permissions can create new profiles
                if (role === 1){
                    try {
                        reqObj = JSON.parse(this.req.body);
                    } catch (ex) {
                        reply.error = ex.message;
                    }

                    nameAllreadyExists = Boolean(_.find(that.controller.profiles, function (profile) {
                                                    return profile.login === reqObj.login;
                                                }));

                    if (reqObj.hasOwnProperty('name') && nameAllreadyExists === false) {
                        profile = that.controller.createProfile(reqObj);
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
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied. You're not allowed to create profiles.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            this.initResponse(reply);
        };
    },
    updateProfile: function (profileId) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            reqObj,
            profile,
            userId,
            role;

        return function () {
            userId = that.controller.profileSID;
            
            if(userId !== ''){
                role = that.getUserRole();
                profile = that.controller.getProfile(profileId);
                
                // update target profile if user has 'admin' permissions
                // update only own profile if user has 'user' permissions otherwise response with error
                if (role === 1 || (role === 2 && userId === profile.sid)){
                    try {
                        reqObj = JSON.parse(this.req.body);
                    } catch (ex) {
                        reply.error = ex.message;
                    }

                    if (reqObj.hasOwnProperty('name')) {
                        profile = that.controller.updateProfile(reqObj, profileId);
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
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }

            this.initResponse(reply);
        };
    },
    // different pipe for updating authentication values
    updateProfileAuth: function (profileId) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            reqObj,
            profile,
            userProfileId;
        
        return function () {
            if(that.controller.profileSID !== ''){
                userProfileId = that.getProfileBySID().id;
                
                if(typeof this.req.body !== 'object'){
                    reqObj = JSON.parse(this.req.body);
                } else{
                    reqObj = this.req.body;
                }

                // make sure that every user can update authentications only on his own
                // - role independent - admin cannot change users authentications
                if (!!userProfileId && userProfileId === profileId) {
                        
                    profile = that.controller.updateProfileAuth(reqObj, userProfileId);
                    
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
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }            

            this.initResponse(reply);
        };
    },
    removeProfile: function (profileId) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            profile,
            userId,
            role;

        return function () {
            userId = this.controller.profileSID;
            
            if(userId !== ''){
                role = that.getUserRole();
                
                if(role === 1){

                    profiles = that.controller.getListProfiles();

                    // only admins are allowed to delete profiles
                    // it is not possible to delete first profile (superadmin)
                    if (_.isNumber(profileId) && profileId !== profiles[0].id) {
                        
                        profile = that.controller.getProfile(profileId);
                        
                        if (profile !== null) {
                            that.controller.removeProfile(profileId);
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
                } else {
                    reply.code = 403;
                    reply.error = "Permission denied. Not allowed to delete profile.";
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }
            
            this.initResponse(reply);
        };
    },
    // namespaces
    listNamespaces: function () {
        var reply = {
            error: null,
            data: null,
            code: 500
        };

        if(this.controller.profileSID !== ''){
            this.controller.generateNamespaces(function (namespaces) {
                if (_.isArray(namespaces)) {
                    reply.data = namespaces;
                    reply.code = 200;
                } else {
                    reply.error = "Namespaces array is null";
                }
            });      
        } else {
            reply.code = 401;
            reply.error = 'Not logged in';
        }        

        this.initResponse(reply);
    },
    getNamespaceFunc: function (namespaceId) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            namespace;

        return function () {
            if(that.controller.profileSID !== ''){

                that.controller.generateNamespaces();
                namespace = that.controller.getListNamespaces(namespaceId);
                if (namespace) {
                    reply.data = namespace;
                    reply.code = 200;
                } else {
                    reply.code = 404;
                    reply.error = "Namespaces " + namespaceId + " doesn't exist";
                } 
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }            

            this.initResponse(reply);
        };
    },
    // History
    exposeHistory: function () {
        var history,
            reply = {
                error: null,
                data: null
            },
            that = this;


        return function () {
            if(that.controller.profileSID !== ''){
                that.res.status = 200;
                history = that.controller.listHistories();

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
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }
            
            that.initResponse(reply);
        };
    },
    getDevHist: function (vDevId) {
        var that = this,
            history,
            dev,
            reply = {
                error: null,
                data: null
            },
            since,
            show,
            sinceDevHist,
            view = [288,96,48,24,12,6];

        return function () {
            if(that.controller.profileSID !== ''){
                show = that.req.query.hasOwnProperty("show")? (view.indexOf(parseInt(that.req.query.show, 10)) > -1 ? parseInt(that.req.query.show, 10) : 0) : 0;
                since = that.req.query.hasOwnProperty("since") ? parseInt(that.req.query.since, 10) : 0;
                history = that.controller.listHistories();
                hash = that.controller.hashCode(vDevId);
                
                if(history){
                    dev = history.filter(function(x){
                        return x.h === hash;
                    });
                    
                    if(dev.length > 0){
                        sinceDevHist = that.controller.getDevHistory(dev, since, show);            
                        
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
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }
                
            that.initResponse(reply);
        };
    },
    // restart
    restartController: function (profileId) {
        var reply = {
            error: null,
            data: null,
            code: 200
        };

        if(this.controller.profileSID !== ''){
            this.controller.restart();
            this.initResponse(reply);    
        } else {
            reply.code = 401;
            reply.error = 'Not logged in';
        }        
    },
    loadModuleMedia: function(moduleName,fileName) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 200
            },
            obj;

        return function (){
            if(that.controller.profileSID !== ''){

                if((moduleName !== '' || !!moduleName || moduleName) && (fileName !== '' || !!fileName || fileName)){
                    obj = that.controller.loadModuleMedia(moduleName,fileName);
            
                    if(!that.controller.modules[moduleName]){
                        reply.code = 404;
                        reply.error = "Can't load file from app because app '" + moduleName + "' was not found." ;
                        
                        that.initResponse(reply);

                    }else if (obj !== null) {
                        that.res.status = 200;
                        that.res.headers = { 
                            "Content-Type": obj.ct,
                            "Connection": "keep-alive"
                        };
                        that.res.body = obj.data;

                        return that.res;

                    } else {
                        reply.code = 500;
                        reply.error = "Failed to load file from module." ;
                        
                        that.initResponse(reply);
                    } 
                } else {
                    reply.code = 400;
                    reply.error = "Incorrect app or file name" ;
                    
                    that.initResponse(reply);
                }
                
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';

                that.initResponse(reply);
            }
            
        };
    },
    loadImage: function(imageName) {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 200
            },
            data;

        return function (){
            if(that.controller.profileSID !== ''){
                data = that.controller.loadImage(imageName);
            
                if (data !== null) {
                    that.res.status = 200;
                    that.res.headers = { 
                            "Content-Type": "image/(png|jpeg|gif)",
                            "Connection": "keep-alive"
                        };
                    that.res.body = data;

                    return that.res;
                }else {
                    reply.code = 500;
                    reply.error = "Failed to load file." ;
                    
                    that.initResponse(reply);
                }
            } else {
                reply.code = 401;
                reply.error = 'Not logged in';
            }
                
        };
    },
    uploadImage: function() {
        var that = this,
            reply = {
                error: null,
                data: null,
                code: 200
            },
            file;

        if(that.controller.profileSID !== ''){

        } else {
            reply.code = 401;
            reply.error = 'Not logged in';
        }

        if (that.req.method === "POST" && that.req.body.file_upload) {
            
            file = that.req.body.file_upload;
            
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
        that.initResponse(reply);
    }
});

ZAutomationAPIWebRequest.prototype.dispatchRequest = function (method, url) {
    // Default handler is NotFound
    var handlerFunc = this.NotFound,
        validParams;

    if ("OPTIONS" === method) {
        handlerFunc = this.CORSRequest;
    } else {
        var matched = this.router.dispatch(method, url);
        if (matched) {
            if (matched.params.length) {
                validParams = _.every(matched.params), function(p) { return !!p; };
                if (validParams) {
                    handlerFunc = matched.handler.apply(this, matched.params);
                }
            } else {
                handlerFunc = matched.handler;
            }
        }
    }

    // --- Proceed to checkout =)
    return handlerFunc;
};

ZAutomationAPIWebRequest.prototype.getUserRole = function () {
    var profile = _.find(this.controller.profiles, function (profile) {
                                                    return profile.sid === this.controller.profileSID;
                                                }); 
    if(!!profile){
        return role = profile.role; 
    } else {
        return role = null;
    }        
};

ZAutomationAPIWebRequest.prototype.getProfileBySID = function () {
    var getProfile = this.controller.profiles.filter(function (p) {
                    return p.sid === this.controller.profileSID;
        }),
        profile;

    if(Object.prototype.toString.call(getProfile) === '[object Array]'){
        profile = getProfile[0];
    } else {
        profile = getProfile;
    }

    return profile? profile : null;
};
