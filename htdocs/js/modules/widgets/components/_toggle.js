define([
    // libs
    'morearty',
    // mixins
    'mixins/sync/sync-layer'
], function (
    Morearty,
    sync_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, sync_layer_mixin],
        toggleSwitch: function (command) {
            this.fetch({serviceId: 'devices'}, command);
            return false;
        },
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                item = binding.val(),
                title = item.get('metrics').title;

            return (
                _.div({className: 'content'},
                    _.span({className: 'title-metrics'}, title),
                    _.span({className: 'switch-door bubble-door active', onClick: this.toggleSwitch.bind(null, 'on')},
                        _.span({className: 'bubble'})
                    )
                )
            )
        }
    });
});
