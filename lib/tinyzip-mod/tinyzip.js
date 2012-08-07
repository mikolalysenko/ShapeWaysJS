var fs = require('fs')
	, zlib = require('zlib')
	, path = require('path')
	, Stream = require('stream')
	, util = require('util')
	, _ = require('underscore')
	;

var ZipFile = function (opts) {
	this.defOpts = _.extend({rootpath:false, utf8:true, fast:true, compress:{level:-1}},opts);
	this.files = [];
}

ZipFile.prototype.addFile = function (file) {
	var meta = _.extend(_(this.defOpts).clone(),file);
	this.files.push(meta);
}

ZipFile.prototype.getZipStream =  function  () {
	return new ZipFileStream(this);
}

ZipFile.prototype._getDateTimeHeaders = function (date) {
	var dosTime, dosDate;
	
	dosTime = date.getHours();
	dosTime = dosTime << 6;
	dosTime = dosTime | date.getMinutes();
	dosTime = dosTime << 5;
	dosTime = dosTime | date.getSeconds() / 2;
	
	dosDate = date.getFullYear() - 1980;
	dosDate = dosDate << 4;
	dosDate = dosDate | (date.getMonth() + 1);
	dosDate = dosDate << 5;
	dosDate = dosDate | date.getDate();
	
	return {
		date: dosDate,
		time: dosTime
	};
}

ZipFile.prototype._getFileHeader = function (file) {
	var dt = this._getDateTimeHeaders(new Date());
	
	var header = new Buffer(26);
	var idx = 0;
	
	// version + bit flag
	idx = writeBytes(header, idx, [ 0x14, 0x00]);
	// compression method @todo multiple methods, this is STORE
	// header.writeUInt16LE(parseInt("0000100000000000",2),idx); idx+=2;
	var flags =0x0800;
	if (file.meta.utf8)
		flags |= 0x0800;	
	if (file.meta.fast)
		flags |= 0x0008;
	header.writeUInt16LE(flags,idx); idx+=2;	
	idx = writeBytes(header, idx, file.compressIndicator);
	// file time & date
	header.writeUInt16LE(parseInt(dt.time), idx); idx+=2 
	header.writeUInt16LE(parseInt(dt.date), idx); idx+=2
	// crc, and sizes are set afterwards
	
	// crc32
	header.writeInt32LE(file.crc32, idx); idx+=4;
	// compressed size
	header.writeInt32LE(file.compressSize, idx); idx+=4;
	// uncompressed size
	header.writeInt32LE(file.size, idx); idx+=4;
	// file name length
	header.writeInt16LE(file.name.length, idx); idx+=2
	// add xtra un 
	if (file.meta.utf8) {
		var idx1 = idx;
		file.uc = new Buffer(2+2+1+4+file.name.length);
		idx = 0;
		file.uc.writeInt16LE(0x7075,idx); idx+2;
		file.uc.writeInt16LE(file.uc.length,idx); idx+=2;
		file.uc.writeInt8(1, idx); idx++;
		file.uc.writeInt32LE(this._crc32(file.name),idx); idx+=4;
		writeBytes(file.uc,idx, file.name);
		header.writeInt16LE(file.uc.length,idx1);
	} else {
		header.writeInt16LE(0,idx);
	}
	return header;
}	

