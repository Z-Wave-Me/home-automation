function modulePostRender(control) {
    var id = 0;
    var mail_exists = false;
    var notification = control.childrenByPropertyId["notification"].children;

    if (typeof notification !== 'undefined') {
        $.ajax("/ZAutomation/api/v1/instances/MailNotifier")
            .done(function () {
                mail_exists = true;
                $.ajax("/ZAutomation/api/v1/profiles")
                    .done(function (profilesResponse) {
                        var moduleId = parseInt(window.location.href.substring(window.location.href.lastIndexOf("/") + 1));

                        if (!isNaN(moduleId)) {
                            $.ajax("/ZAutomation/api/v1/instances/" + moduleId)
                                .done(function (response) {
                                    notification.forEach(function (device, index) {
                                        if (typeof response.data.params.notification[index].device.mail_to_select !== 'undefined') {
                                            fillDropDown(profilesResponse.data, response.data.params.notification[index].device.mail_to_select);
                                            EnDisableToggle(index, 'mail_select');
                                        } else if (typeof response.data.params.notification[index].device.mail_to_input !== 'undefined') {
                                            EnDisableToggle(index, 'mail_input');
                                        } else {
                                            fillDropDown(profilesResponse.data, false);
                                            EnDisableToggle(index, 'phone_select');
                                        }
                                    })
                                });
                        }

                    })
                    .fail(function () {
                        /*  */
                    });
            })
            .fail(function () {
                $(".mail_input").parent().append('<div class="alert alert-warning">'+control.data.mail_helper+'</div>');
                $(".mail_input").hide();
                $(".mail_select").hide();
            });
    }

    control.childrenByPropertyId["notification"].on("add", function () {
        id = this.children.length - 1;

        var msg = $(document).find(".not_message");
        $(msg[id]).children().prop('disabled', true);

        if(mail_exists) {
            $.ajax("/ZAutomation/api/v1/profiles")
                .done(function (profilesResponse) {
                    var moduleId = parseInt(window.location.href.substring(window.location.href.lastIndexOf("/") + 1));
                    if (!isNaN(moduleId)) {
                        $.ajax("/ZAutomation/api/v1/instances/" + moduleId)
                            .done(function (response) {
                                if (typeof response.data.params.notification[id].device.mail_to_select !== 'undefined') {
                                    fillDropDown(profilesResponse.data, response.data.params.notification[id].device.mail_to_select);
                                }
                            });
                    } else {
                        fillDropDown(profilesResponse.data, false);
                    }
                })
                .fail(function () {
                    showInputField();
                });
        } else {
            var info = $(document).find(".mail_input");
            $(info[id]).parent().append('<div class="alert alert-warning">'+control.data.mail_helper+'<br /><br /><button class="btn btn-default install_mail">'+control.data.mail_button+'</button></div>');
            $(".mail_input").hide();
            $(".mail_select").hide();
        }

        $(document).on("click", ".install_mail", function() {
            alertify.confirm(control.data.mail_confirm, function () {
                window.location.replace("/smarthome/#/module/post/MailNotifier");
            });
        });

        $(document).on("change", "select[name=notification_" + id + "_device_target]", function () {
            if ($(this).val() === '') {
                $(this).parent().parent().parent().find(".mail_input").children().prop('disabled', false);
                $(this).parent().parent().parent().find(".mail_select").children().prop('disabled', false);
                $(this).parent().parent().parent().parent().parent().parent().find(".not_message").children().prop('disabled', true);
            } else {
                $(this).parent().parent().parent().find(".mail_input").children().prop('disabled', true);
                $(this).parent().parent().parent().find(".mail_select").children().prop('disabled', true);
                $(this).parent().parent().parent().parent().parent().parent().find(".not_message").children().prop('disabled', false);
            }
        });

        $(document).on("change", "select[name=notification_" + id + "_device_mail_to_select]", function () {
            if ($(this).val() === '') {
                $(this).parent().parent().parent().find(".phone_select").children().prop('disabled', false);
                $(this).parent().parent().parent().parent().parent().parent().find(".not_message").children().prop('disabled', true);
            } else {
                $(this).parent().parent().parent().find(".phone_select").children().prop('disabled', true);
                $(this).parent().parent().parent().parent().parent().parent().find(".not_message").children().prop('disabled', false);
            }
        })
    });
}

function fillDropDown(profiles, selectedMail) {
    var select = $(".mail_select").find('select');
    var added = false;

    profiles.forEach(function (singleProfile) {
        if ((typeof singleProfile.email !== 'undefined') && (singleProfile.email !== "")) {
            $(select[select.length -1]).append($('<option></option>').val(singleProfile.email).html(singleProfile.email));
            added = true;
        }
    });
    if (!added){
        showInputField();
    } else {
        if (selectedMail) {
            select.val(selectedMail);
        }

        $(".mail_input").hide();
        $(".mail_select").show();
    }
};

function showInputField() {
    $(".mail_input").hide();
    $(".mail_select").show();
};

/*
Function to Toggle enable state of phone or mail elements. Given class is set to enable!
 */
function EnDisableToggle(elementId, elementClass) {
    var phone = $(document).find(".phone_select");
    var mail_s = $(document).find(".mail_select");
    var mail_i = $(document).find(".mail_input");

    if (elementClass === 'phone_select') {
        $(phone[elementId]).children().prop('disabled', false);
        $(mail_s[elementId]).children().prop('disabled', true);
        $(mail_i[elementId]).children().prop('disabled', true);
    } else if (elementClass === 'mail_input' || elementClass === 'mail_select') {
        $(phone[elementId]).children().prop('disabled', true);
        $(mail_s[elementId]).children().prop('disabled', false);
        $(mail_i[elementId]).children().prop('disabled', false);
    }
}