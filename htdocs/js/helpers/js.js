define([], function () {

    var Helpers = new function() {
        var Helpers = function() {

        };

        Helpers.prototype = {
            constructor: Helpers,
            extend: function(to, from) {
                for (var key in from) {
                    if (from.hasOwnProperty(key)) {
                        to[key] = from[key];
                    }
                }
                return to;
            },
            arrayUnique: function(a) {
                return a.reduce(function(p, c) {
                    if (p.indexOf(c) < 0) p.push(c);
                    return p;
                }, []);
            },
            flatten: function (array, i) {
                i = i || 0;

                if(i >= array.length)
                    return array;

                if(Array.isArray(array[i])) {
                    return flatten(array.slice(0,i)
                        .concat(array[i], array.slice(i+1)), i);
                }

                return flatten(array, i+1);
            }
        };

        return Helpers;
    };

    return Helpers;
});