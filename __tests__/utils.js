'use strict';

var request = require('request'),
    chai = require('chai'),
    assert = chai.assert,
    should = chai.should,
    expect = chai.expect;

module.exports = {
    defaultCheck: function (err, res, body) {
        var obj = null;
        // Response has correct mime-type
        assert.propertyVal(res.headers, 'content-type', 'application/json; charset=utf-8');

        // check code
        expect([201, 304, 200, 403, 204, 404].indexOf(res.statusCode) !== -1).to.be.true();

        // Response body id a correct API reply in JSON form without an error
        if (res.statusCode !== 204) {
            try {
                obj = JSON.parse(body);
            } catch (err) {
                obj = body;
            }
        }

        if (obj !== null) {
            expect(obj).to.be.an('object');
            expect(obj).to.have.keys(['data', 'code', 'message', 'error']);
            expect(obj.error).to.be.an('null');
        }
    },
    checkUser: function (user) {
        expect(user).to.be.an('object');
        expect(user).to.have.keys(['id', 'username', 'name', 'phone', 'email']);
        expect(user.id).to.be.an('number');
        expect(user.username).to.be.an('string');
        expect(user.name).to.be.an('string');
        expect(user.phone).to.be.an('number');
        expect(user.email).to.be.an('string');
    },
    baseRequest: request.defaults({
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0'
        }
    })
};