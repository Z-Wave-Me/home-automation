'use strict';
var chai = require('chai'),
    expect = chai.expect,
    Core = require('./startup');

describe('Core.Model', function () {
    var DeviceModelConstructor, DeviceModel;
    before(function () {
        DeviceModelConstructor = Core.Model.Extend({
            initialize: function () {
                var self = this;
                self.options.param = 1;
            }
        });
        DeviceModel = new DeviceModelConstructor({test: 'test'});
    });

    it('instance model', function (done) {
        expect(DeviceModel).to.be.an.instanceof(Core.Model);
        expect(DeviceModel.get('test')).to.equal('test');
        expect(DeviceModel.options.param).to.equal(1);
        done();
    });

    it('#set', function (done) {
        DeviceModel.set('metrics.icon', 'http://example.com/pic.png');
        DeviceModel.set({
            pic: 'http://example.com/pic2.png'
        });

        // tests
        expect(DeviceModel.get('metrics.icon')).to.equal('http://example.com/pic.png');
        done();
    });

    it('#has', function (done) {
        // tests
        expect(DeviceModel.has('metrics.icon')).to.be.true;
        expect(DeviceModel.has('test')).to.be.true;
        done();
    });

    it('#unset', function (done) {
        // tests
        DeviceModel.set('test2', 'test2');
        expect(DeviceModel.get('test2')).to.equal('test2');
        DeviceModel.unset('test2');
        expect(DeviceModel.get('test2')).to.not.exist;

        done();
    });

    it('#isNew', function (done) {
        // tests
        var isNew = !Boolean(DeviceModel.get('id'));
        expect(DeviceModel.isNew() === isNew).to.be.true;

        done();
    });

    it('#toJSON', function (done) {
        // tests
        expect(DeviceModel.attributes).to.deep.equal(DeviceModel.toJSON());
        expect(DeviceModel.attributes).to.not.equal(DeviceModel.toJSON());

        done();
    });

    it('#keys', function (done) {
        expect(Object.keys(DeviceModel.attributes)).to.have.members(DeviceModel.keys());

        done();
    });

    it('#values', function (done) {
        // tests
        var values = Object.keys(DeviceModel.attributes).map(function (key) {
            return DeviceModel.attributes[key];
        });

        expect(values).to.have.members(DeviceModel.values());

        done();
    });

    //TODO: changedAttributes, save, destroy, invert, omit, pick, pairs

    it('#clear', function (done) {
        // tests
        DeviceModel.clear();
        expect(DeviceModel.toJSON()).to.deep.equal({});

        done();
    });
});
