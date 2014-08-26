define([
    // components
    './_probe',
    './_switch',
    './_multilevel',
    './_control',
    './_door'
], function (
    // components
    Probe,
    Switch,
    Multilevel,
    Control,
    Door
    ) {
    'use strict';

    return function (Ctx, _options) {
        var that = this,
            options = _options || {};

        return Ctx.createClass({
            render: function () {
                var _ = Ctx.React.DOM,
                    state = this.getState(),
                    item = state.val(),
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

                if (item.get('deviceType') === "sensorBinary" ||
                    item.get('deviceType') === "sensorMultilevel" ||
                    item.get('deviceType') === "battery") {
                    Widget = new Probe(Ctx);
                } else if (item.get('deviceType') === "fan") {
                    Widget = new Probe(Ctx);
                } else if (item.get('deviceType') === "switchMultilevel") {
                    Widget = new Multilevel(Ctx);
                } else if (item.get('deviceType') === "thermostat") {
                    Widget = new Probe(Ctx);
                } else if (item.get('deviceType') === "doorlock") {
                    Widget = new Door(Ctx);
                } else if (item.get('deviceType') === "switchBinary" || item.get('deviceType') === "switchRGBW") {
                    Widget = new Switch(Ctx);
                } else if (item.get('deviceType') === "toggleButton") {
                    Widget = new Probe(Ctx);
                } else if (item.get('deviceType') === "camera") {
                    Widget = new Probe(Ctx);
                    widgetSize = 'widget';
                } else if (item.get('deviceType') === "switchControl") {
                    Widget = new Control(Ctx);
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
                                Widget({state: state})
                            )
                        )
                    );
            }
        });
    }
});
