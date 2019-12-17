/**
 * @fileoverview footer Widget.
 * 
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, pubsub) {
  
    "use strict";
        
    return {
      
      onLoad: function(widget) {        
        // save the links in an array for later
        widget.linkList.removeAll();
        
        for(var propertyName in widget.links()) {
          widget.linkList.push(widget.links()[propertyName]);
        }
      },    
      
      linkList:   ko.observableArray(),
    };
  }
);
