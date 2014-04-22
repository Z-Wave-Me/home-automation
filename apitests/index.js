var request = require("request");
var should = require("should");
var assert = require("assert");

var apiUrl = "http://localhost:8083/ZAutomation/api/v1";

describe("ZAutomation API", function () {
    it("responds", function (done) {
        request.get(apiUrl + "/status", function (error, response, body) {
            done(error || response.statusCode !== 200 ? error : null);
        });
    });

    describe("/modules", function () {
        it("returnes modules list", function (done) {
            request.get(apiUrl + "/modules", function (error, response, body) {
                if (error || response.statusCode !== 200) {
                    done(new Error (error || response.statusCode));
                    return;
                }

                // Response has correct mime-type
                response.should.have.header("content-type", "application/json; charset=utf-8");

                // Response body id a correct API reply in JSON form without an error
                var obj = {}; try { obj = JSON.parse(body); } catch (err) {};
                obj.should.have.keys("error", "data", "message", "data");
                should.strictEqual(obj.error, null);

                // Content tests
                obj.data.should.be.instanceOf(Object);
                Object.keys(obj.data).length.should.be.above(3);

                // Everything is OK
                if (obj.data.length) {
                    request.get(apiUrl + "/modules/" + obj.data[0].id, function (error, response, body) {
                        if (error || response.statusCode !== 200) {
                            done(new Error (error || response.statusCode));
                            return;
                        }

                        // Response has correct mime-type
                        response.should.have.header("content-type", "application/json; charset=utf-8");

                        // Response body id a correct API reply in JSON form without an error
                        var obj = {}; try { obj = JSON.parse(body); } catch (err) {};
                        obj.should.have.keys("error", "data", "message", "data");
                        should.strictEqual(obj.error, null);

                        // Content tests
                        obj.data.should.be.instanceOf(Object);
                        Object.keys(obj.data).length.should.be.above(3);
                        done();
                    });
                } else {
                    // Everything is OK
                    done();
                }
            });
        });


    });

    describe("/instances", function () {
        it("returnes instances list", function (done) {
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

                // Content tests
                obj.data.should.be.instanceOf(Array);
                obj.data.length.should.be.above(1);

                // Everything is OK
                done();
            });
        });

        it("creates new instance", function (done) {
            request.post(apiUrl + "/instances", {
                json: {
                    "id": "TestBatteryPolling",
                    "module": "BatteryPolling",
                    "config": {
                        "launchWeekDay": 3
                    }
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
                request.get(apiUrl + "/instances/TestBatteryPolling", function (error, response, body) {
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
                    obj.data.length.should.be.above(2);

                    var found = false,
                        launchWeekDay = -1;
                    obj.data.forEach(function (test) {
                        if ("TestBatteryPolling" === test.id) {
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
                obj.should.have.keys("error", "data", "code", "message", "pager");
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
                obj.should.have.keys("error", "data", "code", "message", "pager");
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

                var testArray = obj.data.notifications;
                var idsToMark = testArray.map(function (item) {
                    if ("debug" === item[2]) {
                        return item[0];
                    }
                });

                if (testArray.length === 0) {
                    return;
                } else {
                    var notice = testArray[0],
                        length = testArray.length;
                    notice.redeemed = true;
                }

                request.put(apiUrl+"/notifications/" + notice.id, {
                    json: idsToMark
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
                obj.should.have.keys("error", "data", "code", "message", "pager");
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
                obj.should.have.keys("error", "data", "code", "message", "pager");
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
                obj.should.have.keys("error", "data", "code", "message");
                should.strictEqual(obj.error, null);
                should.strictEqual(obj.data, null);

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
