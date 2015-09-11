'use strict';
var chai = require('chai'),
    assert = chai.assert,
    should = chai.should,
    expect = chai.expect,
    _ = require('underscore'),
    utils = require('../utils'),
    request = utils.baseRequest,
    apiUrl = 'http://localhost:8083/ZAutomation/api/v1';

describe('/locations', function () {
    var testLocation = null;
    it('create location', function (done) {
        request.post({
            url: apiUrl + '/locations',
            json: {
                'title': 'name',
                'icon': 'icon'
            }
        }, function (err, res, body) {
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = typeof body === 'string' ? JSON.parse(body) : body;

            // Content tests
            expect(obj.data).to.be.an('object');
            expect(obj.data).to.have.keys(['id', 'title', 'icon']);
            expect(obj.data.id).to.be.an('number');
            expect(obj.data.title).to.be.an('string');
            expect(obj.data.icon).to.be.an('string');

            request.get(apiUrl + '/locations/' + obj.data.id, function (err, res, body) {
                utils.defaultCheck(err, res, body);

                // Parse JSON string
                var obj = typeof body === 'string' ? JSON.parse(body) : body;

                // Content tests
                expect(obj.data).to.be.an('object');
                expect(obj.data).to.have.keys(['id', 'title', 'icon']);
                expect(obj.data.id).to.be.an('number');
                expect(obj.data.title).to.be.an('string');
                expect(obj.data.icon).to.be.an('string');
                testLocation = obj.data;

                // Everything is OK
                done();
            });
        });
    });

    it('list locations', function (done) {
        request.get(apiUrl + '/locations', function (err, res, body) {
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = typeof body === 'string' ? JSON.parse(body) : body;

            // Content tests
            expect(obj.data).to.be.an('array');

            // Everything is OK
            done();
        });
    });

    it('update location', function (done) {
        var json = {
            id: testLocation.id,
            title: 'name2',
            icon: 'http://ya.ru'
        };

        request.put({
            url: apiUrl + '/locations/' + testLocation.id,
            json: json
        }, function (err, res, body) {
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = typeof body === 'string' ? JSON.parse(body) : body;

            // Content tests
            expect(obj.data).to.be.an('object');
            expect(obj.data).to.have.keys(['id', 'title', 'icon']);
            expect(obj.data.id).to.be.an('number');
            expect(obj.data.title).to.be.an('string');
            expect(obj.data.title).to.equal(json.title);
            expect(obj.data.icon).to.equal(json.icon);

            // Content tests
            request.get(apiUrl + '/locations/' + body.data.id, function (error, response, body) {
                utils.defaultCheck(err, res, body);

                // Parse JSON string
                var obj = typeof body === 'string' ? JSON.parse(body) : body;

                // Content tests
                expect(obj.data).to.be.an('object');
                expect(obj.data).to.have.keys(['id', 'title', 'icon']);
                expect(obj.data.id).to.be.an('number');
                expect(obj.data.title).to.be.an('string');
                expect(obj.data.title).to.equal(json.title);
                expect(obj.data.icon).to.equal(json.icon);

                // Everything is OK
                done();
            });
        });
    });

    it('delete location', function () {
        request.del(apiUrl + '/locations/' + testLocation.id, function (err, res, body) {
            utils.defaultCheck(err, res, body);

            expect(res.statusCode).to.equal(204);

            // Content tests
            request.get(apiUrl + '/locations/' + testLocation.id, function (err, res, body) {
                utils.defaultCheck(err, res, body);

                expect(res.statusCode).to.equal(404);
            });
        });
    });
});
