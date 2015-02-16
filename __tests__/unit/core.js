'use strict';
var chai = require('chai'),
    expect = chai.expect,
    Core = require('./startup');

describe('Core', function () {
    it('core should default properties', function (done) {
        // includes properties for sub-components
        expect(Core).to.include.keys(Core._components);
        // check options
        expect(Core.options).to.be.an('object');
        expect(Core.options).to.have.property('defaultLang', 'en');
        done();
    });
});