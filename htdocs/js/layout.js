define([
    'marionette',
    'backbone',
    'helpers/modal',
    'text!templates/layout/header.html',
    'text!templates/layout/main.html',
    'text!templates/layout/footer.html',
    'text!templates/popups/event-menu.html'
], function (Marionette, Backbone, ModalHelper, HeaderTpl, MainTpl, FooterTpl, EventMenuTpl) {
    'use strict';
    var AppLayout = Backbone.Marionette.Layout.extend({
        el: "#body",
        templateHeader: _.template(HeaderTpl, {}),
        templateMain: _.template(MainTpl, {}),
        templateFooter: _.template(FooterTpl, {}),

        initialize: function () {
            var that = this;
            _.bindAll(this, 'render', 'clear');
            that.$header = $(that.templateHeader);
            that.$main = $(that.templateMain);
            that.$footer = $(that.templateFooter);

            that.$header.find('.events-menu').on('click', function (e){
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
        },

        render: function () {
            var that = this;
            that.activateCurrentNav();
            this.$el.html(that.$header).append(that.$main).append(that.$footer);
        },
        clear: function () {
            var that = this;
            that.$header.remove();
            that.$main.remove();
            that.$footer.remove();
        },
        activateCurrentNav : function () {
            var hash = window.location.hash.match(/(?:[a-z]+){2}/);
            $('.top-nav').find("a").removeClass("active");
            $('.top-nav a[href*="' + hash + '"]:first').addClass('active');
        }
    });

    return AppLayout;
});