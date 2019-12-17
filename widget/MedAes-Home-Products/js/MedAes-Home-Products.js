/**
 * @fileoverview hero Widget.
 * 
 * @author 
 */
define(
    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    ['knockout', 'jquery'],

    function(ko, $) {

        "use strict";
            
        return {
            // bucketValue:ko.observableArray(),
            bucketName : ko.observable(), 
            onLoad: function(widget) {
            if(widget.user().loggedIn() === true){    
                console.log("hiiii111",widget);
               var productCategory= widget.user().currentOrganization().account_catalog_buckets;
               var doc = new DOMParser().parseFromString(productCategory, "text/xml");
                var value= doc.getElementsByTagName("p");
                widget.bucketName(value[0].textContent.split("|"));
                // var bucketStoreValues = widget.bucketName;
                console.log("bucketName11111", widget.bucketName());
                // for (var i=0; i < bucketStoreValues.length; i++ ){
                //     console.log("datacame");
                // }
            }
            
            },

            beforeAppear: function(page) {   
                
                
             
            },
        };
    }
);