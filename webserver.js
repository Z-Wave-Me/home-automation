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

ZAutomationAPIWebRequest.prototype.exposeNotifications = function () {
    var nowTS = Math.floor(new Date().getTime() / 1000);

    var reply = {
        error: null,
        data: {}
    };

    var since = this.req.query.hasOwnProperty("since") ? parseInt(this.req.query.since, 10) : 0;
    since = isNaN(since) ? 0 : since;

    reply.data = {
        updateTime: nowTS,
        notifications: controller.listNotifications(since)
    };

    this.res.status = 200;
    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.markNotificationsRead = function () {
    var reply = {
        error: null,
        data: "OK"
    }

    var reqObj;
    try {
        reqObj = JSON.parse(this.req.body);
    } catch (ex) {
        reply.error = ex.message;
    }

    if (Array.isArray(reqObj) && reqObj.length > 0) {
        this.res.status = 200;
        controller.deleteNotifications(reqObj);
    } else if (Array.isArray(reqObj) && reqObj.length < 1) {
        this.res.status = 500;
        reply.error = "Payload must an array with at least one id";
    } else if (!Array.isArray(reqObj)) {
        this.res.status = 500;
        reply.error = "Payload must be and array of strings";
    } else {
        this.res.status = 500;
    }

    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.getVDevFunc = function (vDevId) {
    var self = this;

    return function () {
        var reply = {
            error: null,
            data: {
                meta: self._vdevMetaOnly(controller.devices[vDevId]),
                info: controller.getVdevInfo(vDevId)
            }
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

ZAutomationAPIWebRequest.prototype.listLocations = function () {
    reply = {
        error: null,
        data: controller.locations
    }

    this.res.status = 200;
    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.addLocation = function () {
    var id = Object.keys(controller.locations).length + 1,
        title,
        reply = {
            error: null,
            data: null
        },
        reqObj;

    if (this.req.method === 'GET') {
        title = this.req.query.title;
    } else if (this.req.method === 'POST') { // POST
        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
        }

        title = reqObj.title;
    }

    if (!!title) {
        if (controller.locations.hasOwnProperty(id)) {
            this.res.status = 500;
            reply.error = "Location " + id + " already exists";
        } else {
            this.res.status = 200;
            controller.addLocation(id, title);
            reply.status = "OK";
            reply.data =  {
                id: id,
                title: title
            };
        }
    } else {
        this.res.status = 500;
        reply.error = "Arguments title are required";
    }

    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.removeLocation = function () {
    var id,
        reply = {
            error: null,
            data: null
        },
        reqObj;

    if (this.req.method === 'GET') {
        id = this.req.query.id;
    } else if (this.req.method === 'DELETE') { // DELETE
        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
        }

        id = reqObj.id;
    }

    if (!!id) {
        if (!controller.locations.hasOwnProperty(id)) {
            this.res.status = 500;
            reply.error = "Location " + id + " doesn't exist";
        } else {
            this.res.status = 200;
            controller.removeLocation(id);
            reply.data = "OK";
        }
    } else {
        this.res.status = 500;
        reply.error = "Argument id is required";
    }

    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.updateLocation = function () {
    var id,
        title,
        reply = {
            error: null,
            data: null
        },
        reqObj;

    if (this.req.method === 'GET') {
        id = this.req.query.id;
        title = this.req.query.title;
    } else if (this.req.method === 'PUT') { // DELETE
        try {
            reqObj = JSON.parse(this.req.body);
        } catch (ex) {
            reply.error = ex.message;
        }

        id = reqObj.id;
        title = reqObj.title;
    }

    if (!!id && !!title && title.length > 0) {
        if (!controller.locations.hasOwnProperty(id)) {
            this.res.status = 500;
            reply.error = "Location "+id+" doesn't exist";
        } else {
            this.res.status = 200;
            controller.updateLocation(id, title);
            reply.data = {
                id: id,
                title: title
            };
            reply.status = "OK";
        }
    } else {
        this.res.status = 500;
        reply.error = "Arguments id & title are required";
    }

    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
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
        handlerFunc = this.exposeNotifications;
    } else if ("POST" === method && "/notifications/markRead" == url) {
        handlerFunc = this.markNotificationsRead;
    } else if ("GET" === method && "/devices/" == url) {
        handlerFunc = this.listDevices;
    } else if ("GET" === method && "/restart" == url) {
        handlerFunc = this.restartController;
    } else if ("GET" === method && "/locations/" == url) {
        handlerFunc = this.listLocations;
    } else if (("GET" === method && "/locations/add" == url) || ("POST" === method && "/locations/" == url)) {
        handlerFunc = this.addLocation;
    } else if (("GET" === method && "/locations/remove" == url) || ("DELETE" === method && "/locations/" == url)) {
        handlerFunc = this.removeLocation;
    } else if (("GET" === method && "/locations/update" == url) || ("PUT" === method && "/locations/" == url)) {
        handlerFunc = this.updateLocation;
    } else if ("GET" === method && "/modules/" == url) {
        handlerFunc = this.listModules;
    } else if ("GET" === method && "/instances/" == url) {
        handlerFunc = this.listInstances;
    } else if (("POST" === method || "PUT" === method) && "/instances/" == url) {
        handlerFunc = this.createInstance;
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
        re = /\/devices\/(.+)\//;
        reTest = re.exec(url);
        if (!!reTest) {
            var vDevId = reTest[1];
            var commandId = reTest[2];
            if ("GET" === method && !!vDevId && controller.devices.hasOwnProperty(vDevId)) {
                handlerFunc = this.getVDevFunc(vDevId);
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
