'use strict';
var chai = require('chai'),
    expect = chai.expect,
    Core = require('./startup');

describe('Core.Helpers', function () {
    it('Core.Helpers.Extend', function (done) {
        var SuperClass,
            ChildClassConstructor,
            ChildClass;

        // create SuperClass
        SuperClass = function () {};
        SuperClass.prop = 'prop';
        SuperClass.prototype = {
            init: function () {
                return this.prop;
            },
            getProp: function () {
                console.log('launch getProp');
            }
        };

        // add support Extend helper
        SuperClass.Extend = Core.Helpers.Extend;

        // extending ChildClass from SuperClass
        ChildClassConstructor =  SuperClass.Extend({
            prop: 4,
            props: {}
        });

        // Instantiate ChildClass
        ChildClass = new ChildClassConstructor({
            prot: 2
        });

        // tests
        expect(ChildClass).to.be.an.instanceof(SuperClass);
        expect(ChildClass).itself.not.to.respondTo('props');
        expect(ChildClass).itself.not.to.respondTo('prop');
        expect(ChildClass).to.respondTo('init');
        expect(ChildClass).to.respondTo('getProp');
        expect(ChildClass).to.respondTo('Extend');
        expect(ChildClass.init()).to.equal(4);
        expect(ChildClass).to.have.property('prop', 4);

        done();
    });
});