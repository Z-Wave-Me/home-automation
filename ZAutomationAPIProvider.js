/*** ZAutomationAPI Provider **************************************************

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
        'password',
        'salt'
    ];

    this.registerRoutes();
};

var ZAutomationWebRequest = ZAutomationWebRequest || function() {};
inherits(ZAutomationAPIWebRequest, ZAutomationWebRequest);

_.extend(ZAutomationAPIWebRequest.prototype, {
    registerRoutes: function() {
        this.router.get("/status", this.ROLE.USER, this.statusReport);
        this.router.get("/session", this.ROLE.ANONYMOUS, this.verifySession);
        this.router.post("/login", this.ROLE.ANONYMOUS, this.verifyLogin);
        this.router.get("/logout", this.ROLE.USER, this.doLogout);
        this.router.get("/notifications", this.ROLE.USER, this.exposeNotifications);
        this.router.put("/notifications", this.ROLE.ADMIN, this.redeemNotifications);
        this.router.del("/notifications", this.ROLE.ADMIN, this.deleteNotifications);
        this.router.get("/history", this.ROLE.USER, this.exposeHistory);
        this.router.del("/history", this.ROLE.USER, this.exposeHistory);
        this.router.get("/devices", this.ROLE.USER, this.listDevices);
        this.router.get("/restart", this.ROLE.ADMIN, this.restartController);
        this.router.get("/locations", this.ROLE.USER, this.listLocations);
        this.router.get("/profiles", this.ROLE.USER, this.listProfiles);
        this.router.get("/namespaces", this.ROLE.ADMIN, this.listNamespaces);
        this.router.post("/profiles", this.ROLE.ADMIN, this.createProfile);
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

        this.router.get("/notifications/:notification_id", this.ROLE.USER, this.exposeNotifications, [parseInt]);
        this.router.del("/notifications/:notification_id", this.ROLE.USER, this.deleteNotifications, [parseInt]);
        this.router.put("/notifications/:notification_id", this.ROLE.USER, this.redeemNotifications, [parseInt]);

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
        
        this.router.get("/modules/categories/:category_id", this.ROLE.ADMIN, this.getModuleCategoryFunc);
        
        this.router.get("/modules/:module_id", this.ROLE.ADMIN, this.getModuleFunc);

        this.router.get("/namespaces/:namespace_id", this.ROLE.ADMIN, this.getNamespaceFunc);

        this.router.get("/history/:dev_id", this.ROLE.USER, this.getDevHist);
        this.router.del("/history/:dev_id", this.ROLE.USER, this.getDevHist);

        this.router.get("/load/modulemedia/:module_name/:file_name", this.ROLE.ANONYMOUS, this.loadModuleMedia);
        
        this.router.get("/load/image/:img_name", this.ROLE.ANONYMOUS, this.loadImage);

        this.router.get("/backup", this.ROLE.ADMIN, this.backup);
        this.router.post("/restore", this.ROLE.ADMIN, this.restore);
        this.router.get("/resetToFactoryDefault", this.ROLE.ADMIN, this.resetToFactoryDefault);

        // skins tokens
        this.router.get("/skins/tokens", this.ROLE.ADMIN, this.getSkinTokens);
        this.router.put("/skins/tokens", this.ROLE.ADMIN, this.storeSkinToken);
        this.router.del("/skins/tokens", this.ROLE.ADMIN, this.deleteSkinToken);

        this.router.get("/skins", this.ROLE.ADMIN, this.getSkins);
        this.router.post("/skins/install", this.ROLE.ADMIN, this.addOrUpdateSkin);
        this.router.put("/skins/update/:skin_id", this.ROLE.ADMIN, this.addOrUpdateSkin);
        this.router.get("/skins/setToDefault", this.ROLE.ADMIN, this.setDefaultSkin);
        this.router.get("/skins/active", this.ROLE.ANONYMOUS, this.getActiveSkin);
        this.router.get("/skins/:skin_id", this.ROLE.ADMIN, this.getSkin);
        this.router.put("/skins/:skin_id", this.ROLE.ADMIN, this.activateOrDeactivateSkin);
        this.router.del("/skins/:skin_id", this.ROLE.ADMIN, this.deleteSkin);

        this.router.get("/icons", this.ROLE.ADMIN, this.getIcons);
        this.router.del("/icons/:icon_id", this.ROLE.ADMIN, this.deleteIcons);
        this.router.post("/icons/upload", this.ROLE.ADMIN, this.uploadIcon);
        this.router.post("/icons/install", this.ROLE.ADMIN, this.addOrUpdateIcons);

        this.router.get("/system/webif-access", this.ROLE.ADMIN, this.setWebifAccessTimout);
        this.router.get("/system/reboot", this.ROLE.ADMIN, this.rebootBox);

        this.router.post("/system/timezone", this.ROLE.ADMIN, this.setTimezone);
        this.router.get("/system/time/get", this.ROLE.ANONYMOUS, this.getTime);
        this.router.get("system/time/ntp/:action", this.ROLE.ADMIN, this.configNtp);

        this.router.get("/system/remote-id", this.ROLE.ANONYMOUS, this.getRemoteId);
        this.router.get("/system/first-access", this.ROLE.ANONYMOUS, this.getFirstLoginInfo);
        this.router.get("/system/info", this.ROLE.ANONYMOUS, this.getSystemInfo);

        this.router.post("/system/wifi/settings", this.ROLE.ADMIN, this.setWifiSettings);
        this.router.get("/system/wifi/settings", this.ROLE.ADMIN, this.getWifiSettings);

        this.router.post("/system/certfxAuth",this.ROLE.ANONYMOUS,this.certfxAuth);
        this.router.post("/system/certfxAuthForwarding",this.ROLE.ADMIN,this.certfxSetAuthForwarding);
        this.router.get("/system/certfxAuthForwarding",this.ROLE.ADMIN,this.certfxGetAuthForwarding);
        this.router.post("/system/certfxUnregister",this.ROLE.ADMIN,this.certfxUnregister);
        this.router.post("/system/certfxUpdateIdentifier",this.ROLE.ADMIN,this.certfxUpdateIdentifier);

        this.router.get("/system/zwave/deviceInfoGet",this.ROLE.ADMIN, this.zwaveDeviceInfoGet);
        this.router.get("/system/zwave/deviceInfoUpdate",this.ROLE.ADMIN, this.zwaveDeviceInfoUpdate);
        this.router.get("/system/zwave/vendorsInfoGet",this.ROLE.ADMIN, this.zwaveVendorsInfoGet);
        this.router.get("/system/zwave/vendorsInfoUpdate",this.ROLE.ADMIN, this.zwaveVendorsInfoUpdate);

        this.router.put("/devices/reorder", this.ROLE.ADMIN, this.reorderDevices);
    },

    // Used by the android app to request server status
    statusReport: function () {
        var currentDateTime = new Date(),
            reply = {
                error: null,
                data: 'OK',
                code: 200
            };

        if (Boolean(this.error)) {
            reply.error = "Internal server error. Please fill in bug report with request_id='" + this.error + "'";
            reply.data = null;
            reply.code = 503;
            reply.message = "Service Unavailable";
        } 

        return reply;
    },

    setLogin: function(profile) {
        var sid = crypto.guid(),
            resProfile = {};

        this.controller.auth.checkIn(profile, sid);

        resProfile = this.getProfileResponse(profile);
        resProfile.sid = sid;

        if (profile.password !== 'admin' && !this.controller.config.hasOwnProperty('firstaccess') || this.controller.config.firstaccess === true) {
            this.controller.config.firstaccess = false;
        }

        // if showWelcome flag is set in controller add showWelcome flag to profile and remove it from controller
        if (!this.controller.config.firstaccess && this.controller.config.showWelcome) {
            resProfile.showWelcome = true;

            delete this.controller.config.showWelcome;
            this.controller.saveConfig();
        }

        return {
            error: null,
            data: resProfile,
            code: 200,
            headers: {
                "Set-Cookie": "ZWAYSession=" + sid + "; Path=/; HttpOnly"// set cookie - it will duplicate header just in case client prefers cookies
            }
        };
    },    
    // Method to return a 401 to the user
    denyLogin: function(error) {
        return {
            error: error,
            data: null,
            code: 401,
            headers: {
                "Set-Cookie": "ZWAYSession=deleted; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT" // clean cookie
            }
        }
    },
    // Returns user session information for the smarthome UI
    verifySession: function() {
        var auth = controller.auth.resolve(this.req, 2);
        
        if (!auth) {
            return this.denyLogin("No valid user session found");
        }
        
        var profile = _.find(this.controller.profiles, function (profile) {
            return profile.id === auth.user;
        });
        
        return this.setLogin(profile);
    },
    // Check if login exists and password is correct 
    verifyLogin: function() {
        var reqObj;

        try {
            reqObj = parseToObject(this.req.body);
        } catch (ex) {
            return {
                error: ex.message,
                data: null,
                code: 500,
                headers: null
            };
        }

        var profile = _.find(this.controller.profiles, function (profile) {
            return profile.login === reqObj.login;
        });

        //if ((profile && reqObj.password === profile.password) || (profile && boxTypeIsCIT)) {
        /*if (profile &&
         ((!profile.salt && profile.password === reqObj.password || profile.salt && profile.password === hashPassword(reqObj.password, profile.salt)) ||
         (this.authCIT() && (!profile.salt && profile.password === reqObj.password || profile.salt && profile.password === hashPassword(reqObj.password, profile.salt))))) {
         */

        if (profile) {
            // check if the pwd matches
            var pwd_check = reqObj.password ? (!profile.salt && profile.password === reqObj.password) || (profile.salt && profile.password === hashPassword(reqObj.password, profile.salt)) : false;

            // do login if
            // - login & pwd match (no cit)
            // - registered cit & login and pwd match
            // - registered cit & login forwarding is active
            //if ((!checkBoxtype('cit') && pwd_check) || (this.authCIT() && (pwd_check || this.controller.allowLoginForwarding(this.req)))) { // deactivate forwarding
            if ((!checkBoxtype('cit') && pwd_check) || (this.authCIT() && pwd_check)) {

                // set qr code only box is no CIT
                if(!checkBoxtype('cit') && !profile.hasOwnProperty('qrcode') || profile.qrcode === "") {
                    this.controller.addQRCode(profile, reqObj);
                }
                return this.setLogin(profile);
            } else {
                return this.denyLogin();
            }
        } else {
            return this.denyLogin();
        }
    },
    
    doLogout: function() {
        var reply = {
                error: null,
                data: null,
                code: 400,
                headers: null
            },
            session;
        
        var sessionId = this.controller.auth.getSessionId(this.req);

        if (sessionId) {
            //session = this.req.headers.ZWAYSession;

            reply.headers = {
                "Set-Cookie": "ZWAYSession=deleted; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT" // clean cookie
            };

            reply.code = 200;

            if (this.controller.auth.sessions[sessionId]) {
                delete this.controller.auth.sessions[sessionId];
            }
        } else {
            reply.code = 404;
            reply.error = 'Could not logout. No session found.';
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
            device = null,
            reply = {
                error: null,
                data: null,
                code: 500,
            },
            result = false;

        try {
            reqObj = typeof this.req.body === 'string' ? JSON.parse(this.req.body) : this.req.body;
        } catch (ex) {
            reply.error = ex.message;
            return reply;
        }

        if(this.req.query.hasOwnProperty('icon')) {
            device = this.controller.devices.get(vDevId);
            if(device) {
                device.set('customIcons', reqObj.customicons, {silent:true});
                reply.data = "OK";
                result = true;
            }
        } else {
            device = this.deviceByUser(vDevId, this.req.user);
            if (device) {
                reply.data = device.set(reqObj);
                result = true;
            }
        }

        if(result) {
            reply.code = 200;
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
    exposeNotifications: function (notificationId) {
        var notifications,
            reply = {
                error: null,
                data: null,
                code: 200
            },
            timestamp = new Date().getTime(),
            since = this.req.query.hasOwnProperty("since") ? parseInt(this.req.query.since, 10) : 0,
            to = (this.req.query.hasOwnProperty("to") ? parseInt(this.req.query.to, 10) : 0) || timestamp,
            profile = this.profileByUser(this.req.user),
            devices = this.devicesByUser(this.req.user).map(function(device) { return device.id; }),
            test = function(n) {
                return ((profile.hide_system_events === false && n.level !== 'device-info') || // hide_system_events = false
                    (profile.hide_all_device_events === false && n.level === 'device-info')) && // hide_device_events = false
                    (!profile.hide_single_device_events || profile.hide_single_device_events.indexOf(n.source) === -1) && // remove events from devices to hide
                    ((n.level !== 'device-info' && devices.indexOf(n.source) === -1) || (n.level === 'device-info' && devices.indexOf(n.source) > -1));//  filter device by user
            };

        if (notificationId) {

            notification = this.controller.notifications.get().filter(function (notification) {
                return notification.id === notificationId && // filter by id
                        test(notification); // check against 2nd filter
            });

            if (notification.length > 0 ) {
                reply.data = notification[0];
            } else {
                reply.code = 404;
                reply.error = 'Not found';
            }

        } else {
            notifications = this.controller.notifications.get().filter(function (notification) {
                return  notification.id >= since && notification.id <= to && // filter by time
                        test(notification); // check against 2nd filter
            });

            reply.data = {
                updateTime: Math.floor(timestamp/1000),
                notifications: notifications
            };
        }

        if (Boolean(this.req.query.pagination)) {
            reply.data.total_count= notifications.length;
            // !!! fix pagination
            notifications = notifications.slice();
        }

        return reply;
    },
    // delete single notifications or all privious by a choosen timestamp
    deleteNotifications: function (notificationId) {

        var id = notificationId ? parseInt(notificationId) : 0,
            reply = {
                code: 500,
                data: null,
                error: "Something went wrong."
            },
            before;

        before = this.req.query.hasOwnProperty("allPrevious") ? Boolean(this.req.query.allPrevious) : false;
        redeemed = this.req.query.hasOwnProperty("allRedeemed") ? Boolean(this.req.query.allRedeemed) : false;

        if (!redeemed) {
            this.controller.deleteNotifications(id, before, function (notice) {
                if (notice) {
                    reply.code = 204;
                    reply.data = null;
                    reply.error = null;
                } else {
                    reply.code = 404;
                    reply.data = null;
                    reply.error = "Notifications not found.";
                }
            });
        } else {
            this.controller.deleteAllRedeemedNotifications(function (notice) {
                if (notice) {
                    reply.code = 204;
                    reply.data = null;
                    reply.error = null;
                }
            });
        }

        return reply;
    },
    // redeem single or all notifications (true/false)
    redeemNotifications: function (notificationId) {

        var id = notificationId ? parseInt(notificationId) : 0,
            reply = {
                code: 500,
                data: null,
                error: "Something went wrong."
            };

        redeemed = this.req.query.hasOwnProperty("set_redeemed") ? Boolean(this.req.query.set_redeemed) : true;
        all = this.req.query.hasOwnProperty("all") ? Boolean(this.req.query.all) : false;

        if (!all) {
            this.controller.redeemNotification(id, redeemed, function (notice) {
                if (notice) {
                    reply.code = 204;
                    reply.data = null;
                    reply.error = null;
                }
            });
        } else {
            this.controller.redeemAllNotifications(redeemed, function (notice) {
                if (notice) {
                    reply.code = 204;
                    reply.data = null;
                    reply.error = null;
                }
            });
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
            reply.code = 404;
            reply.error = 'Could not list locations.';
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
            show_background,
            main_sensors,
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
                show_background = reqObj.show_background || false;
                main_sensors = reqObj.main_sensors || [];
            }

            if (!!title && title.length > 0) {
                this.controller.updateLocation(id, title, user_img, default_img, img_type,show_background, main_sensors, function (data) {
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
            moduleUrl = parseToObject(this.req.body).moduleUrl,
            result = "",
            moduleId = moduleUrl.split(/[\/]+/).pop().split(/[.]+/).shift();

        if (!this.controller.modules[moduleId]) {
            
            // download and install the module
            result = this.controller.installModule(moduleUrl, moduleId);

            if (result === "done") {
                
                loadSuccessfully = this.controller.loadInstalledModule(moduleId, 'userModules/', false);

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
            moduleUrl = parseToObject(this.req.body).moduleUrl,
            result = "",
            moduleId = moduleUrl.split(/[\/]+/).pop().split(/[.]+/).shift();

        if (this.controller.modules[moduleId]) {

            // download and install/overwrite the module
            result = this.controller.installModule(moduleUrl, moduleId);

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
                    key: null
                },
                data: {
                    key: null,
                    appendix: null
                },
                code: 500
            }, 
            uninstall = false;

        if (this.controller.modules[moduleId]) {

            uninstall = this.controller.uninstallModule(moduleId);

            if (uninstall) {
                reply.code = 200;
                reply.data.key = "app_delete_successful"; // send language key as response
            } else {
                reply.code = 500;
                reply.error.key = 'app_failed_to_delete';
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

                uninstall = this.controller.uninstallModule(moduleId, true);

                if (uninstall) {
                    reply.code = 200;
                    reply.data.key = 'app_reset_successful_to_version';
                    reply.data.appendix = this.controller.modules[moduleId].meta.version; 
                } else {
                    reply.code = 500;
                    reply.error = 'There was an error during resetting the app ' + moduleId + '. Maybe a server restart could solve this problem.';
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
                reqObj = parseToObject(this.req.body),
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
                reqObj = parseToObject(this.req.body),
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
    // reinitialize modules
    reinitializeModule: function(moduleId) {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            location = [],
            loadSuccessfully = 0;

        if(fs.list('modules/' + moduleId)) {
            location.push('modules/');
        }

        if(fs.list('userModules/' + moduleId)) {
            location.push('userModules/');
        }

        if (location.length > 0) {
            try {

                _.forEach(location, function(loc) {
                    loadSuccessfully += this.controller.reinitializeModule(moduleId, loc);
                });
                
                if(loadSuccessfully > 0){
                    reply.data = 'Reinitialization of app "' + moduleId + '" successfull.';
                    reply.code = 200;
                }
            } catch (e) {
                reply.error = e.toString();
            }
        } else {
            reply.code = 404;
            reply.error = "App not found.";
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
            if (!!instance && instance) {
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
                    profiles = [getProfile];
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
            resProfile = {},
            uniqueEmail = [],
            uniqueLogin = [];

        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
        }

        uniqueEmail = _.filter(this.controller.profiles, function (p) {
            return p.email !== '' && p.email === reqObj.email;
        });

        uniqueLogin = _.filter(this.controller.profiles, function (p) {
            return p.login !== '' && p.login === reqObj.login;
        });

        if (uniqueEmail.length > 0) {
            reply.code = 409;
            reply.error = 'nonunique_email';
        } else if (uniqueLogin.length > 0) {
            reply.code = 409;
            reply.error = 'nonunique_user';
        } else {
            _.defaults(reqObj, {
                role: null,
                name: 'User',
                email:'',
                lang: 'en',
                color: '#dddddd',
                dashboard: [],
                interval: 2000,
                rooms: reqObj.role === 1? [0] : [],
                expert_view: false,
                hide_all_device_events: false,
                hide_system_events: false,
                hide_single_device_events: [],
                skin: ''
            });

            reqObj = _.omit(reqObj, 'passwordConfirm');
            
            profile = this.controller.createProfile(reqObj);
            if (profile !== undefined && profile.id !== undefined) {
                reply.data = resProfile;
                reply.code = 201;
            } else {
                reply.code = 500;
                reply.error = "Profile creation error";
            }
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
                    return (p.email !== '' && p.email === reqObj.email) && 
                                    p.id !== profileId;
                });

                if (uniqueProfProps.length === 0) {
                    // only Admin can change critical parameters
                    if (this.req.role === this.ROLE.ADMIN) {
                        // id is never changeable
                        // login is changed by updateProfileAuth()
                        profile.role = reqObj.role;                    
                        profile.rooms = reqObj.rooms.indexOf(0) === -1 && reqObj.role === 1? reqObj.rooms.push(0) : reqObj.rooms;
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
                    reply.error = 'nonunique_email';
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
                if (self.req.role === self.ROLE.ADMIN && self.req.user !== parseInt(reqObj.id, 10)) {
                    return p.login !== '' && p.login === reqObj.login && p.id !== parseInt(reqObj.id, 10);
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
                reply.error = 'nonunique_user';
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
                code: 500,
                error: null,
                data: null
            };

        history = this.controller.listHistories();

        if(history){
            if (this.req.method === "GET") {
                reply.data = {
                    updateTime: Math.floor(new Date().getTime() / 1000),
                    history: history
                };
                reply.code = 200;

            } else if (this.req.method === "DELETE") {
                success = this.controller.deleteDevHistory();

                if (success) {
                    reply.code = 204;
                } else {
                    reply.error = "Something went wrong."
                }
            } else {
                reply.code = 400;
                reply.error = "Bad request."; 
            }
        } else {
            reply.code = 404;
            reply.error = "No device histories found.";
        }
            
        return reply;
    },
    // get or delete histories of devices
    getDevHist: function (vDevId) {
        var history,
            dev,
            reply = {
                code: 500,
                error: null,
                    data: null
            },
            since,
            show,
            sinceDevHist,
            view = [288,96,48,24,12,6];

        if (this.deviceByUser(vDevId, this.req.user) !== null) {

            history = this.controller.listHistories();
            
            if (history) {

                hash = this.controller.hashCode(vDevId);
                dev = history.filter(function(x) {
                    return x.h === hash || x.id === vDevId;
                });

                if (dev.length > 0) {
                    if (this.req.method === "GET") {
                        show = this.req.query.hasOwnProperty("show")? (view.indexOf(parseInt(this.req.query.show, 10)) > -1 ? parseInt(this.req.query.show, 10) : 0) : 0;
                        since = this.req.query.hasOwnProperty("since") ? parseInt(this.req.query.since, 10) : 0;                        
                        
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

                    } else if (this.req.method === "DELETE") {
                        success = this.controller.deleteDevHistory(vDevId);

                        if (success) {
                            reply.code = 204;
                        } else {
                            reply.error = "Something went wrong."
                        }
                    } else {
                        reply.code = 400;
                        reply.error = "Bad request."; 
                    }
                } else {
                    reply.code = 404;
                    reply.error = "History of device " + vDevId + " doesn't exist";
                }
            } else {
                reply.code = 404;
                reply.error = "No device histories found. Please check if app '24 Hours Device History' is active.";
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
        var self = this,
            reply = {
                error: null,
                data: null,
                code: 500
            };

        var now = new Date();
        // create a timestamp in format yyyy-MM-dd-HH-mm
        var ts = getHRDateformat(now);

        try {

            var backupJSON = self.controller.createBackup();

            reply.headers= {
                "Content-Type": "application/octet-stream", // application/x-download octet-stream
                "Content-Disposition": "attachment; filename=z-way-backup-" + ts + ".zab",
                "Connection": "keep-alive"
            };

            reply.code = 200;
            reply.data = Base64.encode(JSON.stringify(backupJSON));
        } catch(e) {
            reply.code = 500;
            reply.error = e.toString();
        }

        return reply;
    },
    restore: function () {
        var self = this,
            reqObj,
            reply = {
                error: null,
                data: null,
                code: 500
            },
            result = "",
            langfile = this.controller.loadMainLang(),
            waitForInstallation = function (allreadyInstalled, reqKey) {
                var d = (new Date()).valueOf() + 300000; // wait not more than 5 min
        
                while ((new Date()).valueOf() < d && allreadyInstalled.length <= reqObj.data[reqKey].length) {
                        
                        if (allreadyInstalled.length === reqObj.data[reqKey].length) {
                            break;   
                        }
                        
                        processPendingCallbacks();
                }

                if (allreadyInstalled.length === reqObj.data[reqKey].length) {
                    // success
                    reply.code = 200;
                }
            };

        try {
            function utf8Decode(bytes) {
              var chars = [];
            
                for(var i = 0; i < bytes.length; i++) {
                    chars[i] = bytes.charCodeAt(i);
                }
              
              return chars;
            }

            reqObj = parseToObject(this.req.body.backupFile.content);

            if (typeof reqObj.data === 'string') {
                // new .zab files are base64 encoded, while old are not
                decodeData = Base64.decode(reqObj.data);
                // to JSON
                reqObj.data = JSON.parse(decodeData);
            }

            // stop the controller
            this.controller.stop();

            for (var obj in reqObj.data) {
                var dontSave = [
                    "__ZWay",
                    "__EnOcean",
                    "__userModules",
                    "notifications",
                    "8084AccessTimeout",
                    "__userSkins",
                    "rssidata.json",
                    "reorgLog",
                    "incomingPacket.json",
                    "outgoingPacket.json",
                    "originPackets.json",
                    "zway_incomingPacket.json",
                    "zway_outgoingPacket.json",
                    "zway_originPackets.json",
                    "zway_reorgLog",
                    "zway_rssidata.json",
                    "de.devices.json",
                    "en.devices.json",
                    "zwave_vendors.json",
                    "history"
                    ]; // objects that should be ignored

                if (dontSave.indexOf(obj) === -1) {
                    saveObject(obj, reqObj.data[obj]);
                }
            }

            // start controller with reload flag to apply config.json
            this.controller.start(true);
            
            // restore Z-Wave and EnOcean
            !!reqObj.data["__ZWay"] && Object.keys(reqObj.data["__ZWay"]).forEach(function(zwayName) {
                var zwayData = utf8Decode(reqObj.data["__ZWay"][zwayName]);
                global.ZWave[zwayName] && global.ZWave[zwayName].zway.controller.Restore(zwayData, false);
            });

            /* TODO
            !!reqObj.data["__EnOcean"] && reqObj.data["__EnOcean"].forEach(function(zenoName) {
                // global.EnOcean[zenoName] && global.EnOcean[zenoName].zeno.Restore(reqObj.data["__EnOcean"][zenoName]);
            });
            */
           
            // install userModules
            if (reqObj.data["__userModules"]) {
                var installedModules = [];

                _.forEach(reqObj.data["__userModules"], function(entry) {

                    http.request({
                        url:'https://developer.z-wave.me/?uri=api-module-archive/'+ entry.name,
                        method:'GET',
                        async: true,
                        success: function(res){
                            var archiv = [],
                                item = {
                                    name: entry.name
                                },
                                location = 'modules/'+ entry.name,
                                overwriteCoreModule = false;

                            if (res.data.data && res.data.data.length > 0) {
                                archiv = _.filter(res.data.data, function (appEntry){
                                    return appEntry.version === entry.version.toString();
                                })

                                // check if already loaded module is a core module
                                coreModule = self.controller.modules[entry.name] && self.controller.modules[entry.name].meta? (self.controller.modules[entry.name].meta.location === location) : false;

                                // check if version of core module isn't higher than the restored one
                                if (coreModule) {
                                    overwriteCoreModule = has_higher_version(entry.version, self.controller.modules[entry.name].meta.version);
                                }

                                // if achive was found try to download it
                                if (archiv.length > 0 && (!coreModule || (coreModule && overwriteCoreModule))) {

                                    console.log('Restore userModule', archiv[0].modulename, 'v'+archiv[0].version);
                                    result = self.controller.installModule('https://developer.z-wave.me/archiv/'+ archiv[0].archiv, archiv[0].modulename);

                                    item.status = result;
                                    if (result === "done") {
                                        loadSuccessfully = self.controller.reinitializeModule(entry.name, 'userModules/', true);

                                        if(!loadSuccessfully){
                                            self.controller.addNotification("warning", langfile.zaap_war_restart_necessary + ' :: ' + entry.name + ' ' + 'v'+archiv[0].version, "core", "AppInstaller");
                                        }
                                    } else {
                                        self.controller.addNotification("warning", langfile.zaap_err_app_install + ' :: ' + entry.name + ' ' + 'v'+archiv[0].version, "core", "AppInstaller");
                                    }
                                } else {
                                    // downlaod latest if it isn't already there
                                    if (overwriteCoreModule) {
                                        
                                        console.log(entry.name+':','No archive with this version found. Install latest ...');
                                        result = self.controller.installModule('https://developer.z-wave.me/modules/'+ entry.name +'.tar.gz', entry.name);

                                        item.status = result;

                                        if (result === "done") {
                                            self.controller.reinitializeModule(entry.name, 'userModules/', false);
                                            self.controller.addNotification("warning", langfile.zaap_war_app_installed_corrupt_instance + ' :: ' + entry.name, "core", "AppInstaller");
                                        } else {
                                            self.controller.addNotification("error", langfile.zaap_err_app_install + ' :: ' + entry.name, "core", "AppInstaller");
                                        }
                                    } else {
                                        self.controller.addNotification("warning", langfile.zaap_war_core_app_is_newer + ' :: ' + entry.name, "core", "AppInstaller");
                                        item.status = 'failed';
                                    }
                                } 
                            } else {
                                self.controller.addNotification("error", langfile.zaap_err_no_archives + ' :: ' + entry.name, "core", "AppInstaller");
                                item.status = 'failed';
                            }

                            installedModules.push(item);
                        },
                        error: function(res){
                            self.controller.addNotification("error", langfile.zaap_err_server + ' :: ' + entry.name + '::' + res.statusText, "core", "AppInstaller");
                            installedModules.push({
                                name: entry.name,
                                status: 'failed'
                            });
                        }                        
                    });
                });

                waitForInstallation(installedModules,"__userModules");

            }

            // install userSkins
            if (reqObj.data["__userSkins"]) {
                var installedSkins = [],
                    remoteSkins = [];

                http.request({
                    // get online list of all existing modules first
                    url:'http://hrix.net/developer-console/?uri=api-skins',
                    method:'GET',
                    async: true,
                    success: function(res){
                        if (res.data.data) {
                            remoteSkins = res.data.data;

                            // download all skins that are online available
                            _.forEach(reqObj.data["__userSkins"], function(entry) {
                                var item = {
                                        name: entry.name,
                                        status: 'failed'
                                    },
                                    // check if backed up skin is in online list
                                    remSkinObj = _.filter(remoteSkins, function(skin) {
                                        return skin.name === entry.name;
                                    });

                                if (remSkinObj[0]) {

                                    index = _.findIndex(self.controller.skins, function(skin) { 
                                        return skin.name === entry.name; 
                                    });

                                    try {
                                        // install skin
                                        result = self.controller.installSkin(remSkinObj[0], entry.name, index);
                                        item.status = result;
                                    } catch (e) {
                                        self.controller.addNotification("error", langfile.zaap_err_no_archives + ' :: ' + entry.name, "core", "SkinInstaller");
                                    }
                                }                    

                                installedSkins.push(item);

                            });
                        }                       
                    },
                    error: function(res){
                        self.controller.addNotification("error", langfile.zaap_err_server + ' :: ' + res.statusText, "core", "SkinInstaller");
                    }                        
                });

                waitForInstallation(installedSkins,"__userSkins");

            }
            
            // success
            reply.code = 200;
            reply.data = {
                userModules: installedModules,
                userSkins: installedSkins
            };

        } catch (e) {
            reply.error = e.toString();
        }

        return reply;
    },
    resetToFactoryDefault: function() {
        var self = this,
            langFile = this.controller.loadMainLang();
            reply = {
                error: null,
                data: null,
                code: 500
            },
            backupCfg = loadObject("backupConfig"),
            storageContentList = loadObject("__storageContent"),
            defaultConfigExists = fs.stat('defaultConfigs/config.json'), // will be added during build - build depending 
            defaultConfig = {},
            defaultSkins = [{
                name: "default",
                title: "Default",
                description: "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem.",
                version: "1.0.3",
                icon: true,
                author: "Martin Vach",
                homepage: "http://www.zwave.eu",
                active: true
            }],
            now = new Date();

        try{

            if (defaultConfigExists && defaultConfigExists.type !== 'dir' && defaultConfigExists.size > 0){
                defaultConfig = fs.loadJSON('defaultConfigs/config.json');
            }

            if (!!defaultConfig && !_.isEmpty(defaultConfig)) {

                if (zway) {
                    var ts = now.getFullYear() + "-";
                    ts += ("0" + (now.getMonth()+1)).slice(-2) + "-";
                    ts += ("0" + now.getDate()).slice(-2) + "-";
                    ts += ("0" + now.getHours()).slice(-2) + "-";
                    ts += ("0" + now.getMinutes()).slice(-2);

                    console.log('Backup config ...');
                    // make backup of current config.json
                    saveObject('backupConfig' + ts, loadObject('config.json'));

                    // remove all active instances of moduleId
                    this.controller.instances.forEach(function (instance) {
                        if (instance.moduleId !== 'ZWave') {
                            self.controller.deleteInstance(instance.id);
                        }
                    });

                    // reset z-way controller
                    console.log('Reset Controller ...');
                    var d = (new Date()).valueOf() + 15000; // wait not more than 15 sec

                    zway.controller.SetDefault();

                    while ((new Date()).valueOf() < d && zway.controller.data.controllerState.value === 20) {
                        processPendingCallbacks();
                    }

                    // remove instances of ZWave at least
                    // filter for instances of ZWave
                    zwInstances = this.controller.instances.filter(function (instance) {
                        return instance.moduleId === 'ZWave';
                    }).map(function (instance) {
                        return instance.id;
                    });

                    // remove instance of ZWave
                    if (zwInstances.length > 0) {
                        zwInstances.forEach(function (instanceId) {
                            console.log('Remove ZWave instance: ' + instanceId);
                            self.controller.deleteInstance(instanceId);
                        });
                    }

                    console.log('Remove and unload userModules apps ...');
                    // unload and remove modules
                    Object.keys(this.controller.modules).forEach( function(className) {
                        var meta = self.controller.modules[className],
                            unload = '',
                            locPath = meta.location.split('/'),
                            success = false;

                        if (locPath[0] === 'userModules'){
                            console.log(className + ' remove it ...');
                            
                            success = self.controller.uninstallModule(className);

                            if (success) {
                                console.log(className + ' has been successfully removed.');
                            } else {
                                console.log('Cannot remove app: ' + className);
                                self.addNotification("warning", langFile.zaap_err_uninstall_mod + ' ' + className, "core", "AutomationController");
                            }
                        }

                    });

                    // remove skins
                    _.forEach(this.controller.skins, function(skin) {
                        if (skin.name !== 'default') {
                            self.controller.uninstallSkin(skin.name);
                        }
                    });

                    // stop the controller
                    this.controller.stop();
                    
                    // clean up storage
                    for (var ind in storageContentList) {
                        if(storageContentList[ind].indexOf('backupConfig') < 0 && !!storageContentList[ind]){
                            saveObject(storageContentList[ind], null);
                        }
                    }

                    // clean up storageContent
                    if (__storageContent.length > 0) {
                        __saveObject("__storageContent", []);
                        __storageContent = [];
                    }

                    // set back to default config
                    saveObject('config.json', defaultConfig);
                    saveObject('userSkins.json', defaultSkins);

                    // start controller with reload flag to apply config.json
                    this.controller.start(true);

                    reply.code = 200;

                    setTimeout(function(){
                        self.doLogout();
                    }, 3000);
                } else {
                    reply.code = 404;
                    reply.error = 'Unable to reset controller. Z-Way not found.';
                }
                
            } else {
                reply.code = 404;
                reply.error = 'No default configuration file found.';
            }
        } catch (e) {
            reply.error = 'Something went wrong. Error: ' + e.toString();
        }

        return reply;
    },
    getSkins: function () {
        var reply = {
                    error: null,
                    data: null,
                    code: 500
                };
            
        if (this.controller.skins) {
            reply.data = this.controller.skins;
            reply.code = 200;
        } else {
            reply.error = 'failed_to_load_skins';
        }

        return reply;
    },
    getSkin: function (skinName) {
        var reply = {
                    error: null,
                    data: null,
                    code: 500
                };
            
        if (this.controller.skins) {
            index = _.findIndex(this.controller.skins, function(skin) { 
                return skin.name === skinName; 
            });

            if (index > -1) {
                reply.data = this.controller.skins[index];
                reply.code = 200;
            } else {
                reply.code = 404;
                reply.error = 'skin_not_exists';
            }
        } else {
            reply.error = 'failed_to_load_skins';
        }

        return reply;
    },
    getActiveSkin: function () {
        var reply = {
                    error: null,
                    data: null,
                    code: 500
                };
            
        if (this.controller.skins) {
            index = _.findIndex(this.controller.skins, function(skin) { 
                return skin.active === true; 
            });

            if (index > -1) {
                reply.data = this.controller.skins[index];
                reply.code = 200;
            } else {
                reply.code = 404;
                reply.error = 'skin_not_exists';
            }
        } else {
            reply.error = 'failed_to_load_skins';
        }

        return reply;
    },
    activateOrDeactivateSkin: function (skinName) {
        var reply = {
                    error: null,
                    data: null,
                    code: 500
                },
            reqObj = parseToObject(this.req.body),
            skin = null;

        skin = this.controller.setSkinState(skinName, reqObj);

        try {
            if (!!skin) {
                reply.data = skin;
                reply.code = 200;
            } else {
                reply.code = 404;
                reply.error = 'skin_not_exists';
            }
        } catch (e) {
            reply.error = 'failed_to_load_skins';
            reply.message = e.message;
        }

        return reply;
    },
    addOrUpdateSkin: function (skinName) {
        var reply = {
                error: 'skin_failed_to_install',
                data: null,
                code: 500
            },
            reqObj = parseToObject(this.req.body),
            result = "",
            skName = skinName || reqObj.name;

        if (skName !== 'default') {

            index = _.findIndex(this.controller.skins, function(skin) { 
                return skin.name === skName; 
            });

            if ((index < 0 && this.req.method === 'POST') || 
                    (index > -1 && this.req.method === 'PUT' && skinName)) {
                
                // download and install the skin
                result = this.controller.installSkin(reqObj, skName, index);

                if (result === "done") {
                    reply.code = 200;
                    reply.data = this.req.method === 'POST'? "skin_installation_successful" : "skin_update_successful"; // send language key as response
                    reply.error = null;
                } 

            } else if (this.req.method === 'POST' && !skinName) {
                reply.code = 409;
                reply.error = 'skin_from_url_already_exists';
            } else if (this.req.method === 'PUT' && skinName) {
                reply.code = 404;
                reply.error = 'skin_not_exists';
            }
        } else {
            reply.code = 403;
            reply.error = 'No Permission';
        }
        
        return reply;
    },
    deleteSkin: function (skinName) {
        var reply = {
                error: 'skin_failed_to_delete',
                data: null,
                code: 500
            },
            uninstall = false;

        if (skinName !== 'default') {
            index = _.findIndex(this.controller.skins, function(skin) { 
                return skin.name === skinName; 
            });

            if (index > -1) {

                uninstall = this.controller.uninstallSkin(skinName);

                if (uninstall) {

                    reply.code = 200;
                    reply.data = "skin_delete_successful"; // send language key as response
                    reply.error = null;
                }       
            } else {
                reply.code = 404;
                reply.error = 'skin_not_exists';
            }
        } else {
            reply.code = 403;
            reply.error = 'No Permission';
        }
        
        return reply;
    },
    setDefaultSkin: function () {
        var self = this,
            reply = {
                error: null,
                data: null,
                code: 500
            };
            
            try {

                // deactivate all skins and set default skin to active: true
                _.forEach(this.controller.skins, function (skin) {
                    skin.active = skin.name === 'default'? true : false;
                })

                saveObject("userSkins.json", this.controller.skins);

                reply.data = "Skin reset was successfull. You'll be logged out in 3, 2, 1 ...";
                reply.code = 200;
                // do logout
                setTimeout(function(){
                    self.doLogout();
                }, 3000);
            } catch (e) {
                reply.error = "Something went wrong.";
                reply.message = e.message;
            }

        return reply;
    },
    getSkinTokens: function () {
        var reply = {
                    error: null,
                    data: null,
                    code: 500
                }, 
                tokenObj = loadObject('skinTokens.json');

        if (tokenObj === null) {

            tokenObj = {
                    skinTokens: []
            };

            saveObject('skinTokens.json', tokenObj);
        }
            
        if (!!tokenObj) {
            reply.data = tokenObj;
            reply.code = 200;
        } else {
            reply.error = 'failed_to_load_skin_tokens';
        }

        return reply;
    },
    storeSkinToken: function () {
        var reply = {
                    error: null,
                    data: null,
                    code: 500
                },
                reqObj = parseToObject(this.req.body),
                tokenObj = loadObject('skinTokens.json');

        if (reqObj && reqObj.token) {

            if (tokenObj === null) {

                tokenObj = {
                    skinTokens: [reqObj.token]
                }

                // save tokens
                saveObject('skinTokens.json', tokenObj);

                reply.data = tokenObj;
                reply.code = 201;

            } else if (!!tokenObj && tokenObj.skinTokens) {

                if (tokenObj.skinTokens.indexOf(reqObj.token) < 0) {
                    // add new token id
                    tokenObj.skinTokens.push(reqObj.token);

                    // save tokens
                    saveObject('skinTokens.json', tokenObj);

                    reply.data = tokenObj;
                    reply.code = 201;
                } else {
                    reply.code = 409;
                    reply.error = 'skin_token_not_unique';
                }
            }
        } else {
            reply.error = 'failed_to_load_skin_tokens';
        }

        return reply;
    },
    deleteSkinToken: function () {
        var reply = {
                    error: null,
                    data: null,
                    code: 500
                },
                reqObj = parseToObject(this.req.body),
                tokenObj = loadObject('skinTokens.json');

        if (reqObj && reqObj.token && !!tokenObj && tokenObj.skinTokens) {
            if (tokenObj.skinTokens.indexOf(reqObj.token) > -1) {
                // add new token id
                tokenObj.skinTokens = _.filter(tokenObj.skinTokens, function(token) {
                    return token !== reqObj.token;
                });

                // save tokens
                saveObject('skinTokens.json', tokenObj);

                reply.data = tokenObj;
                reply.code = 200;
            } else {
                reply.code = 404;
                reply.error = 'not_existing_skin_token';
            }
        } else {
            reply.error = 'failed_to_load_skin_tokens';
        }

        return reply;
    },
    getIcons: function () {
        var reply = {
            error: null,
            data: null,
            code: 500
        };

        if (this.controller.icons) {
            reply.data = this.controller.icons;
            reply.code = 200;
        } else {
            reply.error = 'failed_to_load_icons';
        }

        return reply;
    },
    uploadIcon: function() {
        var reply = {
            error: 'icon_failed_to_install',
            data: null,
            code: 500
        };

        for (prop in this.req.body){
            if(this.req.body[prop]['content']) {

                file = this.req.body[prop];
            }
        }

        function utf8Decode(bytes) {
            var chars = [];

            for(var i = 0; i < bytes.length; i++) {
                chars[i] = bytes.charCodeAt(i);
            }

            return chars;
        }

        function Uint8ToBase64(uint8) {
            var i,
                extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
                output = "",
                temp, length;

            var lookup = [
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
                'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
                'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
                'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
                'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
                'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
                'w', 'x', 'y', 'z', '0', '1', '2', '3',
                '4', '5', '6', '7', '8', '9', '+', '/'
            ];

            function tripletToBase64(num) {
                return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
            };

            // go through the array every three bytes, we'll deal with trailing stuff later
            for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
                temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
                output += tripletToBase64(temp);
            }

            // this prevents an ERR_INVALID_URL in Chrome (Firefox okay)
            switch (output.length % 4) {
                case 1:
                    output += '=';
                    break;
                case 2:
                    output += '==';
                    break;
                default:
                    break;
            }

            return output;
        }
        var data,
            bytes = new Uint8Array(utf8Decode(file.content)),
            re = /(?:\.([^.]+))?$/;
            ext = re.exec(file.name)[1];

        if(ext === 'gz') {
            var gunzip = new Zlib.Gunzip(bytes);
            data = gunzip.decompress();
        } else {
            data = bytes;
        }

        file.content = Uint8ToBase64(data);

        result = this.controller.installIcon('local', file, 'custom', 'icon');

        if (result === "done") {

            reply.code = 200;
            reply.data = "icon_installation_successful";
            reply.error = null;
        }

        return reply
    },
    addOrUpdateIcons: function(iconName) {
        var reply = {
                error: 'icon_failed_to_install',
                data: null,
                code: 500
            },
            reqObj = parseToObject(this.req.body),
            result = "",
            icName = iconName || reqObj.name,
            id = reqObj.id;

        index = _.findIndex(this.controller.icons, function(icon) {
            return icon.source === icName+"_"+id;
        });

        if (index === -1 ) {

            // download and install the icon
            result = this.controller.installIcon('remote', reqObj, icName, reqObj.id);

            if (result === "done") {

                reply.code = 200;
                reply.data = "icon_installation_successful";
                reply.error = null;
            }
        } else {
            reply.code = 409;
            reply.error = 'icon_from_url_already_exists';
        }

        return reply;
    },
    deleteIcons: function(iconName) {
        var reply = {
                error: 'icon_failed_to_delete',
                data: null,
                code: 500
            },
            uninstall = false;

        var reqObj = typeof this.req.body === 'string' ? JSON.parse(this.req.body) : this.req.body;

        this.controller.deleteCustomicon(iconName);

        uninstall = this.controller.uninstallIcon(iconName);

        if (uninstall) {
            reply.code = 200;
            reply.data = "icon_delete_successful";
            reply.error = null;
        }

        return reply;
    },
    getTime: function () {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            tz = "",
            now = new Date();

        try {
            var sys = system('cat /etc/timezone');
            sys.forEach(function(i) {
               if(typeof i === 'string') {
                   tz = i.replace(/\n/g, '');
                   return;
               };
            });
        } catch(e) {}

        if (now) {
            reply.code = 200;
            reply.data = {
                localTimeUT: Math.round((now.getTime() + (now.getTimezoneOffset() * -60000)) / 1000), // generate timestamp with correct timezone offset
                localTimeString: now.toLocaleString(),
                localTimeZoneOffset: now.getTimezoneOffset() /60,
                localTimeZone: tz
            };
        } else {
            reply.error = 'Cannot get current date and time.';
        }

        return reply;
    },
    setTimezone: function() {
        var self = this,
            langfile = this.controller.loadMainLang();
            reply = {
                error: null,
                data: null,
                code: 500
            },
            data = {
                "act": "set",
                "tz": ""
            };

        reqObj = parseToObject(this.req.body);

        data.tz = reqObj.time_zone;

        var req = {
            url: "http://localhost:8084/cgi-bin/main.cgi",
            method: "POST",
            data: data
        };

        // Set access for 10 seconds
        saveObject('8084AccessTimeout', 10);
        var res = http.request(req);

        if(res.status === 200) {
            reply.code = 200;
            reply.data = res.statusText;

            // reboot after 5 seconds
            setTimeout(function() {
                try {
                    console.log("Rebooting system ...");
                    system("reboot"); // reboot the box
                } catch (e) {
                    self.controller.addNotification("error", langfile.zaap_err_reboot, "core", "SetTimezone");
                }
            }, 5000);

        } else {
            reply.error = res.statusText;
        }

        saveObject('8084AccessTimeout', null);

        return reply;
    },
    getRemoteId: function () {
        var self = this,
            reply = {
                error: null,
                data: null,
                code: 500
            };

            try {
                reply.code = 200;
                reply.data = {
                    remote_id: self.controller.getRemoteId()
                };

            } catch (e) {
                if(e.name === "service-not-available") {
                    reply.code = 503;
                    reply.error = e.message;
                } else {
                    reply.code = 500;
                    reply.error = e.message;
                }
            }
        return reply;
    },
    // set a timout for accessing firmware update tab of 8084
    setWebifAccessTimout: function() {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            allowAcc = 0,
            timeout = 900; // in s ~ 15 min

        allowAcc = this.req.query.hasOwnProperty("allow_access") ? parseInt(this.req.query.allow_access, 10) : 0;
        timeout = this.req.query.hasOwnProperty("timeout") ? parseInt(this.req.query.timeout, 10) : timeout;

        if (allowAcc === 1 && timeout > 0 && timeout <= 1200) {
            saveObject('8084AccessTimeout', timeout);
            reply.code = 200;
            reply.data = {
                timeout: timeout
            };
        } else if (allowAcc === 0) {
            saveObject('8084AccessTimeout', null);
            reply.code = 200;
            reply.data = {
                timeout: null
            };
        } else {
            reply.code = 400;
            reply.error = 'Invalid Request';
        }

        return reply;
    },
    getFirstLoginInfo: function() {
        var reply = {
                error: null,
                data: {},
                code: 500
            },
            defaultProfile = [],
            setLogin = {};
        try {
            defaultProfile = _.filter(this.controller.profiles, function (profile) {
                return profile.login === 'admin' && profile.password === 'admin';
            });

            if ((!this.controller.config.first_start_up && defaultProfile.length > 0) || (defaultProfile.length > 0 && (typeof this.controller.config.firstaccess === 'undefined' || this.controller.config.firstaccess)) || (defaultProfile.length > 0 && !this.controller.config.firstaccess)) {
                setLogin = this.setLogin(defaultProfile[0]);
                reply.headers = setLogin.headers; // set '/' Z-Way-Session root cookie
                reply.data.defaultProfile = setLogin.data; // set login data of default profile
                reply.data.firstaccess = true;
                reply.data.defaultProfile.showWelcome = true;
                reply.code = 200;

            } else {
                reply.data = { firstaccess: false };
                reply.code = 200;
            }
        } catch (e){
            reply.data = null;
            reply.error = e.message;
        }

        return reply;
    },
    getSystemInfo: function() {
        var reply = {
                error: null,
                data: {},
                code: 500
            },
            versionArr = [];
        
        try {
            versionArr = zway.controller.data.softwareRevisionVersion.value.substring(1).split('-');
            version = versionArr[0]? versionArr[0] : null;
            majurity = versionArr[1]? versionArr[1] : null;

            reply.data = { 
                first_start_up: this.controller.config.first_start_up, 
                count_of_reconnects: this.controller.config.count_of_reconnects,
                current_firmware: version,
                current_firmware_majurity: majurity,
                remote_id: this.controller.getRemoteId(),
                firstaccess: this.controller.config.hasOwnProperty('firstaccess')? this.controller.config.firstaccess : true
            };

            // add more information if box is cit
            if (checkBoxtype('cit')) {
                _.extend(reply.data, {
                    cit_identifier: this.controller.config.cit_identifier || '',
                    cit_authorized: this.controller.config.cit_authorized || false,
                    cit_license_countDown: zway && zway.controller.data.countDown? zway.controller.data.countDown.value : null,
                    cit_server_reachable: checkInternetConnection('https://findcit.z-wavealliance.org')
                });

                if (this.controller.config.forwardCITAuth === true && this.controller.config.cit_authorized) {
                    profile = _.filter(this.controller.profiles, function(p){
                        return p.name === 'CIT Administrator';
                    });

                    if (profile[0]) {
                        _.extend(reply.data, {
                            cit_forward_auth: {
                                user: profile[0].login,
                                allowed: this.controller.allowLoginForwarding(this.req)
                            }
                        });
                    }

                }
            }

            reply.code = 200;
        } catch (e){
            reply.data = null;
            reply.error = e.message;
        }

        return reply;
    },
    rebootBox: function() {
        var self = this,
            langfile = this.controller.loadMainLang();
            reply = {
                error: null,
                data: null,
                code: 500
            };

            // if reboot has flag firstaccess=true add showWelcome to controller config
            if(this.req.query.hasOwnProperty('firstaccess') && this.req.query.firstaccess) {
                this.controller.config.showWelcome = true;
                this.controller.saveConfig();
            }

            // reboot after 5 seconds
            setTimeout(function() {
                try {
                    console.log("Rebooting system ...");
                    system("reboot"); // reboot the box
                } catch (e){
                    self.controller.addNotification("error", langfile.zaap_err_reboot, "core", "RebootBox");
                }
            }, 5000);

            reply.code = 200;
            reply.data = "System is rebooting ...";

        return reply;
    },
    setWifiSettings: function() {
        var reply = {
                error: "Wifi setup failed!",
                data: null,
                code: 500
            },
            retPp = [],
            retSsid = [],
            retR = [];

        if (fs.stat('lib/configAP.sh')) {
            try {
                reqObj = parseToObject(this.req.body);

                if(reqObj.password !== '') {
                    if(reqObj.password.length >= 8 && reqObj.password.length <= 63) {
                        retPp = system("sh automation/lib/configAP.sh setPp " + reqObj.password);
                    } else {
                        reply.error = "Password must between 8 and 63 characters long.";
                        return reply;
                    }
                } else {
                    retPp[1] = "";
                }

                if(reqObj.ssid !== '') {
                    retSsid = system("sh automation/lib/configAP.sh setSsid " + reqObj.ssid);
                } else {
                    retSsid[1] = "";
                }

                if((retSsid[1].indexOf("successfull") !== -1 || retPp[1].indexOf("successfull") !== -1) || (retSsid[1].indexOf("successfull") !== -1 && retPp[1].indexOf("successfull") !== -1)) {
                    retR = system("sh automation/lib/configAP.sh reload");
                    if(retR[1].indexOf("Done") !== -1 ) {
                        reply.error = null;
                        reply.data = "OK";
                        reply.code = 200;
                    }
                }

            } catch(e) {
                console.log(e.toString());
                reply.error = 'Internal Server Error. ' + e.toString();
            }
        } else {
            reply.error = 'Not Implemented';
            reply.code = 501;
        }

        return reply;
    },
    getWifiSettings: function() {
        var reply = {
                error: null,
                data: null,
                code: 500
            };

        if (fs.stat('lib/configAP.sh')) {
            try {

                var retSsid = system("sh automation/lib/configAP.sh getSsid");

                var ssid = retSsid[1].replace(' 0', '').replace(/\n/g, '');
                reply.code = 200;
                reply.data = {"ssid": ssid};

            } catch(e) {
                console.log(e.toString());
                reply.error = 'Internal Server Error. ' + e.toString();
            }
        } else {
            reply.error = 'Not Implemented';
            reply.code = 501;
        }

        return reply;
    },
    configNtp: function(action) {
        var reply = {
                error: "Internal Server Error",
                data: null,
                code: 500
            },
            actions = ["status","stop","start","restart","disable","enable","reconfigure","setDateTime"],
            dt_regex = /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1]) (2[0-3]|[01][0-9]):[0-5][0-9]/;

        if (fs.stat('lib/ntp.sh')) {
            try {
                reqObj = parseToObject(this.req.query);

                if (actions.indexOf(action) > -1 || (action == 'setDateTime' && reqObj.dateTime && dt_regex.exec(reqObj.dateTime))) {

                    res = system("./automation/lib/ntp.sh " + action + (action == 'setDateTime'? " '" + reqObj.dateTime + "'" : ""));

                    if (action === 'status' && res[1]) {
                        reply.data = JSON.parse(res[1]);
                    } else {
                        reply.data = res[1]? res[1] : res;
                    }

                    reply.code = 200;
                    reply.error = null;

                } else {
                    reply.error = 'Bad Request. Allowed are: ' + actions.toString() + '?dateTime=yyyy-mm-dd hh:mm';
                    reply.code = 400;
                }
            } catch(e) {
                console.log(e.toString());
                reply.error = 'Internal Server Error. ' + e.toString();
            }
        } else {
            reply.error = 'Not Implemented';
            reply.code = 501;
        }

        return reply;
    },
    certfxAuth: function() {
        var self = this,
            reply = {
                error: "Internal Server Error",
                data: null,
                code: 500
            },
            response = 'in progress',
            cit_server_reachable = checkInternetConnection('https://certxfer.z-wavealliance.org:8443'),
            reqObj = parseToObject(this.req.body),
            user = reqObj.user && reqObj.user !== ''? reqObj.user : undefined,
            pass = reqObj.pass && reqObj.pass !== ''? reqObj.pass : undefined,
            identifier = reqObj.cit_identifier && reqObj.cit_identifier !== ''? reqObj.cit_identifier : (self.controller.config.cit_identifier && self.controller.config.cit_authorized? self.controller.config.cit_identifier : undefined);

        try {
            // check controller vendor (cit)
            if (zway.controller.data.manufacturerId.value === 797 &&
                zway.controller.data.manufacturerProductType.value === 257 &&
                zway.controller.data.manufacturerProductId.value === 1) {


                //check for request data first
                if (user && pass && identifier) {

                    // access to alliance if server is reachable
                    if (cit_server_reachable){
                        var uuid = zway.controller.data.uuid.value;
                        var d = (new Date()).valueOf() + 15000; // wait not more than 15 sec
                        var cit_user = user.toLowerCase();

                        if (!self.controller.config.cit_authorized) {
                            http.request({
                                url: encodeURI("https://certxfer.z-wavealliance.org:8443/CITAuth/Reg.aspx?UID=" + uuid + "&user=" + user + "&pass=" + pass + "&desc=" + identifier),
                                async: true,
                                success: function (resp) {
                                    r = parseToObject(resp);
                                    res = r.data ? parseToObject(r.data) : null;

                                    // set authorized flag in controller config
                                    // add default cit profile
                                    // transform default login
                                    if (!!res && res.result !== undefined) {
                                        // set cit authorization flag
                                        self.controller.config.cit_authorized = res.result;

                                        // add default cit login if not already existing
                                        if (res.result) {
                                            self.controller.config.cit_identifier = identifier;

                                            if (self.controller.profiles.filter(function (p) {
                                                    return p.login === cit_user;
                                                }).length === 0) {

                                                // add cit user profile
                                                self.controller.createProfile({
                                                    role: 1,
                                                    login: cit_user,
                                                    password: pass,
                                                    email: '',
                                                    name: 'CIT Administrator',
                                                    lang: 'en',
                                                    color: '#dddddd',
                                                    dashboard: [],
                                                    interval: 2000,
                                                    rooms: [0],
                                                    expert_view: false,
                                                    hide_all_device_events: false,
                                                    hide_system_events: false,
                                                    hide_single_device_events: [],
                                                    skin: ''
                                                });
                                            }
                                            /* TODO discuss how to implement it
                                             // update default admin profile
                                             prof = _.filter(self.controller.profiles, function (p) {
                                             return p.login === 'admin' &&
                                             p.password === 'admin';
                                             });

                                             if (prof.length > 0 ) {
                                             var pwd = ''

                                             try {
                                             pwd = system('sh automation/lib/system.sh info');
                                             pwd = pwd[1];
                                             } catch (e){

                                             }

                                             if (pwd && !!pwd && pwd !== '') {
                                             // update default admin profile
                                             self.controller.updateProfileAuth({
                                             login: prof[0].login,
                                             password: pwd
                                             }, prof[0].id);
                                             }
                                             }*/
                                        }
                                        self.controller.saveConfig();
                                    }

                                    response = 'done';

                                    reply.code = r.status;
                                    reply.error = null;
                                    reply.data = res;
                                },
                                error: function (resp) {
                                    r = parseToObject(resp);

                                    response = 'failed';

                                    reply.code = r.status;
                                    reply.error = r.error ? r.error : r.status + ' ' + r.statusText;
                                    reply.data = r.data;
                                }
                            });
                        } else {
                            http.request({
                                url: "https://certxfer.z-wavealliance.org:8443/CITAuth/Auth.aspx?UID=" + uuid + "&user=" + user + "&pass=" + pass,
                                async: true,
                                success: function (resp) {
                                    r = parseToObject(resp);
                                    res = r.data ? parseToObject(r.data) : null;

                                    // check authorization
                                    if (!!res && res.result !== undefined) {
                                        // update cit profile if auth is ok
                                        if (res.result) {
                                            // update default admin profile
                                            prof = _.filter(self.controller.profiles, function (p) {
                                                return p.login === cit_user;
                                            });

                                            if (prof.length > 0) {
                                                // update default admin profile
                                                self.controller.updateProfileAuth({
                                                    login: cit_user,
                                                    password: pass
                                                }, prof[0].id);
                                            }
                                        }
                                        self.controller.saveConfig();
                                    }

                                    response = 'done';

                                    reply.code = r.status;
                                    reply.error = null;
                                    reply.data = res;
                                },
                                error: function (resp) {
                                    r = parseToObject(resp);

                                    response = 'failed';

                                    reply.code = r.status;
                                    reply.error = r.error ? r.error : r.status + ' ' + r.statusText;
                                    reply.data = r.data;
                                }
                            });
                        }

                        // wait for response
                        while ((new Date()).valueOf() < d && response === 'in progress') {
                            processPendingCallbacks();
                        }

                        if (response === 'in progress') {
                            response === 'failed'

                            reply.code = 504;
                            reply.error = 'Gateway Time-out: No response from https://certxfer.z-wavealliance.org';
                        }
                    // forward local login if server isn't reachable but cit is registrated
                    } else {
                        reply.code = 504;
                        reply.error = 'Gateway Time-out: No response from https://certxfer.z-wavealliance.org';
                    }
                } else {
                    reply.error = 'Bad Request. Please enter registered user, password and set a identifier name.';
                    reply.code = 400;
                }
            } else {
                reply.error = 'Not Implemented: This function is not supported by controller.';
                reply.code = 501;
            }
        } catch(e) {
            console.log(e.toString());
            reply.error = 'Internal Server Error. ' + e.toString();
        }

        return reply;
    },
    /*certfxSetAuthForwarding: function() {
        var self = this,
            reply = {
                error: "Internal Server Error",
                data: null,
                code: 500
            },
            reqObj = parseToObject(this.req.body);

        try {
            // check controller vendor (cit)
            if (zway.controller.data.manufacturerId.value === 797 &&
                zway.controller.data.manufacturerProductType.value === 257 &&
                zway.controller.data.manufacturerProductId.value === 1) {

                //check for request data first
                if (reqObj.hasOwnProperty('forwardCITAuth')) {

                    self.controller.config.forwardCITAuth = reqObj.forwardCITAuth === true || reqObj.forwardCITAuth === 'true'? true : false;

                    self.controller.saveConfig();

                    reply.code = 200;
                    reply.error = null;
                    reply.message = '200 OK'
                    reply.data = {
                        forwardCITAuth: self.controller.config.forwardCITAuth
                    };
                } else {
                    reply.error = 'Bad Request. Please enter forwardCITAuth = true/false.';
                    reply.code = 400;
                }
            } else {
                reply.error = 'Not Implemented: This function is not supported by controller.';
                reply.code = 501;
            }
        } catch(e) {
            console.log(e.toString());
            reply.error = 'Internal Server Error. ' + e.toString();
        }

        return reply;
    },
    certfxGetAuthForwarding: function() {
        var self = this,
            reply = {
                error: "Internal Server Error",
                data: null,
                code: 500
            };

        try {
            // check controller vendor (cit)
            if (zway.controller.data.manufacturerId.value === 797 &&
                zway.controller.data.manufacturerProductType.value === 257 &&
                zway.controller.data.manufacturerProductId.value === 1) {

                reply.code = 200;
                reply.error = null;
                reply.data = {
                    forwardCITAuth: self.controller.config.forwardCITAuth? self.controller.config.forwardCITAuth : false
                };

            } else {
                reply.error = 'Not Implemented: This function is not supported by controller.';
                reply.code = 501;
            }
        } catch(e) {
            console.log(e.toString());
            reply.error = 'Internal Server Error. ' + e.toString();
        }

        return reply;
    },*/
    certfxUnregister: function() {
        var self = this,
            reply = {
                error: "Internal Server Error",
                data: null,
                code: 500
            },
            response = 'in progress',
            req_user = this.profileByUser(this.req.user),
            reqObj = parseToObject(this.req.body),
            user = reqObj.user && reqObj.user !== ''? reqObj.user : undefined,
            pass = reqObj.pass && reqObj.pass !== ''? reqObj.pass : undefined;

        try {
            // check controller vendor (cit)
            if (zway.controller.data.manufacturerId.value === 797 &&
                zway.controller.data.manufacturerProductType.value === 257 &&
                zway.controller.data.manufacturerProductId.value === 1) {

                // check if posted login mtches with the requested one
                if (req_user && req_user.login === user) {
                    //check for request data first
                    if (user && pass) {
                        var uuid = zway.controller.data.uuid.value;
                        var d = (new Date()).valueOf() + 15000; // wait not more than 15 sec
                        // try to unregister the CIT from user
                        http.request({
                            url: encodeURI("https://certxfer.z-wavealliance.org:8443/CITAuth/UnReg.aspx?UID=" + uuid + "&user=" + user + "&pass=" + pass),
                            async: true,
                            success: function(resp) {
                                r = parseToObject(resp);
                                res = r.data? parseToObject(r.data) : null;

                                // check if CertXFer auth is ok
                                if (!!res && res.result) {
                                    // store new identifier name
                                    self.controller.config.cit_identifier = '';
                                    self.controller.config.cit_authorized = false;
                                    self.controller.config.forwardCITAuth = false;

                                    self.controller.removeProfile(req_user.id);
                                    self.controller.saveConfig();

                                    reply.message = "Your CIT was successfully unregistered. You'll be logged out in 3, 2, 1 ...";

                                    setTimeout(function(){
                                        self.doLogout();
                                    }, 3000);
                                }

                                response = 'done';

                                reply.code = r.status;
                                reply.error = null;
                                reply.data = res;
                            },
                            error: function(resp) {
                                r = parseToObject(resp);

                                response = 'failed';

                                reply.code = r.status;
                                reply.error = r.error? r.error : r.status + ' ' + r.statusText;
                                reply.data = r.data;
                            }
                        });

                        // wait for response
                        while ((new Date()).valueOf() < d && response === 'in progress') {
                            processPendingCallbacks();
                        }

                        if (response === 'in progress') {
                            response === 'failed'

                            reply.code = 504;
                            reply.error = 'Gateway Time-out: No response from https://certxfer.z-wavealliance.org';
                        }
                    } else {
                        reply.error = 'Bad Request. Please check your login or password.';
                        reply.code = 400;
                    }
                } else {
                    reply.error = 'Forbidden. You can only unregister your own user.';
                    reply.code = 403;
                }
            } else {
                reply.error = 'Not Implemented: This function is not supported by controller.';
                reply.code = 501;
            }
        } catch(e) {
            console.log(e.toString());
            reply.error = 'Internal Server Error. ' + e.toString();
        }

        return reply;
    },
    certfxUpdateIdentifier: function() {
        var self = this,
            reply = {
                error: "Internal Server Error",
                data: null,
                code: 500
            },
            response = 'in progress',
            reqObj = parseToObject(this.req.body),
            req_user = this.profileByUser(this.req.user),
            identifier = reqObj.cit_identifier && reqObj.cit_identifier !== ''? reqObj.cit_identifier : undefined;

        try {
            // check controller vendor (cit)
            if (zway.controller.data.manufacturerId.value === 797 &&
                zway.controller.data.manufacturerProductType.value === 257 &&
                zway.controller.data.manufacturerProductId.value === 1) {

                //check for request data first
                if (req_user && req_user.login && identifier) {

                    // access to alliance if server is reachable
                    var uuid = zway.controller.data.uuid.value;
                    var d = (new Date()).valueOf() + 15000; // wait not more than 15 sec

                    http.request({
                        url: encodeURI("https://certxfer.z-wavealliance.org:8443/CITAuth/Reg.aspx?UID=" + uuid + "&user=" + req_user.login + "&desc=" + identifier),
                        async: true,
                        success: function(resp) {
                            r = parseToObject(resp);
                            res = r.data? parseToObject(r.data) : null;

                            // check if CertXFer auth is ok
                            if (!!res && res.result) {
                                // store new identifier name
                                self.controller.config.cit_identifier = identifier;
                                self.controller.saveConfig();
                            }

                            response = 'done';

                            reply.code = r.status;
                            reply.error = null;
                            reply.data = res;
                        },
                        error: function(resp) {
                            r = parseToObject(resp);

                            response = 'failed';

                            reply.code = r.status;
                            reply.error = r.error? r.error : r.status + ' ' + r.statusText;
                            reply.data = r.data;
                        }
                    });

                    // wait for response
                    while ((new Date()).valueOf() < d && response === 'in progress') {
                        processPendingCallbacks();
                    }

                    if (response === 'in progress') {
                        response === 'failed'

                        reply.code = 504;
                        reply.error = 'Gateway Time-out: No response from https://certxfer.z-wavealliance.org';
                    }
                } else {
                    reply.error = 'Bad Request. Please enter registered user, password and set a identifier name.';
                    reply.code = 400;
                }
            } else {
                reply.error = 'Not Implemented: This function is not supported by controller.';
                reply.code = 501;
            }
        } catch(e) {
            console.log(e.toString());
            reply.error = 'Internal Server Error. ' + e.toString();
        }

        return reply;
    },
    zwaveDeviceInfoGet: function() {
        var reply = {
                error: null,
                code: 500,
                data: null
            },
            l = ['en','de'],  //this.controller.availableLang
            devInfo = {},
            reqObj = !this.req.query? undefined : parseToObject(this.req.query);

        try {

            devID = reqObj && reqObj.id? reqObj.id : null;
            language = reqObj && reqObj.lang && l.indexOf(reqObj.lang) > -1? reqObj.lang : 'en';

            if (reqObj && reqObj.lang && l.indexOf(reqObj.lang) === -1) {
                reply.message = 'Language not found. English is used instead.';
            }

            devInfo = loadObject(language +'.devices.json'); //this.controller.defaultLang


            if (devInfo === null) {
                reply.code = 404;
                reply.error = 'No list of Z-Wave devices found. Please try to download them first.';
            } else {
                reply.data = devInfo;
                reply.code = 200;

                if (!!devID) {
                    reply.data = _.find(devInfo.zwave_devices, function(dev) {
                        return dev['Product_Code'] === devID;
                    });

                    if (!reply.data) {
                        reply.code = 404;
                        reply.error = 'No Z-Wave device with ' + devID +  ' found.';
                        reply.data = null;
                    }
                }
            }
        } catch (e) {
            reply.error = 'Something went wrong:' + e.message;
        }

        return reply;
    },
    zwaveDeviceInfoUpdate: function() {
        var self = this,
            result = [],
            l = ['en','de'],  //this.controller.availableLang,
            reply = {
                error: null,
                code: 500,
                data: null
            },
            delay = (new Date()).valueOf() + 10000; // wait not more than 10 seconds

        try {
            // update postfix JSON
            l.forEach(function(lang) {
                var obj = {},
                    list = {
                        updateTime: '',
                        zwave_devices: []
                    };

                obj[lang] = false;

                http.request({
                    url: "http://manuals-backend.z-wave.info/make.php?lang=" + lang + "&mode=ui_devices",
                    async: true,
                    success: function(res) {
                        if (res.data) {
                            data = parseToObject(res.data);
                            list.updateTime = (new Date()).getTime();

                            for (index in data) {
                                list.zwave_devices.push(data[index]);
                            }

                            saveObject(lang +'.devices.json', list);
                            obj[lang] = true;
                        }

                        result.push(obj);
                    },
                    error: function() {
                        self.controller.addNotification('Z-Wave device list for lang:' + lang + ' not found.');
                        result.push(obj);
                    }
                });
            });

            while (result.length < l.length && (new Date()).valueOf() < delay) {
                processPendingCallbacks();
            }

            if(result) {
                reply.code = 200;
                reply.data = result;
            }

        } catch (e) {
            this.controller.addNotification('Error has occured during updating the Z-Wave devices list');
            reply.error = 'Something went wrong:' + e.message;
        }

        return reply;
    },
    zwaveVendorsInfoGet: function() {
        var reply = {
                error: null,
                code: 500,
                data: null
            },
            devInfo = {},
            reqObj = !this.req.query? undefined : parseToObject(this.req.query);

        try {

            vendorID = reqObj && reqObj.id? reqObj.id : null;

            devInfo = loadObject('zwave_vendors.json');

            if (devInfo === null) {
                reply.code = 404;
                reply.error = 'No list of Z-Wave vendors found. Please try to download them first.';
            } else {
                reply.data = devInfo;
                reply.code = 200;

                if (devInfo.zwave_vendors[vendorID]) {
                    reply.data = devInfo.zwave_vendors[vendorID];
                } else if (reqObj.id) {
                    reply.code = 404;
                    reply.error = 'No Z-Wave vendor with id "' + vendorID +  '" found.';
                    reply.data = null;
                }
            }
        } catch (e) {
            reply.error = 'Something went wrong:' + e.message;
        }

        return reply;
    },
    zwaveVendorsInfoUpdate: function() {
        var self = this,
            result = 'in progress',
            reply = {
                error: null,
                code: 500,
                data: null
            },
            delay = (new Date()).valueOf() + 10000; // wait not more than 10 seconds

        try {
            // update postfix JSON
            var list = {
                    updateTime: '',
                    zwave_vendors: {}
                };

            http.request({
                url: "http://manuals-backend.z-wave.info/make.php?mode=brand",
                async: true,
                success: function(res) {
                    if (res.data) {
                        list.updateTime = (new Date()).getTime();
                        list.zwave_vendors = parseToObject(res.data);

                        saveObject('zwave_vendors.json', list);

                        result = 'done';

                        reply.code = 200;
                        reply.data = list;
                    }
                },
                error: function(e) {
                    var msg = 'Z-Wave vendors list could not be updated. Error: ' +e.toString();
                    self.controller.addNotification(msg);

                    result = 'failed';

                    reply.code = e.status;
                    reply.error = msg;
                    reply.data = e.data;
                }
            });

            while (result === 'in progress' && (new Date()).valueOf() < delay) {
                processPendingCallbacks();
            }

            if(result === 'in progress') {
                result = 'failed';
            }

        } catch (e) {
            this.controller.addNotification('Error has occured during updating the Z-Wave devices list');
            reply.error = 'Something went wrong:' + e.message;
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

ZAutomationAPIWebRequest.prototype.authCIT = function () {
    var license = true;
    // check for license countdown
    if (typeof zway !== 'undefined' && zway.controller.data.countDown) {
        license = zway.controller.data.countDown.value > 0? true : false;
    }
    return checkBoxtype('cit') && this.controller.config.cit_authorized && license;
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
                    handlerFunc = matched.handler? matched.handler : handlerFunc;
                }

                // --- Proceed to checkout =)
                return handlerFunc;

            } else {

                return this.Forbidden;

            }
        } else {
            return handlerFunc;
        }
    }
};

ZAutomationAPIWebRequest.prototype.reorderDevices = function () {
    var self = this,
        reply = {
            error: "Internal Server Error",
            data: null,
            code: 500
        };

    var reqObj = typeof this.req.body !== 'object' ? JSON.parse(this.req.body) : this.req.body;

    var data = reqObj.data, // ordered list of devices
        action = reqObj.action; // Dasboard, Elelements, Room(location)

    if(self.controller.reoderDevices(data, action)) {
        reply.error = "";
        reply.data = "OK";
        reply.code = 200;
    }

    //     a = self.controller.order.elements.indexOf(reqObj[0].id);
    //     b = self.controller.order.elements.indexOf(reqObj[1].id);
    //
    // Array.prototype.swapItems = function(a, b){
    //     this[a] = this.splice(b, 1, this[a])[0];
    //     return this;
    // }
    //
    //
    // self.controller.order.elements = self.controller.order.elements.swapItems(a,b);
    //

    return reply;

}

