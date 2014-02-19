define([
    'backbone'
], function (Backbone) {
    "use strict";

    var fillScreenCss, fillScreenCssTransparent;
    fillScreenCss = {
        'background': '#000000',
        'opacity': '0.9',
        'filter': 'alpha(opacity=90)',
        'position': 'absolute',
        'top': '0',
        'left': '0',
        'min-width': '100%',
        'z-index': '1000'
    };
    fillScreenCssTransparent = {
        'background': '#000000',
        'opacity': '0',
        'filter': 'alpha(opacity=0)',
        'position': 'absolute',
        'top': '0',
        'left': '0',
        'min-width': '100%',
        'z-index': '1000'
    };

    function hideAllPopups(quick) {

        if (!quick || quick == undefined || quick == null) {
            $('.popup').trigger('hide');
            $('.popup').fadeOut('fast', function() { $(this).remove(); });

            $('.popover').trigger('hide');
            $('.popover').fadeOut('fast', function() { $(this).remove(); });
        } else {
            $('.popup').trigger('hide');
            $('.popup').remove();

            $('.popover').trigger('hide');
            $('.popover').remove();
        }

        if ($('.fillScreen').exists()) {
            $('.fillScreen').remove();
        }
        if ($('.fillScreenOpacity').exists()) {
            $('.fillScreenOpacity').remove();
        }
    }

    var ModalHelper = {};

    ModalHelper.hideAll = hideAllPopups;

    ModalHelper.popup = function ($popup, forbidClose, fillScreenTransparent, position) {


        if (fillScreenTransparent && fillScreenTransparent !== 'hide') {
            var $outer = $("<div></div>").addClass('fillScreenOpacity').css(fillScreenCssTransparent).height($(document).height()).appendTo($('body'));
        } else if (fillScreenTransparent == 'hide') {
            var $outer = $('<div></div>').hide();
        } else {
            var $outer = $('<div></div>').addClass('fillScreen').css(fillScreenCss).height($(document).height()).appendTo($('body'));
        }

        if (forbidClose) {
            $outer.click(hideAllPopups);
        } else {
            $outer.off('click');
        }

        $popup.appendTo('body');

        if (!position || position === undefined) {
            $popup.center();
        } else if (position === 'top') {
            $popup.top();
        } else {
            $popup.css(position);
        }

        $popup.show();
        $popup.trigger('show');
    };


    return ModalHelper;
});