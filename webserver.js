console.log("Setting web request handler");

// Disabled due to unnecessity
// // Ported nunjucks and precompiled server-side templates
// executeFile(config.libPath+"/nunjucks-patched.js");
// executeFile(config.libPath+"/_templates.js");

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


    Object.keys(controller.devices).forEach(function (vDevId) {
        var vDev = controller.devices[vDevId];
        reply.data.push({
            id: vDevId,
            vDevType: vDev.vDevType,
            metrics: vDev.metrics
        });
    });

    this.res.body = JSON.stringify(reply);
    // console.log("REPLY", this.res.body);
};

ZAutomationAPIWebRequest.prototype.dispatchRequest = function (method, url) {
    console.log("--- ZAutomationAPIWebRequest.dispatchRequest", method, url);

    var handlerFunc = this.NotFound;
    if ("GET" === method && "/devices/" == url) {
        handlerFunc = this.listDevices;
    };

    return handlerFunc;
};

// ----------------------------------------------------------------------------
// --- main
// ----------------------------------------------------------------------------

var api = new ZAutomationAPIWebRequest().handlerFunc();
