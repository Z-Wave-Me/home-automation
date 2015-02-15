'use strict';
var request = require("request"),
    apiUrl = "http://localhost:8083/ZAutomation/api/v1";

describe("/status", function () {
    it("/status", function (done) {
        request.get(apiUrl + "/status", function (error, response, body) {
            done(error || response.statusCode !== 200 ? error : null);
        });
    });
});
