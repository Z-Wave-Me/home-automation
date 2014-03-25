define([
    "helpers/apis",
    "backbone",
    "text!templates/widgets/toggle-small.html"
], function (Apis, Backbone, templateToggle) {
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
                model = that.model;

            that.$template = $(_.template(templateToggle, model.toJSON()));

            if (!that.Devices.activeMode) {
                that.$template.addClass('clear');
            } else {
                that.$template.removeClass('clear');
            }

            that.listenTo(window.App.Devices, 'settings normal', function () {
                that.$template.toggleClass('clear');
            });

            that.listenTo(that.model, 'destroy', function () {
                that.remove();
            });

            that.listenTo(that.model, 'change', function () {
                that.$template.find('.title-metrics').text(that.model.get('metrics').title);
            });

            that.listenTo(model, 'show', function () {
                that.$template.removeClass('show').addClass('show').show('fast');
            });

            that.listenTo(model, 'hide', function () {
                that.$template.removeClass('show').hide('fast');
            });

            that.$template.find('.action').on('click', function (e) {
                e.preventDefault();

                Apis.devices.command(model.get('id'), 'on', {}, function (json) {
                    //json
                });
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