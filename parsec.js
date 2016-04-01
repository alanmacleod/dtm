

// Parses the csv file found here: http://www.nearby.org.uk/downloads.html
// and writes it into json
//
// Just used once to produce "global-bbox.json"

var fs = require('fs');

var file = "./countries bbox.csv";
var data = fs.readFileSync(file,'utf8').split("\r\n");

var bbox_list = [];

for (var t=0; t<data.length; t++)
{
    var l = data[t].split(',');

    //if (l[4].toUpperCase() == "UNITED KINGDOM")
    //    console.log(l);
    var LL_LNG = Number(l[0]), LL_LAT = Number(l[1]);
    var UR_LNG = Number(l[2]), UR_LAT = Number(l[3]);
    var country = l[4].toLowerCase().replace(/ /g, '').replace(/-/g,'').replace(/'/g, '');


    if (l[5]) country = l[5].toLowerCase().replace(/ /g, '').replace(/-/g,'').replace(/'/g, '')+'-'+country;

    var countrybox = {
        LL: {
            lat: LL_LAT,
            lng: LL_LNG
        },
        UR: {
            lat: UR_LAT,
            lng: UR_LNG
        },
        country: country
    };

    bbox_list.push(countrybox);

    //console.log(countrybox.country);
}

var outputFilename = './global-bbox.json';

fs.writeFile(outputFilename, JSON.stringify(bbox_list, null, 4), function(err) {
    if(err) {
        console.log(err);
    }
    console.log("done");
});