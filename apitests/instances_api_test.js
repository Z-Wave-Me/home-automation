var request = require("request"),
    should = require("should"),
    assert = require("assert"),
    _ = require("underscore"),
    apiUrl = "http://localhost:8083/ZAutomation/api/v1";

describe("/instances", function () {
    var instances,
        modules = require("./modules_api_test").modules_list,
        instance;


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