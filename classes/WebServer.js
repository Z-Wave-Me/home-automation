var http = require('http');
var util = require('util');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var path = require('path');
var express = require('express');
var nunjucks = require('nunjucks');

WebServer = function (host, port, automation, views, static) {
    this.host = host;
    this.port = port;
    this.automation = automation;
    this.views = views || path.join(__dirname, '..', 'views');
    this.static = static || path.join(__dirname, '..', 'public');
    this.app = express();
    this.nunenv = new nunjucks.Environment(new nunjucks.FileSystemLoader(this.views));
};

util.inherits(WebServer, EventEmitter2);

module.exports = exports = WebServer;

WebServer.prototype.setupWebapp = function () {
    var app = this.app;

    app.set('case sensitive routing', true);
    app.set('strict routing', true);
    app.set('trust proxy', true);
    app.set('ctrl', this.automation);

    this.nunenv.express(app);

    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(app.router);
    app.use(express.static(this.static));
    app.use(express.errorHandler());

    app.get("/", this.dashboard);
    app.get("/api/ui.json", this.getUIMeta);
    app.get("/api/events.json", this.getEventLog);

    app.get("/api/instances/", this.getInstancesList);
    app.get("/api/instances/:instanceId", this.getInstanceMeta);

    app.get("/api/instances/:instanceId/actions/", this.getInstanceActionsList);
    app.get("/api/instances/:instanceId/actions/:actionId", this.getInstanceActionMeta);
    app.post("/api/instances/:instanceId/actions/:actionId", this.runInstanceAction);

    app.get("/api/widgets/", this.getWidgetsList);
    app.get("/api/widgets/:widgetId", this.getWidgetMeta);

    app.get("/api/devices/", this.getDevicesList);
    app.get("/api/devices/:deviceId", this.getDeviceMeta);

    app.get("/api/apps/", this.getApplicationsList);
    app.get("/api/apps/:appId", this.getApplicationMeta);

    this.emit('webappReady');
};

WebServer.prototype.run = function (host, port) {
    this.setupWebapp();
    http.createServer(this.app).listen(this.port, this.host);
};

// --- Additional routines and middleware

function emptyApiReply () {
    return {
        error: {
            code: 404,
            msg: "Empty reply"
        },
        data: null
    };
}

// --- Request handler(req, res)

WebServer.prototype.dashboard = function (req, res) {
    res.render("dashboard.html");
};

WebServer.prototype.getUIMeta = function (req, res) {
    var reply = emptyApiReply();
    var ctrl = req.app.get("ctrl");

    reply.error = null;
    reply.data = {
        // devices: ctrl.devices,
        // instances: ctrl.instances,
        actions: ctrl.actions,
        widgets: ctrl.widgets,
        enabledWidgets: ctrl.getEnabledWidgets()
    };

    res.send(reply);
};

WebServer.prototype.getEventLog = function (req, res) {
    var reply = emptyApiReply();
    var utcNow = new Date();
    var utcNowTimestamp = Math.floor(utcNow.getTime() / 1000);
    var ctrl = req.app.get("ctrl");

    var since = req.query.hasOwnProperty("since") ? parseInt(req.query.since, 10) : 0;

    var timestamps = Object.keys(ctrl.eventlog);
    var filteredLog = timestamps.filter(function (item) {
        return item >= since;
    });

    reply.error = null;
    reply.data = {
        events: {},
        timestamp: utcNowTimestamp
    };

    filteredLog.forEach(function (timestamp) {
        reply.data.events[timestamp] = ctrl.eventlog[timestamp];
    });

    res.send(reply);
};

WebServer.prototype.getInstancesList = function (req, res) {
    var reply = emptyApiReply();
    var ctrl = req.app.get('ctrl');
    reply.data = {};
    Object.keys(ctrl.instances).forEach(function (instanceId) {
        var instance = ctrl.instances[instanceId];
        reply.data[instanceId] = {
            id: instanceId,
            actions: {}
        };
        Object.keys(instance.actions).forEach(function (actionId) {
            reply.data[instanceId].actions[actionId] = instance.actions[actionId];
        });
    });
    reply.error = null;
    res.send(reply);
};

