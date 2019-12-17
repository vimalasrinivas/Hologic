define(
  //-------------------------------------------------------------------------
  // Note: there is a copy of this file in the recommendationsTracking widget 
  //-------------------------------------------------------------------------

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function($) {

    // An Array of sent requests, used for testing and debugging
    // Requests have two properties, url and params
    var REQS = [],

    /**
     * Add or replace the protocol with the correct one if the url isn't relative.
     * This function is safe to run more than once on the same string.
     *
     * @param url A url to modify, either just a path or a full address with or without protocol
     * @param forceHttps setting to true will change the protocol of the returned url to https
     * @return The full url to use for the request
     */
    URLize = function (url, forceHttps) {
      // only match if the url is not relative to the domain
      return url.replace(/^(.*:*\/\/)*([^\/]+[^\.])\//,
             function (matched, protocol, domain) {
               return (forceHttps ? "https:" : document.location.protocol) + "//" + domain + "/";
             });
    },

    /**
     * Recursive function to flatten JSON for transmission as URI arguments
     *
     * @param json JSON Object to flatten
     * @param prepend String to prepend to the aruments.  Used for recursion
     *
     * @returns flattened and encoded URI argument string
     */
    flatten = function (json, prepend) {
      var i, key, flat = [], prepend_key;
      
      // add a dot if we have ancestors
      prepend = prepend ? prepend + "." : "";

      // loop through the keys at this level
      for (key in json) {
        // ignore any property with an undefined or null value
        if (json[key] != null && json.hasOwnProperty(key)) {
          prepend_key = prepend + key;
          // Values can be Objects, Arrays, Strings, Numerics or Booleans.
          if (json[key].constructor == Object) {
            // It's an Object/Hash.  Recurse into it.  If it's empty, don't set the key.
            i = flatten(json[key], prepend_key);
            if (i) flat[flat.length] = i;
          } else {
            // It's a String, Numeric or Boolean.  Just add the property as a param.
            flat[flat.length] = prepend_key + "=" + encodeURIComponent(json[key].toString());
          }
        }
      }
      
      return flat.join("&");
    },


    /**
     * Returns the full url for use in GET requests, regardless of the mechanism used to send it
     *
     * @param url The full url of the request, including domain but minus any parameters or protocol
     * @param params (optional) a map, converted into query string name=value pairs
     * @param forceHttps setting to true will change the protocol of the returned url to https
     *
     * @return The full url to use in a GET request with protocol, path and parameters all added on
     */
    getRequestURL = function(url, params, forceHttps) {
      // add the protocol to the url and set the domain to the default if not set
      url = URLize(url, forceHttps);

      // record the request we're about to make
      REQS.push({url: url, params: params});

      // tack the params onto the url if they exist
      if (params) {
        // append using an & if there's already a ?
        url += (~url.indexOf("?") ? "&" : "?") + flatten(params);
      }
      
      return url;
    },

    /**
     * Manufactures an IMG element and appends it to the BODY.
     * This is for use in server calls that require no response.
     * Better because SCRIPT tags can hang the JS engine indefinitely.
     *
     * @param url The full url of the request, including domain but minus any parameters or protocol
     * @param params (optional) a map, converted into query string name=value pairs
     */
    IMGRequest = function(url, params) {
      // use a variable for easier debugging
      var image = new Image;
      image.src = getRequestURL(url, params);
      // we don't even have to append it to the DOM to make the request
    }

  return {
    IMGRequest: IMGRequest
  };
});
