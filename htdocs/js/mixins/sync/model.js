define([], function () {
    'use strict';

    return {
        // _toJSON
        // get
        // save
        // isModel
        isModel: function () {
            return this.getDefaultBinding().val('id');
        }
    }

});
