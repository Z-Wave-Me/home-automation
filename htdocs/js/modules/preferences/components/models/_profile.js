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
            this.getBinding('preferences').set('defaultProfileId', event.target.checked ? this.props.model.val('id') : null);
            return false;
        },
        render: function () {
            var that = this,
                preferencesBinding = that.getBinding('preferences'),
                dataBinding = that.getBinding('data'),
                itemBinding = that.getBinding('item'),
                _ = React.DOM,
                defaultProfileId = that.getBinding('preferences').val('defaultProfileId'),
                id = itemBinding.val('id'),
                title = itemBinding.val('name'),
                description = itemBinding.val('description');

            return _.div({ className: 'model-component'},
                _.div({ className: 'form-data profile clearfix' },
                    _.div({ key: 'form-name-input', className: 'form-group' },
                        _.label({ htmlFor: 'profile-name', className: 'input-label'}, 'Name'),
                        _.input({
                            onChange: Morearty.Callback.set(itemBinding, 'name'),
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
                            onChange: Morearty.Callback.set(itemBinding, 'description'),
                            id: 'profile-description',
                            className: 'input-value textarea-type',
                            col: 3,
                            row: 3,
                            placeholder: 'Description',
                            value: description
                        })
                    ),
                    _.div({ key: 'form-default-profile-input', className: 'form-group' },
                        _.div({className: 'checkbox-group'},
                            _.input({
                                id: 'makeAsDefault',
                                className: 'checkbox-type',
                                type: 'checkbox',
                                name: 'makeAsDefault',
                                checked: String(defaultProfileId) === String(id),
                                onChange: this.setAsDefaultProfile
                            }),
                            _.label({htmlFor: 'makeAsDefault', className: 'input-label'}, 'Make as default profile')
                        )
                    ),
                    _buttons_group({
                        binding: {
                            default: preferencesBinding,
                            item: itemBinding,
                            items: dataBinding.sub('profiles')
                        },
                        model: itemBinding,
                        serviceId: this.props.serviceId
                    })
                )
            );
        }
    });
});
