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
            return { device: this.getItem('devices') };
        },
        componentDidMount: function () {
            var that = this;
            that.getBinding('preferences').addListener('leftPanelItemSelectedId', function () {
                that.setState({device: that.getItem('devices')});
            });
        },
        preventDefault: function (e) {
            e.preventDefault();
        },
        handleFile: function(e) {
            this.preventDefault(e);

            var that = this,
                reader = new FileReader(),
                file = e.hasOwnProperty('dataTransfer') ? e.dataTransfer.files[0] : e.target.files[0];

            if (!Boolean(file)) {
                return false;
            }

            reader.onload = function(upload) {
                that.state.device.sub('metrics').set('icon', upload.target.result);
                that.forceUpdate();
            };

            reader.readAsDataURL(file);
        },
        handleClick: function () {
            this.refs.fileInput.getDOMNode().click();
        },
        render: function () {

            var that = this,
                cx = React.addons.classSet,
                preferencesBinding = that.getBinding('preferences'),
                dataBinding = that.getBinding('data'),
                _ = React.DOM,
                item = that.state.device,
                title = item.val('metrics').title,
                icon = item.val('metrics').icon,
                classes = cx({
                    'preview': true,
                    'placehold': !icon
                });

            return _.div({ className: 'model-component' },
                _.div({ className: 'form-data room adding-status clearfix' },
                    _.div({ key: 'form-id-input', className: 'data-group'},
                        _.span({className: 'label-item'}, 'deviceId'),
                        _.span({className: 'value-item'}, item.val('id'))
                    ),
                    _.div({ key: 'form-deviceType-input', className: 'data-group'},
                        _.span({className: 'label-item'}, 'deviceType'),
                        _.span({className: 'value-item'}, item.val('deviceType'))
                    ),
                    _.div({ key: 'form-name-input', className: 'form-group' },
                        _.label({ htmlFor: 'room-name', className: 'input-label'}, 'Name:'),
                        _.input({
                            onChange: Morearty.Callback.set(item.sub('metrics'), 'title'),
                            id: 'room-name',
                            className: 'input-value',
                            type: 'text',
                            placeholder: 'Name',
                            value: title
                        })
                    ),
                    _.div({ key: 'form-icon-input', className: 'form-group' },
                        _.label({ htmlFor: 'room-description', className: 'input-label'}, 'Icon:'),
                        _.div({ onDrop: this.handleFile, onDragOver: this.preventDefault, className: 'dropzone', onClick: this.handleClick},
                            _.div({className: 'pull-left text-container'},
                                _.span({ className: 'text-zone primary'}, _.strong({}, 'Drop file'), ' to upload'),
                                _.span({ className: 'text-zone secondary'}, '(or click)')
                            ),
                            _.div({className: classes, style: icon ? {'background-image': 'url(' + icon + ')'} : {}})
                        ),
                        _.input({ref: 'fileInput', className: 'hidden', type: 'file', onChange: this.handleFile})
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
                )
            );
        }
    });
});
