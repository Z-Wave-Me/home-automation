define([
    // libs
'morearty',
    // components
    './_probe',
    './_switch',
    './_multilevel',
    './_control',
    './_camera',
    './_toggle'
], function (
    // libs
    Morearty,
    // components
    Probe,
    Switch,
    Multilevel,
    Control,
    Camera,
    Toggle
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                metrics_binding = binding.sub('metrics'),
                device_type = binding.val('deviceType'),
                icon = metrics_binding.val('icon') || null,
                custom_icon = icon !== null ? icon.indexOf('http:') !== -1 : false,
                cx = React.addons.classSet,
                widget_classes = cx({
                    'widget-object': true,
                    show: true,
                    clear: true,
                    'widget-small': device_type !== 'camera',
                    widget: device_type === 'camera'
                }) + ' ' + device_type,
                icon_classes = cx({
                    customIcon: custom_icon,
                    'icon-base': !custom_icon
                }),
                styles = custom_icon ?
                    {
                        'background-image': 'url(' + icon + ')'
                    } : null,
                Widget;

            if (device_type === "sensorBinary" ||
                device_type === "sensorMultilevel" ||
                device_type === "battery") {
                Widget = Probe;
            } else if (device_type === "fan") {
                Widget = Probe;
            } else if (device_type === "switchMultilevel") {
                Widget = Multilevel;
            } else if (device_type === "thermostat") {
                Widget = Probe;
            } else if (device_type === "switchBinary" || device_type === "switchRGBW" || device_type === "doorlock") {
                Widget = Switch;
            } else if (device_type === "toggleButton") {
                Widget = Toggle;
            } else if (device_type === "camera") {
                Widget = Camera;
            } else if (device_type === "switchControl") {
                Widget = Control;
            } else {
                //Widget = new Probe(Ctx);
            }

            //sensorMultilevel widget-small widget-object show clear

            return (
                _.div({id: binding.val('id'), className: widget_classes},
                    _.div({className: 'border-widget border-widget-sprite small-border'},
                        _.span({className: 'selection-button border-widget-sprite button-select-border'})
                    ),
                        _.div({className: 'content-widget'},
                        device_type !== 'camera' ?  _.div({className: 'container-icon'},
                            _.div({className: icon_classes, style: styles})
                        ) : null,
                        Widget({
                            binding: {
                                default: binding
                            }
                        })
                    )
                )
            );
        }
    });
});
