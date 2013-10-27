define([
    "app",
    "helpers/apis",
    "marionette",
    "collections/devices",
    "collections/events",
    "text!templates/widgets/probe-small.html",
    "text!templates/widgets/fan-small.html",
    "text!templates/widgets/doorlock-small.html",
    "text!templates/widgets/complementary-small.html",
    "text!templates/widgets/thermostat-small.html",
    "text!templates/widgets/switch-small.html"
], function(App, Apis, Marionette, Devices, Events, templateProbe, templateFan, templateDoorlock, templateComplementary, templateThermostat, templateSwitch){
    'use strict';
    var DashboardView = Marionette.View.extend({
        el: '#widgets-region.widgets',
        initialize: function(){
            _.bindAll(this, 'render', 'renderWidgets');
            var that = this
            that.Devices = new Devices();
            that.Events = new Events();

            that.Devices.on('sync', function(){
                that.renderWidgets(false);
            });

            that.Events.on('sync', function(){
                log(this)
            });

            that.Devices.on('change', function(model){
                that.renderWidget(model, true);
            });
        },
        render: function() {
            var that = this;
            that.Devices.fetch({update: true});
        },
        renderWidgets: function(replace) {
            var that = this;

            // Type: probe / SubType: null
            that.Devices.forEach(function(model){
                that.renderWidget(model, replace);
            });

            //setInterval(function () {
                that.Events.fetch({
                    update: true,
                    success: function(model, response, options){
                        that.Events.updateTime = response.data.updateTime;
                    }
                });
            //}, 1000);
        },
        renderWidget: function(model, replace){
            var that = this;
            if (model.get('deviceType') === "probe") {
                that.renderProbe(model, replace);
            } else if (model.get('deviceType') === "climate" && model.get('deviceSubType') === "fan") {
                that.renderFan(model, replace);
            } else if (model.get('deviceType') === "doorlock") {
                that.renderDoorlock(model, replace);
            } else if (model.get('deviceType') === "multilevel") {
                that.renderMultilevel(model, replace);
            } else if (model.get('deviceType') === "climate" && model.get('deviceSubType') === "thermostat") {
                that.renderThermostat(model, replace)
            } else if (model.get('deviceType') === "switch") {
                that.renderSwitch(model, replace);
            } else {
                log(model)
            }
        },
        renderProbe: function(model, replace){
            var that = this;
            var $ProbeTmp = $(_.template(templateProbe, model.toJSON()));
            if (!replace) {
                that.$el.append($ProbeTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"').replaceWith( $ProbeTmp );
            }
        },
        renderFan: function(model, replace){
            var that = this;
            var $FanTmp = $(_.template(templateFan, model.toJSON()));

            $FanTmp.find(".select-field select").on('change', function(){

                var params = $(this).val() != -1 ? {mode: $(this).val()} : {},
                    command = $(this).val() != -1 ? 'setMode' : 'off';

                Apis.devices.command(model.get('id'), command, params, function(json){
                    //log(json);
                })
            });

            if (!replace) {
                that.$el.append($FanTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"').replaceWith( $FanTmp );
            }
        },
        renderDoorlock: function(model, replace) {
            var that = this;
            var $DoorLockTmp = $(_.template(templateDoorlock, model.toJSON()));
            $DoorLockTmp.find('.action').on('click', function(e){
                var $button = $(this);
                e.preventDefault();
                var command = !$button.hasClass('active') ? 'open' : 'closed';
                Apis.devices.command(model.get('id'), command, {}, function(json){
                    //log(json);
                    $button
                        .toggleClass('active')
                        .attr('title', capitaliseFirstLetter(command))
                        .children()
                        .toggleClass('active')
                        .find('.text').text(command.toUpperCase());
                })
            });
            if (!replace) {
                that.$el.append($DoorLockTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"').replaceWith( $DoorLockTmp );
            }
        },
        renderMultilevel: function(model, replace){
            var that = this;
            var $ComplementaryTmp = $(_.template(templateComplementary, model.toJSON()));

            var $range = $ComplementaryTmp.find('.input-range');
            var $progress =  $ComplementaryTmp.find('.progress-bar');
            var $text =  $ComplementaryTmp.find('.text');

            $progress.on('mouseover', function(){
                $progress.toggleClass('hidden');
                $text.toggleClass('hidden');
                $range.toggleClass('hidden');
                $range.doVisibleRange();
            });

            $range.on('change', function() {
                $range.doVisibleRange();
            }).on('mouseout', function(){
                    $text.toggleClass('hidden');
                    $progress.val($range.val()).toggleClass('hidden');
                    $range.toggleClass('hidden');
                });

            if (!replace) {
                that.$el.append($ComplementaryTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"').replaceWith( $ComplementaryTmp );
            }
        },
        renderThermostat: function(model, replace) {
            var that = this;
            var $ThermostatTmp = $(_.template(templateThermostat, model.toJSON()));
            $ThermostatTmp.find(".select-field select").on('change', function(){

                var params = $(this).val() != -1 ? {mode: $(this).val()} : {},
                    command = $(this).val() != -1 ? 'setMode' : 'off';

                Apis.devices.command(model.get('id'), command, params, function(json){
                    //log(json);
                })
            });
            if (!replace) {
                that.$el.append($ThermostatTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"').replaceWith( $ThermostatTmp );
            }
        },
        renderSwitch: function(model, replace){
            var that = this;
            var $SwitchTmp = $(_.template(templateSwitch, model.toJSON()));
            $SwitchTmp.find('.action').on('click', function(e){
                var $button = $(this);
                e.preventDefault();
                var command = !$button.hasClass('active') ? 'on' : 'off';
                Apis.devices.command(model.get('id'), command, {}, function(json){
                    //log(json);
                    $button
                        .toggleClass('active')
                        .attr('title', capitaliseFirstLetter(command))
                        .children()
                        .toggleClass('active')
                        .find('.text').text(command.toUpperCase());
                })
            });
            if (!replace) {
                that.$el.append($SwitchTmp);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"').replaceWith( $SwitchTmp );
            }
        }

    });

    return DashboardView;
});