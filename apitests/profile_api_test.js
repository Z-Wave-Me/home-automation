var request = require("request"),
    should = require("should"),
    assert = require("assert"),
    _ = require("underscore"),
    apiUrl = "http://localhost:8083/ZAutomation/api/v1";

describe("/profiles", function () {
    var testDashboard = null;
    it("create profile", function (done) {
        request.post(apiUrl + "/profiles", {
            json: {"name":"name", "description":"description", "positions":[]}
        }, function (error, response, reply) {
            if (error || response.statusCode !== 201) {
                done(new Error (error || response.statusCode + " - " + JSON.stringify(reply)));
                return;
            }

            // Response has correct mime-type
            response.should.have.header("content-type", "application/json; charset=utf-8");

            // Response body id a correct API reply in JSON form without an error
            reply.should.have.keys("error", "data", "code", "message");
            should.strictEqual(reply.error, null);


            // Content tests
            request.get(apiUrl + "/profiles/" + reply.data.id, function (error, response, body) {
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
                obj.data.should.have.keys("id", "name", "positions", "description");
                obj.data.positions.should.be.instanceOf(Array);
                assert.equal(typeof obj.data.id, "number");
                assert.equal(typeof obj.data.name, "string");
                assert.equal(typeof obj.data.description, "string");

                testDashboard = obj.data;

                // Everything is OK
                done();
            })
        });
    });

    it("list profiles", function (done) {
        request.get(apiUrl+"/profiles", function (error, response, body) {
            if (error || response.statusCode !== 200) {
                done(new Error (error || response.statusCode));
                return;
            }

            // Response has correct mime-type
            response.should.have.header("content-type", "application/json; charset=utf-8");

            // Response body id a correct API reply in JSON form without an error
            var obj = {}; try { obj = JSON.parse(body); } catch (err) {};

            should.strictEqual(obj.error, null);

            // Content tests
            obj.data.should.be.instanceOf(Array);
            if (obj.data.length > 0) {
                obj.data.forEach(function (dashboard) {
                    // Content tests
                    dashboard.should.have.keys("id", "name", "positions", "description");
                    dashboard.positions.should.be.instanceOf(Array);
                    assert.equal(typeof dashboard.id, "number");
                    assert.equal(typeof dashboard.name, "string");
                    assert.equal(typeof dashboard.description, "string");
                });
                assert.deepEqual(_.last(obj.data), testDashboard);
            }

            assert(obj.data.length > 0, JSON.stringify(obj.data.devices, null, "  "));

            // Everything is OK
            done();
        })
    });
    it("update profiles", function (done) {
        request.put(apiUrl + "/profiles/" + testDashboard.id, {
            json: {"name":"name2","description":"description2","positions":['1', '2']}
        }, function (error, response, reply) {
            var found;
            if (error || response.statusCode !== 200) {
                done(new Error (error || response.statusCode + " - " + JSON.stringify(reply)));
                return;
            }

            // Response has correct mime-type
            response.should.have.header("content-type", "application/json; charset=utf-8");

            // Response body id a correct API reply in JSON form without an error
            reply.should.have.keys("error", "data", "code", "message");
            should.strictEqual(reply.error, null);

            // Content tests
            request.get(apiUrl + "/profiles/" + reply.data.id, function (error, response, body) {
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
                obj.data.should.have.keys("id", "name", "positions", "description");
                obj.data.positions.should.be.instanceOf(Array);
                assert.equal(typeof obj.data.id, "number");
                assert.equal(typeof obj.data.name, "string");
                assert.equal(typeof obj.data.description, "string");

                // Check equal
                found = false;
                Object.keys(obj.data).forEach(function (key) {
                    if (!obj.data.hasOwnProperty('id')) {
                        if (obj.data[key] !== testDashboard[key]) {
                            found = true;
                        }
                    } else {
                        if (obj.data[key] === testDashboard[key]) {
                            found = false;
                        }
                    }
                });

                assert.equal(found, false);
                // Everything is OK
                done();
            })
        })
    });

    it("delete profiles", function (done) {
        request.del(apiUrl + "/profiles/" + testDashboard.id, function (error, response, reply) {
            if (error && (response.statusCode !== 200 || response.statusCode !== 204)) {
                done(new Error (error || response.statusCode + " - " + JSON.stringify(reply)));
                return;
            }

            // Response has correct mime-type
            response.should.have.header("content-type", "application/json; charset=utf-8");

            // Response body id a correct API reply in JSON form without an error
            var obj = {}; try { obj = JSON.parse(reply); } catch (err) {};
            should.equal(Object.keys(obj).length === 0, true);
            // Content tests
            request.get(apiUrl + "/profiles", function (error, response, body) {
                if (error || response.statusCode !== 200) {
                    done(new Error (error || response.statusCode));
                    return;
                }

                // Response has correct mime-type
                response.should.have.header("content-type", "application/json; charset=utf-8");

                // Response body id a correct API reply in JSON form without an error
                var obj = {}, found = false; try { obj = JSON.parse(body); } catch (err) {};
                obj.should.have.keys("error", "data", "code", "message");
                should.strictEqual(obj.error, null);

                // check
                found = _.find(obj.data, function (dash) {
                    return dash.id === testDashboard.id;
                });

                assert.equal(Boolean(found), false);

                // Everything is OK
                done();
            })
        })
    });
});
