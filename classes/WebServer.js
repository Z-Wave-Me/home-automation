var http = require('http');
var util = require('util');
var EventEmitter2 = require('eventemitter2').EventEmitter2;
// var events = require('events');
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
    // app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(app.router);
    app.use(express.static(this.static));
    app.use(express.errorHandler());

    app.get("/", this.dashboard);
    app.get("/api/ui.json", this.getUIMeta);

    app.get("/api/events.json", this.getEventLog);

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
