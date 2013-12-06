/*** EventLog Z-Way Home Automation module ************************************

Version: 1.0.0
(c) Z-Wave.Me, 2013
-------------------------------------------------------------------------------
Author: Gregory Sitnin <sitnin@z-wave.me>
Description: Creates and manages system event bus

******************************************************************************/

// Automation Module constructor

function EventLog (id, controller) {
    EventLog.super_.call(this, id, controller);

    this.eventLog = {};
}

// Module inheritance and setup

_module = EventLog;

inherits(EventLog, AutomationModule);

// Module methods

EventLog.prototype.init = function (config) {
    EventLog.super_.prototype.init.call(this, config);

    var self = this;
    this.controller.eventlog = {};

    this.onAnyHandler = function () {
        var newArgs = get_values(arguments);
        newArgs.unshift(this.event);
        self.logEvent.apply(self, newArgs);
    }

    this.controller.onAny(this.onAnyHandler);
};

EventLog.prototype.stop = function () {
    this.controller.offAny(this.onAnyHandler);
}

EventLog.prototype.logEvent = function () {
    var now = new Date();
    var timestamp = Math.round(now.getTime() / 1000);

    var args = get_values(arguments);
    var eventId = args.shift();

    if (!this.eventLog.hasOwnProperty(timestamp)) {
        this.eventLog[timestamp] = [];
    }

    // Disable event logging (for possible module deletion)
    // this.eventLog[timestamp].push([eventId, args]);

    if (this.config.debug) {
        console.log("--- EVENT:", now.toISOString(), timestamp, eventId, JSON.stringify(args));
    }
};

EventLog.prototype.exposedEvents = function (since) {
    var self = this;
    since = since || 0;

    var filteredKeys = Object.keys(this.eventLog).filter(function (timestamp) {
        timestamp = parseInt(timestamp, 10);
        return timestamp >= since;
    });
    filteredKeys.sort();

    // TODO: Events filtering (to split exposed and internal only events)
    var result = {};
    filteredKeys.forEach(function (key) {
        result[key] = self.eventLog[key];
    });

    return result;
};
