'use strict';
var chai = require('chai'),
    expect = chai.expect,
    utils = require('../utils'),
    request = utils.baseRequest,
    apiUrl = 'http://localhost:8083/ZAutomation/api/v1';

describe('/auth', function () {
    var token, renewToken;

    it('/auth/login', function (done) {
        request.post({
            url: apiUrl + '/devices',
            json: {
                username: 'admin',
                password: 'admin'
            }
        }, function (err, res, body) {
            // Response has correct based policy
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = JSON.parse(body);

            // Content tests
            expect(obj.data).to.be.an('object');
            expect(obj.data).to.have.keys(['id', 'renewToken', 'ttl', 'meta']);
            expect(obj.data.id).to.be.an('string');
            expect(obj.data.renewToken).to.be.an('string');
            expect(obj.data.ttl).to.be.an('number');
            expect(obj.data.meta).to.be.an('object');

            // sets variables
            token = obj.data.id;
            renewToken = obj.data.renewToken;

            module.exports = {
                token: token,
                renewToken: renewToken
            };

            // Everything is OK
            done();
        });
    });

    it('/auth/renew', function (done) {
        request.post({
            headers: {
                'Authorization': token
            },
            url: apiUrl + '/devices',
            json: {
                renewToken: renewToken
            }
        }, function (err, res, body) {
            // Response has correct based policy
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = JSON.parse(body);

            // Content tests
            expect(obj.data).to.be.an('object');
            expect(obj.data).to.have.keys(['id', 'renewToken', 'ttl', 'meta']);
            expect(obj.data.id).to.be.an('string');
            expect(obj.data.renewToken).to.be.an('string');
            expect(obj.data.ttl).to.be.an('number');
            expect(obj.data.meta).to.be.an('object');

            // Everything is OK
            done();
        });
    });
});