/**
 * Created by alan on 01/04/2016.
 */

//module.exports = install;

module.exports = installer;

var bboxList = require('./global-bbox.json');
var httpreq = require('httpreq');
var async  = require('async');
var fs = require("fs");
var admzip = require('adm-zip');


// NOTE: this installer only works for "Eurasia" region for now

var srtm_urls = [
    "http://dds.cr.usgs.gov/srtm/version2_1/SRTM3/Eurasia/"
];

var installPath = "";

function installer(dataPath)
{
    installPath = dataPath;

    this.install = function(country, cb)
    {
        var cc = country.toLowerCase().replace(/ /g, '');
        var bbox = null;

        for (var t=0; t<bboxList.length; t++)
        {
            if (bboxList[t].country == cc)
            {
                bbox = bboxList[t];
                break;
            }
        }

        if (!bbox) {
            cb("Country '"+country+"' not found");
            return;
        }

        console.log("\nInstalling elevation data for '"+country+"'...\n");

        var files = this._generateFileList(bbox);

        this._downloadData(files, cb);


    };

    this._downloadData = function(files, final_cb)
    {
        async.eachSeries(files,
            function(item, callback)
            {
                var url = srtm_urls[0] + item;
                var writePath = installPath+"/"+item;


                process.stdout.write("'"+item+"'...");

                httpreq.get(url, {binary: true}, function (err, res){
                    if (err){
                        console.log(err);
                    }else{

                        if (res.statusCode >= 200 && res.statusCode < 400)
                        {
                             fs.writeFile(writePath, res.body, function (err) {

                                if(err) {
                                    console.log("Error writing file!");
                                    console.log(err);
                                } else {
                                    process.stdout.write("UNZIP...");

                                    // now unzip
                                    var zip = new admzip(writePath);
                                    zip.extractAllTo(installPath+"/", true);

                                    // delete the zip
                                    fs.unlink(writePath);

                                    process.stdout.write("OK\r\n");

                                }
                                 callback();
                            });


                        } else {
                            process.stdout.write(res.statusCode+" [skipped]\r\n");
                            callback();
                        }

                    }
                });
            },
            function(error)
            {
                final_cb();
            }
        );

    };

    this._generateFileList = function(bbox)
    {
        var GlobalDTM = require("./globalDtm");
        var dtm = new GlobalDTM("./"); // slight hack, we just need the filename method

        var llat = Math.floor(bbox.LL.lat);
        var llng = Math.floor(bbox.LL.lng);

        var ulat = Math.floor(bbox.UR.lat);
        var ulng = Math.floor(bbox.UR.lng);

        //console.log(bbox);
        //var lower = dtm._getCellFilename(llat, llng);
        //var upper = dtm._getCellFilename(ulat, ulng);

        var fileList = [];

        for (var lat=llat; lat<=ulat; lat++)
        {
            for (var lng = llng; lng <= ulng; lng++)
            {
                //console.log(lat, lng);
                fileList.push(dtm._getCellFilename(lat, lng) +".hgt.zip");
            }
        }
        return fileList;
    };

    this.printOptions = function()
    {
        for (var t=0; t<bboxList.length; t++)
            console.log(bboxList[t].country);
    };



};
