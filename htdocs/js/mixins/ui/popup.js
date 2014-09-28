define([], function () {
    'use strict';

    return {
        stopPropagationAndPreventDefault: function(e){
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
        },
        toggleShowPopup: function (e) {
            if (this.isMounted()) {
                this.setState({show: !this.state.show});
                this.forceUpdate();
            }
        }
    }
});