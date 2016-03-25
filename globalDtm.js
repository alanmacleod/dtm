// Module   globaldtm.js
// Author   amacleod
// About    returns interpolated height of any given GPS coordinate, provided the data (.hgt) is located on disk
//          see config.json for settings

// Exports
//exports.GetHeightFromGeographic = GetHeight;
module.exports = GlobalDtm;

// Imports
//var dtm_config =    require('./dtm-config');
//var cacheMan =  require('./cache');
var CacheDTM = require('./cache');

var fs =        require('fs');
                require('./string');

var DTM_RESOLUTION = 90; // metres; 3 arc-sec


function GlobalDtm(dataPath)
{
    var that = this;

    this._dataPath = dataPath;
    this._cacheManager = new CacheDTM(8);

    this._samples = 1200;

    this._resolution = 1/this._samples;



    this.GetDiscreteMesh = function(bbox)
    {
   //bbox.bl and bbox.tr

        //snap bbox corners to the nearest real (not interpolated) sample in the DTM

        var lat1 = Math.floor(bbox.bl.lat) + Math.round(1200 * (bbox.bl.lat - Math.floor(bbox.bl.lat))) / 1200;
        var lon1 = Math.floor(bbox.bl.lng) + Math.round(1200 * (bbox.bl.lng - Math.floor(bbox.bl.lng))) / 1200;
        var lat2 = Math.floor(bbox.tr.lat) + Math.round(1200 * (bbox.tr.lat - Math.floor(bbox.tr.lat))) / 1200;
        var lon2 = Math.floor(bbox.tr.lng) + Math.round(1200 * (bbox.tr.lng - Math.floor(bbox.tr.lng))) / 1200;

        // matching the resolution of the DTM, how many samples will we be taking?
        var numRows = Math.round((lat2 - lat1) / this._resolution) + 1;
        var numCols = Math.round((lon2 - lon1) / this._resolution) + 1;

        var mesh = [];

        // take the samples. starting from bbox bottom left increasing
        for (var my=0; my<numRows; my++)
        {
            mesh[my] = [];

            for (var mx=0; mx<numCols; mx++)
            {
                var y = lat1 + (my * this._resolution);
                var x = lon1 + (mx * this._resolution);

                var z = this.GetHeight(y, x);

                mesh[my][mx] = {lon: x, lat: y, z: z};
            }
        }

        return mesh;

    },


    this.GetMeshKm = function(bl, epsg, callback)
    {
        var _transformer = new Transformer();

        _transformer.use(_transformer.EPSG.WGS_84, epsg, function()
        {
            //var rows = Math.floor((bbox.tr.y - bbox.bl.y) / DTM_RESOLUTION) + 1;
            //var cols = Math.floor((bbox.tr.x - bbox.bl.x) / DTM_RESOLUTION) + 1;
            var rows = 11; //100 metres apart = 1.1km
            var cols = 11;
            var spacing = 100;

            var mesh = [];

            for (var my = 0; my < rows; my++) {
                //mesh[my] = [];

                for (var mx = 0; mx < cols; mx++) {
                    var y = bl.y + (my * spacing);
                    var x = bl.x + (mx * spacing);

                    var gps = _transformer.transform(epsg, _transformer.EPSG.WGS_84, {x: x, y: y});
                    var z = that.GetHeight(gps.y, gps.x);

                    mesh.push({x: x, y: y, z: z});
                    //mesh[my][mx] = {x: x, y: y, z: z};
                }

            }

            var geom = { width: cols, height: rows, vertices: mesh};

            callback(geom);

        });

    },

    this.GetArbitraryMeshMetres = function(bbox, epsg, callback)
    {
        var _transformer = new Transformer();

        _transformer.use(_transformer.EPSG.WGS_84, epsg, function()
        {
            var rows = Math.floor((bbox.tr.y - bbox.bl.y) / DTM_RESOLUTION) + 1;
            var cols = Math.floor((bbox.tr.x - bbox.bl.x) / DTM_RESOLUTION) + 1;

            var mesh = [];

            for (var my = 0; my < rows; my++) {
                //mesh[my] = [];

                for (var mx = 0; mx < cols; mx++) {
                    var y = bbox.bl.y + (my * DTM_RESOLUTION);
                    var x = bbox.bl.x + (mx * DTM_RESOLUTION);

                    var gps = _transformer.transform(epsg, _transformer.EPSG.WGS_84, {x: x, y: y});
                    var z = that.GetHeight(gps.y, gps.x);

                    mesh.push({x: x, y: y, z: z});
                    //mesh[my][mx] = {x: x, y: y, z: z};
                }

            }

            var geom = { width: cols, height: rows, vertices: mesh};

            callback(geom);

        });

    },

    this.GetHeight = function(lat, lon)
    {
        //console.log("Looking up filename from lat = %d, lon = %d", lat, lon);

        var file = that._getCellFilename(lat, lon);

        //console.log("Returned filename = "+file);

        var filePath = that._dataPath + '/' + file + '.hgt';

        //var cacheHandle = cacheMan.cache(filePath);
        var cacheHandle = that._cacheManager.cache(filePath);

        // console.log("Cache manager returned handle: "+cacheHandle);

        var cellSize = this._samples + 1;

        var  northFloor = Math.floor(lat);
        var eastFloor = Math.floor(lon);

        // Translate the global coords to local (& abstract) U, V coordinates inside this cell
        //
        var u = lon - eastFloor;  // \
        var v = lat - northFloor; // - Will get a number between 0..1

        // Adjust negative offsets (W and S)
        //
        if (u < 0) u += 1;
        if (v < 0) v += 1;

        // Scale the 'abstract' U,V coords to the cell dimensions [0..1201]
        //
        u *= (cellSize - 1);
        v *= (cellSize - 1);
        // console.log("U V Coords within cell "+u+","+v);

        // Convert cell U,V coordinates to integer array positions
        //
        var x = Math.floor(u);
        var y = Math.floor(v);
        // console.log("Integer array positions XY: "+x+","+y);

        // Get the position inside this abstract rectangle, to calculate weighting
        //
        var uRatio = u - x;
        var vRatio = v - y;

        // Get the reverse, used to calculate the weighting
        //
        var uOpposite = 1 - uRatio;
        var vOpposite = 1 - vRatio;

        var adjY = 1200 - y; // cos the data is upside-down

        var heightA = that._cacheManager.readEntry(cacheHandle, x, adjY);
        var heightB = that._cacheManager.readEntry(cacheHandle, x + 1, adjY);
        var heightC = that._cacheManager.readEntry(cacheHandle, x, adjY - 1);
        var heightD = that._cacheManager.readEntry(cacheHandle, x + 1, adjY - 1);


        var weighted = (heightA * uOpposite + heightB * uRatio) * vOpposite + (heightC * uOpposite + heightD * uRatio) * vRatio;
/*
        if  (heightA > 100 || heightB > 100 || heightC > 100 || heightD > 100)
        {
            console.log("A=%d, B=%d, C=%d, D=%d", heightA, heightB, heightC, heightD);
            console.log("Weighted = %d", weighted);
        }
*/

        // console.log('returned height:' + weighted);
        return weighted;


    }

    this._getCellFilename = function(lat, lon)
    {
        /*
         * LAT/LON coordinates increment as follows:
         *
         *                          (35, 1)
         *                  +--------+
         *                  |        |
         *                  |        |
         *                  |        |
         *                  |        |
         *                  +--------+
         *               (34,0)
         *
         * The cell's filename is determined by the coordinate at the lower-left point of the cell.
         * So for the example above, filename is N34E000.hgt
         *
         */

        var file = "";

        var north = true;
        var east = true;

        if (lat < 0) north = false;
        if (lon < 0) east = false;

        var d1, d2;

        var p1 = "";
        var p2 = "";

        if (north)
        {
            p1 = "N";
            d1 = Math.floor(lat);

        }
        else
        {
            p1 = "S";
            d1 = -(Math.floor(lat) - 1);
        }

        if (east)
        {
            p2 = "E";
            d2 = Math.floor(lon);
        }
        else
        {
            p2 = "W";
            d2 = -(Math.floor(lon));
        }

        file = p1 + d1.toString().padLeft('0',2) + p2 + d2.toString().padLeft('0',3);

        return file;
    }
}

