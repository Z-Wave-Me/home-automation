var request = require("request"),
    should = require("should"),
    assert = require("assert"),
    apiUrl = "http://mskoff.z-wave.me:10483/ZAutomation/api/v1",
    modules;

describe("ZAutomation API", function () {

    it("responds", function (done) {
        request.get(apiUrl + "/status", function (error, response, body) {
            done(error || response.statusCode !== 200 ? error : null);
        });
    });


    describe("/modules", function () {
        it("list modules", function (done) {
            request.get(apiUrl + "/instances", function (error, response, body) {
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
                modules = obj.data;

                // Content tests
                obj.data.should.be.instanceOf(Array);

                // Everything is OK
                done();
            });
        });
    });

    describe("/instances", function () {
        it("list instances", function (done) {
            request.get(apiUrl + "/instances", function (error, response, body) {
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

                // Content tests
                obj.data.should.be.instanceOf(Array);

                // Everything is OK
                done();
            });
        });

        it("creates new instance", function (done) {
            // create BatteryPolling
            request.post(apiUrl + "/instances", {
                json: {
                    "moduleId": "BatteryPolling",
                    "params": {"title":"Battery Polling", "launchWeekDay":2, "warningLevel":20, "status":"enable"}
                }
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
                request.get(apiUrl + "/instances/" + reply.data.id, function (error, response, body) {
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
                    obj.data.should.be.instanceOf(Array);

                    var found = false,
                        launchWeekDay = -1;

                    obj.data.forEach(function (test) {
                        if (response.moduleId === 'BatteryPolling') {
                            found = true;
                            launchWeekDay = test.config.launchWeekDay;
                        }
                    });

                    assert(found);
                    assert.equal(launchWeekDay, 3);

                    // Everything is OK
                    done();
                });
            });
        });

        it("exposes instance config", function (done) {
            request.get(apiUrl + "/instances/TestBatteryPolling", function (error, response, body) {
                if (error || response.statusCode !== 200) {
                    done(new Error (error || response.statusCode));
                    return;
                }

                // Response has correct mime-type
                response.should.have.header("content-type", "application/json; charset=utf-8");

                // Response body id a correct API reply in JSON form without an error
                var obj = {}; try { obj = JSON.parse(body); } catch (err) {};
                obj.should.have.keys("error", "data", "message", "code");
                should.strictEqual(obj.error, null);

                // Content tests
                obj.data.should.be.instanceOf(Object);
                // console.log(JSON.stringify(obj.data, null, "  "));
                // assert.equal(obj.data.launchWeekDay, 3);
                assert.equal(obj.data.warningLevel, 20);

                // Everything is OK
                done();
            })
        });

        it("updates instance config", function (done) {
            request.put(apiUrl + "/instances/TestBatteryPolling", {
                json: {
                    "launchWeekDay": 5
                }
            }, function (error, response, reply) {
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
                request.get(apiUrl + "/instances/TestBatteryPolling", function (error, response, body) {
                    if (error || response.statusCode !== 200) {
                        done(new Error (error || response.statusCode));
                        return;
                    }

                    // Response has correct mime-type
                    response.should.have.header("content-type", "application/json; charset=utf-8");

                    // Response body id a correct API reply in JSON form without an error
                    var obj = {}; try { obj = JSON.parse(body); } catch (err) {};
                    obj.should.have.keys("error", "data", "message", "code");
                    should.strictEqual(obj.error, null);

                    // Content tests
                    obj.data.should.be.instanceOf(Object);
                    assert.equal(obj.data.launchWeekDay, 5);
                    assert.equal(obj.data.warningLevel, 20);

                    // Everything is OK
                    done();
                });
            });
        });

        it("deletes instance", function (done) {
            request.del(apiUrl + "/instances/TestBatteryPolling", {}, function (error, response, reply) {
                if (error || response.statusCode !== 202) {
                    done(new Error (error || response.statusCode + " - " + JSON.stringify(reply)));
                    return;
                }

                // // Response has correct mime-type
                // response.should.have.header("content-type", "application/json; charset=utf-8");

                // // Response body id a correct API reply in JSON form without an error
                // reply.should.have.keys("error", "data");
                // should.strictEqual(reply.error, null);

                // Content tests
                request.get(apiUrl+"/instances/", function (error, response, body) {
                    if (error || response.statusCode !== 200) {
                        done(new Error (error || response.statusCode));
                        return;
                    }

                    // Response has correct mime-type
                    response.should.have.header("content-type", "application/json; charset=utf-8");

                    // Response body id a correct API reply in JSON form without an error
                    var obj = {}; try { obj = JSON.parse(body); } catch (err) {};
                    obj.should.have.keys("error", "data");
                    should.strictEqual(obj.error, null);

                    // Content tests
                    obj.data.should.be.instanceOf(Array);
                    obj.data.length.should.be.above(2);

                    var found = false;
                    obj.data.forEach(function (test) {
                        if ("TestBatteryPolling" === test.id) {
                            found = true;
                        }
                    });
                    assert.notEqual(found, true);

                    // Everything is OK
                    done();
                })
            })
        });
    });

    describe("/notifications", function () {
        it("lists notifications from the beginning", function (done) {
            request.get(apiUrl + "/notifications", function (error, response, body) {
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
                obj.data.should.have.keys("updateTime", "notifications");
                obj.data.notifications.should.be.instanceOf(Array);
                obj.data.notifications.length.should.be.above(0);

                // Everything is OK
                done();
            })
        });

        it("lists no notifications in the future", function (done) {
            var testTS = Math.floor(new Date().getTime() / 1000) + 10000;
            request.get(apiUrl+"/notifications?since="+testTS, function (error, response, body) {
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
                obj.data.should.have.keys("updateTime", "notifications");
                assert(obj.data.updateTime < testTS);
                obj.data.notifications.should.be.instanceOf(Array);
                assert.equal(obj.data.notifications.length, 0);

                // Everything is OK
                done();
            })
        });

            it("marks notifications read", function (done) {
            request.put(apiUrl+"/notifications", function (error, response, body) {
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
                obj.data.should.have.keys("updateTime", "notifications");
                obj.data.notifications.should.be.instanceOf(Array);

                var notice = obj.data.notifications[0];
                notice.redeemed = true;

                request.put(apiUrl+"/notifications/" + notice.id, {
                    json: notice
                }, function (error, response, body) {
                    if (error || response.statusCode !== 200) {
                        done(new Error (error || response.statusCode));
                        return;
                    }

                    // Response has correct mime-type
                    response.should.have.header("content-type", "application/json; charset=utf-8");

                    // Response body id a correct API reply in JSON form without an error
                    // var obj = {}; try { obj = JSON.parse(body); } catch (err) {};
                    var obj = body;
                    obj.should.have.keys("error", "data", "code", "message");
                    should.strictEqual(obj.error, null);

                    request.get(apiUrl+"/notifications", function (error, response, body) {
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

                        var foundOldId = false;
                        obj.data.notifications.forEach(function (item) {
                            if (item.id === notice.id) {
                                foundOldId = true;
                            }
                        });
                        assert.equal(foundOldId, false);

                        done();
                    });
                });
            });
        });
    });

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

    describe("/profiles", function () {
        var testDashboard = null;
        it("create new profile", function (done) {
            request.post(apiUrl + "/profiles", {
                json: {"name":"name","description":"description","widgets":[],"active":false}
            }, function (error, response, reply) {
                console.log(reply);
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
                    obj.data.should.have.keys("id", "name", "description", "active", "description");
                    obj.data.widgets.should.be.instanceOf(Array);
                    assert.equal(typeof obj.data.active, "boolean");
                    assert.equal(typeof obj.data.id, "number");

                    testDashboard = obj.data;

                    // Everything is OK
                    done();
                })
            });
        });
        it("list profiles objects", function (done) {
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
                if (obj.data.length) {
                    obj.data.forEach(function (dashboard) {
                        dashboard.should.have.keys("id", "name", "widgets", "active", "description");
                        dashboard.widgets.should.be.instanceOf(Array);
                        assert.equal(typeof dashboard.id, "number");
                        assert.equal(typeof dashboard.active, "boolean");
                    });
                }

                assert(obj.data.length > 0, JSON.stringify(obj.data.devices, null, "  "));

                // Everything is OK
                done();
            })
        });
        it("update profiles objects", function (done) {
            request.put(apiUrl + "/profiles/" + testDashboard.id, {
                json: {"name":"name2","description":"description2","widgets":[{"id":"id","position":{"x":10,"y":11}},{"id":"id2","position":{"x":13,"y":14}}],"active":true}
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
                    obj.data.should.have.keys("id", "name", "description", "active", "description");
                    obj.data.widgets.should.be.instanceOf(Array);
                    assert.equal(typeof obj.data.active, "boolean");
                    assert.equal(typeof obj.data.id, "number");

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

        it("delete profiles objects", function (done) {
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
                    obj.data.forEach(function (dash) {
                        if (dash.id === testDashboard.id) {
                            found = true;
                        }
                    });

                    assert.equal(found, false);

                    // Everything is OK
                    done();
                })
            })
        });
    });
});
