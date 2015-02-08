'use strict';
var chai = require('chai'),
    assert = chai.assert,
    should = chai.should,
    expect = chai.expect,
    _ = require('underscore'),
    utils = require('../utils'),
    request = utils.baseRequest,
    apiUrl = 'http://localhost:8083/ZAutomation/api/v1';

describe('/users', function () {
    var auth = require('./auth'),
        testUser;

    it("lists users", function (done) {
        request.get(apiUrl + "/users", function (err, res, body) {
            // Response has correct based policy
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = JSON.parse(body);

            // Content tests
            expect(obj.data).to.be.an('array');
            expect(obj.data).to.be.length.above(0);

            // Everything is OK
            done();
        });
    });

    it("create user", function (done) {
        var json = {
            username: 'user',
            password: 'tututu',
            phone: 79239993333,
            email: 'test@example.com',
            name: 'example user'
        };

        request.post({
            url: apiUrl + "/users",
            json: json
        }, function (err, res, body) {
            // Response has correct based policy
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = JSON.parse(body);

            // Content tests
            utils.checkUser(obj.data);

            expect(obj.data.username).to.equal('admin');

            testUser = obj.data;

            // Everything is OK
            done();
        });
    });

    it("expose user", function (done) {
        request.get(apiUrl + "/users/" + testUser.id, function (err, res, body) {
            // Response has correct based policy
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = JSON.parse(body);

            // Content tests
            utils.checkUser(obj.data);

            expect(obj.data.username).to.equal('admin');

            // Everything is OK
            done();
        });
    });

    it("delete user", function (done) {
        request.get(apiUrl + "/users/" + testUser.id, function (err, res, body) {
            // Response has correct based policy
            utils.defaultCheck(err, res, body);
            expect(res.statusCode).to.equal(204);

            // Everything is OK
            done();
        });
    });
});
