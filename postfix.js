function interviewFailedPostFix() {
	console.log("##---------------------INTERVIEW-HAS-FAILED--------------------------##");
}

function interviewSuccessfulPostFix(deviceData, instanceId, commandClassId) {
	console.log("##---------------------INTERVIEW-SUCCESSFUL--------------------------##");
	
	// I've tried this with JSON structure first
	var devices = {
		'316' : {
			'2': { 
				'13': {	// Philio Vision 1B
					'112': { // CC: Configuration
						set: //'Set(7,18,1)'
						{
							param: 7,
							value: 18,
							sizeInByte: 1
						}
					},
					'113': { //CC: Alarm
						hide: true
					}
				},
				'12': { // Philio Vision 1A
					'112': { // CC: Configuration
						set: //'Set(7,18,1)'
						{
							param: 7,
							value: 18,
							sizeInByte: 1
						}
					},
					'113': { //CC: Alarm
						hide: true
					}
				}
			}
		},
		'280': { // TKBHome
			'514':{
				'1553':{ // Schuko Plug - TZ67G
					'119': { //CC: NodeNaming
						set: {
							name: '',
							location: ''
						}
					}
				}
			}
		}
	};

	var create = true;
	
	if(deviceData && !!deviceData){
		var mId = deviceData.data.manufacturerId.value;
		var mPT = deviceData.data.manufacturerProductType.value;
		var mPId = deviceData.data.manufacturerProductId.value;
		var ccConfig;
		
		// check if device is listed above
		if(devices[mId]){
			if(devices[mId][mPT]){ 
				if(devices[mId][mPT][mPId]){ 
					if(devices[mId][mPT][mPId][commandClassId]){  
						ccConfig = devices[mId][mPT][mPId][commandClassId];

						// don't create device
						if(ccConfig.hasOwnProperty('hide')){
							if(ccConfig.hide){
								create = false;
								console.log('##--------------------- HIDE: '+mId+'.'+mPT+'.'+mPId+'.'+commandClassId+'--------------------------##');
							}
						}
						
						// set CC values	
						if(deviceData.instances[instanceId].commandClasses[commandClassId] && ccConfig.hasOwnProperty('set')){
							var set = ccConfig.set;		
							
							console.log('##--------------------- CHANGE VALUE ... --------------------------##');
							//deviceData.instances[instanceId].commandClasses[commandClassId].set;
							deviceData.instances[instanceId].commandClasses[commandClassId].Set(ccConfig.set.param, ccConfig.set.value, ccConfig.set.sizeInByte);
							console.log('##---------------------'+mId+'.'+mPT+'.'+mPId+'.'+commandClassId+'--------------------------##');
						}
					}
				}
			}
		}
		return create;
	}
}