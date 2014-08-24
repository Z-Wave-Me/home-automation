define([
    //components
    'backbone',
    'react'
], function (
    // libs
    Backbone,
    React
    ) {
    'use strict';

    return Backbone.View.extend({
        el: '#body',
        initialize: function (options) {
            _.bindAll(this, 'render');
            var that = this;

            that.options = _.extend({}, options || {});
        },
        render: function () {
            var that = this;
            require(['jsx!modules/filters/components/filters'], function (FiltersComponent) {
                React.renderComponent(FiltersComponent, that.$el.find('.filters-container').get(0));
            });
        }
    });
});
