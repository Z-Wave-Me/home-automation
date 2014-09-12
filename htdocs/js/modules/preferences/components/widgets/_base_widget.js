define([
    // libs
    'react',
    'morearty',
    // components
    './_base_widget'
], function (
    // libs
    React,
    Morearty
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],

        render: function () {
            var binding = this.getDefaultBinding(),
                widgetBinding = this.getBinding('widget'),
                _ = React.DOM;

            return _.div({ className: 'main-component clearfix' }, 123);
        }
    });
});
