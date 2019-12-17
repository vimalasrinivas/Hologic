/**
 * @fileoverview Footer Widget.
 *
 * @author Taistech
 */
define(

    //-------------------------------------------------------------------
    // DEPENDENCIES
    //-------------------------------------------------------------------
    ['knockout', 'pubsub', 'notifier', 'CCi18n', 'ccConstants', 'spinner',
        'navigation', 'ccRestClient', 'viewModels/multiCartViewModel', 'ccResourceLoader!global/api-helper','js/jquery.simplePagination'
    ],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function (ko, pubsub, notifier, CCi18n, CCConstants, spinner, navigation,
        ccRestClient, MultiCartViewModel, helper) {

        "use strict";
        var isCartDelete = false;
        return {

            WIDGET_ID: "multiCart",
            display: ko.observable(true),
            viewCartDetailShow: ko.observable(),
            cartDetailsShow: ko.observable(false),
            currentCartName: ko.observable(""),
            fetchSize: ko.observable(10),
            cartNameSearch: ko.observable(""),
            isCartAdded: ko.observable(false),
            deleteCartName: ko.observable(""),
            deleteOrderId: ko.observable(""),
            
             // pagination observables
            koTotalPages: ko.observable(1),
            koCurrentPage: ko.observable(1),
            noOfRecordsPerPage: ko.observable(12),
            displayNoRecords: ko.observable(false),
            
            onLoad: function (widget) {
                var self = this;
                $(document).on('keyup', '#updateBoxQty', function () {
                  $("#qtyInvalidMessage").hide();
                    $("#qtyInvalidMessage").html("");
                    $("#CC-saveCart-Update").css("opacity", "1");
                  if($(this).val() == "") {
                      $("#qtyInvalidMessage").html("Quantity is mandatory.");
                      $("#qtyInvalidMessage").show();
                      $("#CC-saveCart-Update").css("opacity", "0.7");
                  } else if(isNaN($(this).val()) || $(this).val() < 0 ) {
                      $("#qtyInvalidMessage").html("Invalid entry. Please enter only numbers.");
                      $("#qtyInvalidMessage").show();
                      $("#CC-saveCart-Update").css("opacity", "0.7");
                  } else {
                      $("#qtyInvalidMessage").html("");
                      $("#qtyInvalidMessage").hide();
                      $("#CC-saveCart-Update").css("opacity", "1");
                  }
                });
                //    self.loadIncompleteOrder();
                widget.listingViewModel = ko.observable();
                widget.listingViewModel(new MultiCartViewModel());
                widget.listingViewModel().itemsPerPage = widget.fetchSize();
                widget.listingViewModel().blockSize = widget.fetchSize();
                
                 $.Topic(pubsub.topicNames.CART_DELETE_SUCCESS).subscribe(function(){
                    console.log("cart_deleted...........")
                    if(isCartDelete) {
                        widget.viewCartDetailShow({"cartName":""});
                        widget.viewCartDetailShow.valueHasMutated();
                    }
                })
                // price complete call
                $.Topic(pubsub.topicNames.CART_PRICE_COMPLETE).subscribe(function (obj) {
                    if (widget.isCartAdded()) {
                        widget.isCartAdded(false);
                        $('.dropdown-content').toggle();
                        setTimeout(function () {
                            $('.dropdown-content').hide();
                        }, 2000)
                    }
                });
                $.Topic(pubsub.topicNames.USER_AUTO_LOGIN_SUCCESSFUL)
                    .subscribe(function () {
                        widget.listIncompleteOrders();
                    });
                $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(function () {
                    widget.listIncompleteOrders();
                    if (widget.cart().items().length > 0) {
                        widget.cart().isCurrentCallInProgress = true;
                        widget.createOrderWithTemporaryItems();
                    }
                });

                $.Topic(pubsub.topicNames.CART_PRICE_SUCCESS).subscribe(function () {
                    if (widget.user().loggedIn()) {
                        widget.listIncompleteOrders();
                        widget.currentCartName("");
                    }
                });
                $.Topic(pubsub.topicNames.CART_DELETE_SUCCESS).subscribe(function () {
                    if (widget.user().loggedIn()) {
                        widget.listIncompleteOrders();
                    }
                });


                widget.listOfIncompleteOrders = ko.computed(function () {
                    var numElements, start, end, width;
                    var rows = [];
                    var orders;
                    var startPosition, endPosition;
                    // Get the orders in the current page
                    startPosition = (widget.listingViewModel().currentPage() -
                        1) * widget.listingViewModel().itemsPerPage;
                    endPosition = startPosition +
                        parseInt(widget.listingViewModel().itemsPerPage, 10);
                    orders = widget.listingViewModel().data.slice(startPosition,
                        endPosition);

                    if (!orders) {
                        return;
                    }
                    console.log(orders,"....orders...");
                    numElements = orders.length;
                    width = parseInt(widget.listingViewModel().itemsPerRow(), 10);
                    start = 0;
                    end = start + width;
                    while (end <= numElements) {
                        rows.push(orders.slice(start, end));
                        start = end;
                        end += width;
                    }
                    if (end > numElements && start < numElements) {
                        rows.push(orders.slice(start, numElements));
                    }
                    if(rows.length > 0) {
                        widget.getPagination(rows);
                        for(var i=0; i < rows.length; i++) {
                            rows[i][0].itemCount = ko.observable(0);
                            widget.ItemCountServiceCall(rows[i][0].orderId);
                              
                        }
                    }
                    
                    if(orders.length>0){
                         
                    }
                  
                    return rows;
                }, widget);
                
            widget.displayPagination = ko.computed(function() {
                    var first = (widget.koCurrentPage() - 1) * widget.noOfRecordsPerPage();
                    var getItems =  widget.listOfIncompleteOrders().slice(first, first + widget.noOfRecordsPerPage());
                    console.log("getItems",getItems);
                    if(getItems.length===0){
                            console.log("getItems",getItems);
                    }
                    return getItems;
                }, widget);
                
             widget.showCartLength = ko.computed(function() {
                    var cartArr = [];
                    for(var i=0; i <  widget.listOfIncompleteOrders().length; i++){
                        if(widget.listOfIncompleteOrders()[i][0].orderId !== widget.listOfIncompleteOrders()[i][0].cartName){
                            console.log("widget.listOfIncompleteOrders(). ifffff",widget.listOfIncompleteOrders()[i]);
                            cartArr.push(widget.listOfIncompleteOrders()[i]);
                        }
                    }
                    //console.log("cartArr",cartArr)
                    return cartArr.length > 0 ? cartArr.length : 0;
                }, widget);

            },
            
            getPagination: function(data) {
                //console.log(data ,"..widget.listOfIncompleteOrders");
                var widget = this;
                 $('.pagiNation').removeClass('hide');
                 if(data.length> widget.noOfRecordsPerPage()){
                     $('.pagiNation').removeClass('hide');
                }
                else{
                    $('.pagiNation').addClass('hide');
                }
               
                $('.pagiNation').pagination({
                    items: data.length,
                    itemsOnPage: widget.noOfRecordsPerPage(),
                    currentPage: widget.koCurrentPage(),
                    onPageClick: function(currentPageNumber) {
                        widget.getPageData(currentPageNumber);
                    }
                });
                var totalCount = data.length * 1;
                var count = 4 * 1;
                widget.koTotalPages(parseInt(totalCount / count));
            },
             getPageData: function(pageNumber) {
                var widget = this;
                if (widget.koCurrentPage() === pageNumber) {
                    return;
                }
                widget.koCurrentPage(pageNumber);
            },
            previous: function() {
                if (this.koCurrentPage() !== 0) {
                    this.koCurrentPage(this.koCurrentPage() - 1)
                }
                //this.displayArrows();
            },
            next: function() {
                if (this.koCurrentPage() < this.koTotalPages()) {
                    this.koCurrentPage(this.koCurrentPage() + 1)
                }
                //this.displayArrows();
            },

            createSpinner: function () {
                var spinnerShow = {
                    parent: '#loadingModal',
                    posTop: '0',
                    posLeft: '50%'
                };
                var $loadingModal = $('#loadingModal');
                $loadingModal.removeClass('hide');
                $loadingModal.show();
                spinner.create(spinnerShow);
            },
            
            destroySpinner: function () {
                var $loadingModal = $('#loadingModal');
                $loadingModal.removeClass('loadingIndicator');
                spinner.destroy();
            },
            
            ItemCountServiceCall: function(getorderId) {
                var widget = this;
                ccRestClient.authenticatedRequest("/ccstoreui/v1/orders/" + getorderId +"?fields=orderId,shoppingCart", {}, function (data) {
                    //console.log("ItemCountServiceCall", data);
                    for(var i=0; i < widget.listOfIncompleteOrders().length; i++) {
                        if(widget.listOfIncompleteOrders()[i][0].orderId === data.orderId) {
                            widget.listOfIncompleteOrders()[i][0].itemCount(data.shoppingCart.numberOfItems);
                           
                        }
                    }
                }, function (data) { }, "GET");
            },
            
            handleDeleteSelectedSaveList: function() {
                var widget = this;
                widget.cart().deleteParticularIncompleteOrders(widget.deleteOrderId());
                $('#CC-deleteSaveList-modal').modal('hide');
                 if (widget.listOfIncompleteOrders().length == widget.noOfRecordsPerPage()) {
                    widget.koCurrentPage(1);
                  }
                  widget.getPagination(widget.koCurrentPage());
                  notifier.sendSuccess(widget.WIDGET_ID, "Your saved cart is deleted successfully.", true);
            },
            
            /*    loadIncompleteOrder :function(){
                  var widget =this;
                  var data="/ccstoreui/v1/orders?incompleteOnly=true"
                  helper.getDataExternal(data, function(err, result) {
                      console.log(result,".....result......");
                  })
                    
                },*/

            updateQuantity: function (data, event, id, shippingGroup) {
                var widget = this;
                if($("#qtyInvalidMessage").is(":visible")) {
                   return false; 
                }
                console.log("updateQuantity..........", data);
                //data.updatableQuantity = ko.observable(parseInt(data.quantity)*parseFloat(data.externalPrice));
                //widget.cart().updateQuantity(data);
                //widget.cart().mergeCart(true);
                /*$.Topic(pubsub.topicNames.CART_UPDATE_QUANTITY).publishWith(
                    data, [{
                        "message": "success",
                        "commerceItemId": data.commerceItemId,
                        "shippingGroup": shippingGroup
                    }]);*/
                    widget.createSpinner();
                    widget.deleteOrderId(widget.viewCartDetailShow().orderId);
                    for (var j = 0; j < widget.viewCartDetailShow().shoppingCart.items.length > 0; j++) {
                        if (widget.viewCartDetailShow().shoppingCart.items[j].catRefId == data.catRefId) {
                            widget.viewCartDetailShow().shoppingCart.items[j].externalPriceQuantity = -1;
                            var putData = {
                                "cartName": widget.viewCartDetailShow().cartName,
                                "shoppingCart": {
                                    "items": widget.viewCartDetailShow().shoppingCart.items
                                },
                                "shippingMethod": {
                                    "value": "sm10001"

                                },
                                "payments": [{
                                    "cardCVV": "123",
                                    "nameOnCard": "test",
                                    "cardTypeName": "Visa",
                                    "cardType": "visa",
                                    "endMonth": "12",
                                    "type": "card",
                                    "endYear": 2018,
                                    "cardNumber": "4111111111111111"
                                }],

                                "shippingAddress": {
                                    "lastName": "h",
                                    "country": "United States",
                                    "address3": "",
                                    "address2": "A2",
                                    "city": "C1",
                                    "prefix": "",
                                    "address1": "A1",
                                    "defaultCountryCode": null,
                                    "postalCode": "36123",
                                    "jobTitle": "",
                                    "companyName": "",
                                    "county": "",
                                    "suffix": "",
                                    "selectedCountry": "US",
                                    "firstName": "h",
                                    "phoneNumber": "34534533",
                                    "faxNumber": "",
                                    "alias": "",
                                    "middleName": "",
                                    "state": "Alabama",
                                    "selectedState": "AL",
                                    "email": "h@h.com",
                                    "state_ISOCode": "US-AL"
                                },
                                "id": widget.viewCartDetailShow().orderId,
                                "orderStatus": "Incomplete"
                            }

                            widget.viewCartDetailShow.valueHasMutated();
                        }
                    }
                    console.log("putData.........", putData)
                    var getdata = {
                        "enpointUrl": "/ccstoreui/v1//orders/" + widget.viewCartDetailShow().orderId,
                        "postData": putData
                    }
                    helper.putDataExternal(getdata, function (err, result) {
                         console.log('result result', result);
                         var temData = [{"orderId": widget.deleteOrderId()}]
                         widget.viewCartDetails(temData)
                         widget.destroySpinner();
                        if (result) {
                            //  console.log('result result', result);
                        }
                    })
                console.log("data update");
                

                return true;
            },

            beforeAppear: function (page) {
                var widget = this;
                isCartDelete = false;
                widget.isCartAdded(false);
                widget.cartDetailsShow(false);
                if (widget.user().loggedIn() == false) {
                    widget.display(false);
                } else {
                    widget.listIncompleteOrders();
                    widget.display(true);
                }
            },


            /**
             * @function
             * @name multi-cart#listIncompleteOrders
             *
             * call to list incomplete orders for logged in profile.
             */
            listIncompleteOrders: function () {
                var self = this;
                var inputDate = {};
                //inputDate[CCConstants.SORTS] = "lastModifiedDate:desc";
                self.listingViewModel().sortProperty = "lastModifiedDate:desc";
                //set self.listingViewModel().cartNameSearch
                //string to search based on cartname
                if (self.user() && !self.user().loggedinAtCheckout()) {
                    self.listingViewModel().refinedFetch();
                }
            },
            viewCartDetails: function (data) {
                
                var widget = this;
                widget.display(false);
                widget.cartDetailsShow(true);
                console.log(data);

                ccRestClient.authenticatedRequest("/ccstoreui/v1/orders/" + data[0].orderId, {}, function (e) {
                    console.log("cartDetailshow", e);
					var prodIds = [];
                for(var i=0;i < e.shoppingCart.items.length; i++){
                    var tempData = e.shoppingCart.items[i]; 
                    prodIds.push(tempData.productId);
                    if(i+1 == e.shoppingCart.items.length){
                        widget.getAllProductData(prodIds.toString(),e);       
                    }
                }
                    //widget.viewCartDetailShow(e);
                }, function (data) { }, "GET");
                console.log("cmng", widget.viewCartDetailShow());
            },
            getAllProductData : function(prodData,orderData){
                var widget=this;
                ccRestClient.authenticatedRequest("/ccstoreui/v1/products?productIds=" + prodData +
                "&fields=parentCategories,childSKUs,productVariantOptions,selectedOptions,testingRevNumber,orderQuantity,primaryThumbImageURL,primarySmallImageURL,displayName,id,route", 
                {}, function(response) {
                    console.log("response",response)
                    for(var i=0;i < orderData.shoppingCart.items.length;i++){
                        for(var j=0; j < response.length; j++){
                            for(var k=0; k < response[j].childSKUs.length; k++){
                                var childSku = response[j].childSKUs[k];
                                var tempOrderData = orderData.shoppingCart.items[i];
                                var newProduct = {};
                                console.log("childSku.repositoryId",childSku.repositoryId, ".....", tempOrderData.catRefId)
                                if(childSku.repositoryId === tempOrderData.catRefId){
                                    newProduct = response[j];
                                    newProduct.orderQuantity = tempOrderData.quantity;
                                    newProduct.externalPriceQuantity = tempOrderData.quantity;
                                    newProduct.externalPrice = tempOrderData.externalPrice;
                                    newProduct.childSKUs = [childSku];
                                    tempOrderData['productData'] = ko.observable(newProduct);
                                    break;
                                }
                            }    
                            //if(respo)
                        }
                        if(i+1 === orderData.shoppingCart.items.length){
                        console.log("order Dtaaaaa",orderData)
                         widget.viewCartDetailShow(orderData);
                        }
                    }
                }, function(data) {}, "GET");
            },
            removeItemFromSavedCart: function (data, event) {
                console.log(data, "............data");
                console.log(event, "..............event..");

                var widget = this;
                isCartDelete = true;
                var getSavedCartItems = data;

                if (widget.viewCartDetailShow().shoppingCart.items.length > 1) {
                    for (var j = 0; j < widget.viewCartDetailShow().shoppingCart.items.length > 0; j++) {
                        if (widget.viewCartDetailShow().shoppingCart.items[j].catRefId == data.catRefId) {
                            widget.viewCartDetailShow().shoppingCart.items.splice(widget.viewCartDetailShow().shoppingCart.items.indexOf(widget.viewCartDetailShow().shoppingCart.items[j]), 1);
                            var putData = {
                                "cartName": widget.viewCartDetailShow().cartName,
                                "shoppingCart": {
                                    "items": widget.viewCartDetailShow().shoppingCart.items
                                },
                                "shippingMethod": {
                                    "value": "sm10001"

                                },
                                "payments": [{
                                    "cardCVV": "123",
                                    "nameOnCard": "test",
                                    "cardTypeName": "Visa",
                                    "cardType": "visa",
                                    "endMonth": "12",
                                    "type": "card",
                                    "endYear": 2018,
                                    "cardNumber": "4111111111111111"
                                }],

                                "shippingAddress": {
                                    "lastName": "h",
                                    "country": "United States",
                                    "address3": "",
                                    "address2": "A2",
                                    "city": "C1",
                                    "prefix": "",
                                    "address1": "A1",
                                    "defaultCountryCode": null,
                                    "postalCode": "36123",
                                    "jobTitle": "",
                                    "companyName": "",
                                    "county": "",
                                    "suffix": "",
                                    "selectedCountry": "US",
                                    "firstName": "h",
                                    "phoneNumber": "34534533",
                                    "faxNumber": "",
                                    "alias": "",
                                    "middleName": "",
                                    "state": "Alabama",
                                    "selectedState": "AL",
                                    "email": "h@h.com",
                                    "state_ISOCode": "US-AL"
                                },
                                "id": widget.viewCartDetailShow().orderId,
                                "orderStatus": "Incomplete"
                            }

                            widget.viewCartDetailShow.valueHasMutated();
                        }
                    }

                    var getdata = {
                        "enpointUrl": "/ccstoreui/v1//orders/" + widget.viewCartDetailShow().orderId,
                        "postData": putData
                    }

                    helper.putDataExternal(getdata, function (err, result) {
                        if (result) {
                            //  console.log('result result', result);
                        }
                    })

                }
                else {

                    widget.cart().deleteParticularIncompleteOrders(widget.viewCartDetailShow().orderId);
                    widget.viewCartDetailShow([]);
                    widget.viewCartDetailShow.valueHasMutated();
                    /*  helper.deleteDataExternal("/ccstoreui/v1//orders?orderId=" + widget.viewCartDetailShow().orderId, function(err, result) {
                      if (result) {
                          //  console.log('result result', result);
                          widget.viewCartDetailShow([]);
                      }
                   })
                      */
                }

                  

            },


            /**
             * @function
             * @name multi-cart#createOrderWithTemporaryItems
             *
             * method to create new incomplete cart with anonymous cart items
             */
            createOrderWithTemporaryItems: function () {
                var self = this;
                self.cart().createNewCart(true);
                self.cart().validateServerCart();
                self.cart().getProductData();
                self.cart().createCurrentProfileOrder();
            },

            /**
             * @function
             * @name multi-cart#createNewIncompleteCart
             */
            createNewIncompleteCart: function () {
                var self = this;
                self.cart().createNewCart(true);
                ccRestClient.setStoredValue(CCConstants.LOCAL_STORAGE_CREATE_NEW_CART, true);
                self.cart().emptyCart();
                self.user().orderId('');
                self.user().persistedOrder(null);
                self.user().setLocalData('orderId');
                self.currentCartName("");
            },


            deleteParticularIncompleteOrders: function (pOrderId, pCartName) {
                var self = this;
                self.deleteOrderId(pOrderId);
                self.deleteCartName(pCartName);
                $('#CC-deleteSaveList-modal').modal('show');
                //self.cart().deleteParticularIncompleteOrders(pOrderId);
            },

            /**
             * @function
             * @name UserViewModel#loadParticularIncompleteOrder
             */
            loadParticularIncompleteOrder: function (pOrderId) {
                var self = this;
                self.cart().loadCartWithParticularIncompleteOrder(pOrderId);
            },
            /**
             * @function
             * @name UserViewModel#mergeWithParticularIncompleteOrder
             */
            mergeWithParticularIncompleteOrder: function (pOrderId) {
                var widget = this;
                var tempItems = [];
                for(var i=0; i < widget.viewCartDetailShow().shoppingCart.items.length; i++) {
                    tempItems.push(widget.viewCartDetailShow().shoppingCart.items[i].productData());
                }
                console.log("tempItems.........", tempItems);
                widget.cart().addItems(tempItems);
               // widget.cart().mergeCartWithParticularIncompleteOrder(pOrderId);
                widget.isCartAdded(true);
                $("html, body").animate({scrollTop: 0}, "slow");
            },

            saveIncompleteCart: function (pOrderId) {
                var self = this;
                self.cart().cartName(self.currentCartName());
                self.cart().priceItemsAndPersist();
            },

           showPurChaseList: function (data) {
                $('#CC-purchaseList-name').val('');
                console.log(data, "...data..");
                var productItem = { 
                    "productId": data.productId,   
                    "catRefId": data.productData().childSKUs[0].repositoryId,  
                    "quantityDesired": 1,
                    "displayName": data.displayName
                };
                var productItemArray = [];
                productItemArray.push(productItem);
                $.Topic('PURCHASE_LIST.memory').publish(productItemArray);
                $('#CC-newPurchaseList-modal').modal('show');
            },


            externalInventoryCheck: function (postData) {
                var widget = this;
                widget.externalStockDetails(null);
                ccRestClient.authenticatedRequest("/ccstorex/custom/v1/mock/inventory", postData, function (data) {
                    console.log(data);
                    if (data.quantities && data.quantities.length > 0) {
                        widget.externalStockDetails(data.quantities);
                    }
                }, function (data) { }, "POST");
            }

        };

    }
);