/* global: _, $, define */
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

            window.App.Views.Dashboard = that;

            that.Devices = window.App.Devices;
            that.Profiles = window.App.Profiles;
            that.WidgetsModule = new WidgetsModule();

            that.listenTo(that.Devices, 'add', function (model) {
                that.WidgetsModule.renderWidget(model, false);
            });
        },
        render: function () {
            window.widget = this.WidgetsModule;
            if (window.location.hash.indexOf('dashboard') !== -1 || !window.location.hash) {
                var that = this,
                    forceView = false;

                window.App.Devices.lock = false;
                that.WidgetsModule.render(forceView);
            }
        }
    });
});
