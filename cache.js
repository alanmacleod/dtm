// Module   cache.js
// Author   amacleod
// About    a cached file manager. maintains a number of files in memory, max files defined in config.json.
//          used here specifically for .hgt files to optimise processing but can be extracted as a generic file cache
//
//          Note: amac - rewritten as a proper Class/Object 10-Sep-2014

// Exports
module.exports = CacheDTM;

// Imports
var path    = require('path');

function CacheDTM(size)
{
    var that = this;
    this.cacheData = [];
    this.MAX_SIZE = 4;

    if (size) that.MAX_SIZE = size;

    this.cache = function(fpath)
    {
        var file = path.basename(fpath);
        var f = file.toUpperCase();

        var slot = that._exists(f);

        if (slot > -1)
        {
            return slot;
        } else {
            var s = that._getFreeSlot();
            that.cacheData[s] = {fileName:f, filePath:fpath, timeLast:(new Date()).getTime(), data: null};
            that._loadIntoCache(that.cacheData[s]);   // load the complete file
            return s;
        }
    }

    this.readEntry = function (cacheSlot, x,y)
    {
        var offset  = y * (1201 * 2) + (x * 2);
        var num = that.cacheData[cacheSlot].data.readInt16BE(offset);
        return num;
    }

    this._loadIntoCache = function (slot)
    {
       // console.log("Cache="+that.cacheData.length+", Adding '"+slot.filePath+"'");

        //var offset  = y * (1201 * 2) + (x * 2);
        var sizeBytes = (1201 * 1201) * 2;

        var fs = require('fs');

        var Buffer = require('buffer').Buffer;
        //var constants = require('constants');

        var fd = fs.openSync(slot.filePath, 'r');

        //fd, buffer, offset, length, position)
        slot.data = new Buffer(sizeBytes);
        var bytesRead = fs.readSync(fd, slot.data, 0, sizeBytes, 0);
        fs.closeSync(fd);
    }


    this._getFreeSlot = function ()
    {
        if (that.cacheData.length < that.MAX_SIZE)
            return that.cacheData.length;

        // else...we need to remove an entry

        var timeNow = (new Date()).getTime();

        var bigValue = 0;
        var slot = -1;

        for (var t=0; t<that.cacheData.length; t++)
        {
            var delta = timeNow - that.cacheData[t].timeLast;
            //console.log('getFree::delta='+delta);
            if (delta  > bigValue)
            {
                slot = t;
                bigValue = delta;
            }
        }
        //console.log('getFree::Attempt remove slot t='+slot);
        //console.log('getFree::Removing index '+slot+': filename='+cacheData[slot].fileName+', time='+cacheData[slot].timeLast);
        that.cacheData[slot].data = null;  // activate garb collector
        that.cacheData[slot] = null;
        that.cacheData.splice(slot, 1);

        return that.cacheData.length;
    }


    this._exists = function(file)
    {
        var f = file.toUpperCase();
        //console.log('exists::Looking for '+f);
        // console.log('exists::Cache size='+cacheData.length);

        for(var t=0; t<that.cacheData.length; t++)
            if (that.cacheData[t].fileName == f)
                return t;

        return -1;

    }
}





