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
                title = item.get('metrics').title,
                level = item.get('metrics').level || item.get('metrics').mode;

            return (
                _.div({className: 'content'},
                    _.span({className: 'title-container'}, title),
                    _.div({className: 'colors-container just-hidden'},
                        _.div({className: 'picker'})
                    ),
                    _.a({href: '#', className: 'action', title: level.toUpperCase()},
                        _.span({className: 'switch-door'},
                            _.span({className: 'bubble'}),
                            _.span({className: 'text'}, level.toUpperCase())
                        )
                    )
                )
                )
        }
    });
});
