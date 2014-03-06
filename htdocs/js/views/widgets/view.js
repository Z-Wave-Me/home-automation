define([
    "helpers/apis",
    "backbone",
    "text!templates/widgets/probe-small.html",
    "text!templates/widgets/fan-small.html",
    "text!templates/widgets/doorlock-small.html",
    "text!templates/widgets/complementary-small.html",
    "text!templates/widgets/thermostat-small.html",
    "text!templates/widgets/switch-small.html",
    "text!templates/widgets/toggle-small.html"
], function (Apis, Backbone, templateProbe, templateFan, templateDoorlock, templateComplementary, templateThermostat, templateSwitch, templateToggle) {
    'use strict';
    var WidgetsView = Backbone.View.extend({
        el: '#devices-container',
        initialize: function () {
            _.bindAll(this, 'render', 'renderWidget', 'renderWidgets', 'setHideEvents');
            var that = this;
            that.Devices = window.App.Devices;
            that.Locations = window.App.Locations;

            that.listenTo(that.Locations, 'filter', function () {
                that.Devices.each(function (device) {
                    if (window.App.filters.locations) {
                        if (that.Locations.activeRoom === 'all' || that.Locations.activeRoom === device.get('location')) {
                            device.trigger('show');
                        } else {
                            device.trigger('hide');
                        }
                    }
                });
            });

            that.listenTo(that.Devices, 'filter', function () {
                that.Devices.each(function (device) {
                    if (window.App.filters.types) {
                        if (that.Devices.activeType === 'all' || that.Devices.activeType === device.get('deviceType')) {
                            device.trigger('show');
                        } else {
                            device.trigger('hide');
                        }
                    } else if (window.App.filters.tags) {
                        if (that.Devices.activeTag === 'all' || device.get('tags').indexOf(that.Devices.activeTag) !== -1) {
                            device.trigger('show');
                        } else {
                            device.trigger('hide');
                        }
                    }
                });
            });

            that.listenToOnce(that.Devices, 'sync', function () {
                that.renderWidgets();
            });
        },
        render: function () {
            var that = this;
            if (that.Devices.length > 0) {
                that.renderWidgets();
            }
        },
        renderWidgets: function () {
            var that = this;
            that.$el.empty();
            that.Devices.each(function (device) {
                if (device.get('deviceType') === "probe" || device.get('deviceType') === "battery") {
                    that.renderWidget(device, templateProbe);
                } else if (device.get('deviceType') === "fan") {
                    that.renderWidget(device, templateFan);
                } else if (device.get('deviceType') === "switchMultilevel") {
                    that.renderWidget(device, templateComplementary);
                } else if (device.get('deviceType') === "thermostat") {
                    that.renderWidget(device, templateThermostat);
                } else if (device.get('deviceType') === "doorlock") {
                    that.renderWidget(device, templateDoorlock);
                } else if (device.get('deviceType') === "switchBinary") {
                    that.renderWidget(device, templateSwitch);
                } else if (device.get('deviceType') === "toggleButton") {
                    that.renderWidget(device, templateToggle);
                }
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
            } else if (model.get('deviceType') === "toggleButton") {
                that.renderToggle(model);
            } else {
                //log(model);
            }
        },
        renderProbe: function (model) {
            var that = this,
                $ProbeTmp = $(_.template(templateProbe, model.toJSON()));

            that.setHideEvents($ProbeTmp, model);

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

            that.setHideEvents($FanTmp, model);

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

            that.setHideEvents($DoorLockTmp, model);

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

            that.setHideEvents($ComplementaryTmp, model);

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

            that.setHideEvents($ThermostatTmp, model);

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

            that.setHideEvents($SwitchTmp, model);

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
        renderToggle: function (model) {
            var that = this,
                $ToggleTmp = $(_.template(templateToggle, model.toJSON()));

            that.setHideEvents($ToggleTmp, model);

            if (that.activeMode) {
                $ToggleTmp.removeClass('clear');
            } else {
                $ToggleTmp.addClass('clear');
            }

            $ToggleTmp.find('.action').on('click', function (e) {
                e.preventDefault();

                var $button = $(this),
                    command = 'on';

                Apis.devices.command(model.get('id'), command, {}, function () {

                });
            });
            if (!that.isExistWidget(model.get('id'))) {
                that.$el.append($ToggleTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"]').replaceWith($ToggleTmp);
            }
        },
        setHideEvents: function ($template, device) {
            var that = this;
            that.listenTo(device, 'show', function () {
                $template.removeClass('show').addClass('show').show('fast');
            });

            that.listenTo(device, 'hide', function () {
                $template.removeClass('show').hide('fast');
            });
        },
        isExistWidget: function (id) {
            return $('div[data-widget-id="' + id + '"]').exists();
        }
    });

    return WidgetsView;
});