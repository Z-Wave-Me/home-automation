/*** Main Automation webserver module *****************************************

Version:
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013

******************************************************************************/

// ----------------------------------------------------------------------------
// --- ZAutomationAPIWebRequest
// ----------------------------------------------------------------------------

function ZAutomationAPIWebRequest () {
    ZAutomationAPIWebRequest.super_.call(this);

    this.res = {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: null
    }
};

inherits(ZAutomationAPIWebRequest, ZAutomationWebRequest);

ZAutomationAPIWebRequest.prototype._vdevMetaOnly = function (vDev) {
    return {
        id: vDev.id,
        deviceType: vDev.deviceType,
        metrics: vDev.metrics,
        tags: vDev.tags,
        location: vDev.location,
        updateTime: vDev.updateTime,
        position: vDev.position
    };
}

ZAutomationAPIWebRequest.prototype.statusReport = function () {
    var reply = {
        error: null,
        data: "OK",
        code: 200
    }

    controller.addNotification("debug", "Status report requested");
    this.initResponse(reply);
};

ZAutomationAPIWebRequest.prototype.listDevices = function () {
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
        self = this;

    since = isNaN(since) ? 0 : since;

    reply.data.structureChanged = controller.lastStructureChangeTime >= since;
    if (reply.data.structureChanged) {
        // Report all devices if structure was changed
        since = 0;
    }

    Object.keys(controller.devices).forEach(function (vDevId) {
        if (controller.devices[vDevId].updateTime >= since) {
            reply.data.devices.push(self._vdevMetaOnly(controller.devices[vDevId]));
        }
    });

    self.initResponse(reply);
};

ZAutomationAPIWebRequest.prototype.exposeNotifications = function () {
    var nowTS = Math.floor(new Date().getTime() / 1000),
        notifications,
        reply = {
            error: null,
            data: null
        }, since, redeemed, that = this;


    return function () {
        that.res.status = 200;
        since = that.req.query.hasOwnProperty("since") ? parseInt(that.req.query.since, 10) : 0;
        redeemed = that.req.query.hasOwnProperty("redeemed") && (String(that.req.query.redeemed)) === 'true' ? true : false;
        notifications = controller.listNotifications(since);

        if (redeemed) {
            reply.data = {
                updateTime: nowTS,
                notifications: notifications
            };
            reply.code = 200;
        } else {
            notifications = notifications.filter(function (notification) {
                return !notification.redeemed;
            });
            reply.data = {
                updateTime: nowTS,
                notifications: notifications
            };
            reply.code = 200;
        }

        that.initResponse(reply);
    }
};


ZAutomationAPIWebRequest.prototype.getNotificationFunc = function (notificationId) {
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
            notification = controller.getNotification(id);
            if (notification) {
                reply.code = 200;
                reply.data = notification;
            } else {
                reply.code = 404;
                reply.error = "Notification " + notificationId + " doesn't exist";
            }
        } else {
            reply.code = 400;
            reply.error = "Argument id is required"
        }

        that.initResponse(reply);
    }
}