var table = [ 0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA, 0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3, 0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988, 0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91, 0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE, 0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7, 0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC, 0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5, 0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172, 0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B, 0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940, 0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59, 0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116, 0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F, 0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924, 0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D, 0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A, 0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433, 0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818, 0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01, 0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E, 0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457, 0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C, 0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65, 0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2, 0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB, 0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0, 0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7CC9, 0x5005713C, 0x270241AA, 0xBE0B1010, 0xC90C2086, 0x5768B525, 0x206F85B3, 0xB966D409, 0xCE61E49F, 0x5EDEF90E, 0x29D9C998, 0xB0D09822, 0xC7D7A8B4, 0x59B33D17, 0x2EB40D81, 0xB7BD5C3B, 0xC0BA6CAD, 0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A, 0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683, 0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8, 0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1, 0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE, 0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7, 0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC, 0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5, 0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252, 0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B, 0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60, 0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79, 0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236, 0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F, 0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04, 0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D, 0x9B64C2B0, 0xEC63F226, 0x756AA39C, 0x026D930A, 0x9C0906A9, 0xEB0E363F, 0x72076785, 0x05005713, 0x95BF4A82, 0xE2B87A14, 0x7BB12BAE, 0x0CB61B38, 0x92D28E9B, 0xE5D5BE0D, 0x7CDCEFB7, 0x0BDBDF21, 0x86D3D2D4, 0xF1D4E242, 0x68DDB3F8, 0x1FDA836E, 0x81BE16CD, 0xF6B9265B, 0x6FB077E1, 0x18B74777, 0x88085AE6, 0xFF0F6A70, 0x66063BCA, 0x11010B5C, 0x8F659EFF, 0xF862AE69, 0x616BFFD3, 0x166CCF45, 0xA00AE278, 0xD70DD2EE, 0x4E048354, 0x3903B3C2, 0xA7672661, 0xD06016F7, 0x4969474D, 0x3E6E77DB, 0xAED16A4A, 0xD9D65ADC, 0x40DF0B66, 0x37D83BF0, 0xA9BCAE53, 0xDEBB9EC5, 0x47B2CF7F, 0x30B5FFE9, 0xBDBDF21C, 0xCABAC28A, 0x53B39330, 0x24B4A3A6, 0xBAD03605, 0xCDD70693, 0x54DE5729, 0x23D967BF, 0xB3667A2E, 0xC4614AB8, 0x5D681B02, 0x2A6F2B94, 0xB40BBE37, 0xC30C8EA1, 0x5A05DF1B, 0x2D02EF8D ];
function Crc32 () {
    var crc = 0 ^ -1;
    
    this.processBuffer = function (buf) {
		for (var ix = 0; ix < buf.length; ix++) {
			var offset = (crc ^ buf[ix]) & 0xFF;
			crc = (crc >>> 8) ^ table[offset];
		}
		return this;
	}
	
	this.getCrc32 = function () {
		return crc ^ -1;
	}
}

ZipFile.prototype._crc32 = function (buf) {
	return (new Crc32()).processBuffer(buf).getCrc32();
}

function writeBytes (target, idx, data) {
    for (var ix = 0; ix < data.length; ix++, idx++) {
        target.writeUInt8(data[ix],idx);
    }
    return idx;
}

