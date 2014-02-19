define([
    //libs
    'backbone'
], function () {
    "use strict";
    var Utils = {};

    Utils.escapeAndNewLines = function(str) {
        return Utils.replaceNewLines(Utils.escape(str));
    };

    Utils.escape = function(str) {
        if (!str) {
            return '';
        }
        return $('<div></div>').text(str).text();
    };

    Utils.replaceNewLines = function (str) {
        return str.replace(/\n/g, '<br />');
    };

    Utils.activateCurrentNav = function () {
        var hash = window.location.hash.length > 0 ? window.location.hash.match(/(?:[a-z]+){2}/) : 'dashboard';
        $('.top-nav').find("a").removeClass("active");
        $('.top-nav a[href*="' + hash + '"]:first').addClass('active');
        if (!$('.top-nav a[href*="' + hash + '"]:first').length) {
            $('.top-nav a[href*="dashboard"]:first').addClass('active')
        }
    };

    return Utils;
});