define([
    // libs
    'react',
    'morearty',
    // mixins
    'mixins/sync/sync-layer'
], function (
    React,
    Morearty,
    // mixins
    SyncLayerMixin
    ) {
    'use strict';

    return React.createClass({
        _serviceId: 'devices',
        mixins: [Morearty.Mixin, SyncLayerMixin],
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                item = binding.val(),
                title = item.get('metrics').title,
                level = item.get('metrics').level;

            return (
                _.div({className: 'content'},
                    _.span({className: 'title-container'}, title),
                    _.div({className: 'colors-container just-hidden'},
                        _.div({className: 'picker'})
                    ),
                    _.a({href: '#', className: level.toLowerCase() === 'on' ? 'action active' : 'active', title: level.toUpperCase()},
                        _.span({className: level.toLowerCase() === 'on' ? 'switch-door active' : 'switch-door'},
                            _.span({className: 'bubble'}),
                            _.span({className: 'text'}, level.toUpperCase())
                        )
                    )
                )
            )
        }
    });
});
