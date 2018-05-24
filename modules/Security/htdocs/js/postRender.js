function modulePostRender(control) {
	var id = 0;
	var notificationSilentAlarm, notificationAlarm, notificationArm, notificationDisarm, notificationClean;

	notificationSilentAlarm = control.childrenByPropertyId["silentAlarms"].children[1];
	notificationAlarm = control.childrenByPropertyId["alarms"].children[1];
	notificationArm = control.childrenByPropertyId["armConfirm"].children[1];
	notificationDisarm = control.childrenByPropertyId["disarmConfirm"].children[1];
	notificationClean = control.childrenByPropertyId["clean"].children[1];

	if (typeof notificationSilentAlarm !== 'undefined' && typeof notificationAlarm !== 'undefined' && typeof notificationArm !== 'undefined'  && typeof notificationDisarm !== 'undefined' && typeof notificationClean !== 'undefined' ) {
		$.ajax("/ZAutomation/api/v1/instances/MailNotifier")
			.done(function (response) {
				if (typeof response.data[0].active !== 'undefinded' && response.data[0].active === true) {
					$.ajax("/ZAutomation/api/v1/profiles")
						.done(function (profilesResponse) {
							var moduleId = parseInt(window.location.href.substring(window.location.href.lastIndexOf("/") + 1));

							if (!isNaN(moduleId)) {
								$.ajax("/ZAutomation/api/v1/instances/" + moduleId)
									.done(function (response) {
										if (typeof response.data.params.silentAlarms.notification !== 'undefinded') {
											var mail = response.data.params.silentAlarms.notification.target;
											if (typeof mail !== 'undefined' && mail.search('@') > 0) {
												fillDropDown(profilesResponse.data, mail, 0);
											} else if (typeof response.data.params.silentAlarms.notification.mail_to_input === 'undefined') {
												fillDropDown(profilesResponse.data, false, 0);
											}
										}
										if (typeof response.data.params.alarms.notification !== 'undefinded') {
											var mail = response.data.params.alarms.notification.target;
											if (typeof mail !== 'undefined' && mail.search('@') > 0) {
												fillDropDown(profilesResponse.data, mail, 1);
											} else if (typeof response.data.params.alarms.notification.mail_to_input === 'undefined') {
												fillDropDown(profilesResponse.data, false, 1);
											}
										}
										if (typeof response.data.params.armConfirm.notification !== 'undefinded') {
											var mail = response.data.params.armConfirm.notification.target;
											if (typeof mail !== 'undefined' && mail.search('@') > 0) {
												fillDropDown(profilesResponse.data, mail, 2);
											} else if (typeof response.data.params.armConfirm.notification.mail_to_input === 'undefined') {
												fillDropDown(profilesResponse.data, false, 2);
											}
										}
										if (typeof response.data.params.disarmConfirm.notification !== 'undefinded') {
											var mail = response.data.params.disarmConfirm.notification.target;
											if (typeof mail !== 'undefined' && mail.search('@') > 0) {
												fillDropDown(profilesResponse.data, mail, 3);
											} else if (typeof response.data.params.disarmConfirm.notification.mail_to_input === 'undefined') {
												fillDropDown(profilesResponse.data, false, 3);
											}
										}
										if (typeof response.data.params.clean.notification !== 'undefinded') {
											var mail = response.data.params.clean.notification.target;
											if (typeof mail !== 'undefined' && mail.search('@') > 0) {
												fillDropDown(profilesResponse.data, mail, 4);
											} else if (typeof response.data.params.clean.notification.mail_to_input === 'undefined') {
												fillDropDown(profilesResponse.data, false, 4);
											}
										}
									});
							}
							else {
								fillDropDown(profilesResponse.data, false, 0);
								fillDropDown(profilesResponse.data, false, 1);
								fillDropDown(profilesResponse.data, false, 2);
								fillDropDown(profilesResponse.data, false, 3);
								fillDropDown(profilesResponse.data, false, 4);
							}
					})
					.fail(function () {
					});
				} else {
					$(".mail_input").parent().append('<div class="alert alert-warning">'+control.data.mail_helper+'</div>');
					$(".mail_input").hide();					
				}
			})
			.fail(function () {
				$(".mail_input").parent().append('<div class="alert alert-warning">'+control.data.mail_helper+'</div>');
				$(".mail_input").hide();
			});
	}
}

function fillDropDown(profiles, selectedMail, notificationID) {
	var select = $(".target_select").find('select');
	var added = false;

	profiles.forEach(function (singleProfile) {
		if ((typeof singleProfile.email !== 'undefined') && (singleProfile.email !== "")) {
			if (singleProfile.email === selectedMail) {
				$(select[notificationID]).append($('<option></option>').val(singleProfile.email).html(singleProfile.email));
			} else {
				$(select[notificationID]).append($('<option></option>').val(singleProfile.email).html(singleProfile.email));
			}
			added = true;
		}
	});

	if (!added){
		$(".mail_input").show();
	} else {
		if (selectedMail) {
			$(select[notificationID]).val(selectedMail);
		}

		$(".mail_input").hide();
	}
}
