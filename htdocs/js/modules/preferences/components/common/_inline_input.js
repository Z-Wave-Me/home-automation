define([
    // libs
'morearty',
    // components
    'mixins/data/data-layer'
], function (
    // libs
    Morearty,
    // mixins
    data_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, data_layer_mixin],
        componentWillMount: function () {
            this._labels = this.getLabels();
        },
        getLabels: function () {
            var that = this,
                sourceId = that.props.sourceId,
                destinationId = that.props.destinationId,
                itemBinding = that.getBinding('item'),
                itemsBinding = that.getBinding('items'),
                availableIds,
                currentIds;

            if (sourceId === 'devices' && destinationId === 'locations') {
                var location = itemBinding,
                    devices = itemsBinding;

                currentIds = devices.val().toArray().filter(function (device) {
                    return device.get('location') === location.get('id');
                }).map(function (device) {
                    return device.get('id');
                });

                availableIds = devices.val().toArray().filter(function (device) {
                    return currentIds.indexOf(device.get('id')) === -1;
                }).map(function (device) {
                    return device.get('id');
                });

                return {
                    available: availableIds,
                    current: currentIds
                }
            }
        },
        render: function () {
            var that = this,
                _ = React.DOM;

            return _.div({ key: 'form-device-input', className: 'form-group' },
                _.div({ className: 'tagsinput'},
                    this._labels.available.map(function (label) {
                        return _.span({ key: label, className: 'tag label label-info'}, label,
                            _.span({ className: 'tag-remove'})
                        )
                    }),
                    _.input({ className: 'text-input', placeholder: 'deviceId'})
                )
            );
        }
    });
});
