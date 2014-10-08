define([
    // libs
'morearty',
    // mixins
    '../../mixins/base_mixin',
    'mixins/sync/sync-layer',
    'mixins/data/data-layer'
], function (
    // libs
    Morearty,
    // mixins
    base_mixin,
    sync_layer_mixin,
    data_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin, sync_layer_mixin, data_layer_mixin],
        displayName: '_buttons_group',
        getInitialState: function () {
            return { loading: false };
        },
        saveHandler: function () {
            var that = this,
                item = this.getBinding('item'),
                items = this.getBinding('items'),
                isNew = !Boolean(item.val('id'));

            if (this.isMounted()) {
                this.setState({ loading: true });
            }

            that.save({
                model: item,
                collection: items,
                serviceId: this.props.serviceId,
                success: function (model, response) {
                    var index = that._getIndexModelFromCollection(response.id, that.props.serviceId);

                    if (index === -1) {
                        that._addModel(response, that.props.serviceId);
                        that.setLeftPanelItemSelectedId(model.val('id'));
                    } else {
                        that._updateModel(response, that.props.serviceId);
                    }

                    that.setActiveNodeTreeStatus('normal');

                    if (that.isMounted()) {
                        that.setState({ loading: false });
                    }
                }
            });

            return false;
        },
        removeHandler: function () {
            var that = this,
                item = that.getBinding('item'),
                items = that.getBinding('items'),
                index = items.val().indexOf(item.val()),
                selected_index;

            if (index > 0) {
                selected_index = index - 1;
            } else if (items.val().length === 1) {
                selected_index = null;
            } else {
                selected_index = index + 1;
            }

            that.remove({
                model: that.getBinding('item'),
                collection: that.getBinding('items'),
                serviceId: that.props.serviceId,
                success: function () {
                    that.getBinding('item').delete();
                    if (that.isMounted()) {
                        if (selected_index !== null) {
                            that.setLeftPanelItemSelectedId(items.sub(selected_index).val('id'));
                            that.setActiveNodeTreeStatus('normal');
                        } else {
                            that.setActiveNodeTreeStatus('empty');
                        }

                        that.setState({ loading: false });
                        that.forceUpdate();
                    }
                }
            })
        },
        getButtons: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding();

            if (binding.val('activeNodeTreeStatus') === 'add') {
                return [
                    _.div({
                        key: 'save-button',
                        className: 'modern-button green-mode center',
                        onClick: this.saveHandler }, 'Create',
                        this.state.loading ? _.div({ className: 'spinner' }) : null
                    ),
                    _.div({
                        key: 'cancel-button',
                        className: 'modern-button light-mode center',
                        onClick: this.setActiveNodeTreeStatus.bind(null, 'normal')
                    }, 'Cancel')
                ];
            } else if (binding.val('activeNodeTreeStatus') === 'pending') {
                return [
                    _.div({
                        key: 'yes-button',
                        className: 'modern-button red-mode center',
                        onClick: this.removeHandler
                    }, 'Yes'),
                    _.div({
                        key: 'cancel-button',
                        className: 'modern-button light-mode center',
                        onClick: this.setActiveNodeTreeStatus.bind(null, 'normal')
                    }, 'No')
                ];
            } else {
                return [
                    _.div({
                        key: 'save-button',
                        className: 'modern-button green-mode center',
                        onClick: this.saveHandler
                    }, 'Save',
                        this.state.loading ? _.div({ className: 'spinner' }) : null
                    ),
                    _.div({
                        key: 'delete-button',
                        className: 'modern-button red-mode center',
                        onClick: this.setActiveNodeTreeStatus.bind(null, 'pending')
                    }, 'Delete')
                ];
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
