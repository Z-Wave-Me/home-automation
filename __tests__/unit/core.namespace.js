'use strict';
var chai = require('chai'),
    expect = chai.expect,
    Core = require('./startup');

describe('Core.Namespace', function () {
    var path = 'Parts.testObject',
        path2 = 'Parts.testObject2',
        testObject = {
            attr: 'attr',
            test: 'test',
            numberTest: 123
        };

    beforeEach(function (done) {
        Core.Namespace(path, null);
        done();
    });

    it('#easy way', function (done) {
        Core.Namespace(path, testObject);
        Core.Namespace(path2, '123');
        expect(Core.Namespace(path)).to.be.equal(testObject);
        expect(Core.Namespace(path2)).to.be.equal('123');
        done();
    });

    it('#full way', function (done) {
        Core.Namespace.set(path, testObject);
        expect(Core.Namespace.get(path)).to.be.equal(testObject);
        done();
    });
});