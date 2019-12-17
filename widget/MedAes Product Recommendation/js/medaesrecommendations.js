define(
//-------------------------------------------------------------------
// DEPENDENCIES
//-------------------------------------------------------------------
['knockout', 'pageLayout/product', 'ccLogger', 'ccRestClient', 'ccConstants', 'pubsub', 'CCi18n', 'js/recsRequest', 'pageLayout/cart', 'notifier', 'ccResourceLoader!global/api-helper', 'promise'],

//-------------------------------------------------------------------
// MODULE DEFINITION
//-------------------------------------------------------------------
function(ko, Product, logger, CCRestClient, CCConstants, pubsub, CCi18n, recsRequest, cartModel, notifier, helper) {

    "use strict";
    var widgetModel;

    ko.bindingHandlers.recsetCCLink = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var valueObject = ko.utils.unwrapObservable(valueAccessor());
            var parents = bindingContext.$parents;
            var recSetId;
            var link = valueObject;

            for (var i = 0; i < parents.length; i++) {
                if (parents[i].recSetId) {
                    recSetId = parents[i].recSetId;
                    break;
                }
            }

            // Products use route as their link
            if (link.route) {
                link = link.route;
                if (recSetId) {
                    if (link.indexOf('?') == -1) {
                        link += '?' + 'recset=' + encodeURIComponent(recSetId);
                    } else {
                        link += '&' + 'recset=' + encodeURIComponent(recSetId);
                    }
                }
            }

            var args = arguments;
            args[1] = ko.observable({
                route: link
            });
            return ko.bindingHandlers.ccLink.init.apply(this, args);
        }
    }

    return {
        itemsPerRowInLargeDesktopView: ko.observable(4),    
        itemsPerRowInDesktopView: ko.observable(4),
        itemsPerRowInTabletView: ko.observable(2),          
        itemsPerRowInPhoneView: ko.observable(1),
        itemsPerRow: ko.observable(6),
        viewportWidth: ko.observable(),
        viewportMode: ko.observable(),
        isDeskTopMode: ko.observable(false),
        productGroups: ko.observableArray(),
        products: ko.observableArray(),
        spanClass: ko.observable(),
        recommendationsGroups: ko.observableArray(),
        recommendations: ko.observableArray([]),
        activeProdIndex: ko.observable(0),
        numberOfRecommendationsToShow: ko.observable(),
        recommendationsloaded: ko.observable(false),
        isCartAdded: ko.observable(false),
        priceCallCompleted: ko.observable(false),
        /**
         * Gets called before the widget gets loaded
         */
        beforeAppear: function() {
            var widget = this;
            widget.isCartAdded(false);
            widget.activeProdIndex(0);
            /*Added timeout to change quickview to Add to cart*/
            setTimeout(function(){
                      $('.pad-left').find('.cc-product-quickview').text("ADD TO CART");   
                },1000);
            $('#cc-recs').parent().parent().parent().addClass('bgcolor');
        },

        onLoad: function(widget) {
            
            console.log(widget.pageContext().page.name,".......page name ");
            widget.recommendations = ko.observableArray();
            widget.recommendationsGroups = ko.observableArray();

            var curPageId;
            $.Topic(pubsub.topicNames.PAGE_CHANGED).subscribe(function(page) {
                curPageId = page.pageId;
            });
            
             // price complete call
            $.Topic(pubsub.topicNames.CART_PRICE_COMPLETE).subscribe(function(obj) {
                if(widget.isCartAdded()) {
                    widget.isCartAdded(false);
                    $('.dropdown-content').toggle();
                    setTimeout(function(){
                        $('.dropdown-content').hide();
                    },2000)
                }
            });

            // publishing with it the slotId (widget's Id), numRecs
            $.Topic(pubsub.topicNames.RECS_WHO_WANT_RECS).subscribe(function(obj) {
                // pages() return an array of pageIds that this widget is to appear on
                // pageIds are like 'home', 'product' and etc.
                var pagesToAppearOn = widget.pages();

                var pageIdInObj = obj.pageId;
                if (pagesToAppearOn.indexOf(pageIdInObj) > -1) {
                    var eventObj = {};
                    eventObj.id = widget.id();
                    eventObj.numRecs = 300; //widget.numRecs(); /*** hardcoded 300 to get maximum records to filter with account bucket */
                    eventObj.restriction = widget.restriction ? widget.restriction() : 'Blended';
                    eventObj.strategy = widget.strategy ? widget.strategy() : 'Unrestricted';
                    eventObj.pageId = curPageId;
                    // Don't include collections configuration if it is unset or empty
                    // and trim entries.
                    /*eventObj.collections = widget.collections && widget.collections() ? widget.collections().split(',').map(function(e) {
                        return e.trim();
                    }) : [];*/
                    var brandCollection = widget.user().currentOrganization().account_catalog_brands.replace(/<\/?p>/g, '');
                    var tempBrandCollection = brandCollection && brandCollection ? brandCollection.split('|').map(function(e) {
                        return e.trim().toUpperCase();
                    }) : [];
                    var tempArray = [];
                    //console.log("RECS tempBrandCollection......", tempBrandCollection)
                    var tempArray1 = tempBrandCollection.filter(function(d){
                    	    for(var i=0 ; i<window.hologicCollectionList.length; i++){
                    	        if(d == window.hologicCollectionList[i].displayName.toUpperCase()) {
                    	            tempArray.push(window.hologicCollectionList[i].id);
                    	        }
                    	    }
                    	});
                    	
                    eventObj.collections = tempArray;
                    if(tempArray.length > 0) {
                        $.Topic(pubsub.topicNames.RECS_WANT_RECS).publish(eventObj);
                    }
                }
            });
            // End publishing RECS_WANT_RECS topic

            /**
             * Get the data useful for recommendations from the CartViewModel.
             * This returns both the simple list of productIds as well as objects with quantity and price data.
             * In this way it is useful for both the cart and checkout information.
             *
             * @param model a CartViewModel instance
             * @return a 2 index array where index 0 is the array of productIds and index 1 is the array of line item info
             */
            var getProductDataFromCartViewModel = function(model) {
                    var items = model.items(),
                        item,
                        length = items.length,
                        productIds = [],
                        lineItemInfo = [];

                    while (length--) {
                        // get a reference so we don't have to use the index
                        item = items[length];

                        // push onto the array of productIds
                        productIds.push(item.productId);
                        // push onto the array of line item product info
                        lineItemInfo.push({
                            productId: item.productId,
                            quantity: item.quantity(),
                            price: item.itemTotal()
                        });
                    }

                    // return both lists
                    return [productIds, lineItemInfo];
                },
                populateCCProducts = function(recsObservableArray, uvRecsArray, recSetId, recsProducts) {
                    var listProducts = function(productIds) {
                        // Exit early if there's no need to call CC.
                        if (productIds.length == 0)
                            return Promise.resolve([]);

                        var data = {
                            storePriceListGroupId: widget.site().selectedPriceListGroup().id,
                            productIds: productIds
                        };

                        return new Promise(function(resolve, reject) {
                            CCRestClient.request(
                                CCConstants.ENDPOINT_PRODUCTS_LIST_PRODUCTS,
                                data,
                                resolve,
                                function(response) {
                                    reject({
                                        "response": response,
                                        "requestedProductIds": productIds
                                    });
                                }
                            );
                        });
                    }; // end of listProducts function.

                    // TODO: Change promise["catch"](fn) to promise.catch(fn) when CC no longer uses
                    //       Rhino to examine the JavaScript at startup.
                    listProducts(recsProducts.map(function(p) {
                            return p.repositoryid;
                        }))["catch"](
                            function(err) {
                                if (err.response && err.response.status && (err.response.status.charAt(0) == "4") && err.response.errors) {
                                    var badIds = err.response.errors
                                        .filter(function(e) {
                                            return e.errorCode === "20031";
                                        })
                                        .map(function(e) {
                                            return e.moreInfo;
                                        });
                                    var goodIds = err.requestedProductIds.filter(function(p) {
                                        return badIds.indexOf(p) < 0;
                                    })
                                    if (goodIds.length < err.requestedProductIds.length)
                                        return listProducts(goodIds);
                                }
                                return Promise.reject(); // Something isn't right.  Give up.
                            })
                        .then(function(response) {
                            response.forEach(function(product) {
                                product.disableButton = ko.observable(true);
                                // use the storefront listing product which has a bunch of APIs for pricing
                                // adding a recSetId for sending clickthru request
                                recsObservableArray.push({
                                    id: product.id,
                                    recSetId: recSetId,
                                    ccProduct: new Product(product)
                                });

                                // universal variable product
                                // @see http://tools.qubitproducts.com/uv/developers/specification/#toc_9
                                var uvProduct = {
                                    id: product.repositoryId,
                                    url: product.route,
                                    name: product.displayName,
                                    description: product.description,
                                    manufacturer: product.brand,
                                    // TODO, the following property, category, is not in CC product, and is null in recs product
                                    category: null,
                                    //subcategory:
                                    //linked_products:
                                    // @see http://en.wikipedia.org/wiki/ISO_4217#Active_codes
                                    unit_sale_price: product.listPrice,
                                    //unit_price:
                                    //reviews:
                                };


                                // this sets up the objects the universal variable is expecting
                                uvRecsArray.push(uvProduct);
                            });

                            widget.recommendationsloaded(true);
                            widget.externalPricingCall();
                            $.Topic(pubsub.topicNames.RECS_RECOMMENDATIONS_CHANGED).publish(uvRecsArray);
                        })["catch"](
                            function(err) {
                                // Do nothing, we've encounted an unrecoverable issue.
                            });
                }, // end of populateCCProducts
                /**
                 * Updates the knockout model for recommendations on the page with
                 * data returned from the Recs servers.
                 *
                 * @param slots The slots json hash returned by the server
                 */
                processRecommendations = function(slotData) {
                    var i, products, recSetId, product,
                        // recs for updating the universal variable
                        uvRecs = [];

                    widget.recommendations.removeAll();

                    // of course this only works with one recslot on the page
                    products = slotData.recs;
                    recSetId = slotData.recSetId;
                    //populateCCProducts(widget.recommendations, uvRecs, recSetId, products);
                    
                    var customProducts = products.map(function(p) {
                            return p.repositoryid;
                    })
                    var data = {
                        storePriceListGroupId: widget.site().selectedPriceListGroup().id,
                        productIds: customProducts,
                        fields: "id,repositoryId,x_types"
                    };

                   CCRestClient.request(CCConstants.ENDPOINT_PRODUCTS_LIST_PRODUCTS, data, function(response){
                        var catalogHtmlObj = '';
                        var tempArray = [];
                        var accBucket = widget.user().currentOrganization().account_catalog_buckets;
                        if (helper.isHTML(accBucket)) {
                            catalogHtmlObj = $(accBucket);
                            if (catalogHtmlObj[0].textContent) {
                                tempArray = catalogHtmlObj[0].textContent.split('|');
                            }
                        } else {
                            catalogHtmlObj = accBucket;
                            tempArray = catalogHtmlObj.split('|');
                        }
                        
                        var filteredProduct = [];
                        var responseBreak = false;
                        for(var i=0; i < response.length; i++) {
                            for(var j=0; j < tempArray.length; j++) {
                                if(response[i].x_types === tempArray[j]) {
                                    response[i].repositoryid = response[i].repositoryId;
                                    filteredProduct.push(response[i]);
                                    
                                    if(widget.numRecs() == filteredProduct.length) {
                                        responseBreak = true;
                                    }
                                }
                            }
                            if(responseBreak) {
                                break;
                            }
                        }
                        console.log("filteredProduct with bucket...", filteredProduct);
                        populateCCProducts(widget.recommendations, uvRecs, recSetId, filteredProduct);
                   });
                };

            // subscribe to RECS_HAVE_RECS topic, if get any data, process it
            $.Topic(pubsub.topicNames.RECS_HAVE_RECS).subscribe(function(eventData) {
                //logger.debug(JSON.stringify(eventData.data));
                //logger.debug(JSON.stringify(eventData.visitorId));
                //logger.debug(JSON.stringify(eventData.sessionId));
                widget.recsVisitorId = eventData.visitorId;
                widget.recsSessionId = eventData.sessionId;

                // only interested in the event that is for the same slot, which is identified by widget.id()
                var slotIds = Object.keys(eventData.data);
                if (slotIds.indexOf(widget.id()) > -1) {
                    processRecommendations(eventData.data[widget.id()]);
                }
            });

            /**
             * Groups the products based on the viewport
             */
            widget.recommendationsGroups = ko.computed(function() {
                //console.log("widget.recommendations",widget.recommendations());
                var groups = [];
                if (widget.recommendations) {
                    widget.numberOfRecommendationsToShow = widget.numRecs() < widget.recommendations().length ?
                        widget.numRecs() : widget.recommendations().length;
                    for (var index = 0; index < widget.numberOfRecommendationsToShow; index++) {
                        if (index % widget.itemsPerRow() == 0) {
                            groups.push(ko.observableArray([widget.recommendations()[index]]));
                        } else {
                            groups[groups.length - 1]().push(widget.recommendations()[index]);
                        }
                    }
                }
                return groups;
            }, widget);

            /**
             * Redefines the number of recommendations to show
             * in carousal when viewport changes
             */
            widget.updateSpanClass = function() {
                var classString = "";
                var phoneViewItems = 0,
                    tabletViewItems = 0,
                    desktopViewItems = 0,
                    largeDesktopViewItems = 0;
                    
                   
                if(widget.pageContext().page.name=="QuickOrderPage"){
                      this.itemsPerRowInLargeDesktopView(3);
                      this.itemsPerRowInDesktopView(3);
                      this.itemsPerRowInTabletView(3);
                    
                }
                       
                if(widget.pageContext().page.name=="quickOrderPage"){
                      this.itemsPerRowInLargeDesktopView(3);
                      this.itemsPerRowInDesktopView(3);
                      this.itemsPerRowInTabletView(3);
                    
                }
                    
                if (this.itemsPerRow() == this.itemsPerRowInPhoneView()) {
                    phoneViewItems = 12 / this.itemsPerRow();
                }
                if (this.itemsPerRow() == this.itemsPerRowInTabletView()) {
                    tabletViewItems = 12 / this.itemsPerRow();
                }
                if (this.itemsPerRow() == this.itemsPerRowInDesktopView()) {
                    desktopViewItems = 12 / this.itemsPerRow();
                }
                if (this.itemsPerRow() == this.itemsPerRowInLargeDesktopView()) {
                    largeDesktopViewItems = 12 / this.itemsPerRow();
                    console.log(largeDesktopViewItems ,"...largeDesktopViewItems....");
                }

                if (phoneViewItems > 0) {
                    classString += "col-xs-" + phoneViewItems;
                }
                if ((tabletViewItems > 0) && (tabletViewItems != phoneViewItems)) {
                    classString += " col-sm-" + tabletViewItems;
                }
                if ((desktopViewItems > 0) && (desktopViewItems != tabletViewItems)) {
                    classString += " col-md-" + desktopViewItems;
                }
                if ((largeDesktopViewItems > 0) && (largeDesktopViewItems != desktopViewItems)) {
                    classString += " col-lg-" + largeDesktopViewItems;
                }
                console.log(classString,"...classString.....");
                widget.spanClass(classString);
            };

            /**
             * Checks the size of the current viewport and sets the viewport and itemsPerRow
             * mode accordingly
             * @param viewporttWidth the width of the selected viewport
             */
            widget.checkResponsiveFeatures = function(viewportWidth) {
                widget.isDeskTopMode(false);
                if(widget.pageContext().page.name=="QuickOrderPage"){
                      this.itemsPerRowInLargeDesktopView(3);
                      this.itemsPerRowInDesktopView(3);
                      this.itemsPerRowInTabletView(3);
                    
                }
                if(widget.pageContext().page.name=="quickOrderPage"){
                      this.itemsPerRowInLargeDesktopView(3);
                      this.itemsPerRowInDesktopView(3);
                      this.itemsPerRowInTabletView(3);
                    
                }
                if (viewportWidth > CCConstants.VIEWPORT_LARGE_DESKTOP_LOWER_WIDTH) {      
                    if (widget.viewportMode() != CCConstants.LARGE_DESKTOP_VIEW) {
                        widget.viewportMode(CCConstants.LARGE_DESKTOP_VIEW);
                        widget.itemsPerRow(widget.itemsPerRowInLargeDesktopView());
                    }
                } else if (viewportWidth > CCConstants.VIEWPORT_TABLET_UPPER_WIDTH &&
                    viewportWidth <= CCConstants.VIEWPORT_LARGE_DESKTOP_LOWER_WIDTH) {
                    if (widget.viewportMode() != CCConstants.DESKTOP_VIEW) {
                        widget.viewportMode(CCConstants.DESKTOP_VIEW);
                        widget.itemsPerRow(widget.itemsPerRowInDesktopView());
                    }
                } else if (viewportWidth >= CCConstants.VIEWPORT_TABLET_LOWER_WIDTH &&
                    viewportWidth <= CCConstants.VIEWPORT_TABLET_UPPER_WIDTH) {
                    if (widget.viewportMode() != CCConstants.TABLET_VIEW) {
                        widget.viewportMode(CCConstants.TABLET_VIEW);
                        widget.itemsPerRow(widget.itemsPerRowInTabletView());
                    }
                } else if (widget.viewportMode() != CCConstants.PHONE_VIEW) {
                    widget.viewportMode(CCConstants.PHONE_VIEW);
                    widget.itemsPerRow(widget.itemsPerRowInPhoneView());
                }
                widget.updateSpanClass();
            };

            widget.checkResponsiveFeatures($(window)[0].innerWidth || $(window).width());
            $(window).resize(
                function() {
                    widget.checkResponsiveFeatures($(window)[0].innerWidth || $(window).width());
                    widget.viewportWidth($(window)[0].innerWidth || $(window).width());
                });

            widget.handleCarouselSlidEvent = function(elementId, event) {
                $('#' + elementId).find('.active').children()[0].children[0].children[0].focus();
                // remove event handler so we don't get duplicate handlers on the element.
                $('#' + elementId).off('slid.bs.carousel');
            };

        },
          
          
            setAddButtonText : function(){
                /** Added timeout for changing button text to Add to cart from Quickview */
                setTimeout(function(){
                      $('.pad-left').find('.cc-product-quickview').text("ADD TO CART");    
                },1000);
            },
            setChooseText : function(){
                /** Added timeout for changing button text to choose options from Quickview */
                setTimeout(function(){
                      $('.chooseItem').find('.cc-product-quickview').text("CHOOSE OPTIONS"); 
                },1000);
            },  
        /**
         * Function to handle the left and right click to move the carousal
         */
        handleCarouselArrows: function(elementId, widget, event) {
            // Handle left key
            if (event.keyCode == 37) {
                // add event handler for when carousel completes slide
                $('#' + elementId).on('slid.bs.carousel', function(e) {
                    widget.handleCarouselSlidEvent(elementId, e);
                });
                $('#' + elementId).carousel('prev');
            }
            // Handle right key
            if (event.keyCode == 39) {
                // add event handler for when carousel completes slide
                $('#' + elementId).on('slid.bs.carousel', function(e) {
                    widget.handleCarouselSlidEvent(elementId, e);
                });
                $('#' + elementId).carousel('next');
            }
        },

        priceUnavailableText: function() {
            return CCi18n.t('ns.medaesrecommendations:resources.priceUnavailable');
        },
        externalPricingCall: function() {
            console.log("externalPricingCall");
            var skuIds = [];
            var widget = this;
            for (var i = 0; i < widget.recommendations().length > 0; i++) {
                if(widget.recommendations()[i].id.indexOf("news") !== -1) {
                    continue;
                }
                for (var j = 0; j < widget.recommendations()[i].ccProduct.childSKUs().length > 0; j++) {
                    var product = widget.recommendations()[i].ccProduct.childSKUs();
                    if (product.length > 0) {
                        for (var k = 0; k < product.length > 0; k++) {
                            skuIds.push({
                                "itemId": product[k].repositoryId(),
                                "quotingCatIds": product[k].dynamicPropertyMapBigString.hasOwnProperty("sku_x_quotingCategoryIDs") ? product[k].dynamicPropertyMapBigString.sku_x_quotingCategoryIDs().replace(/<\/?p>/g, '') : ""
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
            var data = {
                "enpointUrl": helper.apiEndPoint.pricing,
                "postData": skuData
            }
            console.log(data, ".data...........");
            helper.postDataExternal(data, function(err, result) {
                 widget.priceCallCompleted(true);
                    if (result.hasOwnProperty('pricingRecords')) {      
               for (var n = 0; n < widget.recommendations().length > 0; n++) {         
                  for (var o = 0; o < widget.recommendations()[n].ccProduct.childSKUs().length > 0; o++) {
                      var product = widget.recommendations()[n].ccProduct.childSKUs();
                         for (var p = 0; p < result.pricingRecords.length > 0; p++) {
                             if(result.hasOwnProperty('pricingRecords')){
                             
                             if (product[o].repositoryId() == result.pricingRecords[p].itemId) {
                                 
                                 product[o].listPrice(result.pricingRecords[p].listPrice);
                                 widget.recommendations()[n].ccProduct.listPrice(result.pricingRecords[p].listPrice);
                                 product[o].salePrice(result.pricingRecords[p].salePrice);
                                 widget.recommendations()[n].ccProduct.salePrice(result.pricingRecords[p].salePrice);
                               
                                 product[o].salePrice.valueHasMutated();
                                 widget.recommendations()[n].ccProduct.salePrice.valueHasMutated();
                                 product[o].listPrice.valueHasMutated();
                                 widget.recommendations()[n].ccProduct.listPrice.valueHasMutated();   
                                 
                                  widget.recommendations()[n].ccProduct.x_productExternalListPrice=result.pricingRecords[p].listPrice;
                                  widget.recommendations()[n].ccProduct.x_productExternalSalePrice=result.pricingRecords[p].salePrice;
                                if (result.pricingRecords[p].salePrice) {
                                    widget.recommendations()[n].ccProduct["cartPrice"] = result.pricingRecords[p].salePrice;
                                    widget.recommendations()[n].ccProduct.disableButton(false);
                                 } else if(result.pricingRecords[p].listPrice){
                                       widget.recommendations()[n].ccProduct["cartPrice"]=result.pricingRecords[p].listPrice;
                                       widget.recommendations()[n].ccProduct.disableButton(false);
                                 } else{
                                    widget.recommendations()[n].ccProduct.disableButton(true); 
                                 }
                                 break;
                             }
                            } else{
                                //notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
                            }
                         }
                     }
               }
             }
                 else if (err) {
                    console.log(err, "....Pricing Api error...");
                    //notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
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
    addToCart: function(getProductData) {
            console.log(ko.toJS(getProductData), "...........getProductData................");
            var widget = this;
            var newProduct = {};
            newProduct = $.extend(true, {}, getProductData, true);
            newProduct.orderQuantity = parseInt(1, 10);
            newProduct.externalPriceQuantity = -1;
             newProduct.externalPrice = newProduct.cartPrice;
            widget.cart().addItem(ko.toJS(newProduct));
            $.Topic("UPDATE_EXTERNAL_PRICE.memory").publish(getProductData); 
            widget.isCartAdded(true);
           $("html, body").animate({scrollTop: 0}, "slow");

        },
        addToFav: function(data) {
            var productItem = {
                "productId": data.id(),
                "catRefId": data.childSKUs()[0].repositoryId() ? data.childSKUs()[0].repositoryId() : "",
                "quantityDesired": 1,
                "displayName": data.displayName()
            };
            console.log("productItem", productItem);
            var productItemArray = [];
            productItemArray.push(productItem);
            $.Topic('PURCHASE_LIST.memory').publish(productItemArray);
            $('#CC-newPurchaseList-modal').modal('show');

        }

}

});