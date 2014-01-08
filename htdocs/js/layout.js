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
            var that = this, $ok, $warning, $modal, fillScreenOpacity,
                forbidClose, relX, relY, position;
            _.bindAll(this, 'render', 'clear', 'update', 'addEventToList', 'addRoomToFilter', 'addTypeToFilter');
            that.$header = $(that.templateHeader);
            that.$main = $(that.templateMain);
            that.$footer = $(that.templateFooter);

            $ok = that.$header.find('.events-ok');
            $warning = that.$header.find('.events-warning');
            that.Notifications = window.App.Notifications;
            that.Locations = window.App.Locations;
            that.Devices = window.App.Devices;
            that.deleted = [];
            window.App.filters = {
                locations: true,
                types: false,
                tags: false
            };

            that.listenTo(that.Notifications, 'add', function (model) {
                that.addEventToList(model);
            });

            $modal = $(_.template(EventMenuTpl, {}));
            fillScreenOpacity = true;
            forbidClose = true;
            relX = "64.7%";
            relY = "7.8%";
            position = { top: relY, left: relX };

            // Popup initialization
            if (!that.Notifications.length) {
                $modal.find('.arrow').css({'left': '17%' });
            } else {
                $modal.find('.arrow').css({'left': '7%' });
            }
            that.$eventsContainer = $modal.find('.events-container');

            that.Notifications.each(function (model) {
                var isExist = _.find(that.deleted, function (notice) { return notice.id === model.id; });
                if (!model.get('redeemed') && !isExist) {
                    that.addEventToList(model);
                }
            });

            that.$header.find('.events-menu').on('click', function (e) {
                e.preventDefault();
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

            that.listenTo(that.Locations, 'add', function (location) {
                if (window.App.filters.locations) {
                    that.addRoomToFilter(location);
                }
            });

            that.listenTo(that.Locations, 'sync', function () {
                if (window.App.filters.locations) {
                    that.$el.find('.sub-nav').find('.rooms-filter').click();
                }
            });

            that.listenTo(that.Devices, 'change:tags', function () {
                _.each(_.without(_.uniq(_.flatten(that.Devices.pluck('tags'))), 'sensor'), function (type) {
                    that.addTagToFilter(type);
                });
            });

            that.PreferencesView = new PreferencesView({el: that.$header[0]});
            that.PreferencesView.render();
        },

        addEventToList: function (model) {
            var notice = model.toJSON(), $template, that = this;
            if (that.$eventsContainer.exists()) {
                notice.timeDate = new Date(notice.timestamp);
                notice.timeDate = notice.timeDate.getDate() + "/" + (notice.timeDate.getMonth() + 1) + "/" + (notice.timeDate.getYear() - 100) + " - " + notice.timeDate.getHours() + ":" + notice.timeDate.getMinutes();
                $template = $(_.template(EventTmp, notice));

                that.listenTo(model, 'remove', function () {
                    $template.slideUp('fast');
                    model.save({redeemed: true});
                    if (!that.Notifications.length) {
                        ModalHelper.hideAll();
                    }
                });

                $template.find('.read').off().on('click', function () {
                    that.deleted.push(model);
                    that.Notifications.remove(model);

                });

                that.$eventsContainer.append($template);
            }
        },

        addRoomToFilter: function (location) {
            var that = this,
                $template;

            $template = $('<li><a data-id="' + location.get('id') + '" class="item-nav" href="/">' + location.get('title') + '</a></li>');

            that.listenTo(location, 'destroy', function () {
                $template.off().hide('fast');
            });

            $template.find('.item-nav').on('click', function (e) {
                e.preventDefault();
                that.$header.find('.item-nav').removeClass('active');
                $template.find('.item-nav').addClass('active');
                that.Locations.activeRoom = location.id;
                that.Locations.trigger('filter');
            });

            that.$header.find('.menu-filter').append($template);
        },

        addTypeToFilter: function (type) {
            var that = this,
                $template;

            $template = $('<li><a data-id="' + type + '" class="item-nav" href="/">' + type + '</a></li>');

            //that.listenTo(that.Devices, 'destroy', function () {
            //    $template.off().hide('fast');
            //});

            $template.find('.item-nav').on('click', function (e) {
                e.preventDefault();
                that.$header.find('.item-nav').removeClass('active');
                $template.find('.item-nav').addClass('active');
                that.Devices.activeType = type;
                that.Devices.trigger('filter');
            });

            that.$header.find('.menu-filter').append($template);
        },

        addTagToFilter: function (tag) {
            var that = this,
                $template;

            $template = $('<li class="tag-container"><a data-id="' + tag + '" class="item-nav" href="/">' + tag + '</a></li>');

            //that.listenTo(that.Devices, 'destroy', function () {
            //    $template.off().hide('fast');
            //});

            $template.find('.item-nav').on('click', function (e) {
                e.preventDefault();
                that.$header.find('.item-nav').removeClass('active');
                $template.find('.item-nav').addClass('active');
                that.Devices.activeTag = tag;
                that.Devices.trigger('filter');
            });

            if (!$('li.tag-container a[data-id="' + tag + '"]').exists()) {
                that.$header.find('.menu-filter').append($template);
            }
        },

        render: function () {
            var that = this;
            that.$el.html(that.$header).append(that.$main).append(that.$footer);

            // activation filters
            that.$el.find('.sub-nav').find('a').on('click', function (e) {
                e.preventDefault();
                var $this = $(this),
                    type = $this.attr('data-type'),
                    $allTemplate = $(_.template('<li><a data-target="all" class="item-nav all-visible active" href="/">All</a></li>', {}));

                $this.parent().parent().find('a').removeClass('active');
                $this.addClass('active');
                that.$header.find('.menu-filter').empty();


                if (type === 'types') {
                    _.each(_.uniq(that.Devices.pluck('deviceType')), function (type) {
                        that.addTypeToFilter(type);
                    });
                    $allTemplate.on('click', function (e) {
                        e.preventDefault();
                        that.Devices.activeType = 'all';
                        that.Devices.trigger('filter');
                        that.$header.find('.item-nav').removeClass('active');
                        $allTemplate.find('.item-nav').addClass('active');
                    });
                    window.App.filters = {
                        tags: false,
                        locations: false,
                        types: true
                    };
                } else if (type === 'rooms') {
                    that.Locations.each(function (location) {
                        that.addRoomToFilter(location);
                    });
                    $allTemplate.on('click', function (e) {
                        e.preventDefault();
                        that.Locations.activeRoom = 'all';
                        that.Locations.trigger('filter');
                        that.$header.find('.item-nav').removeClass('active');
                        $allTemplate.find('.item-nav').addClass('active');
                    });
                    window.App.filters = {
                        tags: false,
                        locations: true,
                        types: false
                    };
                } else if (type === 'tags') {
                    _.each(_.without(_.uniq(_.flatten(that.Devices.pluck('tags'))), 'sensor'), function (type) {
                        that.addTagToFilter(type);
                    });
                    $allTemplate.on('click', function (e) {
                        e.preventDefault();
                        that.Devices.activeTag = 'all';
                        that.Devices.trigger('filter');
                        that.$header.find('.item-nav').removeClass('active');
                        $allTemplate.find('.item-nav').addClass('active');
                    });
                    window.App.filters = {
                        tags: true,
                        locations: false,
                        types: false
                    };
                }

                that.$header.find('.menu-filter').prepend($allTemplate);
                $allTemplate.click();
            });
            that.$footer.find('.footer-bar').off().on('click', function () {
                var $this = $(this);
                $this.toggleClass('active');
                if ($this.hasClass('active')) {
                    that.Devices.trigger('settings');
                } else {
                    that.Devices.trigger('normal');
                }
            });
        },
        update: function () {
            var that = this,
                hash = window.location.hash.match(/(?:[a-z]+){2}/) ? window.location.hash.match(/(?:[a-z]+){2}/)[0] : '';
            if (hash === 'widgets') {
                that.$header.find('.header-box-sub-nav-rooms').removeClass('hidden').hide().slideDown('fast');
                that.$header.find('.header-box-sub-nav').removeClass('hidden').hide().slideDown('fast');
            } else {
                that.$header.find('.header-box-sub-nav-rooms').hide().slideUp('fast');
                that.$header.find(".header-box-sub-nav").hide().slideUp('fast');
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