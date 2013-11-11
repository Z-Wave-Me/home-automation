define([
    "app",
    "helpers/apis",
    "marionette",
    "collections/devices"
], function (App, Apis, Marionette, Devices) {
    'use strict';
    var DevicesView = Marionette.View.extend({
        el: '#widgets-region.widgets',
        initialize: function () {
            _.bindAll(this, 'render');
            var that = this;
        },
        render: function () {
            var that = this;
            log('devices');
        }
    });

    return DevicesView;