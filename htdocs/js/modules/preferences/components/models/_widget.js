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
        mixins: [Morearty.Mixin, sync_layer_mixin, data_layer_mixin],
        displayName: '_widget',
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
                that.props.model.sub('metrics').set('icon', upload.target.result);
                that.forceUpdate();
            };

            reader.readAsDataURL(file);
        },
        handleClick: function () {
            this.refs.fileInput.getDOMNode().click();
        },
        showInDashboardHandler: function (event) {
            var showInDashboard = event.target.checked,
                activeProfile = this.getActiveProfile(),
                deviceId = this.getBinding('item').val('id')

            if (activeProfile) {
                if (showInDashboard) {
                    activeProfile.update('positions', function (positions) {
                        return positions.push(deviceId)
                    });
                } else {
                    activeProfile.update('positions', function (positions) {
                        return positions.filter(function (id) {
                            return deviceId !== id;
                        }).toVector();
                    });
                }

                this.save({
                    model: activeProfile,
                    serviceId: 'profiles'
                });

                if (this.isMounted()) {
                    this.forceUpdate();
                }
            }
            return false;
        },
        PermanentlyHiddenHandler: function (event) {
            var permanently_hidden = event.target.checked;

            this.getBinding('item').set('permanently_hidden', permanently_hidden);

            this.save({
                model: this.getBinding('item'),
                serviceId: 'devices'
            });

            if (this.isMounted()) {
                this.forceUpdate();
            }

            return false;
        },
        render: function () {
            var that = this,
                cx = React.addons.classSet,
                preferencesBinding = that.getBinding('preferences'),
                dataBinding = that.getBinding('data'),
                _ = React.DOM,
                item = that.getBinding('item'),
                id = item.val('id'),
                title = id ? item.sub('metrics').val('title') : null,
                icon = id ? item.sub('metrics').val('icon') : null,
                deviceType = item.val('deviceType'),
                creatorId = item.val('creatorId'),
                creatorIndex = creatorId ? this._getIndexModelFromCollection(creatorId, 'instances') : null,
                temp_string = preferencesBinding.val('temp_string'),
                current_tags = item.val('tags'),
                classes = cx({
                    'preview': true,
                    'placehold': !icon
                }),
                classes_input_autocomplete = cx({
                    'text-input-autocomplete': true,
                    'focus': temp_string.length > 1
                });;


            return _.div({ className: 'model-component' },
                _.div({ className: 'form-data widget-form adding-status clearfix' },
                    _.div({ key: 'form-id-input', className: 'data-group'},
                        _.span({className: 'label-item'}, 'deviceId'),
                        _.span({className: 'value-item'}, id)
                    ),
                    _.div({ key: 'form-deviceType-input', className: 'data-group'},
                        _.span({className: 'label-item'}, 'deviceType'),
                        _.span({className: 'value-item'}, item.val('deviceType'))
                    ),
                    creatorIndex !== -1 ? _.div({ key: 'form-creatorId-input', className: 'data-group'},
                        _.span({className: 'label-item'}, 'creatorId'),
                        _.span({className: 'value-item'}, (dataBinding.sub('instances').sub(creatorIndex).val('title') || '') + ' [' + creatorId + ']')
                    ) : null,
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
                    _.div({ key: 'form-device-input', className: 'form-group' },
                        _.div({ className: 'tagsinput'},
                            current_tags.map(function (label) {
                                return _.span({ key: label, className: 'tag label label-info'}, label,
                                    _.span({
                                        className: 'tag-remove',
                                        onClick: that.removeTagHandler.bind(null, label)
                                    })
                                );
                            }).toArray()
                        ),
                        _.input({
                            className: classes_input_autocomplete,
                            placeholder: 'Device name',
                            onChange: Morearty.Callback.set(preferencesBinding, 'temp_string'),
                            onKeyPress: Morearty.Callback.onEnter(this.onAddNewTagHandler),
                            value: temp_string
                        }),
                        temp_string.length > 1 ? _.div({className: 'autocomplete-box autocomplete-device'},
                            _.button({
                                className: 'close-button',
                                onClick: that.onBlurHandler
                            }, '✖'),
                            _.ul({className: 'result-list'},
                                that.getTagsAvailable()
                            )
                        ) : null
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
                    _.label({className: 'switch-container'},
                        _.input({
                                className: 'ios-switch green',
                                type: 'checkbox',
                                checked: this.showInDashBoard(id),
                                onChange: this.showInDashboardHandler
                            },
                            _.div({},
                                _.div({className: 'bubble-switch'})
                            )
                        ),
                        'Show in dashboard'
                    ),
                    _.label({className: 'switch-container'},
                        _.input({
                                className: 'ios-switch green',
                                type: 'checkbox',
                                checked: item.val('permanently_hidden'),
                                onChange: this.PermanentlyHiddenHandler
                            },
                            _.div({},
                                _.div({className: 'bubble-switch'})
                            )
                        ),
                        'Permanently hidden'
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
                            items: dataBinding.sub('devices')
                        },
                        model: item,
                        serviceId: this.props.serviceId
                    })
                )
            );
        },
        getTagsAvailable: function () {
            var that = this,
                _ = React.DOM,
                item_binding = that.getBinding('item'),
                current_tags = item_binding.val('tags'),
                available_tags = that.getBinding('data').sub('deviceTags').val().filter(function (t) {
                    return current_tags.indexOf(t) === -1;
                }),
                temp_string = that.getBinding('preferences').val('temp_string').toLowerCase(),
                filtered_tags = available_tags.filter(function (tag) {
                    return temp_string.length > 1 ? tag.toLowerCase().indexOf(temp_string) !== -1 : true;
                });

            if (filtered_tags.toArray().length > 0) {
                return _.li({className: 'result-dept'},
                    _.ul({className: 'result-sub'},
                        filtered_tags.map(function (tag, index) {
                            return _.li({
                                    key: 'device-autocomplete-' + index,
                                    className: 'result-item',
                                    onClick: that.addTagHandler.bind(null, tag)
                                },
                                _.strong({ className: 'strong-deviceId' }, tag)
                            );
                        }).toArray()
                    )
                );
            } else {
                return _.li({className: 'result-dept'},
                    _.div({className: 'result-label no-matches'}, 'no matches')
                );
            }
        },
        onAddNewTagHandler: function (event) {
            var tag = event.target.value,
                item_binding = this.getBinding('item');

            item_binding.update('tags', function (tags) {
                if (tags.indexOf(tag) === -1) {
                    return tags.push(tag);
                } else {
                    return tags;
                }
            });

            this.getBinding('preferences').set('temp_string', '');
        },
        addTagHandler: function (tag) {
            var item_binding = this.getBinding('item');

            item_binding.update('tags', function (tags) {
                if (tags.indexOf(tag) === -1) {
                    return tags.push(tag);
                } else {
                    return tags;
                }
            });

            return false;
        },
        removeTagHandler: function (label) {
            var item_binding = this.getBinding('item');

            item_binding.update('tags', function (tags) {
               return tags.filter(function (tag) {
                   return tag !== label;
               })
            });

            return false;
        },
        onBlurHandler: function () {
            this.getBinding('preferences').set('temp_string', '');
            return false;
        }
    });
});
