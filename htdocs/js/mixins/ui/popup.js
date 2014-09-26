define([], function () {
    'use strict';

    return {
        stopPropagationAndPreventDefault: function(e){
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
        },
        hidePopup: function (e) {
            this.state.show.set(false);
            return false;
        }
    }
});