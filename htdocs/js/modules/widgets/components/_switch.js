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
        toggleSwitch: function () {
            var that = this,
                binding = this.getDefaultBinding(),
                metrics = binding.sub('metrics').val(),
                command = binding.sub('metrics').val().level === 'on' ? 'off' : 'on';

            metrics.level = command;

            that.fetch({
                success: function () {
                    binding.atomically()
                        .set('metrics', metrics)
                        .commit();
                    that.forceUpdate();
                }
            }, command);

            return false;
        },
        render: function () {
            var _ = React.DOM,
                cx = React.addons.classSet,
                binding = this.getDefaultBinding(),
                title = binding.val().get('metrics').title,
                level = binding.val().get('metrics').level,
                classes = cx({
                    switch: true,
                    active: binding.val().get('metrics').level === 'on'
                });


            return (
                _.div({className: 'content'},
                    _.span({className: 'title-container'}, title),
                    _.div({className: 'colors-container just-hidden'},
                        _.div({className: 'picker'})
                    ),
                    _.span({onClick: this.toggleSwitch, className: classes},
                        _.span({className: 'bubble'}),
                        _.span({className: 'text'}, level.toUpperCase())
                    )
                )
            )
        }
    });
});
