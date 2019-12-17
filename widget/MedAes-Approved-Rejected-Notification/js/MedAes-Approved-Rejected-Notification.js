/**
 * @fileoverview footer Widget.
 * 
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub','ccResourceLoader!global/api-helper'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, pubsub,helper) {           
  
    "use strict";
        
    return {
        
        decisions : ko.observable(),
        data : ko.observable(),
        rejectedReason : ko.observable(""),
        
      onLoad: function(widget) {   
                    function getParameterByName(name, url) {
                    if (!url) url = window.location.href;
                    name = name.replace(/[\[\]]/g, '\\$&');
                    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
                        results = regex.exec(url);
                    if (!results) return null;
                    if (!results[2]) return '';
                    return decodeURIComponent(results[2].replace(/\+/g, ' '));
            }
            getParameterByName('decision');
            getParameterByName('data');
            widget.decisions(getParameterByName('decision'));
            widget.data(getParameterByName('data'));
            // console.log(widget.data(),"widget.data");
            
             widget.rejectedReason.extend({
                  required: {
                    params: true,
                    message: widget.translate('Please fill the required field.')
                  }
                });  
                
                
                widget.validationModel = ko.validatedObservable({
                    rejectedReason: widget.rejectedReason,
                }); 
                
      },    
      
      // address request
      addressRequest : function(obj){
          console.log(obj);
              var widget = this;
              var skuData={
                "decision" : obj.decisions(),
                "data" : obj.data(),
                "rejectionReason" : obj.rejectedReason()
              };
              var data = {
                  "enpointUrl": helper.apiEndPoint.addressesRequest,
                  "postData" : skuData
                };
                  helper.postDataExternal(data,function(err,result){
                     console.log("profileResult",result);
                    });
                $('textarea').val('');    
      },
      
 
      
       beforeAppear: function(page) {
            },
    };
  }
);
