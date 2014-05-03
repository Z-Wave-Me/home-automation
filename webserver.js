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
        this.router.get("/notifications", this.exposeNotifications());
        this.router.get("/devices", this.listDevices);
        this.router.get("/restart", this.restartController);
        this.router.get("/locations", this.listLocations());
        this.router.get("/profiles", this.listProfiles());
        this.router.get("/namespaces", this.listNamespaces);
        this.router.get("/profiles", this.createProfile());
        this.router.get("/locations/add", this.addLocation());
        this.router.post("/locations", this.addLocation());
        this.router.get("/locations/remove", this.removeLocation());
        this.router.get("/locations/update", this.updateLocation());
        this.router.get("/modules", this.listModules);
        this.router.get("/instances", this.listInstances);
        this.router.post("/instances", this.createInstance());
        this.router.get("/schemas", this.listSchemas);

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

        this.router.del("/profiles/:profile_id", this.removeProfile, [parseInt]);
        this.router.put("/profiles/:profile_id", this.updateProfile, [parseInt]);
        this.router.get("/profiles/:profile_id", this.listProfiles, [parseInt]);

        this.router.put("/devices/:dev_id", this.setVDevFunc);
        this.router.get("/devices/:dev_id", this.getVDevFunc);

        this.router.get("/instances/:instance_id", this.getInstanceFunc, [parseInt]);
        this.router.put("/instances/:instance_id", this.reconfigureInstanceFunc, [parseInt]);
        this.router.del("/instances/:instance_id", this.deleteInstanceFunc, [parseInt]);

        this.router.get("/namespaces/:namespace_id", this.getNamespaceFunc, [parseInt]);
    },
    statusReport: function () {
        var reply = {
            error: null,
            data: "OK",
            code: 200
        };

        this.controller.addNotification("debug", "Status report requested", "debug");
        this.initResponse(reply);
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
            that = this;

        reply.data.structureChanged = that.controller.lastStructureChangeTime >= since ? true : false;
        if (reply.data.structureChanged) {
            reply.data.devices = that.controller.devices.toJSON();
        } else {
            reply.data.devices = that.controller.devices.toJSON({since: reply.data.structureChanged ? 0 : since});
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
            };

        return function () {

            if (that.controller.devices.has(vDevId)) {
                reply.data = !!that.controller.devices.get(vDevId).performCommand.call(that.controller.devices.get(vDevId), commandId, that.req.query);
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
        var nowTS = Math.floor(new Date().getTime() / 1000),
            notifications,
            reply = {
                error: null,
                data: null
            },
            since,
            redeemed,
            that = this;


        return function () {
            that.res.status = 200;
            since = that.req.query.hasOwnProperty("since") ? parseInt(that.req.query.since, 10) : 0;
            redeemed = that.req.query.hasOwnProperty("redeemed") && (String(that.req.query.redeemed)) === 'true' ? true : false;
            notifications = that.controller.listNotifications(since, redeemed);

            reply.data = {
                updateTime: nowTS,
                notifications: notifications
            };

            reply.code = 200;

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
        }
    },
    updateNotification: function (notificationId) {
        var reply = {
                error: null,
                data: "OK"
            },
            notification,
            that = this;

        return function () {
            notification = that.controller.getNotification(notificationId);
            if (notification) {

                notification = that.controller.updateNotification(notificationId, this.req.reqObj);
                if (notification) {
                    reply.code = 200;
                    reply.data = notification;
                } else {
                    reply.code = 500;
                    reply.data = null;
                    reply.error = "Object doesn't exist redeemed argument";
                }
            } else {
                reply.code = 404;
                reply.error = "Notification " + notificationId + " doesn't exist";
            }
            that.initResponse(reply);
        };
    },
    //locations
    listLocations: function (locationId) {
        var that = this,
            reply = {
                data: null,
                error: null
            };

        reply.code = 200;

        return function () {
            if (locationId === undefined) {
                reply.data = that.controller.locations;
            } else {
                var locations = that.controller.locations.filter(function (location) {
                    return location.id === locationId;
                });

                if (locations.length > 0) {
                    reply.data = locations[0];
                    reply.code = 200;
                } else {
                    reply.code = 404;
                    reply.error = "Location " + locationId + " doesn't exist";
                }
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
            icon,
            that = this;

        return function () {
            if (that.req.method === 'GET') {
                icon = that.req.query.hasOwnProperty('icon') ? that.req.query.icon : null;
            } else if (that.req.method === 'POST') { // POST
                try {
                    reqObj = JSON.parse(that.req.body);
                } catch (ex) {
                    reply.error = ex.message;
                }

                title = reqObj.title;
                icon = reqObj.hasOwnProperty('icon') ? reqObj.icon : null;
            }

            if (!!title) {
                that.controller.addLocation(title, icon, function (data) {
                    if (data) {
                        reply.code = 201;
                        reply.data = data;
                    } else {
                        reply.code = 500;
                        reply.error = "Unknown error. Location doesn't created";
                    }
                });
            } else {
                reply.code = 500;
                reply.error = "Arguments title are required";
            }
            that.initResponse(reply);
        };
    },
    removeLocation: function (locationId) {
        var that = this;

        return function () {
            var id,
                reply = {
                    error: null,
                    data: null
                },
                reqObj;

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

            that.initResponse(reply);
        };
    },
    updateLocation: function (locationId) {
        var that = this;
        return function () {
            var id,
                title,
                reply = {
                    error: null,
                    data: null,
                    code: 200
                },
                reqObj;

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
            }

            if (!!id && !!title && title.length > 0) {
                that.controller.updateLocation(id, title, function (data) {
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
            module = null;

        Object.keys(that.controller.modules).forEach(function (className) {
            module = that.controller.modules[className].meta;
            if (module.hasOwnProperty('userView') && module.userView) {
                module.className = className;
                if (module.singleton && _.any(that.controller.instances, function (instance) { return instance.moduleId === module.id; })) {
                    module.created = true;
                } else {
                    module.created = false;
                }
                reply.data.push(module);
            }
        });

        this.initResponse(reply);
    },
    // instances
    listInstances: function () {
        var that = this,
            reply = {
                error: null,
                data: _.filter(that.controller.instances, function (instance) { return instance.userView; }),
                code: 200
            };

        this.initResponse(reply);
    },
    createInstance: function () {
        var that = this;
        return function () {
            var reply = {
                    error: null,
                    data: null,
                    code: 500
                },
                reqObj = this.req.reqObj,
                that = this,
                instance;

            if (that.controller.modules.hasOwnProperty(reqObj.moduleId)) {
                instance = that.controller.createInstance(reqObj.moduleId, reqObj.params);
                if (instance) {
                    reply.code = 201;
                    reply.data = instance
                } else {
                    reply.code = 500;
                    reply.error = "Cannot instantiate module " + reqObj.id;
                }
            } else {
                reply.code = 500;
                reply.error = "Module " + reqObj.moduleId + " isn't exists";
            }

            that.initResponse(reply);
        };
    },
    getInstanceFunc: function (instanceId) {
        var that = this;
        return function () {
            var reply = {
                error: null,
                data: null,
                code: 500
            };

            if (!that.controller.instances.hasOwnProperty(instanceId)) {
                reply.code = 404;
                reply.error = "Instance " + instanceId + " not found";
            } else {
                reply.code = 200;
                reply.data = that.controller.instances[instanceId].config;
            }

            this.initResponse(reply);
        };
    },
    reconfigureInstanceFunc: function (instanceId) {
        var that = this;
        return function () {
            var reply = {
                    error: null,
                    data: null
                },
                reqObj = this.req.reqObj,
                instance;

            if (!_.any(that.controller.instances, function (instance) { return instanceId === instance.id; })) {
                reply.code = 404;
                reply.error = "Instance " + reqObj.id + " doesn't exist";
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

            this.initResponse(reply);
        };
    },
    deleteInstanceFunc: function (instanceId) {
        var that = this;
        return function () {
            var reply = {
                error: null,
                data: null,
                code: 200
            };

            if (!_.any(that.controller.instances, function (instance) { return instance.id === instanceId; })) {
                reply.code = 404;
                reply.error = "Instance " + instanceId + " not found";
            } else {
                reply.code = 204;
                reply.data = null;
                that.controller.deleteInstance(instanceId);
            }

            this.initResponse(reply);
        };
    },
    // profiles
    listProfiles: function (profileId) {
        var that = this;
        return function () {
            var reply = {
                    error: null,
                    data: null,
                    code: 500
                },
                profiles,
                profile;

            if (profileId === undefined) {
                profiles = that.controller.getListProfiles();
                if (!Array.isArray(profiles)) {
                    reply.error = "Unknown error.";
                } else {
                    reply.code = 200;
                    reply.data = profiles;
                }
            } else {
                profile = that.controller.getProfile(profileId);
                if (profile && profile !== null && profile.id) {
                    reply.code = 200;
                    reply.data = profile;
                } else {
                    reply.code = 404;
                    reply.error = "Dashboard " + profile.id + " doesn't exist";
                }
            }

            this.initResponse(reply);
        };
    },
    createProfile: function () {
        var that = this;
        return function () {
            var reply = {
                    error: null,
                    data: null,
                    code: 500
                },
                reqObj,
                profile;

            try {
                reqObj = JSON.parse(this.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }

            if (reqObj.hasOwnProperty('name')) {
                profile = that.controller.createProfile(reqObj);
                if (profile !== undefined && profile.id !== undefined) {
                    reply.data = profile;
                    reply.code = 201;
                } else {
                    reply.code = 500;
                    reply.error = "Profile didn't created";
                }
            } else {
                reply.code = 500;
                reply.error = "Argument name is required";
            }

            this.initResponse(reply);
        };
    },
    updateProfile: function (profileId) {
        var that = this;
        return function () {
            var reply = {
                    error: null,
                    data: null,
                    code: 500
                },
                reqObj,
                profile;

            try {
                reqObj = JSON.parse(this.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }

            if (reqObj.hasOwnProperty('name') || reqObj.hasOwnProperty('description') || reqObj.hasOwnProperty('active') || reqObj.hasOwnProperty('widgets')) {
                profile = that.controller.updateProfile(reqObj, profileId);
                if (profile !== undefined && profile.id !== undefined) {
                    reply.data = profile;
                    reply.code = 200;
                } else {
                    reply.code = 500;
                    reply.error = "Object (profile) didn't created";
                }
            } else {
                reply.code = 500;
                reply.error = "Argument description, active, id, widgets is required";
            }

            this.initResponse(reply);
        };
    },
    removeProfile: function (profileId) {
        var that = this;
        return function () {
            var reply = {
                    error: null,
                    data: null,
                    code: 500
                },
                profile;

            if (profileId) {
                profile = that.controller.getProfile(profileId);
                if (profile) {
                    that.controller.removeProfile(profileId);
                    reply.data = null;
                    reply.code = 204;
                } else {
                    reply.code = 404;
                    reply.error = "Object (profile) " + profileId + " didn't created";
                }
            } else {
                reply.code = 500;
                reply.error = "Argument id widgets is required";
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

        this.controller.generateNamespaces(function (namespaces) {
            if (_.isArray(namespaces)) {
                reply.data = namespaces;
                reply.code = 200;
            } else {
                reply.error = "Namespaces array is null";
            }
        });

        this.initResponse(reply);
    },
    getNamespaceFunc: function (namespaceId) {
        var that = this;
        return function () {
            var reply = {
                    error: null,
                    data: null,
                    code: 500
                },
                namespace;

            that.controller.generateNamespaces();
            namespace = that.controller.getListNamespaces(namespaceId);
            if (namespace) {
                reply.data = namespace;
                reply.code = 200;
            } else {
                reply.code = 404;
                reply.error = "Namespaces " + namespaceId + " doesn't exist";
            }

            this.initResponse(reply);
        };
    },
    // restart
    restartController: function (profileId) {
        var reply = {
            error: null,
            data: null,
            code: 200
        };

        this.controller.restart();
        this.initResponse(reply);
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
