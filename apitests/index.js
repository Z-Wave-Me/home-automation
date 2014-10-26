var request = require("request"),
    should = require("should"),
    assert = require("assert"),
    _ = require("underscore"),
    apiUrl = "http://localhost:8083/ZAutomation/api/v1";




describe("ZAutomation API", function () {

    it("responds", function (done) {
        request.get(apiUrl + "/status", function (error, response, body) {
            done(error || response.statusCode !== 200 ? error : null);
        });
    });

    var //router_test = require("./router_test"),
        profile_api_test = require("./profile_api_test"),
        devices_api_test = require("./devices_api_test"),
        notifications_api_test = require("./notifications_api_test"),
        intances_api_test = require("./instances_api_test");
});
