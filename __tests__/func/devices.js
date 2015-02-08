'use strict';
var chai = require('chai'),
    assert = chai.assert,
    should = chai.should,
    expect = chai.expect,
    _ = require('underscore'),
    utils = require('../utils'),
    request = utils.baseRequest,
    apiUrl = 'http://localhost:8083/ZAutomation/api/v1';

describe('/devices', function () {
    it('lists devices from the beginning', function (done) {
        request.get(apiUrl + '/devices', function (error, response, body) {
            // Response has correct based policy
            utils.defaultCheck(error, response, body);

            // Parse JSON string
            var obj = JSON.parse(body);
            // Content tests
            expect(obj.data).to.be.an('object');
            expect(obj.data).to.have.keys(['updateTime', 'structureChanged', 'devices']);
            expect(obj.data.updateTime).to.be.an('number');
            expect(obj.data.devices).to.be.an('array');
            expect(obj.data.structureChanged).to.be.an('boolean');

            // Everything is OK
            done();
        });
    });

    it('lists no updated devices in the future', function (done) {
        var testTS = Math.floor(new Date().getTime() / 1000) + 10000;
        request.get(apiUrl + '/devices?since=' + testTS, function (err, res, body) {
            // Response has correct based policy
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = JSON.parse(body);
            // Content tests
            expect(obj.data).to.be.an('object');
            expect(obj.data).to.have.keys(['updateTime', 'structureChanged', 'devices']);
            expect(obj.data.updateTime).to.be.an('number');
            expect(obj.data.devices).to.be.an('array');
            expect(obj.data.structureChanged).to.be.an('boolean');
            expect(obj.data.updateTime < testTS).to.be.true();

            // Everything is OK
            done();
        });
    });
});