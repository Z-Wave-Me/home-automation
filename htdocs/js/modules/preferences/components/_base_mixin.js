define([], function () {
    'use strict';

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
            var binding = this.getMoreartyContext().getBinding().sub('preferences');

            binding.set('activeNodeTreeId', nodeId);
            if (nodeId === 1) {
                binding.set('backButtonEnabled', false);
            } else {
                binding.set('backButtonEnabled', true);
            }
        },
        getActiveNodeTree: function () {
            var binding = this.getMoreartyContext().getBinding().sub('preferences'),
                activeNodeTreeId = binding.val('activeNodeTreeId'),
                activeNode = this.searchTree(binding.sub('tree').val().toObject(), activeNodeTreeId);

            return activeNode;
        }
    }
});
