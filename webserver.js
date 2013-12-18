/*** Main Automation webserver module *****************************************

Version:
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Copyright: (c) ZWave.Me, 2013

******************************************************************************/

// ----------------------------------------------------------------------------
// --- ZAutomationWebRequest
// ----------------------------------------------------------------------------

function ZAutomationWebRequest () {
    this.req = {};
    this.res = {
        status: 501,
        headers: {
            "Content-Type": "text/plain; charset=utf-8"
        },
        body: null
    };
}

ZAutomationWebRequest.prototype.handlerFunc = function () {
    var self = this;

    return function () {
        return self.handleRequest.apply(self, arguments);
    };
};

ZAutomationWebRequest.prototype.responseHeader = function (name, value) {
    if (!!value) {
        this.res.headers[name] = value;
    } else {
        return this.res.headers[name];
    }
}

ZAutomationWebRequest.prototype.initResponse = function (code, contentType) {
    this.res.status = code;

    if (!!contentType)
        this.responseHeader("Content-Type", contentType);
}

ZAutomationWebRequest.prototype.dispatchRequest = function (method, url) {
    return this.NotImplementedReply;
}

ZAutomationWebRequest.prototype.handleRequest = function (url, request) {
    var now = new Date();

    // Fill internal structures
    this.req.url = url;
    this.req.method = request.method;
    this.req.query = request.query;
    this.req.body = request.body || "";

    // Get and run request processor func
    var requestProcessorFunc = this.dispatchRequest(request.method, url);
    requestProcessorFunc.call(this);

    // Log request reply
    var bodyLength = "string" === typeof this.res.body ? this.res.body.length : "?";

    // Return to the z-way-http
    return this.res;
}

ZAutomationWebRequest.prototype.NotImplementedReply = function () {
    this.res = {
        status: 501,
        body : "Not implemented, yet",
        headers: {
            "Content-Type": "text/plain; charset=utf-8"
        }
    };
};

ZAutomationWebRequest.prototype.NotFound = function () {
    this.res = {
        status: 404,
        headers: {
            "Content-Type": "text/plain; charset=utf-8"
        },
        body: "Not Found"
    }
};

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
        updateTime: vDev.updateTime
    }
}

