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

    this.ROLE = controller.auth.ROLE;
    
    this.router = new Router("/v1");
    this.controller = controller;
    this.res = {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: null
    };
    this.exclFromProfileRes = [
        'password'
    ];

    this.registerRoutes();
};

var ZAutomationWebRequest = ZAutomationWebRequest || function() {};
inherits(ZAutomationAPIWebRequest, ZAutomationWebRequest);

_.extend(ZAutomationAPIWebRequest.prototype, {
    registerRoutes: function() {
        this.router.get("/status", this.ROLE.USER, this.statusReport);
        this.router.post("/login", this.ROLE.ANONYMOUS, this.verifyLogin);
        this.router.get("/logout", this.ROLE.USER, this.doLogout);
        this.router.get("/notifications", this.ROLE.USER, this.exposeNotifications);
        this.router.get("/history", this.ROLE.USER, this.exposeHistory);
        this.router.get("/devices", this.ROLE.USER, this.listDevices);
        this.router.get("/restart", this.ROLE.ADMIN, this.restartController);
        this.router.get("/locations", this.ROLE.USER, this.listLocations);
        this.router.get("/profiles", this.ROLE.USER, this.listProfiles);
        this.router.get("/namespaces", this.ROLE.ADMIN, this.listNamespaces);
        this.router.post("/profiles", this.ROLE.USER, this.createProfile);
        this.router.get("/locations/add", this.ROLE.ADMIN, this.addLocation);
        this.router.post("/locations", this.ROLE.ADMIN, this.addLocation);
        this.router.get("/locations/remove", this.ROLE.ADMIN, this.removeLocation);
        this.router.get("/locations/update", this.ROLE.ADMIN, this.updateLocation);
        this.router.get("/modules", this.ROLE.ADMIN, this.listModules);
        this.router.get("/modules/categories", this.ROLE.ADMIN, this.listModulesCategories);
        
        // module installation / update
        this.router.post("/modules/install", this.ROLE.ADMIN, this.installModule);
        this.router.post("/modules/update", this.ROLE.ADMIN, this.updateModule);

        // module tokens
        this.router.get("/modules/tokens", this.ROLE.ADMIN, this.getModuleTokens);
        this.router.put("/modules/tokens", this.ROLE.ADMIN, this.storeModuleToken);
        this.router.del("/modules/tokens", this.ROLE.ADMIN, this.deleteModuleToken);

        this.router.get("/instances", this.ROLE.ADMIN, this.listInstances);
        this.router.post("/instances", this.ROLE.ADMIN, this.createInstance);

        this.router.post("/upload/file", this.ROLE.ADMIN, this.uploadFile);

        // patterned routes, right now we are going to just send in the wrapper
        // function. We will let the handler consumer handle the application of
        // the parameters.
        this.router.get("/devices/:v_dev_id/command/:command_id", this.ROLE.USER, this.performVDevCommandFunc);

        this.router.get("/locations/:location_id/namespaces/:namespace_id", this.ROLE.ADMIN, this.getLocationNamespacesFunc);
        this.router.get("/locations/:location_id/namespaces", this.ROLE.ADMIN, this.getLocationNamespacesFunc);

        this.router.del("/locations/:location_id", this.ROLE.ADMIN, this.removeLocation, [parseInt]);
        this.router.put("/locations/:location_id", this.ROLE.ADMIN, this.updateLocation, [parseInt]);
        this.router.get("/locations/:location_id", this.ROLE.ADMIN, this.getLocationFunc);

        this.router.del("/notifications/:notification_id", this.ROLE.USER, this.deleteNotifications, [parseInt]);

        this.router.del("/profiles/:profile_id", this.ROLE.ADMIN, this.removeProfile, [parseInt]);
        this.router.put("/profiles/:profile_id", this.ROLE.USER, this.updateProfile, [parseInt]);
        this.router.get("/profiles/:profile_id", this.ROLE.USER, this.listProfiles, [parseInt]);

        this.router.post("/auth/forgotten", this.ROLE.ANONYMOUS, this.restorePassword);
        this.router.post("/auth/forgotten/:profile_id", this.ROLE.ANONYMOUS, this.restorePassword, [parseInt]);
        this.router.put("/auth/update/:profile_id", this.ROLE.ANONYMOUS, this.updateProfileAuth, [parseInt]);

        this.router.put("/devices/:dev_id", this.ROLE.USER, this.setVDevFunc);
        this.router.get("/devices/:dev_id", this.ROLE.USER, this.getVDevFunc);

        this.router.get("/instances/:instance_id", this.ROLE.ADMIN, this.getInstanceFunc);
        this.router.put("/instances/:instance_id", this.ROLE.ADMIN, this.reconfigureInstanceFunc, [parseInt]);
        this.router.del("/instances/:instance_id", this.ROLE.ADMIN, this.deleteInstanceFunc, [parseInt]);

        this.router.post("/modules/reset/:module_id", this.ROLE.ADMIN, this.resetModule);
        this.router.del("/modules/delete/:module_id", this.ROLE.ADMIN, this.deleteModule);
        
        // reinitialize apps from /modules or /userModules directory
        this.router.get("/modules/reinitialize/:module_id", this.ROLE.ADMIN, this.reinitializeModule);
        
        this.router.get("/modules/:module_id", this.ROLE.ADMIN, this.getModuleFunc);

        this.router.get("/modules/categories/:category_id", this.ROLE.ADMIN, this.getModuleCategoryFunc);

        this.router.get("/namespaces/:namespace_id", this.ROLE.ADMIN, this.getNamespaceFunc);

        this.router.get("/history/:dev_id", this.ROLE.USER, this.getDevHist);

        this.router.get("/load/modulemedia/:module_name/:file_name", this.ROLE.ANONYMOUS, this.loadModuleMedia);
        
        this.router.get("/load/image/:img_name", this.ROLE.ANONYMOUS, this.loadImage);

        this.router.get("/backup", this.ROLE.ADMIN, this.backup);
        this.router.post("/restore", this.ROLE.ADMIN, this.restore);
        this.router.post("/reset", this.ROLE.ADMIN, this.reset);
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
                    code: 500,
                    headers: null
                },
            reqObj;

        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
            return reply;
        }

        profile = _.find(this.controller.profiles, function (profile) {
            return profile.login === reqObj.login;
        });

        if (profile && reqObj.password === profile.password) {
            var sid = crypto.guid(),
                resProfile = {};
            this.controller.auth.checkIn(profile, sid);

            resProfile = this.getProfileResponse(profile);
            resProfile.sid = sid;

            reply.code = 200;
            reply.data = resProfile;

            reply.headers = {
                "Set-Cookie": "ZWAYSession=" + sid + "; Path=/; HttpOnly"// set cookie - it will duplicate header just in case client prefers cookies
            };
        } else {
            reply.code = 401;
            reply.error = "User login/password is wrong.";
            reply.headers = {
                "Set-Cookie": "ZWAYSession=deleted; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT" // clean cookie
            };
        }
        
        return reply;
    },
    doLogout: function() {
        var reply = {
                error: null,
                data: null,
                code: 500,
                headers: null
            },
            session;

        if (this.req.headers.ZWAYSession) {
            session = this.req.headers.ZWAYSession;

            reply.headers = {
                "Set-Cookie": "ZWAYSession=deleted; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT" // clean cookie
            };

            reply.code = 200;

            if (this.controller.auth.sessions[session]) {
                delete this.controller.auth.sessions[session];
            }
        } else {
            reply.error = 'Internal server error.';
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
            since = this.req.query.hasOwnProperty("since") ? parseInt(this.req.query.since, 10) : 0;

        reply.data.structureChanged = this.controller.lastStructureChangeTime >= since ? true : false;
        reply.data.devices = this.devicesByUser(this.req.user, function (dev) { return dev.get("updateTime") >= (reply.data.structureChanged ? 0 : since); });
        if (Boolean(this.req.query.pagination)) {
            reply.data.total_count = devices.length;
        }

        return reply;
    },
    getVDevFunc: function (vDevId) {
        var reply = {
                error: null,
                data: null
            },
            device = _.find(this.devicesByUser(this.req.user), function(device) { return device.id === vDevId; });

        if (device) {
            reply.code = 200;
            reply.data = device.toJSON();
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
            device = this.deviceByUser(vDevId, this.req.user);

        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
        }

        if (device) {
            reply.code = 200;
            reply.data = device.set(reqObj);
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
            vDev = this.deviceByUser(vDevId, this.req.user);
        
        if (vDev) {
            result_execution_command = vDev.performCommand.call(vDev, commandId, this.req.query);
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
                data: null,
                code: 200
            },
            timestamp = Math.floor(new Date().getTime() / 1000),
            since = this.req.query.hasOwnProperty("since") ? parseInt(this.req.query.since, 10) : 0,
            to = (this.req.query.hasOwnProperty("to") ? parseInt(this.req.query.to, 10) : 0) || timestamp,
            profile = this.profileByUser(this.req.user),
            devices = this.devicesByUser(this.req.user).map(function(device) { return device.id; });

        notifications = this.controller.notifications.filter(function (notification) {
            return  notification.id >= since && notification.id <= to && // filter by time
                    ((profile.hide_system_events === false && notification.level !== 'device-info') || // hide_system_events = false
                    (profile.hide_all_device_events === false && notification.level === 'device-info')) && // hide_device_events = false
                    (!profile.hide_single_device_events || profile.hide_single_device_events.indexOf(notification.source) === -1) && // remove events from devices to hide
                    ((notification.level !== 'device-info' && devices.indexOf(notification.source) === -1) || (notification.level === 'device-info' && devices.indexOf(notification.source) > -1));// filter by user device
        });

        if (Boolean(this.req.query.pagination)) {
            reply.data.total_count = notifications.length;
            // !!! fix pagination
            notifications = notifications.slice();
        }

        reply.data = {
            updateTime: timestamp,
            notifications: notifications
        };

        return reply;
    },
    // delete single notifications or all privious by a choosen timestamp
    deleteNotifications: function (notificationId) {
       
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
    listLocations: function () {
        var reply = {
                data: null,
                error: null
            },
            locations = this.locationsByUser(this.req.user),
            expLocations = [];

        // generate namespaces per location
        if (locations.length > 0) {
            reply.code = 200;
            reply.data = locations;
        } else {
            reply.code = 500;
            reply.error = 'Could not list Instances.';
        }

        return reply;
    },
    // get location
    getLocationFunc: function (locationId) {
        var reply = {
                data: null,
                error: null
            },
            locations = this.locationsByUser(this.req.user),
            _location = [],
            locationId = !isNaN(locationId)? parseInt(locationId, 10) : locationId;

        _location = this.controller.getLocation(locations, locationId);

        // generate namespaces for location
        if (_location) {
            reply.data = _location;
            reply.code = 200;
        } else {
            reply.code = 404;
            reply.error = "Location " + locationId + " not found";
        }

        return reply;
    },
    //filter location namespaces
    getLocationNamespacesFunc: function (locationId, namespaceId) {
        var reply = {
                data: null,
                error: null
            },
            locations = this.locationsByUser(this.req.user),
            _location = [],
            locationId = !isNaN(locationId)? parseInt(locationId, 10) : locationId;

        _location = this.controller.getLocation(locations, locationId);

        // generate namespaces for location and get its namespaces
        if (_location) {

            // get namespaces by path (namespaceId)
            if (!namespaceId) {
                getFilteredNspc = _location.namespaces;
            } else {
                getFilteredNspc = this.controller.getListNamespaces(namespaceId, _location.namespaces);
            }

            if (!getFilteredNspc || (_.isArray(getFilteredNspc) && getFilteredNspc.length < 1)) {
                reply.code = 404;
                reply.error = "Couldn't find namespaces entry with: '" + namespaceId + "'";
            } else {
                reply.data = getFilteredNspc;
                reply.code = 200;
            }
        } else {
            reply.code = 404;
            reply.error = "Location " + locationId === 0? 'globalRoom' : locationId + " not found";
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
            locProps = {};

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
        var id,
            reqObj,
            reply = {
                error: null,
                data: null,
                code: 200
            };

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
            if (id !== 0) {
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
                reply.code = 403;
                reply.error = "Permission denied.";
            }
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
            reqObj;
        
        if(locationId !== 0){
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
        }else {
            reply.code = 403;
            reply.error = "Permission denied.";
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

            if(module.location === ('userModules/' + className) && fs.list('modules/'+ className)) {
                module.hasReset = true;
            } else {
                module.hasReset = false;
            }

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
        var reply = {
                error: null,
                data: null,
                code: null
            }, 
            moduleData;

        if (!this.controller.modules.hasOwnProperty(moduleId)) {
            reply.code = 404;
            reply.error = 'Instance ' + moduleId + ' not found';
        } else {
            // get module data
            moduleData = this.controller.getModuleData(moduleId);

            if(moduleData.location === ('userModules/' + moduleId) && fs.list('modules/'+ moduleId)) {
                moduleData.hasReset = true;
            } else {
                moduleData.hasReset = false;
            }

            reply.code = 200;
            // replace namspace filters
            reply.data = this.controller.replaceNamespaceFilters(moduleData);
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
                error: {
                    key: null,
                    errorMsg: null
                },
                data: {
                    key: null,
                    appendix: null
                },
                code: 500
            },
            moduleUrl = this.req.body.moduleUrl;
            
        var result = "in progress";
        var moduleId = moduleUrl.split(/[\/]+/).pop().split(/[.]+/).shift();

        if (!this.controller.modules[moduleId]) {
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
                
                loadSuccessfully = this.controller.loadInstalledModule(moduleId, 'userModules/');

                if(loadSuccessfully){
                    reply.code = 201;
                    reply.data.key = "app_installation_successful"; // send language key as response
                } else {
                    reply.code = 201;
                    reply.data.key = "app_installation_successful_but_restart_necessary"; // send language key as response
                }

            } else {
                reply.code = 500;
                reply.error.key = 'app_failed_to_install';
            }
        } else {
            reply.code = 409;
            reply.error.key = 'app_from_url_already_exist';
        }
        return reply;
    },
    updateModule: function () {
        var reply = {
                error: {
                    key: null,
                    errorMsg: null
                },
                data: {
                    key: null,
                    appendix: null
                },
                code: 500
            },
            moduleUrl = this.req.body.moduleUrl;
            
        var result = "in progress";
        var moduleId = moduleUrl.split(/[\/]+/).pop().split(/[.]+/).shift();

        if (this.controller.modules[moduleId]) {
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

                loadSuccessfully = this.controller.reinitializeModule(moduleId, 'userModules/');

                if(loadSuccessfully){
                    reply.code = 200;
                    reply.data.key = "app_update_successful"; // send language key as response
                } else {
                    reply.code = 200;
                    reply.data.key = "app_update_successful_but_restart_necessary"; // send language key as response
                }

            } else {
                reply.code = 500;
                reply.error.key = 'app_failed_to_update';
            }
        } else {
            reply.code = 404;
            reply.error.key = 'app_from_url_not_exist';
        }
        return reply;
    },
    deleteModule: function (moduleId) {
        var reply = {
                error: {
                    key: null,
                    errorMsg: null
                },
                data: {
                    key: null,
                    appendix: null
                },
                code: 500
            }, 
            unload;
            
        var result = "in progress";

        if (this.controller.modules[moduleId]) {

            unload = this.controller.unloadModule(moduleId);

            if (unload === 'success') {
                try {
                    installer.remove(
                        moduleId,
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
                        
                        reply.code = 200;
                        reply.data.key = "app_delete_successful"; // send language key as response
                    } else {
                        reply.code = 500;
                        reply.error.key = 'app_failed_to_delete';
                    }
                } catch (e) {
                    reply.code = 500;
                    reply.error.key = 'app_failed_to_delete';
                    reply.error.errorMsg = e;
                }
            } else {
                reply.code = 500;
                reply.error.key = 'app_failed_to_delete';
                reply.error.errorMsg = unload;
            }       
        } else {
            reply.code = 404;
            reply.error.key = 'app_not_exist';
        }
        return reply;
    },
    resetModule: function (moduleId) {
        var reply = {
                error: {},
                data: {},
                code: 500
            }, 
            unload;
            
        var result = "in progress";

        if (this.controller.modules[moduleId]) {

            if (this.controller.modules[moduleId].location === ('userModules/' + moduleId) && fs.list('modules/' + moduleId)){

                unload = this.controller.unloadModule(moduleId);

                if (unload === 'success') {
                    try {
                        installer.remove(
                            moduleId,
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

                            loadSuccessfully = this.controller.loadInstalledModule(moduleId, 'modules/');
                            
                            if(loadSuccessfully) {
                                reply.code = 200;
                                reply.data.key = 'app_reset_successful_to_version';
                                reply.data.appendix = this.controller.modules[moduleId].meta.version; 
                            } else {
                                reply.code = 200;
                                reply.data.key = "app_reset_successful_but_restart_necessary"; // send language key as response
                            }
                        } else {
                            reply.code = 500;
                            reply.error.key = 'app_failed_to_remove_old';
                        }
                    } catch (e) {
                        reply.code = 500;
                        reply.error.key = 'app_failed_to_reset';
                        reply.error.errMsg = e;
                    }
                } else {
                    reply.code = 500;
                    reply.error.key = 'app_failed_to_reset';
                    reply.error.errMsg = unload;
                }       
            } else {
                reply.code = 412;
                reply.error.key = 'app_is_still_reseted';
            }
        } else {
            reply.code = 404;
            reply.error.key = 'app_not_exist';
        }
        return reply;
    },
    getModuleTokens: function () {
        var reply = {
                    error: null,
                    data: null,
                    code: 500
                }, 
                tokenObj = {
                    tokens: []
                },
                getTokens = function () {
                    return loadObject('moduleTokens.json');
                };

        if (getTokens() === null) {
            saveObject('moduleTokens.json', tokenObj);
        }
            
        if (!!getTokens()) {
            reply.data = getTokens();
            reply.code = 200;
        } else {
            reply.error = 'failed_to_load_tokens';
        }

        return reply;
    },
    storeModuleToken: function () {
        var reply = {
                    error: null,
                    data: null,
                    code: 500
                },
                reqObj = typeof this.req.body === 'string'? JSON.parse(this.req.body) : this.req.body,
                tokenObj = loadObject('moduleTokens.json');

        if (tokenObj === null) {
            saveObject('moduleTokens.json', tokenObj);

            // try to load it again
            tokenObj = loadObject('moduleTokens.json');
        }

        if (reqObj && reqObj.token && !!tokenObj && tokenObj.tokens) {
            if (tokenObj.tokens.indexOf(reqObj.token) < 0) {
                // add new token id
                tokenObj.tokens.push(reqObj.token);

                // save tokens
                saveObject('moduleTokens.json', tokenObj);

                reply.data = tokenObj;
                reply.code = 201;
            } else {
                reply.code = 409;
                reply.error = 'token_not_unique';
            }
        } else {
            reply.error = 'failed_to_load_tokens';
        }

        return reply;
    },
    deleteModuleToken: function () {
        var reply = {
                    error: null,
                    data: null,
                    code: 500
                },
                reqObj = typeof this.req.body === 'string'? JSON.parse(this.req.body) : this.req.body,
                tokenObj = loadObject('moduleTokens.json');

        if (reqObj && reqObj.token && !!tokenObj && tokenObj.tokens) {
            if (tokenObj.tokens.indexOf(reqObj.token) > -1) {
                // add new token id
                tokenObj.tokens = _.filter(tokenObj.tokens, function(token) {
                    return token !== reqObj.token;
                });

                // save tokens
                saveObject('moduleTokens.json', tokenObj);

                reply.data = tokenObj;
                reply.code = 200;
            } else {
                reply.code = 404;
                reply.error = 'not_existing_token';
            }
        } else {
            reply.error = 'failed_to_load_tokens';
        }

        return reply;
    },
    // instances
    listInstances: function () {
        var reply = {
                    error: null,
                    data: null,
                    code: 200
                },
            instances = this.controller.listInstances();
        if(instances){
            reply.data = instances;
        } else {
            reply.code = 500;
            reply.error = 'Could not list Instances.';
        }
        

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
        
        if(isNaN(instanceId)){
            instance = _.filter(this.controller.instances, function (i) { return instanceId === i.moduleId; });
        } else {
            instance = _.find(this.controller.instances, function (i) { return parseInt(instanceId) === i.id; });
        }

        if (!Boolean(instance) || instance.length === 0) {
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
            getProfile,
            filteredProfile = {},
            excl = [];

        // list all profiles only if user has 'admin' permissions
        if (!_.isNumber(profileId)) {
            if (this.req.role === this.ROLE.ADMIN) {
                profiles = this.controller.getListProfiles();
            } else {
                getProfile = this.controller.getProfile(this.req.user);
                if (getProfile && this.req.user === getProfile.id) {
                    profiles = [profile];
                }
            }
            if (!Array.isArray(profiles)) {
                reply.code = 500;
                reply.error = "Unknown error. profiles isn't array";
            } else {
                reply.code = 200;
                reply.data = profiles;
            }
        } else {
            getProfile = this.controller.getProfile(profileId);
            if (!!getProfile && (this.req.role === this.ROLE.ADMIN || (this.req.role === this.ROLE.USER && this.req.user === getProfile.id))) {

                // do not send password (also role if user is no admin)
                if(this.req.role === this.ROLE.ADMIN){
                    excl = ["password"];
                } else {
                    excl = ["password", "role"];
                }                
        
                for (var property in getProfile) {
                    if(excl.indexOf(property) === -1){
                        filteredProfile[property] = getProfile[property];
                    }
                }

                reply.code = 200;
                reply.data = filteredProfile;
            } else {
                reply.code = 404;
                reply.error = "Profile not found.";
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
            reqObj,
            profile,
            resProfile = {};

        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
        }

        nameAllreadyExists = Boolean(_.find(this.controller.profiles, function (profile) {
                                        return profile.login === reqObj.login;
                                    }));

        if (nameAllreadyExists === false) {
            _.defaults(reqObj, {
                role: null,
                name: 'User',
                email:'',
                lang: 'en',
                color: '#dddddd',
                dashboard: [],
                interval: 2000,
                rooms: [0],
                expert_view: false,
                hide_all_device_events: false,
                hide_system_events: false,
                hide_single_device_events: []
            });
            profile = this.controller.createProfile(reqObj);
            if (profile !== undefined && profile.id !== undefined) {
                
                
                
                reply.data = resProfile;
                reply.code = 201;
            } else {
                reply.code = 500;
                reply.error = "Profile creation error";
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
            profile = this.controller.getProfile(profileId),
            uniqueProfProps = [];
        
        if (profile && (this.req.role === this.ROLE.ADMIN || (this.req.role === this.ROLE.USER && this.req.user === profile.id))) {
            reqObj = JSON.parse(this.req.body);

            if (profile.id === this.req.user && profile.role === this.ROLE.ADMIN && reqObj.role !== this.ROLE.ADMIN) {
                reply.code = 403;
                reply.error = "Revoking self Admin priviledge is not allowed.";
            } else {
                uniqueProfProps = _.filter(this.controller.profiles, function (p) {
                    return ((p.email !== '' && p.email === reqObj.email) ||
                                (p.login !== '' && p.login === reqObj.login)) && 
                                    p.id !== profileId;
                });

                if (uniqueProfProps.length === 0) {
                    // only Admin can change critical parameters
                    if (this.req.role === this.ROLE.ADMIN) {
                        // id is never changeable
                        // login is changed by updateProfileAuth()
                        profile.role = reqObj.role;                    
                        profile.rooms = reqObj.rooms.indexOf(0) > -1? reqObj.rooms : reqObj.rooms.push(0);
                        profile.expert_view = reqObj.expert_view;
                    }
                    // could be changed by user role
                    profile.name = reqObj.name; // profile name
                    profile.interval = reqObj.interval; // update interval from ui
                    profile.hide_system_events = reqObj.hide_system_events;
                    profile.hide_all_device_events = reqObj.hide_all_device_events;
                    profile.lang = reqObj.lang;
                    profile.color = reqObj.color;
                    profile.dashboard = reqObj.dashboard;
                    profile.hide_single_device_events = reqObj.hide_single_device_events;
                    profile.email = reqObj.email;
                    
                    profile = this.controller.updateProfile(profile, profile.id);
                    
                    if (profile !== undefined && profile.id !== undefined) {
                        reply.data = this.getProfileResponse(profile);
                        reply.code = 200;
                    } else {
                        reply.code = 500;
                        reply.error = "Profile was not created";
                    }
                } else {
                    reply.code = 409;
                    reply.error = 'Login or e-mail already exists.';
                }
            }
        } else {
            reply.code = 404;
            reply.error = "Profile not found.";
        }

        return reply;
    },
    // different pipe for updating authentication values
    updateProfileAuth: function (profileId) {
        var self = this,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            reqObj,
            profile = this.controller.getProfile(profileId),
            uniqueLogin = [],
            reqToken = this.req.reqObj.hasOwnProperty("token")? this.req.reqObj.token : null,
            tokenObj = {};
        
        if (typeof this.req.body !== 'object') {
            reqObj = JSON.parse(this.req.body);
        } else {
            // !!! do we need this branch of else?
            console.log("throw");
            throw "updateProfileAuth";
            reqObj = this.req.body;
        }

        if (profile && (this.req.role === this.ROLE.ADMIN || (this.req.role === this.ROLE.USER && this.req.user === profile.id))) {

            uniqueLogin = _.filter(this.controller.profiles, function (p) {
                if (self.req.role === self.ROLE.ADMIN && self.req.user !== reqObj.id) {
                    return p.login !== '' && p.login === reqObj.login && p.id !== reqObj.id;
                } else {
                    return p.login !== '' && p.login === reqObj.login && p.id !== self.req.user;
                }
            });

            if (uniqueLogin.length < 1) {
                profile = this.controller.updateProfileAuth(reqObj, profileId);
                
                if (!!profile && profile.id !== undefined) {
                    reply.data = this.getProfileResponse(profile);
                    reply.code = 200;
                } else {
                    reply.code = 500;
                    reply.error = "Was not able to update password.";
                }
            } else {
                reply.code = 409;
                reply.error = 'Login already exists.';
            }
        } else if (this.req.role === this.ROLE.ANONYMOUS && profileId && !!reqToken) {
            tokenObj = self.controller.auth.getForgottenPwdToken(reqToken);
                
            if (tokenObj && !!tokenObj) {
                profile = this.controller.updateProfileAuth(reqObj, profileId);

                if (!!profile && profile.id !== undefined) {
                    // remove forgotten token
                    self.controller.auth.removeForgottenPwdEntry(reqToken);
                    
                    reply.code = 200;
                } else {
                    reply.code = 500;
                    reply.error = "Was not able to update password.";
                }
            } else {
                reply.code = 404;
                reply.error = "Token not found.";
            }
        } else {
            reply.code = 403;
            reply.error = "Forbidden.";
        }

        return reply;
    },
    restorePassword: function (profileId) {
        var self = this,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            reqObj = typeof this.req.body !== 'object'? JSON.parse(this.req.body): this.req.body,
            reqToken = this.req.query.hasOwnProperty("token")? this.req.query.token : null,
            profile,
            emailExists = [],
            tokenObj;        

        if (reqObj.email) {
            emailExists = _.filter(self.controller.profiles, function (profile) {
                return profile.email !== '' && profile.email === reqObj.email;
            });
        }

        if (reqToken === null && emailExists.length > 0 && !profileId) {
            
            try {
                var tkn = crypto.guid(),
                    success = self.controller.auth.forgottenPwd(reqObj.email, tkn);
                
                if (success) {
                    reply.data = { token: tkn };
                    reply.code = 200;
                } else {
                    reply.error = "Token request for e-mail already exists.";
                    reply.code = 409;
                }                
            
            } catch (e) {
                reply.code = 500;
                reply.error = "Internal server error.";
            }
        } else if (!!reqToken && emailExists.length < 1 && !profileId){
            try {
                tokenObj = self.controller.auth.getForgottenPwdToken(reqToken);
                
                if (tokenObj && !!tokenObj) {

                    profile = _.filter(self.controller.profiles,function(p) {
                        return p.email === tokenObj.email; 
                    });

                    if(profile[0]) {
                        reply.code = 200;
                        reply.data = { userId: profile[0].id };
                    } else {
                        reply.code = 404;
                        reply.error = "User not found.";
                    }
                } else {
                    reply.code = 404;
                    reply.error = "Token not found.";
                }            
            } catch (e) {
                reply.code = 500;
                reply.error = "Internal server error.";
            }
        } else if (!!reqToken && emailExists.length < 1 && profileId) {

            profile = self.controller.updateProfileAuth(reqObj, profileId);
            
            if (!!profile && profile.id !== undefined) {
                reply.code = 200;
            } else {
                reply.code = 500;
                reply.error = "Wasn't able to update password.";
            }
        } else {
            reply.code = 404;
            reply.error = "Email not found.";
        }

        return reply;
    },
    removeProfile: function (profileId) {
        var reply = {
            error: null,
            data: null,
            code: 500
            },
        profile = this.controller.getProfile(profileId);
        
        if (profile) {
            // It is not possible to delete own profile
            if (profile.id !== this.req.user) {
                this.controller.removeProfile(profileId);
                reply.data = null;
                reply.code = 204;
            } else {
                reply.code = 403;
                reply.error = "Deleting own profile is not allowed.";
            }
        } else {
            reply.code = 404;
            reply.error = "Profile not found";
        }

        return reply;
    },
    // namespaces
    listNamespaces: function () {
        var reply = {
            error: null,
            data: null,
            code: 500
        },
        nspc;

        nspc = this.controller.namespaces;

        if (_.isArray(nspc) && nspc.length > 0) {
            reply.data = nspc;
            reply.code = 200;
        } else {
            reply.code = 404;
            reply.error = "Namespaces array is null";
        }

        return reply;
    },
    getNamespaceFunc: function (namespaceId) {
       var reply = {
            error: null,
            data: null,
            code: 500
        },
        namespace;

        namespace = this.controller.getListNamespaces(namespaceId, this.controller.namespaces);
        if (!namespace || (_.isArray(namespace) && namespace.length < 1)) {
            reply.code = 404;
            reply.error = "No namespaces found with this path: " + namespaceId;
        } else {
            reply.data = namespace;
            reply.code = 200;
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

        if (this.deviceByUser(vDevId, this.req.user) !== null) {
            show = this.req.query.hasOwnProperty("show")? (view.indexOf(parseInt(this.req.query.show, 10)) > -1 ? parseInt(this.req.query.show, 10) : 0) : 0;
            since = this.req.query.hasOwnProperty("since") ? parseInt(this.req.query.since, 10) : 0;
            history = this.controller.listHistories();
            hash = this.controller.hashCode(vDevId);

            if (history) {
                dev = history.filter(function(x) {
                    return x.h === hash;
                });
                
                if (dev.length > 0) {
                    sinceDevHist = this.controller.getDevHistory(dev, since, show);            
                    
                    if (dev && sinceDevHist) {
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
            reply.code = 404;
            reply.error = "Device not found.";
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
    loadModuleMedia: function(moduleName, fileName) {
        var reply = {
                error: null,
                data: null,
                code: 200
            },
            obj;

        if ((moduleName !== '' || !!moduleName || moduleName) && (fileName !== '' || !!fileName || fileName)) {
            obj = this.controller.loadModuleMedia(moduleName,fileName);
    
            if (!this.controller.modules[moduleName]) {
                reply.code = 404;
                reply.error = "Can't load file from app because app '" + moduleName + "' was not found." ;
                
                return reply;

            } else if (obj !== null) {
                this.res.status = 200;
                this.res.headers = { 
                    "Content-Type": obj.ct,
                    "Connection": "keep-alive"
                };
                this.res.body = obj.data;

                return null; // let handleRequest take this.res as is
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

            return null; // let handleRequest take this.res as is
        } else {
            reply.code = 500;
            reply.error = "Failed to load file." ;
            
            return reply;
        }
    },
    uploadFile: function() {
        var reply = {
                error: null,
                data: null,
                code: 200
            },
            file;

        if (this.req.method === "POST" && this.req.body) {
            
            for (prop in this.req.body){
                if(this.req.body[prop]['content']) {
                    file = this.req.body[prop];
                }
            }
            
            if (_.isArray(file)) {
                file = file[0];
            }
            
            if (file && file.name && file.content || (_.isArray(file) && file.length > 0)) {

                if(~file.name.indexOf('.csv') && typeof Papa === 'object'){
                    var csv = null;
                    
                    Papa.parse(file.content, {
                        header: true,
                        dynamicTyping: true,
                        complete: function(results) {
                            csv = results;
                        }
                    });

                    if(!!csv) {
                        saveObject(file.name, csv);
                    }
                } else {
                    // Create Base64 Object
                    saveObject(file.name, Base64.encode(file.content));
                }

                reply.code = 200;
                reply.data = file.name;

            } else {
                reply.code = 500;
                reply.error = "Failed to upload file" ;
            }
        } else {
            reply.code = 400;
            reply.error = "Invalid request" ;
        }
        return reply;
    },
    backup: function () {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            backupJSON = {};

        var list = loadObject("__storageContent");

        try {        
            // save all objects in storage
            for (var ind in list) {
                backupJSON[list[ind]] = loadObject(list[ind]);
            }
            
            // save Z-Way and EnOcean objects
            if (!!global.ZWave) {
                backupJSON["__ZWay"] = {};
                global.ZWave.list().forEach(function(zwayName) {
                    var bcp = "",
                        data = new Uint8Array(global.ZWave[zwayName].zway.controller.Backup());
                    
                    for(var i = 0; i < data.length; i++) {
                        bcp += String.fromCharCode(data[i]);
                    }

                    backupJSON["__ZWay"][zwayName] = bcp;
                });
            }
            /* TODO
            if (!!global.EnOcean) {
                backupJSON["__EnOcean"] = {};
                global.EnOcean.list().forEach(function(zenoName) {
                    // backupJSON["__EnOcean"][zenoName] = global.EnOcean[zenoName].zeno.controller.Backup();
                });
            }
            */
            reply.code = 200;
            reply.data = backupJSON;
        } catch(e) {
            reply.code = 500;
            reply.error = e.toString();
        }
        
        return reply;
    },
    restore: function () {
        var reqObj,
            reply = {
                error: null,
                data: null,
                code: 500
            };

        try {
            //this.reset();
            
            reqObj = JSON.parse(this.req.body.backupFile.content);
            
            for (var obj in reqObj) {
                if (obj === "__ZWay" || obj === "__EnOcean") break;
                saveObject(obj, reqObj[obj]);
            }

            // restart controller to apply config.json and other modules configs
            this.controller.restart();
            
            // restore Z-Wave and EnOcean
            !!reqObj["__ZWay"] && Object.keys(reqObj["__ZWay"]).forEach(function(zwayName) {
                var zwayData = reqObj["__ZWay"][zwayName];
                global.ZWave[zwayName] && global.ZWave[zwayName].zway.controller.Restore(zwayData, false);
            });
            /* TODO
            !!reqObj["__EnOcean"] && reqObj["__EnOcean"].forEach(function(zenoName) {
                // global.EnOcean[zenoName] && global.EnOcean[zenoName].zeno.Restore(reqObj["__EnOcean"][zenoName]);
            });
            */
            
            // success
            reply.code = 200;
        } catch (e) {
            reply.error = e.toString();
        }
        
        return reply;
    },
    // reinitialize modules
    reinitializeModule: function(moduleId) {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            location = fs.list('userModules/' + moduleId)? 'userModules/' : 'modules/';

        if (fs.list(location)) {
            try {
                loadSuccessfully = this.controller.reinitializeModule(moduleId, location);
                
                if(loadSuccessfully){
                    reply.data = 'Reinitialization of app "' + moduleId + '" successfull.',
                    reply.code = 200;
                }
            } catch (e) {
                reply.error = e.toString();
            }
        } else {
            reply.code = 404;
            reply.error.key = "App not found.";
        }
        
        return reply;
    }
});

ZAutomationAPIWebRequest.prototype.profileByUser = function(userId) {
    return _.find(this.controller.profiles, function(profile) { return profile.id === userId });
};

ZAutomationAPIWebRequest.prototype.devicesByUser = function(userId, filter) {
    var devices = this.controller.devices.filter(filter),
        profile = this.profileByUser(userId);

    if (!profile) {
        return [];
    }
    
    if (profile.role === this.ROLE.ADMIN) {
        return devices;
    } else {
        if (!!profile.rooms) {
            return devices.filter(function(dev) {
                // show only devices from allowed rooms (don't show unallocated devices)
                return dev.get("location") != 0 && profile.rooms.indexOf(dev.get("location")) !== -1;
            });
        } else {
            return [];
        }
    }
};

ZAutomationAPIWebRequest.prototype.deviceByUser = function(vDevId, userId) {
    if (this.devicesByUser(userId).filter(function (device) { return device.id === vDevId }).length) {
        return this.controller.devices.get(vDevId);
    }
    return  null;
};

ZAutomationAPIWebRequest.prototype.locationsByUser = function(userId) {
    var profile = this.profileByUser(userId);
    
    if (!profile) {
        return [];
    }
    
    if (profile.role === this.ROLE.ADMIN) {
        return this.controller.locations;
    } else {
        if (!!profile.rooms) {
            return this.controller.locations.filter(function(location) {
                return profile.rooms.indexOf(location.id) !== -1;
            });
        } else {
            return [];
        }
    }
};

ZAutomationAPIWebRequest.prototype.getProfileResponse = function (profileObj) {
    var self = this,
        resProfile = {};

    Object.keys(profileObj).forEach(function(value){
        if (!~self.exclFromProfileRes.indexOf(value)) {
            resProfile[value] = profileObj[value];
        }
    });

    return resProfile;
};

ZAutomationAPIWebRequest.prototype.Unauthorized = function () {
    return {
        error: 'Not logged in',
        data: null,
        code: 401
    };
}

ZAutomationAPIWebRequest.prototype.Forbidden = function () {
    return {
        error: 'Permission denied',
        data: null,
        code: 403
    };
}

ZAutomationAPIWebRequest.prototype.dispatchRequest = function (method, url) {
    var self = this,
        handlerFunc = this.NotFound, // Default handler is NotFound
        validParams;

    if ("OPTIONS" === method) {
        handlerFunc = this.CORSRequest;
        return handlerFunc;
    } else {
        var matched = this.router.dispatch(method, url);
        if (matched) {
            var auth = this.controller.auth.resolve(this.req, matched.role);
            if (!auth) {

                return this.Unauthorized;

            } else if (this.controller.auth.isAuthorized(auth.role, matched.role)) {

                // fill user field
                this.req.user = auth.user;
                this.req.role = auth.role;
                
                if (matched.params.length) {
                    validParams = _.every(matched.params), function(p) { return !!p; };
                    if (validParams) {
                        handlerFunc = function () {
                            return matched.handler.apply(this, matched.params);
                        }
                    }
                } else {
                    handlerFunc = matched.handler;
                }

                // --- Proceed to checkout =)
                return handlerFunc;

            } else {

                return this.Forbidden;

            }
        }
    }
};
