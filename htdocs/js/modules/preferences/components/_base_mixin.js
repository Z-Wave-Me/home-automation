define([], function () {
    'use strict';

    return function () {
        return {
            searchTree: function (element, matchingId, parent) {
                if (element.id === matchingId){
                    return [element, parent || null];
                } else if (element.children !== null){
                    var result = null;

                    for (var i = 0; result === null && i < element.children.length; i += 1) {
                        result = this.searchTree(element.children[i], matchingId, element);
                    }

                    return result;
                }
                return null;
            },
            setActiveNode: function (nodeId) {
                this.getState().sub('preferences').set('activeNodeTreeId', nodeId);
                if (nodeId === 1) {
                    this.getState().sub('preferences').set('backButtonEnabled', false);
                } else {
                    this.getState().sub('preferences').set('backButtonEnabled', true);
                }
            },
            getActiveNodeTree: function () {
                var state = this.getState(),
                    activeNodeTreeId = state.sub('preferences').val('activeNodeTreeId'),
                    activeNode = this.searchTree(state.sub('preferences').sub('tree').val().toObject(), activeNodeTreeId);

                return activeNode;
            }
        }
    }
});
