// Module dependencies

var util = require("util");
var path = require("path");
var request = require("request");
var AutomationModule = require("../../classes/AutomationModule");

// Concrete module constructor

function ZWayGate (id, controller, config) {
    ZWayGate.super_.call(this, id, controller, config);

    this.lastUpdate = 0;
    this.zway = null;

    var self = this;

    this.controller.on('tick', function () {
        self.updateZWay.call(self);
    });

    this.controller.on('zway.setDataPoint', function (params) {
        self.setDataPoint.call(self, params);
    });
}

// Module inheritance and setup

util.inherits(ZWayGate, AutomationModule);

module.exports = exports = ZWayGate;

ZWayGate.prototype.getModuleBasePath = function () {
    return path.resolve(__dirname);
};

// Module methods

ZWayGate.prototype.updateZWay = function () {
    var self = this;
    var url = this.config.ZWayAPI + "/Data/" + this.lastUpdate;

    request(url, {}, function (err, response, body) {
        if (!err && response.statusCode == 200) {
            var reply = JSON.parse(body);

            if (self.lastUpdate) {
                Object.keys(reply).forEach(function (dataPoint) {
                    // Generate update event in case of valuable data arrived obly
                    if ("updateTime" !== dataPoint) {
                        self.controller.emit('zway.update', dataPoint, reply[dataPoint]);
                    }
                    // TODO: Patch self.zway structure
                });
            } else {
                self.zway = reply;
                self.controller.emit('zway.fullUpdate');
            }
            self.lastUpdate = reply["updateTime"];
        } else {
            var e = new Error(err);
            self.controller.emit('zway.error', e);
            self.controller.emit('error', e);
        }
    });
};

ZWayGate.prototype.setDataPoint = function (params) {
    var self = this;
    var url = this.config.ZWayAPI + "/Run/" + params.dataPoint + ".Set(" + params.value + ")";

    request(url, {}, function (err, response, body) {
        if (!err && response.statusCode == 200) {
            // API returns null body here
        } else {
            var e = new Error(err);
            self.controller.emit('zway.error', e);
            self.controller.emit('error', e);
        }
    });
}
