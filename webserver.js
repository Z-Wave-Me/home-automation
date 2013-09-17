console.log("Setting web request handler");

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

    // Get and run request processor func
    var requestProcessorFunc = this.dispatchRequest(request.method, url);
    requestProcessorFunc.call(this);

    // Log request reply
    var bodyLength = "string" === typeof this.res.body ? this.res.body.length : "?";
    console.log("[" + now.toISOString() + "]", request.method, url, this.res.status, bodyLength);

    // Return to the z-way-http
    // console.log("REPLY", JSON.stringify(this.res, null, "  "));
    return this.res;
}

ZAutomationWebRequest.prototype.NotImplementedReply = function () {
    this.res.body = "Not implemented, yet";
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

ZAutomationAPIWebRequest.prototype.listDevices = function () {
    console.log("--- ZAutomationAPIWebRequest.listDevices");

    var reply = {
        error: null,
        data: []
    }

    console.log("--- CTRL VDEVS LIST", Object.keys(controller.devices));
    Object.keys(controller.devices).forEach(function (vDevId) {
        var vDev = controller.devices[vDevId];
        reply.data.push({
            id: vDevId,
            deviceType: vDev.deviceType,
            metrics: vDev.metrics
        });
    });

    this.res.status = 200;
    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
    // console.log("REPLY", this.res.body);
};

ZAutomationAPIWebRequest.prototype.exposeEvents = function () {
    console.log("--- ZAutomationAPIWebRequest.exposeEvents");

    var nowTS = Math.floor(new Date().getTime() / 1000);

    var reply = {};

    var eventLog = controller.moduleInstance("EventLog");

    if (!eventLog) {
        reply = {
            error: {
                code: 500,
                message: "EventLog module doesn't instantiated"
            },
            data: null
        }
    } else {
        reply = {
            error: null,
            data: {}
        }

        var since = this.req.query.hasOwnProperty("since") ? parseInt(this.req.query.since, 10) : 0;

        reply.data = {
            updateTime: nowTS,
            events: eventLog.exposedEvents(since)
        };
    }

    this.res.status = 200;
    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.performVDevCommandFunc = function (vDevId, commandId) {
    var self = this;

    return function () {
        var reply = {
            error: null,
            data: !!controller.devices[vDevId].performCommand(commandId)
        }

        self.res.status = 200;
        self.responseHeader("Content-Type", "application/json; charset=utf-8");
        self.res.body = JSON.stringify(reply);
    }
}

ZAutomationAPIWebRequest.prototype.listWidgets = function () {
    console.log("--- ZAutomationAPIWebRequest.listWidgets");

    var reply = {
        error: null,
        data: controller.widgets
    }

    this.res.status = 200;
    this.responseHeader("Content-Type", "application/json; charset=utf-8");
    this.res.body = JSON.stringify(reply);
};

ZAutomationAPIWebRequest.prototype.dispatchRequest = function (method, url) {
    console.log("--- ZAutomationAPIWebRequest.dispatchRequest", method, url);

    // Default handler is NotFound
    var handlerFunc = this.NotFound;

    // Test exact URIs
    if ("GET" === method && "/devices/" == url) {
        handlerFunc = this.listDevices;
    } else if ("GET" === method && "/events/" == url) {
        handlerFunc = this.exposeEvents;
    } else if ("GET" === method && "/widgets/" == url) {
        handlerFunc = this.listWidgets;
    };

    // Test regexp URIs

    // --- Perform vDev command
    var re = /\/devices\/(.+)\/command\/(.+)/;
    var reTest = re.exec(url);
    if (!!reTest) {
        var vDevId = reTest[1];
        var commandId = reTest[2];
        if ("GET" === method && !!vDevId && !!commandId && controller.devices.hasOwnProperty(vDevId)) {
            handlerFunc = this.performVDevCommandFunc(vDevId, commandId);
        }
    }

    return handlerFunc;
};

// ----------------------------------------------------------------------------
// --- main
// ----------------------------------------------------------------------------

var api = new ZAutomationAPIWebRequest().handlerFunc();
