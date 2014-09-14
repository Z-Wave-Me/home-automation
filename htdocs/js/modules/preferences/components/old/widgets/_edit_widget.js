define([
    // libs
    '../../../../../../bower_components/react/react-with-addons',
    'morearty',
    // components
    '../common/_buttons_group',
    '../common/_inline_input',
    'mixins/data/data-layer'
], function (
    // libs
    React,
    Morearty,
    // components
    _buttons_group,
    _inline_input,
    // mixins
    data_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, data_layer_mixin],
        componentWillMount: function () {
            this._item = this.getItem('locations');
        },
        handleSubmit: function() {
            return false;
        },
        handleFile: function(e) {
            var that = this,
                reader = new FileReader(),
                file = e.target.files[0];

            reader.onload = function(upload) {
                that._item.update(function (item) {
                    item.set('icon', upload.target.result);
                    item.set('_state', 'modified');

                    return item;
                });
            }.bind(this);

            reader.readAsDataURL(file);
        },
        render: function () {
            var that = this,
                item = that._item,
                preferencesBinding = that.getBinding('preferences'),
                dataBinding = that.getBinding('data'),
                _ = React.DOM,
                title, icon;

            title = item.get('name');
            icon = item.get('icon');

            return _.div({ className: 'form-data profile adding-status clearfix' },
                _.div({ key: 'form-name-input', className: 'form-group' },
                    _.label({ htmlFor: 'profile-name', className: 'input-label'}, 'Name'),
                    _.input({
                        onChange: Morearty.Callback.set(item, 'name'),
                        id: 'profile-name',
                        className: 'input-value',
                        type: 'text',
                        placeholder: 'Name',
                        value: title
                    })
                ),
                _.div({ key: 'form-icon-input', className: 'form-group' },
                    _.label({ htmlFor: 'profile-description', className: 'input-label'}, 'Name'),
                    _.form({ onSubmit: this.handleSubmit, encType: 'multipart/form-data'},
                        _.input({type: 'file', onChange: this.handleFile}),
                        _.input({type: 'submit'})
                    )
                ),
                /*
                _inline_input({
                    binding: {
                        default: preferencesBinding,
                        item: item,
                        items: dataBinding.sub('devices')
                    },
                    sourceId: 'devices',
                    destinationId: 'locations'
                }),
                */
                _buttons_group({
                    binding: {
                        default: preferencesBinding,
                        item: item,
                        items: dataBinding.sub('locations')
                    }
                })
            );
        }
    });
});
