define([
    // libs
    'react',
    'morearty',
    // components
    './_probe',
    './_switch',
    './_multilevel',
    './_control'
], function (
    // libs
    React,
    Morearty,
    // components
    Probe,
    Switch,
    Multilevel,
    Control,
    Door
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                item = binding.val(),
                iconClass,
                cssClasses = [],
                styles,
                widgetSize = 'widget-small',
                Widget;

            if (item.get('metrics').icon.indexOf('http') !== -1) {
                iconClass = 'customIcon';
                styles = {'background-image': 'url(' + item.get('metrics').icon + ')'};
            } else {
                cssClasses.push('icon-base');
                cssClasses.push(item.get('metrics').icon);

                if (item.get('deviceType') !== item.get('metrics').icon) {
                    cssClasses.push(item.get('deviceType'));
                }

                iconClass = cssClasses.join(' ');
            }

            if (item.get('id').indexOf('Remote') !== -1) {
                return null;
            }

            if (item.get('deviceType') === "sensorBinary" ||
                item.get('deviceType') === "sensorMultilevel" ||
                item.get('deviceType') === "battery") {
                Widget = Probe;
            } else if (item.get('deviceType') === "fan") {
                Widget = Probe;
            } else if (item.get('deviceType') === "switchMultilevel") {
                Widget = Multilevel;
            } else if (item.get('deviceType') === "thermostat") {
                Widget = Probe;
            } else if (item.get('deviceType') === "switchBinary" || item.get('deviceType') === "switchRGBW" || item.get('deviceType') === "doorlock") {
                Widget = Switch;
            } else if (item.get('deviceType') === "toggleButton") {
                Widget = Probe;
            } else if (item.get('deviceType') === "camera") {
                Widget = Probe;
                widgetSize = 'widget';
            } else if (item.get('deviceType') === "switchControl") {
                Widget = Control;
            } else {
                //Widget = new Probe(Ctx);
            }

            return (
                _.div({id: item.get('id'), className: item.get('deviceType') + ' ' + widgetSize + ' widget-object show clear'},
                    _.div({className: 'border-widget border-widget-sprite small-border'},
                        _.span({className: 'selection-button border-widget-sprite button-select-border'})
                    ),
                    _.div({className: 'content-widget'},
                        _.div({className: 'container-icon'},
                            _.div({className: iconClass, style: styles})
                        ),
                        Widget({binding: binding})
                    )
                )
            );
        }
    });
});
