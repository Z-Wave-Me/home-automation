/*

 Ractive-events-draggable
 =========================

 Version 0.1.1.

 Dealing with mousewheel events in browsers is an epic pain. The
 official DOM wheel event is badly designed enough that Chrome,
 Opera and Safari have so far refused to implement it, which isn't
 to say that the non-standard mousewheel event (or the DOMMouseScroll
 and MozMousePixelScroll events &ndash; yes, really) is a whole lot
 better. It's a total mess.

 The mousewheel event plugin is a (work-in-progress!) attempt to
 smooth over differences between browsers and operating systems, and
 provide you with the only bit of information you actually care about
 in 99% of cases: how many pixels of scroll the mousewheel event is
 equivalent to.

 Be aware that intercepting mousewheel events rather than using native
 scroll is often a bad idea &ndash; it doesn't perform as well in all
 cases, and doesn't work with mobile devices.

 Thanks to https://github.com/brandonaaron/jquery-mousewheel for
 figuring out a lot of this stuff.

 ==========================

 Troubleshooting: If you're using a module system in your app (AMD or
 something more nodey) then you may need to change the paths below,
 where it says `require( 'Ractive' )` or `define([ 'Ractive' ]...)`.

 ==========================

 Usage: Include this file on your page below Ractive, e.g:

 <script src='lib/Ractive.js'></script>
 <script src='lib/Ractive-events-mousewheel.js'></script>

 Or, if you're using a module loader, require this module:

 // requiring the plugin will 'activate' it - no need to use
 // the return value
 require( 'Ractive-events-mousewheel' );

 Add a mousewheel event in the normal fashion:

 <div on-draggable='draggable'>scroll here</div>

 Then add a handler:

 ractive.on( 'draggable', function ( event ) {
    console.log(event);
 });

 event = {
    node: this, // dom
    original: event, // original event
    event: event.type // string, eventType
 }

 */

(function ( global, factory ) {

    'use strict';

    // Common JS (i.e. browserify) environment
    if ( typeof module !== 'undefined' && module.exports && typeof require === 'function' ) {
        factory( require( 'Ractive' ) );
    }

    // AMD?
    else if ( typeof define === 'function' && define.amd ) {
        define([ '../../../bower_components/ractive/ractive' ], factory );
    }

    // browser global
    else if ( global.Ractive ) {
        factory( global.Ractive );
    }

    else {
        throw new Error( 'Could not find Ractive! It must be loaded before the Ractive-events-mousewheel plugin' );
    }

}( typeof window !== 'undefined' ? window : this, function ( Ractive ) {

    'use strict';

    var draggable, events;

    if ( typeof document === 'undefined' ) {
        return;
    }

    events = [ 'dragstart', 'dragenter', 'dragover', 'dragleave', 'drop', 'dragend' ];

    draggable = function ( node, fire ) {
        node.draggable = true;

        var i, handler = function ( event ) {
            event.preventDefault();
            event.stopPropagation();

            fire({
                node: this,
                original: event,
                event: event.type
            });
        };

        i = events.length;
        while ( i-- ) {
            node.addEventListener( events[i], handler, false );
        }

        return {
            teardown: function () {
                var i = events.length;
                while ( i-- ) {
                    node.removeEventListener( events[i], handler, false );
                }
            }
        };
    };

    Ractive.events.draggable = draggable;

    return draggable;
}));