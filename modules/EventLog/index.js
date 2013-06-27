// Automation Module constructor

function EventLog (id, controller) {
    EventLog.super_.call(this, id, controller);
}

// Module inheritance and setup

inherits(EventLog, AutomationModule);

// module.exports = exports = EventLog;
_module = EventLog;

EventLog.prototype.init = function (config) {
    EventLog.super_.prototype.init.call(this, config);

    var self = this;

    this.controller.eventlog = {};
    this.controller.onAny(this.logEvent);
};

// Module methods

// TODO: Add instance action to post messages
// TODO: Refactor eventlog grabbing with inctance actions

// Object.prototype.values = function () {
//     var self = this;
//     var result = [];
//     Object.keys(this).forEach(function (key) {
//         console.debug("!!! key", key, "value", self[key]);
//         result.push(self[key]);
//     });
//     return result;
// }

Object.prototype.values = function () {
    var self = this;
    return Object.keys(this).map(function(key) { return self[key]; });;
}

EventLog.prototype.logEvent = function () {
    var utcNow = new Date();

    console.log("--- EVENT:", utcNow, this.event, JSON.stringify(arguments.values()));

    // if ("tick" !== event) {
    //     var utcNow = new Date();
    //     var utcNowTimestamp = Math.floor(utcNow.getTime() / 1000);

    //     if ((this.config.exposedEvents && this.config.exposedEvents.indexOf(event) !== -1) || !this.config.exposedEvents) {
    //         var chunk = [event];

    //         if (!this.controller.eventlog.hasOwnProperty(utcNowTimestamp)) {
    //             this.controller.eventlog[utcNowTimestamp] = [];
    //         }

    //         var args = arguments[1];
    //         if (args.length === 1 && args[0] instanceof Error) {
    //             chunk.push(args[0].message);
    //         } else {
    //             for (var key in args) {
    //                 chunk.push(args[key]);
    //             }
    //         }

    //         this.controller.eventlog[utcNowTimestamp].push(chunk);
    //     }
    // }

    // TODO: Event log cleanup
    // TODO: Event log persistence
    // TODO: Expose only selected event to the webapp
};
