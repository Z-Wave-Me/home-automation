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
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                item = binding.val(),
                title = item.get('metrics').title;

            return (
                _.div({className: 'content'},
                    _.span({className: 'title-container'}, title),
                    _.button({className: 'quad-button up-button'}, 'Up'),
                    _.button({className: 'quad-button down-button'}, 'Down')
                )
                )
        }
    });
});