ZAutomationAPIWebRequest.prototype.statusReport = function () {
    reply = {
        error: null,
        data: "OK"
    }

    controller.addNotification("debug", "Status report requested");

    this.res.status = 200;
    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.CORSRequest = function () {
    this.responseHeader('Access-Control-Allow-Origin', '*');
    this.responseHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    this.responseHeader('Access-Control-Allow-Headers', 'Content-Type');
    this.res.status = 200;
};


ZAutomationAPIWebRequest.prototype.listDevices = function () {
    var nowTS = Math.floor(new Date().getTime() / 1000);
    var reply = {
        error: null,
        data: {
            structureChanged: false,
            updateTime: nowTS,
            devices: []
        }
    }

    var since = this.req.query.hasOwnProperty("since") ? parseInt(this.req.query.since, 10) : 0;
    since = isNaN(since) ? 0 : since;

    reply.data.structureChanged = controller.lastStructureChangeTime >= since;
    if (reply.data.structureChanged) {
        // Report all devices if structure was changed
        since = 0;
    }

    var self = this;
    Object.keys(controller.devices).forEach(function (vDevId) {
        if (controller.devices[vDevId].updateTime >= since) {
            reply.data.devices.push(self._vdevMetaOnly(controller.devices[vDevId]));
        }
    });

    this.res.status = 200;
    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.exposeNotifications = function (notificationId) {
    var nowTS = Math.floor(new Date().getTime() / 1000),
        notifications,
        reply = {
            error: null,
            data: null
        }, id, since, redeemed, that = this;


    return function () {
        that.res.status = 200;
        since = that.req.query.hasOwnProperty("since") ? parseInt(that.req.query.since, 10) : 0;
        redeemed = that.req.query.hasOwnProperty("redeemed") && (String(that.req.query.redeemed)) === 'true' ? true : false;
        since = isNaN(since) ? 0 : since;
        redeemed = isNaN(redeemed) ? 0 : redeemed;
        notifications = controller.listNotifications(since);

        if (notificationId !== undefined) {
            id = notificationId || null;
        } else {
            id = that.req.query.hasOwnProperty("id") ? parseInt(that.req.query.id) : 0;
        }

        if (!id && redeemed) {
            reply.data = {
                updateTime: nowTS,
                notifications: notifications
            };
        } else if (!id && !redeemed) {
            notifications = notifications.filter(function (notification) {
                return !notification.redeemed;
            });
            reply.data = {
                updateTime: nowTS,
                notifications: notifications
            };
        } else if (id) {
            notifications = notifications.filter(function (notification) {
                return parseInt(notification.id) === id;
            });
            if (notifications.length > 0) {
                reply.data = notifications[0];
            } else {
                reply.error = "Notification " + notificationId + " doesn't exist";
                that.res.status = 404;
            }
        } else {
            reply.error = "Argument id is required";
            that.res.status = 404;
        }

        that.responseHeader("Content-Type", "application/json; charset=utf-8");
        that.res.body = JSON.stringify(reply);
    }
};

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
        removeNotification = that.req.query.hasOwnProperty("removeNotication") ? that.req.query.removeNotification : false;
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
                    that.res.status = 200;
                } else if (!status && Array.isArray(id)) {
                    that.res.status = 500;
                    reply.error = "Payload must an array with at least one id or must be and array of strings.";
                } else {
                    that.res.status = 500;
                    reply.error = "Unknown error.";
                }
            }, removeNotification);
        } else {
            that.res.status = 404;
            reply.error = "Notification " + notificationId + " doesn't exist";
        }
        that.responseHeader("Content-Type", "application/json; charset=utf-8");
        that.res.body = JSON.stringify(reply);
    }
};

ZAutomationAPIWebRequest.prototype.getVDevFunc = function (vDevId) {
    var self = this, reply = {
        error: null,
        data: null
    };

    return function () {
        if (controller.devices.hasOwnProperty(vDevId)) {
            self.res.status = 200;
            reply.data = {
                meta: self._vdevMetaOnly(controller.devices[vDevId]),
                data: controller.getVdevInfo(vDevId)
            }
        } else {
            self.res.status = 404;
            reply.error = "Device " + vDevId + " doesn't exist";
        }

        self.responseHeader("Content-Type", "application/json; charset=utf-8");
        self.res.body = JSON.stringify(reply);
    }
}

