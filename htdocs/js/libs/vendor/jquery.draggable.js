// Simple JQuery Draggable Plugin
// Usage: $(selector).drags();
// Options:
// handle            => your dragging handle.
//                      If not defined, then the whole body of the
//                      selected element will be draggable
// cursor            => define your draggable element cursor type
// draggableClass    => define the draggable class
// activeHandleClass => define the active handle class

(function ($) {
    $.fn.drags = function (opt) {

        opt = $.extend({
            handle: "",
            cursor: "move",
            draggableClass: "draggable",
            activeHandleClass: "active-handle",
            onMouseUp: null,
            onMovable: null,
            onMouseDown: null,
            container: null,
            containerType: null
        }, opt);

        var $selected = null,
            $elements = (opt.handle === "") ? this : this.find(opt.handle),
            position = {};

        $elements.css('cursor', opt.cursor).on("mousedown", function (e) {
            if (opt.handle === "") {
                $selected = $(this);
                $selected.addClass(opt.draggableClass);
            } else {
                $selected = $(this).parent();
                $selected.addClass(opt.draggableClass).find(opt.handle).addClass(opt.activeHandleClass);
            }
            var drg_h = $selected.outerHeight(),
                drg_w = $selected.outerWidth(),
                pos_y = $selected.offset().top + drg_h - e.pageY,
                pos_x = $selected.offset().left + drg_w - e.pageX,
                containerPosition = opt.container ? $(opt.container).offset() : null,
                containerWidth = opt.container ? $(opt.container).width() : null,
                selectedPosition = $selected.position(),
                selectedWidth = $selected.width(),
                left,
                top;

            if (!!(opt.onMouseDown && opt.onMouseDown.constructor && opt.onMouseDown.call && opt.onMouseDown.apply)) {
                opt.onMouseDown({
                    position: {
                        top: e.pageY + pos_y - drg_h,
                        left: e.pageX + pos_x - drg_w
                    },
                    source: {
                        drg_h: drg_h,
                        drg_w: drg_w,
                        pos_y: pos_y,
                        pos_x: pos_x
                    }
                });
            }
            $(document).on("mousemove", function (e) {
                var rightBorder = containerPosition.left + containerWidth;

                left = e.pageX + pos_x - drg_w - selectedWidth + containerPosition.left/2;
                top = e.pageY + pos_y - drg_h - selectedPosition.top/2 - containerPosition.top;

                position = {
                    left: left,
                    top: top
                };

                $selected.css(position);
                if (!!(opt.onMouseDown && opt.onMouseDown.constructor && opt.onMouseDown.call && opt.onMouseDown.apply)) {
                    opt.onMovable(position);
                }
            }).on("mouseup", function () {
                $(this).off("mousemove"); // Unbind events from document
                if ($selected !== null) {
                    $selected.removeClass(opt.draggableClass);
                    selectedPosition = null;
                    selectedWidth = null;
                    $selected = null;
                }
                if (!!(opt.onMouseUp && opt.onMouseUp.constructor && opt.onMouseUp.call && opt.onMouseUp.apply)) {
                    opt.onMouseUp(position);
                }
            });
            e.preventDefault(); // disable selection
        }).on("mouseup", function () {
            if (opt.handle === "") {
                $selected.removeClass(opt.draggableClass);
            } else {
                $selected.removeClass(opt.draggableClass)
                    .find(opt.handle).removeClass(opt.activeHandleClass);
            }
            $selected = null;
        });

        return this;
    };
})(jQuery);