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
                that.WidgetsModule.renderWidget(model);
            });

            that.listenTo(that.Devices, 'refresh', function () {
                that.WidgetsModule.render(true);
            });

            that.listenToOnce(that.Devices, 'sync', function () {
                that.render();
            });
            that.render();
        },
        render: function () {
            var that = this;
            that.WidgetsModule.render(true);
        }
    });
});