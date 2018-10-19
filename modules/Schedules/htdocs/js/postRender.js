function modulePostRender(control) {
    if(window.location.href.indexOf("put") > -1) {
        var row = "<p><button class='btn btn-success' type='button' id='testbutton'>TEST</button></p>";
        $(row).insertAfter('#active');
    }

    $(document).on("click", "#testbutton", function() {
        l = document.createElement("a");
        l.href = window.location.href;
        id = l.hash.split("/");

        $.ajax({
            url: 'http://' + l.host + '/JS/Run/controller.emit("scheduledScene.run.' + id[3] + '")'
        }).success( function() {
            alert('Current schedule test completed!');
        });
    });

/* part of normal ScheduledScene */
/*
    if( $('input[name=title]').val() === 'Schedule')
	{
	    week = getWeekArray();
	    $('#title').val(week + ': ' + $('input[name=times_0]').val());
    }

    $(document).on("click", "input[type=checkbox]", function() {
        if(window.location.href.indexOf("post") > -1) {
            week = getWeekArray();
            $('#title').val(week + ': ' + $('input[name=times_0]').val());
	    }
    });

    $(document).on("blur", "input[name=times_0]", function() {
        if(window.location.href.indexOf("post") > -1) {
            week = getWeekArray();
            $('#title').val(week + ': ' + $('input[name=times_0]').val());
	    }
    });
*/
}

/*
function getWeekArray() {
    var weekdays = ['Su', 'Mo', 'Tue', 'Wed', 'Thu', 'Fr', 'Sa'];
    var elem = ($('div[data-alpaca-field-name=weekdays]'))[0].children,
        lday = -1,
        a_week = [],
        a_week_counter = 0;

    for(var i = 0, len = elem.length; i<len; i++) {
        var check = $(elem[i]).find("input"),
            day = parseInt($(check).attr('data-checkbox-value'));

        if($(check).is(':checked')) {
            if(lday === -1) {
                a_week[a_week_counter++] = weekdays[day];
                lday = day;
                continue;
            }
            if((lday + 1) === day || (lday - 6) === day) {
                a_week[a_week_counter] = '-' + weekdays[day];
            } else {
                a_week_counter++;
                a_week[a_week_counter++] = ',' + weekdays[day];
            }
            lday = day;
        }
    };
    return a_week.join("");
}
*/
