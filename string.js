String.prototype.padLeft = function(padString,length){

    var str = this;
    while (str.length < length)
        str = padString + str;
    return str;

}