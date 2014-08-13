define([
    //components
    'backbone',
    'backbone-controller'
], function (
    // components
    Backbone,
    Controller
    ) {
    'use strict';

    return Backbone.Controller.extend({
        initialize: function () {
            _.bindAll(this, 'render');
            var that = this;

            that.options = _.extend({}, arguments[0]);
        },
        render: function () {
            var that = this;
        }
    });
});
