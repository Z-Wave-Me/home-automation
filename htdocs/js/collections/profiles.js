define([
    //libs
    'backbone',
    'models/profile'
], function (Backbone, ProfileM) {
    'use strict';

    var ProfilesCollection =  Backbone.Collection.extend({

        // model reference
        model: ProfileM,

        methodToURL: {
            'read': '/profiles',
            'create': '/profiles',
            'update': '/profiles',
            'delete': '/profiles'
        },

        url: function () {
            var url = this.id !== undefined ? '/' + this.id : '';
            return url;
        },

        sync: function (method, model, options) {
            options = options || {};
            options.url = model.methodToURL[method.toLowerCase()] + this.url();
            Backbone.sync(method, model, options);
        },

        parse: function (response, xhr) {
            return response.data;
        },

        initialize: function () {
           log('Init ProfilesCollection');
        },

        getActive: function () {
            return this.findWhere({active: true}) || this.first() || null;
        },

        getDevice: function (deviceId) {
            var that = this,
                active = that.getActive(),
                profile = active ? active.toJSON() : null,
                device = profile ? _.find(profile.positions, function (id) { return id === deviceId; }) : null;

            return device;
        },

        setPositions: function (devicesId) {
            var that = this;
            if (_.isArray(devicesId)) {
                that.getActive().save({positions: _.uniq(_.compact(devicesId))});
            }
        },

        toggleDevice: function (devicesId) {
            var that = this,
                device,
                devices = _.isArray(devicesId) ? devicesId : [devicesId];

            _.each(devices, function (deviceId) {
                device = that.getDevice(deviceId);

                if (device) {
                    that.removeDevice(deviceId);
                } else {
                    that.setDevice(deviceId);
                }
            });
        },

        setDevice: function (deviceId) {
            var that = this,
                profile = that.getActive(),
                positions = profile.has('positions') ? profile.get('positions') : [];

            if (!_.any(positions, function (id) { return deviceId === id; })) {
                positions.push(deviceId);
                profile.save({positions: _.compact(_.uniq(positions))});
                App.Devices.get(deviceId).trigger('show');
            }
        },

        removeDevice: function (deviceId) {
            var that = this,
                profile = that.getActive(),
                positions = profile.get('positions');

            if (_.any(positions, function (id) { return deviceId === id; })) {
                positions = _.filter(positions, function (id) { return id !== deviceId; });
                profile.save({positions: _.compact(_.uniq(positions))});
                App.Devices.get(deviceId).trigger('hide');
            }
        }
    });

    return ProfilesCollection;
});