define([
    // libs
    'morearty',
    // mixins
    'mixins/sync/sync-layer',
    'mixins/ui/popup'
], function (
    // libs
    Morearty,
    // mixins
    _sync_layer_mixin,
    _ui_popup_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, _sync_layer_mixin, _ui_popup_mixin],
        getInitialState: function () {
            return {
                show: false,
                options: { // pair option - command
                    "hasZoomIn": {
                        command: 'zoomIn',
                        classes: 'command-button ui-icon ui-icon-circle-zoomin',
                        title: 'ZoomIn'
                    },
                    "hasZoomOut": {
                        command: 'zoomOut',
                        classes: 'command-button ui-icon ui-icon-circle-zoomout',
                        title: 'ZoomOut'
                    },
                    "hasLeft": {
                        command: 'left',
                        classes: 'command-button ui-icon ui-icon-circle-arrow-w',
                        title: 'Left'
                    },
                    "hasRight": {
                        command: 'right',
                        classes: 'command-button ui-icon ui-icon-circle-arrow-e',
                        title: 'Right'
                    },
                    "hasUp": {
                        command: 'up',
                        classes: 'command-button ui-icon ui-icon-circle-arrow-n',
                        title: 'Up'
                    },
                    "hasDown": {
                        command: 'down',
                        classes: 'command-button ui-icon ui-icon-circle-arrow-s',
                        title: 'Down'
                    },
                    "hasOpen": {
                        command: 'open',
                        classes: 'command-button ui-icon ui-icon-power',
                        title: 'Open'
                    },
                    "hasClose": {
                        command: 'close',
                        classes: 'command-button ui-icon ui-icon-circle-close',
                        title: 'Close'
                    }
                }
            };
        },
        sendCommandToServer: function (command) {
            this.fetch({
                serviceId: 'devices'
            }, command);
            return false;
        },
        getCommandsButton: function () {
            var that = this,
                _ = React.DOM,
                binding = this.getDefaultBinding(),
                item = binding.val(),
                options = that.state.options;

            return Object.keys(options).map(function (option) {
                if (item.get('metrics')[option]) {
                    return _.span({
                        key: option.command,
                        ref: option.command,
                        'data-command': options[option].command,
                        title: options[option].title,
                        className: options[option].classes,
                        onClick: that.sendCommandToServer.bind(null, options[option].command)
                    });
                } else {
                    return null;
                }
            });
        },
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                item = binding.val(),
                title = item.get('metrics').title,
                url = item.get('metrics').url;

            return (
                _.div({key: 'container-camera-' + item.get('id')},
                    _.div({key: 'control', className: 'control-block camera-block'},
                        _.span({ className: 'title-container'}, title),
                        _.div({className: 'control-buttons'},
                            this.getCommandsButton()
                        )
                    ),
                    _.div({key: 'view', className: 'view-block camera-block'},
                        _.img({
                            className: 'camera-image',
                            src: url,
                            onClick: this.toggleShowPopup
                        }),
                        _.span({className: 'camera-icon'})
                    ),
                    this.state.show ? _.div({
                            className: 'overlay transparent show fixed',
                            onClick: this.toggleShowPopup
                        },
                        _.div({className: 'popover popover-camera', onClick: this.stopPropagationAndPreventDefault},
                            _.div ({className: 'popover-content'},
                                _.div({className: 'image-container'},
                                    _.img({className: 'camera-image', src: url})
                                ),
                                _.div({className: 'control-container'},
                                    this.getCommandsButton()
                                )
                            )
                        )
                    ) : null
                )
            );
        }
    });
});
