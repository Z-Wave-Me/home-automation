'use strict';
var chai = require('chai'),
    assert = chai.assert,
    should = chai.should,
    expect = chai.expect,
    _ = require('underscore'),
    utils = require('../utils'),
    request = utils.baseRequest,
    apiUrl = 'http://localhost:8083/ZAutomation/api/v1';

describe("/notifications", function () {
    it("lists notifications from the beginning", function (done) {
        request.get(apiUrl + "/notifications", function (err, res, body) {
            // Response has correct based policy
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = JSON.parse(body);

            // Content tests
            expect(obj.data).to.be.an('object');
            expect(obj.data).to.have.keys(['updateTime', 'notifications']);
            expect(obj.data.updateTime).to.be.an('number');
            expect(obj.data.notifications).to.be.an('array');

            // Everything is OK
            done();
        });
    });

    it("lists no notifications in the future", function (done) {
        var testTS = Math.floor(new Date().getTime() / 1000) + 10000;
        request.get(apiUrl + '/notifications?since=' + testTS, function (err, res, body) {
            // Response has correct based policy
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = JSON.parse(body);

            // Content tests
            expect(obj.data).to.be.an('object');
            expect(obj.data).to.have.keys(['updateTime', 'notifications']);
            expect(obj.data.updateTime).to.be.an('number');
            expect(obj.data.notifications).to.be.an('array');
            expect(obj.data.updateTime < testTS).to.be.true();
            expect(obj.data.notifications).to.have.length(0);

            // Everything is OK
            done();
        });
    });
});