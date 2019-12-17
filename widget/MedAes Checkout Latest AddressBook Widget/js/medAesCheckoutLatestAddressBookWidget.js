/**
 * @fileoverview Checkout Address Book Widget.
 */
/*global $ */
/*global define */
define(

    //-------------------------------------------------------------------
    // DEPENDENCIES
    //-------------------------------------------------------------------
    ['knockout', 'viewModels/address', 'ccConstants', 'pubsub',
        'koValidate', 'notifier', 'ccKoValidateRules', 'storeKoExtensions',
        'spinner', 'navigation', 'storageApi', 'ccResourceLoader!global/api-helper', 'CCi18n', 'ccResourceLoader!global/paymetric-helper'
    ],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------

    function(ko, Address, CCConstants, pubsub, koValidate, notifier,
        rules, storeKoExtensions, spinner, navigation, storageApi, helper, CCi18n, paymetricUtil) {

        "use strict";
        var widgetModel = ''
        return {

            useAsBillAddress: ko.observable(false),
            displayUseAsBillAddress: ko.observable(),
            iframeData: ko.observable(),
            // Switch between view and 'edit' views
            isUsingSavedAddress: ko.observable(false),
            isSelectingAddress: ko.observable(false),
            billingAddressEnabled: ko.observable(),
            addressSetAfterWebCheckout: ko.observable(false),
            addressSetAfterOrderLoad: ko.observable(false),
            showPreviousAddressInvalidError: ko.observable(false),
            previousSelectedCountryValid: ko.observable(false),
            shippingAddressBook: ko.observableArray().extend({
                deferred: true
            }),
            cardNumberShow: ko.observable(),
            appendCardNumber: ko.observable(),
            loadPersistedShipping: ko.observable(false),
            getExternalShippingAddress: ko.observableArray([]),
            getExternalBillingAddress: ko.observableArray([]),
            getExternalCardData: ko.observable(),
            paymentType: ko.observable(true),
            selectedShipMethod: ko.observable(false),
            isDefaultBillingAddress: ko.observable(null),
            isDefaultShippingAddress: ko.observable(null),
            additionalNotes: ko.observable(null),
            cvv: ko.observable(null),
            poNumber: ko.observable(null),
            repositoryId: ko.observable(null),
            serviceError: ko.observable(),
            // Spinner resources
            shippingAddressIndicator: '#shippingAddress',
            shippingAddressIndicatorOptions: {
                parent: '#shippingAddress',
                posTop: '50px',
                posLeft: '30%'
            },

            displaySelectedShippingOption: ko.observable(''),

            opDynamicProperty: ko.observable(),
            modalObject: ko.observable(null),

            isCreditValidation: ko.observable(false),
            isCreditCardOrPoOption: ko.observable(false),
            selectedCardId: ko.observable(''),
            EBSOrderID: ko.observable(''),
            poDocument: ko.observable(''),
            showUploadDocError: ko.observable(false),
            // add new card 
            cardType: ko.observable(),
            nameOnCard: ko.observable(),
            cardNumber: ko.observable(),
            cardIINPattern: ko.observable('[0-9]'),
            cardNumberLength: ko.observable('16'),
            expiryMonth: ko.observable(),
            expiryYear: ko.observable(),
            newCardCvv: ko.observable(),
            endYearList: [],
            isStoredCardsLoaded: ko.observable(false),
            isDefaultStoredCardValue: ko.observable(''),
            saveNewCard: ko.observable(false),

            showCreditCardPayment: ko.observable(false),
            showPoPayment: ko.observable(false),
            selectPoPayment: ko.observable(false),
            invalidAddress :ko.observable(false),
            noShippingMethods : ko.observable(false),
            pricingInProgress: ko.observable(false),
            getNewCardToken :ko.observable(''),
            backToPaymentSection :ko.observable(false),
            
            cardTypeList: [{
                    "name": "VISA",
                    "cardValue": "visa"
                },
                {
                    "name": "Master Card",
                    "cardValue": "mastercard"
                },
                {
                    "name": "Amex",
                    "cardValue": "amex"
                }
            ],
            /**
             * Repopulate this form with up to date info from the User view model.
             */

            reloadAddressInfo: function() {

                var widget = this;

                if (widget.shippingCountriesPriceListGroup().length == 0) {
                    widget.destroySpinner();
                    $.Topic(pubsub.topicNames.NO_SHIPPING_METHODS).publish();
                }
                //If there are no billing countries disable all the fields of billing address
                if (!widget.billingCountries().length) {
                    $('#billingAddress').attr('disabled', 'disabled');
                }

                widget.isUsingSavedAddress(false);

                $('#CC-addressBook-picker').on('shown.bs.modal', function() {
                    $('#CC-addressBook-picker :focusable').first().focus();
                });

                $('#CC-addressBook-picker').on('hide.bs.modal', function() {
                    $('#cc-checkout-show-address-book').focus();
                });



                // Should always use registered shopper's saved shipping address book if set
                var eventToFire = pubsub.topicNames.VERIFY_SHIPPING_METHODS;
                if (widget.user().loggedIn() === true && widget.user().updatedShippingAddressBook && widget.user().updatedShippingAddressBook.length > 0) {
                    var shippingAddresses = [];
                    var shippingAddressesAll = [];
                    for (var k = 0; k < widget.user().updatedShippingAddressBook.length; k++) {
                        var shippingAddress = new Address('user-saved-shipping-address', widget.ErrorMsg, widget, widget.shippingCountriesPriceListGroup(), widget.defaultShippingCountry());
                        shippingAddress.countriesList(widget.shippingCountriesPriceListGroup());
                        shippingAddress.copyFrom(widget.user().updatedShippingAddressBook[k], widget.shippingCountriesPriceListGroup());
                        // Save shipping address JS object to Address object.
                        shippingAddress.resetModified();

                        shippingAddress.selectedCountry.subscribe(function(newValue) {
                            widget.checkIfSelectedShipCountryInBillCountries();
                        });
                        if (shippingAddress.isValid()) {
                            shippingAddresses.push(shippingAddress);
                        }
                        if (shippingAddress.isDefaultAddress() && !widget.addressSetAfterWebCheckout() &&
                            !widget.addressSetAfterOrderLoad() && shippingAddress.isValid()) {
                            if (window.isAgentApplication && widget.order().shippingAddress() && widget.order().shippingAddress().isValid()) {
                                // Donot do anything. This case is needed when cybersource auth call is missed.
                                // When an incomplete order is loaded for which the shipping Address is already set.
                            } else {
                                widget.order().shippingAddress().copyFrom(shippingAddress.toJSON(), widget.shippingCountriesPriceListGroup());
                                widget.notifyListenersOfShippingAddressPhoneNumberUpdate();
                            }
                        }
                        widget.addressSetAfterWebCheckout(false);
                        widget.addressSetAfterOrderLoad(false);

                        //Preserve existing logic to save all the addresses to user().shippingAddressBook, irrespective of their validness
                        var shippingAddressValidOrInValid = new Address('user-saved-shipping-address', widget.ErrorMsg, widget, widget.shippingCountries(), widget.defaultShippingCountry());
                        shippingAddressValidOrInValid.countriesList(widget.shippingCountries());
                        shippingAddressValidOrInValid.copyFrom(widget.user().updatedShippingAddressBook[k], widget.shippingCountries());
                        shippingAddressesAll.push(shippingAddressValidOrInValid);
                    }
                    widget.shippingAddressBook(shippingAddresses);
                    widget.user().shippingAddressBook(shippingAddressesAll);
                    widget.user().resetShippingAddressBookModified();

                    // There shouldn't be a case where no default address was set.
                    if (!widget.order().shippingAddress().isValid() && widget.shippingAddressBook()[0]) {
                        widget.order().shippingAddress().copyFrom(widget.shippingAddressBook()[0].toJSON(), widget.shippingCountriesPriceListGroup());
                        widget.order().updateShippingAddress.bind(widget.order().shippingAddress())();
                        widget.notifyListenersOfShippingAddressPhoneNumberUpdate();
                    }

                    eventToFire = pubsub.topicNames.POPULATE_SHIPPING_METHODS;
                    if (!widget.order().isPaypalVerified() && shippingAddresses.length > 0) {
                        widget.isUsingSavedAddress(true);
                    }
                    //If the user has all invalid addresses then set the cart address if present
                    if (!widget.order().shippingAddress().isValid() && widget.cart().shippingAddress()) {
                        var shippingAddress = new Address('cart-shipping-address', widget.ErrorMsg, widget, widget.shippingCountriesPriceListGroup(), widget.defaultShippingCountry());
                        shippingAddress.countriesList(widget.shippingCountriesPriceListGroup());
                        // Save shipping address JS object to Address object.
                        shippingAddress.copyFrom(widget.cart().shippingAddress().toJSON(), widget.shippingCountriesPriceListGroup());
                        shippingAddress.resetModified();
                        widget.order().shippingAddress().copyFrom(shippingAddress.toJSON(), widget.shippingCountriesPriceListGroup());
                        widget.notifyListenersOfShippingAddressPhoneNumberUpdate();
                    }
                }
                // Otherwise If the cart shipping address is already set, then use this
                else if (widget.cart().shippingAddress()) {
                    widget.order().shippingAddress().copyFrom(widget.cart().shippingAddress().toJSON(), widget.shippingCountriesPriceListGroup());
                    widget.notifyListenersOfShippingAddressPhoneNumberUpdate();
                }

                widget.checkIfSelectedShipCountryInBillCountries();


            },

            removeSelectedCountryRegion: function() {
                storageApi.getInstance().removeItem("selectedCountryRegion");
            },

            initResourceDependents: function() {
                var widget = this;
                // Message to be displayed in the Message Panel if an error occurs
                widget.ErrorMsg = widget.translate('checkoutErrorMsg');

                widget.order().billingAddress.extend({
                    propertyWatch: widget.order().billingAddress()
                });
                widget.order().shippingAddress.extend({
                    propertyWatch: widget.order().shippingAddress()
                });

                widget.order().billingAddress(new Address('checkout-billing-address', widget.ErrorMsg, widget, widget.billingCountries(), widget.defaultBillingCountry()));
                $.Topic(pubsub.topicNames.BILLING_ADDRESS_POPULATED).publishWith([{
                    message: "success"
                }]);
                widget.order().shippingAddress(new Address('checkout-shipping-address', widget.ErrorMsg, widget, widget.shippingCountriesPriceListGroup(), widget.defaultShippingCountry()));
                $.Topic(pubsub.topicNames.SHIPPING_ADDRESS_POPULATED).publishWith([{
                    message: "success"
                }]);

                /**
                 * @function
                 * @name isValid
                 * Determine whether or not the current widget object is valid
                 * based on the validity of its component parts. This will not
                 * cause error messages to be displayed for any observable values
                 * that are unchanged and have never received focus on the
                 * related form field(s).
                 * @return boolean result of validity testo
                 */
                widget.isValid = ko.computed(function() {
                    if (widget.order().isPaypalVerified()) {
                        return widget.order().shippingAddress().isValid();
                    } else {

                        return (widget.order().billingAddress().isValid() && widget.order().shippingAddress().isValid());
                    }
                });

                /**
                 * @function
                 * @name validateNow
                 * Force all relevant member observables to perform their
                 * validation now & display the errors (if any)
                 */
                widget.validateNow = function() {

                    // call order methods to generate correct
                    // error messages, if required.
                    widget.order().validateBillingAddress();
                    widget.order().validateShippingAddress();

                    return (widget.isValid());
                };

                /**
                 * Callback function for use in widget stacks.
                 * Triggers internal widget validation.
                 * @return true if we think we are OK, false o/w.
                 */
                widget.validate = function() {

                    // Shipping address is valid and being used as the billing address so copy it.
                    if (widget.order().shippingAddress().isValid() && widget.useAsBillAddress() === true) {
                        widget.order().shippingAddress().copyTo(widget.order().billingAddress());
                    }

                    return widget.validateNow();
                };

                widget.showShippingAddressSelection = function() {
                    $('#CC-addressBook-picker').modal('show');
                };

                widget.hideShippingAddressSelection = function() {
                    $('#CC-addressBook-picker').modal('hide');
                };

                widget.selectShippingAddress = function(addr) {
                    widget.isUsingSavedAddress(true);
                    widget.order().shippingAddress().copyFrom(addr.toJSON(), widget.shippingCountriesPriceListGroup());
                    widget.hideShippingAddressSelection();
                    widget.checkIfSelectedShipCountryInBillCountries();
                };



                widget.useAsBillAddress.subscribe(function(newValue) {
                    if (widget.useAsBillAddress() === true) {
                        // Need to clear any validation errors specific to the
                        // billing address fields, prior to resetting it.
                        widget.order().shippingAddress().copyTo(widget.order().billingAddress());

                    } else {
                        widget.order().billingAddress().reset();
                        widget.order().billingAddress().resetModified();

                        if (widget.order().shippingAddress().isValid()) {
                            // CC requires Phone Number in Billing Address
                            // but ATG requires it in the Shipping Address
                            widget.order().billingAddress().phoneNumber(widget.order().shippingAddress().phoneNumber());
                        }

                        // Need to inform interested parties that any previous
                        // billing address is no longer current
                        $.Topic(pubsub.topicNames.CHECKOUT_BILLING_ADDRESS).publishWith(
                            widget.order().billingAddress(), [{
                                message: "success"
                            }]);
                    }
                });

                widget.order().shippingAddress().selectedCountry.subscribe(function(newValue) {
                    if (!window.isAgentApplication) {
                        widget.checkIfSelectedShipCountryInBillCountries();
                    }
                    if (widget.useAsBillAddress() === true) {
                        widget.order().billingAddress().selectedCountry(widget.order().shippingAddress().selectedCountry());
                    }
                });

                widget.order().shippingAddress.hasChanged.subscribe(function(hasChanged) {
                    if (hasChanged && widget.order().shippingAddress().isValid()) {
                        // Shipping address has changed and is valid and being used as the billing address so copy it.
                        if (widget.useAsBillAddress() === true) {
                            widget.order().shippingAddress().copyTo(widget.order().billingAddress());
                        }
                    }
                    widget.notifyListenersOfShippingAddressUpdate();
                });

                widget.order().billingAddress.hasChanged.subscribe(function(hasChanged) {
                    if (hasChanged && widget.order().billingAddress().isValid()) {
                        $.Topic(pubsub.topicNames.CHECKOUT_BILLING_ADDRESS).publishWith(
                            widget.order().billingAddress(), [{
                                message: "success"
                            }]);
                    }
                });

                widget.notifyListenersOfShippingAddressUpdate = function() {
                    if (widget.order().shippingAddress().isValid()) {
                         widget.invalidAddress(false); 
                        if (widget.useAsBillAddress() === true) {
                            // Need to clear any validation errors specific to the
                            // billing address fields, prior to resetting it.
                            widget.order().shippingAddress().copyTo(widget.order().billingAddress());
                        } else {
                            // CC requires Phone Number in Billing Address
                            // but ATG requires it in the Shipping Address
                            widget.order().billingAddress().phoneNumber(widget.order().shippingAddress().phoneNumber());
                        }

                        if (widget.cart().shippingAddress() == "" || widget.cart().shippingMethod() == "" ||
                            (widget.cart().isShippingAddressChanged(widget.order().shippingAddress().toJSON(), widget.cart().shippingAddress().toJSON()) &&
                                !widget.loadPersistedShipping())) {
                            widget.order().selectedShippingOption('');
                            $.Topic(pubsub.topicNames.CHECKOUT_SHIPPING_ADDRESS_UPDATED).publish();
                        } else {
                            widget.loadPersistedShipping(false);
                            var shippingAddressWithProductIDs = {};
                            shippingAddressWithProductIDs[CCConstants.SHIPPING_ADDRESS_FOR_METHODS] = widget.order().shippingAddress();
                            shippingAddressWithProductIDs[CCConstants.PRODUCT_IDS_FOR_SHIPPING] = widget.cart().getProductIdsForItemsInCart();
                            widget.cart().shippingAddress(widget.cart().shippingAddress().toJSON());
                            widget.cart().updateShippingAddress.bind(shippingAddressWithProductIDs)();
                        }

                        // Saving selected country and selected region to localStorage 
                        var selectedCountryRegion = new Object();
                        selectedCountryRegion.selectedCountry = widget.order().shippingAddress().selectedCountry();
                        selectedCountryRegion.selectedState = widget.order().shippingAddress().selectedState();
                        selectedCountryRegion.postalCode = widget.order().shippingAddress().postalCode();
                        try {
                            widget.checkPreviousAddressValidity(widget);
                            storageApi.getInstance().setItem("selectedCountryRegion", JSON.stringify(selectedCountryRegion));
                        } catch (pError) {}

                    } else if (widget.order().shippingAddress().validateForShippingMethod()) {
                        // Handle case where address is sufficiently completed to calculate shipping & tax
                        // Ensure that required fields have at least blank values
                        if (widget.order().shippingAddress().firstName() == undefined)
                            widget.order().shippingAddress().firstName('');
                        if (widget.order().shippingAddress().lastName() == undefined)
                            widget.order().shippingAddress().lastName('');
                        if (widget.order().shippingAddress().address1() == undefined)
                            widget.order().shippingAddress().address1('');
                        if (widget.order().shippingAddress().city() == undefined)
                            widget.order().shippingAddress().city('');
                        if (widget.order().shippingAddress().phoneNumber() == undefined)
                            widget.order().shippingAddress().phoneNumber('');

                        if (widget.cart().shippingAddress() == "" || widget.cart().shippingMethod() == "" ||
                            widget.cart().isShippingAddressChanged(widget.order().shippingAddress().toJSON(), widget.cart().shippingAddress().toJSON())) {
                            widget.order().selectedShippingOption('');
                            $.Topic(pubsub.topicNames.CHECKOUT_SHIPPING_ADDRESS_UPDATED).publish();
                        } else {
                            var shippingAddressWithProductIDs = {};
                            shippingAddressWithProductIDs[CCConstants.SHIPPING_ADDRESS_FOR_METHODS] = widget.order().shippingAddress();
                            shippingAddressWithProductIDs[CCConstants.PRODUCT_IDS_FOR_SHIPPING] = widget.cart().getProductIdsForItemsInCart();
                            widget.cart().shippingAddress(widget.cart().shippingAddress().toJSON());
                            widget.cart().updateShippingAddress.bind(shippingAddressWithProductIDs)();
                        }

                        // Saving selected country and selected region to localStorage 
                        var selectedCountryRegion = new Object();
                        selectedCountryRegion.selectedCountry = widget.order().shippingAddress().selectedCountry();
                        selectedCountryRegion.selectedState = widget.order().shippingAddress().selectedState();
                        selectedCountryRegion.postalCode = widget.order().shippingAddress().postalCode();
                        try {
                            widget.checkPreviousAddressValidity(widget);
                            storageApi.getInstance().setItem("selectedCountryRegion", JSON.stringify(selectedCountryRegion));
                        } catch (pError) {}

                    } else if (!widget.order().shippingAddress().isValid()) {
                        if (!widget.cart().shippingMethod() && widget.cart().shipping()) {
                            widget.cart().shipping(0);
                        }
                        $.Topic(pubsub.topicNames.CHECKOUT_SHIPPING_ADDRESS_INVALID).publish();
                    }
                };

                widget.notifyListenersOfShippingAddressPhoneNumberUpdate = function() {
                    if (widget.order().shippingAddress().phoneNumber.isValid()) {
                        widget.order().billingAddress().phoneNumber(widget.order().shippingAddress().phoneNumber());
                    }
                };
                
                 $.Topic(pubsub.topicNames.CHECKOUT_SHIPPING_ADDRESS_INVALID).subscribe(function (obj) {
                     widget.invalidAddress(true);
                     widget.noShippingMethods(false);  
                     widget.destroySpinner();
                 })
            
            },

            /**
             * Called before the widget appears every time.
             */
            beforeAppear: function(page) {

                if (window.matchMedia('(max-width: 767px)').matches) {
                    $("#medAesCheckoutLatestCustomerAddressBook_v1-wi300354").parent('.col-sm-8').css("padding", "0px");
                    $("#medAesCheckoutLatestCustomerAddressBook_v1-wi300354").parents().parent('.container').css("background", "#fff");
                }
                var widget = this;
                
                widget.order().shippingAddress().phoneNumber.rules.remove(function (item) {
					return item.rule == "required";
				});
                widget.order().billingAddress().phoneNumber.rules.remove(function (item) {
					return item.rule == "required";
				});
				
				widget.order().shippingAddress().phoneNumber.rules.remove(function (item) {
					return item.rule == "pattern";
				});
                widget.order().billingAddress().phoneNumber.rules.remove(function (item) {
					return item.rule == "pattern";
				});
				
				widget.order().shippingAddress().phoneNumber.rules.remove(function (item) {
					return item.rule == "maxLength";
				});
                widget.order().billingAddress().phoneNumber.rules.remove(function (item) {
					return item.rule == "maxLength";
				});
				
				ko.validation.init({
				  registerExtenders: true,
				  messagesOnModified: true,
				  insertMessages: true,
				  parseInputAttributes: true,
				  messageTemplate: null
				}, true);
				
                widget.getExternalShippingAddresses();
                widget.getExternalBillingAddresses();
                widget.isDefaultShippingAddress('');
                widget.isDefaultBillingAddress('');
                widget.isDefaultStoredCardValue('');
                widget.invalidAddress(false);
                widget.noShippingMethods(false);
                widget.additionalNotes('');
                widget.getNewCardToken('');
                widget.selectedCardId('');
                widget.order().poNumber("");
                widget.backToPaymentSection(false);
                paymetricUtil.fetchFrameUrl(function(frameData) {
                    if (frameData.hasOwnProperty('iframeUrl')) {
                        widget.iframeData(frameData);
                        console.log("widget.iframeData(", widget.iframeData().iframeUrl);
                    }
                });
                widget.displaySelectedShippingOption('');
                 widget.settingExternalListAndSalePrice();
                // Reset the address book forms before populating new data
                if (window.isAgentApplication) {
                    widget.resetAddressData();
                }

                if (widget.cart().shippingMethod()) {
                    widget.loadPersistedShipping(true);
                } else {
                    widget.loadPersistedShipping(false);
                }
                widget.checkPreviousAddressValidity(widget);

                var previousSelectedCountryRegion = null;
                try {
                    previousSelectedCountryRegion = storageApi.getInstance().getItem("selectedCountryRegion");
                    if (previousSelectedCountryRegion && typeof previousSelectedCountryRegion == 'string') {
                        previousSelectedCountryRegion = JSON.parse(previousSelectedCountryRegion);
                    }
                } catch (pError) {}
                /*if (previousSelectedCountryRegion && !widget.showPreviousAddressInvalidError() && (!widget.cart().shippingAddress() ||
                        !(widget.cart().shippingAddress().validateForShippingMethod && widget.cart().shippingAddress().validateForShippingMethod()))) {
                    widget.order().shippingAddress().selectedCountry(previousSelectedCountryRegion.selectedCountry);
                    widget.order().shippingAddress().selectedState(previousSelectedCountryRegion.selectedState);
                    widget.order().shippingAddress().postalCode(previousSelectedCountryRegion.postalCode);
                    widget.previousSelectedCountryValid(false);
                } else if (previousSelectedCountryRegion && widget.previousSelectedCountryValid() && widget.showPreviousAddressInvalidError()) {
                    widget.order().shippingAddress().selectedCountry(previousSelectedCountryRegion.selectedCountry);
                    notifier.sendError(widget.typeId(), CCi18n.t('ns.medAesCheckoutLatestAddressBookWidget:resources.invalidPreviousAddress'), true);
                    widget.showPreviousAddressInvalidError(false);
                    widget.previousSelectedCountryValid(false);
                } else if (widget.showPreviousAddressInvalidError()) {
                    notifier.sendError(widget.typeId(), CCi18n.t('ns.medAesCheckoutLatestAddressBookWidget:resources.invalidPreviousAddress'), true);
                    widget.showPreviousAddressInvalidError(false);
                }*/
                widget.removeSelectedCountryRegion();

                widget.billingAddressEnabled(widget.order().isPaypalVerified());
                widget.reloadAddressInfo();
                if (widget.order().isPaypalVerified()) {
                    // On successful return from paypal site
                    widget.createSpinner();
                    // Fetches the data to populate the checkout widgets
                    widget.order().getOrder();
                }
                // By default, dynamic property element should update.
                widget.opDynamicProperty("update");
                
                // display any one of the payment type 
                if (widget.user().currentOrganization().derivedPaymentMethods) {
                    for (var i = 0; i < widget.user().currentOrganization().derivedPaymentMethods.length > 0; i++) {
                        if (widget.user().currentOrganization().derivedPaymentMethods[i] == 'invoice') {
                            widget.isCreditCardOrPoOption(true);
                            widget.showPoPayment(true);
                            widget.selectPoPayment(true);
                            widget.order().isInvoicePayment(true);
                            console.log(widget.showCreditCardPayment(), "...widget.showCreditCardPayment(");
                        } else if (widget.user().currentOrganization().derivedPaymentMethods[i] == 'card') {
                             widget.getExternalCardDetails();
                            widget.showCreditCardPayment(true);
                            widget.order().isInvoicePayment(false);
                            console.log(widget.showCreditCardPayment(), "...widget.showCreditCardPayment(");
                        }
                    }

                    if (widget.showPoPayment() && widget.showCreditCardPayment()) {
                        widget.isCreditCardOrPoOption(false);
                        widget.selectPoPayment(false);
                    }

                }

                // while navigation cvv remains same clearing it 
                widget.cvv('');

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
                
                $.Topic(pubsub.topicNames.ORDER_PRICING_SUCCESS).subscribe(function(){
                   widget.pricingInProgress(false);
                   widget.invalidAddress(false);
                   widget.destroySpinner();
                });
            
                $.Topic(pubsub.topicNames.ORDER_PRICING_FAILED).subscribe(function (obj) {
                    widget.pricingInProgress(false);
                    widget.destroySpinner();
                });
                
                widgetModel = widget;
                paymetricUtil.loadPaymetricJs();
                if (window.matchMedia('(max-width: 767px)').matches) {
                    $("#medAesCheckoutLatestCustomerAddressBook_v1-wi300354").parent('.col-sm-8').css("padding", "0px");
                    $("#medAesCheckoutLatestCustomerAddressBook_v1-wi300354").parents().parent('.container').css("padding", "0px");
                }
                // These are not configuration options
                widget.order().billingAddress.isData = true;
                widget.order().shippingAddress.isData = true;
                widget.useAsBillAddress.isData = true;
                // set form defaults

                widget.resetListener = function(obj) {
                    widget.order().billingAddress().reset();
                    widget.order().shippingAddress().reset();
                    widget.showCreditCardPayment(false);
                    widget.showPoPayment(false);
                    widget.shippingAddressBook([]);
                };

                $.Topic(pubsub.topicNames.ORDER_SUBMISSION_SUCCESS).subscribe(widget.resetListener);
                $.Topic(pubsub.topicNames.LOAD_ORDER_RESET_ADDRESS).subscribe(widget.resetListener);

                // Handle user logging in- reload address details whenever the user profile loads shipping info.
                $.Topic(pubsub.topicNames.USER_LOAD_SHIPPING).subscribe(function(obj) {
                    if (navigation.getRelativePath().indexOf(widget.links().profile.route) == -1) {
                        widget.reloadAddressInfo();
                    }

                    if (widget.user().loggedIn() && widget.user().updatedShippingAddress && (widget.cart().items().length > 0)) {
                        var shippingAddress = new Address('user-default-shipping-address', widget.ErrorMsg, widget, widget.shippingCountriesPriceListGroup(), widget.defaultShippingCountry());
                        shippingAddress.countriesList(widget.shippingCountriesPriceListGroup());
                        shippingAddress.copyFrom(widget.user().updatedShippingAddress, widget.shippingCountriesPriceListGroup());
                        shippingAddress.resetModified();
                        if (shippingAddress.isValid()) {
                            widget.order().shippingAddress().copyFrom(widget.user().updatedShippingAddress, widget.shippingCountriesPriceListGroup());
                            widget.order().shippingAddress().resetModified();
                            widget.notifyListenersOfShippingAddressPhoneNumberUpdate();
                        }
                    }
                });

                // Handle user logging out and taking their saved addresses with them.
                $.Topic(pubsub.topicNames.USER_LOGOUT_SUCCESSFUL).subscribe(function(obj) {
                    widget.resetListener();
                    widget.isUsingSavedAddress(false);
                    widget.removeSelectedCountryRegion();
                });

                $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(widget.removeSelectedCountryRegion);

                $.Topic(pubsub.topicNames.ORDER_SUBMISSION_SUCCESS).subscribe(widget.removeSelectedCountryRegion);
/*
                widget.destroySpinner = function() {
                    $(widget.shippingAddressIndicator).removeClass('loadingIndicator');
                    spinner.destroyWithoutDelay(widget.shippingAddressIndicator);
                };
*/
                widget.shippingAddressDuringPaypalCheckout = function(paypalShippingAddress) {
                    var shippingAddress = new Address('user-paypal-shipping-address', widget.ErrorMsg, widget, widget.shippingCountriesPriceListGroup(), widget.defaultShippingCountry());
                    if (paypalShippingAddress && (widget.cart().items().length > 0) && widget.order().isPaypalVerified()) {
                        // Check if checkout address (without any shipping method) exists in local storage. If exists then ovewrite the PayPal's address with this address
                        var checkoutAddressWithoutShippingMethod = storageApi.getInstance().getItem("checkoutAddressWithoutShippingMethod");
                        if (checkoutAddressWithoutShippingMethod) {
                            paypalShippingAddress = JSON.parse(checkoutAddressWithoutShippingMethod);
                            storageApi.getInstance().removeItem("checkoutAddressWithoutShippingMethod");
                        }
                        // Save shipping address JS object to Address object.
                        shippingAddress.copyFrom(paypalShippingAddress, widget.shippingCountriesPriceListGroup());
                        shippingAddress.resetModified();
                    } else if (widget.user().loggedIn() === true && widget.user().updatedShippingAddress && (widget.cart().items().length > 0)) {
                        // Save shipping address JS object to Address object.
                        shippingAddress.copyFrom(widget.user().updatedShippingAddress, widget.shippingCountriesPriceListGroup());
                        shippingAddress.resetModified();
                    }
                    widget.order().shippingAddress().copyFrom(shippingAddress.toJSON(), widget.shippingCountriesPriceListGroup());
                    widget.cart().shippingAddress(widget.order().shippingAddress());
                    widget.billingAddressEnabled(widget.order().isPaypalVerified());
                    $.Topic(pubsub.topicNames.PAYPAL_SHIPPING_ADDRESS_ALTERED).publish();
                    widget.destroySpinner();
                };

                widget.billingAddressDuringExternalCheckout = function(externalBillingAddress) {
                    var billingAddress = new Address('user-billing-address', widget.ErrorMsg, widget, widget.billingCountries(), widget.defaultBillingCountry());
                    if (externalBillingAddress && (widget.cart().items().length > 0)) {
                        // Save billing address JS object to Address object.
                        widget.useAsBillAddress(false);
                        widget.displayUseAsBillAddress(false);
                        billingAddress.copyFrom(externalBillingAddress, widget.billingCountries());
                        billingAddress.resetModified();
                        widget.order().billingAddress().copyFrom(billingAddress.toJSON(), widget.billingCountries());
                        //if billing country returned by paypal is not listed in the commerce's billing countries
                        if (!billingAddress.isValid() && billingAddress.country() == '' && billingAddress.state() == '') {
                            widget.order().billingAddress().selectedCountry(externalBillingAddress.country);
                            widget.order().billingAddress().selectedState(externalBillingAddress.state);
                        }
                    }
                    widget.destroySpinner();
                };
                $.Topic(pubsub.topicNames.PAYPAL_CHECKOUT_SHIPPING_ADDRESS).subscribe(widget.shippingAddressDuringPaypalCheckout.bind(this));
                $.Topic(pubsub.topicNames.EXTERNAL_CHECKOUT_BILLING_ADDRESS).subscribe(widget.billingAddressDuringExternalCheckout.bind(this));

                widget.shippingAddressDuringWebCheckout = function(webShippingAddress) {
                    var shippingAddress = new Address('user-web-shipping-address', widget.ErrorMsg, widget, widget.shippingCountriesPriceListGroup(), widget.defaultShippingCountry());
                    if (webShippingAddress && (widget.cart().items().length > 0)) {
                        // Save shipping address JS object to Address object.
                        shippingAddress.copyFrom(webShippingAddress, widget.shippingCountriesPriceListGroup());
                        shippingAddress.resetModified();
                    }
                    widget.order().shippingAddress().copyFrom(shippingAddress.toJSON(), widget.shippingCountriesPriceListGroup());
                    widget.addressSetAfterWebCheckout(true);
                    widget.destroySpinner();
                };

                $.Topic(pubsub.topicNames.WEB_CHECKOUT_SHIPPING_ADDRESS).subscribe(widget.shippingAddressDuringWebCheckout.bind(this));

                widget.shippingAddressDuringLoadOrder = function(loadOrderShippingAddress) {
                    var shippingAddress = new Address('loaded-order-shipping-address', widget.ErrorMsg, widget, widget.shippingCountriesPriceListGroup(), widget.defaultShippingCountry());
                    if (loadOrderShippingAddress && (widget.cart().items().length > 0)) {
                        // Save shipping address JS object to Address object.
                        shippingAddress.copyFrom(loadOrderShippingAddress, widget.shippingCountriesPriceListGroup());
                        shippingAddress.resetModified();
                    }
                    widget.order().shippingAddress().copyFrom(shippingAddress.toJSON(), widget.shippingCountriesPriceListGroup());
                    widget.addressSetAfterOrderLoad(true);
                    widget.destroySpinner();
                };

                $.Topic(pubsub.topicNames.LOADED_ORDER_SHIPPING_ADDRESS).subscribe(widget.shippingAddressDuringLoadOrder.bind(this));


                $.Topic(pubsub.topicNames.USER_SESSION_EXPIRED).subscribe(function() {
                    widget.isUsingSavedAddress(false);
                });

                $.Topic(pubsub.topicNames.GET_INITIAL_ORDER_FAIL).subscribe(function() {
                    widget.billingAddressEnabled(widget.order().isPaypalVerified());
                    widget.destroySpinner();
                    widget.checkIfSelectedShipCountryInBillCountries();
                });

             /*   widget.createSpinner = function() {
                    $(widget.shippingAddressIndicator).css('position', 'relative');
                    $(widget.shippingAddressIndicator).addClass('loadingIndicator');
                    spinner.create(widget.shippingAddressIndicatorOptions);
                };*/

                widget.handleAddNewShippingAddress = function() {
                    widget.order().shippingAddress().reset();
                    widget.order().shippingAddress().resetModified();
                    widget.opDynamicProperty("update");
                    widget.isUsingSavedAddress(false);
                    $('#CC-checkoutAddressBook-sfirstname').focus();
                    widget.checkIfSelectedShipCountryInBillCountries();
                    $.Topic(pubsub.topicNames.ADD_NEW_CHECKOUT_SHIPPING_ADDRESS).publish();
                };

                widget.checkIfSelectedShipCountryInBillCountries = function() {
                    //If the selected shipping country is not in the billing country list, hide the checkbox,
                    //and show the billing address. If the selected country is in the billing country list,
                    //then, show the checkbox, and hide the billing address
                    if (widget.billingCountries()) {
                        var selectedShipCountryInBillCountries = false;
                        for (var i = 0; i < widget.billingCountries().length; i++) {
                            if (widget.order().shippingAddress().selectedCountry() === widget.billingCountries()[i].countryCode) {
                                selectedShipCountryInBillCountries = true;
                                break;
                            }
                        }
                        if (!selectedShipCountryInBillCountries || widget.order().isPaypalVerified()) {
                            widget.useAsBillAddress(false);
                            widget.displayUseAsBillAddress(false);
                        } else {
                            if (widget.order().billingAddress().isEmpty() || widget.order().billingAddress().compare(widget.order().shippingAddress()))
                                widget.useAsBillAddress(false);
                            else
                                widget.useAsBillAddress(false);
                            widget.displayUseAsBillAddress(true);
                        }
                    } else {
                        widget.useAsBillAddress(false);
                        widget.displayUseAsBillAddress(true);
                    }
                };
                widget.displayInvalidBillingAddressText = function() {
                    return !widget.billingAddressEnabled() && !widget.displayUseAsBillAddress() &&
                        ko.isObservable(widget.order) && ko.isObservable(widget.order().shippingAddress) && widget.order().shippingAddress() &&
                        ko.unwrap(widget.order().shippingAddress().country) !== '';
                };
                widget.CCi18n = CCi18n;


               // widget.settingExternalListAndSalePrice();
                widget.updateDynamicProperties();

                $("body").delegate(".shippingBlock a", "click", function(e) {
                    $(".progressTracker-navigation").find("li").removeClass("active");
                    $(".tab-content").find(".tab-pane").removeClass("active");
                    $('.progressTracker-navigation').find('li:nth-child(1)').addClass('active');
                    $(".tab-content").find(".tab-pane:nth-child(1)").addClass("active");
                    $('.trackerBtn').addClass("hide");
                    $('.trackerBtn[area-val="paymentBtn"]').removeClass('hide');
                    $('#CC-checkoutOrderSummary-orderTotal').addClass('hide');
                    $('.taxCalculationMsg').removeClass('hide');
                    $('.billing-address-section,.checkout-reviewOrder').addClass('hide');
                    $('.shipping-address-section').removeClass('hide');
                    $('.progressTracker-navigation').find('li:nth-child(1)').find('.progressTrackerClick').removeClass('showTickMark');
                    $('.progressTracker-navigation').find('li:nth-child(2)').find('.progressTrackerClick').removeClass('showTickMark');
                    $('#frieghtSection,#taxSection').addClass('hide');
                });
                $("body").delegate(".billingBlock a", "click", function(e) {
                    //  console.log(".....clicking edit.....")
                    widget.createSpinner();
                    $('#addNewCardSection').addClass('hide');
                    $(".progressTracker-navigation").find("li").removeClass("active");
                    $(".tab-content").find(".tab-pane").removeClass("active");
                    $('.progressTracker-navigation').find('li:nth-child(2)').addClass('active');
                    $(".tab-content").find(".tab-pane:nth-child(2)").addClass("active");
                    $('.trackerBtn').addClass("hide");
                    $('.trackerBtn[area-val="confirmationBtn"]').removeClass('hide');
                    $('#CC-checkoutOrderSummary-orderTotal').addClass('hide');
                    $('.taxCalculationMsg').removeClass('hide');
                    $('.billing-address-section').removeClass('hide');
                    $('.checkout-reviewOrder,.shipping-address-section').addClass('hide');
                    $('.progressTracker-navigation').find('li:nth-child(2)').find('.progressTrackerClick').removeClass('showTickMark');
                    $('#frieghtSection,#taxSection').addClass('hide');
                    $('#eixistingCardCVV').removeClass('hide');
                     widget.backToPaymentSection(true);
                     widget.isCreditValidation(false);
                     widget.getExternalCardDetails();
                });

                $("body").delegate('#CC-checkoutAddressBook-poNumber', 'focusout', function() {
                    var getVal = $('#CC-checkoutAddressBook-poNumber').val();
                    if (getVal !== "") {
                        widget.order().poNumber(getVal);
                    }
                });

                $("body").delegate(".shippingOptionsList", "click", function(e) {
                    widget.pricingInProgress(true);
                    var value = $(e.currentTarget).val();
                    $('#CC-cartShippingDetails-shippingMethodName-' + value).trigger('click');
                })



                widget.cardType.subscribe(function(newValue) {
                    //  console.log("card typeeee", newValue);
                    if (newValue == 'visa') {
                        widget.cardIINPattern('4'),
                            widget.cardNumberLength('13|16');
                        $("#cc-card-number").attr('maxlength', '16');
                    } else if (newValue == 'mastercard') {
                        widget.cardIINPattern('5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720'),
                            widget.cardNumberLength('16');
                        $("#cc-card-number").attr('maxlength', '16');
                    } else if (newValue == 'amex') {
                        widget.cardIINPattern('3[47]'),
                            widget.cardNumberLength('15');
                        $("#cc-card-number").attr('maxlength', '15');
                    }
                });

                widget.addValidationRules();
                $.Topic('payment_submit').subscribe(function() {
                    if (widget.validationModel.isValid()) {
                        // console.log("......Payment is submitting....");
                        $('#paymentBtn').addClass('hide');
                        $('.trackerBtn').addClass("hide");
                        $(".progressTracker-navigation").find("li").removeClass("active");
                        $(".tab-content").find(".tab-pane").removeClass("active");
                        $('.progressTracker-navigation').find('li:nth-child(2)').addClass('active');
                        $(".tab-content").find(".tab-pane:nth-child(2)").addClass("active");
                        $('#CC-checkoutOrderSummary-orderTotal').addClass('hide');
                        $('.taxCalculationMsg').removeClass('hide');
                        $('.billing-address-section').removeClass('hide');
                        $('.shipping-address-section').addClass('hide');
                        $('.progressTracker-navigation').find('li:nth-child(1)').find('.progressTrackerClick').addClass('showTickMark');
                        $('#confirmationButton').removeClass('hide');
                        $('#CC-checkoutAddressBook-poNumber').val('');
                        $('#CC-checkoutAddressBook-cvv').val('');
                        $('#example-file').val('');
                        widget.addValidationRules();

                    } else {
                        widget.validationModel.errors.showAllMessages();
                    }
                })



                $.Topic('confirmation_submit').subscribe(function() {
                   
                    widget.updateDynamicProperties();
                    if (widget.order().selectedShippingOption()) {
                        widget.displaySelectedShippingOption(widget.order().selectedShippingOption().shippingOption.displayName);
                    }
                    if (!widget.isCreditCardOrPoOption()) {

                        if (widget.isCreditValidation()) {
                            widget.isDefaultCard = ko.observable(false);
                            paymetricUtil.addCard(widget, function(data) {
                                console.log("Dataaaaa", data);
                                  widget.destroySpinner();
                                if (data.hasOwnProperty('token')) {
                                    var cardDetails = {};
                                    cardDetails['cardNumber'] = data.token;
                                    cardDetails['cardType'] = data.cardType;
                                    cardDetails['endMonth'] = data.expiryMonth;
                                    cardDetails['endYear'] = data.expiryYear;
                                    cardDetails['selectedCardType'] = data.cardType;
                                    cardDetails['selectedEndMonth'] = data.expiryMonth;
                                    cardDetails['selectedEndYear'] = data.expiryYear;
                                    cardDetails['nameOnCard'] = data.nameOnCard;
                                    cardDetails['expiryMonth'] = data.expiryMonth;
                                    cardDetails['expiryYear'] = data.expiryYear;
                                    cardDetails['nickname'] = data.nameOnCard;
                                    cardDetails["paymentMethodType"] = 'card';
                                    cardDetails['type'] = 'card';
                                    widget.getNewCardToken(data.maskedCardNumber);
                                   // console.log(widget.getNewCardToken(),"....widget.getNewCardToken......");
                                    //cardDetails['cardCVV']=widget.newCardCvv();
                                    if (widget.order().payments().length === 0) {
                                        widget.order().payments.push(cardDetails);
                                    } else {
                                        widget.order().payments()[0] = cardDetails;
                                    }
                                    widget.showSteptwo();
                                    $('#addCardIframe').modal('hide');
                                     widget.selectedCardId(data.id);
                                     widget.updateDynamicProperties();
                                      paymetricUtil.fetchFrameUrl(function(frameData) {
                                        if (frameData.hasOwnProperty('iframeUrl')) {
                                            widget.iframeData(frameData);
                                            console.log("widget.iframeData(", widget.iframeData().iframeUrl);
                                        }
                                    });
                                } else {
                                     widget.destroySpinner();
                                    console.log("error in service");
                                    notifier.sendError(widget.WIDGET_ID, "There is some problem in adding your card, Please refresh the page and try it again", true);
                                    widgetModel.serviceError("Error in service");
                                }
                            });
                            if (widget.newCardValidationModel.isValid()) {
                                widget.showSteptwo();
                                var postData = {
                                    "cardDetails": {
                                        "cardType": widget.cardType(),
                                        "nameOnCard": widget.nameOnCard(),
                                        "token": "4222222222222",
                                        // "maskedCardNumber": widget.cardNumber(),
                                        "cardDescription": "",
                                        "expiryMonth": Number(widget.expiryMonth()),
                                        "expiryYear": Number(widget.expiryYear()),
                                        "isDefault": false
                                    },
                                    "site": {
                                        "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                                        "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
                                    }
                                }

                                  var data = {
                                    "enpointUrl": helper.apiEndPoint.addCard + '?accountId=' + widget.user().currentOrganization().repositoryId,
                                    "postData": postData
                                }
                                helper.postDataExternal(data, function(err, result) {
                                    if (err) {
                                        notifier.sendError(widget.WIDGET_ID, widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
                                    }
                                    if (result) {
                                        var cardDetails = {};
                                        cardDetails['cardNumber'] = widget.cardNumber();
                                        cardDetails['cardType'] = widget.cardType();
                                        cardDetails['endMonth'] = widget.expiryMonth();
                                        cardDetails['endYear'] = widget.expiryYear();
                                        cardDetails['selectedCardType'] = widget.cardType();
                                        cardDetails['selectedEndMonth'] = widget.expiryMonth();
                                        cardDetails['selectedEndYear'] = widget.expiryYear();
                                        cardDetails['nameOnCard'] = widget.nameOnCard();
                                        cardDetails['expiryMonth'] = widget.expiryMonth();
                                        cardDetails['expiryYear'] = widget.expiryYear();
                                        cardDetails['nickname'] = widget.nameOnCard();
                                        cardDetails["paymentMethodType"] = 'card';
                                        cardDetails['type'] = 'card';
                                        cardDetails['cardCVV'] = widget.newCardCvv();
                                        if (widget.order().payments().length === 0) {
                                            widget.order().payments.push(cardDetails);
                                        } else {
                                            widget.order().payments()[0] = cardDetails;
                                        }

                                    }
                                    
                                })
                                $("#addcardFrame").css("height","");
                            } else {   
                                  $("#addcardFrame").css("height","450");
                                  widget.newCardValidationModel.errors.showAllMessages();
                                  
                            }
                        } else {
                            if (widget.existingCardViewModal.isValid()) {   
                                widget.showSteptwo();
                                widget.updatePaymentDetails();
                                
                            } else {
                                
                                widget.existingCardViewModal.errors.showAllMessages();
                            }
                        }

                    } else {
                        var inp = document.getElementById('uploadPoDocument');
                        if (inp.files.length == 0) {
                            widget.showUploadDocError(true);
                        } else {
                            widget.showUploadDocError(false);
                        }
                        if (widget.poViewModal.isValid() && inp.files.length !== 0) {
                            widget.showSteptwo();
                        } else {
                            widget.poViewModal.errors.showAllMessages();
                        }

                    }

                })


                widget.cvv.subscribe(function(newCardNumber) {
                    widget.cvv(newCardNumber);
                });

                $.Topic('NO_SHIPPING_METHODS.memory').subscribe(function(){  
                        widget.noShippingMethods(true);  
                        widget.invalidAddress(false);
                });



              $.Topic('BACK_TO_PAYMENT.memory').subscribe(function(){
                     widget.createSpinner();
                     $('#addNewCardSection').addClass('hide');
                     $('#eixistingCardCVV').removeClass('hide');
                      widget.backToPaymentSection(true);
                      widget.getExternalCardDetails();
                      widget.isCreditValidation(false);
                  
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
            // slice last 4 digits card no 
            appendCardNo: function(data) {
                console.log("pcardNodata", data);
                var card;
                var widget = this;
                if (data) {
                    card = data;
                    widget.appendCardNumber(card.substr(card.length - 4, 4));
                    console.log(widget.appendCardNumber(), "appendCardNumber");
                }
            },
            settingExternalListAndSalePrice: function() {
                var widget = this;
                var skuIds = [];
                if (widget.cart().allItems().length > 0) {
                    for (var i = 0; i < widget.cart().allItems().length > 0; i++) {
                        for (var j = 0; j < widget.cart().allItems()[i].productData().childSKUs.length > 0; j++) {
                            var skuId = widget.cart().allItems()[i].productData().childSKUs[j].repositoryId;
                            var quotingCatId = widget.cart().allItems()[i].productData().childSKUs[j].x_quotingCategoryIDs ? widget.cart().allItems()[i].productData().childSKUs[j].x_quotingCategoryIDs.replace(/<\/?p>/g, '') : "";
                            skuIds.push({
                                "itemId": skuId,
                                "quotingCatIds": quotingCatId
                            })
                        }
                    }

                    var skuData = {
                        "itemIds": skuIds,
                        "custAccountId": widget.user().currentOrganization().external_account_id,
                        "pricingListId": widget.user().currentOrganization().external_price_list_id,
                        "currency": widget.site().currency.currencyCode,
                        "site": {
                            "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                            "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
                        }
                    }

                    var data = {
                        "enpointUrl": helper.apiEndPoint.pricing,
                        "postData": skuData
                    }

                    helper.postDataExternal(data, function(err, result) {
                        if (result.hasOwnProperty('pricingRecords')) {
                            for (var n = 0; n < widget.cart().allItems().length > 0; n++) {
                                for (var o = 0; o < widget.cart().allItems()[n].productData().childSKUs.length > 0; o++) {
                                    for (var p = 0; p < result.pricingRecords.length > 0; p++) {
                                        if (widget.cart().allItems()[n].productData().childSKUs[o].repositoryId == result.pricingRecords[p].itemId) {
                                            widget.cart().allItems()[n].external_list_price(result.pricingRecords[p].listPrice);
                                            widget.cart().allItems()[n].external_sale_price(result.pricingRecords[p].salePrice);

                                        }
                                    }
                                }
                            }
                        } else if (err) {}
                    })


                }
            },

            showSteptwo: function() {
                $('.trackerBtn').addClass("hide");
                $(".progressTracker-navigation").find("li").removeClass("active");
                $(".tab-content").find(".tab-pane").removeClass("active");
                $('.progressTracker-navigation').find('li:nth-child(3)').addClass('active');
                $(".tab-content").find(".tab-pane:nth-child(3)").addClass("active");
                $('#CC-checkoutOrderSummary-orderTotal').removeClass('hide');
                $('.taxCalculationMsg').addClass('hide');
                $('.checkout-reviewOrder').removeClass('hide');
                $('.billing-address-section,.shipping-address-section').addClass('hide');
                $('.progressTracker-navigation').find('li:nth-child(2)').find('.progressTrackerClick').addClass('showTickMark');
                setTimeout(function() {
                    $('.confirmPlaceOrder').removeClass('hide');
                    $('#taxSection').removeClass('hide');
                    $('#frieghtSection').removeClass('hide');

                }, 500);
            },

            updateDynamicProperties: function() {
                var widget = this;
                console.log("widget.selectedCardId()..................", widget.selectedCardId());
                widget.cart().dynamicProperties().forEach(function(data) {
                    if (data.id() == "shipping_notes") {
                        data.value(widget.additionalNotes());
                    } else if (data.id() == 'credit_card_id') {
                        data.value(widget.selectedCardId());
                    }
                });
                $.Topic("UPDATE_SELECTED_CARD_ID").publish(widget.selectedCardId());
            },


            setEndYear: function() {
                var widget = this;
                var YEAR_LIST_LENGTH = 20;
                var endYear = new Date().getFullYear();
                for (var i = 0; i < YEAR_LIST_LENGTH; i++) {
                    widget.endYearList.push(endYear);
                    ++endYear;
                }
            },
            updateCard: function(data, event) {
                var widget = this;
                var dropDownValue = $(event.currentTarget).val();
                console.log(dropDownValue,"..dropDownValue....");
                widget.cvv("");
                widget.cvv.isModified(false);
                if(dropDownValue == "addNewCard") {
                    $('#addNewCardSection').removeClass('hide');
                    $('#creditCardCVV').addClass('hide');
                    $('#eixistingCardCVV').addClass('hide');
                    var frameuri = widgetModel.iframeData().iframeUrl + '? origin=' + widget.site().extensionSiteSettings.externalSiteSettings.siteUrl;
                    console.log("widgetModel.iframeData().iframeUrl", frameuri);
                    var frameElement = document.getElementById('addcardFrame');
                    frameElement.contentWindow.location.href = widgetModel.iframeData().iframeUrl;
                    frameElement.autosizeheight = true;
                    frameElement.autosizewidth = true;
                    $("#addcardFrame").css("height","");
                    widget.cvv.rules.remove(function(item) {
                        return item.rule == "required";
                    });
                    widget.cvv.rules.remove(function(item) {   
                        return item.rule == "cvv";
                    });
                    widget.addValidationRules();
                    widget.isCreditValidation(true);
                     widget.isDefaultStoredCardValue.rules.remove(function(item) {
                        return item.rule == "required";
                    });
                } else if(dropDownValue != "addNewCard" && dropDownValue) {       
                   $('#addNewCardSection').addClass('hide');
                    if(dropDownValue!== ''){
                     widget.isDefaultStoredCardValue(dropDownValue);    
                  }
                   widget.appendCardNo(widget.isDefaultStoredCardValue());
                    $('#creditCardCVV').removeClass('hide');
                    $('#eixistingCardCVV').removeClass('hide');
                    widget.isCreditValidation(false);
                    widget.removeNewCardValidationRules();
                }
                else if(dropDownValue ==="") { 
                     $('#creditCardCVV').removeClass('hide');
                     $('#eixistingCardCVV').removeClass('hide');
                     $('#addNewCardSection').addClass('hide');
                     widget.isDefaultStoredCardValue("");
                     widget.addValidationRules();
                }

            },

            setIsModified: function() {
                var widget = this;
                widget.cardType('');
                widget.cardNumber('');
                widget.expiryMonth('');
                widget.expiryYear('');
                widget.nameOnCard('');
                widget.newCardCvv('');
                widget.poNumber('');
                widget.cvv('');
                widget.poNumber.isModified(false);
                widget.cvv.isModified(false);
                widget.cardType.isModified(false);
                widget.cardNumber.isModified(false);
                widget.expiryMonth.isModified(false);
                widget.expiryYear.isModified(false);
                widget.nameOnCard.isModified(false);
                widget.newCardCvv.isModified(false);
            },

            addValidationRules: function() {


                var widget = this;
                /**** start validation rules for frame */
                widget.setEndYear();
                ko.validation.rules['validateYear'] = {
                    validator: function(val, params) {
                        var selectedEndYear = parseInt(val);
                        return params.indexOf(selectedEndYear) > -1 ? true : false;
                    },
                    message: "you have to fill all DOB fields!"
                };
                ko.validation.registerExtenders();

                widget.isDefaultStoredCardValue.extend({
                    required: {
                        params: true,
                        message: widget.translate('Choose card to continue')
                    }
                });

                widget.nameOnCard.extend({
                    required: {
                        params: true,
                        message: widget.translate('nameOnCardRequired')
                    }
                });
                widget.cardType.extend({
                    required: {
                        params: true,
                        message: widget.translate('cardTypeRequired')
                    }
                })
                widget.cardNumber.extend({
                    required: {
                        params: true,
                        message: widget.translate('cardNumberRequired')
                    },
                    maxLength: {
                        params: CCConstants.CYBERSOURCE_CARD_NUMBER_MAXIMUM_LENGTH,
                        message: widget.translate('cardNumberMaxLength', {
                            maxLength: CCConstants.CYBERSOURCE_CARD_NUMBER_MAXIMUM_LENGTH
                        })
                    },
                    number: {
                        params: true,
                        message: 'Please enter a number.'
                    },
                    creditcard: {
                        params: {
                            iin: widget.cardIINPattern,
                            length: widget.cardNumberLength
                        },
                        message: widget.translate('cardNumberInvalid')
                    }
                });
                widget.expiryMonth.extend({
                    required: {
                        params: true,
                        message: widget.translate('endMonthRequired')
                    },
                    endmonth: {
                        params: widget.expiryYear,
                        message: widget.translate('endMonthInvalid')
                    },
                    maxLength: {
                        params: 2,
                        message: widget.translate('endMonthInvalid')
                    }
                });
                widget.expiryYear.extend({
                    required: {
                        params: true,
                        message: widget.translate('endYearRequired')
                    },
                    minLength: {
                        params: 4,
                        message: widget.translate('endYearInvalid')
                    },
                    maxLength: {
                        params: 4,
                        message: widget.translate('endYearInvalid')
                    },
                    validateYear: {
                        params: widget.endYearList,
                        message: widget.translate('endYearInvalid'),
                    }
                });
                widget.newCardCvv.extend({
                    required: {
                        params: true,
                        message: "Please enter CVV information"
                    },
                    minLength: {
                        params: 3,
                        message: "Invalid entry. Please enter a minimum of 3 characters."
                    },
                    maxLength: {
                        params: 4,
                        message: "Invalid entry. Please do not exceed the maximum of 4 permitted characters."
                    },
                    number: {
                        param: true,
                        message: "Invalid entry, Please enter only numbers."
                    },
                    cvv: {
                        params: widget.order().paymentDetails().cvvLength,
                        message: "CVV is invalid."
                    }
                });
                widget.newCardValidationModel = ko.validatedObservable({
                    cardType: widget.cardType,
                    cardNumber: widget.cardNumber,
                    expiryMonth: widget.expiryMonth,
                    expiryYear: widget.expiryYear,
                    nameOnCard: widget.nameOnCard,
                    newCardCvv: widget.newCardCvv,
                    isDefaultStoredCardValue: widget.isDefaultStoredCardValue,
                });



                widget.isDefaultShippingAddress.extend({
                    required: {
                        params: true,
                        message: widget.translate('Shipping address is required')
                    }
                });



                widget.validationModel = ko.validatedObservable({
                    isDefaultShippingAddress: widget.isDefaultShippingAddress,

                });


                widget.isDefaultBillingAddress.extend({
                    required: {
                        params: true,
                        message: widget.translate('Billing address is required')
                    }

                });
                widget.cvv.extend({
                    required: {
                        params: true,
                        message: "Please enter CVV information"
                    },
                    minLength: {
                        params: 3,
                        message: "Invalid entry. Please enter a minimum of 3 characters."
                    },
                    maxLength: {
                        params: 4,
                        message: "Invalid entry. Please do not exceed the maximum of 4 permitted characters."
                    },
                    number: {
                        param: true,
                        message: "Invalid entry, Please enter only numbers."
                    },
                    cvv: {
                        params: widget.order().paymentDetails().cvvLength,
                        message: "CVV is invalid."
                    }

                });

                widget.poNumber.extend({
                    required: {
                        params: true,
                        message: widget.translate('PO Number is required')
                    },
                    maxLength: {
                        params: 50,
                        message: widget.translate('Maximun length of the po number field is 50')
                    }
                });
                widget.poDocument.extend({
                    required: {
                        params: true,
                        message: widget.translate('Please upload document')
                    }
                });



                widget.existingCardViewModal = ko.validatedObservable({
                    cvv: widget.cvv,
                    isDefaultStoredCardValue: widget.isDefaultStoredCardValue

                });

                widget.poViewModal = ko.validatedObservable({
                    poNumber: widget.poNumber,
                    poDocument: widget.poDocument
                });
                widget.setIsModified();
                  
            },

            removeNewCardValidationRules: function() {
                var widget = this;
                widget.cardType.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.cardNumber.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.expiryMonth.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.expiryYear.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.nameOnCard.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.newCardCvv.rules.remove(function(item) {
                    return item.rule == "required";
                });
                widget.expiryYear.rules.remove(function(item) {
                    return item.rule == "validateYear";
                });
                widget.cvv.rules.remove(function(item) {
                    return item.rule == "cvv";
                });
                widget.cardNumber.rules.remove(function(item) {
                    return item.rule == "creditcard";
                });
                widget.newCardCvv.rules.remove(function(item) {
                    return item.rule == "cvv";
                });
               widget.isDefaultStoredCardValue.rules.remove(function(item) {
                    return item.rule == "required";
                });

            },


            checkPreviousAddressValidity: function(widget) {
                /*var previousSelectedCountryRegion = null;
                try {
                    previousSelectedCountryRegion = storageApi.getInstance().getItem("selectedCountryRegion");
                    if (previousSelectedCountryRegion && typeof previousSelectedCountryRegion == 'string') {
                        previousSelectedCountryRegion = JSON.parse(previousSelectedCountryRegion);
                    }
                } catch (pError) {}
                if (previousSelectedCountryRegion) {
                    var shippingCountries = widget.shippingCountriesPriceListGroup();
                    for (var k = 0; k < shippingCountries.length; k++) {
                        if (previousSelectedCountryRegion.selectedCountry === shippingCountries[k].countryCode) {
                            widget.previousSelectedCountryValid(true);
                            var regions = shippingCountries[k].regions;
                            // Its valid for a country to 0 regions.
                            if (regions.length === 0 && previousSelectedCountryRegion.selectedState === "") {
                                break;
                            }
                            for (var j = 0; j < regions.length; j++) {
                                if (previousSelectedCountryRegion.selectedState === regions[j].abbreviation) {
                                    break;
                                }
                            }
                            if (j < regions.length) {
                                break;
                            }
                        }
                    }
                    if (k === shippingCountries.length) {
                        //show error message that previously entered shipping address is now not valid and clear local storage
                        notifier.clearError(widget.typeId());
                        widget.showPreviousAddressInvalidError(true);
                    } else {
                        widget.showPreviousAddressInvalidError(false);
                    }
                }*/
            },

            /*
             * This method is invoked when we click on the view icon in the shipping address tile to
             * show a pop up with address dynamic properties
             */
            showAddressDetails: function(pAddress) {
                var widget = this;
                widget.opDynamicProperty("view");
                if (widget.order() && widget.order().shippingAddress()) {
                    widget.modalObject(widget.order().shippingAddress());
                }
                $('#cc-showAddressDetailsModal').modal('show');
            },

            /**
             * This method populate the empty fields with N/A text
             */
            checkForEmptyString: function(pData) {
                var widget = this;
                if (pData() == "" || pData() == null || pData() == undefined) {
                    return widget.translate('notApplicableText');
                } else
                    return pData;
            },
            resetAddressData: function() {
                var widget = this;
                /* The below method is written keeping in mind that for agent app,
                we can clear cart's shippingAddress since we do not navigate from cart page to
                checkout page in agent. Also, for a new customer, while navigating from a user with cart shipping address,
                cart was not getting cleared before this reset and so wrong address was showing up for a new customer.
                So explicitly clearing here */
                widget.cart().resetShippingAddress();
                widget.resetListener();
                widget.isUsingSavedAddress(false);
                widget.removeSelectedCountryRegion();
            },


            getExternalShippingAddresses: function() {
                var widget = this;
                widget.getExternalShippingAddress([]);
                var isDefaultAddressExist = false;
                 widget.createSpinner();
                var data = helper.apiEndPoint.addressList + "?accountId=" + widget.user().currentOrganization().repositoryId + '&siteURL=' + widget.site().extensionSiteSettings.externalSiteSettings.siteUrl + '&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName + "&usage=ship_to";
                helper.getDataExternal(data, function(err, result) {
                    widget.destroySpinner();
                    if (result.addresses) {
                        if (result.addresses.length > 0) {
                            widget.getExternalShippingAddress(result.addresses);
                            
                            for (var i = 0; i < result.addresses.length; i++) {
                                if(!result.addresses[i].state){
                                    result.addresses[i].state = "NA";
                                }
                                if(!result.addresses[i].postalCode){
                                    result.addresses[i].postalCode = "00000";
                                }
                                if (result.addresses[i].isDefault == true && !isDefaultAddressExist) {
                                    console.log("result.addresses[i].................", result.addresses[i]);
                                    widget.order().shippingAddress().selectedCountry(result.addresses[i].country);
                                    widget.order().shippingAddress().firstName(result.addresses[i].name ? result.addresses[i].name : "Hologic");
                                    widget.order().shippingAddress().lastName(result.addresses[i].name ? result.addresses[i].name : "Hologic");
                                    widget.order().shippingAddress().address1(result.addresses[i].address1);
                                    widget.order().shippingAddress().address2(result.addresses[i].address2);
                                    widget.order().shippingAddress().city(result.addresses[i].city);
                                    widget.order().shippingAddress().postalCode(result.addresses[i].postalCode);
                                    widget.order().shippingAddress().state(result.addresses[i].state);
                                    widget.order().shippingAddress().selectedState(result.addresses[i].state);
                                    widget.order().shippingAddress().state_ISOCode(result.addresses[i].country + '-' + result.addresses[i].state);
                                    widget.order().shippingAddress().country(result.addresses[i].country ? result.addresses[i].country : 'United States');
                                    widget.order().shippingAddress().jobTitle(result.addresses[i].addressid);
                                    widget.order().shippingAddress()['record_id'] = result.addresses[i].addressid;
                                    if(result.addresses[i].phoneNumber){
                                        widget.order().shippingAddress()["ebs_phoneNumber"] = ko.observable(result.addresses[i].phoneNumber);    
                                    }
                                        widget.isDefaultShippingAddress(result.addresses[i].address1 +
                                            ',' + result.addresses[i].address2 + "," +
                                            result.addresses[i].city + "," +
                                            result.addresses[i].state + "," + result.addresses[i].postalCode);
                                            isDefaultAddressExist = true;
                                        //break;
                                }
                            }
                        
                            //widget.notifyListenersOfShippingAddressUpdate();
                            widget.cart().shippingAddress(widget.order().shippingAddress().toJSON());
                            /*var shippingAddressWithProductIDs = {};
                            shippingAddressWithProductIDs[CCConstants.SHIPPING_ADDRESS_FOR_METHODS] = widget.order().shippingAddress();
                            $.Topic(pubsub.topicNames.VERIFY_SHIPPING_METHODS).publishWith(shippingAddressWithProductIDs);*/
                            
                            setTimeout(function(){
                                console.log("widget.order().shippingAddress()................", ko.toJS(widget.order().shippingAddress()));
                                 if (widget.shippingmethods().shippingOptions().length > 0) {
                                    widget.cart().priceCartForCheckout();
                                }else{
                                    $.Topic(pubsub.topicNames.CHECKOUT_SHIPPING_ADDRESS).publishWith(
                                        widget.order().shippingAddress(), [{
                                            message: "success"
                                        }]);
                                          
                                 }
                            }, 1000)
                        } else if (err) {
                               widget.destroySpinner();
                        }
                    }

                })

            },
            getExternalBillingAddresses: function() {
                var widget = this;
                widget.getExternalBillingAddress([]);
                var isDefaultBillAddrExist = false;
                var data = helper.apiEndPoint.addressList + "?accountId=" + widget.user().currentOrganization().repositoryId + '&siteURL=' + widget.site().extensionSiteSettings.externalSiteSettings.siteUrl + '&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName + "&usage=bill_to";
                helper.getDataExternal(data, function(err, result) {
                    if (result.addresses) {
                        if (result.addresses.length > 0) {
                            widget.getExternalBillingAddress(result.addresses);
                            for (var i = 0; i < result.addresses.length; i++) {
                                 if(!result.addresses[i].state){
                                    result.addresses[i].state = "NA";
                                }
                                if(!result.addresses[i].postalCode){
                                    result.addresses[i].postalCode = "00000";
                                }
                                if (result.addresses[i].isDefault == true && !isDefaultBillAddrExist) {
                                    
                                    widget.order().billingAddress().selectedCountry(result.addresses[i].country);
                                    widget.order().billingAddress().firstName(result.addresses[i].name ? result.addresses[i].name : "Hologic");
                                    widget.order().billingAddress().lastName(result.addresses[i].name ? result.addresses[i].name : "Hologic");
                                    widget.order().billingAddress().address1(result.addresses[i].address1);
                                    widget.order().billingAddress().address2(result.addresses[i].address2);
                                    widget.order().billingAddress().city(result.addresses[i].city);
                                    widget.order().billingAddress().postalCode(result.addresses[i].postalCode);
                                    widget.order().billingAddress().state(result.addresses[i].state);
                                    widget.order().billingAddress().selectedState(result.addresses[i].state);
                                    widget.order().billingAddress().state_ISOCode(result.addresses[i].country + '-' + result.addresses[i].state);
                                    widget.order().billingAddress().country(result.addresses[i].country ? result.addresses[i].country : 'United States');
                                    widget.order().billingAddress().jobTitle(result.addresses[i].addressid);
                                    widget.order().billingAddress()['record_id'] = result.addresses[i].addressid;
                                    
                                    if(result.addresses[i].phoneNumber){
                                        widget.order().billingAddress()["ebs_phoneNumber"] = ko.observable(result.addresses[i].phoneNumber);    
                                    }
                                    
                                    widget.isDefaultBillingAddress(result.addresses[i].address1 +
                                        ',' + result.addresses[i].address2 + "," +
                                        result.addresses[i].city + "," +
                                        result.addresses[i].state + "," + result.addresses[i].postalCode);
                                        isDefaultBillAddrExist = true;
                                    //break;
                                }
                            }
                        } else if (err) {

                        }
                    }

                })
            },


            updatePaymentDetails: function() {
                var widget = this;
                for (var i = 0; i < widget.getExternalCardData().length > 0; i++) {
                    if (widget.getExternalCardData()[i].maskedCardNumber == widget.isDefaultStoredCardValue()) {
                        var cardDetails = {};
                        cardDetails['cardNumber'] = widget.getExternalCardData()[i].token;
                        cardDetails['cardType'] = widget.getExternalCardData()[i].cardType;
                        cardDetails['endMonth'] = widget.getExternalCardData()[i].expiryMonth;
                        cardDetails['endYear'] = widget.getExternalCardData()[i].expiryYear;
                        cardDetails['selectedCardType'] = widget.getExternalCardData()[i].cardType;
                        cardDetails['selectedEndMonth'] = widget.getExternalCardData()[i].expiryMonth;
                        cardDetails['selectedEndYear'] = widget.getExternalCardData()[i].expiryYear;
                        cardDetails['nameOnCard'] = widget.getExternalCardData()[i].nameOnCard;
                        cardDetails['expiryMonth'] = widget.getExternalCardData()[i].expiryMonth;
                        cardDetails['expiryYear'] = widget.getExternalCardData()[i].expiryYear;
                        cardDetails['nickname'] = widget.getExternalCardData()[i].nameOnCard;
                        cardDetails["paymentMethodType"] = 'card';
                        cardDetails['type'] = 'card';
                        cardDetails['cardCVV'] = widget.cvv();
                        cardDetails['seqNum'] = '0';
                        cardDetails["useDefaultBillingAddress"] = false;
                        cardDetails['isDefaultAddressValid'] = false;
                        if (widget.order().payments().length === 0) {
                            widget.order().payments.push(cardDetails); 

                            widget.cardNumberShow(widget.getExternalCardData()[i].token);
                            console.log("cardDetailShow", widget.cardNumberShow());
                        } else {
                            widget.order().payments()[0] = cardDetails;
                        }
                        widget.selectedCardId(widget.getExternalCardData()[i].id);
                        widget.updateDynamicProperties();
                    }
                }


            },



            getExternalCardDetails: function() {
                var widget = this;

                var cardApi = helper.apiEndPoint.cardsList + "?accountId=" + widget.user().currentOrganization().repositoryId + '&siteURL=' + widget.site().extensionSiteSettings.externalSiteSettings.siteUrl + '&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName;
                helper.getDataExternal(cardApi, function(err, result) {
                    widget.destroySpinner();
                    if (result.storeCards) {
                        if (result.storeCards.length > 0) {

                            for (var i = 0; i < result.storeCards.length; i++) {
                                if (result.storeCards[i].isDefault) {
                                    widget.selectedCardId(result.storeCards[i].id);
                                      widget.isDefaultStoredCardValue(result.storeCards[i].maskedCardNumber);
                                    if(widget.backToPaymentSection() && widget.getNewCardToken()){
                                         widget.isDefaultStoredCardValue(widget.getNewCardToken());
                                         // console.log(widget.getNewCardToken(),"....widget.getNewCardToken......");
                                    }else{
                                          widget.isDefaultStoredCardValue(result.storeCards[i].maskedCardNumber);
                                    }
                                    widget.appendCardNo(widget.isDefaultStoredCardValue());
                                    widget.getExternalCardData(result.storeCards);
                                    widget.isStoredCardsLoaded(true);
                                    widget.isDefaultStoredCardValue.valueHasMutated();
                                }
                                widget.getExternalCardData(result.storeCards);
                                widget.isStoredCardsLoaded(true);
                            }
                            if(widget.backToPaymentSection() && widget.isDefaultStoredCardValue()) {
                                $("#billToAddress").val(widget.isDefaultStoredCardValue())
                            }

                        } else {
                           
                        }
                    }
                    else if(err){
                          widget.destorySpinner();
                    }

                });


            },

            checkCardType: function(data, event) {
                var widget = this;
                var getVal = $(event.currentTarget).val();
                   console.log(getVal,"...event,.....");
                if(getVal === "card") {
                    $('#CC-checkoutAddressBook-poNumber').val("");
                    widget.order().poNumber("");
                    widget.order().isInvoicePayment(false);
                    widget.selectPoPayment(false);
                    $(".cardPay").removeClass("hide");
                    // removing po validation if card choosen 

                    widget.cvv.rules.remove(function(item) {
                        return item.rule == "required";
                    });
                    widget.cvv.rules.remove(function(item) {
                        return item.rule == "cvv";
                    });
                    widget.poNumber.rules.remove(function(item) {
                        return item.rule == "required";
                    });
                    widget.isDefaultStoredCardValue.rules.remove(function(item) {
                        return item.rule == "required";
                    });
                    widget.addValidationRules();
                    widget.isCreditCardOrPoOption(false);
                        if(widget.isDefaultStoredCardValue()=="addNewCard") {
                            $('#addNewCardSection').removeClass('hide');
                            $('#eixistingCardCVV').addClass('hide');
                        }
                        else{
                                $('#addNewCardSection').addClass('hide');
                        }
                } else if(getVal === "ponumber") {
                    $('#addNewCardSection').addClass('hide');
                    widget.order().isInvoicePayment(true);
                    widget.selectPoPayment(true);
                    $(".cardPay").addClass("hide")
                    widget.order().payments([]);
                    widget.selectedCardId("");
                    widget.removeNewCardValidationRules();

                    widget.cvv.rules.remove(function(item) {
                        return item.rule == "required";
                    });
                    widget.cvv.rules.remove(function(item) {
                        return item.rule == "cvv";
                    });
                    
                    widget.isCreditCardOrPoOption(true);
                }


            },

            updateShippingAddress: function(data, event) {
                
                if (event.originalEvent) { //user changed
                    console.log("called by user");
                } else { // program changed
                    console.log("called by program....so doing nothing......");
                    return;
                }
                
                var widget = this;
                widget.createSpinner();
                if (data.isDefaultShippingAddress()) {
                    var splitVal = data.isDefaultShippingAddress().split(',');
                    for (var i = 0; i < widget.getExternalShippingAddress().length; i++) {
                        if (widget.getExternalShippingAddress()[i].address1.indexOf(splitVal[0]) !== -1) {
                            widget.order().shippingAddress().selectedCountry(widget.getExternalShippingAddress()[i].country);
                            widget.order().shippingAddress().firstName(widget.getExternalShippingAddress()[i].name ? widget.getExternalShippingAddress()[i].name : widget.getExternalShippingAddress()[i].address1);
                            widget.order().shippingAddress().lastName(widget.getExternalShippingAddress()[i].name ? widget.getExternalShippingAddress()[i].name : widget.getExternalShippingAddress()[i].address1);
                            widget.order().shippingAddress().address1(widget.getExternalShippingAddress()[i].address1);
                            widget.order().shippingAddress().address2(widget.getExternalShippingAddress()[i].address2);
                            widget.order().shippingAddress().city(widget.getExternalShippingAddress()[i].city);
                            widget.order().shippingAddress().postalCode(widget.getExternalShippingAddress()[i].postalCode);
                            widget.order().shippingAddress().state(widget.getExternalShippingAddress()[i].state);
                            widget.order().shippingAddress().selectedState(widget.getExternalShippingAddress()[i].state);
                            widget.order().shippingAddress().state_ISOCode(widget.getExternalShippingAddress()[i].country + '-' + widget.getExternalShippingAddress()[i].state);
                            widget.order().shippingAddress().record_id = widget.getExternalShippingAddress()[i].addressid;
                            widget.order().shippingAddress().jobTitle(widget.getExternalShippingAddress()[i].addressid);
                            if(widget.getExternalShippingAddress()[i].phoneNumber){
                                widget.order().shippingAddress()["ebs_phoneNumber"] = ko.observable(widget.getExternalShippingAddress()[i].phoneNumber);    
                            }

                            widget.order().shippingAddress().country(widget.getExternalShippingAddress()[i].country);
                            widget.cart().shippingAddress(widget.order().shippingAddress().toJSON());
                              if (widget.shippingmethods().shippingOptions().length > 0){
                                widget.cart().priceCartForCheckout();
                            }else{
                                $.Topic(pubsub.topicNames.CHECKOUT_SHIPPING_ADDRESS).publishWith(
                                    widget.order().shippingAddress(), [{
                                        message: "success"
                                    }]);   
                            }
                            break;

                        }
                    }

                }

            },

            updateBillingAddress: function(data, event) {
                if (event.originalEvent) { //user changed
                    console.log("called by user...billing");
                } else { // program changed
                    console.log("called by program....so doing nothing......billing");
                    return;
                }
                
                var widget = this;
                if (data.isDefaultBillingAddress()) {
                    var splitVal = data.isDefaultBillingAddress().split(',');
                    for (var i = 0; i < widget.getExternalBillingAddress().length; i++) {
                        if (widget.getExternalBillingAddress()[i].address1.indexOf(splitVal[0]) !== -1) {
                            widget.order().billingAddress().selectedCountry(widget.getExternalBillingAddress()[i].country);
                            widget.order().billingAddress().firstName(widget.getExternalBillingAddress()[i].name ? widget.getExternalBillingAddress()[i].name : widget.getExternalBillingAddress()[i].address1);
                            widget.order().billingAddress().lastName(widget.getExternalBillingAddress()[i].name ? widget.getExternalBillingAddress()[i].name : widget.getExternalBillingAddress()[i].address1);
                            widget.order().billingAddress().address1(widget.getExternalBillingAddress()[i].address1);
                            widget.order().billingAddress().address2(widget.getExternalBillingAddress()[i].address2);
                            widget.order().billingAddress().city(widget.getExternalBillingAddress()[i].city);
                            widget.order().billingAddress().postalCode(widget.getExternalBillingAddress()[i].postalCode);
                            widget.order().billingAddress().state(widget.getExternalBillingAddress()[i].state);
                            widget.order().billingAddress().selectedState(widget.getExternalBillingAddress()[i].state);
                            widget.order().billingAddress().record_id = widget.getExternalBillingAddress()[i].addressid;
                            widget.order().billingAddress().state_ISOCode(widget.getExternalBillingAddress()[i].country + '-' + widget.getExternalBillingAddress()[i].state);
                            widget.order().billingAddress().country(widget.getExternalBillingAddress()[i].country);
                            widget.order().billingAddress().record_id = widget.getExternalShippingAddress()[i].addressid;
                            widget.order().billingAddress().jobTitle(widget.getExternalShippingAddress()[i].addressid);
                            if(widget.getExternalShippingAddress()[i].phoneNumber){
                                widget.order().billingAddress()["ebs_phoneNumber"] = ko.observable(widget.getExternalShippingAddress()[i].phoneNumber);    
                            }
                            /*$.Topic(pubsub.topicNames.EXTERNAL_CHECKOUT_BILLING_ADDRESS).publishWith(
                                widget.order().billingAddress(), [{
                                    message: "success"
                                }]);*/
                            break;

                        }
                    }

                }

            },



            uploadDoc: function(e) {
                var widget = this;
                widget.createSpinner();
                console.log(e.files[0], '...data..');
                widget.poDocument(e.files[0]);
                widget.getEBSOrderNumber(e.files[0]);
            },
            getEBSOrderNumber: function(file) {
                var widget = this;
                var data = helper.apiEndPoint.orderDetails + "?orderId=" + widget.user().orderId() + "&source=OCC_01" + '&siteURL=' + widget.site().extensionSiteSettings.externalSiteSettings.siteUrl + '&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName;
                helper.getDataExternal(data, function(err, result) {
                    console.log(result.oracleOrderId);
                    widget.EBSOrderID(result.oracleOrderId);
                    var FR = new FileReader();
                    FR.onload = function(e) {
                        console.log(e.target.result);
                        widget.uploadPoDoc(e.target.result);
                    }
                    FR.readAsDataURL(file);
                })

            },
            uploadPoDoc: function(imageBase64String) {
                var widget = this;
                console.log(imageBase64String, "..imageBase64String");
                var globalVariable = imageBase64String;
                var inputData = {
                    image: globalVariable,
                    accountId: widget.user().currentOrganization().repositoryId,
                    orderId: widget.EBSOrderID(),
                    siteName: widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                    siteURL: widget.site().extensionSiteSettings.externalSiteSettings.siteName

                }
                // ajax request
                $.ajax({
                    url: widget.site().extensionSiteSettings.externalSiteSettings.siteUrl + helper.apiEndPoint.poDocumentUpload,
                    type: 'POST',
                    data: JSON.stringify(inputData),
                    dataType: 'json',
                    cache: false,
                    contentType: "application/json",
                    processData: false,
                    complete: function() {},
                    success: function(response) {
                        console.log(response)
                         widget.destroySpinner();
                        if (response && response.statusCode === '200' && response.body) {}

                    },
                    error: function() {
                         widget.destroySpinner();
                    }
                });



            }


        };
    });