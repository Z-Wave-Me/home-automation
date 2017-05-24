// Converts IntelHex into binary 128 kB file
function IntelHex2bin(hex) {
	function hex2dec(digits) {
		return parseInt(digits, 16);
	}

	var BIN_SIZE = 128*1024;

	var DATA = 0,
		END_OF_FILE = 1,
		EXT_SEGMENT_ADDR = 2,
		START_SEGMENT_ADDR = 3,
		EXT_LINEAR_ADDR = 4,
		START_LINEAR_ADDR = 5;

	var EMPTY_VALUE = 0xFF;

	var LINE_MIN_LENGTH = 11;
		
	var hexLines = hex.split("\n");
	
	var bin = new Uint8Array(BIN_SIZE);
	
	// Init binary array
	for (var i = 0; i < BIN_SIZE; i++) {
		bin[i] = EMPTY_VALUE;
	}
	
	// Start processing
	var bankOffset = 0, maxOffset = 0;
	var end = false;
	for (var i = 0; i < hexLines.length && !end; i++) {
		var line = hexLines[i];
		
		line = line.replace(/\r/g, "");
		
		if (line.length < LINE_MIN_LENGTH) throw("Hex file contains too short line " + i + " - " + line);
		if (line.substr(0, 1) !== ":") throw("Line " + i + " should start with : - " + line);

		var dataLength = hex2dec(line.substr(1, 2));
		if (dataLength > 32) throw("Data length should not exceed 32 bytes (line " + i + ") - " + line);
		if (line.length !== LINE_MIN_LENGTH + dataLength * 2) throw("Data length do not match line length: " + i + " - " + line);
		
		var crc = 0;
		for (var n = 0; n < 1 + 2 + 1 + dataLength + 1; n++) {
			crc += hex2dec(line.substr(1 + n * 2, 2));
		}
		crc &= 0xff;
		if (crc !== 0) throw("CRC do not match in line " + i + " - " + line);
		
		var offset = hex2dec(line.substr(3, 4));
		var recType = hex2dec(line.substr(7, 2));
		
		switch (recType) {
			case DATA:
				for (var j = 0; j < dataLength; j++) {
					if (bankOffset + offset + j > BIN_SIZE) throw("Address " + (bankOffset + offset + j) + " is beyond " + BIN_SIZE + " - line " + i + " - " + line);
					bin[bankOffset + offset + j] = hex2dec(line.substr(LINE_MIN_LENGTH - 2 + 2*j, 2));
					if (maxOffset < bankOffset + offset + j) {
						maxOffset = bankOffset + offset + j;
					}
				}
				break;
			case END_OF_FILE:
				end = true;
				break;
			case EXT_LINEAR_ADDR:
				bankOffset = hex2dec(line.substr(LINE_MIN_LENGTH - 2, 4))*256*256;
				break;
		}
	}
	
	var bin_sliced = new Uint8Array(maxOffset + 1); // size = last addr + 1
	
	for (var k = 0; k < maxOffset; k++) {
		bin_sliced[k] = bin[k];
	}
	
	return bin_sliced;
}
