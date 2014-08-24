define([
    //components
    'backbone'
], function (
    // components
    Backbone
    ) {
    'use strict';

    return Backbone.View.extend({
        initialize: function (options) {
            _.bindAll(this, 'render');
            var that = this;

            that.options = _.extend({}, arguments[0]);
        },
        render: function () {
            var that = this;
        }
    });
});