ZAutomationAPIWebRequest.prototype.setVDevFunc = function (vDevId) {
    var self = this, reqObj, reply = {
        error: null,
        data: null
    };

    return function () {
        if (self.req.method === 'PUT') {
            try {
                reqObj = JSON.parse(self.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }
        }

        if (controller.devices.hasOwnProperty(vDevId)) {
            self.res.status = 200;
            controller.devices[vDevId].setVDevObject(reqObj);
            reply.data = controller.getVdevInfo(vDevId);
        } else {
            self.res.status = 404;
            reply.error = "Device " + vDevId + " doesn't exist";
        }

        this.res.status = 200;
        this.responseHeader("Content-Type", "application/json; charset=utf-8");
        this.res.body = JSON.stringify(reply);
    }
}

ZAutomationAPIWebRequest.prototype.performVDevCommandFunc = function (vDevId, commandId) {
    var self = this;

    return function () {
        var reply = {
            error: null,
            data: !!controller.devices[vDevId].performCommand.call(controller.devices[vDevId], commandId, self.req.query)
        }

        self.res.status = 200;
        self.responseHeader("Content-Type", "application/json; charset=utf-8");
        self.res.body = JSON.stringify(reply);
    }
}

ZAutomationAPIWebRequest.prototype.restartController = function () {
    reply = {
        error: null,
        data: {}
    }

    controller.restart();

    this.res.status = 200;
    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.listLocations = function (locationId) {
    var that = this,
        reply = {
            data: null,
            error: null
        };

    that.res.status = 200;

    return function () {
        if (locationId === undefined) {
            reply.data = controller.locations;
        } else {
            var locations = controller.locations.filter(function(location) {
                return location.id === locationId;
            });

            if (locations.length > 0) {
                reply.data = locations[0];
            } else {
                that.res.status = 404;
                reply.error = "Location " + locationId + " doesn't exist";
            }
        }

        that.responseHeader("Content-Type", "application/json; charset=utf-8");
        that.res.body = JSON.stringify(reply);
    }
};

ZAutomationAPIWebRequest.prototype.addLocation = function () {
    var title,
        reply = {
            error: null,
            data: null
        },
        reqObj,
        that = this;

    return function () {
        if (that.req.method === 'GET') {
            title = that.req.query.title;
        } else if (that.req.method === 'POST') { // POST
            try {
                reqObj = JSON.parse(that.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }

            title = reqObj.title;
        }

        if (!!title) {
            controller.addLocation(title, function (data) {
                if (data) {
                    that.res.status = that.req.method === 'POST' ? 201 : 200;
                    reply.data = data;
                    reply.status = "OK";
                    that.res.body = JSON.stringify(reply);
                } else {
                    that.res.status = 500;
                    reply.error = "Unknown error. Location doesn't created";
                }
            });
        } else {
            that.res.status = 500;
            reply.error = "Arguments title are required";
        }
    }

    that.responseHeader("Content-Type", "application/json; charset=utf-8");
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
                    that.res.status = 200;
                    reply.data = "OK";
                } else {
                    that.res.status = 404;
                    reply.error = "Location " + id + " doesn't exist";
                }
            });
        } else {
            that.res.status = 500;
            reply.error = "Argument id is required";
        }

        that.responseHeader("Content-Type", "application/json; charset=utf-8");
        that.res.body = JSON.stringify(reply);
    }
};

ZAutomationAPIWebRequest.prototype.updateLocation = function (locationId) {
    var that = this;

    return function () {
        var id,
            title,
            reply = {
                error: null,
                data: null
            },
            reqObj;

        if (that.req.method === 'GET') {
            id = parseInt(that.req.query.id);
            title = that.req.query.title;
        } else if (that.req.method === 'PUT') {
            try {
                reqObj = JSON.parse(that.req.body);
            } catch (ex) {
                reply.error = ex.message;
            }
            id = locationId || reqObj.id;
            title = reqObj.title;
        }

        if (!!id && !!title && title.length > 0) {
            that.res.status = 200;
            controller.updateLocation(id, title, function (data) {
                if (data) {
                    that.res.status = 200;
                    reply.data = data
                    reply.status = "OK";
                } else {
                    that.res.status = 404;
                    reply.error = "Location " + id + " doesn't exist";
                }
            });
        } else {
            that.res.status = 500;
            reply.error = "Arguments id & title are required";
        }

        that.responseHeader("Content-Type", "application/json; charset=utf-8");
        that.res.body = JSON.stringify(reply);
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
                this.res.status = 500;
                reply.error = "Location "+id+" doesn't exist";
            } else {
                this.res.status = 200;
                controller.devices[vDevId].location = id;
                if (!controller.vdevInfo.hasOwnProperty(vDevId)) {
                    controller.vdevInfo[vDevId] = {};
                }
                controller.vdevInfo[vDevId].location = id;
                controller.saveConfig();
                reply.data = "OK";
            }
        } else {
            this.res.status = 500;
            reply.error = "Location id is required";
        }

        this.responseHeader("Content-Type", "application/json; charset=utf-8");
        this.res.body = JSON.stringify(reply);
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
    reply = {
        error: null,
        data: {}
    }

    Object.keys(controller.modules).forEach(function (className) {
        reply.data[className] = controller.modules[className].meta;
    });

    this.res.status = 200;
    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};