WebServer.prototype.getInstanceMeta = function (req, res) {
    var reply = emptyApiReply();
    var ctrl = req.app.get('ctrl');
    var instanceId = req.params.instanceId;

    if (ctrl.instances.hasOwnProperty(instanceId)) {
        var instance = ctrl.instances[instanceId];
        reply.data = {
            id: instanceId,
            actions: {}
        };
        Object.keys(instance.actions).forEach(function (actionId) {
            reply.data.actions[actionId] = instance.actions[actionId];
        });
        reply.error = null;
    } else {
        reply.error.code = 404;
        reply.error.msg = "Module instance not found (" + instanceId + ")";
    }

    res.send(reply);
};

WebServer.prototype.getInstanceActionsList = function (req, res) {
    var reply = emptyApiReply();
    var ctrl = req.app.get('ctrl');
    var instanceId = req.params.instanceId;

    if (ctrl.instances.hasOwnProperty(instanceId)) {
        var instance = ctrl.instances[instanceId];
        reply.data = {};
        Object.keys(instance.actions).forEach(function (actionId) {
            reply.data[actionId] = instance.actions[actionId];
        });
        reply.error = null;
    } else {
        reply.error.code = 404;
        reply.error.msg = "Module instance not found (" + instanceId + ")";
    }

    res.send(reply);
};

WebServer.prototype.getInstanceActionMeta = function (req, res) {
    var reply = emptyApiReply();
    var ctrl = req.app.get('ctrl');
    var instanceId = req.params.instanceId;
    var actionId = req.params.actionId;

    if (ctrl.instances.hasOwnProperty(instanceId)) {
        var instance = ctrl.instances[instanceId];

        if (instance.actions.hasOwnProperty(actionId)) {
            reply.data = instance.actions[actionId];
            reply.error = null;
        } else {
            reply.error.code = 404;
            reply.error.msg = "Module instance "+instanceId+" action not found (" + actionId + ")";
        }
    } else {
        reply.error.code = 404;
        reply.error.msg = "Module instance not found (" + req.instanceId + ")";
    }

    res.send(reply);
};

WebServer.prototype.runInstanceAction = function (req, res) {
    var reply = emptyApiReply();
    var ctrl = req.app.get('ctrl');
    var instanceId = req.params.instanceId;
    var actionId = req.params.actionId;

    function replyCallback (err, res) {
        if (err) {
            reply.error.code = err.code;
            reply.error.msg = err.message;
        } else {
            reply.data = res;
        }
        res.send(reply);
    }

    if (ctrl.instances.hasOwnProperty(instanceId)) {
        var instance = ctrl.instances[instanceId];
        if (instance.actions.hasOwnProperty(actionId)) {
            reply.error = null;
            instance.runAction(instance[actionId], req.body, replyCallback);
        } else {
            reply.error.code = 404;
            reply.error.msg = "Module instance "+instanceId+" action not found (" + actionId + ")";
            res.send(reply);
        }
    } else {
        reply.error.code = 404;
        reply.error.msg = "Module instance not found (" + req.instanceId + ")";
        res.send(reply);
    }
};

WebServer.prototype.getDevicesList = function (req, res) {
    var reply = emptyApiReply();
    res.send(reply);
};

WebServer.prototype.getDeviceMeta = function (req, res) {
    var reply = emptyApiReply();
    res.send(reply);
};

WebServer.prototype.getWidgetsList = function (req, res) {
    var reply = emptyApiReply();
    res.send(reply);
};

WebServer.prototype.getWidgetMeta = function (req, res) {
    var reply = emptyApiReply();
    res.send(reply);
};

WebServer.prototype.getApplicationsList = function (req, res) {
    var reply = emptyApiReply();
    res.send(reply);
};

WebServer.prototype.getApplicationMeta = function (req, res) {
    var reply = emptyApiReply();
    res.send(reply);
};
