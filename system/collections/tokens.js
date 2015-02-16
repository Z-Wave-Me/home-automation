/* System: Users Collections */
'use strict';
; (function () {
    var Tokens = Core.Collection.Extend({
        initialize: function () {
            console.log(JSON.stringify(this.policy));
        }
    });

    Core.Namespace('Collections.Tokens', Tokens);
}());