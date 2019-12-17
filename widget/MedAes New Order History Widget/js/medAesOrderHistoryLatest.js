/**
 * @fileoverview Footer Widget.
 *
 * @author Taistech
 */
define(
    //---------------------------------https://ccadmin-test-zcxa.oracleoutsourcing.com/occs-admin/#/componentSelection/?name=MedAes%20Order%20History%20Latest%20Widget----------------------------------
    // DEPENDENCIES
    // Adding knockout
    //-------------------------------------------------------------------
    ['knockout', 'ccResourceLoader!global/api-helper', 'navigation', 'ccConstants','ccResourceLoader!global/paymetric-helper','notifier','spinner' ,'pubsub','ccRestClient'],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function(ko, helper, navigation, CCConstants,paymetricUtil,notifier,spinner,pubsub,ccRestClient) {

        "use strict";
         var widgetModel ;
          
        return {
            spinnerOptions : {
               parent: '#loadingModal',  
               posTop:'0',             
               posLeft:'50%'  
            },
            productData: ko.observableArray([]),
            getShippedOrders: ko.observable(),
            getOpenOrders: ko.observable(),
            getCancellationOrders: ko.observable(),
            getInvoicesOrders: ko.observableArray([]),
            isDesktop: ko.observable(true),
            isMobile: ko.observable(false),
            displayNewCardSection: ko.observable(false),
            invoiceTotal: ko.observable(''),
            isDefaultCard: ko.observable(false),
            getAddNewCardId: ko.observable(''),
            getExistingCardId: ko.observable(''),
            isDefaultCardValue: ko.observable(''),
            isStoredCardsLoaded: ko.observable(false),
            isShippedOrdersLoaded: ko.observable(false),
            isOpenOrdersLoaded: ko.observable(false),
            isCancelledOrdersLoaded: ko.observable(false),
            isInvoiceListLoaded: ko.observable(false),
             iframeData : ko.observable(''),
             serviceError :ko.observable(''),
             saveNewCard : ko.observable(false),
             makeCardDefault : ko.observable(false),
            // isCartAdded: ko.observable(false),
             //selectedOrderId :ko.observable(''),
             getOrderLevelItems: ko.observable(),	
             getCurrentProductData: ko.observableArray([]),
             paymentSuccess : ko.observable(false),
            // invoice payment details List
            cardTypeList: [{
                    "name": "VISA",
                    "cardValue": "VISA"
                },
                {
                    "name": "Master Card",
                    "cardValue": "MASTERCARD"
                },
                {
                    "name": "Amex",
                    "cardValue": "AMEX"
                }
            ],
            cardType: ko.observable(),
            nameOnCard: ko.observable(),
            cardNumber: ko.observable(),
            cardIINPattern: ko.observable('[0-9]'),
            cardNumberLength: ko.observable('16'),
            expiryMonth: ko.observable(),
            expiryYear: ko.observable(),
            newCardCvv: ko.observable(),
            getExternalBillingAddress: ko.observable(),
            getExternalCardData: ko.observable(),
            isDefaultBillingAddress: ko.observable(null),
            endYearList: [],
            selectedInvoiceList: ko.observableArray([]),
            existingCardCvv: ko.observable(),
            onLoad: function(widget) {
                
                   widgetModel = widget;
        
                paymetricUtil.loadPaymetricJs();
                paymetricUtil.fetchFrameUrl(function(frameData){
                    if(frameData.hasOwnProperty('iframeUrl')){
                    widget.iframeData(frameData);
                    console.log("widget.iframeData(",widget.iframeData().iframeUrl);
                }
                });
                // price complete call	
                $.Topic(pubsub.topicNames.CART_PRICE_COMPLETE).subscribe(function(obj) {	
                 if (window.location.href.toLowerCase().indexOf('/orderhistory') !== -1) {	
                      widget.getCurrentProductData().shift();	
                      if (widget.getCurrentProductData().length > 0) {	
                          if (widget.getCurrentProductData().length !== 1) {	
                              widget.cart().addItem(ko.toJS(widget.getCurrentProductData()[0]));	
                              $("html, body").animate({scrollTop: 0}, "slow");
                          } else {	
                              $.Topic(pubsub.topicNames.CART_ADD).publishWith(	
                                  ko.toJS(widget.getCurrentProductData()[0]), [{	
                                      message: "success"	
                                  }]);	
                              widget.destroySpinner();	
                              $("html, body").animate({scrollTop: 0}, "slow");
                          }	
                      }	
                  }	
                });

                widget.getExternalBillingAddresses();
                widget.getExternalCardDetails();
                widget.addValidationRules();
                widget.addExistingCvvRule();
                widget.cardType.subscribe(function(newValue) {
                    console.log("card typeeee", newValue);
                    if (newValue == 'VISA') {
                        widget.cardIINPattern('4'),
                            widget.cardNumberLength('13|16');
                        $("#cc-card-number").attr('maxlength', '16');
                    } else if (newValue == 'MASTERCARD') {
                        widget.cardIINPattern('5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720'),
                            widget.cardNumberLength('16');
                        $("#cc-card-number").attr('maxlength', '16');
                    } else if (newValue == 'AMEX') {
                        widget.cardIINPattern('3[47]'),
                            widget.cardNumberLength('15');
                        $("#cc-card-number").attr('maxlength', '15');
                    }
                });


                $(window).resize(function() {
                    widget.showContent();
                })
                $("body").delegate("#sellectAllInvoices", "click", function(e) {
                    if (this.checked) {
                        // Iterate each checkbox
                        $(':checkbox').each(function() {
                            this.checked = true;
                            $( "input:disabled" ).attr('checked',false);
                        });
                    } else {
                        $(':checkbox').each(function() {
                            this.checked = false;
                            $( "input:disabled" ).attr('checked',false);
                        });
                    }
                });
                
               

            },
            loadShippedOrders: function(data, event) {
                var self = this;
                if(!self.isShippedOrdersLoaded()) {
                    console.log("loadShippedOrders.......");
                    self.createSpinner();
                    self.externalShippingOrderCall("SHIPPED", function(getdata) {
                        for(var i=0; i<getdata.length;i++) {
                            //console.log("getdata[i].shipments[0].shipper", getdata[i].shipments[0].shipper);
                            if(getdata[i].shipments[0] && getdata[i].shipments[0].shippingMethod.toLowerCase().indexOf("fedex") != -1) {
                              getdata[i].shipments[0].trackingUrl = (getdata[i].shipments[0].trackingNumber) ? helper.apiEndPoint.trackFedEx + getdata[i].shipments[0].trackingNumber : "";
                            } else if(getdata[i].shipments[0] && getdata[i].shipments[0].shippingMethod.toLowerCase().indexOf("ups") != -1) {
                              getdata[i].shipments[0].trackingUrl = (getdata[i].shipments[0].trackingNumber) ? helper.apiEndPoint.trackUPS + getdata[i].shipments[0].trackingNumber : "";
                            } else if(getdata[i].shipments[0] && getdata[i].shipments[0].shippingMethod.toLowerCase().indexOf("dhl") != -1) {
                              getdata[i].shipments[0].trackingUrl = (getdata[i].shipments[0].trackingNumber) ? helper.apiEndPoint.trackDHL + getdata[i].shipments[0].trackingNumber : "";
                            } else {
                                getdata[i].shipments[0].trackingUrl = "";
                            }
                        }
                        self.getShippedOrders(getdata);
                        self.isShippedOrdersLoaded(true);
                        
                        $('#shippedOrderNew').DataTable({
                            "ordering": false,
                            "info": false,
                            responsive: true,
                            "pagingType": "numbers",
                            "iDisplayLength": 12,
                            "language": {search: "",searchPlaceholder: "Order #"}
                        });
                        if(self.getShippedOrders().length <= 12){
                            $('#shippedOrderNew_paginate').addClass('hide');
                        }
                        /*** for mobile */	
                        $('#shippedOrders').DataTable({	
                            "ordering": false,	
                            "info": false,	
                            responsive: true,	
                            "pagingType": "numbers",	
                            "iDisplayLength": 12,	
                            "language": {search: "",searchPlaceholder: "Order #"}	
                        });	
                        if(self.getShippedOrders().length <= 12){	
                            $('#shippedOrders_paginate').addClass('hide');	
                        }
                        self.destroySpinner();
                    });
                    
                }
                
            },
            loadOpenOrders: function(data, event) {
                var self = this;
                if(!self.isOpenOrdersLoaded()) {
                    console.log("loadOpenOrders.......");
                    self.createSpinner();
                    self.externalShippingOrderCall("OPEN", function(getdata) {
                        self.getOpenOrders(getdata);
                        self.isOpenOrdersLoaded(true);
                        
                        
                        $('#openOrders').DataTable({
                            "ordering": false,
                            "info": false,
                            responsive: true,
                            "pagingType": "numbers",
                            "iDisplayLength": 12,
                            "language": {search: "",searchPlaceholder: "Order #"}
                        });
                        if(self.getOpenOrders().length <= 12){
                            $('#openOrders_paginate').addClass('hide');
                        }
                        self.destroySpinner();
                    });
                }
                
            },
            loadInvoiceOrders: function(data, event) {
                var self = this;
                console.log("loadInvoiceOrders.......");
                 $("#openInvoicesOrders").DataTable().clear().destroy();
                if(!self.isInvoiceListLoaded()) {
                    self.getInvoicesOrders([]);
                    self.createSpinner();
                    self.externalInvoiceCall(function(getInvoiceData) {
                         var invoiceDetailsData = getInvoiceData;
                        if(invoiceDetailsData.length>0){
                             for(var i=0;i< invoiceDetailsData.length >0 ;i++){
                              //if(Math.sign(invoiceDetailsData[i].openBlance)==-1 || Math.sign(invoiceDetailsData[i].openBlance)==-0 || Math.sign(invoiceDetailsData[i].openBlance)=='NaN'){
                               if(invoiceDetailsData[i].openBlance < 1 ){   
                                  invoiceDetailsData[i]['disableCheckBox'] =ko.observable(false);
                              }  
                              else{
                                  invoiceDetailsData[i]['disableCheckBox'] =ko.observable(true);
                              }
                            }
                              if(invoiceDetailsData.length == i){
                                
                                   self.getInvoicesOrders(invoiceDetailsData);
                              }
                        }
                        self.isInvoiceListLoaded(true);
                        self.displayInvoiceTable();
                        self.destroySpinner();
                    });
                }
            },
            loadCancelOrders: function(data, event) {
                var self = this;
                if(!self.isCancelledOrdersLoaded()) {
                    console.log("loadCancelOrders.......");
                    self.createSpinner();
                    self.externalShippingOrderCall("CANCELLED", function(getdata) {
                        self.getCancellationOrders(getdata);
                        self.isCancelledOrdersLoaded(true);
                        $('#cancelledOrders').DataTable({
                            "ordering": false,
                            "info": false,
                            responsive: true,
                            "pagingType": "numbers",
                            "iDisplayLength": 12,
                            "language": {search: "",searchPlaceholder: "Order #"}
                        });
                        if(self.getCancellationOrders().length <= 12){
                            $('#cancelledOrders_paginate').addClass('hide');
                        }
                        self.destroySpinner();
                    });
                }
            },
            addValidationRules: function() {
                var widget = this;
                widget.setEndYear();

                /**** start validation rules for frame */
                ko.validation.rules['validateYear'] = {
                    validator: function(val, params) {
                        var selectedEndYear = parseInt(val);
                        return params.indexOf(selectedEndYear) > -1 ? true : false;
                    },
                    message: "you have to fill all DOB fields!"
                };
                ko.validation.registerExtenders();

                widget.nameOnCard.extend({
                    required: {
                        params: true,
                        message: "Please enter name on card information"
                    }
                });
                widget.cardType.extend({
                    required: {
                        params: true,
                        message: "please choose card type information"
                    }
                })
                widget.cardNumber.extend({
                    required: {
                        params: true,
                        message: "Please enter card number information"
                    },
                    maxLength: {
                        params: CCConstants.CYBERSOURCE_CARD_NUMBER_MAXIMUM_LENGTH,
                        message: widget.translate('cardNumberMaxLength', {
                            maxLength: CCConstants.CYBERSOURCE_CARD_NUMBER_MAXIMUM_LENGTH
                        })
                    },
                    creditcard: {
                        params: {
                            iin: widget.cardIINPattern,
                            length: widget.cardNumberLength
                        },
                        //onlyIf: function () { return widget.applyConditions(); },
                        message: widget.translate('cardNumberInvalid')
                    }
                });
                widget.expiryMonth.extend({
                    required: {
                        params: true,
                        message: "Please enter expiration month information"
                    },
                    endmonth: {
                        params: widget.expiryYear,
                        message: "Invalid expires month/year, please try again."
                    },
                    maxLength: {
                        params: 2,
                        message: "Invalid expires month/year, please try again."
                    }
                });
                widget.expiryYear.extend({
                    required: {
                        params: true,
                        message: "Please enter expiration month information"
                    },
                    minLength: {
                        params: 4,
                        message: "Invalid expires month/year, please try again."
                    },
                    maxLength: {
                        params: 4,
                        message: "Invalid expires month/year, please try again."
                    },
                    validateYear: {
                        params: widget.endYearList,
                        message: "Invalid expires month/year, please try again.",
                    }
                });
                widget.newCardCvv.extend({
                    required: {
                        params: true,
                        message: "Please enter CVV information"
                    },
                    minLength: {
                        params: 3,
                        message: "Please provide minimum length of cvv is 3"
                    },
                    maxLength: {
                        params: 4,
                        message: "Please provide minimum length of cvv is 4"
                    },
                    number: {
                        param: true,
                        message: "Please enter numbers only"
                    },
                    cvv: {
                        params: 3,
                        message: "Invalid CVV number"
                    }
                })

                widget.validationModel = ko.validatedObservable({
                    cardType: widget.cardType,
                    cardNumber: widget.cardNumber,
                    expiryMonth: widget.expiryMonth,
                    expiryYear: widget.expiryYear,
                    nameOnCard: widget.nameOnCard,
                    newCardCvv: widget.newCardCvv
                });


                widget.setIsModified();

            },

            setIsModified: function() {
                var widget = this;
                widget.cardType('');
                widget.cardNumber('');
                widget.expiryMonth('');
                widget.expiryYear('');
                widget.nameOnCard('');
                widget.newCardCvv('');

                widget.cardType.isModified(false);
                widget.cardNumber.isModified(false);
                widget.expiryMonth.isModified(false);
                widget.expiryYear.isModified(false);
                widget.nameOnCard.isModified(false);
                widget.newCardCvv.isModified(false);

            },

            updateCard: function(data, event) {
                var widget = this;
                console.log(event, "..............event");
                console.log(data, "...............data...");
                var dropDownValue = $(event.currentTarget).val();
                data.isDefaultCardValue(dropDownValue);
                if (data.isDefaultCardValue() == "addNewCard") {
                    widget.displayNewCardSection(true);
                    widget.addValidationRules();
                    widget.removeExistingCvvRule();
                    $('#existingCardCVV').addClass('hide');
                    widget.displayAddCardModal();
                    
                    
                } else if (data.isDefaultCardValue() != "addNewCard") {
                    $('#existingCardCVV').removeClass('hide');
                    widget.getExistingCardId('');
                    widget.addExistingCvvRule();
                    widget.displayNewCardSection(false);
                    widget.removeNewCardValidationRules();
                    widget.getExistingCardId(data.isDefaultCardValue());

                }

            },
            
             displayAddCardModal : function(){
              var frameuri= widgetModel.iframeData().iframeUrl+'?origin=https://ccstore-test-zcxa.oracleoutsourcing.com';
              console.log("widgetModel.iframeData().iframeUrl",frameuri);
              var frameElement = document.getElementById('addcardFrame');
              frameElement.contentWindow.location.href = widgetModel.iframeData().iframeUrl;
              frameElement.autosizeheight = true;
              frameElement.autosizewidth = true;
           },

            addExistingCvvRule: function() {
                var widget = this;
                widget.existingCardCvv.extend({
                    required: {
                        params: true,
                        message: "Please enter CVV information"
                    },
                    minLength: {
                        params: 3,
                        message: "Please provide minimum length of cvv is 3"
                    },
                    maxLength: {
                        params: 4,
                        message: "Please provide minimum length of cvv is 4"
                    },
                    number: {
                        param: true,
                        message: "Please enter numbers only"
                    },
                    cvv: {
                        params: 3,
                        message: "Invalid CVV number"
                    }
                })
                widget.existingCardViewModel = ko.validatedObservable({
                    existingCardCvv: widget.existingCardCvv
                })
                widget.existingCardCvv('');
                widget.existingCardCvv.isModified(false);
            },

            removeExistingCvvRule: function() {
                var widget = this;
                widget.existingCardCvv.rules.remove(function(item) {
                    return item.rule == "cvv";
                });
                widget.existingCardCvv.rules.remove(function(item) {
                    return item.rule == "required";
                });
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
                widget.cardNumber.rules.remove(function(item) {
                    return item.rule == "creditcard";
                });
                widget.newCardCvv.rules.remove(function(item) {
                    return item.rule == "cvv";
                });
            },
            
            redirectToInvoiceDetails: function(getInvoiceId) {
                console.log(getInvoiceId, "...getInvoiceId");
                navigation.goTo("/invoiceDetails?invoiceId="+getInvoiceId);           
                // $.Topic('GET_INVOICE_ID.memory').publish(getInvoiceId);
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

            closeModal: function() {

                this.cardType('');
                this.cardNumber('');
                this.expiryMonth('');
                this.expiryYear('');
                this.nameOnCard('');
                this.existingCardCvv('');
                this.validationModel.errors.showAllMessages(false);
                if (this.isDefaultCardValue() === "addNewCard") {
                    $('#existingCardCVV').addClass('hide');
                } else {
                    $('#existingCardCVV').removeClass('hide');

                }



                $('#invoicePaymentModal').modal('hide');
            },
            beforeAppear: function(page) {

                var self = this;
                 self.showContent();
                 self.paymentSuccess(false);
                 // self.isCartAdded(false);
                 
                 self.isShippedOrdersLoaded(false);
                 self.isOpenOrdersLoaded(false);
                 self.isInvoiceListLoaded(false);
                 self.isCancelledOrdersLoaded(false);
                 
                 
                 self.loadShippedOrders();
                 
              

            },
            paySelectedInvoices: function() {
                var widget = this;
                widget.invoiceTotal('');
                var selectedInvoices = [];
                $.each($("input[name='payInvoices']:checked"), function() {
                    selectedInvoices.push($(this).val());
                });
                var total = 0;
                widget.selectedInvoiceList([]);
                widget.resetModalData();
                if (selectedInvoices.length > 0) {
                    widget.isDefaultCardValue("");
                    widget.displayNewCardSection(false);
                    widget.saveNewCard(false);
                    $("#invoicePaymentModal").modal("show");
                    for (var i = 0; i < widget.getInvoicesOrders().length > 0; i++) {
                        for (var j = 0; j < selectedInvoices.length > 0; j++) {
                            if (widget.getInvoicesOrders()[i].invoiceId == selectedInvoices[j]) {
                                console.log(widget.getInvoicesOrders()[i].openBlance);
                                widget.selectedInvoiceList.push({
                                    'invoiceId': widget.getInvoicesOrders()[i].invoiceId,
                                    'amount': widget.getInvoicesOrders()[i].openBlance
                                });
                                console.log(widget.selectedInvoiceList(), "...widget.selectedInvoiceList....");
                                total += parseFloat(widget.getInvoicesOrders()[i].openBlance);
                                widget.invoiceTotal(total);
                            }

                        }

                    }


                } else {
                    console.log('Please choose the Invoices for payment....');
                }


            },
            resetModalData: function() {
                this.existingCardCvv.isModified(false);
                this.cardType('');
                this.cardNumber('');
                this.expiryMonth('');
                this.expiryYear('');
                this.nameOnCard('');
                this.existingCardCvv('');
                this.newCardCvv('');
                this.cardType.isModified(false);
                this.cardNumber.isModified(false);
                this.expiryMonth.isModified(false);
                this.expiryYear.isModified(false);
                this.nameOnCard.isModified(false);
                this.newCardCvv.isModified(false);
            },
            makeInvoicePayment: function() {
                var widget = this;
                
                if (widget.displayNewCardSection()) {
                    
                   paymetricUtil.addCard(widgetModel,function(data){
                    
                      if(data.hasOwnProperty('token')){
                          console.log(data.id ,"...token...");
                          widget.createSpinner();
                           widget.getAddNewCardId(data.id);
                           widget.invoicePayment(widget.getAddNewCardId());
                           /* if (result.hasOwnProperty('cardId')) {
                               
                            }*/
                          } else{
                              widget.displayNewCardSection(false);
                              widget.paymentSuccess(false);
                              widgetModel.serviceError("Error in service");
                              widget.destroySpinner();
                          }
                          paymetricUtil.fetchFrameUrl(function(frameData){
                            if(frameData.hasOwnProperty('iframeUrl')){
                            widget.iframeData(frameData);
                            console.log("widget.iframeData(",widget.iframeData().iframeUrl);
                        }
                        });
                     });
                    
                } else {
                    if (widget.existingCardViewModel.isValid() && $('#existingCreditCard').val() !== '') {
                        widget.createSpinner();
                        widget.invoicePayment(widget.getExistingCardId())
                    } else {
                        widget.existingCardViewModel.errors.showAllMessages();
                    }


                }


            },

            invoicePayment: function(getCardId) {
                var widget = this;
                var data = {
                    "storedCreditCardId": getCardId,
                    "accountId": widget.user().currentOrganization().repositoryId,
                    "paymentDetails": widget.selectedInvoiceList(),
                    "currencyCode": "USD",
                    //'cvv': widget.existingCardCvv(),
                    "site": {
                        "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                        "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
                    }
                }

                var postData = {
                    "enpointUrl": helper.apiEndPoint.inovicePayment,
                    "postData": data
                }

                helper.postDataExternal(postData, function(err, result) {
                    $('input:checkbox').attr('checked',false);
                    widget.selectedInvoiceList([]);
                    widget.isDefaultCardValue('');
                    widget.displayNewCardSection(false);
                    widget.destroySpinner();
                    if (result) {
                        widget.paymentSuccess(true);
                        widget.isInvoiceListLoaded(false);
                        widget.loadInvoiceOrders();
                        $("#invoicePaymentModal").modal("hide");
                        
                        console.log('result result', result);
                    } else {
                        $('#invoicePaymentModal').modal('hide');
                        widget.paymentSuccess(false);    
                        notifier.sendError(widget.WIDGET_ID,"There was an issue processing your payment. Please try again **Will Paymetric be passing specific reasons for failures?", true);
                        console.log(err, "......invoice payment error");
                    }
                })

            },

            addNewCard: function() {
                var widget = this;
                widget.getAddNewCardId('')
               // var cardNumber = widget.cardNumber().replace(/\d(?=\d{4})/g, "*");
                var postData = {
                    "cardDetails": {
                        /* "cardType": widget.cardType(),
                         "nameOnCard": widget.nameOnCard(),*/
                        //   "token": "5555555555554444",
                        //   "maskedCardNumber":cardNumber,
                        /* "expiryMonth": Number(widget.expiryMonth()),
                         "expiryYear": Number(widget.expiryYear()),*/
                        // "isDefault": widget.isDefaultCard()
                        "cardType": "MASTERCARD",
                        "nameOnCard": "Manoj Tyagi123",
                        "token": "5555555555554444",
                        "expiryMonth": 8,
                        "expiryYear": 25
                    },
                    "site": {
                        "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                        "siteName":  widget.site().extensionSiteSettings.externalSiteSettings.siteName
                    }
                }
                var data = {
                    "enpointUrl": helper.apiEndPoint.addCard + '?accountId=' + widget.user().currentOrganization().repositoryId ,
                    "postData": postData
                }

                helper.postDataExternal(data, function(err, result) {
                    if (result.hasOwnProperty('cardId')) {
                        widget.getAddNewCardId(result.cardId);
                        widget.invoicePayment(widget.getAddNewCardId())
                    } else {
                        $('#invoicePaymentModal').modal('hide');
                        notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
                        console.log('add new card error', err);
                    }
                })

            },

            showContent: function() {
                var self = this;
                if ($(window).width() > 736) {
                    self.isDesktop(true);
                    self.isMobile(false);
                } else {
                    self.isDesktop(false);
                    self.isMobile(true);
                }
            },
            redirectOrderHistoryPage: function(orderid) {             
                console.log("orderId", orderid);
                navigation.goTo("/OrderDetailsPage?orderNo="+orderid);            
                //$.Topic('GET_ORDER_ID.memory').publish(orderid)

            },
            externalShippingOrderCall: function(data, callback) {
                  var getDate = new Date();
                  var getYearVal  = getDate.getFullYear();
                  var getMonthVal = getDate.getMonth()+1;
                  var numberOfDays = new Date(getYearVal, getMonthVal, 0).getDate();
                  console.log("numberOfDays",numberOfDays);
                  var monthVal = getMonthVal < 10 ? '0' + getMonthVal :   getMonthVal;
                  var toDate = getYearVal + '-'+ getMonthVal + '-' + numberOfDays;
                  var fromDate = getYearVal + '-' +  monthVal  + '-01';
                    var self = this;
                     var  getData =   helper.apiEndPoint.orderHistory+'?siteURL='+self.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName='+ self.site().extensionSiteSettings.externalSiteSettings.siteName+'&accountId='+ self.user().currentOrganization().repositoryId+'&status='+data+"&fromDate="+fromDate+"&toDate="+toDate;
                    helper.getDataExternal(getData, function(err, result) {
                        //if (result.orders.length>0) {
                            callback(result.orders);
    
                        //}

                    })
            },

            
            getExternalCardDetails: function() {
                var widget = this;
                var cardApi = helper.apiEndPoint.cardsList + "?accountId=" + widget.user().currentOrganization().repositoryId + '&siteURL='+widget.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName;
                helper.getDataExternal(cardApi, function(err, result) {
                    if (result.storeCards && result.storeCards.length > 0) {

                        for (var i = 0; i < result.storeCards.length; i++) {
                            if (result.storeCards[i].isDefault == true) {
                                widget.isDefaultCardValue(result.storeCards[i].id);
                                  widget.getExistingCardId(result.storeCards[i].id)
                                console.log(widget.isDefaultCardValue(), "...widget.isDefaultCardValue....");
                               
                            }
                        }
                         widget.getExternalCardData(result.storeCards);
                         widget.isStoredCardsLoaded(true);

                    } else {
                        console.log(err, "......err.....");
                    }

                });


            },
            getExternalBillingAddresses: function() {
                var widget = this;
                var data = helper.apiEndPoint.addressList + "?accountId=" + widget.user().currentOrganization().repositoryId + '&siteURL='+widget.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName + "&usage=bill_to";
                helper.getDataExternal(data, function(err, result) {
                    if (result.addresses.length > 0) {
                        widget.getExternalBillingAddress(result.addresses);
                        for (var i = 0; i < widget.getExternalBillingAddress().length > 0; i++) {
                            if (widget.getExternalBillingAddress()[i].isDefault == true) {
                                widget.isDefaultBillingAddress(widget.getExternalBillingAddress()[i].address1 +
                                    ',' + widget.getExternalBillingAddress()[i].address2 + "," +
                                    widget.getExternalBillingAddress()[i].city + "," +
                                    widget.getExternalBillingAddress()[i].state + "," + widget.getExternalBillingAddress()[i].postalCode);
                                console.log(widget.getExternalBillingAddress()[i], 'is default...ture....');
                            }
                        }
                    } else if (err) {
                        console.log(err, "...err..");
                    }
                })
            },

          /*  mergeWithParticularIncompleteOrder: function(pOrderId) {
                var widget = this;
                console.log("selffff", widget);
                widget.cart().mergeCartWithParticularIncompleteOrder(pOrderId);
            },*/
            externalInvoiceCall: function(callback) {
                var self = this;
                console.log("externalinvoice", self);

                var data = helper.apiEndPoint.invoiceList + "?accountId=" + self.user().currentOrganization().repositoryId +
                    '&siteURL=' +self.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + self.site().extensionSiteSettings.externalSiteSettings.siteName;
                helper.getDataExternal(data, function(err, result) {
                   // if (result.invoices.length > 0) {
                        callback(result.invoices);
                    //}
                })
            },
            displayInvoiceTable: function() {
                var self = this;
                if (self.isInvoiceListLoaded()) {
                    $("#openInvoicesOrders").DataTable({
                        "ordering": false,
                        "info": false,
                        responsive: true,
                        "pagingType": "numbers",
                        "iDisplayLength": 12,
                         "language": {search: "",searchPlaceholder: "Invoice #"}
                    });
                    
                    if(self.getInvoicesOrders().length <= 12){       
                        $('#openInvoicesOrders_paginate').addClass('hide');    
                    }
                    if(self.paymentSuccess()){
                       notifier.sendSuccess(self.WIDGET_ID, "Thank you for your payment!",true);        
                    }
                }

            },

            downloadCSV:function(){
                var self =this;
                window.open( helper.apiEndPoint.downloadCsv + "?accountId=" + self.user().currentOrganization().repositoryId +   
                    '&siteURL=' +self.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + self.site().extensionSiteSettings.externalSiteSettings.siteName);
            },
            SpippedOrdersSorting: function(event){
                 var widget =this;
                 var getValue = $(event.currentTarget).val();
                 if(getValue=="twoYear"){
                     widget.createSpinner();
                     widget.getShippedOrderItems(24);
                 }
                 else if(getValue=="OneYear"){
                        widget.createSpinner();
                      widget.getShippedOrderItems(12);
                 }
                  else if(getValue=="sixMonths"){
                         widget.createSpinner();
                         widget.getShippedOrderItems(6);
                 }
                  else if(getValue=="twoMonths"){
                         widget.createSpinner();
                       widget.getShippedOrderItems(2);
                 }
                 else if(getValue =='currentMonth'){
                        widget.createSpinner();
                     widget.getShippedOrderItems(1);
                 }
                 
            },
              openOrderSorting: function(event){
                 var widget =this;
                 var getValue = $(event.currentTarget).val();
                 if(getValue=="twoYear"){
                        widget.createSpinner();
                     widget.getOpenOrderItems(24);
                 }
                 else if(getValue=="OneYear"){
                        widget.createSpinner();
                      widget.getOpenOrderItems(12);
                 }
                  else if(getValue=="sixMonths"){
                         widget.createSpinner();
                         widget.getOpenOrderItems(6);
                 }
                  else if(getValue=="twoMonths"){
                         widget.createSpinner();
                       widget.getOpenOrderItems(2);
                 }
                 else if(getValue =='currentMonth'){
                        widget.createSpinner();
                     widget.getOpenOrderItems(1);
                 }
                 
            },
            cancelOrderSorting: function(event){
                 var widget =this;
                 var getValue = $(event.currentTarget).val();
                 if(getValue=="twoYear"){
                        widget.createSpinner();
                     widget.getCancelledOrderItems(24);
                 }
                 else if(getValue=="OneYear"){
                        widget.createSpinner();
                      widget.getCancelledOrderItems(12);
                 }
                  else if(getValue=="sixMonths"){
                         widget.createSpinner();
                         widget.getCancelledOrderItems(6);
                 }
                  else if(getValue=="twoMonths"){
                         widget.createSpinner();
                       widget.getCancelledOrderItems(2);
                 }
                 else if(getValue =='currentMonth'){
                        widget.createSpinner();
                     widget.getCancelledOrderItems(1);
                 }
                 
            },
            getCancelledOrderItems:function(getMonths){
                 var widget =this;
                 $("#cancelledOrders").DataTable().clear().destroy();
                    var getFormatedDate = widget.getFromDate(getMonths);
                     var getTodayDateFormat = widget.getTodayDate(getMonths);
                     widget.searchRecordsForCancelledOrders(getFormatedDate,getTodayDateFormat, function(data){
                            console.log(data,"...data.....");
                            //widget.getCancellationOrders('');
                            widget.getCancellationOrders(data);
                            widget.getCancellationOrders.valueHasMutated();
                            $("#cancelledOrders").DataTable({
                                "ordering": false,
                                "info": false,
                                responsive: true,
                                "pagingType": "numbers",   
                                "iDisplayLength": 12,    
                                 "language": {search: "",searchPlaceholder: "Order #"}
                            });
                            if(widget.getCancellationOrders().length < 12){
                                $('#cancelledOrders_paginate').addClass('hide');
                            }
                     })
            },
            
            getShippedOrderItems : function(getMonths){
                var widget =this;
                $('#shippedOrderNew').DataTable().clear().destroy();
                            //$("#shippedOrderNew").DataTable().clear();
                  var getFormatedDate = widget.getFromDate(getMonths);
                     var getTodayDateFormat = widget.getTodayDate(getMonths);
                     widget.searchRecordsForshippedOrders(getFormatedDate,getTodayDateFormat,"SHIPPED", function(data){
                            console.log(data,"...data.....");
                           // widget.getShippedOrders('');
                            widget.getShippedOrders(data);
                            widget.getShippedOrders.valueHasMutated();
                            //setTimeout(function(){
                                $("#shippedOrderNew").DataTable({
                                "ordering": false,
                                "info": false,
                                responsive: true,
                                "pagingType": "numbers",
                                "iDisplayLength": 12,
                                 "language": {search: "",searchPlaceholder: "Order #"}
                            });
                        if(widget.getShippedOrders().length < 12){      
                            $('#shippedOrders_paginate').addClass('hide');
                         } 
                           // },2000);
                     })
            },
            getOpenOrderItems : function(getMonths){
                      var widget =this;
                      var getFormatedDate = widget.getFromDate(getMonths);
                      var getTodayDateFormat = widget.getTodayDate(getMonths);
                       $('#openOrders').DataTable().clear().destroy();
                      widget.searchRecordsForshippedOrders(getFormatedDate,getTodayDateFormat,"OPEN", function(data){
                            console.log(data,"...data.....");
                            widget.getOpenOrders(data);
                            widget.getShippedOrders.valueHasMutated()
                            $("#openOrders").DataTable({
                                "ordering": false,
                                "info": false,
                                responsive: true,
                                "pagingType": "numbers",
                                "iDisplayLength": 12,
                                 "language": {search: "",searchPlaceholder: "Order #"}
                            });
                            if(widget.getOpenOrders().length < 12){
                                $('#openOrders_paginate').addClass('hide');
                            }
                     
                     })
            },
            
            
            getFromDate:function(getMonthValue){
                var fromDateValue = '';
                var CurrentDate = new Date();
                var getYearVal = CurrentDate.getFullYear();
                var currentMonth = CurrentDate.getMonth()+1;
                console.log("getMonthValue",CurrentDate.getMonth());
                if(getMonthValue === 1){
                  var getMonth = currentMonth < 10 ? '0' + currentMonth :   currentMonth;
                  fromDateValue = getYearVal + '-'+ getMonth + '-01';   
                } else{
                //CurrentDate.setMonth(CurrentDate.getMonth()+1 - getMonthValue);
               // console.log("CurrentDate",CurrentDate.getMonth());
                var startYear;
                var startMonth;
                if(getMonthValue == 12){
                    startYear = getYearVal-1;
                    startMonth = currentMonth;
                } else if(getMonthValue == 24){
                     startYear = getYearVal-2;
                     startMonth = currentMonth;
                } else{
                     startYear = getYearVal;
                     startMonth = currentMonth- getMonthValue;
                }
                 var getMonthVal = startMonth < 10 ? '0' + startMonth :   startMonth;
                 var getDateVal =CurrentDate.getDate() < 10 ? '0' + CurrentDate.getDate() :   CurrentDate.getDate();
                 fromDateValue = startYear + '-'+ getMonthVal + '-' + getDateVal;   
                }
                return fromDateValue;
           
            },
            
             
            getTodayDate :function(getMonthValue){      
                var getDateVal = '';  
                  var getDate = new Date();
                   var getYearVal  = getDate.getFullYear();
                  var getMonth = getDate.getMonth()+1;
                  var getMonthVal = getMonth < 10 ? '0' + getMonth :   getMonth;
                  if(getMonthValue === 1){
                    getDateVal = new Date(getYearVal, getMonth, 0).getDate();
                    //console.log("numberOfDays",numberOfDays);  
                  } else{
                    getDateVal =getDate.getDate() < 10 ? '0' + getDate.getDate() :   getDate.getDate();
                  }
                 
                 return getYearVal + '-'+ getMonthVal + '-' + getDateVal;
                
            },
            
            
            searchRecordsForOpenOrders: function(fromDate ,newDate ,callback){
                    var self =this;
                    var data = helper.apiEndPoint.orderHistory + "?accountId=" + self.user().currentOrganization().repositoryId  +
                    '&siteURL=' +self.site().extensionSiteSettings.externalSiteSettings.siteUrl+'.currentOrganization()&siteName=' + self.site().extensionSiteSettings.externalSiteSettings.siteName+"&status=SHIPPED"+  "&fromDate="+fromDate+ "&toDate="+newDate ;
                    helper.getDataExternal(data, function(err, result) {
                          if(result){
                             callback(result.orders);
                             self.destroySpinner();
                        }
                        else{
                            self.destroySpinner();
                        }
                   
                    })
                
            },
            
             searchRecordsForshippedOrders: function(fromDate ,newDate ,orderStatus, callback){
                    var self =this;
                    var data = helper.apiEndPoint.orderHistory + "?accountId=" + self.user().currentOrganization().repositoryId +
                    '&siteURL=' +self.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + self.site().extensionSiteSettings.externalSiteSettings.siteName+"&status="+orderStatus +  "&fromDate="+fromDate+ "&toDate="+newDate  ;
                    helper.getDataExternal(data, function(err, result) {
                        if(result){
                             callback(result.orders);
                             self.destroySpinner();
                        }
                        else{
                            self.destroySpinner();
                        }
                       
                    })
            },
            searchRecordsForCancelledOrders: function(fromDate ,newDate ,callback){
                    var widget =this;
                    var data =  helper.apiEndPoint.orderHistory + "?accountId=" + widget.user().currentOrganization().repositoryId +
                    '&siteURL=' +widget.site().extensionSiteSettings.externalSiteSettings.siteUrl+'&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName+"&status=CANCELLED"+ "&fromDate="+fromDate+ "&toDate="+newDate ;
                    helper.getDataExternal(data, function(err, result) {
                       if(result){
                             callback(result.orders);
                             widget.destroySpinner();
                        }
                        else{
                            widget.destroySpinner();
                        }
                    })
               },
              	/**
             * Create spinner.
             */
            createSpinner : function() {
                var spinnerShow = {
                    parent: '#loadingModal',  
                    posTop:'0',
                    posLeft:'50%'
                }
    
            var $loadingModal=$('#loadingModal');             
            $loadingModal.removeClass('hide');
            $loadingModal.show();
                    
                    spinner.create(spinnerShow);        
            

            },
               /**
             * Destroy spinner.
             */
            destroySpinner : function() {        
                 $('#loadingModal').hide();                                   
              spinner.destroy();
            },
           mergeWithParticularIncompleteOrder: function(pOrderId) {
              var widget = this;
              widget.createSpinner();
              /** Change the pOrderID in the selectedOrderId, Once the Order Id issue is fixed **/
              //widget.selectedOrderId(pOrderId);
             // widget.cart().mergeCart(true);
            
              /***Custom code */
              /**Get the Order ID based on pOrderId */
              var sourceParam = '&source=EBIZ_01',
                    siteNameParam = '&siteName='+widget.site().extensionSiteSettings.externalSiteSettings.siteName,
                    siteURL = '&siteURL='+widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                    orderURL = '/ccstorex/custom/v1/orders/details?orderId='+pOrderId+siteURL+siteNameParam+sourceParam;
              ccRestClient.authenticatedRequest(orderURL, {}, function(data){
                  if(data.result && data.result === "success"){
                        widget.getOrderLevelItems(data.orderItems);
                        var getProductIds = [];
                        for (var i = 0; i < data.orderItems.length; i++) {
                            getProductIds.push(data.orderItems[i].productId);
                        }
                        if (getProductIds.length > 0) {
                            widget.getProductData(getProductIds);
                        }  
                  } else{
                     widget.destroySpinner();
                     //widget.cart().mergeCart(false);
                     //widget.selectedOrderId(null);
                     notifier.sendError("CartViewModel", "One or more items on this order may not be available to reorder so this functionality is unavailable at this time.", true);  
                  }
              },function(error){
                  widget.destroySpinner();
                      //widget.cart().mergeCart(false);
                      //widget.selectedOrderId(null);
                      notifier.sendError("CartViewModel", "One or more items on this order may not be available to reorder so this functionality is unavailable at this time.", true);
              });
              /** End Custom Code */

          },

          getProductData: function(getIds) {
              var widget = this;
              var requestData = {};
              ccRestClient.request("/ccstoreui/v1/products?productIds=" + getIds.toString(), {}, function(data) {
                  if (data) {
                      widget.productData(data);
                      widget.externalPricingCall(widget.productData());
                   //   widget.updateData(data);
                  }
              }, function(err) {
                    widget.destroySpinner();
                    notifier.sendError("CartViewModel", "One or more items on this order may not be available to reorder so this functionality is unavailable at this time.", true);
              }, "GET");


          },
          
       externalPricingCall: function(data) {
            //console.log("externalPricingCall",data);
            var skuIds = [];
            var widget = this;
            for (var i = 0; i < data.length > 0; i++) {
                if(data[i].id.indexOf("news") !== -1) {
                    continue;
                }
                for (var j = 0; j < data[i].childSKUs.length > 0; j++) {
                    var product = data[i].childSKUs;
                    if (product.length > 0) {
                        for (var k = 0; k < product.length > 0; k++) {
                            skuIds.push({
                                "itemId": product[k].repositoryId,
                                "quotingCatIds": product[k].dynamicPropertyMapBigString.hasOwnProperty("sku_x_quotingCategoryIDs") ? product[k].dynamicPropertyMapBigString.sku_x_quotingCategoryIDs.replace(/<\/?p>/g, '') : ""
                            })
                            break;
                        }

                    }
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
            var postData = {
                "enpointUrl": helper.apiEndPoint.pricing,
                "postData": skuData
            }
             helper.postDataExternal(postData, function(err, result) {
                    if (result.hasOwnProperty('pricingRecords')) {      
               for (var n = 0; n < data.length > 0; n++) {         
                  for (var o = 0; o < data[n].childSKUs.length > 0; o++) {
                      var product = data[n].childSKUs;
                         for (var p = 0; p < result.pricingRecords.length > 0; p++) {
                             if(result.hasOwnProperty('pricingRecords')){
                             if (product[o].repositoryId == result.pricingRecords[p].itemId) {
                                //   data[n].x_productExternalListPrice=result.pricingRecords[p].listPrice;
                                //   data[n].x_productExternalSalePrice=result.pricingRecords[p].salePrice;
                                if (result.pricingRecords[p].salePrice) {
                                    data[n]["cartPrice"] = result.pricingRecords[p].salePrice;
                                 } else if(result.pricingRecords[p].listPrice){
                                       data[n]["cartPrice"]=result.pricingRecords[p].listPrice;
                                 }
                                 break;
                             }
                            } else{
                                //notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
                            }
                         }
                     }
               }
               widget.updateData(data);
             }
                 else if (err) {
                    widget.destroySpinner();
                    notifier.sendError("CartViewModel", "One or more items on this order may not be available to reorder so this functionality is unavailable at this time.", true);
                }

            })
    },

          
          updateData: function(getData) {
              var widget = this;
              console.log("getData in update dataaaa",getData)
              this.getCurrentProductData(getData);
              //ko.mapping.fromJS(getData, {}, this.getCurrentProductData);
              for (var i = 0; i < this.getCurrentProductData().length; i++) {
                  for (var j = 0; j < widget.getOrderLevelItems().length; j++) {
                      if (widget.getCurrentProductData()[i].id == widget.getOrderLevelItems()[j].productId) {
                          widget.getCurrentProductData()[i].orderQuantity = parseInt(widget.getOrderLevelItems()[j].quantity, 10);
                          widget.getCurrentProductData()[i].externalPrice = widget.getCurrentProductData()[i].cartPrice;
                          widget.getCurrentProductData()[i].externalPriceQuantity = -1;
                          //console.log( widget.getCurrentProductData()[i].orderQuantity,"... widget.getCurrentProductData()[i].orderQuantity....");
                      }
                  }
              }
            //console.log("getCurrentProductData",this.getCurrentProductData());

              if (widget.getCurrentProductData().length > 1) {
                  widget.cart().addItem(ko.toJS(widget.getCurrentProductData()[0]));
              } else {
                  $.Topic(pubsub.topicNames.CART_ADD).publishWith(
                      ko.toJS(widget.getCurrentProductData()[0]), [{  
                          message: "success"
                      }]);
                 widget.destroySpinner();
                $("html, body").animate({scrollTop: 0}, "slow");
              }

          }
        };
    }
);