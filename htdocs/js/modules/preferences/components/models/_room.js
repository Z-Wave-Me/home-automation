define([
    // libs
    'react',
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
        getInitialState: function () {
            return { profile: this.getItem('locations') };
        },
        handleFile: function(e) {
            var that = this,
                reader = new FileReader(),
                file = e.target.files[0];

            reader.onload = function(upload) {
                that.state.profile.set('icon', String(upload.target.result));
                that.forceUpdate();
            };

            reader.readAsDataURL(file);
        },
        render: function () {
            var that = this,
                preferencesBinding = that.getBinding('preferences'),
                dataBinding = that.getBinding('data'),
                _ = React.DOM,
                item = that.state.profile,
                title = item.val('title'),
                icon = item.val('icon');

            return _.div({ className: 'model-component' },
                _.div({ className: 'form-data profile adding-status clearfix' },
                    _.div({ key: 'form-name-input', className: 'form-group' },
                        _.label({ htmlFor: 'profile-name', className: 'input-label'}, 'Name:'),
                        _.input({
                            onChange: Morearty.Callback.set(item, 'title'),
                            id: 'profile-name',
                            className: 'input-value',
                            type: 'text',
                            placeholder: 'Name',
                            value: title
                        })
                    ),
                    _.div({ key: 'form-icon-input', className: 'form-group' },
                        _.label({ htmlFor: 'profile-description', className: 'input-label'}, 'Icon:'),
                        _.div({ className: 'dropzone', onClick: this.handleClick},
                            _.div({className: 'pull-left text-container'},
                                _.span({ className: 'text-zone primary'}, _.strong({}, 'Drop file'), ' to upload'),
                                _.span({ className: 'text-zone secondary'}, '(or click)')
                            ),
                            _.div({className: 'preview', style: icon ? {'background-image': icon} : {}})
                        ),
                        _.input({ref: 'file-input', className: 'hidden', type: 'file', onChange: this.handleFile})
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
                            item: that.state.profile,
                            items: dataBinding.sub('locations')
                        }
                    })
                )
            );
        }
    });
});
