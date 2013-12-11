/* global: _, $, define */
define([
    "helpers/apis",
    "backbone",
    "text!templates/widgets/probe-small.html",
    "text!templates/widgets/fan-small.html",
    "text!templates/widgets/doorlock-small.html",
    "text!templates/widgets/complementary-small.html",
    "text!templates/widgets/thermostat-small.html",
    "text!templates/widgets/switch-small.html"
], function (Apis, Backbone, templateProbe, templateFan, templateDoorlock, templateComplementary, templateThermostat, templateSwitch) {
    'use strict';
    var DashboardView = Backbone.View.extend({
        el: '.widgets',
        initialize: function () {
            _.bindAll(this, 'render', 'isExistWidget');

            var that = this;
            that.Devices = window.App.Devices;

            that.listenTo(that.Devices, 'add change sync', function (model) {
                that.renderWidget(model);
            });

            setInterval(function () {
                that.Devices.fetch({
                    remove: false,
                    merge: true
                });
            }, 1000);
        },
        render: function () {
            var that = this;
            that.Devices.fetch({
                remove: false,
                merge: true
            });
        },
        renderWidget: function (model) {
            var that = this;
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
                log(model);
            }
        },
        renderProbe: function (model) {
            var that = this,
                $ProbeTmp = $(_.template(templateProbe, model.toJSON()));
            if (!that.isExistWidget(model.get('id'))) {
                that.$el.append($ProbeTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"]').replaceWith($ProbeTmp);
            }
        },
        renderFan: function (model) {
            var that = this,
                $FanTmp = $(_.template(templateFan, model.toJSON()));

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

            $DoorLockTmp.find('.action').on('click', function (e) {
                e.preventDefault();
                var $button = $(this),
                    command = !$button.hasClass('active') ? 'open' : 'closed';
                Apis.devices.command(model.get('id'), command, {}, function (json) {
                    //log(json);
                    $button
                        .toggleClass('active')
                        .attr('title', capitaliseFirstLetter(command))
                        .children()
                        .toggleClass('active')
                        .find('.text').text(command.toUpperCase());
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

            $SwitchTmp.find('.action').on('click', function (e) {
                e.preventDefault();

                var $button = $(this),
                    command = !$button.hasClass('active') ? 'on' : 'off';

                Apis.devices.command(model.get('id'), command, {}, function () {
                    $button
                        .toggleClass('active')
                        .attr('title', capitaliseFirstLetter(command))
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