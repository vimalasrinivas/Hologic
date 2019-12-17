/**
 * @fileoverview Footer Widget.
 *
 * @author Taistech
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  // Adding knockout
  //-------------------------------------------------------------------
  ['knockout', 'ccResourceLoader!global/api-helper', 'notifier',
      'navigation', 'pageLayout/cart', 'ccRestClient', 'ccConstants', 'pubsub', 'viewModels/multiCartViewModel','spinner'
  ],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function(ko, helper, notifier, navigation, pageLayout, ccRestClient, CCConstants, pubsub, MultiCartViewModel,spinner) {

      "use strict";


      return {

          showShippedOrders: ko.observableArray([]),
          selectedOrderId: ko.observable(),
          getOrderLevelItems: ko.observable(),
          getCurrentProductData: ko.observableArray([]),
          productData: ko.observableArray([]),
          onLoad: function(widget) {
              // price complete call
              $.Topic(pubsub.topicNames.CART_PRICE_COMPLETE).subscribe(function(obj) {
                  if (window.location.pathname.toLowerCase().indexOf('home') !== -1 || window.location.pathname === "") {
                     // console.log('its coming inside the price complete....');
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


          },
          externalShippingOrderCall: function() {
              var self = this;
              var getDate = new Date();
              var getYearVal = getDate.getFullYear();
              var getMonth = getDate.getMonth() + 1;
              var getMonthVal = getMonth < 10 ? '0' + getMonth : getMonth;
              var getDateVal = getDate.getDate() < 10 ? '0' + getDate.getDate() : getDate.getDate();
              var toDate = getYearVal + '-' + getMonthVal + '-' + getDateVal;
              var getFirstDate = new Date(getDate.getFullYear(), getDate.getMonth(), 1);
              var month = getFirstDate.getMonth() < 10 ? '0' + getFirstDate.getMonth() : getFirstDate.getMonth();
              var fromDate = getFirstDate.getFullYear() + '-' + month + '-0' + getFirstDate.getDate();
              var getData = helper.apiEndPoint.orderHistory + '?siteURL=' + self.site().extensionSiteSettings.externalSiteSettings.siteUrl + '&siteName=' + self.site().extensionSiteSettings.externalSiteSettings.siteName + '&accountId=' + self.user().currentOrganization().repositoryId + '&status=SHIPPED' + "&fromDate=" + fromDate + "&toDate=" + toDate;
              helper.getDataExternal(getData, function(err, result) {
                  if (result && result.orders) {
                      var showShipped = result.orders.slice(0, 3);
                      for(var i=0; i<showShipped.length;i++) {
                          if(showShipped[i].shipments[0].shippingMethod.toLowerCase().indexOf("fedex") != -1) {
                              showShipped[i].shipments[0].trackingUrl = (showShipped[i].shipments[0].trackingNumber) ? helper.apiEndPoint.trackFedEx + showShipped[i].shipments[0].trackingNumber : "";
                          }else if(showShipped[i].shipments[0].shippingMethod.toLowerCase().indexOf("ups") != -1) {
                              showShipped[i].shipments[0].trackingUrl = (showShipped[i].shipments[0].trackingNumber) ? helper.apiEndPoint.trackUPS + showShipped[i].shipments[0].trackingNumber : "";
                          }else if(showShipped[i].shipments[0].shippingMethod.toLowerCase().indexOf("dhl") != -1) {
                              showShipped[i].shipments[0].trackingUrl = (showShipped[i].shipments[0].trackingNumber) ? helper.apiEndPoint.trackDHL + showShipped[i].shipments[0].trackingNumber : "";
                          } else {
                              showShipped[i].shipments[0].trackingUrl = "";
                          }
                      }
                      self.showShippedOrders(showShipped);
                  }
              })
          },
          redirectOrderPage: function(orderid) {
              navigation.goTo("/OrderDetailsPage?orderNo=" + orderid);

          },
          mergeWithParticularIncompleteOrder: function(pOrderId) {
              var widget = this;
              widget.createSpinner();
              /** Change the pOrderID in the selectedOrderId, Once the Order Id issue is fixed **/
              widget.selectedOrderId(pOrderId);
              widget.cart().mergeCart(true);
            
              /***Custom code */
              /**Get the Order ID based on pOrderId */
              var oracleOrderID = pOrderId;
             
            /* ko.utils.arrayForEach(widget.showShippedOrders(), function(item) {
                //console.log('shipped items', item);
                if(item.orderId === pOrderId){
                    oracleOrderID = item.oracleOrderId;
                }
            });*/
              var sourceParam = '&source=EBIZ_01',
                    siteNameParam = '&siteName='+widget.site().extensionSiteSettings.externalSiteSettings.siteName,
                    siteURL = '&siteURL='+widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                    orderURL = '/ccstorex/custom/v1/orders/details?orderId='+oracleOrderID+siteURL+siteNameParam+sourceParam;
              ccRestClient.authenticatedRequest(orderURL, {}, function(data){
                  if(data.result && data.result == "success"){
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
                    notifier.sendError("CartViewModel", "One or more items on this order may not be available to reorder so this functionality is unavailable at this time.", true);  
                  }
              },function(error){
                    widget.destroySpinner();
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
                  //  console.log(err);
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
                    console.log(err, "....Pricing Api error...");
                    notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
                }

            })
        //console.log(skuData, "...skuData.")
        /*      $.ajax({
                  type: "POST",
                  url: "/ccstorex/custom/v1/mock/pricing",
                  headers: {
                      Accept: "application/json",
                      "Content-Type": "application/json"
                  },
                  async: false,
                  data: ko.toJSON(skuData),
                  success: function(result) {
                      for (var m = 0; m < widget.recommendations().length > 0; m++) {
                          for (var n = 0; n < widget.recommendations()[m].ccProduct.childSKUs().length > 0; n++) {
                              var childSkuData = widget.recommendations()[m].ccProduct.childSKUs();
                              if (childSkuData.length > 0) {
                                  for (var o = 0; o < childSkuData.length > 0; o++) {
                                      for (var p = 0; p < result.pricingRecords.length > 0; p++) {
                                          if (childSkuData[o].repositoryId() == result.pricingRecords[p].skuId) {
                                              // console.log("childSkuData",childSkuData[o].repositoryId());
                                              //console.log("result.pricingRecords",childSkuData[o].displayName());
                                              // console.log("inside conditionnnnnn",result.pricingRecords[p].listPrice);
                                              childSkuData[o].listPrice(result.pricingRecords[p].listPrice);
                                              widget.recommendations()[m].ccProduct.listPrice(result.pricingRecords[p].listPrice);
                                              childSkuData[o].salePrice(result.pricingRecords[p].salePrice);
                                              widget.recommendations()[m].ccProduct.salePrice(result.pricingRecords[p].salePrice);

                                              childSkuData[o].salePrice.valueHasMutated();
                                              widget.recommendations()[m].ccProduct.salePrice.valueHasMutated();
                                              childSkuData[o].listPrice.valueHasMutated();
                                              widget.recommendations()[m].ccProduct.listPrice.valueHasMutated();
                                              // console.log( widget.recommendations()[m][n].childSKUs()[o].listPrice() , "......result.pricingRecords[j].skuId.....");
                                              break;
                                          }

                                      }
                                  }

                              }
                          }
                      }
                      // console.log(result , "........result........");
                  },
                  error: function(e) {

                  }
              }); */
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

          },
          beforeAppear: function(page) {
              var widget = this;
              widget.externalShippingOrderCall();



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
            //  var loadingText = CCi18n.t('ns.common:resources.loadingText');
              $('#loadingModal').removeClass('hide');
              $('#loadingModal').show();
              indicatorOptions.loadingText = loadingText;
              spinner.create(indicatorOptions);
          },

      };
  }
);