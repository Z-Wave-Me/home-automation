define([
    // libs
    'react',
    'morearty',
    // mixins
    './../../mixins/base_mixin',
    'mixins/sync/sync-layer',
    'mixins/data/data-layer'
], function (
    // libs
    React,
    Morearty,
    // mixins
    base_mixin,
    sync_layer_mixin,
    data_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin, sync_layer_mixin, data_layer_mixin],
        save: function () {
            var Immutable = this.getMoreartyContext().Immutable,
                binding = this.getDefaultBinding(),
                itemBinding = this.getBinding('item'),
                itemsBinding = this.getBinding('items'),
                adding = binding.val('activeNodeTreeStatus') === 'adding';

            itemsBinding.update(function (items) {
               return items.push(Immutable.Map(itemBinding.val().toJS()));
            });

            this.setActiveNodeTreeStatus('normal');
            this.setLeftPanelItemSelectedId(itemBinding.val().get('id'));
        },
        getButtons: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding();

            if (binding.val('activeNodeTreeStatus') === 'editing' || binding.val('activeNodeTreeStatus') === 'adding') {
                return [
                    _.button({
                        key: 'save-button',
                        className: 'save-button button action',
                        onClick: this.save
                    }, 'Save'),
                    _.button({
                        key: 'cancel-button',
                        className: 'cancel-button button action',
                        onClick: this.setActiveNodeTreeStatus.bind(null, 'normal')
                    }, 'Cancel')
                ];
            } else {
                return _.button({
                    key: 'edit-button',
                    className: 'edit-button button action',
                    onClick: this.setActiveNodeTreeStatus.bind(null, 'editing')
                }, 'Edit');
            }
        },
        render: function () {
            var _ = React.DOM;

            return _.div({ className: 'buttons-group'},
                this.getButtons()
            );
        }
    });
});
