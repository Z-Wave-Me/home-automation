define([
    "helpers/apis",
    "backbone",
    "text!templates/widgets/complementary-small.html"
], function (Apis, Backbone, templateComplementary) {
    'use strict';

    return Backbone.View.extend({
        el: '#devices-container',

        initialize: function () {
            _.bindAll(this, 'render', 'getTemplate');
            var that = this;
            that.Devices = window.App.Devices;
        },
        render: function () {
            var that = this,
                model = that.model,
                $range,
                $progress,
                $text;

            that.$template = $(_.template(templateComplementary, that.model.toJSON()));

            $range = that.$template.find('.input-range');
            $progress =  that.$template.find('.progress-bar');
            $text =  that.$template.find('.text');

            if (!that.Devices.activeMode) {
                that.$template.addClass('clear');
            } else {
                that.$template.removeClass('clear');
            }

            that.$template.hide();

            that.listenTo(window.App.Devices, 'settings', function () {
                that.$template.removeClass('clear');
            });

            that.listenTo(window.App.Devices, 'normal', function () {
                that.$template.addClass('clear');
            });

            that.listenTo(model, 'show', function () {
                that.$template.removeClass('show').addClass('show').show('fast');
            });

            that.listenTo(model, 'hide', function () {
                that.$template.removeClass('show').hide('fast');
            });

            that.listenTo(that.model, 'change:metrics', function () {
                that.$template.find('.title-container').text(that.model.get('metrics').title);
                $progress.val(that.model.get('metrics').level);
                $range.val(that.model.get('metrics').level);
                $range.doVisibleRange();
            });

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
                if (parseInt(model.get('metrics').level) !== parseInt($range.val())) {
                    Apis.devices.command(model.get('id'), 'exact', {level: $range.val()}, function (json) {
                        //log(json);
                    });
                }
            });

            if (!$('div[data-widget-id="' + that.model.id + '"]').exists()) {
                that.$el.append(that.$template);
            } else {
                that.$el.find('div[data-widget-id="' + model.get('id') + '"]').replaceWith(that.$template);
            }
        },
        getTemplate: function () {
            return this.$template;
        }
    });
});