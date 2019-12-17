/**
 * @fileoverview Order Confirmation Widget. 
 * Displays a confirmation of the order placed by the user.
 * @author 
 */
define(
 
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'CCi18n', 'pubsub', 'notifier', 'ccConstants', 'spinner', 'ccRestClient', 'pageLayout/site','ccResourceLoader!global/api-helper'], 
  
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function(ko, CCi18n, PubSub, notifier, CCConstants, spinner,  ccRestClient, SiteViewModel,helper) {
  
  "use strict";

  return {
    WIDGET_ID:        "checkoutConfirmation",
    isPending:    ko.observable(false),
    isPendingApproval:	ko.observable(false),
    needsPayment: ko.observable(true),
    productDescription : ko.observable(),
    appendCardNumber : ko.observable(),
    displayEBSOrderNumber :ko.observable(''),
    pendingApprovalStates: [CCConstants.PENDING_APPROVAL,CCConstants.PENDING_APPROVAL_TEMPLATE],
    showOrderNumber :ko.observable(false),

    resourcesLoaded: function(widget) {      
      // Create observable to mark the resources loaded, if it's not already there
      if (typeof widget.checkoutResourcesLoaded == 'undefined') {
        widget.checkoutResourcesLoaded = ko.observable(false);
      }
      // Notify the computeds relying on resources
      widget.checkoutResourcesLoaded(true);
    },

    /**
     * Function to toggle the expanded flag for a configurable child item.
     */
    toggleExpandedFlag : function(element, data) {
      if (data.expanded()) {
        data.expanded(false);
      } else {
        data.expanded(true);
      }
    },

    onLoad: function(widget) { 
        console.log(widget,"widgetoooooo");
        
      if (widget.confirmation()) {                 
        var items = [];
        if (widget.confirmation().shoppingCart) {
          items.push.apply(items, widget.confirmation().shoppingCart.items);
        }
        if (widget.confirmation().shippingGroups && widget.confirmation().shippingGroups.length > 0) {
          for(var i=0; i<widget.confirmation().shippingGroups.length;i++){
            items.push.apply(items, widget.confirmation().shippingGroups[i].items);
          }
        }
        var createExpandFlag = function (item) {
          for (var j = 0; j < item.childItems.length; j++) {
            if (item.childItems[j].expanded == undefined) {
              item.childItems[j].expanded = ko.observable(false);
            }
            if (item.childItems[j].childItems && item.childItems[j].childItems.length > 0) {
              createExpandFlag(item.childItems[j]);
            }
          }
        };
        for (var i = 0; items && i < items.length; i++) {
          var item = items[i];
          if (item.childItems && item.childItems.length > 0) {
            createExpandFlag(item);
          }
        }
          
        // Create observable to mark the resources loaded, if it's not already there
        if (typeof widget.checkoutResourcesLoaded == 'undefined') {
          widget.checkoutResourcesLoaded = ko.observable(false);
        }
        
        // i18n strings required for table summary attributes
        widget.yourOrderText = ko.computed(function() {
          if (widget.checkoutResourcesLoaded()) {
            var messageText = CCi18n.t(
              'ns.checkoutconfirmation:resources.yourOrderText', {}
            );          
            return messageText;
          }
          else {
            return '';
          }
          
        }, widget);
        
        widget.shipToText = ko.computed(function() {
          if (widget.checkoutResourcesLoaded()) {
            var messageText = CCi18n.t(
              'ns.checkoutconfirmation:resources.shipToText', {}
            );          
            return messageText;
          }
          else {
            return '';
          }
          
        }, widget);
        
        widget.shippingMethodText = ko.computed(function() {
          if (widget.checkoutResourcesLoaded()) {
            var messageText = CCi18n.t(
              'ns.checkoutconfirmation:resources.shippingMethodText', {}
            );          
            return messageText;
          }
          else {
            return '';
          }
          
        }, widget);

        widget.secondaryCurrency = ko.observable(null);

        widget.showSecondaryShippingData = ko.pureComputed(function(){
          return widget.confirmation().payShippingInSecondaryCurrency &&
                   (null != widget.secondaryCurrency());
        });

        // Parameterized i18n strings
        widget.orderDate = ko.computed(function() {
          var submissionDate= widget.confirmation().submittedDate?widget.confirmation().submittedDate:widget.confirmation().creationDate;
          var orderDateString = widget.ccDate(submissionDate, null, null, CCConstants.MEDIUM);
          return orderDateString;
          
        }, widget);
        
        widget.orderTime = ko.computed(function() {
        	var submissionDate= widget.confirmation().submittedDate?widget.confirmation().submittedDate:widget.confirmation().creationDate;
          var orderTimeString = widget.ccDate(submissionDate, null, null, CCConstants.TIME);
          return orderTimeString;
          
        }, widget);
        
        widget.thankyouMsg = ko.computed(function() {
          if (widget.checkoutResourcesLoaded()) {
            var linkText = CCi18n.t(
              'ns.checkoutconfirmation:resources.thankyouMsg', 
              {
                orderDate: widget.orderDate(), 
                orderTime: widget.orderTime()
              }
            );          
          return linkText;
          }
          else {
            return '';
          }
          
        }, widget);
        
        
        widget.orderNumberMsg = ko.computed(function() {
          if (widget.checkoutResourcesLoaded()) {
            var linkText = CCi18n.t(
              'ns.checkoutconfirmation:resources.orderNumberMsg', 
              {
                orderNumber: widget.confirmation().id
              }
            );          
            return linkText;
          }
          else {
            return '';
          }
          
        }, widget);
      }
     
      
    },
    
    getEBSOrderNumber : function(){
        var widget =this;
       
        var data = helper.apiEndPoint.orderDetails+"?orderId="+ widget.confirmation().id+"&source=OCC_01" +'&siteURL='+widget.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName='+ widget.site().extensionSiteSettings.externalSiteSettings.siteName;
        helper.getDataExternal(data, function (err, result) {
          if(result){
            console.log(result.oracleOrderNumber);
           // widget.destroySpinner();
            widget.displayEBSOrderNumber(result.oracleOrderNumber);
            widget.sendOrderConfirmation(result);
            console.log(widget.displayEBSOrderNumber(),"....displayEBSOrderNumber..");
            widget.showOrderNumber(true);
          } else if(err){
           //   widget.destroySpinner();
          }
            
        });
        
        
    },
  /**
         * Destroy the 'loading' spinner.
         * @function  OrderViewModel.destroySpinner
         */
        destroySpinner: function() {
          // console.log("destroyed");
          $('#loadingModal').hide();
          spinner.destroy();
      },

      /**
       * Create the 'loading' spinner.
       * @function  OrderViewModel.createSpinner
       */
      createSpinner: function(loadingText) {
          var indicatorOptions = {
              parent: '#loadingModal',
              posTop: '0',
              posLeft: '50%'
          };
          var loadingText = CCi18n.t('ns.common:resources.loadingText');
          $('#loadingModal').removeClass('hide');
          $('#loadingModal').show();
          indicatorOptions.loadingText = loadingText;
          spinner.create(indicatorOptions);
      },
    sendOrderConfirmation: function(result){
         var widget =this;
          var emailObj = {
                "occOrderId" : result.id,
                "oracleOrderId" : result.oracleOrderId,
                "oracleOrderNumber" : result.oracleOrderNumber,
                "profileEmailId":widget.user().email()
                }
             
             var data = {
              "enpointUrl": "https://ccadmin-test-zcxa.oracleoutsourcing.com/ccstorex/custom/v1/orders/confirmation/email",
              "postData" : emailObj
            }
             helper.postDataExternal(data, function(err, result) {
                 console.log(result,'result');
                if(err){
                  notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);                }  
             })
    },

    // last 4 digits card no 
    appendCardNo:function(pcardNo){    
        console.log(pcardNo,"pcardNo");
        var card;
        var widget = this;
        if(pcardNo.confirmation().payments[0].cardNumber){    
            for(var i=0;i < pcardNo.confirmation().payments.length ; i++){
                 card = pcardNo.confirmation().payments[i].cardNumber;
            }
            widget.appendCardNumber(card.substr(card.length-4,4));       
            console.log(widget.appendCardNumber(),"appendCardNumber");
        }
    },
    
    beforeAppear: function (page) {
     $("#MedAes-Order-Confirmation").parents(".redBox").parent().css({"padding":"0px", "background-color":"#f6f6f6"});    
     $("#MedAes-Order-Confirmation").parents(".redBox").wrapInner( "<div class='container pad0'></div>");             
      var widget = this;

   //   widget.createSpinner();
      widget.appendCardNo(widget);
      widget.getProductId(widget);    
      widget.showOrderNumber(false);
      var items = [];
      if (widget.confirmation && widget.confirmation() && widget.confirmation().shoppingCart) {
        items = widget.confirmation().shoppingCart.items;
      }
      $.when (widget.site().siteLoadedDeferred).done(function() {
        if (widget.confirmation()) {
          var secondaryCurrency = widget.site().getCurrency(widget.confirmation().secondaryCurrencyCode);
          if (widget.secondaryCurrency() || secondaryCurrency) {
            if (widget.secondaryCurrency() && secondaryCurrency && (widget.secondaryCurrency().currencyCode == secondaryCurrency.currencyCode)) {
              return;
            }
            widget.secondaryCurrency(secondaryCurrency);
          }
        }
      });
      var createExpandFlag = function (item) {
        for (var j = 0; j < item.childItems.length; j++) {
          if (item.childItems[j].expanded == undefined) {
            item.childItems[j].expanded = ko.observable(false);
          }
          if (item.childItems[j].childItems && item.childItems[j].childItems.length > 0) {
            createExpandFlag(item.childItems[j]);
          }
        }
      };
      for (var i = 0; items && i < items.length; i++) {
        var item = items[i];
        if (item.childItems && item.childItems.length > 0) {
          createExpandFlag(item);
        }
      }
      if (widget.confirmation().state === CCConstants.PENDING_PAYMENT) {
        widget.isPending(true);
      } 
      else if (widget.pendingApprovalStates.indexOf(widget.confirmation().state) != -1){
    	  widget.isPendingApproval(true);
          if(this.confirmation().payments.length == 1 && (this.confirmation().payments[0].paymentMethod == CCConstants.INVOICE_PAYMENT_METHOD || 
           	     this.confirmation().payments[0].paymentMethod == CCConstants.CASH_PAYMENT_TYPE)){
             	widget.needsPayment(false);
             }
          else{widget.needsPayment(true);}
      }
      else {
        widget.isPending(false);
        widget.isPendingApproval(false);
      }
      
      //remove the spinner
    //  $('#loadingModal').hide();
   //   spinner.destroy(0);
      if (widget.user().errorMessageKey() != '' ) {
        notifier.sendError(widget.WIDGET_ID, widget.translate(widget.user().errorMessageKey()), true);
      } else if (widget.user().successMessageKey() != '' ) {
        notifier.sendSuccess(widget.WIDGET_ID, widget.translate(widget.user().successMessageKey()));
      } else if(ccRestClient.getStoredValue(CCConstants.PAYULATAM_CHECKOUT_REGISTRATION) != null){
    	  var regStatus = ccRestClient.getStoredValue(CCConstants.PAYULATAM_CHECKOUT_REGISTRATION);
    	  if(regStatus == CCConstants.PAYULATAM_CHECKOUT_REGISTRATION_SUCCESS){
    		  notifier.sendSuccess(widget.WIDGET_ID,widget.translate('loginSuccessText'));
    	  }
    	  else if(regStatus == CCConstants.PAYULATAM_CHECKOUT_REGISTRATION_FAILURE){
    		  notifier.sendError(widget.WIDGET_ID, widget.translate('loginFailureText'), true);
    	  }
    	  ccRestClient.clearStoredValue(CCConstants.PAYULATAM_CHECKOUT_REGISTRATION);
      }
      widget.user().errorMessageKey('');
      widget.user().successMessageKey('');
      widget.displayEBSOrderNumber('');
      widget.getEBSOrderNumber();
    },
    
    //fetchproduct details
    
         fetchProductDetails: function(idResult){
                var widget=this;
                console.log("idResult",idResult);
                ccRestClient.authenticatedRequest("/ccstoreui/v1/products?productIds=" + idResult +
                "&fields=route,displayName,primaryFullImageURL,description,repositoryId,brand,x_itemNumber", 
                {}, function(e) {
                    console.log("heloooo",e);
                    var itemDetails = widget.confirmation().shippingGroups[0].items;
                    for(var i=0; i < e.length; i++){
                        for(var j=0;j < itemDetails.length;j++){
                           var productItems = itemDetails[j]; 
                           console.log(productItems,"productItems..");
                        if(e[i].repositoryId == productItems.productId){
                            productItems['brand'] =e[i].brand;
                            productItems['primaryFullImageURL'] =e[i].primaryFullImageURL;
                            //console.log("aaaaaa",productItems['brand']);
                             productItems['x_itemNumber'] =e[i].x_itemNumber;
                            
                        }
                      
                      }
                        if(e.length == i+1){
                           widget.productDescription(itemDetails); 
                           console.log("productDescription",widget.productDescription());
                        }
                    }
                }, function(data) {}, "GET");
         },
         
         
         
       //get product id to fetch details
       getProductId : function(data){   
           var widget = this;
           console.log(data,"dataId");
           var productRequiredId=[];
         var productDetails=widget.confirmation().shippingGroups;
         for (var i=0; i < productDetails.length;i++){
             for(var j=0 ; j < productDetails[i].items.length;j++ ){
               productRequiredId.push(productDetails[i].items[j].productId);
               console.log(productRequiredId,"productRequiredId");
             }
         }
        widget.fetchProductDetails(productRequiredId.toString());
       },
    
    getCountryDisplayName: function(countryCd) {
      if (this.shippingCountries()) {
        for (var i in this.shippingCountries()) {
          var countryObj = this.shippingCountries()[i];
          if (countryObj.countryCode === countryCd) {
            return countryObj.displayName;
          }
        }
      }
      return "";
    },
    
    getStateDisplayName: function(countryCd, stateCd) {
      if (this.shippingCountries()) {
        for (var i in this.shippingCountries()) {
          var countryObj = this.shippingCountries()[i];
          if (countryObj.countryCode === countryCd) {
            for (var j in countryObj.regions) {
              var stateObj = countryObj.regions[j];
        	  if (stateObj.abbreviation === stateCd) {
        	    return stateObj.displayName;
              }
            }
          }
        }
      }
      return "";
    },
    /*
     * Method to get price for each item, added from
     * Bopis feature -multiple shipping groups
     */
    getDetailedPriceInfo: function(detailedItemPriceInfo){
    	var finalAmount=0;
    	for (var i in detailedItemPriceInfo)  {
          finalAmount = finalAmount +  detailedItemPriceInfo[i].amount;
    	}
    	return finalAmount;
    }
  };
});