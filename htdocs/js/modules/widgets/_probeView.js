define([
    "helpers/apis",
    "backbone",
    "text!templates/widgets/probe-small.html"
], function (Apis, Backbone, templateProbe) {
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
                level;

            that.$template = $(_.template(templateProbe, that.model.toJSON()));

            that.listenTo(that.model, 'change:metrics', function () {
                level = _.isNumber(that.model.get('metrics').level) ? that.model.get('metrics').level    : that.model.get('metrics').level;
                that.$template.find('.title-container').text(that.model.get('metrics').title);
                that.$template.find('.probe-value').text(level + ' ' + that.model.get('metrics').scaleTitle);
            });

            if (!that.Devices.activeMode) {
                that.$template.addClass('clear');
            } else {
                that.$template.removeClass('clear');
            }

            that.$template.hide();

            that.listenTo(window.App.Devices, 'settings normal', function () {
                that.$template.toggleClass('clear');
            });

            that.listenTo(model, 'show', function () {
                that.$template.removeClass('show').addClass('show').show('fast');
            });

            that.listenTo(model, 'hide', function () {
                that.$template.removeClass('show').hide('fast');
            });

            if (!$('div[data-widget-id="' + that.model.id + '"]').exists()) {
                that.$el.append(that.$template);
            } else {
                that.$el.find('div[data-widget-id="' + that.model.get('id') + '"]').replaceWith(that.$template);
            }
        },
        getTemplate: function () {
            return this.$template;
        }
    });
});