/**
 * @fileoverview hero Widget.
 * 
 * @author 
 */
define(
    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    ['knockout', 'jquery', 'ccResourceLoader!global/api-helper', 'ccRestClient', 'notifier', 'navigation', 'pubsub', 'spinner'],

    function(ko, $, helper, ccRestClient, notifier, navigation, pubsub, spinner) {

        "use strict";
        var widgetModel = '';
        return {
            orderDetails: ko.observable(),
            orderDetailsTemp: {},
            cancellationReason: ko.observable(),
            optionValues: ko.observable(),
            openOrderSummary: ko.observable([]),
            closedOrderSummary: ko.observable([]),
            shippedOrderSummary: ko.observable([]),
            shippedSummary: ko.observable(),
            orderItemDetails: ko.observable(),
            cancelledSummary: ko.observable(),
            cancelItemID: ko.observable(),
            appendCardNo: ko.observable(),
            cancellationOptions: ko.observable(),
            cancellationNotes: ko.observable(),
            isCancelOrder: ko.observable(false),
            showCancelOrderBtn: ko.observable(false),
            currentOrderNo: ko.observable(''),
            getOrderLevelItems: ko.observable(),
            getCurrentProductData: ko.observableArray([]),
            isReorder : ko.observable(false),
            isDisplayCancelNotifier:ko.observable(false),
            spinnerOptions: {
                parent: '#loadingModal',
                posTop: '0',
                posLeft: '50%'
            },
            /**
             * Create spinner.
             */
            createSpinner: function() {
                var spinnerShow = {
                    parent: '#loadingModal',
                    posTop: '0',
                    posLeft: '50%'
                }

                var $loadingModal = $('#loadingModal');
                $loadingModal.removeClass('hide');
                $loadingModal.show();

                spinner.create(spinnerShow);


            },
            /**
             * Destroy spinner.
             */
            destroySpinner: function() {
                $('#loadingModal').hide();
                spinner.destroy();
            },

            onLoad: function(widget) {
                widgetModel = widget;
                $.Topic('GET_ORDER_ID.memory').subscribe(function(getOrderId) {
                    if (getOrderId) {
                        widget.externalOrderDetailsCall(getOrderId);
                    }
                })

                widget.cancellationNotes.extend({
                    required: {
                        params: true,
                        message: widget.translate('Please fill the required field')
                    }
                });

                widget.validationModel = ko.validatedObservable({
                    cancellationNotes: widget.cancellationNotes
                });
                
                  $.Topic(pubsub.topicNames.CART_PRICE_COMPLETE).subscribe(function(obj) {
                  if (window.location.pathname.toLowerCase().indexOf('/orderdetailspage') !== -1 && widget.isReorder()) {
                      //console.log('its coming inside the price complete....');
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
                              widget.isReorder(false);
                              widget.destroySpinner();
                               $("html, body").animate({scrollTop: 0}, "slow");
                          }
                      }
                  }
              });
                

            },
            //product details call Functionalities
            fetchProductDetails: function(idResult) {
                var widget = this;
                console.log("idResult",idResult);
                //idResult = '675-2500-002';
                ccRestClient.authenticatedRequest("/ccstoreui/v1/products?productIds=" + idResult +
                    "&fields=route,displayName,primaryFullImageURL,description,repositoryId,brand,x_itemNumber", {},
                    function(e) {
                        console.log("heloooo",e);
                        if(e.length > 0){
                        for (var i = 0; i < e.length; i++) {
                            for (var j = 0; j < widget.orderDetailsTemp.orderItems.length; j++) {
                                var productItems = widget.orderDetailsTemp.orderItems[j];
                                if (e[i].repositoryId == productItems.productId) {
                                    productItems['brand'] = e[i].brand;
                                    productItems['primaryFullImageURL'] = e[i].primaryFullImageURL;
                                    productItems['x_itemNumber'] = e[i].x_itemNumber;
                                    //console.log("aaaaaa",productItems['brand']);

                                } else {
                                    productItems['brand'] = '';
                                    productItems['primaryFullImageURL'] = '';
                                    productItems['x_itemNumber'] = '';
                                  //  widget.orderDetails(widget.orderDetailsTemp);
                                //widget.cancellationOrderSummary(widget.orderDetails());
                                    //console.log("aaaaaa",productItems['brand']);

                                }
                            }
                            if (e.length == i + 1) {
                                console.log("widget.orderDetailsTemp",widget.orderDetailsTemp);
                                widget.orderDetails(widget.orderDetailsTemp);
                                widget.cancellationOrderSummary(widget.orderDetails());
                                // widget.cancelItem(widget.orderDetails());
                            }
                        }
                    } else{
                         for (var k = 0; k < widget.orderDetailsTemp.orderItems.length; k++) {
                            var productItems = widget.orderDetailsTemp.orderItems[k];
                            productItems['brand'] = '';
                            productItems['primaryFullImageURL'] = '';
                            productItems['x_itemNumber'] = '';
                        }
                         widget.orderDetails(widget.orderDetailsTemp);
                         widget.cancellationOrderSummary(widget.orderDetails());
                    }
                    },
                    function(data) {
                        for (var j = 0; j < widget.orderDetailsTemp.orderItems.length; j++) {
                            var productItems = widget.orderDetailsTemp.orderItems[j];
                            productItems['brand'] = '';
                            productItems['primaryFullImageURL'] = '';
                            productItems['x_itemNumber'] = '';
                        }
                         widget.orderDetails(widget.orderDetailsTemp);
                         widget.cancellationOrderSummary(widget.orderDetails());
                    }, "GET");
            },

            updateCancellationReason: function(data, event) {
                var widget = this;
                var getValue = $(event.currentTarget).val();
                //console.log(getValue ,"...valu");
                if (getValue) {
                    widget.cancellationReason(getValue);
                }
                //console.log(getValue,"....data");

            },

            //last 4 digit cardNo
            appendCardNumber: function(pCardNo) {
                console.log(pCardNo, "pCardNo");
                var widget = this;
                var card;
                if (pCardNo.paymentGroups[0].card.maskedCCNumber !== null) {
                    for (var i = 0; i < pCardNo.paymentGroups.length; i++) {
                        card = pCardNo.paymentGroups[i].card.maskedCCNumber;
                    }
                    widget.appendCardNo(card.substr(card.length - 4, 4));
                    console.log(widget.appendCardNo(), "widget.appendCardNo");
                }
            },

            // cancellation Orders Summary  Functionalities
            cancellationOrderSummary: function(data) {
                //console.log(data,"cccccccccccccc");    
                var widget = this;
                var cancelOrder = data.orderItems;
                var uncancelledArray = [];
                var cancelledArray = [];
                var trackingNumbers = [];
                var products = [];
                var shippedArray = [];
                for (var j = 0; j < cancelOrder.length; j++) {
                    //console.log("widget.orderDetailsTemp",widget.orderDetailsTemp)
                    if (widget.orderDetailsTemp.status == "SHIPPED") {
                        if (trackingNumbers.indexOf(cancelOrder[j].shipment.trackingNumber) === -1) {
                            trackingNumbers.push(cancelOrder[j].shipment.trackingNumber);
                        }
                    }
                }

                //console.log("trackingNumbers",trackingNumbers);
                if (trackingNumbers.length === 0) {
                    //console.log("trackingNumbers",trackingNumbers.length );
                    for (var i = 0; i < cancelOrder.length; i++) {
                        //console.log("cancelOrder",cancelOrder[i]);
                        if (cancelOrder[i].status == "CANCELLED") {
                            cancelledArray.push(cancelOrder[i]);
                            widget.cancelledSummary(true);
                        }

                        if (cancelOrder[i].status == "OPEN") {
                            uncancelledArray.push(cancelOrder[i]);
                            // console.log("cancelorder1234....",uncancelledArray);
                            var options = ['Customer Changed Mind', 'Wrong Product Ordered', 'Delivery Date Too Late'];

                            widget.optionValues(options);
                            //console.log("optionsValue",widget.optionValues());   
                            widget.cancelledSummary(false);
                        }
                        if (cancelOrder[i].status == "SHIPPED" && widget.orderDetailsTemp.status == "OPEN") {
                            shippedArray.push(cancelOrder[i]);
                            //console.log(shippedArray,"shippedArray");
                        }
                    }
                } else {

                    for (var a = 0; a < trackingNumbers.length; a++) {
                        var shippedOrderArray = [];
                        for (var b = 0; b < cancelOrder.length; b++) {
                            if (trackingNumbers[a] == cancelOrder[b].shipment.trackingNumber) {
                                shippedOrderArray.push(cancelOrder[b]);
                            }
                        }
                        products.push(shippedOrderArray);
                        //console.log("products",products); 
                    }

                }
                
                console.log("products............", products);
                
                for(var x=0; x<products.length;x++) {
                    for(var y=0; y<products[x].length;y++) {
                      if(data.shippingGroups[0].shippingMethod.toLowerCase().indexOf("fedex") != -1) {
                          products[x][y].shipment.trackingUrl = (products[x][y].shipment.trackingNumber) ? helper.apiEndPoint.trackFedEx + products[x][y].shipment.trackingNumber : "";
                      }else if(data.shippingGroups[0].shippingMethod.toLowerCase().indexOf("ups") != -1) {
                          products[x][y].shipment.trackingUrl = (products[x][y].shipment.trackingNumber) ? helper.apiEndPoint.trackUPS + products[x][y].shipment.trackingNumber : "";
                      }else if(data.shippingGroups[0].shippingMethod.toLowerCase().indexOf("dhl") != -1) {
                          products[x][y].shipment.trackingUrl = (products[x][y].shipment.trackingNumber) ? helper.apiEndPoint.trackDHL + products[x][y].shipment.trackingNumber : "";
                      } else {
                        products[x][y].shipment.trackingUrl = "";
                      }
                    }
                  }
                  
                widget.shippedSummary(products);
                //console.log("widget.shippedSummary",widget.shippedSummary());
                widget.openOrderSummary(uncancelledArray);
                //console.log("openOrderSummary....",widget.openOrderSummary());
                widget.closedOrderSummary(cancelledArray);
                //console.log("closedOrderSummary....", widget.closedOrderSummary());
                widget.shippedOrderSummary(shippedArray);
                //console.log("shippedOrderSummary....", widget.shippedOrderSummary());


            },

            //cancel item link
            cancelItemDetails: function(data) {
                // //console.log(data, data.id,"cancelItemDetails....");
                this.isCancelOrder(false);
                var widget = this;
                widget.cancelItemID(data.oracleOrderLineId);
                //console.log( widget.cancelItemID(),"cancelItemDetails....");    
                $('#cancelModal').modal('show');
                $('textarea').hide();
                $('.text-danger').hide();
            },
            cancelOrderBtn: function() {
                this.isCancelOrder(true);
                $('#cancelModal').modal('show');
            },
            //submit button   
            submitButton: function() {
                //console.log(data,"widget.externalCancelItemCall");
                var widget = this;
                widget.createSpinner();
                // console.log("submitButton",data);               
                // navigation.goTo("/OrderDetailsPage?orderNo="+ widget.orderDetailsTemp.oracleOrderId);    
               // window.location.reload();                      
                if (widget.isCancelOrder()) {
                    widget.externalCancelOrderCall();      
                } else {
                    widget.externalCancelItemCall();
                }
                setTimeout(function() {
                    widget.cancellationNotes('');
                }, 3000);
                if (widget.validationModel.isValid()) {

                } else {
                    widget.validationModel.errors.showAllMessages();
                }
                $("#Reasons").val($("#Reasons option[selected]").val());
            },

            //Reorder Functionalities  
            reorderProducts: function(data) {
                
                var getWidget = this;
                 getWidget.createSpinner();
                getWidget.isReorder(true);
                getWidget.getOrderLevelItems(data.orderItems);
                // var getProductIds = ["1520-1044"];
                 var getProductIds = [];
                  for (var i = 0; i < getWidget.getOrderLevelItems().length; i++) {
                      if(getWidget.getOrderLevelItems()[i].productId !== ''){
                        getProductIds.push(getWidget.getOrderLevelItems()[i].productId);  
                      }
                  }
                  if (getProductIds.length > 0) {
                      getWidget.fetchProductData(getProductIds);
                 } else{
                      notifier.sendError(getWidget.WIDGET_ID, "One or more items on this order may not be available to reorder.", true);
                      getWidget.destroySpinner();
                  }
           
               
            },
            
             fetchProductData: function(getIds) {
              var widget = this;
              var requestData = {};
              ccRestClient.request("/ccstoreui/v1/products?productIds=" + getIds.toString(), {}, function(data) {
                  if (data.length > 0) {
                      widget.updateData(data);
                  } else{
                      notifier.sendError(widget.WIDGET_ID, "One or more items on this order may not be available to reorder.", true);
                      widget.destroySpinner();
                  }
              }, function(err) {
                  notifier.sendError(widget.WIDGET_ID, "One or more items on this order may not be available to reorder.", true);
                   widget.destroySpinner();
              }, "GET");


          },
             updateData: function(getData) {
              var widget = this;
              ko.mapping.fromJS(getData, {}, this.getCurrentProductData);
              for (var i = 0; i < this.getCurrentProductData().length; i++) {
                  for (var j = 0; j < widget.getOrderLevelItems().length; j++) {
                      if (widget.getCurrentProductData()[i].id() ==  widget.getOrderLevelItems()[j].productId) {
                          widget.getCurrentProductData()[i].orderQuantity =  parseInt(1, 10);
                          widget.getCurrentProductData()[i].externalPrice = widget.getOrderLevelItems()[j].salePrice;
                          widget.getCurrentProductData()[i].externalPriceQuantity = -1;
                          console.log( widget.getCurrentProductData(),".. widget.getCurrentProductData().....");
                      }
                  }
              }
            console.log("widget.getCurrentProductData()",widget.getCurrentProductData())    
              if (widget.getCurrentProductData().length > 1) {
                  widget.cart().addItem(ko.toJS(widget.getCurrentProductData()[0]));
              } else {
                  $.Topic(pubsub.topicNames.CART_ADD).publishWith(
                      ko.toJS(widget.getCurrentProductData()[0]), [{
                          message: "success"
                      }]);
                 widget.isReorder(false);      
                 widget.destroySpinner();
                 $("html, body").animate({scrollTop: 0}, "slow");
              }

          },
            //Add to cart function
            addToCart: function(getProductData) {
                var widget = this;
                var newItem = {};
                newItem = $.extend(true, {}, getProductData, true);
                newItem.commerceItemId = getProductData.id;
                newItem.id = getProductData.productId;
                newItem.displayName = getProductData.productDisplayName;
                newItem.childSKUs = [{
                    'repositoryId': getProductData.skuId
                }];
                newItem.childSKUs[0].repositoryId = getProductData.skuId;
                newItem.orderQuantity = parseInt(1, 10);
                newItem.externalPriceQuantity = -1;
                newItem.externalPrice = getProductData.listPrice;
                console.log(newItem, "newItem.............");
                $.Topic(pubsub.topicNames.CART_ADD).publishWith(
                    newItem, [{
                        message: "success"
                    }]);
                $.Topic("UPDATE_EXTERNAL_PRICE.memory").publish(getProductData);
            },
            beforeAppear: function(page) {
                this.cancellationReason('');
                this.currentOrderNo('');
                console.log("currentOrderNo------", this.currentOrderNo());
                this.currentOrderNo(page.parameters.split('=')[1]);
                this.showCancelOrderBtn(false);
                this.externalOrderDetailsCall(this.currentOrderNo());
                console.log("datashowOrderDetails------", page);
            },
            externalOrderDetailsCall: function(fetchOrderId) {
                var widget = this;
                widget.createSpinner();
                var data = helper.apiEndPoint.orderDetails + "?orderId=" + fetchOrderId +
                    '&siteURL=' + widget.site().extensionSiteSettings.externalSiteSettings.siteUrl + '&siteName=' + widget.site().extensionSiteSettings.externalSiteSettings.siteName + '&source=EBIZ_01';
                helper.getDataExternal(data, function(err, result) {
                    if (result && result.orderItems ) {
                        var productRequiredId = [];
                        var statusArr = [];
                        for (var i = 0; i < result.orderItems.length; i++) {
                            var productNoId = result.orderItems[i].productId;
                           // var productNoId = "1520-1044";
                            widget.orderItemDetails(result.orderItems[i]);
                            if (productNoId !== '') {
                                productRequiredId.push(productNoId);
                            }
                            if (result.orderItems[i].status === 'OPEN') {
                                statusArr.push(result.orderItems[i].status);
                            }
                            if (result.orderItems.length == i + 1) {
                                widget.fetchProductDetails(productRequiredId.toString());
                            }
                        }
                        if (statusArr.length === result.orderItems.length) {
                            widget.showCancelOrderBtn(true);
                        }
                        widget.orderDetailsTemp = result;
                        widget.orderDetails(widget.orderDetailsTemp);
                        widget.appendCardNumber(widget.orderDetails());
                        widget.destroySpinner();
                        if(widget.isDisplayCancelNotifier()){
                             notifier.sendSuccess(widget.WIDGET_ID, widget.translate('Your request to cancel an order is submitted successfully'), true);     
                        }            
                    } else{
                         widget.destroySpinner();
                        notifier.sendError(widget.WIDGET_ID, widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
                    }
                });
            },


            orderCancelObj: function() {
                this.id = widgetModel.orderDetails().oracleOrderId;
                this.orderItems = null;
                this.site = {
                    'siteURL': widgetModel.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                    'siteName': widgetModel.site().extensionSiteSettings.externalSiteSettings.siteName
                };
                this.cancellationReason = widgetModel.cancellationReason();
            },
            // Cancel Order Call Api integration
            externalCancelOrderCall: function() {
                var widget = this;
                var skuData = new widget.orderCancelObj();
                var data = {
                    "enpointUrl": helper.apiEndPoint.cancelItem + '?orderId=' + widget.orderDetails().oracleOrderId,
                    "postData": skuData
                };
                helper.postDataExternal(data, function(err, result) {
                    $('select').val('');
                    $('#cancelModal').modal('hide');        
                    if (!err) {
                        widget.destroySpinner();     
                         widget.isDisplayCancelNotifier(true);              
                         navigation.goTo("/OrderDetailsPage?orderNo="+ widget.orderDetailsTemp.oracleOrderId);  
                        widget.externalOrderDetailsCall(widget.currentOrderNo());        
                        //notifier.sendSuccess(widget.WIDGET_ID, widget.translate('Your request to cancel an order is submitted successfully'), true);
                    }
                    if (err) {
                        widget.destroySpinner();
                        notifier.sendError(widget.WIDGET_ID, widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
                    }
                });
            },



            itemCancelObj: function() {
                this.id = widgetModel.orderDetails().oracleOrderId;
                this.orderItems = [{
                    'id': widgetModel.cancelItemID(),
                    'status': 'CANCEL',
                    'cancellationReason': widgetModel.cancellationReason()
                }];
                this.site = {
                    'siteURL': widgetModel.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                    'siteName': widgetModel.site().extensionSiteSettings.externalSiteSettings.siteName
                };
            },
            externalCancelItemCall: function() {
                var widget = this;
                var skuData = new widget.itemCancelObj();
                var data = {
                    "enpointUrl": helper.apiEndPoint.cancelItem + '?orderId=' + widget.orderDetails().oracleOrderId,
                    "postData": skuData
                };
                helper.postDataExternal(data, function(err, result) {
                    $('#cancelModal').modal('hide');
                    if (!err) {
                        widget.destroySpinner();
                        // navigation.goTo("/OrderDetailsPage?orderNo="+ widget.orderDetailsTemp.oracleOrderId);  
                        // widget.externalOrderDetailsCall(widget.currentOrderNo());                        
                        notifier.sendSuccess(widget.WIDGET_ID, widget.translate('Your request to cancel an item is submitted successfully'), true);          
                    }
                    if (err) {
                        widget.destroySpinner();
                        notifier.sendError(widget.WIDGET_ID, widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
                    }
                });
            },
            downloadPackagingSlip: function(shipData) {
                var endpointUrl = helper.apiEndPoint.packageSlip + '?deliveryNumber=' + shipData.deliveryNumber +
                    '&siteURL=' + this.site().extensionSiteSettings.externalSiteSettings.siteUrl + '&siteName=' + this.site().extensionSiteSettings.externalSiteSettings.siteName;
                helper.getDataExternal(endpointUrl, function(err, result) {
                    if (err) {

                    } else {
                        console.log("resultttttt", result);
                        //const linkSource = `data:application/pdf;base64,${result}`;
                        var pdf = 'data:application/octet-stream;base64,' + result.pdf;
                        const downloadLink = document.createElement("a");
                        const fileName = "packageSlip.pdf";

                        downloadLink.href = pdf;
                        downloadLink.download = fileName;
                        downloadLink.click();
                    }
                });
            }
        };
    }
);