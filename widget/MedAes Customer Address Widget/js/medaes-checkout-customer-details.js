/**
 * @fileoverview Checkout Customer Details Widget.
 *
 */
/*global $ */
/*global define */
define(

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'viewModels/address', 'ccConstants', 'pubsub',
    'koValidate', 'notifier', 'ccKoValidateRules', 'storeKoExtensions',
    'ccConstants', 'spinner'
  ],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------

  function(ko, Address, CCConstants, pubsub, koValidate, notifier,
    rules, storeKoExtensions, ccConstants, spinner) {

    "use strict";

    return {

      billingAddress: ko.observable(),
      shippingAddress: ko.observable(),
      useAsBillAddress: ko.observable(),
      displayUseAsBillAddress: ko.observable(),
      skipBillingDetails: ko.observable(),
      defaultBillingCountry:ko.observable(),
      defaultShippingCountry :ko.observable(),
      getExternalShippingAddress :ko.observable(),
      // Spinner resources
      shippingAddressIndicator: '#CC-shippingAddressLoadingModal',
      shippingAddressIndicatorOptions: {
        parent: '#CC-shippingAddressLoadingModal',
        posTop: '50px',
        posLeft: '30%'
      },

      initResourceDependents: function() {
        var widget = this;
        // Message to be displayed in the Message Panel if an error occurs
        widget.ErrorMsg = widget.translate('checkoutErrorMsg');

        widget.billingAddress.extend({
          propertyWatch: widget.billingAddress
        });
        widget.shippingAddress.extend({
          propertyWatch: widget.shippingAddress
        });

        widget.billingAddress(new Address('checkout-billing-address', widget.ErrorMsg, widget, widget.billingCountries(), widget.defaultBillingCountry()));
        widget.shippingAddress(new Address('checkout-shipping-address', widget.ErrorMsg, widget, widget.shippingCountries(), widget.defaultShippingCountry()));
        

        /**
         * @function
         * @name isValid
         * Determine whether or not the current widget object is valid
         * based on the validity of its component parts. This will not
         * cause error messages to be displayed for any observable values
         * that are unchanged and have never received focus on the
         * related form field(s).
         * @return boolean result of validity test
         */
        widget.isValid = ko.computed(function() {
          if (widget.order().isPaypalVerified()) {
            return widget.shippingAddress().isValid();
          } else {
            return (widget.billingAddress().isValid() && widget.shippingAddress().isValid());
          }
        });

        /**
         * @function
         * @name validateNow
         * Force all relevant member observables to perform their
         * validation now & display the errors (if any)
         */
        widget.validateNow = function() {
          if (!widget.order().isPaypalVerified()) {
            widget.billingAddress().validateNow();
          }
          widget.shippingAddress().validateNow();

          return (widget.isValid());
        };

        /**
         * Callback function for use in widget stacks.
         * Triggers internal widget validation.
         * @return true if we think we are OK, false o/w.
         */
        widget.validate = function() {

          // Shipping address is valid and being used as the billing address so copy it.
          if (widget.shippingAddress().isValid() && widget.useAsBillAddress() === true) {
            widget.billingAddress(widget.shippingAddress().copyTo(new Address('checkout-billing-address', widget.ErrorMsg, widget, widget.billingCountries(), widget.defaultBillingCountry())));
          }

          return widget.validateNow();
        }
        
        widget.checkIfSelectedShipCountryInBillCountries = function() {
          //If the selected shipping country is not in the billing country list, hide the checkbox,
          //and show the billing address. If the selected country is in the billing country list,
          //then, show the checkbox, and hide the billing address
          if (widget.billingCountries()) {
            var selectedShipCountryInBillCountries = false;
            for (var i=0; i<widget.billingCountries().length; i++) {
              if (widget.shippingAddress().selectedCountry() === widget.billingCountries()[i].countryCode) {
                selectedShipCountryInBillCountries = true;
                break;
              }
            }
            if (!selectedShipCountryInBillCountries || widget.order().isPaypalVerified()) {
              widget.useAsBillAddress(false);
              widget.displayUseAsBillAddress(false);	
            } else {
              widget.useAsBillAddress(true);
              widget.displayUseAsBillAddress(true);
            }
          } else {
            widget.useAsBillAddress(true);
            widget.displayUseAsBillAddress(true);
       	  }           
        };
        
        widget.useAsBillAddress.subscribe(function(newValue) {
          if (widget.useAsBillAddress() === true) {
            // Need to clear any validation errors specific to the 
            // billing address fields, prior to resetting it.
            widget.billingAddress(widget.shippingAddress().copyTo(new Address('checkout-billing-address', widget.ErrorMsg, widget, widget.billingCountries(), widget.defaultBillingCountry())));

          } else {
              widget.billingAddress(new Address('checkout-billing-address', widget.ErrorMsg, widget, widget.billingCountries(), widget.defaultBillingCountry()));

            if (widget.shippingAddress().isValid()) {
              // CC requires Phone Number in Billing Address
              // but ATG requires it in the Shipping Address
              widget.billingAddress().phoneNumber(widget.shippingAddress().phoneNumber());
            }

            // Need to inform interested parties that any previous
            // billing address is no longer current
            notifier.clearError(widget.typeId());
            $.Topic(pubsub.topicNames.CHECKOUT_BILLING_ADDRESS).publishWith(
              widget.billingAddress(), [{
                message: "success"
              }]);
          }
        });
        
        widget.shippingAddress().selectedCountry.subscribe(function(newValue) {
        	widget.checkIfSelectedShipCountryInBillCountries();
        });

        widget.shippingAddress.hasChanged.subscribe(function(hasChanged) {	
          
          // If address is valid, refresh billing address and shipping options
          if (hasChanged && widget.shippingAddress().isValid()) {
        	var shippingAddressWithProductIDs = {};
            shippingAddressWithProductIDs[CCConstants.SHIPPING_ADDRESS_FOR_METHODS] = widget.shippingAddress();
            shippingAddressWithProductIDs[CCConstants.PRODUCT_IDS_FOR_SHIPPING] = widget.cart().getProductIdsForItemsInCart();
            widget.cart().updateShippingAddress.bind(shippingAddressWithProductIDs)();

            // Refresh the billing address
            if (widget.useAsBillAddress() === true) {
              // Need to clear any validation errors specific to the 
              // billing address fields, prior to resetting it.
              widget.billingAddress(widget.shippingAddress().copyTo(new Address('checkout-billing-address', widget.ErrorMsg, widget, widget.billingCountries(), widget.defaultBillingCountry())));
            } else {
              // CC requires Phone Number in Billing Address
              // but ATG requires it in the Shipping Address
              widget.billingAddress().phoneNumber(widget.shippingAddress().phoneNumber());
            }
            
            // Inform interested parties of the valid shipping address
            $.Topic(pubsub.topicNames.CHECKOUT_SHIPPING_ADDRESS).publishWith(
                widget.shippingAddress(), [{
                  message: "success"
                }]);
          }
          // Handle case where address is sufficiently completed to calculate shipping & tax
          else if (hasChanged && widget.shippingAddress().validateForShippingMethod()) {
            // Ensure that required fields have at least blank values
            if (widget.shippingAddress().firstName() == undefined) 
              widget.shippingAddress().firstName('');
            if (widget.shippingAddress().lastName() == undefined) 
              widget.shippingAddress().lastName('');
            if (widget.shippingAddress().address1() == undefined)
              widget.shippingAddress().address1('');
            if (widget.shippingAddress().city() == undefined)
              widget.shippingAddress().city('');
            if (widget.shippingAddress().phoneNumber() == undefined)
              widget.shippingAddress().phoneNumber('');
            
            var shippingAddressWithProductIDs = {};
            shippingAddressWithProductIDs[CCConstants.SHIPPING_ADDRESS_FOR_METHODS] = widget.shippingAddress();
            shippingAddressWithProductIDs[CCConstants.PRODUCT_IDS_FOR_SHIPPING] = widget.cart().getProductIdsForItemsInCart();
            // Fire event to gather shipping methods and costs
            $.Topic(pubsub.topicNames.POPULATE_SHIPPING_METHODS).publishWith(
            		shippingAddressWithProductIDs, [{
                  message: "success"
                }]);
          }
          else if (hasChanged && !widget.shippingAddress().isValid()) {
            $.Topic(pubsub.topicNames.CHECKOUT_SHIPPING_ADDRESS_INVALID).publish();  
          }
        });

        widget.billingAddress.hasChanged.subscribe(function(hasChanged) {
          if (hasChanged && widget.billingAddress().isValid()) {
            notifier.clearError(widget.typeId());
            $.Topic(pubsub.topicNames.CHECKOUT_BILLING_ADDRESS).publishWith(
              widget.billingAddress(), [{
                message: "success"
              }]);
          }
        });

      },
      
      /**
       * Called before the widget appears every time.
       */
      beforeAppear: function (page) {

        var widget = this;
        widget.skipBillingDetails(widget.order().isPaypalVerified());

        if (widget.shippingCountries().length == 0) {
          widget.destroySpinner();
          $.Topic(pubsub.topicNames.NO_SHIPPING_METHODS).publish();
        }
        //If there are no billing countries disable all the fields of billing address      
        if (!widget.billingCountries().length) {
          $('#billingAddress').attr('disabled', 'disabled');
        }

        if (widget.order().isPaypalVerified()) {
          widget.order().getOrder();
          widget.createSpinner();
        } else {
          // Should always used registered shopper's saved shipping address if set
          var eventToFire = pubsub.topicNames.VERIFY_SHIPPING_METHODS;

          if (widget.user().loggedIn() === true && widget.user().updatedShippingAddress) {
            var shippingAddress = new Address('user-shipping-address', widget.ErrorMsg, widget, widget.shippingCountries(), widget.defaultShippingCountry());
            shippingAddress.countriesList(widget.shippingCountries());
            // Save shipping address JS object to Address object.
            shippingAddress.copyFrom(widget.user().updatedShippingAddress, widget.shippingCountries());
            shippingAddress.resetModified();
            widget.shippingAddress(shippingAddress);
            eventToFire = pubsub.topicNames.POPULATE_SHIPPING_METHODS;
            widget.destroySpinner();
          }

          // Otherwise If the cart shipping address is already set, then use this
          else if (widget.cart().shippingAddress() != undefined && widget.cart().shippingAddress != '') {
            var shippingAddress = new Address('cart-shipping-address', widget.ErrorMsg, widget, widget.shippingCountries(), widget.defaultShippingCountry());
            shippingAddress.countriesList(widget.shippingCountries());
            // Save shipping address JS object to Address object.
            shippingAddress.copyFrom(widget.cart().shippingAddress(), widget.shippingCountries());
            shippingAddress.resetModified();
            widget.shippingAddress(shippingAddress);
            widget.destroySpinner();
          }

          var shippingAddressWithProductIDs = {};
          shippingAddressWithProductIDs[CCConstants.SHIPPING_ADDRESS_FOR_METHODS] = widget.shippingAddress();
          shippingAddressWithProductIDs[CCConstants.PRODUCT_IDS_FOR_SHIPPING] = widget.cart().getProductIdsForItemsInCart();

          if (widget.shippingAddress() && widget.shippingAddress().isValid()) {
            $.Topic(eventToFire).publishWith(shippingAddressWithProductIDs, [{
              message: "success"
            }]);
          }
        }
        widget.checkIfSelectedShipCountryInBillCountries();
      },

      // end initResourceDependents              
      resourcesLoaded: function(widget) {
        widget.initResourceDependents();
      },

      /**
        Checkout Customer Details Widget.
        @private
        @name checkout-customer-details
        @property {observable String} checkoutGuest value for the guest checkout radio button
        @property {observable String} checkoutLogin value for the login radio button
        @property {observable String} checkoutOption currently selected checkout option
        @property {observable String} emailAddress Email address entered by user
        @property {observable String} password Either registered or desired user password
        @property {observable String} confirmPassword confirmation of desired password
        @property {observable Boolean} createAccount current value of create account checkbox
        @property {observable Address} billingAddress object representing the customer's
                                       billing address. 
        @property {observable Address} shippingAddress object representing the customer's
                                       shipping address.
        @property {observable Boolean} useAsBillAddress current value of the checkbox 
                                       indicating whether to use SHipping Addr as Billing Addr
      */
      onLoad: function(widget) {
        widget.getExternalShippingAddresses();
        // These are not configuration options
        widget.billingAddress.isData = true;
        widget.shippingAddress.isData = true;
        widget.useAsBillAddress.isData = true;

        // set form defaults

        widget.resetListener = function(obj) {
          widget.billingAddress().reset();
          widget.shippingAddress().reset();
        };

        $.Topic(pubsub.topicNames.ORDER_SUBMISSION_SUCCESS).subscribe(widget.resetListener);

        $.Topic(pubsub.topicNames.CHECKOUT_VALIDATE_NOW).subscribe(function(obj) {
          if (!widget.validateNow()) {
            $.Topic(pubsub.topicNames.CHECKOUT_NOT_VALID).publishWith(
              this, [{
                message: "success"
              }]);
          } else {
            // (re)send the valid information as it may have been lost
            // due to the customer switching back and forth between pages

            $.Topic(pubsub.topicNames.CHECKOUT_BILLING_ADDRESS).publishWith(
              widget.billingAddress(), [{
                message: "success"
              }]);
            widget.shippingAddress().afterValidation = true;

            $.Topic(pubsub.topicNames.CHECKOUT_SHIPPING_ADDRESS).publishWith(
              widget.shippingAddress(), [{
                message: "success"
              }]);
          }
        });
        
        // Update the user details and reload the data               
        $.Topic(pubsub.topicNames.USER_LOAD_SHIPPING).subscribe(function(obj) {
          var shippingAddress = new Address('user-shipping-address', widget.ErrorMsg, widget, widget.shippingCountries(), widget.defaultShippingCountry());
          if (widget.user().loggedIn() === true && widget.user().updatedShippingAddress && (widget.cart().items().length > 0)) {
            // Save shipping address JS object to Address object.
            shippingAddress.copyFrom(widget.user().updatedShippingAddress, widget.shippingCountries());
            shippingAddress.resetModified();
          }
          widget.shippingAddress(shippingAddress);
        });

        widget.destroySpinner = function() {
          $(widget.shippingAddressIndicator).removeClass('loadingIndicator');
          spinner.destroy(1);
        };

        widget.shippingAddressDuringPaypalCheckout = function(paypalShippingAddress) {
          var shippingAddress = new Address('user-paypal-shipping-address', widget.ErrorMsg, widget, widget.shippingCountries(), widget.defaultShippingCountry());
          if (widget.user().loggedIn() === true && widget.user().updatedShippingAddress && (widget.cart().items().length > 0)) {
            // Save shipping address JS object to Address object.
            shippingAddress.copyFrom(widget.user().updatedShippingAddress, widget.shippingCountries());
            shippingAddress.resetModified();
          } else if (paypalShippingAddress && (widget.cart().items().length > 0) && widget.order().isPaypalVerified()) {
            // Save shipping address JS object to Address object.
            shippingAddress.copyFrom(paypalShippingAddress, widget.shippingCountries());
            shippingAddress.resetModified();
          }
          widget.shippingAddress(shippingAddress);
          widget.destroySpinner();
        };

        $.Topic(pubsub.topicNames.PAYPAL_CHECKOUT_SHIPPING_ADDRESS).subscribe(widget.shippingAddressDuringPaypalCheckout.bind(this));

        widget.createSpinner = function() {
          $(widget.shippingAddressIndicator).css('position','relative');
          spinner.create(widget.shippingAddressIndicatorOptions);
        };
      },
      
      getExternalShippingAddresses : function(){
          var widget=this;
         var shippingAddressObj ={
            	"accountId" : "6783455",
            	"usage" : "ship_to"
            }
          $.ajax({
              type:"POST",
              url:"/ccstorex/custom/v1/mock/addresses",
              headers:{
                  Accept:"application/json","Content-Type":"application/json"
              },
              async:false,
              data: ko.toJSON(shippingAddressObj),
              success:function(data){
                    widget.getExternalShippingAddress(data);
                    console.log(widget.getExternalShippingAddress().addresses[0].address1,"address1");
                    for(var i=0; i< widget.getExternalShippingAddress().addresses.length>0 ; i++){
                       if(widget.getExternalShippingAddress().addresses[i].isDefault==true){
                      console.log(widget.getExternalShippingAddress().addresses[i].address1,"widget.getExternalShippingAddress().addresses[i].address1" );
                              widget.order().shippingAddress().address1(widget.getExternalShippingAddress().addresses[i].address1);
                               widget.order().shippingAddress().address2(widget.getExternalShippingAddress().addresses[i].address2);
                               widget.shippingAddress().city(widget.getExternalShippingAddress().addresses[i].city);
                             //  widget.shippingAddress().name(widget.getExternalShippingAddress().addresses[i].name);
                               widget.order().shippingAddress().phoneNumber(widget.getExternalShippingAddress().addresses[i].phoneNumber);
                               widget.order().shippingAddress().postalCode(widget.getExternalShippingAddress().addresses[i].postalCode);
                               widget.order().shippingAddress().state(widget.getExternalShippingAddress().addresses[i].state);
                             //  widget.order().shippingAddress.valueHasMutated();
                        }
                    }
                 
              },error: function(e){
                  
              }
              
          })
      }
    };
  }
);
