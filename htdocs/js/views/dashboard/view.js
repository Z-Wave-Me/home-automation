/* global: _, $, define */
define([
    "helpers/apis",
    "backbone",
    "text!templates/widgets/probe-small.html",
    "text!templates/widgets/fan-small.html",
    "text!templates/widgets/doorlock-small.html",
    "text!templates/widgets/complementary-small.html",
    "text!templates/widgets/thermostat-small.html",
    "text!templates/widgets/switch-small.html",
    'drags'
], function (Apis, Backbone, templateProbe, templateFan, templateDoorlock, templateComplementary, templateThermostat, templateSwitch) {
    'use strict';
    var DashboardView = Backbone.View.extend({
        el: '#devices-container',
        initialize: function () {
            _.bindAll(this, 'render', 'isExistWidget', 'renderWidget');
            var that = this;
            that.Devices = window.App.Devices;
            that.activeMode = false;

            that.listenTo(that.Devices, 'add change', function (model) {
                that.renderWidget(model);
            });

            that.listenTo(that.Devices, 'settings normal', function () {
                that.activeMode = !that.activeMode;
                that.$el.find('.widget-small').toggleClass('clear');
            });
        },
        render: function () {
            var that = this;
            if (that.Devices.length > 0) {
                that.$el.empty();
                that.Devices.each(function (device) {
                    that.renderWidget(device);
                });
            }
        },
        renderWidget: function (model) {
            var that = this;
            if (model.get('tags').indexOf('dashboard') === -1) {
                return;
            }
            if (model.get('deviceType') === "probe" || model.get('deviceType') === "battery") {
                that.renderProbe(model);
            } else if (model.get('deviceType') === "fan") {
                that.renderFan(model);
            } else if (model.get('deviceType') === "switchMultilevel") {
                that.renderMultilevel(model);
            } else if (model.get('deviceType') === "thermostat") {
                that.renderThermostat(model);
            } else if (model.get('deviceType') === "doorlock") {
                that.renderDoorlock(model);
            } else if (model.get('deviceType') === "switchBinary") {
                that.renderSwitch(model);
            } else {
                //log(model);
            }
            that.$el.find('.widget-small').off().drags({
                handle: '.border-widget',
                onMouseUp: function (offset, position) {
                    model.save({position: position});
                },
                container: '.widgets',
                containerType: 'parent'
            });
        },
        renderProbe: function (model) {
            var that = this,
                $ProbeTmp = $(_.template(templateProbe, model.toJSON()));

            $ProbeTmp.css(model.get('position'));

            if (that.activeMode) {
                $ProbeTmp.removeClass('clear');
            } else {
                $ProbeTmp.addClass('clear');
            }

            if (!that.isExistWidget(model.get('id'))) {
                that.$el.append($ProbeTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"]').replaceWith($ProbeTmp);
            }
        },
        renderFan: function (model) {
            var that = this,
                $FanTmp = $(_.template(templateFan, model.toJSON()));

            $FanTmp.css(model.get('position'));

            if (that.activeMode) {
                $FanTmp.removeClass('clear');
            } else {
                $FanTmp.addClass('clear');
            }

            $FanTmp.find(".select-field select").on('change', function () {

                var params = $(this).val() !== -1 ? {mode: $(this).val()} : {},
                    command = $(this).val() !== -1 ? 'setMode' : 'off';

                Apis.devices.command(model.get('id'), command, params, function (json) {
                    //log(json);
                });
            });

            if (!that.isExistWidget(model.get('id'))) {
                that.$el.append($FanTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"]').replaceWith($FanTmp);
            }
        },
        renderDoorlock: function (model) {
            var that = this,
                $DoorLockTmp = $(_.template(templateDoorlock, model.toJSON()));

            $DoorLockTmp.css(model.get('position'));

            if (that.activeMode) {
                $DoorLockTmp.removeClass('clear');
            } else {
                $DoorLockTmp.addClass('clear');
            }

            $DoorLockTmp.find('.action').on('click', function (e) {
                e.preventDefault();
                var $button = $(this),
                    command = !$button.hasClass('active') ? 'open' : 'closed';
                Apis.devices.command(model.get('id'), command, {}, function (json) {
                    //log(json);
                    $button
                        .toggleClass('active')
                        .attr('title', command.capitalize())
                        .children()
                        .toggleClass('active')
                        .find('.text')
                        .text(command.toUpperCase());
                });
            });
            if (!that.isExistWidget(model.get('id'))) {
                that.$el.append($DoorLockTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"]').replaceWith($DoorLockTmp);
            }
        },
        renderMultilevel: function (model) {
            var that = this,
                $ComplementaryTmp = $(_.template(templateComplementary, model.toJSON())),
                $range = $ComplementaryTmp.find('.input-range'),
                $progress =  $ComplementaryTmp.find('.progress-bar'),
                $text =  $ComplementaryTmp.find('.text');

            $ComplementaryTmp.css(model.get('position'));

            if (that.activeMode) {
                $ComplementaryTmp.removeClass('clear');
            } else {
                $ComplementaryTmp.addClass('clear');
            }

            $progress.on('mouseover', function () {
                $progress.toggleClass('hidden');
                $text.toggleClass('hidden');
                $range.toggleClass('hidden');
                $range.doVisibleRange();
            });

            $range.on('change', function () {
                $range.doVisibleRange();
            }).on('mouseout', function () {
                $text.toggleClass('hidden');
                $progress.val($range.val()).toggleClass('hidden');
                $range.toggleClass('hidden');
                Apis.devices.command(model.get('id'), 'exact', {level: $range.val()}, function (json) {
                    //log(json);
                });
            });

            if (!that.isExistWidget(model.get('id'))) {
                that.$el.append($ComplementaryTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"]').replaceWith($ComplementaryTmp);
            }
        },
        renderThermostat: function (model) {
            var that = this,
                $ThermostatTmp = $(_.template(templateThermostat, model.toJSON()));

            $ThermostatTmp.css(model.get('position'));

            if (that.activeMode) {
                $ThermostatTmp.removeClass('clear');
            } else {
                $ThermostatTmp.addClass('clear');
            }

            $ThermostatTmp.find(".select-field select").on('change', function () {

                var params = $(this).val() !== -1 ? {mode: $(this).val()} : {},
                    command = $(this).val() !== -1 ? 'setMode' : 'off';

                Apis.devices.command(model.get('id'), command, params, function (json) {
                    //log(json);
                });
            });
            if (!that.isExistWidget(model.get('id'))) {
                that.$el.append($ThermostatTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"]').replaceWith($ThermostatTmp);
            }
        },
        renderSwitch: function (model) {
            var that = this,
                $SwitchTmp = $(_.template(templateSwitch, model.toJSON()));

            $SwitchTmp.css(model.get('position'));

            if (that.activeMode) {
                $SwitchTmp.removeClass('clear');
            } else {
                $SwitchTmp.addClass('clear');
            }

            $SwitchTmp.find('.action').on('click', function (e) {
                e.preventDefault();

                var $button = $(this),
                    command = !$button.hasClass('active') ? 'on' : 'off';

                Apis.devices.command(model.get('id'), command, {}, function () {
                    $button
                        .toggleClass('active')
                        .attr('title', command.capitalize())
                        .children()
                        .toggleClass('active')
                        .find('.text').text(command.toUpperCase());
                });
            });
            if (!that.isExistWidget(model.get('id'))) {
                that.$el.append($SwitchTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"]').replaceWith($SwitchTmp);
            }
        },
        isExistWidget: function (id) {
            return $('div[data-widget-id="' + id + '"]').exists();
        }
    });

    return DashboardView;
});