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

    describe("/instances", function () {
        var instances, modules, instance;

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
                modules = obj.data;

                // Content tests
                obj.data.should.be.instanceOf(Array);

                // Everything is OK
                done();
            });
        });

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
                instances = obj.data;

                // Everything is OK
                done();
            });
        });

        it("creates new instance", function (done) {
            // create BatteryPolling
            var module = _.find(modules, function (ins) { return !Boolean(ins.singleton); }),
                json = {
                    moduleId: module.id,
                    params: _.extend(module.defaults, {
                        enable: true,
                        title: module.id
                    })
                };

            request.post(apiUrl + "/instances", {
                json: json
            }, function (error, response, body) {

                if (error || (response.statusCode !== 201 && response.statusCode !== 200)) {
                    done(new Error (error || response.statusCode + " - " + JSON.stringify(body)));
                    return;
                }

                // Response has correct mime-type
                response.should.have.header("content-type", "application/json; charset=utf-8");

                // Response body id a correct API reply in JSON form without an error

                var obj = body;

                obj.should.have.keys("error", "data", "code", "message");
                should.strictEqual(obj.error, null);

                instance = obj.data;

                // Content tests
                request.get(apiUrl + "/instances/" + instance.id, function (error, response, body) {
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
                    obj.data.should.be.instanceOf(Object);

                    assert.equal(_.isEqual(instance.params, obj.data.params), true);

                    // Everything is OK
                    done();
                });
            });
        });

        it("exposes instance config", function (done) {
            request.get(apiUrl + "/instances/" + instance.id, function (error, response, body) {
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
                assert.equal(_.isEqual(instance.params, obj.data.params), true);

                // Everything is OK
                done();
            });
        });

        it("updates instance config", function (done) {
            var title = instance.params.title + '(Test)',
                enable = false,
                json = _.extend(_.clone(instance), {
                    params: {
                        title: title,
                        enable: enable
                    }
                });

            request.put(apiUrl + "/instances/" + instance.id, {
                json: json
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
                request.get(apiUrl + "/instances/" + instance.id, function (error, response, body) {
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
                    assert.equal(obj.data.params.title, title);
                    assert.equal(obj.data.params.enable, enable);

                    // Everything is OK
                    done();
                });
            });
        });

        it("deletes instance", function (done) {
            request.del(apiUrl + "/instances/" + instance.id, {}, function (error, response, reply) {
                if (error || (response.statusCode !== 204 && response.statusCode !== 200)) {
                    done(new Error (error || response.statusCode + " - " + JSON.stringify(reply)));
                    return;
                }

                // // Response has correct mime-type
                // response.should.have.header("content-type", "application/json; charset=utf-8");

                // // Response body id a correct API reply in JSON form without an error
                // reply.should.have.keys("error", "data");
                // should.strictEqual(reply.error, null);

                // Content tests
                request.get(apiUrl + "/instances/" + instance.id, function (error, response, body) {
                    if (error || (response.statusCode !== 404 && response.statusCode !== 200)) {
                        done(new Error (error || response.statusCode));
                        return;
                    }

                    // Response has correct mime-type
                    response.should.have.header("content-type", "application/json; charset=utf-8");

                    // Response body id a correct API reply in JSON form without an error
                    var obj = {}; try { obj = JSON.parse(body); } catch (err) {};
                    obj.should.have.keys("error", "data", "message", "code");

                    should.strictEqual(obj.code, 404);
                    should.strictEqual(obj.error, "Instance " + instance.id + " not found");
                    should.strictEqual(obj.data, null);
                    should.strictEqual(obj.message, "404 Not Found");

                    // Content tests
                    obj.should.be.instanceOf(Object);

                    // Everything is OK
                    done();
                });
            });
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
            request.get(apiUrl+"/notifications", function (error, response, body) {
                if (error || response.statusCode !== 200) {
                    done(new Error (error || response.statusCode));
                    return;
                }

                // Response has correct mime-type
                response.should.have.header("content-type", "application/json; charset=utf-8");

                // Response body id a correct API reply in JSON form without an error
                var obj = {}; try { obj = JSON.parse(body); } catch (err) {};
                obj.data.should.be.instanceOf(Object);
                obj.should.have.keys("error", "data", "code", "message");
                should.strictEqual(obj.error, null);

                // Content tests
                obj.data.should.have.keys("updateTime", "notifications");
                obj.data.notifications.should.be.instanceOf(Array);

                var notice = _.find(obj.data.notifications, function (model) {
                    return model.redeemed === false;
                });

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

                    request.get(apiUrl+"/notifications/" + obj.data.id, function (error, response, body) {
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
                        should.strictEqual(obj.data.id, notice.id);

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
                json: {"name":"name","description":"description","positions":[],"active":false}
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
                    obj.data.should.have.keys("id", "name", "positions", "active", "description");
                    obj.data.positions.should.be.instanceOf(Array);
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
                        dashboard.should.have.keys("id", "name", "positions", "active", "description");
                        dashboard.positions.should.be.instanceOf(Array);
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
                json: {"name":"name2","description":"description2","positions":['1', '2'],"active":true}
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
                    obj.data.should.have.keys("id", "name", "positions", "active", "description");
                    obj.data.positions.should.be.instanceOf(Array);
                    assert.equal(obj.data.positions.length, 2);
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