ZAutomationAPIWebRequest.prototype.listInstances = function () {
    reply = {
        error: null,
        data: Object.keys(controller.instances).map(function (instanceId) {
            return controller.instances[instanceId].toJSON();
        })
    }

    this.res.status = 200;
    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.createInstance = function () {
    this.res.status = 500;
    this.responseHeader("Content-Type", "application/json; charset=utf-8");

    reply = {
        error: null,
        data: null
    }

    var reqObj;
    try {
        reqObj = JSON.parse(this.req.body);
    } catch (ex) {
        reply.error = ex.message;
    }

    if ("object" === typeof reqObj) {
        if (controller.instances.hasOwnProperty(reqObj.id)) {
            this.res.status = 500;
            reply.error = "Module " + reqObj.id + " already exists";
        } else {
            if (controller.createInstance(reqObj.id, reqObj.module, reqObj.config)) {
                this.res.status = 201;
            } else {
                this.res.status = 500;
                reply.error = "Cannot instantiate module " + reqObj.id;
            }
        }
    }

    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.getInstanceFunc = function (instanceId) {
    return function () {
        this.res.status = 500;
        this.responseHeader("Content-Type", "application/json; charset=utf-8");

        reply = {
            error: null,
            data: null
        }

        if (!controller.instances.hasOwnProperty(instanceId)) {
            this.res.status = 404;
            reply.error = "Instance " + instanceId + " not found";
        } else {
            this.res.status = 200;
            reply.data = controller.instances[instanceId].config;
        }

        this.res.body = JSON.stringify(reply);
    }
};

ZAutomationAPIWebRequest.prototype.reconfigureInstanceFunc = function (instanceId) {
    return function () {
        this.res.status = 500;
        this.responseHeader("Content-Type", "application/json; charset=utf-8");

        reply = {
            error: null,
            data: null
        }

        var reqObj;
        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
        }

        if ("object" === typeof reqObj) {
            if (!controller.instances.hasOwnProperty(instanceId)) {
                this.res.status = 404;
                reply.error = "Module " + reqObj.id + " doesn't exist";
            } else {
                if (controller.reconfigureInstance(instanceId, reqObj)) {
                    this.res.status = 200;
                } else {
                    this.res.status = 500;
                    reply.error = "Cannot reconfigure module " + instanceId + " config";
                };
            };
        };

        this.res.body = JSON.stringify(reply);
    }
};

ZAutomationAPIWebRequest.prototype.deleteInstanceFunc = function (instanceId) {
    return function () {
        this.res.status = 500;
        this.responseHeader("Content-Type", "application/json; charset=utf-8");

        reply = {
            error: null,
            data: null
        }

        // console.log("--- INSTANCES", JSON.stringify(controller.instances, null, "  "));
        if (!controller.instances.hasOwnProperty(instanceId)) {
            this.res.status = 404;
            reply.error = "Instance " + instanceId + " not found";
        } else {
            this.res.status = 202;
            controller.deleteInstance(instanceId);
        }

        this.res.body = JSON.stringify(reply);
    }
};

ZAutomationAPIWebRequest.prototype.dispatchRequest = function (method, url) {
    // Default handler is NotFound
    var handlerFunc = this.NotFound;

    // ---------- Test exact URIs ---------------------------------------------

    if ("GET" === method && "/status" == url) {
        handlerFunc = this.statusReport;
    } else if ("GET" === method && "/notifications/" == url) {
        handlerFunc = this.exposeNotifications();
    } else if (("GET" === method && "/notifications/markRead" == url)  || ("PUT" === method && "/notifications/" == url)) {
        handlerFunc = this.markNotificationsRead();
    } else if ("GET" === method && "/devices/" == url) {
        handlerFunc = this.listDevices;
    } else if ("GET" === method && "/restart" == url) {
        handlerFunc = this.restartController;
    } else if ("GET" === method && "/locations/" == url) {
        handlerFunc = this.listLocations();
    } else if (("GET" === method && "/locations/add" == url) || ("POST" === method && "/locations/" == url)) {
        handlerFunc = this.addLocation();
    } else if (("GET" === method && "/locations/remove" == url) || ("DELETE" === method && "/locations/" == url)) {
        handlerFunc = this.removeLocation();
    } else if (("GET" === method && "/locations/update" == url) || ("PUT" === method && "/locations/" == url)) {
        handlerFunc = this.updateLocation();
    } else if ("GET" === method && "/modules/" == url) {
        handlerFunc = this.listModules;
    } else if ("GET" === method && "/instances/" == url) {
        handlerFunc = this.listInstances;
    } else if (("POST" === method || "PUT" === method) && "/instances/" == url) {
        handlerFunc = this.createInstance;
    } else if ("OPTIONS" === method) {
        handlerFunc = this.CORSRequest;
    };

    // ---------- Test regexp URIs --------------------------------------------
    var re, reTest;

    // --- Perform vDev command
    if (handlerFunc === this.NotFound) {
        re = /\/devices\/(.+)\/command\/(.+)/;
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
        re = /\/devices\/(.+)\/setLocation/;
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
        re = /\/devices\/(.+)\/removeLocation/;
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
        re = /\/locations\/(.+)/;
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
        re = /\/notifications\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var notificationId = parseInt(reTest[1]);
            if ("PUT" === method && notificationId) {
                handlerFunc = this.markNotificationsRead(notificationId);
            } else if ("GET" === method && notificationId) {
                handlerFunc = this.exposeNotifications(notificationId);
            }
        }
    }

    // --- Set vDev title
    if (handlerFunc === this.NotFound) {
        re = /\/devices\/(.+)\/setTitle/;
        reTest = re.exec(url);
        if (!!reTest) {
            var vDevId = reTest[1];
            if ("GET" === method && !!vDevId && controller.devices.hasOwnProperty(vDevId)) {
                handlerFunc = this.setVDevTitleFunc(vDevId);
            }
        }
    }

    // --- Add tag to the vDev
    if (handlerFunc === this.NotFound) {
        re = /\/devices\/(.+)\/addTag/;
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
        re = /\/devices\/(.+)\/removeTag/;
        reTest = re.exec(url);
        if (!!reTest) {
            var vDevId = reTest[1];
            if ("GET" === method && !!vDevId && controller.devices.hasOwnProperty(vDevId)) {
                handlerFunc = this.removeVDevTagFunc(vDevId);
            }
        }
    }

    // --- Get VDev meta
    if (handlerFunc === this.NotFound) {
        re = /\/devices\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var vDevId = reTest[1];
            var commandId = reTest[2];
            if ("GET" === method && !!vDevId) {
                handlerFunc = this.getVDevFunc(vDevId);
            } else if ("PUT" === method && !!vDevId) {
                handlerFunc = this.setVDevFunc(vDevId);
            }
        }
    }

    // --- Get instance config
    if (handlerFunc === this.NotFound) {
        re = /\/instances\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var instanceId = reTest[1];
            if ("GET" === method && !!instanceId) {
                handlerFunc = this.getInstanceFunc(instanceId);
            }
        }
    }

    // --- Update instance config
    if (handlerFunc === this.NotFound) {
        re = /\/instances\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var instanceId = reTest[1];
            if ("PUT" === method && !!instanceId) {
                handlerFunc = this.reconfigureInstanceFunc(instanceId);
            }
        }
    }

    // --- Delete instance
    if (handlerFunc === this.NotFound) {
        re = /\/instances\/(.+)/;
        reTest = re.exec(url);
        if (!!reTest) {
            var instanceId = reTest[1];
            if ("DELETE" === method && !!instanceId) {
                handlerFunc = this.deleteInstanceFunc(instanceId);
            }
        }
    }

    // --- Proceed to checkout =)
    return handlerFunc;
};
