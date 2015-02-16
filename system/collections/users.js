/* System: Users Collections */
'use strict';
; (function () {
    var Users = Core.Collection.Extend({
        initialize: function () {
            console.log(JSON.stringify(this.policy));
        }
    });

    Core.Namespace('Collections.Users', Users);
}());