var request = require("request"),
    should = require("should"),
    assert = require("assert"),
    _ = require("underscore"),
    apiUrl = "http://localhost:8083/ZAutomation/api/v1";

describe("/instances", function () {
    it("list modules", function (done) {
        request.get(apiUrl + "/modules", function (error, response, body) {
            if (error || response.statusCode !== 200) {
                done(new Error (error || response.statusCode));
                return;
            }

            // Response has correct mime-type
            response.should.have.header("content-type", "application/json; charset=utf-8");

            // Response body id a correct API reply in JSON form without an error
            var obj = {};
            try { obj = JSON.parse(body); } catch (err) {}

            obj.should.have.keys("error", "data", "code", "message");
            should.strictEqual(obj.error, null);
            should.strictEqual(obj.code, 200);
            module.exports.modules_list = obj.data;

            // Content tests
            obj.data.should.be.instanceOf(Array);

            // Everything is OK
            done();
        });
    });

});