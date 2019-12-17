/**
 * @fileoverview Header Widget.
 * 
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'notifications', 'CCi18n', 'ccConstants', 'navigation', 
   'ccLogger', 'jquery', 'ccNumber'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, pubsub, notifications, CCi18n, CCConstants, navigation, ccLogger,    
    $, ccNumber) {
  
    "use strict";
        
    return {
      
      linkList:           ko.observableArray(),

      
      onLoad: function() {},
      beforeAppear:function(){},   
   
    };
  }
);
