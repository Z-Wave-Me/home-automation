define([
    'backbone',
    'helpers/modal',
    'views/preferences/view',
    'text!templates/layout/header.html',
    'text!templates/layout/main.html',
    'text!templates/layout/footer.html',
    'text!templates/popups/event-menu.html',
    'text!templates/popups/_event.html'
], function (Backbone, ModalHelper, PreferencesView, HeaderTpl, MainTpl, FooterTpl, EventMenuTpl, EventTmp) {
    'use strict';
    var AppLayout = Backbone.View.extend({
        el: "#body",
        templateHeader: _.template(HeaderTpl, {}),
        templateMain: _.template(MainTpl, {}),
        templateFooter: _.template(FooterTpl, {}),

        initialize: function () {
            var that = this, $ok, $warning, $eventsContainer, $template;
            _.bindAll(this, 'render', 'clear', 'update');
            that.$header = $(that.templateHeader);
            that.$main = $(that.templateMain);
            that.$footer = $(that.templateFooter);

            $ok = that.$header.find('.events-ok');
            $warning = that.$header.find('.events-warning');

            that.$header.find('.events-menu').on('click', function (e) {
                // Events menu
                var $modal = $(_.template(EventMenuTpl, {})),
                    fillScreenOpacity = true,
                    forbidClose = true,
                    relX = "64.7%",
                    relY = "7.8%",
                    position = { top: relY, left: relX };

                // Popup initialization
                if (!that.Notifications.length) {
                    $modal.find('.arrow').css({'left': '17%' });
                } else {
                    $modal.find('.arrow').css({'left': '7%' });
                }
                $eventsContainer = $modal.find('.events-container');

                that.Notifications.forEach(function (model) {
                    var notice = model.toJSON();
                    notice.timeDate = new Date(notice.timestamp);
                    notice.timeDate = notice.timeDate.getDate() + "/" + (notice.timeDate.getMonth() + 1) + "/" + (notice.timeDate.getYear() - 100) + " - " + notice.timeDate.getHours() + ":" + notice.timeDate.getMinutes();
                    $template = $(_.template(EventTmp, notice));

                    $template.find('.read').on('click', function () {
                        var $this = $(this);
                        $this.off();
                        model.save({mark: true}, {
                            silent: true,
                            success: function () {
                                this.Notifications.remove(model);
                                $template.slideUp('fast');
                            }
                        });
                    });

                    $eventsContainer.append($template);
                });
                ModalHelper.popup($modal, forbidClose, fillScreenOpacity, position);
            });

            that.Notifications = window.App.Notifications;
            that.listenTo(that.Notifications, 'all', function () {
                if (that.Notifications.length) {
                    $ok.addClass('hidden');
                    $warning.removeClass('hidden');
                    $warning.find('.count').text(that.Notifications.size());
                } else {
                    $ok.removeClass('hidden');
                    $warning.addClass('hidden');
                }
            });
            that.PreferencesView = new PreferencesView({el: that.$header[0]});
            that.PreferencesView.render();
        },

        render: function () {
            var that = this;
            this.$el.html(that.$header).append(that.$main).append(that.$footer);
        },
        update: function () {
            var that = this,
                hash = window.location.hash.match(/(?:[a-z]+){2}/) ? window.location.hash.match(/(?:[a-z]+){2}/)[0] : '';
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