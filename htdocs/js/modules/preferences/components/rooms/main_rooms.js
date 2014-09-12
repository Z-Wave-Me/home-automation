define([
    // libs
    'react',
    'morearty'
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
                _ = React.DOM;

            return _.div({ className: 'main-component clearfix' }, 'MainRooms');
        }
    });
});
