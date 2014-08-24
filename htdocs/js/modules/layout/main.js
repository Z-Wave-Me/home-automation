define([
    //components
    'backbone',
    'react',
    'jsx!./components/header',
    'jsx!./components/main',
    'jsx!./components/footer'
], function (
    // libs
    Backbone,
    React,
    // components
    HeaderComponent,
    MainComponent,
    FooterComponent
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
            var that = this,
                start = new Date();

            React.renderComponent(HeaderComponent(), that.$el.find('.header-container').get(0));
            React.renderComponent(MainComponent(), that.$el.find('.main-container').get(0));
            React.renderComponent(FooterComponent(), that.$el.find('.footer-container').get(0));
        }
    });
});
