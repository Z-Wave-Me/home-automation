var config = require("./config.json");
var path = require("path");
var AutomationController = require("./classes/AutomationController");
var WebServer = require("./classes/WebServer");

var controller = new AutomationController(config.network);
console.log("Initializing Automation Controller...");
controller.init();

var webserver = new WebServer(config.webapp.host, config.webapp.port, controller, "./webapp/templates", "./webapp/static");

controller.on('error', function (err) {
    console.log("--- ERROR: ", err.message);
});

controller.on('run', function () {
    console.log("Starting Webapp...");
    webserver.on('webappReady', function () {
        console.log("Webapp listening at http://"+config.webapp.host+":"+config.webapp.port+"/");
    });
    webserver.run();
});

controller.on('deviceRegistered', function (id) {
    console.log("Device registered", id);
});

controller.on('actionRegistered', function (id, name) {
    console.log("Action registered", id, name);
});

controller.on('widgetRegistered', function (id) {
    console.log("Widget registered", id);
});

console.log("Starting Automation Controller...");
controller.run();
