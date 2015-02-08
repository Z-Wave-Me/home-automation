'use strict';
var chai = require('chai'),
    expect = chai.expect,
    Core = require('./startup');

describe('Core.Base', function () {
    it('BaseClass should support Extend', function (done) {
        var ChildClassConstructor = Core.Base.Extend({
                prop: 42
            }),
            ChildClass = new ChildClassConstructor();

        expect(ChildClass).to.be.an.instanceof(Core.Base);
        expect(ChildClassConstructor).itself.to.respondTo('Extend');
        expect(ChildClass).to.have.property('prop', 42);

        done();
    });

    it('BaseClass should support eventBus', function (done) {
        var ChildClassConstructor = Core.Base.Extend({
                prop: 42
            }),
            ChildClass = new ChildClassConstructor();

        // add handler
        ChildClass.on('change:value', function (e, value) {
            this.prop = value;
        });

        // execute trigger
        ChildClass.trigger('change:value', 100);

        // unbind all
        ChildClass.off('change:value');

        // prop should be equal 100
        expect(ChildClass.trigger('change:value', 22)).to.be.undefined();
        expect(ChildClass).to.have.property('prop', 100);

        done();
    });

    it('BaseClass should support many triggering', function (done) {
        var ChildClassConstructor = Core.Base.Extend({
                prop: 42,
                prop2: 44
            }),
            ChildClass = new ChildClassConstructor();

        // add handler
        ChildClass.on('change:prop:value', function (e, value) {
            this.prop = value;
        });

        ChildClass.on('change:prop2:value', function (e, value) {
            this.prop2 = value;
        });

        // execute trigger
        ChildClass.trigger('change:prop:value change:prop2:value', 100);

        // prop should be equal 100
        expect(ChildClass).to.have.property('prop', 100);
        expect(ChildClass).to.have.property('prop2', 100);

        done();
    });

    it('initialize function', function (done) {
        var ChildClassConstructor = Core.Base.Extend({
                prop: 42,
                initialize: function () {
                    this.prop = 144;
                }
            }),
            ChildClass = new ChildClassConstructor();

        // prop should be equal 144
        expect(ChildClass).to.have.property('prop', 144);

        done();
    });
});