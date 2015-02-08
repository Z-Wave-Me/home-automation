'use strict';
var chai = require('chai'),
    assert = chai.assert,
    should = chai.should,
    expect = chai.expect,
    _ = require('underscore'),
    utils = require('../utils'),
    request = utils.baseRequest,
    apiUrl = 'http://localhost:8083/ZAutomation/api/v1';

describe("/instances", function () {
    var instances,
        modules = require("./modules").modules_list,
        instance;

    it("list instances", function (done) {
        request.get(apiUrl + "/instances", function (err, res, body) {
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = JSON.parse(body);
            // Content tests
            assert.isArray(obj.data);
            instances = obj.data;

            // Everything is OK
            done();
        });
    });

    it("creates new instance", function (done) {
        request.get(apiUrl + "/modules/BatteryPolling", function (err, res, body) {
            var module = JSON.parse(body).data;

            request.post({
                url: apiUrl + "/instances",
                json: {
                    moduleId: module.id,
                    title: module.defaults.title,
                    description: module.defaults.description,
                    params: module.defaults,
                    active: true
                }
            }, function (err, res, body) {
                utils.defaultCheck(err, res, body);

                // Parse JSON string
                var obj = typeof body === 'string' ? JSON.parse(body) : body;
                // Content tests
                expect(obj.data).to.be.an('object');
                instance = obj.data;

                // Content tests
                request.get(apiUrl + "/instances/" + obj.data.id, function (err, res, body) {
                    utils.defaultCheck(err, res, body);

                    // Parse JSON string
                    var obj = JSON.parse(body);
                    // Content tests
                    expect(_.isEqual(instance.params, obj.data.params)).to.be.true();
                    instance = obj.data;

                    // Everything is OK
                    done();
                });
            });
        });
    });

    it("exposes instance config", function (done) {
        request.get(apiUrl + "/instances/" + instance.id, function (err, res, body) {
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = typeof body === 'string' ? JSON.parse(body) : body;
            // Content tests
            instance = obj.data;
            expect(_.isEqual(instance.params, obj.data.params)).to.be.true();

            // Everything is OK
            done();
        });
    });

    it("updates instance config", function (done) {
        var title = instance.title + '(Test)',
            description = instance.description + '(Test)',
            json = _.extend(instance, {
                title: title,
                description: description,
                active: false
            });

        request.put({
            url: apiUrl + "/instances/" + instance.id,
            json: json
        }, function (err, res, body) {
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = typeof body === 'string' ? JSON.parse(body) : body;
            instance = obj.data;

            // Content tests
            request.get(apiUrl + "/instances/" + instance.id, function (error, response, body) {
                utils.defaultCheck(err, res, body);

                // Parse JSON string
                var obj = typeof body === 'string' ? JSON.parse(body) : body;
                instance = obj.data;

                // Content tests
                expect(obj).to.be.an('object');
                expect(obj.data.title).to.equal(title);
                expect(obj.data.description).to.equal(description);
                expect(obj.data.active).to.be.false();

                // Everything is OK
                done();
            });
        });
    });

    it("deletes instance", function () {
        request.del(apiUrl + "/instances/" + instance.id, function (err, res, body) {
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = typeof body === 'string' ? JSON.parse(body) : body;
            instance = obj.data;

            // Content tests
            expect(obj).to.be.an('null');

            // Content tests
            request.get(apiUrl + "/instances/" + instance.id, function (error, response, body) {
                utils.defaultCheck(err, res, body);

                // Parse JSON string
                var obj = typeof body === 'string' ? JSON.parse(body) : body;

                expect(obj.code).to.equal(404);
                expect(obj.error).to.equal("Instance " + instance.id + " is not found");
                expect(obj.data).to.equal(null);
                expect(obj.message).to.equal("404 Not Found");
            });
        });
    });
});