define([
    'backbone',
    'helpers/modal',
    'text!templates/layout/header.html',
    'text!templates/layout/main.html',
    'text!templates/layout/footer.html',
    'text!templates/popups/event-menu.html'
], function (Backbone, ModalHelper, HeaderTpl, MainTpl, FooterTpl, EventMenuTpl) {
    'use strict';
    var AppLayout = Backbone.View.extend({
        el: "#body",
        templateHeader: _.template(HeaderTpl, {}),
        templateMain: _.template(MainTpl, {}),
        templateFooter: _.template(FooterTpl, {}),

        initialize: function () {
            var that = this;
            _.bindAll(this, 'render', 'clear', 'update');
            that.$header = $(that.templateHeader);
            that.$main = $(that.templateMain);
            that.$footer = $(that.templateFooter);

            that.$header.find('.events-menu').on('click', function (e) {
                // Events menu
                var $modal = $(_.template(EventMenuTpl, {})),
                    fillScreenOpacity = true,
                    forbidClose = true,
                    relX = "64.7%",
                    relY = "7.8%",
                    position = { top: relY, left: relX };

                // Popup initialization
                $modal.find('.arrow').css({'left': '17%' });
                ModalHelper.popup($modal, forbidClose, fillScreenOpacity, position);
            });

            that.Notifications = window.App.Notifications;
            that.listenTo(that.Notifications, 'add change', function (model) {
                log(model)
            });
        },

        render: function () {
            var that = this;
            this.$el.html(that.$header).append(that.$main).append(that.$footer);
        },
        update: function () {
            var that = this,
                hash = window.location.hash.match(/(?:[a-z]+){2}/)[0];
            if (hash === 'widgets') {
                that.$header.find('.header-box-sub-nav-rooms').removeClass('hidden');
                that.$header.find('.header-box-sub-nav').removeClass('hidden');
            } else {
                that.$header.find('.header-box-sub-nav-rooms').addClass('hidden');
                that.$header.find(".header-box-sub-nav").addClass('hidden');
            }
        },
        clear: function () {
            var that = this;
            that.$header.remove();
            that.$main.remove();
            that.$footer.remove();
        }
    });

    return AppLayout;
});