/*
// Methods
function GetHeight(lat, lon)
{
    if (!config)
    {
        log.info("GLOBALDTM", "Cannot see config!");
        return;
    }
    //console.log("GlobalDTM Getting Height for lat,lon: "+lat+","+lon);

    var file = GetCellFilename(lat, lon);
    //file = "N52W003";

    var filePath = config.dtmRoot + '/global/' + file + '.hgt';

    //console.log("DTM: "+filePath);

    //if (config.dataPathRelative)
     //   filepath = __dirname + filePath;

   // console.log("Looking in: " + filePath);

    var cacheHandle = cacheMan.cache(filePath);

   // console.log("Cache manager returned handle: "+cacheHandle);

    var cellSize = 1201;

    var  northFloor = Math.floor(lat);
    var eastFloor = Math.floor(lon);

    // Translate the global coords to local (& abstract) U, V coordinates inside this cell
    //
    var u = lon - eastFloor;  // \
    var v = lat - northFloor; // - Will get a number between 0..1

    // Adjust negative offsets (W and S)
    //
    if (u < 0) u += 1;
    if (v < 0) v += 1;

    // Scale the 'abstract' U,V coords to the cell dimensions [0..1201]
    //
    u *= (cellSize - 1);
    v *= (cellSize - 1);
   // console.log("U V Coords within cell "+u+","+v);

    // Convert cell U,V coordinates to integer array positions
    //
    var x = Math.floor(u);
    var y = Math.floor(v);
   // console.log("Integer array positions XY: "+x+","+y);

    // Get the position inside this abstract rectangle, to calculate weighting
    //
    var uRatio = u - x;
    var vRatio = v - y;

    // Get the reverse, used to calculate the weighting
    //
    var uOpposite = 1 - uRatio;
    var vOpposite = 1 - vRatio;

    var adjY = 1200 - y; // cos the data is upside-down


    var heightA = cacheMan.readEntry(cacheHandle, x, adjY);
    var heightB = cacheMan.readEntry(cacheHandle, x + 1, adjY);
    var heightC = cacheMan.readEntry(cacheHandle, x, adjY - 1);
    var heightD = cacheMan.readEntry(cacheHandle, x + 1, adjY - 1);

    var weighted = (heightA * uOpposite + heightB * uRatio) * vOpposite + (heightC * uOpposite + heightD * uRatio) * vRatio;

   // console.log('returned height:' + weighted);
    return weighted;


}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function ReadEntry(filepath, x,y, callback)
{

    var offset  = y * (1201 * 2) + (x * 2);

    var fs = require('fs');

    var Buffer = require('buffer').Buffer;
    var constants = require('constants');

    var fd = fs.openSync(filepath, 'r');

    //fd, buffer, offset, length, position)
    var buffer = new Buffer(2);
    fs.readSync(fd, buffer, 0, 2, offset);
    fs.closeSync(fd);

    var num = buffer.readUInt16BE(0);
    return num;

}
*/

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
