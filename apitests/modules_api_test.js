var request = require("request"),
    should = require("should"),
    _ = require("underscore"),
    assert = require('chai').assert,
    apiUrl = "http://localhost:8083/ZAutomation/api/v1";

describe("/modules", function () {
    it("GET /modules - list modules", function (done) {
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
            obj.data.should.be.instanceOf(Object);

            // Everything is OK
            done();
        });
    });

    describe('localization module', function () {

        it("/modules/:moduleId?lang=:lang should correct language(get params)", function (done) {
            request.get(apiUrl + "/modules/Camera?lang=ru", function (error, response, body) {
                if (error || response.statusCode !== 200) {
                    done(new Error (error || response.statusCode));
                    return;
                }

                // Response has correct mime-type
                response.should.have.header("content-type", "application/json; charset=utf-8");

                // Response body id a correct API reply in JSON form without an error
                var obj = {};
                try {
                    obj = JSON.parse(body);
                } catch (err) {}

                obj.should.have.keys("error", "data", "code", "message");
                should.strictEqual(obj.error, null);
                should.strictEqual(obj.code, 200);

                // Content tests
                assert.isObject(obj.data);
                assert.strictEqual(obj.data.options.fields.user.label, 'Пользователь для http-авторизации');

                //check lang
                assert.property(obj.data, 'id');

                // Everything is OK
                done();
            });
        });

        it("/modules/:moduleId?lang=:lang should correct language(header)", function (done) {
            request.get({
                url: apiUrl + "/modules/Camera",
                headers: {
                    'Accept-Encoding': 'ru'
                }
            }, function (error, response, body) {
                if (error || response.statusCode !== 200) {
                    done(new Error (error || response.statusCode));
                    return;
                }

                // Response has correct mime-type
                response.should.have.header("content-type", "application/json; charset=utf-8");

                // Response body id a correct API reply in JSON form without an error
                var obj = {};
                try {
                    obj = JSON.parse(body);
                } catch (err) {}

                obj.should.have.keys("error", "data", "code", "message");
                should.strictEqual(obj.error, null);
                should.strictEqual(obj.code, 200);

                // Content tests
                assert.isObject(obj.data);
                assert.strictEqual(obj.data.options.fields.user.label, 'Пользователь для http-авторизации');

                //check lang
                assert.property(obj.data, 'id');

                // Everything is OK
                done();
            });
        });
    });
});