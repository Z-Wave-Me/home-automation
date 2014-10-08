define([
    // libs
'morearty',
    // components
    '../common/_buttons_group',
    '../common/_inline_input',
    'mixins/data/data-layer',
    'mixins/sync/sync-layer'
], function (
    // libs
    Morearty,
    // components
    _buttons_group,
    _inline_input,
    // mixins
    data_layer_mixin,
    sync_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, data_layer_mixin, sync_layer_mixin],
        isplayName: '_room',
        componentWillMount: function () {
            var that = this,
                preferences_binding = that.getBinding('preferences');

            preferences_binding.addListener('activeNodeTreeStatus', function () {
                if (that.isMounted()) {
                    that.forceUpdate();
                }
            });
            preferences_binding.set('temp_string', '');
        },
        componentWillUnmount: function () {
            this.getBinding('preferences').delete('temp_string')
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
                that.props.model.set('icon', upload.target.result);
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
                add_mode = preferencesBinding.val('activeNodeTreeStatus') === 'add',
                item = that.getBinding('item'),
                title = item.val('title'),
                icon = item.val('icon'),
                temp_string = that.getBinding('preferences').val('temp_string'),
                classes = cx({
                    'preview': true,
                    'placehold': !icon
                }),
                classes_input_autocomplete = cx({
                    'text-input-autocomplete': true,
                    'focus': temp_string.length > 1
                });

            return _.div({ className: 'model-component' },
                _.div({ className: 'form-data room clearfix' },
                    _.div({ key: 'form-name-input', className: 'form-group' },
                        _.label({ htmlFor: 'room-name', className: 'input-label'}, 'Name:'),
                        _.input({
                            onChange: Morearty.Callback.set(item, 'title'),
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
                    !add_mode ? _.div({ key: 'form-device-input', className: 'form-group' },
                        _.div({ className: 'tagsinput'},
                            dataBinding.sub('devices').val().filter(function (device) {
                                return device.get('location') === item.val('id');
                            }).map(function (device) {
                                return _.span({ key: device.get('id'), className: 'tag label label-info'}, device.get('id'),
                                    _.span({
                                        className: 'tag-remove',
                                        onClick: that.removeTagHandler.bind(null, device.get('id'))
                                    })
                                );
                            }).toArray()
                        ),
                        _.input({
                            className: classes_input_autocomplete,
                            placeholder: 'Device name',
                            onChange: Morearty.Callback.set(preferencesBinding, 'temp_string'),
                            value: temp_string
                        }),
                            temp_string.length > 1 ? _.div({className: 'autocomplete-box autocomplete-device'},
                            _.button({
                                className: 'close-button',
                                onClick: that.onBlurHandler
                            }, '✖'),
                            _.ul({className: 'result-list'},
                                that.getDevicesAvailable()
                            )
                        ) : null
                    ) : null,
                    _buttons_group({
                        binding: {
                            default: preferencesBinding,
                            item: item,
                            items: dataBinding.sub('locations')
                        },
                        model: item,
                        serviceId: this.props.serviceId
                    })
                )
            );
        },
        getDevicesAvailable: function () {
            var that = this,
                _ = React.DOM,
                devices_binding = that.getBinding('data').sub('devices'),
                item_binding = that.getBinding('item'),
                temp_string = that.getBinding('preferences').val('temp_string'),
                filtered_devices = devices_binding.val().filter(function (device) {
                    return item_binding.val('id') !== device.get('location') &&
                        device.get('metrics').title.toLowerCase().indexOf(temp_string.toLowerCase()) !== -1;
                }),
                deviceTypes = Sticky.get('App.Helpers.JS').arrayUnique(filtered_devices.map(function (device) {
                    return device.get('deviceType');
                }));

            if (filtered_devices.toArray().length > 0) {
                return deviceTypes.map(function (type) {
                    return _.li({className: 'result-dept'},
                        _.div({className: 'result-label'}, type),
                        _.ul({className: 'result-sub'},
                            filtered_devices.filter(function (device) {
                                return device.get('deviceType') === type;
                            }).map(function (device) {
                                return _.li({
                                        key: 'device-autocomplete-' + device.get('id'),
                                        className: 'result-item',
                                        onClick: that.addTagHandler.bind(null, device.get('id'))
                                    },
                                    _.strong({ className: 'strong-deviceId' }, '[' + device.get('id') + '] '),  device.get('metrics').title
                                );
                            }).toArray()
                        )
                    )
                });
            } else {
                return _.li({className: 'result-dept'},
                    _.div({className: 'result-label no-matches'}, 'no matches')
                );
            }
        },
        addTagHandler: function (deviceId) {
            var that = this,
                device_binding = that.getModelFromCollection(deviceId, 'devices'),
                item_binding = that.getBinding('item');

            device_binding.set('location', item_binding.val('id'));

            that.save({
                model: device_binding,
                collection: this.getBinding('data').sub('devices'),
                serviceId: 'devices'
            });

            that.forceUpdate();
            return false;
        },
        removeTagHandler: function (deviceId) {
            var that = this,
                device_binding = that.getModelFromCollection(deviceId, 'devices');

            device_binding.set('location', null);


            that.save({
                model: device_binding,
                collection: this.getBinding('data').sub('devices'),
                serviceId: 'devices'
            });

            that.forceUpdate();
            return false;
        },
        onBlurHandler: function () {
            this.getBinding('preferences').set('temp_string', '');
            this.forceUpdate();
            return false;
        }
    });
});
