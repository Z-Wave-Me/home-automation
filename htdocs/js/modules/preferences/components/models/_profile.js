define([
    // libs
    'react',
    'morearty',
    // components
    '../common/_buttons_group',
    // mixins
    'mixins/data/data-layer',
    'mixins/sync/sync-layer'
], function (
    // libs
    React,
    Morearty,
    // components
    _buttons_group,
    // mixins
    data_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, data_layer_mixin],
        setAsDefaultProfile: function (event) {
            this.getBinding('preferences').set('defaultProfileId', event.target.checked ? this.getBinding('item').val('id') : null);
            return false;
        },
        render: function () {
            var that = this,
                preferencesBinding = that.getBinding('preferences'),
                data_binding = that.getBinding('data'),
                item_binding = that.getBinding('item'),
                _ = React.DOM,
                default_profile_id = that.getBinding('preferences').val('defaultProfileId'),
                id = item_binding.val('id'),
                title = item_binding.val('name'),
                description = item_binding.val('description');

            return _.div({ className: 'model-component'},
                _.div({ className: 'form-data profile clearfix' },
                    _.div({ key: 'form-name-input', className: 'form-group' },
                        _.label({ htmlFor: 'profile-name', className: 'input-label'}, 'Name'),
                        _.input({
                            onChange: Morearty.Callback.set(item_binding, 'name'),
                            id: 'profile-name',
                            className: 'input-value',
                            type: 'text',
                            placeholder: 'Name',
                            autoFocus: true,
                            value: title
                        })
                    ),
                    _.div({ key: 'form-description-input', className: 'form-group' },
                        _.label({ htmlFor: 'profile-description', className: 'input-label'}, 'Description'),
                        _.textarea({
                            onChange: Morearty.Callback.set(item_binding, 'description'),
                            id: 'profile-description',
                            className: 'input-value textarea-type',
                            col: 3,
                            row: 3,
                            placeholder: 'Description',
                            value: description
                        })
                    ),
                    preferencesBinding.val('activeNodeTreeStatus') !== 'add' ? _.div({ key: 'form-default-profile-input', className: 'form-group' },
                        _.div({className: 'checkbox-group'},
                            _.input({
                                id: 'makeAsDefault',
                                className: 'checkbox-type',
                                type: 'checkbox',
                                name: 'makeAsDefault',
                                checked: String(default_profile_id) === String(id),
                                onChange: this.setAsDefaultProfile
                            }),
                            _.label({htmlFor: 'makeAsDefault', className: 'input-label'}, 'Make as default profile')
                        )
                    ) : null,
                    _buttons_group({
                        binding: {
                            default: preferencesBinding,
                            item: item_binding,
                            items: data_binding.sub('profiles')
                        },
                        serviceId: this.props.serviceId
                    })
                )
            );
        }
    });
});