var ZipFileStream = function (zipFile) {
	var self = this;
	this.readable = true;
	var state = "FILE_START";
	var findex = 0;
	var fileOffset = 0;
	var dirOffset = 0
	var paused = false;
	var file = null;
	var directory = [];
	var pst = null;
	var next = null;
	var fast = true;
	
	this.pause = function () {
		paused = true;
		if (pst) 
			pst.pause();
	}
	
	this.resume = function resume() {
		paused = false;
		if (pst)
			pst.resume()
		else 
			pumpData();
	}
	
	function error(err) {
		self.readable = false;
		self.emit('error',err);
		self.emit('close');
	}
	
	function pumpData() {
		if (!self.readable || paused || pst) return;
		if (state=="FILE_START") {
			if (findex < zipFile.files.length) {
				file = {size:0,crc32:0,compressSize:0,meta:zipFile.files[findex]};
				
				if(file.meta.data) {
				  file.meta.fast = false;
				
			    state = "FILE_COMPRESS";
			    file.data = file.meta.data;
			    file.size = file.meta.data.length;
			    file.crc32 = zipFile._crc32(file.data);
			  } else if(file.meta.fast) {
				  state = "FILE_SENDHEADER";
				} else {
				  state = "FILE_READ";
				}
			} else {
				state="FILES_DIR";
			}
			if (!paused) 
				process.nextTick(pumpData);
		} else if (state=="FILES_DIR") {
			if (directory.length==0) {
				state = "FILES_END"
			} else {
				var dir = directory.shift();
				self.emit("data", dir);
				dirOffset+=dir.length;
			}
			if (!paused) 
				process.nextTick(pumpData);
		} else if (state=="FILES_END") {
            var dirEnd = new Buffer(8 + 2 + 2 + 4 + 4 + 2);
            var idx = 0;
            idx = writeBytes(dirEnd, idx, [0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00]);
            // total number of entries
            dirEnd.writeInt16LE(zipFile.files.length, idx); idx+=2;
            dirEnd.writeInt16LE(zipFile.files.length, idx); idx+=2;
            // directory lengths
            dirEnd.writeInt32LE(dirOffset,idx); idx+=4;
            // file lengths
            dirEnd.writeInt32LE(fileOffset,idx); idx+=4
            // and the end of file
            idx = writeBytes(dirEnd, idx, [0x00, 0x00]); 		
            self.emit("data",dirEnd);
			self.readable = false;
			self.emit("end");
		} else if (state=="FILE_READ") {
		  fs.readFile(zipFile.files[findex].file, function (err, data) {
			  if (err) return error(err);
			  state = "FILE_COMPRESS";
			  file.data = data;
			  file.size = data.length;
			  file.crc32 = zipFile._crc32(file.data);
			  if (!paused) 
				  process.nextTick(pumpData);
		  })
		} else if (state=="FILE_COMPRESS") {
			if (file.meta.compress) {
				zlib.deflateRaw(file.data, function (err, data) {
					if (err) return error(err) ;
					file.data = data;
					file.compressSize = data.length;
					file.compressCrc32 = zipFile._crc32(file.data);
					state = "FILE_SENDHEADER";
					if (!paused) 
						process.nextTick(pumpData);
				})
			} else {
				file.compressSize = data.length;
				file.compressCrc32 = zipFile._crc32(file.data);
				state = "FILE_SENDHEADER";
				if (!paused) 
					process.nextTick(pumpData);
			}
		} else if (state=="FILE_SENDHEADER") {
			if (!file.meta.rootpath)
				file.name = new Buffer(file.meta.file,  file.meta.utf8?'utf8':'ascii');
			else
				file.name = new Buffer(path.relative(file.meta.rootpath,file.meta.file), file.meta.utf8?'utf8':'ascii')
			
			if (file.meta.compress)
				file.compressIndicator = [ 0x08, 0x00 ];
			else
				file.compressIndicator = [ 0x00, 0x00 ];
			self.emit("data", new Buffer([0x50, 0x4b, 0x03, 0x04]));	
			file.header = zipFile._getFileHeader(file); 		
			self.emit("data", file.header)
			self.emit("data", file.name);
			if (file.meta.utf8) 
				self.emit("data", file.uc);
			state = "FILE_SENDDATA";
			if (!paused) 
				process.nextTick(pumpData);
		} else if (state=="FILE_SENDDATA") {
			if (file.meta.fast) {
			  var fi = fs.createReadStream(file.meta.file);
				var cw = fi;
				pst = cw;
				if (file.meta.compress) {
					cw = zlib.createDeflateRaw(file.meta.compress);
					pst = cw;
					fi.pipe(cw);	
				};
				var crc32o = new Crc32();
				var crc32i = new Crc32();
				
				var csize = 0; var size = 0;
				fi.on('data', function(data) {
					crc32o.processBuffer(data);
					size+=data.length;
				})
				fi.on('end', function(data) {
					if (data) {
						crc32o.processBuffer(data);
						size+=data.length;
					}
				})
				cw.on('end', function (data) {
					if (data) {
						crc32i.processBuffer(data);
						self.emit("data",data);
						csize+=data.length;
					}
					state="FILE_SENDSIGN";
					file.compressSize = csize;
					file.size = size;
					file.crc32 = crc32o.getCrc32();
					file.compressCrc32 = crc32i.getCrc32();
					file.header = zipFile._getFileHeader(file); 		
					pst = null;
					if (!paused) 
						process.nextTick(pumpData);
				})
				cw.on('data', function(data) {
					crc32i.processBuffer(data);
					self.emit("data",data);
					csize+=data.length;
				})
			} else {
				self.emit("data", file.data);
				state="FILE_SENDSIGN";
				if (!paused) 
					process.nextTick(pumpData);
			}
		} else if (state=="FILE_SENDSIGN") {
			var eof = new Buffer(16);
			var idx = 0; 
			idx = writeBytes(eof, idx, [ 0x08, 0x07, 0x4b, 0x50 ]);
            eof.writeInt32LE(file.compressCrc32,idx); idx+=4;
			eof.writeInt32LE(file.compressSize,idx); idx+=4;
			eof.writeInt32LE(file.size,idx); idx+=4;
			self.emit("data", eof);
			
            // now create dir
			var dirBuffer = new Buffer(4 + 2 + file.header.length + 6 + 4 + 4 + file.name.length+(file.meta.utf8?file.uc.length:0));
			idx = 0;
			idx = writeBytes(dirBuffer, idx, [0x50, 0x4b, 0x01, 0x02]);
			idx = writeBytes(dirBuffer, idx, [0x14, 0x00]);
			idx = writeBytes(dirBuffer, idx, file.header);
			// comment length, disk start, file attributes
			idx = writeBytes(dirBuffer, idx, [0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
			// external file attributes, @todo
			idx = writeBytes(dirBuffer, idx, [0x00, 0x00, 0x00, 0x00]);
			// relative offset of local header
			dirBuffer.writeInt32LE(fileOffset,idx); idx+=4;
			// file name
			idx = writeBytes(dirBuffer, idx, file.name);
			if (file.meta.utf8) 
				idx = writeBytes(dirBuffer, idx, file.uc);
			directory.push(dirBuffer);
			fileOffset += 4 + file.header.length + file.name.length + (file.meta.utf8?file.uc.length:0) + file.compressSize + 16;
			findex++;
			state = "FILE_START";
			if (!paused) 
				process.nextTick(pumpData);
		} 
	}
	
	pumpData();
}

util.inherits(ZipFileStream, Stream);

module.exports.TinyZip = ZipFile
