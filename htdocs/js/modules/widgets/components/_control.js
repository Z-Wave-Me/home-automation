define([
    // libs
    'react',
    'morearty'
], function (
    React,
    Morearty
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var _ = React.DOM;

            return (
                _.div({className: 'content'},
                    _.span({className: 'title-container'}, this.getDefaultBinding().sub('metrics').val('title')),
                    _.button({className: 'quad-button up-button'}, 'Up'),
                    _.button({className: 'quad-button down-button'}, 'Down')
                )
            );
        }
    });
});
