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
                    _.div({
                        key: 'save-button',
                        className: 'modern-button green-mode center',
                        onClick: this.save
                    }, 'Save'),
                    _.div({
                        key: 'cancel-button',
                        className: 'modern-button light-mode center',
                        onClick: this.setActiveNodeTreeStatus.bind(null, 'normal')
                    }, 'Cancel')
                ];
            } else {
                return [
                    _.div({
                        key: 'edit-button',
                        className: 'modern-button dark-mode center',
                        onClick: this.setActiveNodeTreeStatus.bind(null, 'editing')
                    }, 'Edit'),
                    _.div({
                        key: 'delete-button',
                        className: 'modern-button red-mode center',
                        onClick: this.delete
                    }, 'Delete')
                ]
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
