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
            return this.findWhere({active: true});
        },

        getDevice: function (deviceId) {
            var that = this,
                activeProfile = this.getActive().toJSON(),
                device = _.find(activeProfile.widgets, function (widget) { return widget.id === deviceId; });

            return device || {
                id: deviceId,
                position: {x: 0, y: 0},
                show: true
            };
        },

        setDevice: function (device) {
            var that = this,
                activeProfile = this.getActive(),
                widgets = activeProfile.get('widgets'),
                widget,
                index;

            if (_.any(widgets, function (widget) { return widget.id === device.id; })) {
                widget = _.find(widgets, function (widget) { return widget.id === device.id; });
                index = widgets.indexOf(widget);
                widgets[index] = device;
            } else {
                widgets.push(device);
            }

            if (!!device.show) {
                App.Devices.get(device.id).trigger('show');
            } else {
                App.Devices.get(device.id).trigger('hide');
            }

            activeProfile.set({widgets: widgets});
            activeProfile.save();
        },

        isShow: function (deviceId) {
            var that = this,
                widget = this.getDevice(deviceId);

            return widget.show;
        }
    });

    return ProfilesCollection;
});