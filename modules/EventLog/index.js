// Module dependencies

var util = require("util");
var path = require("path");
var AutomationModule = require("../../classes/AutomationModule");

// Concrete module constructor

function EventLog (id, controller, config) {
    EventLog.super_.call(this, id, controller, config);

    this.controller.eventlog = {};

    var self = this;
    this.controller.onAny(function () {
        self.logEvent.apply(self, [this.event, arguments]);
    });
}

// Module inheritance and setup

util.inherits(EventLog, AutomationModule);

module.exports = exports = EventLog;

// Module methods

EventLog.prototype.logEvent = function (event) {
    if ("tick" !== event) {
        var utcNow = new Date();
        var utcNowTimestamp = Math.floor(utcNow.getTime() / 1000);

        if ((this.config.exposedEvents && this.config.exposedEvents.indexOf(event) !== -1) || !this.config.exposedEvents) {
            var chunk = [event];

            if (!this.controller.eventlog.hasOwnProperty(utcNowTimestamp)) {
                this.controller.eventlog[utcNowTimestamp] = [];
            }

            var args = arguments[1];
            if (args.length === 1 && args[0] instanceof Error) {
                chunk.push(args[0].message);
            } else {
                for (var key in args) {
                    chunk.push(args[key]);
                }
            }

            this.controller.eventlog[utcNowTimestamp].push(chunk);
        }
    }
    // TODO: Event log cleanup
    // TODO: Event log persistence
    // TODO: Expose only selected event to the webapp
};