ZAutomationAPIWebRequest.prototype.markNotificationsRead = function (notificationId) {
    var reply = {
            error: null,
            data: "OK"
        },
        reqObj,
        that = this,
        id,
        removeNotification;

    return function () {
        removeNotification = that.req.query.hasOwnProperty("removeNotification") ? that.req.query.removeNotification : false;
        if (that.req.method === 'PUT' || that.req.method === 'POST') {
            try {
                reqObj = JSON.parse(this.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }
            if (that.req.method === 'POST') {
                id = Array.isArray(reqObj) ? reqObj : [reqObj];
            } else {
                id = notificationId !== undefined ?  parseInt(notificationId): parseInt(reqObj.id);
            }
        } else if (that.req.method === 'GET') {
            id = that.req.query.hasOwnProperty("id") ? parseInt(that.req.query.hasOwnProperty("id")) : 0;
        }

        if (id) {
            controller.deleteNotifications(id, function (status) {
                if (status) {
                    reply.code = 200;
                } else if (!status && Array.isArray(id)) {
                    reply.code = 500;
                    reply.error = "Payload must an array with at least one id or must be and array of strings.";
                } else {
                    reply.code = 500;
                    reply.error = "Unknown error.";
                }
            }, removeNotification);
        } else {
            reply.code = 404;
            reply.error = "Notification " + notificationId + " doesn't exist";
        }

        that.initResponse(reply);
    }
};

ZAutomationAPIWebRequest.prototype.getVDevFunc = function (vDevId) {
    var self = this,
        reply = {
            error: null,
            data: null
        };

    return function () {
        if (controller.devices.hasOwnProperty(vDevId)) {
            reply.code = 200;
            //reply.data = {
            //   meta: self._vdevMetaOnly(controller.devices[vDevId]),
            //   data: controller.getVdevInfo(vDevId)
            //}
            reply.data = self._vdevMetaOnly(controller.devices[vDevId]);
        } else {
            reply.code = 404;
            reply.error = "Device " + vDevId + " doesn't exist";
        }
        self.initResponse(reply);
    }
}

ZAutomationAPIWebRequest.prototype.setVDevFunc = function (vDevId) {
    var self = this, reqObj, reply = {
        error: null,
        data: null
    };

    return function () {
        try {
            reqObj = JSON.parse(self.req.body);
        } catch (ex) {
            reply.error = ex.message;
        }

        if (controller.devices.hasOwnProperty(vDevId)) {
            reply.code = 200;
            controller.devices[vDevId].setVDevObject(vDevId, reqObj);
            reply.data = self._vdevMetaOnly(controller.devices[vDevId]);
        } else {
            reply.code = 404;
            reply.error = "Device " + vDevId + " doesn't exist";
        }
        self.initResponse(reply);
    }
}

ZAutomationAPIWebRequest.prototype.performVDevCommandFunc = function (vDevId, commandId) {
    var self = this;

    return function () {
        var reply = {
            error: null,
            data: !!controller.devices[vDevId].performCommand.call(controller.devices[vDevId], commandId, self.req.query)
        }

        reply.code = 200;
        self.initResponse(reply);
    }
}

ZAutomationAPIWebRequest.prototype.restartController = function () {
    var reply = {
        error: null,
        data: {}
    }

    controller.restart();

    this.code = 200;
    this.initResponse(reply);
};

ZAutomationAPIWebRequest.prototype.listLocations = function (locationId) {
    var that = this,
        reply = {
            data: null,
            error: null
        };

    reply.code = 200;

    return function () {
        if (locationId === undefined) {
            reply.data = controller.locations;
        } else {
            var locations = controller.locations.filter(function(location) {
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
    }
};

ZAutomationAPIWebRequest.prototype.addLocation = function () {
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
            title = title;
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
            controller.addLocation(title, icon, function (data) {
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
    }
};

ZAutomationAPIWebRequest.prototype.removeLocation = function (locationId) {
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
            controller.removeLocation(id, function (result) {
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
    }
};

ZAutomationAPIWebRequest.prototype.updateLocation = function (locationId) {

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
            controller.updateLocation(id, title, function (data) {
                if (data) {
                    reply.data = data
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
    }
};

ZAutomationAPIWebRequest.prototype.setVDevLocationFunc = function (vDevId) {
    var self = this;

    return function () {
        var id = this.req.query.id;

        var reply = {
            error: null,
            data: null
        }

        if (!!id) {
            if (!controller.locations.hasOwnProperty(id)) {
                reply.code = 500;
                reply.error = "Location " + id + " doesn't exist";
            } else {
                reply.code = 200;
                controller.devices[vDevId].location = id;
                if (!controller.vdevInfo.hasOwnProperty(vDevId)) {
                    controller.vdevInfo[vDevId] = {};
                }
                controller.vdevInfo[vDevId].location = id;
                controller.saveConfig();
            }
        } else {
            reply.code = 500;
            reply.error = "Location id is required";
        }

        this.initResponse(reply);
    }
}

ZAutomationAPIWebRequest.prototype.removeVDevLocationFunc = function (vDevId) {
    var self = this;

    return function () {
        var reply = {
            error: null,
            data: "OK"
        }

        this.res.status = 200;
        controller.devices[vDevId].location = null;
        if (!controller.vdevInfo.hasOwnProperty(vDevId)) {
            controller.vdevInfo[vDevId] = {};
        }
        controller.vdevInfo[vDevId].location = null;
        controller.saveConfig();
        reply.data = "OK";

        this.responseHeader("Content-Type", "application/json; charset=utf-8");
        this.res.body = JSON.stringify(reply);
    }
}

ZAutomationAPIWebRequest.prototype.setVDevTitleFunc = function (vDevId) {
    var self = this;

    return function () {
        var title = this.req.query.title;

        var reply = {
            error: null,
            data: null
        }

        if (!!title) {
            if (!controller.devices.hasOwnProperty(vDevId)) {
                this.res.status = 500;
                reply.error = "Device "+vDevId+" doesn't exist";
            } else {
                this.res.status = 200;
                controller.devices[vDevId].setMetricValue("title", title);
                if (!controller.vdevInfo.hasOwnProperty(vDevId)) {
                    controller.vdevInfo[vDevId] = {};
                }
                controller.vdevInfo[vDevId].title = title;
                controller.saveConfig();
                reply.data = "OK";
            }
        } else {
            this.res.status = 500;
            reply.error = "Argument title is required";
        }

        this.responseHeader("Content-Type", "application/json; charset=utf-8");
        this.res.body = JSON.stringify(reply);
    }
}

ZAutomationAPIWebRequest.prototype.addVDevTagFunc = function (vDevId) {
    var self = this;

    return function () {
        var tag = this.req.query.tag;

        var reply = {
            error: null,
            data: null
        }

        if (!!tag) {
            if (!controller.devices.hasOwnProperty(vDevId)) {
                this.res.status = 500;
                reply.error = "Device "+vDevId+" doesn't exist";
            } else {
                this.res.status = 200;
                controller.devices[vDevId].addTag(tag);
                reply.data = controller.devices[vDevId].tags;
            }
        } else {
            this.res.status = 500;
            reply.error = "Argument title is required";
        }

        this.responseHeader("Content-Type", "application/json; charset=utf-8");
        this.res.body = JSON.stringify(reply);
    }
}

ZAutomationAPIWebRequest.prototype.removeVDevTagFunc = function (vDevId) {
    var self = this;

    return function () {
        var tag = this.req.query.tag;

        var reply = {
            error: null,
            data: null
        }

        if (!!tag) {
            if (!controller.devices.hasOwnProperty(vDevId)) {
                this.res.status = 500;
                reply.error = "Device "+vDevId+" doesn't exist";
            } else {
                this.res.status = 200;
                controller.devices[vDevId].removeTag(tag);
                reply.data = controller.devices[vDevId].tags;
            }
        } else {
            this.res.status = 500;
            reply.error = "Argument title is required";
        }

        this.responseHeader("Content-Type", "application/json; charset=utf-8");
        this.res.body = JSON.stringify(reply);
    }
}

ZAutomationAPIWebRequest.prototype.listModules = function () {
    var reply = {
            error: null,
            data: [],
            code: 200
        },
        module = null;

    Object.keys(controller.modules).forEach(function (className) {
        module = controller.modules[className].meta;
        if (module.hasOwnProperty('userView') && module.userView)  {
            module.className = className;
            reply.data.push(module);
        }
    });

    this.initResponse(reply);
};


ZAutomationAPIWebRequest.prototype.listInstances = function () {
    var reply = {
        error: null,
        data: controller.instances,
        code: 200
    };

    this.initResponse(reply);
};

ZAutomationAPIWebRequest.prototype.createInstance = function () {

    return function () {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            reqObj = this.req.reqObj,
            that = this,
            instance;

        if (!controller.modules.hasOwnProperty(reqObj.moduleId)) {
            instance = controller.createInstance(reqObj.moduleId, reqObj.params);
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

        that.initResponse(reply)
    }
};

ZAutomationAPIWebRequest.prototype.getInstanceFunc = function (instanceId) {
    return function () {
        var reply = {
            error: null,
            data: null,
            code: 500
        }

        if (!controller.instances.hasOwnProperty(instanceId)) {
            reply.code = 404;
            reply.error = "Instance " + instanceId + " not found";
        } else {
            reply.code = 200;
            reply.data = controller.instances[instanceId].config;
        }

        this.initResponse(reply);
    }
};

ZAutomationAPIWebRequest.prototype.reconfigureInstanceFunc = function (instanceId) {
    return function () {
        var reply = {
                error: null,
                data: null
            },
            reqObj = this.req.reqObj;

        console.log(JSON.stringify(controller.instances));

        if (!_.any(controller.instances, function (instance) { return instanceId === instance.id; })) {
            reply.code = 404;
            reply.error = "Instance " + reqObj.id + " doesn't exist";
        } else {
            if (controller.reconfigureInstance(instanceId, reqObj)) {
                reply.code = 200;
                reply.data = _.find(controller.instances, function (instance) { return instanceId === instance.id; })
            } else {
                reply.code = 500;
                reply.error = "Cannot reconfigure module " + instanceId + " config";
            };
        };

        this.initResponse(reply);
    }
};

ZAutomationAPIWebRequest.prototype.deleteInstanceFunc = function (instanceId) {
    return function () {
        this.res.status = 500;
        this.responseHeader("Content-Type", "application/json; charset=utf-8");

        var reply = {
            error: null,
            data: null
        }

        // console.log("--- INSTANCES", JSON.stringify(controller.instances, null, "  "));
        if (!controller.instances.hasOwnProperty(instanceId)) {
            this.res.status = 404;
            reply.error = "Instance " + instanceId + " not found";
        } else {
            this.res.status = 204;
            reply = null;
            controller.deleteInstance(instanceId);
        }

        this.res.body = JSON.stringify(reply);
    }
};

// Dashobard

ZAutomationAPIWebRequest.prototype.listProfiles = function (profileId) {
    return function () {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            profiles,
            profile;

        if (profileId === undefined) {
            profiles = controller.getListProfiles();
            if (!Array.isArray(profiles)) {
                reply.error = "Unknown error.";
            } else {
                reply.code = 200;
                reply.data = profiles;
            }
        } else {
            profile = controller.getProfile(profileId);
            if (profile && profile !== null && profile.id) {
                reply.code = 200;
                reply.data = profile;
            } else {
                reply.code = 404;
                reply.error = "Dashboard " + profile.id + " doesn't exist";
            }
        }

        this.initResponse(reply);
    }
};

ZAutomationAPIWebRequest.prototype.createProfile = function () {
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
            profile = controller.createProfile(reqObj);
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
    }
};


ZAutomationAPIWebRequest.prototype.updateProfile = function (profileId) {
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
            profile = controller.updateProfile(reqObj, profileId);
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
    }
};

ZAutomationAPIWebRequest.prototype.removeProfile = function (profileId) {
    return function () {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            profile;

        if (profileId) {
            profile = controller.getProfile(profileId);
            if (profile) {
                controller.removeProfile(profileId);
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
    }
};

// Shemas

ZAutomationAPIWebRequest.prototype.listSchemas = function () {
    var reply = {
        error: null,
        data: null,
        code: 500
    }, schemas;


    schemas = controller.getListSchemas()
    if (Array.isArray(schemas)) {
        reply.data = schemas;
        reply.code = 200;
    }

    this.initResponse(reply);
};

ZAutomationAPIWebRequest.prototype.getSchema = function (schemaId) {
   return function () {
       var reply = {
           error: null,
           data: null,
           code: 500
       }, schema;

       schema = controller.getListSchemas(schemaId);
       if (schema && schema.hasOwnProperty('id')) {
           reply.data = schema;
           reply.code = 200;
       } else {
           reply.code = 404;
           reply.error = "Schema " + schemaId + " doesn't exist";
       }

       this.initResponse(reply);
   }
};

ZAutomationAPIWebRequest.prototype.createSchema = function () {
    return function () {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            reqObj = this.req.reqObj,
            schema;


        if (reqObj.hasOwnProperty('title') && reqObj.hasOwnProperty('schema')) {
            schema = controller.createSchema(reqObj);
            if (schema !== undefined && schema.id !== undefined) {
                reply.data = schema;
                reply.code = 201;
            } else {
                reply.code = 500;
                reply.error = "Object (profile) didn't created";
            }
        } else {
            reply.code = 500;
            reply.error = "Argument title and schema is required";
        }

        this.initResponse(reply);
    }
};

ZAutomationAPIWebRequest.prototype.updateSchema = function (schemaId) {
    return function () {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            reqObj = this.req.reqObj,
            schema;


        if (reqObj.hasOwnProperty('title') || reqObj.hasOwnProperty('schema')) {
            schema = controller.updateSchema(reqObj, schemaId);
            if (schema !== undefined && schema.id !== undefined) {
                reply.data = schema;
                reply.code = 200;
            } else {
                reply.code = 500;
                reply.error = "Object (schema) didn't created";
            }
        } else {
            reply.code = 500;
            reply.error = "Argument title or schema is required";
        }

        this.initResponse(reply);
    }
};


ZAutomationAPIWebRequest.prototype.deleteSchema = function (schemaId) {
    return function () {
        var reply = {
                error: null,
                data: null,
                code: 500
            },
            schema;


        if (schemaId) {
            schema = controller.getListSchemas(schemaId);
            if (schema && schema.hasOwnProperty('id')) {
                controller.removeSchema(schemaId);
                reply.code = 204;
                reply.data = null;
            } else {
                reply.code = 404;
                reply.error = "Object (schema) didn't created";
            }
        } else {
            reply.code = 500;
            reply.error = "Argument schemaId is required";
        }

        this.initResponse(reply);
    }
};

ZAutomationAPIWebRequest.prototype.dispatchRequest = function (method, url) {
    // Default handler is NotFound
    var handlerFunc = this.NotFound;

    // ---------- Test exact URIs ---------------------------------------------

    if ("GET" === method && "/v1/status" == url) {
        handlerFunc = this.statusReport;
    } else if ("GET" === method && "/v1/notifications" == url) {
        handlerFunc = this.exposeNotifications();
    } else if ("GET" === method && "/v1/notifications/markRead" == url) {
        handlerFunc = this.markNotificationsRead();
    } else if ("GET" === method && "/v1/devices" == url) {
        handlerFunc = this.listDevices;
    } else if ("GET" === method && "/v1/restart" == url) {
        handlerFunc = this.restartController;
    } else if ("GET" === method && "/v1/locations" == url) {
        handlerFunc = this.listLocations();
    } else if ("GET" === method && "/v1/profiles" == url) {
        handlerFunc = this.listProfiles();
    } else if (("POST" === method) && "/v1/profiles" == url) {
        handlerFunc = this.createProfile();
    } else if (("GET" === method && "/v1/locations/add" == url) || ("POST" === method && "/v1/locations" == url)) {
        handlerFunc = this.addLocation();
    } else if ("GET" === method && "/v1/locations/remove" == url) {
        handlerFunc = this.removeLocation();
    } else if ("GET" === method && "/v1/locations/update" == url) {
        handlerFunc = this.updateLocation();
    } else if ("GET" === method && "/v1/modules" == url) {
        handlerFunc = this.listModules;
    } else if ("GET" === method && "/v1/instances" == url) {
        handlerFunc = this.listInstances;
    } else if (("POST" === method) && "/v1/instances" == url) {
        handlerFunc = this.createInstance();
    } else if ("GET" === method && "/v1/schemas" == url) {
        handlerFunc = this.listSchemas;
    } else if ("POST" === method && "/v1/schemas" == url) {
        handlerFunc = this.createSchema();
    } else if ("OPTIONS" === method) {
        handlerFunc = this.CORSRequest;
    };

    // ---------- Test regexp URIs --------------------------------------------
    var re, reTest;

    // --- Perform vDev command
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/devices\/(.+)\/command\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var vDevId = reTest[1];
            var commandId = reTest[2];
            if ("GET" === method && !!vDevId && !!commandId && controller.devices.hasOwnProperty(vDevId)) {
                handlerFunc = this.performVDevCommandFunc(vDevId, commandId);
            }
        }
    }

    // --- Set vDev location
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/devices\/(.+)\/setLocation/;
        reTest = re.exec(url);
        if (!!reTest) {
            var vDevId = reTest[1];
            if ("GET" === method && !!vDevId && controller.devices.hasOwnProperty(vDevId)) {
                handlerFunc = this.setVDevLocationFunc(vDevId);
            }
        }
    }

    // --- Remove vDev location
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/devices\/(.+)\/removeLocation/;
        reTest = re.exec(url);
        if (!!reTest) {
            var vDevId = reTest[1];
            if ("GET" === method && !!vDevId && controller.devices.hasOwnProperty(vDevId)) {
                handlerFunc = this.removeVDevLocationFunc(vDevId);
            }
        }
    }

    // --- Remove and Update location
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/locations\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var locationId = parseInt(reTest[1]);
            if ("DELETE" === method && locationId) {
                handlerFunc = this.removeLocation(locationId);
            } else if ("PUT" === method && locationId) {
                handlerFunc = this.updateLocation(locationId);
            } else if ("GET" === method && locationId) {
                handlerFunc = this.listLocations(locationId);
            }
        }
    }

    // --- Remove and Update notifications
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/notifications\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var notificationId = parseInt(reTest[1]);
            if ("PUT" === method && notificationId) {
                handlerFunc = this.markNotificationsRead(notificationId);
            } else if ("GET" === method && notificationId) {
                handlerFunc = this.getNotificationFunc(notificationId);
            }
        }
    }

    // --- Set vDev title
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/devices\/(.+)\/setTitle/;
        reTest = re.exec(url);
        if (!!reTest) {
            var vDevId = reTest[1];
            if ("GET" === method && !!vDevId && controller.devices.hasOwnProperty(vDevId)) {
                handlerFunc = this.setVDevTitleFunc(vDevId);
            }
        }
    }


    // --- Remove and Update profiles
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/profiles\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var profileId = parseInt(reTest[1]);
            if ("DELETE" === method && profileId) {
                handlerFunc = this.removeProfile(profileId);
            } else if ("PUT" === method && profileId) {
                handlerFunc = this.updateProfile(profileId);
            } else if ("GET" === method && profileId) {
                handlerFunc = this.listProfiles(profileId);
            }
        }
    }

    // --- Remove and Update schemas
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/schemas\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var schemaId = parseInt(reTest[1]);
            if ("DELETE" === method && schemaId) {
                handlerFunc = this.deleteSchema(schemaId);
            } else if ("PUT" === method && schemaId) {
                handlerFunc = this.updateSchema(schemaId);
            } else if ("GET" === method && schemaId) {
                handlerFunc = this.getSchema(schemaId);
            }
        }
    }

    // --- Add tag to the vDev
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/devices\/(.+)\/addTag/;
        reTest = re.exec(url);
        if (!!reTest) {
            var vDevId = reTest[1];
            if ("GET" === method && !!vDevId && controller.devices.hasOwnProperty(vDevId)) {
                handlerFunc = this.addVDevTagFunc(vDevId);
            }
        }
    }

    // --- Remove tag from the vDev
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/devices\/(.+)\/removeTag/;
        reTest = re.exec(url);
        if (!!reTest) {
            var vDevId = reTest[1];
            if ("GET" === method && !!vDevId && controller.devices.hasOwnProperty(vDevId)) {
                handlerFunc = this.removeVDevTagFunc(vDevId);
            }
        }
    }

    // --- Get and Set VDev meta
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/devices\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var vDevId = reTest[1];
            if ("GET" === method && !!vDevId) {
                handlerFunc = this.getVDevFunc(vDevId);
            } else if ("PUT" === method && !!vDevId) {
                handlerFunc = this.setVDevFunc(vDevId);
            }
        }
    }

    // --- Get instance config
    if (handlerFunc === this.NotFound) {
        re = /\/v1\/instances\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var instanceId = parseInt(reTest[1]);
            if ("GET" === method && !!instanceId) {
                handlerFunc = this.getInstanceFunc(instanceId);
            } else if ("PUT" === method && !!instanceId) {
                handlerFunc = this.reconfigureInstanceFunc(instanceId);
            } else if ("DELETE" === method && !!instanceId) {
                handlerFunc = this.deleteInstanceFunc(instanceId);
            }
        }
    }

    // --- Proceed to checkout =)
    return handlerFunc;
};
