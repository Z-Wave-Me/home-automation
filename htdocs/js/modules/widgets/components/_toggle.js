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
            this.fetch({
                model: this.getDefaultBinding(),
                serviceId: 'devices'
            }, command);
            return false;
        },
        render: function () {
            var _ = React.DOM;

            return (
                _.div({className: 'content'},
                    _.span({className: 'title-metrics'}, this.getDefaultBinding().sub('mertics').val('title')),
                    _.span({className: 'switch-door bubble-door active', onClick: this.toggleSwitch.bind(null, 'on')},
                        _.span({className: 'bubble'})
                    )
                )
            );
        }
    });
});
