function modulePostRender() {

	$.ajax("/ZAutomation/api/v1/profiles")
		.done(function(profilesResponse) {
			var moduleId = parseInt(window.location.href.substring(window.location.href.lastIndexOf("/") + 1));
			if (!isNaN(moduleId)) {
				$.ajax("/ZAutomation/api/v1/instances/" + moduleId)
					.done(function(response) {
						if (typeof response.data.params.mail_to_select != 'undefined') {
							fillDropDown(profilesResponse.data, response.data.params.mail_to_select);
						}
					});
			} else {
				fillDropDown(profilesResponse.data, false);
			}
		})
		.fail(function() {
			showInputField();
		});
};

function fillDropDown(profiles, selectedMail) {
	var select = $("div[data-alpaca-field-name='mail_to_select']").find('select');
	var added = false;
	profiles.forEach(function(singleProfile) {
		if ((typeof singleProfile.email != 'undefined') && (singleProfile.email != "")) {
			select.append($('<option></option>').val(singleProfile.email).html(singleProfile.email));
			added = true;
		}
	});
	if (!added){
		showInputField();
	} else {
		if (selectedMail) {
			select.val(selectedMail);
		}

		if (!$("div[data-alpaca-field-name='mail_to_input'] input[name='mail_to_input']").val()) {

			$("div[data-alpaca-field-name='allow_input'] input[name='allow_input']").prop('checked', false);
		} else {
			$("div[data-alpaca-field-name='allow_input'] input[name='allow_input']").prop('checked', true);
			$("div[data-alpaca-field-name='mail_to_input']").show();
		}

		$("div[data-alpaca-field-name='mail_to_input'] label").hide();
		$("div[data-alpaca-field-name='mail_to_select']").show();		
	}
};

function showInputField() {
	$("div[data-alpaca-field-name='mail_to_select']").hide();
	$("div[data-alpaca-field-name='allow_input'] input[name='allow_input']").prop('checked', true);
	$("div[data-alpaca-field-name='allow_input']").css('visibility', 'hidden');
	$("div[data-alpaca-field-name='mail_to_input']").show();
};