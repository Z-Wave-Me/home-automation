'use strict';
var chai = require('chai'),
    assert = chai.assert,
    should = chai.should,
    expect = chai.expect,
    _ = require('underscore'),
    utils = require('../utils'),
    request = utils.baseRequest,
    apiUrl = 'http://localhost:8083/ZAutomation/api/v1';

describe('/profiles', function () {
    var testDashboard = null;
    it('create profile', function (done) {
        request.post({
            url: apiUrl + '/profiles',
            json: {
                'name': 'name',
                'description': 'description',
                'positions':[]
            }
        }, function (err, res, body) {
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = typeof body === 'string' ? JSON.parse(body) : body;

            // Content tests
            expect(obj.data).to.be.an('object');
            expect(obj.data).to.have.keys(['id', 'name', 'positions', 'description']);
            expect(obj.data.id).to.be.an('number');
            expect(obj.data.name).to.be.an('string');
            expect(obj.data.description).to.be.an('string');
            expect(obj.data.positions).to.be.an('array');

            request.get(apiUrl + '/profiles/' + obj.data.id, function (err, res, body) {
                utils.defaultCheck(err, res, body);

                // Parse JSON string
                var obj = typeof body === 'string' ? JSON.parse(body) : body;

                // Content tests
                expect(obj.data).to.be.an('object');
                expect(obj.data).to.have.keys(['id', 'name', 'positions', 'description']);
                expect(obj.data.id).to.be.an('number');
                expect(obj.data.name).to.be.an('string');
                expect(obj.data.description).to.be.an('string');
                expect(obj.data.positions).to.be.an('array');
                testDashboard = obj.data;

                // Everything is OK
                done();
            });
        });
    });

    it('list profiles', function (done) {
        request.get(apiUrl + '/profiles', function (err, res, body) {
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = typeof body === 'string' ? JSON.parse(body) : body;

            // Content tests
            expect(obj.data).to.be.an('array');

            // Everything is OK
            done();
        });
    });

    it('update profiles', function (done) {
        var json = {
            'name': 'name2',
            'description': 'description2',
            'positions': ['1', '2']
        };

        request.put({
            url: apiUrl + '/profiles/' + testDashboard.id,
            json: json
        }, function (err, res, body) {
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = typeof body === 'string' ? JSON.parse(body) : body;

            // Content tests
            expect(obj.data).to.be.an('object');
            expect(obj.data).to.have.keys(['id', 'name', 'positions', 'description']);
            expect(obj.data.id).to.be.an('number');
            expect(obj.data.name).to.be.an('string');
            expect(obj.data.description).to.be.an('string');
            expect(obj.data.positions).to.be.an('array');
            expect(obj.data.name).to.equal(json.name);
            expect(obj.data.description).to.equal(json.description);
            expect(obj.data.positions).to.have.members(json.positions);

            // Content tests
            request.get(apiUrl + '/profiles/' + body.data.id, function (error, response, body) {
                utils.defaultCheck(err, res, body);

                // Parse JSON string
                var obj = typeof body === 'string' ? JSON.parse(body) : body;

                // Content tests
                expect(obj.data).to.be.an('object');
                expect(obj.data).to.have.keys(['id', 'name', 'positions', 'description']);
                expect(obj.data.id).to.be.an('number');
                expect(obj.data.name).to.be.an('string');
                expect(obj.data.description).to.be.an('string');
                expect(obj.data.positions).to.be.an('array');
                expect(obj.data.name).to.equal(json.name);
                expect(obj.data.description).to.equal(json.description);
                expect(obj.data.positions).to.have.members(json.positions);

                // Everything is OK
                done();
            });
        });
    });

    it('delete profiles', function () {
        request.del(apiUrl + '/profiles/' + testDashboard.id, function (err, res, body) {
            utils.defaultCheck(err, res, body);

            expect(res.statusCode).to.equal(204);

            // Content tests
            request.get(apiUrl + '/profiles/' + testDashboard.id, function (err, res, body) {
                utils.defaultCheck(err, res, body);

                expect(res.statusCode).to.equal(404);
            });
        });
    });
});
