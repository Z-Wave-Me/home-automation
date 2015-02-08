'use strict';
var chai = require('chai'),
    expect = chai.expect,
    Core = require('./startup');

describe('Core.Collection', function () {
    var DevicesCollectionConstructor,
        DevicesCollection,
        DeviceModelConstructor,
        testData = [
            {
                id: 1,
                name: 'test1',
                location: 1
            },
            {
                id: 2,
                name: 'test2',
                location: 2
            },
            {
                id: 3,
                name: 'test3',
                location: 3
            }
        ];

    before(function (done) {
        DeviceModelConstructor = Core.Model.Extend({});
        DevicesCollectionConstructor = Core.Collection.Extend({
            model: DeviceModelConstructor
        });

        DevicesCollection = new DevicesCollectionConstructor(testData);

        done();
    });

    it('instance collection', function (done) {
        expect(DevicesCollection).to.be.an.instanceof(Core.Collection);
        expect(DevicesCollection).to.have.length.of.at.most(3);
        expect(DevicesCollection.first()).to.be.an.instanceof(DeviceModelConstructor);

        done();
    });

    it('#get', function (done) {
        expect(DevicesCollection.get(1)).to.be.equal(DevicesCollection.models[0]);
        done();
    });

    it('#at', function (done) {
        expect(DevicesCollection.at(0)).to.be.equal(DevicesCollection.models[0]);
        done();
    });

    it('#add', function (done) {
        DevicesCollection.add({id: 4, location: 4, name: 'test4'});
        expect(DevicesCollection.get(4)).to.be.an.instanceof(DeviceModelConstructor);
        expect(DevicesCollection.get(4).get('id')).to.be.equal(4);
        done();
    });

    it('#remove', function (done) {
        DevicesCollection.add({id: 5, location: 5, name: 'test5'});
        expect(DevicesCollection.get(5).get('id')).to.be.equal(5);
        DevicesCollection.remove(DevicesCollection.get(5));
        expect(DevicesCollection.has(5)).to.be.false();
        done();
    });

    it('#reset', function (done) {
        DevicesCollection.reset();
        expect(DevicesCollection).to.have.length.of.at.most(0);
        done();
    });

    it('#size', function (done) {
        expect(DevicesCollection).to.have.length.of.at.most(DevicesCollection.size());
        done();
    });
});