define([
    // libs
    'backbone',
    // components
    './_probe',
    './_switch',
    './_multilevel',
    './_control',
    './_door'
], function (
    // libs
    Backbone,
    Probe,
    Switch,
    Multilevel,
    Control,
    Door
    ) {
    'use strict';

    return Backbone.View.extend({
        initialize: function (options, context) {
            _.bindAll(this, '_createClass', 'getClass');
            var that = this;

            _.extend(that, {
                options: _.extend({}, options || {}),
                Ctx: context
            });

            that._createClass();
        },
        getClass: function (state) {
            return this.MoreartyClass(state);
        },
        _createClass: function () {
            var that = this;

            that.MoreartyClass = that.Ctx.createClass({
                render: function () {
                    var _ = that.Ctx.React.DOM,
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
                        Widget = new Probe(that.Ctx);
                    } else if (item.get('deviceType') === "fan") {
                        Widget = new Probe(that.Ctx);
                    } else if (item.get('deviceType') === "switchMultilevel") {
                        Widget = new Multilevel(that.Ctx);
                    } else if (item.get('deviceType') === "thermostat") {
                        Widget = new Probe(that.Ctx);
                    } else if (item.get('deviceType') === "doorlock") {
                        Widget = new Door(that.Ctx);
                    } else if (item.get('deviceType') === "switchBinary" || item.get('deviceType') === "switchRGBW") {
                        Widget = new Switch(that.Ctx);
                    } else if (item.get('deviceType') === "toggleButton") {
                        Widget = new Probe(that.Ctx);
                    } else if (item.get('deviceType') === "camera") {
                        Widget = new Probe(that.Ctx);
                        widgetSize = 'widget';
                    } else if (item.get('deviceType') === "switchControl") {
                        Widget = new Control(that.Ctx);
                    } else {
                        //Widget = new Probe(that.Ctx);
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
});
