// BAOS_API_2011_01_29_001
function BaosLib()
{
	//////////////////////////////////////////////////
	// Member variables								//
	//////////////////////////////////////////////////
	
	var m_strIpAddr;															// IP address
	var m_IndicationSession = 0;												// Indication session
	var m_IndFormat;															// Format used for indications
	
	var m_bEnableCallbackRespRcvd			= false;							// Disable callback (response received)
	var m_bEnableCallbackIndicationUpdate	= false;							// Disable callback (indication update)
	var m_bEnableCallbackInvalidSettings	= false;							// Disable callback (invalid settings)
	var m_bEnableCallbackTransmitError		= false;							// Disable callback (transmit error)
	
	var m_CallbackRespRcvd;														// Callback for response received
	var m_CallbackIndicationUpdate;												// Callback for indication update
	var m_CallbackInvalidSettings;												// Callback for invalid settings
	var m_CallbackTransmitError;												// Callback for transmit error
	
	//////////////////////////////////////////////////
	// Public functions								//
	//////////////////////////////////////////////////
	
	// This API function sets the IP address to the BAOS library
	this.API_SetIpAddress = function (strIpAddr)
	{
		m_strIpAddr = strIpAddr;												// Set IP address
	};
	
	// This API function sets the callback handler for the responses.
	this.API_SetCallbackRespRcvd = function (strCallback)
	{
		m_CallbackRespRcvd = strCallback;										// Save callback reference
		m_bEnableCallbackRespRcvd = true;										// Enable callback
	};
	
	// This API function sets the callback handler for the indications.
	this.API_SetCallbackIndicationUpdate = function (strCallback)
	{
		m_CallbackIndicationUpdate = strCallback;								// Save callback reference
		m_bEnableCallbackIndicationUpdate = true;								// Enable callback
	};
	
	// This API function sets the callback handler for informing about
	// invalid settings.
	this.API_SetCallbackInvalidSettings = function (strCallback)
	{
		m_CallbackInvalidSettings = strCallback;								// Save callback reference
		m_bEnableCallbackInvalidSettings = true;								// Enable callback
	};
	
	// This API function sets the callback handler for informing about
	// transmission errors.
	this.API_SetCallbackTransmitError = function (strCallback)
	{
		m_CallbackTransmitError = strCallback;									// Save callback reference
		m_bEnableCallbackTransmitError = true;									// Enable callback
	};
	
	// This API function gets server items from the BAOS device.
	this.API_GetServerItem = function (strStartItem, strItemCount)
	{
		var strUrl;																// URL
		
		if((IsIpAddrValid(m_strIpAddr)) &&
		   (IsNumber(strStartItem)) && (IsNumber(strItemCount)))				// If we have a valid IP address and valid parameters
		{
			strUrl = "http://" + m_strIpAddr +
					 "/baos/GetServerItem?ItemStart=" + strStartItem +
					 "&ItemCount=" + strItemCount;								// Prepare URL for GetServerItem
			
			http.request ({
                url: strUrl,
                method: "GET",
                async: true,
                success: function(rsp){
                  OnObjSrvRespRcvd(rsp.data);
                },
                error: function(rsp){
                  console.log("Error description: " + JSON.stringify(rsp, null, 4));
                  OnObjSrvError();
                },
                complete: function(rsp){console.log("GetServerItem done");}
              });
		}
		else																	// Else: We have invalid settings
		{
			OnObjSrvInvalidSettings();											// Call error handler (invalid settings)
		}
	};
	
	// This API function gets datapoint descriptions from the BAOS device.
	this.API_GetDatapointDescription = function (strDatapointStart, strDatapointCount)
	{
		var strUrl;																// URL
		
		if((IsIpAddrValid(m_strIpAddr)) &&
		   (IsNumber(strDatapointStart)) && (IsNumber(strDatapointCount)))		// If we have a valid IP address and valid parameters
		{
			strUrl = "http://" + m_strIpAddr +
					 "/baos/GetDatapointDescription?DatapointStart=" +
					 strDatapointStart + "&DatapointCount="+
					 strDatapointCount;											// Prepare URL for GetDatapointDescription
			
			http.request ({
                url: strUrl,
                method: "GET",
                async: true,
                success: function(rsp){
                  OnObjSrvRespRcvd(rsp.data);
                },
                error: function(rsp){
                  console.log("Error DP description: " + JSON.stringify(rsp, null, 4));
                  OnObjSrvError(rsp.data);
                },
                complete: function(rsp){console.log("API_GetDatapointDescription done");}
              });
		}
		else																	// Else: We have invalid settings
		{
			OnObjSrvInvalidSettings();											// Call error handler (invalid settings)
		}
	};
	
	// This API function gets datapoint description strings from the
	// BAOS device.
	this.API_GetDescriptionString = function (strDatapointStart, strDatapointCount)
	{
		var strUrl;																// URL
		
		if((IsIpAddrValid(m_strIpAddr)) &&
		   (IsNumber(strDatapointStart)) && (IsNumber(strDatapointCount)))		// If we have a valid IP address and valid parameters
		{
			strUrl = "http://" + m_strIpAddr +
					 "/baos/GetDescriptionString?DatapointStart=" +
					 strDatapointStart + "&DatapointCount=" +
					 strDatapointCount;							// Prepare URL for GetDescriptionString
			
			http.request ({
                url: strUrl,
                method: "GET",
                async: true,
                success: function(rsp){
                  OnObjSrvRespRcvd(rsp.data);
                },
                error: function(rsp){
                  console.log("Error get description string: " + JSON.stringify(rsp, null, 4));
                  OnObjSrvError(rsp.data);
                },
                complete: function(rsp){console.log("API_GetDescriptionString done");}
              });
		}
		else																	// Else: We have invalid settings
		{
			OnObjSrvInvalidSettings();											// Call error handler (invalid settings)
		}
	};
	
	// This API function gets datapoint values from the BAOS device.
	this.API_GetDatapointValue = function (strDatapointStart, strDatapointCount, strFormat)
	{
		var strUrl;																// URL
		
		if((IsIpAddrValid(m_strIpAddr)) &&
		   (IsNumber(strDatapointStart)) && (IsNumber(strDatapointCount)))		// If we have a valid IP address and valid parameters
		{
			strUrl = "http://" + m_strIpAddr +
					 "/baos/GetDatapointValue?DatapointStart=" +
					 strDatapointStart + "&DatapointCount=" +
					 strDatapointCount + "&Format=" + strFormat;							// Prepare URL for GetDatapointValule

			http.request ({
                url: strUrl,
                method: "GET",
                async: true,
                success: function(rsp){
                  OnObjSrvRespRcvd(rsp.data);
                },
                error: function(rsp){
                  console.log("Error Get DP Value: " + JSON.stringify(rsp, null, 4));
                  OnObjSrvError(rsp.data);
                },
                complete: function(rsp){console.log("API_GetDatapointValue done");}
              });
		}
		else																	// Else: We have invalid settings
		{
			OnObjSrvInvalidSettings();											// Call error handler (invalid settings)
		}
	};
	
	// This API function sets datapoint values to the BAOS device.
	this.API_SetDatapointValue = function (strDatapoint, strFormat, strCommand, strLength, strValue1, strValue2, strValue3, strValue4, strValue5, strValue6)
	{
		var strUrl;																// URL
		var strValue;															// Value

		//strLength = ConvertLength(strLength);									// Convert given length into integer value
		
		if((IsIpAddrValid(m_strIpAddr)) &&
		   (IsNumber(strDatapoint)) && (IsNumber(strLength)))					// If we have a valid IP address and valid parameters
		{
			switch(strFormat)													// Switch due to format
			{
				//////////////////////////////////////////
				// Formats with 1 value parameter:		//
				//////////////////////////////////////////
				case "RAW":														// Case: Format raw
				case "DPT1":													// Case: Format DPT 1
				case "DPT4":													// Case: Format DPT 4
				case "DPT5":													// Case: Format DPT 5
				case "DPT6":													// Case: Format DPT 6
				case "DPT7":													// Case: Format DPT 7
				case "DPT8":													// Case: Format DPT 8
				case "DPT9":													// Case: Format DPT 9
				case "DPT12":													// Case: Format DPT 12
				case "DPT13":													// Case: Format DPT 13
				case "DPT14":													// Case: Format DPT 14
				case "DPT16":													// Case: Format DPT 16
					strValue = "&Value=" + strValue1;							// Assemble value
					break;

				case "DPT17":													// Case: Format DPT 17
					strValue = "&Scene=" + strValue1;							// Assemble value
					break;
				
				//////////////////////////////////////////
				// Formats with 2 value parameters:		//
				//////////////////////////////////////////
				case "DPT2":													// Case: Format DPT 2
					strValue = "&Control=" + strValue1 +
							   "&Value=" + strValue2;							// Assemble value
					break;
					
				case "DPT3":													// Case: Format DPT 3
					strValue = "&Control=" + strValue1 +
							   "&StepCode=" + strValue2;						// Assemble value
					break;
					
				case "DPT18":													// Case: Format DPT 18
					strValue = "&Control=" + strValue1 +
							   "&Scene=" + strValue2;							// Assemble value
					break;
				
				//////////////////////////////////////////
				// Formats with 3 value parameters:		//
				//////////////////////////////////////////
				case "DPT11":													// Case: Format DPT 11
					strValue = "&Day=" + strValue1 +
							   "&Month=" + strValue2 +
							   "&Year=" + strValue3;							// Assemble value
					break;
				
				//////////////////////////////////////////
				// Formats with 4 value parameters:		//
				//////////////////////////////////////////
				case "DPT10":													// Case: Format DPT 10
					strValue = "&Weekday=" + strValue1 +
							   "&Hour=" + strValue2 +
							   "&Minute=" + strValue3 +
							   "&Second=" + strValue4;							// Assemble value
					break;
				
				//////////////////////////////////////////
				// Formats with 6 value parameters:		//
				//////////////////////////////////////////
				case "DPT15":													// Case: Format DPT 15
					strValue = "&Code=" + strValue1 +
							   "&Index=" + strValue2 +
							   "&FlagError=" + strValue3 +
							   "&FlagPermission=" + strValue4 +
							   "&FlagReadDirection=" + strValue5 +
							   "&FlagEncrypted=" + strValue6;					// Assemble value
					break;
				
				// Not yet suopported by BAOS 771:
				case "DPT19":													// Case: Format DPT 19
				case "DPT20":													// Case: Format DPT 20
					break;
			}
			strUrl = "http://" + m_strIpAddr +
					 "/baos/SetDatapointValue?Datapoint=" + strDatapoint +
					 "&Format=" + strFormat + "&Command=" + strCommand +
					 "&Length=" + strLength + strValue;
		
			console.log("Anfrage: " + strUrl);
			http.request ({
                url: strUrl,
                method: "GET",
                async: true,
                success: function(rsp){
                  OnObjSrvRespRcvd(rsp.data);
                },
                error: function(rsp){
                  console.log("Error Set DP Value: " + JSON.stringify(rsp, null, 4));
                  OnObjSrvError(rsp.data);
                },
                complete: function(rsp){console.log("API_SetDatapointValue done");}
              });
		
		}
		else																	// Else: We have invalid settings
		{
			OnObjSrvInvalidSettings();											// Call error handler (invalid settings)
		}
	};
	
	// This API function gets parameter bytes (set by the ETS parameter
	// dialogue) from the BAOS device.
	this.API_GetParamByte = function (strByteStart, strByteCount)
	{
		var strUrl;																// URL
		
		if((IsIpAddrValid(m_strIpAddr)) &&
		   (IsNumber(strByteStart)) && (IsNumber(strByteCount)))				// If we have a valid IP address and valid parameters
		{
			strUrl = "http://" + m_strIpAddr +
					 "/baos/GetParameterByte?ByteStart=" + strByteStart +
					 "&ByteCount=" + strByteCount;								// Prepare URL for GetParamByte
			
			http.request ({
                url: strUrl,
                method: "GET",
                async: true,
                success: function(rsp){
                  OnObjSrvRespRcvd(rsp.data);
                },
                error: function(rsp){
                  console.log("Error get param byte: " + JSON.stringify(rsp, null, 4));
                  OnObjSrvError(rsp.data);
                },
                complete: function(rsp){console.log("API_GetParamByte done");}
              });
		}
		else																	// Else: We have invalid settings
		{
			OnObjSrvInvalidSettings();											// Call error handler (invalid settings)
		}
	};
	
	// This API function checks the validity of a IP address.
	this.API_IsIpAddrValid = function (strIpAddrToValidate)
	{
		return IsIpAddrValid(strIpAddrToValidate);
	};
	
	// This API function starts the indication listener.
	this.API_StartIndicationListener = function (strFormat)
	{
		var strUrl;																// URL
		
		m_IndFormat = strFormat;												// Set format used for indications

		if(m_IndicationSession != 0)											// If we already have an indication session
		{
			return false;														// Return error
		}

		if(IsIpAddrValid(m_strIpAddr))										// If we have a valid IP address
		{
			strUrl = "http://" + m_strIpAddr +
					 "/baos/StartIndicationSession";							// Prepare URL for StartIndicationSession
			
			http.request ({
                url: strUrl,
                method: "GET",
                async: true,
                success: function(rsp){
                  if((rsp.data.Result == true) &&
					   (rsp.data.Service == "StartIndicationSession"))			// If indication session could be started
					{
						m_IndicationSession = rsp.data.Data.SessionId;			// Save indication session ID
						GetIndication();										// Start getting indications
					}
                },
                error: function(rsp){
                  console.log("Error starting indication listener: " + JSON.stringify(rsp, null, 4));
                  OnObjSrvError(rsp.data);
                },
                complete: function(rsp){console.log("API_StartIndicationListener done");}
              });
			
			return true;														// Return success
		}
		else																	// Else: We have invalid settings
		{
			OnObjSrvInvalidSettings();											// Call error handler (invalid settings)
		}
		
		return false;															// Return error
	};
	
	// This API function stops the indication listener.
	this.API_StopIndicationListener = function ()
	{
		var strUrl;																// URL
		
		if(m_IndicationSession == 0)											// If no indication session is available
		{
			return false;														// Return error
		}
		
		if(IsIpAddrValid(m_strIpAddr))										// If we have a valid IP address
		{
			strUrl = "http://" + m_strIpAddr +
					 "/baos/StopIndicationSession?SessionId=" +
					 m_IndicationSession;										// Prepare URL for StopIndicationSession
			
			http.request ({
                url: strUrl,
                method: "GET",
                async: true,
                success: function(rsp){
                  if((rsp.data.Result == true) &&
					   (rsp.data.Service == "StopIndicationSession"))				// If indication session could be stopped
					{
						m_IndicationSession = 0;								// Delete indication session
					}
                },
                error: function(rsp){
                  console.log("Error stop indication listener: " + JSON.stringify(rsp, null, 4));
                  OnObjSrvError(rsp.data);
                },
                complete: function(rsp){console.log("API_StopIndicationListener done");}
              });
			
			return true;														// Return success
		}
		else																	// Else: We have invalid settings
		{
			OnObjSrvInvalidSettings();											// Call error handler (invalid settings)
		}
		
		return false;															// Return error
	};
	
	
	//////////////////////////////////////////////////
	// Private functions							//
	//////////////////////////////////////////////////
	
	// This private function checks the validity of a IP address.
	function IsIpAddrValid(strIpAddrToValidate)
	{
		var strIpAddrSub = new Array();											// Array used for IP address
		strIpAddrSub = strIpAddrToValidate.split(".");							// Split IP address into sub parts
		
		if(strIpAddrSub.length != 4)											// If IP address has not 4 sub parts
		{
			return false;														// Return error
		}
		
		for (nIndex = 0; nIndex <strIpAddrSub.length; nIndex++)				// Loop to handle every IP address sub part
		{
			if(!IsNumber(strIpAddrSub[nIndex]))									// If it is not a number
			{
				return false;													// Return error
			}
			
			var sub = parseInt(strIpAddrSub[nIndex], 10);						// Convert to integer
			if ((isNaN(sub)) || (sub <0) || (sub >255))							// If it is out of range
			{
				return false;													// Return error
			}
		}
		
		return true;															// Return success
	}
	
	// This private function checks, if a string contains only numbers.
	function IsNumber(strToValidate)
	{
		for(position=0; position<strToValidate.length; position++)			// Loop to handle every position in string
		{
			var chr = strToValidate.charAt(position);							// Get character
			
			if((chr < "0") || (chr > "9"))										// If character is not a number
			{
				return false;													// Return: Character is not a number
			}
		}
		
		return true;															// Return: Character is a number
	}
	
	// This private function does a length conversion.
	function ConvertLength(strLength)
	{
		switch(strLength)														// Switch due to length
		{
			case "1 Bit":														// Case: 1 bit
			case "2 Bit":														// Case: 2 bit
			case "4 Bit":														// Case: 4 bit
			case "1 Byte":														// Case: 1 byte
				return 1;														// Return: Length 1 byte
			
			case "2 Byte":														// Case: 2 byte
				return 2;														// Return: Length 2 byte
				
			case "3 Byte":														// Case: 3 byte
				return 3;														// Return: Length 3 byte
				
			case "4 Byte":														// Case: 4 byte
				return 4;														// Return: Length 4 byte
				
			case "6 Byte":														// Case: 6 byte
				return 6;														// Return: Length 6 byte
				
			case "8 Byte":														// Case: 8 byte
				return 8;														// Return: Length 8 byte
				
			case "14 Byte":														// Case: 14 byte
				return 14;														// Return: Length 14 byte
			
			default:
				return 0;														// Return error
		}
	}
	
	// This private function creates and evaluates a "get indication" for the BAOS.
	function GetIndication()
	{
		var strUrl;																// URL
		
		if(m_IndicationSession == 0)											// If no indication session is available
		{
			return false;														// Return error
		}
		
		if(IsIpAddrValid(m_strIpAddr))										// If we have a valid IP address
		{
			strUrl = "http://" + m_strIpAddr +
					 "/baos/GetIndication?SessionId=" +
					 m_IndicationSession + "&Timeout=20" +
					 "&Format=" + m_IndFormat;									// Prepare URL for GetIndication
			
			http.request ({
                url: strUrl,
                method: "GET",
                async: true,
                success: function(rsp){
                  if(rsp.data.Result == false)									// If we got an error
					{
						if(rsp.data.Error == "IndTimeout")						// If we have a timeout
						{
							if(m_IndicationSession != 0)						// If indication session is valid
							{
								GetIndication();								// Try to get new indication
							}
						}
					}

					if(rsp.data.Service == "GetIndication")						// If we have a GetIndication response
					{
						if(rsp.data.Result == true)								// If we got an indication
						{
							OnIndicationUpdate(rsp.data);						// Indication update
							
							if(m_IndicationSession != 0)						// If indication session is valid
							{
								GetIndication();								// Try to get new indication
							}
						}
					}
                },
                error: function(rsp){
                  console.log("Error get indication: " + JSON.stringify(rsp, null, 4));
                  OnObjSrvError(rsp.data);
                },
                complete: function(rsp){console.log("GetIndication done");}
              });
			
			return true;														// Return success
		}
		else																	// Else: We have invalid settings
		{
			OnObjSrvInvalidSettings();											// Call error handler (invalid settings)
		}
		
		return false;															// Return error
	}
	
	// This private function calls the response handler, if available.
	function OnObjSrvRespRcvd(dataObjSrvResp)
	{
		if(m_bEnableCallbackRespRcvd == true)									// If callback is enabled
		{
			m_CallbackRespRcvd(dataObjSrvResp);									// Call callback function
		}
	}
	
	// This private function calls the indication handler, if available.
	function OnIndicationUpdate(dataIndUpdate)
	{
		if(m_bEnableCallbackIndicationUpdate == true)							// If callback is enabled
		{
			m_CallbackIndicationUpdate(dataIndUpdate);							// Call callback function
		}
	}
	
	// This private function calls the handler for invalid settings,
	// if available.
	function OnObjSrvInvalidSettings()
	{
		if(m_bEnableCallbackInvalidSettings == true)							// If callback is enabled
		{
			m_CallbackInvalidSettings();										// Call callback function
		}
	}
	
	// This private function calls the handler for errors, if available.
	function OnObjSrvError(rsp)
	{
		if(m_bEnableCallbackTransmitError == true)								// If callback is enabled
		{
			m_CallbackTransmitError(rsp);										// Call callback function
		}
	}
}
