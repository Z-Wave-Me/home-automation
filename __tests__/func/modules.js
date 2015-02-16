'use strict';
var chai = require('chai'),
    assert = chai.assert,
    should = chai.should,
    expect = chai.expect,
    _ = require('underscore'),
    utils = require('../utils'),
    request = utils.baseRequest,
    apiUrl = 'http://localhost:8083/ZAutomation/api/v1';

describe("/modules", function () {
    it("GET /modules - list modules", function (done) {
        request.get(apiUrl + "/modules", function (err, res, body) {
            // Response has correct based policy
            utils.defaultCheck(err, res, body);

            // Parse JSON string
            var obj = JSON.parse(body);
            module.exports.modules_list = obj.data;

            // Content tests
            expect(obj.data).to.be.an('array');

            // Everything is OK
            done();
        });
    });

    describe('localization module', function () {
        it("/modules/:moduleId?lang=:lang should correct language(get params)", function (done) {
            request.get(apiUrl + "/modules/Camera?lang=ru", function (err, res, body) {
                // Response has correct based policy
                utils.defaultCheck(err, res, body);

                // Parse JSON string
                var obj = JSON.parse(body);
                module.exports.modules_list = obj.data;

                // Content tests
                expect(obj.data).to.be.an('object');
                expect(obj.data.options.fields.user.label).to.equal('Пользователь для http-авторизации');

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
            }, function (err, res, body) {
                // Response has correct based policy
                utils.defaultCheck(err, res, body);

                // Parse JSON string
                var obj = JSON.parse(body);
                module.exports.modules_list = obj.data;

                // Content tests
                expect(obj.data).to.be.an('object');
                expect(obj.data.options.fields.user.label).to.equal('Пользователь для http-авторизации');

                // Everything is OK
                done();
            });
        });
    });
});