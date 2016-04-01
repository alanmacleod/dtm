# dtm
NodeJS project to lookup SRTM elevation data files (.HGT) directly from disk using a latlng pair and linearly interpolate the result. Also provides an intelligent memory cache for batched requests.

Also includes the ability to 'install' data by country, try running

node dtm-server --help

for more info.

Check src for web methods. Provides a variety of useful functions (arbitrary dtm mesh patches etc), key method is "GetHeight(lat, lng)".

Example usage:

var GlobalDTM = require("./globalDtm");
var dtm = new GlobalDTM(DATA_PATH); // path to the .HGT files

var height_in_metres = dtm.GetHeight(latitude, longitude);


