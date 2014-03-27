define([
    "backbone",
    "modules/widgets/main"
], function (Backbone, WidgetsModule) {
    'use strict';
    return Backbone.View.extend({
        el: '#devices-container',
        initialize: function () {
            _.bindAll(this, 'render');
            var that = this;

            that.WidgetsModule = new WidgetsModule();
            that.Devices = window.App.Devices;
            that.Locations = window.App.Locations;

            that.listenTo(that.Locations, 'filter', function () {
                that.Devices.each(function (device) {
                    if (window.App.filters.locations) {
                        if (that.Locations.activeRoom === 'all' || that.Locations.activeRoom === device.get('location')) {
                            device.trigger('show');
                        } else {
                            device.trigger('hide');
                        }
                    }
                });
            });

            that.listenTo(that.Devices, 'filter', function () {
                that.Devices.each(function (device) {
                    if (window.App.filters.types) {
                        if (that.Devices.activeType === 'all' || that.Devices.activeType === device.get('deviceType')) {
                            device.trigger('show');
                        } else {
                            device.trigger('hide');
                        }
                    } else if (window.App.filters.tags) {
                        if (that.Devices.activeTag === 'all' || device.get('tags').indexOf(that.Devices.activeTag) !== -1) {
                            device.trigger('show');
                        } else {
                            device.trigger('hide');
                        }
                    }
                });
            });

            that.listenToOnce(window.App.Devices, 'reset sync', function () {
                that.render();
            });

            that.listenTo(window.App.Devices, 'refresh', function () {
                that.render();
            });

            that.render();
        },
        render: function () {
            if (window.location.hash.indexOf('widgets') !== -1) {
                var that = this;
                window.App.Devices.lock = true;
                that.WidgetsModule.render(false, true);
            }
        }
    });
});