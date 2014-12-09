var request = require("request"),
    should = require("should"),
    assert = require("assert"),
    _ = require("underscore"),
    apiUrl = "http://localhost:8083/ZAutomation/api/v1";

describe("/devices", function () {
    it("lists devices from the beginning", function (done) {
        request.get(apiUrl+"/devices", function (error, response, body) {
            if (error || response.statusCode !== 200) {
                done(new Error (error || response.statusCode));
                return;
            }

            // Response has correct mime-type
            response.should.have.header("content-type", "application/json; charset=utf-8");

            // Response body id a correct API reply in JSON form without an error
            var obj = {}; try { obj = JSON.parse(body); } catch (err) {};
            obj.should.have.keys("error", "data", "code", "message");
            should.strictEqual(obj.error, null);

            // Content tests
            obj.data.should.have.keys("updateTime", "structureChanged", "devices");
            assert.equal(typeof obj.data.updateTime, "number");
            obj.data.devices.should.be.instanceOf(Array);
            assert.equal(typeof obj.data.structureChanged, "boolean");
            assert(obj.data.devices.length > 0, JSON.stringify(obj.data.devices, null, "  "));

            // Everything is OK
            done();
        })
    });

    it("lists no updated devices in the future", function (done) {
        var testTS = Math.floor(new Date().getTime() / 1000) + 10000;
        request.get(apiUrl+"/devices?since="+testTS, function (error, response, body) {
            if (error || response.statusCode !== 200) {
                done(new Error (error || response.statusCode));
                return;
            }

            // Response has correct mime-type
            response.should.have.header("content-type", "application/json; charset=utf-8");

            // Response body id a correct API reply in JSON form without an error
            var obj = {}; try { obj = JSON.parse(body); } catch (err) {};
            obj.should.have.keys("error", "data", "code", "message");
            should.strictEqual(obj.error, null);

            // Content tests
            obj.data.should.have.keys("updateTime", "structureChanged", "devices");
            assert.equal(typeof obj.data.updateTime, "number");
            assert(obj.data.updateTime < testTS);
            obj.data.devices.should.be.instanceOf(Array);
            assert.equal(typeof obj.data.structureChanged, "boolean");
            assert.equal(obj.data.devices.length, 0, JSON.stringify(obj.data.devices, null, "  "));

            // Everything is OK
            done();
        });
    });
});