function modulePostRender(control) {

    var $tableRoom = $('.climateControlRoomSettings').find('table'),
        $tableRoomHead = $tableRoom.find('thead tr'),
        $tableSheduler = $('.climateControlSchedule').find('table'),
        $tableShedulerHead = $tableSheduler.find('thead tr');

    $(document).off('click', 'button[data-alpaca-array-actionbar-action="clone"]').on('click', 'button[data-alpaca-array-actionbar-action="clone"]', function(e) {
        e.preventDefault();
        var $cloneButton = $(this);
        var $addButton = $cloneButton.parent().find('button[data-alpaca-array-actionbar-action="add"]');

        $addButton.on('click',function() {

            var $oldRow = $(this).parent().parent().parent();
            setTimeout(function(){
                var $newRow = $oldRow.next('tr');

                var $oldInputs = $oldRow.find('input:text,input:checkbox, select');
                var $newInputs = $newRow.find('input:text,input:checkbox, select');

                $newInputs.each(function(i,v) {
                    if ($(v).attr('type') == 'checkbox') {
                        $(v).prop('checked', $($oldInputs[i]).is(':checked'));
                    }
                    else {
                        $(v).val($($oldInputs[i]).val());
                    }
                    
                });

                $addButton.off('click');
            },300);
        });

        $addButton.click();
    });


    if($tableRoomHead.children('th').length > 6) {
        var tHeadlength = $tableRoomHead.children('th').length,
            label = $tableRoomHead.find('th:nth-child(2)').text().split('_')[0],
            visiblelength = tHeadlength-4;

        for(var i = visiblelength; i > 2; i--) {
            $tableRoomHead.find('th:nth-child(' + i + ')').remove();
        }
        $tableRoomHead.find('th:nth-child(2)').text(label);
    }

    $tableRoomHead.hide();
    $tableShedulerHead.hide();

    if($tableRoom.find('tbody tr').length >= 1) {
        $tableRoomHead.show();
        $tableRoom.find('tbody tr').each(function(i, v) {
            buildRow($(v));
        });
    }

    if($tableSheduler.find('tbody tr').length >= 1) {
        $tableShedulerHead.show();
    }

    $('.climateControlRoomSettings').on('click', 'button[data-alpaca-array-toolbar-action=add]', function(event) {
        $tableRoomHead.show();
        var toolbarTimer = setInterval(function() {
            if($tableRoom.find('tbody tr').length >= 1) {
                buildRow($tableRoom.find('tbody tr'));

                if(toolbarTimer) {
                    clearInterval(toolbarTimer);
                }
            }
        }, 100);
    });

    $('.climateControlSchedule').on('click', 'button[data-alpaca-array-toolbar-action=add]', function(event) {
       $tableShedulerHead.show();
    });

    function buildRow($tr) {
        var currRow = $tr.attr('data-alpaca-field-name'),
            hideTd = [],
            elCnt = $tr.find('td[data-alpaca-container-item-name^=' + currRow + '_devicesByRoom_]').length;

        $tr.find('td[data-alpaca-container-item-name^=' + currRow + '_devicesByRoom_]').each(function(i, v) {
            $formGroup = $(v).find('select').closest('div');

            if($formGroup.css('display') === 'none') {
                hideTd.push($(v));
            }
        });

        if(elCnt === hideTd.length) {
            $.each(hideTd, function(i, td) {
                if(i === 0) {
                    td.show();
                } else {
                    td.hide();
                }
            });
        } else {
            $.each(hideTd, function(i, td) {
                td.hide();
            });
        }
    }

    $tableRoom.on('click', 'button', function(event) {
        var $this = $(this),
            action = $this.attr('data-alpaca-array-actionbar-action'),
            tableRows = $tableRoom.find('tbody tr').length,
            $tr = $this.closest('tr');

        switch(action) {
            case 'add':
                var addTimer = setInterval(function () {

                    if ($tableRoom.find('tbody tr').length === tableRows +1 && $tr.next('tr')) {
                        $tableRoom.find('tbody tr').each(function(i, v) {
                            buildRow($(v));
                        });
                        if (addTimer) {
                            clearInterval(addTimer);
                        }
                    }
                }, 500);
                break;
            case 'remove':
                $tr.remove();
                if($tableRoom.find('tbody tr').length < 1) {
                    $tableRoomHead.hide();
                    $('.climateControlRoomSettings').find('button[data-alpaca-array-toolbar-action=add]').closest('div').show();
                }
                break;
        }
    });

    $tableRoom.on('change', 'select', function(event) {
        var $this = $(this),
            $tr = $this.closest('tr');

        if($this.attr('name').split('_')[3] === 'room') {
            var currRow = $tr.attr('data-alpaca-field-name');
            var roomId = $this.find('option:selected').val();
            if(roomId != '') {
                $tr.find('td[data-alpaca-container-item-name^=' + currRow + '_devicesByRoom_]').each(function (i, v) {
                    if ($(v).attr('data-alpaca-container-item-name') === (currRow + '_devicesByRoom_' + roomId)) {
                        $(v).show();
                    } else {
                        $(v).hide();
                    }
                });
            } else {
                buildRow($tr);
            }
        }
    });
};
