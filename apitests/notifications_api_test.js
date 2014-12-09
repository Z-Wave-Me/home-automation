var request = require("request"),
    should = require("should"),
    assert = require("assert"),
    _ = require("underscore"),
    apiUrl = "http://localhost:8083/ZAutomation/api/v1";

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