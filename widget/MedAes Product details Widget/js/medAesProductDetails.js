/**
 * @fileoverview Product Details Widget.
 * 
 */
define(   

    //-------------------------------------------------------------------
    // DEPENDENCIES
    //-------------------------------------------------------------------
    ['knockout', 'pubsub', 'ccConstants', 'koValidate', 'notifier', 'CCi18n', 'storeKoExtensions', 'swmRestClient', 'spinner', 'pageLayout/product', 'ccRestClient', 'pinitjs', 'viewModels/inventoryViewModel', 'ccResourceLoader!global/api-helper'],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function(ko, pubsub, CCConstants, koValidate, notifier, CCi18n, storeKoExtensions, swmRestClient, spinner, product, ccRestClient, pinitjs, Inventory, helper) {

        "use strict";
        var widgetModel;
        var getYouTubePath;
        var LOADED_EVENT = "LOADED";
        var LOADING_EVENT = "LOADING";

        var productLoadingOptions = {
            parent: '#cc-product-spinner',
            selector: '#cc-product-spinner-area'
        };

        var resourcesAreLoaded = false;
        var resourcesNotLoadedCount = 0;
        var resourcesMaxAttempts = 5;

        var mySpacesComparator = function(opt1, opt2) {
            if (opt1.spaceNameFull() > opt2.spaceNameFull()) {
                return 1;
            } else if (opt1.spaceNameFull() < opt2.spaceNameFull()) {
                return -1;
            } else {
                return 0;
            }
        };
        var joinedSpacesComparator = function(opt1, opt2) {
            if (opt1.spaceNameFull() > opt2.spaceNameFull()) {
                return 1;
            } else if (opt1.spaceNameFull() < opt2.spaceNameFull()) {
                return -1;
            } else {
                return 0;
            }
        };

        return {

            stockStatus: ko.observable(false),
            stockState: ko.observable(),
            showStockStatus: ko.observable(false),
            variantOptionsArray: ko.observableArray([]),
            itemQuantity: ko.observable(1),
            stockAvailable: ko.observable(),
            availabilityDate: ko.observable(),
            selectedSku: ko.observable(),
            disableOptions: ko.observable(false),
            priceRange: ko.observable(false),
            filtered: ko.observable(false),
            WIDGET_ID: 'productDetails',
            isAddToCartClicked: ko.observable(false),
            containerImage: ko.observable(),
            PDPcontainerShow: ko.observable(false),
            imgGroups: ko.observableArray(),
            mainImgUrl: ko.observable(),
            activeImgIndex: ko.observable(0),
            viewportWidth: ko.observable(),
            skipTheContent: ko.observable(false),
            listPrice: ko.observable(),
            salePrice: ko.observable(),
            backLinkActive: ko.observable(true),
            variantName: ko.observable(),
            variantValue: ko.observable(),
            listingVariant: ko.observable(),
            shippingSurcharge: ko.observable(),
            secondaryCurrencyShippingSurcharge: ko.observable(),
            imgMetadata: ko.observableArray([]),
            isMobile: ko.observable(false),
            quickViewFromPurchaseList: ko.observable(false),

            isOnlineOnly: ko.observable(false),
            selectedStore: ko.observable(),
            storeSearchText: ko.observable(),
            stores: ko.observableArray(),
            koImageContainer: ko.observableArray([]),

            customVariants: ko.observableArray([]),
            displayItemNumber: ko.observable(''),
            selectedSkuIdvalue: ko.observable(''),
            xRecordIdForInventoryCheck: ko.observable(''),
            mutipleSkuVaraints: ko.observableArray([]),
            multiSelectedSkuValue :ko.observable(''),
            
            showSingleVariants :ko.observable(false),
            showMultipleVariants :ko.observable(false),
            multiSelectQuantityValue : ko.observable(''),
            multiSelectSizeValue : ko.observable(''),
            availableSizeArray : ko.observable([]),


            // -1 -> Some thing went wrong in either fetching locatins / stock status of a sku.
            // -2 -> No Stores found for given string.
            // 0  -> Everything went well. Got stock status of given sku across requested locatins.
            storeLookupStatus: ko.observable(0),

            // social
            showSWM: ko.observable(true),
            isAddToSpaceClicked: ko.observable(false),
            disableAddToSpace: ko.observable(false),
            spaceOptionsArray: ko.observableArray([]),
            spaceOptionsGrpMySpacesArr: ko.observableArray([]),
            spaceOptionsGrpJoinedSpacesArr: ko.observableArray([]),
            mySpaces: ko.observableArray([]),
            siteFbAppId: ko.observable(''),

            //External Inventory
            externalStockDetails: ko.observable(),
            externalSalePrice: ko.observable(),
            externalListPrice: ko.observable(),
            isPDPAddtoCart: ko.observable(false),
            priceCallCompleted: ko.observable(false),
            
            resourcesLoaded: function(widget) {
                resourcesAreLoaded = true;
            },
            SkuOnClick: function() {
                setTimeout(function() {
                    $('.optionValue-Wrap a:first-child').trigger('click');
                    $(".optionValue-Wrap a:first-child").addClass("active");
                }, 2000);

                console.log("skuuuclicked");
            },

            // containerShowonPdp:function(widget){    
            //     var widget= this;
            //     console.log("containerShowonpdp",widget);  
            //     if(widget.pageContext().page.name == "product"){           
            //         $('#showContainer').addClass('container');    
            //          $('#showContainerDoc').addClass('container');     
            //     }
            // },  

            checkavailableClose: function() {
                $("#CheckAvailStock").modal("hide")
            },
            onLoad: function(widget) {


                widgetModel = widget;

                widget.SkuOnClick();


                $.Topic(pubsub.topicNames.UPDATE_LISTING_FOCUS).subscribe(function(obj) {
                    widget.skipTheContent(true);
                });
                
                $.Topic(pubsub.topicNames.CART_PRICE_COMPLETE).subscribe(function(obj) {
                    if(widget.isPDPAddtoCart()) {
                        widget.isPDPAddtoCart(false);
                        $('.dropdown-content').toggle();
                        setTimeout(function(){
                            $('.dropdown-content').hide();
                        },2000)
                    }
               });

                widget.showSecondaryShippingData = ko.pureComputed(function() {
                    return widget.site().payShippingInSecondaryCurrency() && (null != widget.site().exchangeRate()) &&
                        (null != widget.site().siteSecondaryCurrency());
                });

                $.Topic(pubsub.topicNames.PAGE_READY).subscribe(function(obj) {
                    var parameters = {};
                    if (obj.parameters) {
                        var param = obj.parameters.split("&");
                        for (var i = 0; i < param.length; i++) {
                            var tempParam = param[i].split("=");
                            parameters[tempParam[0]] = tempParam[1];
                        }
                    }
                    if (parameters.variantName && parameters.variantValue) {
                        widget.variantName(decodeURI(parameters.variantName));
                        widget.variantValue(decodeURI(parameters.variantValue));
                    } else {
                        widget.variantName("");
                        widget.variantValue("");
                    }
                });

                $.Topic(pubsub.topicNames.SOCIAL_SPACE_ADD_SUCCESS).subscribe(function(obj) {
                    if (obj.productUpdated) {
                        widget.disableAddToSpace(true);
                        setTimeout(function() {
                            widget.disableAddToSpace(false);
                        }, 3000);
                    } else {
                        widget.isAddToSpaceClicked(true);
                        widget.disableAddToSpace(true);
                        setTimeout(function() {
                            widget.isAddToSpaceClicked(false);
                        }, 3000);
                        setTimeout(function() {
                            widget.disableAddToSpace(false);
                        }, 3000);
                    }
                });

                $.Topic(pubsub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(function(obj) {
                    widget.getSpaces(function() {});
                });

                $.Topic(pubsub.topicNames.USER_AUTO_LOGIN_SUCCESSFUL).subscribe(function(obj) {
                    widget.getSpaces(function() {});
                });

                $.Topic(pubsub.topicNames.SOCIAL_REFRESH_SPACES).subscribe(function(obj) {
                    widget.getSpaces(function() {});
                });

                widget.itemQuantity.extend({
                    required: {
                        params: true,
                        message: CCi18n.t('ns.common:resources.quantityRequireMsg')
                    },
                    digit: {
                        params: true,
                        message: CCi18n.t('ns.common:resources.quantityNumericMsg')
                    },
                    min: {
                        params: 1,
                        message: CCi18n.t('ns.medAesProductDetails:resources.quantityGreaterThanMsg', {
                            quantity: 0
                        })
                    }
                });

                widget.stockAvailable.subscribe(function(newValue) {
                    var max = parseInt(newValue, 10);
                    widget.itemQuantity.rules.remove(function(item) {
                        return item.rule == "max";
                    });
                    if (max > 0) {
                        widget.itemQuantity.extend({
                            max: {
                                params: max,
                                message: CCi18n.t('ns.medAesProductDetails:resources.quantityLessThanMsg', {
                                    quantity: max
                                })
                            }
                        });
                    }
                });

                //Get the item quantity, available in cart.
                widget.itemQuantityInCart = function(pProduct) {
                    var isCatRefId = pProduct.orderLimit ? false : true;
                    return widget.cart().getItemQuantityInCart(widget.cart().items(), pProduct.id, pProduct.childSKUs[0].repositoryId, isCatRefId, null, widget.selectedStore);
                };

                // initialize swm rest client
                swmRestClient.init(widget.site().tenantId, widget.isPreview(), widget.locale());

                // get FB app ID
                widget.fetchFacebookAppId();

                /**
                 * Set up the popover and click handler 
                 * @param {Object} widget
                 * @param {Object} event
                 */
                widget.shippingSurchargeMouseOver = function(widget, event) {
                    // Popover was not being persisted between
                    // different loads of the same 'page', so
                    // popoverInitialised flag has been removed

                    // remove any previous handlers
                    $('.shippingSurchargePopover').off('click');
                    $('.shippingSurchargePopover').off('keydown');

                    var options = new Object();
                    options.trigger = 'manual';
                    options.html = true;

                    // the button is just a visual aid as clicking anywhere will close popover
                    options.title = widget.translate('shippingSurchargePopupTitle') +
                        "<button id='shippingSurchargePopupCloseBtn' class='close btn pull-right'>" +
                        widget.translate('escapeKeyText') +
                        " &times;</button>";

                    options.content = widget.translate('shippingSurchargePopupText');

                    $('.shippingSurchargePopover').popover(options);
                    $('.shippingSurchargePopover').on('click', widget.shippingSurchargeShowPopover);
                    $('.shippingSurchargePopover').on('keydown', widget.shippingSurchargeShowPopover);
                };

                widget.shippingSurchargeShowPopover = function(e) {
                    // if keydown, rather than click, check its the enter key
                    if (e.type === 'keydown' && e.which !== CCConstants.KEY_CODE_ENTER) {
                        return;
                    }

                    // stop event from bubbling to top, i.e. html
                    e.stopPropagation();
                    $(this).popover('show');

                    // toggle the html click handler
                    $('html').on('click', widget.shippingSurchargeHidePopover);
                    $('html').on('keydown', widget.shippingSurchargeHidePopover);

                    $('.shippingSurchargePopover').off('click');
                    $('.shippingSurchargePopover').off('keydown');
                };

                widget.shippingSurchargeHidePopover = function(e) {
                    // if keydown, rather than click, check its the escape key
                    if (e.type === 'keydown' && e.which !== CCConstants.KEY_CODE_ESCAPE) {
                        return;
                    }

                    $('.shippingSurchargePopover').popover('hide');

                    $('.shippingSurchargePopover').on('click', widget.shippingSurchargeShowPopover);
                    $('.shippingSurchargePopover').on('keydown', widget.shippingSurchargeShowPopover);

                    $('html').off('click');
                    $('html').off('keydown');

                    $('.shippingSurchargePopover').focus();
                };

                $(window).resize(function() {
                    // Optimizing the carousel performance, to not reload when only height changes
                    var width = $(window)[0].innerWidth || $(window).width();
                    if (widget.product && widget.product() && widget.product().primaryFullImageURL) {
                        if (widget.viewportWidth() == width) {
                            // Don't reload as the width is same
                        } else {
                            // Reload the things
                            if (width > CCConstants.VIEWPORT_TABLET_UPPER_WIDTH) {
                                if (widget.viewportWidth() <= CCConstants.VIEWPORT_TABLET_UPPER_WIDTH) {
                                    // Optionally reload the image place in case the view port was different
                                    widget.activeImgIndex(0);
                                    widget.mainImgUrl(widget.product().primaryFullImageURL);
                                    $('#prodDetails-imgCarousel').carousel(0);
                                    $('#carouselLink0').focus();
                                }
                            } else if (width >= CCConstants.VIEWPORT_TABLET_LOWER_WIDTH) {
                                if ((widget.viewportWidth() < CCConstants.VIEWPORT_TABLET_LOWER_WIDTH) || (widget.viewportWidth() > CCConstants.VIEWPORT_TABLET_UPPER_WIDTH)) {
                                    // Optionally reload the image place in case the view port was different
                                    widget.activeImgIndex(0);
                                    widget.mainImgUrl(widget.product().primaryFullImageURL);
                                    $('#prodDetails-imgCarousel').carousel({
                                        interval: 1000000000
                                    });
                                    $('#prodDetails-imgCarousel').carousel(0);
                                    $('#carouselLink0').focus();
                                }
                            } else {
                                if (widget.viewportWidth() > CCConstants.VIEWPORT_TABLET_LOWER_WIDTH) {
                                    // Optionally reload the carousel in case the view port was different
                                    $('#prodDetails-mobileCarousel').carousel({
                                        interval: 1000000000
                                    });
                                    $('#prodDetails-mobileCarousel').carousel(0);
                                }
                            }
                        }
                    }
                    widget.viewportWidth(width);
                    widget.checkResponsiveFeatures($(window).width());
                });

                widget.isAddToPurchaseListDisabled = ko.computed(
                    function() {
                        return (!widget.validateAddToSpace() || widget.disableAddToSpace());
                    }, widget);

                widget.viewportWidth($(window).width());
                if (widget.product()) {
                    widget.imgGroups(widget.groupImages(widget.product().thumbImageURLs()));
                    widget.mainImgUrl(widget.product().primaryFullImageURL());
                }

                if (true || widget.skipTheContent()) {
                    var focusFirstItem = function() {
                        $('#cc-product-details :focusable').first().focus();
                        widget.skipTheContent(false);
                    };

                    focusFirstItem();
                    setTimeout(focusFirstItem, 1); // Daft IE fix.        
                }
                widget.storeSearchText.extend({
                    maxLength: {
                        params: 50,
                        message: CCi18n.t('ns.common:resources.maxlengthValidationMsg', {
                            maxLength: 50
                        })
                    }
                });
                //   widget.externalInventoryCheck();      

                //  widget.containerShowonPdp(); 


                $('#CheckAvailStock').on('hidden.bs.modal', function() {
                    // Load up a new modal...
                    $('#checkAvailableId').modal('hide')
                })


                $('body').delegate('.cc-quantity', 'click', function() {
                    $('.cc-quantity').removeClass('SelectedSku');
                    $(this).addClass('SelectedSku');

                })
                $('body').delegate('.cc-size', 'click', function() {
                    $('.cc-size').removeClass('SelectedSku');
                    $(this).addClass('SelectedSku');

                })
                
                
                $('body').delegate('.multiplesku-quantity', 'click', function() {
                    $('.multiplesku-quantity').removeClass('SelectedSku');
                    $(this).addClass('SelectedSku');

                })
                $('body').delegate('.multiplesku-size', 'click', function() {
                    $('.multiplesku-size').removeClass('SelectedSku');
                    $(this).addClass('SelectedSku');

                })
                
                
                
               widget.itemQuantity.subscribe(function(newValue){
                     widget.externalInventoryCheck(widget.xRecordIdForInventoryCheck());
                })
                
                

            },



            displayingSkuVaraints: function() {
                var widget = this;
                var tempArray = [];
                widget.customVariants([]);
                var getSkus = widget.product().childSKUs();
                var getLength = widget.product().childSKUs().length;
                var sizeArr = [];
                widget.availableSizeArray([]);
                widget.mutipleSkuVaraints([]);
                widget.customVariants([]);
                widget.selectedSkuIdvalue("");
				widget.multiSelectedSkuValue("");
				widget.multiSelectSizeValue("");
				widget.showMultipleVariants(false);
                widget.showSingleVariants(false);
                if (getLength > 1) {
                    if (widget.product().x_variantProperties() && widget.product().x_variantProperties().indexOf('|') != -1) {
                       for (var j = 0; j < widget.product().childSKUs().length > 0; j++) {
                                if (widget.product().childSKUs()[j].x_quantity()) {
                                    if(tempArray.indexOf(widget.product().childSKUs()[j].x_quantity()) == -1){
                                        tempArray.push(widget.product().childSKUs()[j].x_quantity());    
                                    }
                                }
                                 if (widget.product().childSKUs()[j].x_size()) {
                                    if(sizeArr.indexOf(widget.product().childSKUs()[j].x_size()) == -1){
                                        sizeArr.push(widget.product().childSKUs()[j].x_size());    
                                    }
                                }
            
                            }
                            widget.availableSizeArray(sizeArr);
                            console.log("tempArraytempArray",tempArray);
                           // console.log("sizeArr",sizeArr);
                            for (var n = 0; n < tempArray.length > 0; n++) {
                                var skuObj = {
                                    "name": tempArray[n],
                                    "value": [],
                                    "size" : []
                                }
                                for (var m = 0; m < getLength > 0; m++) {
                                    if (tempArray[n] == widget.product().childSKUs()[m].x_quantity()) {
                                        skuObj.value.push(widget.product().childSKUs()[m]);
                                        skuObj.size.push(widget.product().childSKUs()[m].x_size())
            
                                    }
                                }
                                widget.mutipleSkuVaraints.push(skuObj);
                                console.log(  widget.mutipleSkuVaraints() ,"..  widget.mutipleSkuVaraints...");
                            }
                         widget.showMultipleVariants(true);
                         widget.showSingleVariants(false);
                    } else {

                        if (widget.product().x_variantProperties() == 'x_quantity') {
                            for (var i = 0; i < getLength > 0; i++) {
                                if (widget.product().childSKUs()[i].x_quantity()) {
                                    widget.customVariants.push({
                                        "quantity": widget.product().childSKUs()[i].x_quantity(),
                                        "x_recordId": widget.product().childSKUs()[i].x_recordId(),
                                        "x_quotingCategoryIDs": widget.product().childSKUs()[i].x_quotingCategoryIDs() ? widget.product().childSKUs()[i].x_quotingCategoryIDs().replace(/<\/?p>/g, '') : null,
                                        "repositoryId": widget.product().childSKUs()[i].repositoryId(),
                                        "name": widget.product().x_variantProperties()
                                    })
                                }

                            }
                        }
                        if (widget.product().x_variantProperties() == 'x_size') {
                            for (var k = 0; k < getLength > 0; k++) {
                                if (widget.product().childSKUs()[k].x_size()) {
                                    widget.customVariants.push({
                                        "x_recordId": widget.product().childSKUs()[k].x_recordId(),
                                        "size": widget.product().childSKUs()[k].x_size(),
                                        "x_quotingCategoryIDs": widget.product().childSKUs()[k].x_quotingCategoryIDs() ? widget.product().childSKUs()[k].x_quotingCategoryIDs().replace(/<\/?p>/g, '') : null,
                                        "repositoryId": widget.product().childSKUs()[k].repositoryId(),
                                        "name": widget.product().x_variantProperties()

                                    })

                                }
                            }
                        }
                         widget.showMultipleVariants(false);
                         widget.showSingleVariants(true);
                    }
                }


            },

            getSelectedSkuOptionValue: function(data, event) {
                console.log(data, "...data....");
                console.log(event, "....event....");
                var widget = this;
                var externaldata = [];
                    externaldata.push({
                        "itemId": data.repositoryId,
                        "quotingCatIds": data.x_quotingCategoryID ? data.x_quotingCategoryIDs : null
                    });
                   // widget.displayItemNumber(data.x_itemNumber());
                    widget.selectedSkuIdvalue(data.repositoryId);
                    widget.externalPricingCall(externaldata);
                    widget.xRecordIdForInventoryCheck(data.repositoryId);

            },
            
            displaySize : function(data,event){
                var widget =this;
                widget.multiSelectedSkuValue(data.name);
                widget.multiSelectQuantityValue(data.name);
               // widget.multiSelectSizeValue(data.value[0].x_size());
                if(widget.multiSelectQuantityValue()){
                    var externaldata = [];
                    externaldata.push({
                        "itemId": data.value[0].repositoryId(),
                        "quotingCatIds":  data.value[0].x_quotingCategoryIDs() ? data.value[0].x_quotingCategoryIDs().replace(/<\/?p>/g, '') : null
                    });
                    console.log(externaldata,"...externaldata")
                  //  widget.displayItemNumber(data.value[0].x_itemNumber());
                    widget.selectedSkuIdvalue(data.value[0].repositoryId());
                    widget.externalPricingCall(externaldata);
                    widget.xRecordIdForInventoryCheck(data.value[0].repositoryId());
                }
            },
            selectSize : function(data,event){
                var widget =this;
                console.log("datadata",data)
                widget.multiSelectedSkuValue(data.x_quantity());
                widget.multiSelectQuantityValue(data.x_quantity());
                widget.multiSelectSizeValue(data.x_size());
                if(widget.multiSelectQuantityValue() &&  widget.multiSelectSizeValue()){
                    var externaldata = [];
                    externaldata.push({
                        "itemId": data.repositoryId(),
                        "quotingCatIds": data.x_quotingCategoryIDs() ? data.x_quotingCategoryIDs().replace(/<\/?p>/g, ''): null
                    });
                    console.log(externaldata,"...externaldata")
                   // widget.displayItemNumber(data.repositoryId());
                    widget.selectedSkuIdvalue(data.repositoryId());
                    widget.externalPricingCall(externaldata);
                    widget.xRecordIdForInventoryCheck(data.repositoryId());
                }
            },
            showPurChaseList: function(data) {
                $('#CC-purchaseList-name').val('');
                console.log(data, "...data..");
                var widget = this;
                var productItem = {
                    "productId": widget.product().id(),
                    "catRefId": widget.product().childSKUs().length > 1 ? widget.selectedSku().repositoryId() : widget.product().childSKUs()[0].repositoryId(),
                    "quantityDesired": 1,
                    "displayName": widget.product().displayName()
                };
                var productItemArray = [];
                productItemArray.push(productItem);
                $.Topic('PURCHASE_LIST.memory').publish(productItemArray);
                $('#CC-newPurchaseList-modal').modal('show');
            },

            beforeAppear: function(page) {
                $('[data-toggle="tooltip"]').tooltip();  
                var widget = this;
                 widget.isPDPAddtoCart(false);
                if (!page || (page.pageId !== "category" && page.pageId !== "searchResults")) {                 
                    if (widget.product && widget.product()) {
                        widget.checkResponsiveFeatures($(window).width());
                        this.backLinkActive(true);
                        if (!widget.isPreview() && !widget.historyStack.length) {
                            this.backLinkActive(false);
                        }

                        /* reset active img index to 0 */
                        widget.shippingSurcharge(null);
                        widget.secondaryCurrencyShippingSurcharge(null);
                        widget.activeImgIndex(0);
                        widget.firstTimeRender = true;

                        //Reset Inventory Observable  
                        widget.externalStockDetails();

                        this.populateVariantOptions(widget);
                        if (widget.product()) {
                            widget.imgGroups(widget.groupImages(widget.product().thumbImageURLs()));
                        }
                        widget.loaded(true);
                        this.itemQuantity(1);
                        this.selectedStore(null);
                        this.storeSearchText(null);
                        if (widget.product().onlineOnly && ko.isObservable(widget.product().onlineOnly)) {
                            this.isOnlineOnly(widget.product().onlineOnly());
                        }

                        // the dropdown values should be pre-selected if there is only one sku
                        if (widget.product() && widget.product().childSKUs().length == 1) {
                            this.filtered(false);
                            this.filterOptionValues(null);
                            if (widget.product().childSKUs()[0].onlineOnly()) {
                                this.isOnlineOnly(widget.product().childSKUs()[0].onlineOnly());
                            }
                        }
                        notifier.clearSuccess(this.WIDGET_ID);
                        notifier.clearError(this.WIDGET_ID);
                        var catalogId = null;
                        if (widget.user().catalog) {
                            catalogId = widget.user().catalog.repositoryId;
                        }
                        //widget.listPrice(widget.externalListPrice());
                        //widget.salePrice(widget.externalSalePrice());
                        console.log("widget.product().salePrice() in before appear1111", widget.product().salePrice())
                        if (widget.product()) {
                            widget.product().stockStatus.subscribe(function(newValue) {
                                if ((widget.product().stockStatus().stockStatus === CCConstants.IN_STOCK ||
                                        widget.product().stockStatus().stockStatus === CCConstants.PREORDERABLE ||
                                        widget.product().stockStatus().stockStatus === CCConstants.BACKORDERABLE) &&
                                    (widget.product().stockStatus().orderableQuantity != undefined ||
                                        widget.product().stockStatus().productSkuInventoryStatus != undefined)) {
                                    if (widget.product().stockStatus().orderableQuantity) {
                                        widget.stockAvailable(widget.product().stockStatus().orderableQuantity);
                                    } else {
                                        widget.stockAvailable(1);
                                    }
                                    widget.disableOptions(false);
                                    widget.stockStatus(true);
                                    widget.stockState(widget.product().stockStatus().stockStatus);
                                    widget.availabilityDate(widget.product().stockStatus().availabilityDate);
                                } else {
                                    widget.stockAvailable(0);
                                    widget.stockState(CCConstants.OUT_OF_STOCK);
                                    widget.disableOptions(true);
                                    widget.stockStatus(false);
                                }
                                widget.showStockStatus(true);
                            });
                            // For a product with no variants, set it as selectedSku by default
                            if (widget.product().product && widget.product().product.childSKUs &&
                                widget.product().product.childSKUs.length === 1) {
                                this.selectedSku(widget.product().product.childSKUs[0]);
                            }
                            var firstchildSKU = widget.product().childSKUs()[0];
                            if (firstchildSKU) {
                                var skuId = firstchildSKU.repositoryId();
                                if (this.variantOptionsArray().length > 0) {
                                    skuId = '';
                                }
                                this.showStockStatus(false);
                                widget.product().getAvailability(widget.product().id(), skuId, catalogId);
                                widget.product().getPrices(widget.product().id(), skuId);
                            } else {
                                widget.stockStatus(false);
                                widget.disableOptions(true);
                                widget.showStockStatus(true);
                            }
                            this.priceRange(this.product().hasPriceRange);
                            widget.mainImgUrl(widget.product().primaryFullImageURL());

                            $.Topic(pubsub.topicNames.PRODUCT_VIEWED).publish(widget.product());
                            $.Topic(pubsub.topicNames.PRODUCT_PRICE_CHANGED).subscribe(function() {
                                //	widget.listPrice(widget.externalListPrice());
                                // widget.salePrice(widget.externalSalePrice());
                                console.log("widget.product().salePrice() 22222", widget.product().salePrice())
                                widget.shippingSurcharge(widget.product().shippingSurcharge());
                                widget.secondaryCurrencyShippingSurcharge(widget.product().secondaryCurrencyShippingSurcharge && widget.product().secondaryCurrencyShippingSurcharge() ? widget.product().secondaryCurrencyShippingSurcharge() : null);
                            });



                            var externaldata = [];
                            var quotingCatId = '';
                            if(widgetModel.product().childSKUs().length > 0 && widgetModel.product().childSKUs()[0].x_quotingCategoryIDs()){
                                quotingCatId =  widgetModel.product().childSKUs()[0].x_quotingCategoryIDs() ? widgetModel.product().childSKUs()[0].x_quotingCategoryIDs().replace(/<\/?p>/g, '') : null;
                            }                            
                            externaldata.push({
                                "itemId": widgetModel.product().childSKUs()[0].repositoryId(),
                                "quotingCatIds":  widgetModel.product().childSKUs()[0].x_quotingCategoryIDs() ? widgetModel.product().childSKUs()[0].x_quotingCategoryIDs().replace(/<\/?p>/g, '') : null
                            });

                            widget.xRecordIdForInventoryCheck("")
                            widget.selectedSkuIdvalue("");
                            widget.displayItemNumber("");
                            widget.xRecordIdForInventoryCheck(widgetModel.product().childSKUs()[0].repositoryId())
                            widget.selectedSkuIdvalue(widgetModel.product().childSKUs()[0].repositoryId());
                            widget.displayItemNumber(widgetModel.product().x_itemNumber());
                            widget.displayingSkuVaraints();
                            widget.externalInventoryCheck(widget.xRecordIdForInventoryCheck());
                            widget.externalPricingCall(externaldata);

                        }

                        // Load spaces
                        if (widget.user().loggedIn()) {
                            widget.getSpaces(function() {});
                        }
                    }
                }
                widget.imgGroupRendering();
            },

            goBack: function() {
                $(window).scrollTop($(window).height());
                window.history.go(-1);
                return false;
            },

            // Handles loading a default 'no-image' as a fallback
            cancelZoom: function(element) {
                $(element).parent().removeClass('zoomContainer-CC');
            },

            replaceThumbImage: function(getImage) {
                if (getImage.indexOf('&') != '-1') {
                    var getImageUrl = getImage.split('&');
                    return getImageUrl[0] + '&height=100&width=100';
                }
            },

            /*Rendering images and video from carousel*/
            imgGroupRendering: function() {
                var widget = this;
                widget.koImageContainer([]);
                if (widget.product()) {
                    for (var i = 0; i < widget.product().mediumImageURLs().length; i++) {
                        widget.koImageContainer.push({
                            'type': "image",
                            "thumbImageContainer": widget.replaceThumbImage(widget.product().mediumImageURLs()[i]),
                            "mainImageContainer": widget.product().mediumImageURLs()[i],
                            'mediumImageContainer': widget.product().mediumImageURLs()[i],
                        });

                    }

                    if (widget.product().hasOwnProperty('x_videoURL')) {
                        if (widget.product().x_videoURL() !== null) {
                            if (widget.product().x_videoURL().indexOf(',') != -1) {
                                getYouTubePath = widget.product().x_videoURL().split(',');
                                for (var k = 0; k < getYouTubePath.length; k++) {
                                    widget.koImageContainer.push({
                                        'type': "video",
                                        "thumbImageContainer": "https://img.youtube.com/vi/" + getYouTubePath[k] + "/0.jpg",
                                        "mainImageContainer": "https://www.youtube.com/embed/" + getYouTubePath[k],
                                        "mediumImageContainer": "https://img.youtube.com/vi/" + getYouTubePath[k] + "/0.jpg"
                                    });

                                }
                            } else {

                                getYouTubePath = widget.product().x_videoURL();
                                widget.koImageContainer.push({
                                    'type': "video",
                                    "thumbImageContainer": "https://img.youtube.com/vi/" + getYouTubePath + "/0.jpg",
                                    "mainImageContainer": "https://www.youtube.com/embed/" + getYouTubePath,
                                    "mediumImageContainer": "https://img.youtube.com/vi/" + getYouTubePath + "/0.jpg"
                                });

                            }
                        }



                    }

                    widget.imgGroups(widget.groupImages(widget.koImageContainer()));
                }
            },
            /*loading video from carousel*/
            loadImageToMain: function(data, event, index) {

                var widget = this;
                var tempActiveIndex;
                if (data.type === 'video') {
                    console.log("its video");
                    $('#iframe').attr('src', data.mainImageContainer);
                    $('.video-holder').removeClass('hide');
                    $('.video-holder').addClass('show');
                    $('.cc-image-area').hide();
                    tempActiveIndex = index;

                } else {
                    console.log("its not video");
                    $('#iframe').attr('src', "");
                    $('.video-holder').removeClass('show');
                    $('.video-holder').addClass('hide');



                    for (var i = 0; i < widget.product().mediumImageURLs().length; i++) {
                        if (widget.product().mediumImageURLs()[i].indexOf(data.mediumImageContainer) != -1) {
                            tempActiveIndex = i;
                        }

                    }

                    $('.cc-image-area').show();

                    widget.activeImgIndex(tempActiveIndex);
                    var localImg = widget.product().mediumImageURLs()[tempActiveIndex];
                    widget.mainImgUrl(localImg);

                }

                return false;
            },

            //this method populates productVariantOption model to display the variant options of the product
            populateVariantOptions: function(widget) {
                var options = widget.productVariantOptions();
                if (options && options !== null && options.length > 0) {
                    var optionsArray = [],
                        productLevelOrder, productTypeLevelVariantOrder = {},
                        optionValues, productVariantOption, variants;
                    for (var typeIdx = 0, typeLen = widget.productTypes().length; typeIdx < typeLen; typeIdx++) {
                        if (widget.productTypes()[typeIdx].id == widget.product().type()) {
                            variants = widget.productTypes()[typeIdx].variants;
                            for (var variantIdx = 0, variantLen = variants.length; variantIdx < variantLen; variantIdx++) {
                                productTypeLevelVariantOrder[variants[variantIdx].id] = variants[variantIdx].values;
                            }
                        }
                    }
                    for (var i = 0; i < options.length; i++) {
                        productLevelOrder = undefined;
                        if (widget.product().variantValuesOrder[options[i].optionId]) {
                            productLevelOrder = widget.product().variantValuesOrder[options[i].optionId]();
                        }
                        optionValues = this.mapOptionsToArray(options[i].optionValueMap, productLevelOrder ? productLevelOrder : productTypeLevelVariantOrder[options[i].optionId]);
                        productVariantOption = this.productVariantModel(options[i].optionName, options[i].mapKeyPropertyAttribute, optionValues, widget, options[i].optionId);
                        optionsArray.push(productVariantOption);
                    }
                    widget.variantOptionsArray(optionsArray);
                } else {
                    widget.imgMetadata = widget.product().product.productImagesMetadata;
                    widget.variantOptionsArray([]);
                }
            },

            /*this create view model for variant options this contains
            name of the option, possible list of option values for the option
            selected option to store the option selected by the user.
            ID to map the selected option*/
            productVariantModel: function(optionDisplayName, optionId, optionValues, widget, actualOptionId) {
                var productVariantOption = {};
                var productImages = {};
                productVariantOption.optionDisplayName = optionDisplayName;
                productVariantOption.parent = this;
                productVariantOption.optionId = optionId;
                productVariantOption.originalOptionValues = ko.observableArray(optionValues);
                productVariantOption.actualOptionId = actualOptionId;

                var showOptionCation = ko.observable(true);
                if (optionValues.length === 1) {
                    showOptionCation(this.checkOptionValueWithSkus(optionId, optionValues[0].value));
                }
                //If there is just one option value in all Skus we dont need any caption
                if (showOptionCation()) {
                    productVariantOption.optionCaption = widget.translate('optionCaption', {
                        optionName: optionDisplayName
                    }, true);
                }
                productVariantOption.selectedOptionValue = ko.observable();
                productVariantOption.countVisibleOptions = ko.computed(function() {
                    var count = 0;
                    for (var i = 0; i < productVariantOption.originalOptionValues().length; i++) {
                        if (optionValues[i].visible() == true) {
                            count = count + 1;
                        }
                    }
                    return count;
                }, productVariantOption);
                productVariantOption.disable = ko.computed(function() {
                    if (productVariantOption.countVisibleOptions() == 0) {
                        return true;
                    } else {
                        return false;
                    }
                }, productVariantOption);
                productVariantOption.selectedOption = ko.computed({
                    write: function(option) {
                        this.parent.filtered(false);
                        productVariantOption.selectedOptionValue(option);
                        if (productVariantOption.actualOptionId === this.parent.listingVariant()) {
                            if (option && option.listingConfiguration) {
                                this.parent.imgMetadata = option.listingConfiguration.imgMetadata;
                                this.parent.assignImagesToProduct(option.listingConfiguration);
                            } else {
                                this.parent.imgMetadata = this.parent.product().product.productImagesMetadata;
                                this.parent.assignImagesToProduct(this.parent.product().product);
                            }
                        }
                        this.parent.filterOptionValues(productVariantOption.optionId);
                    },
                    read: function() {
                        return productVariantOption.selectedOptionValue();
                    },
                    owner: productVariantOption
                });
                productVariantOption.selectedOption.extend({
                    required: {
                        params: true,
                        message: widget.translate('optionRequiredMsg', {
                            optionName: optionDisplayName
                        }, true)
                    }
                });
                productVariantOption.optionValues = ko.computed({
                    write: function(value) {
                        productVariantOption.originalOptionValues(value);
                    },
                    read: function() {
                        return ko.utils.arrayFilter(
                            productVariantOption.originalOptionValues(),
                            function(item) {
                                return item.visible() == true;
                            }
                        );
                    },
                    owner: productVariantOption
                });


                //The below snippet finds the product display/listing variant (if available)        
                //looping through all the product types
                for (var productTypeIdx = 0; productTypeIdx < widget.productTypes().length; productTypeIdx++) {
                    //if the product type matched with the current product
                    if (widget.product().type() && widget.productTypes()[productTypeIdx].id == widget.product().type()) {
                        var variants = widget.productTypes()[productTypeIdx].variants;
                        //Below FOR loop is to iterate over the various variant types of that productType
                        for (var productTypeVariantIdx = 0; productTypeVariantIdx < variants.length; productTypeVariantIdx++) {
                            //if the productType has a listingVariant == true, hence this is the product display variant
                            if (variants[productTypeVariantIdx].listingVariant) {
                                widget.listingVariant(variants[productTypeVariantIdx].id);
                                break;
                            }
                        }
                        break;
                    }
                }
                productImages.thumbImageURLs = (widget.product().product.thumbImageURLs.length == 1 && widget.product().product.thumbImageURLs[0].indexOf("/img/no-image.jpg&") > 0) ? [] : (widget.product().product.thumbImageURLs);
                productImages.smallImageURLs = (widget.product().product.smallImageURLs.length == 1 && widget.product().product.smallImageURLs[0].indexOf("/img/no-image.jpg&") > 0) ? [] : (widget.product().product.smallImageURLs);
                productImages.mediumImageURLs = (widget.product().product.mediumImageURLs.length == 1 && widget.product().product.mediumImageURLs[0].indexOf("/img/no-image.jpg&") > 0) ? [] : (widget.product().product.mediumImageURLs);
                productImages.largeImageURLs = (widget.product().product.largeImageURLs.length == 1 && widget.product().product.largeImageURLs[0].indexOf("/img/no-image.jpg&") > 0) ? [] : (widget.product().product.largeImageURLs);
                productImages.fullImageURLs = (widget.product().product.fullImageURLs.length == 1 && widget.product().product.fullImageURLs[0].indexOf("/img/no-image.jpg&") > 0) ? [] : (widget.product().product.fullImageURLs);
                productImages.sourceImageURLs = (widget.product().product.sourceImageURLs.length == 1 && widget.product().product.sourceImageURLs[0].indexOf("/img/no-image.jpg") > 0) ? [] : (widget.product().product.sourceImageURLs);

                var prodImgMetadata = [];
                if (widget.product().thumbImageURLs && widget.product().thumbImageURLs().length > 0) {
                    for (var index = 0; index < widget.product().thumbImageURLs().length; index++) {
                        prodImgMetadata.push(widget.product().product.productImagesMetadata[index]);
                    }
                }

                ko.utils.arrayForEach(productVariantOption.originalOptionValues(), function(option) {
                    if (widget.listingVariant() === actualOptionId) {
                        for (var childSKUsIdx = 0; childSKUsIdx < widget.product().childSKUs().length; childSKUsIdx++) {
                            if (widget.product().childSKUs()[childSKUsIdx].productListingSku()) {
                                var listingConfiguration = widget.product().childSKUs()[childSKUsIdx];
                                if (listingConfiguration[actualOptionId]() == option.key) {
                                    var listingConfig = {};
                                    listingConfig.thumbImageURLs = $.merge($.merge([], listingConfiguration.thumbImageURLs()), productImages.thumbImageURLs);
                                    listingConfig.smallImageURLs = $.merge($.merge([], listingConfiguration.smallImageURLs()), productImages.smallImageURLs);
                                    listingConfig.mediumImageURLs = $.merge($.merge([], listingConfiguration.mediumImageURLs()), productImages.mediumImageURLs);
                                    listingConfig.largeImageURLs = $.merge($.merge([], listingConfiguration.largeImageURLs()), productImages.largeImageURLs);
                                    listingConfig.fullImageURLs = $.merge($.merge([], listingConfiguration.fullImageURLs()), productImages.fullImageURLs);
                                    listingConfig.sourceImageURLs = $.merge($.merge([], listingConfiguration.sourceImageURLs()), productImages.sourceImageURLs);
                                    listingConfig.primaryFullImageURL = listingConfiguration.primaryFullImageURL() ? listingConfiguration.primaryFullImageURL() : widget.product().product.primaryFullImageURL;
                                    listingConfig.primaryLargeImageURL = listingConfiguration.primaryLargeImageURL() ? listingConfiguration.primaryLargeImageURL() : widget.product().product.primaryLargeImageURL;
                                    listingConfig.primaryMediumImageURL = listingConfiguration.primaryMediumImageURL() ? listingConfiguration.primaryMediumImageURL() : widget.product().product.primaryMediumImageURL;
                                    listingConfig.primarySmallImageURL = listingConfiguration.primarySmallImageURL() ? listingConfiguration.primarySmallImageURL() : widget.product().product.primarySmallImageURL;
                                    listingConfig.primaryThumbImageURL = listingConfiguration.primaryThumbImageURL() ? listingConfiguration.primaryThumbImageURL() : widget.product().product.primaryThumbImageURL;

                                    //storing the metadata for the images
                                    var childSKUImgMetadata = [];
                                    if (listingConfiguration.images && listingConfiguration.images().length > 0) {
                                        for (var index = 0; index < listingConfiguration.images().length; index++) {
                                            childSKUImgMetadata.push(widget.product().product.childSKUs[childSKUsIdx].images[index].metadata);
                                        }
                                    }
                                    listingConfig.imgMetadata = $.merge($.merge([], childSKUImgMetadata), prodImgMetadata);
                                    option.listingConfiguration = listingConfig;
                                }
                            }
                        }
                    }
                    if (widget.variantName() === actualOptionId && option.key === widget.variantValue()) {
                        productVariantOption.selectedOption(option);
                    }
                });

                return productVariantOption;
            },

            //this method is triggered to check if the option value is present in all the child Skus.
            checkOptionValueWithSkus: function(optionId, value) {
                var childSkus = this.product().childSKUs();
                var childSkusLength = childSkus.length;
                for (var i = 0; i < childSkusLength; i++) {
                    if (!childSkus[i].dynamicPropertyMapLong[optionId] || childSkus[i].dynamicPropertyMapLong[optionId]() === undefined) {
                        return true;
                    }
                }
                return false;
            },

            //this method is triggered whenever there is a change to the selected option.
            filterOptionValues: function(selectedOptionId) {
                if (this.filtered()) {
                    return;
                }
                var variantOptions = this.variantOptionsArray();
                for (var i = 0; i < variantOptions.length; i++) {
                    var currentOption = variantOptions[i];
                    var matchingSkus = this.getMatchingSKUs(variantOptions[i].optionId);
                    var optionValues = this.updateOptionValuesFromSku(matchingSkus, selectedOptionId, currentOption);
                    variantOptions[i].optionValues(optionValues);
                    this.filtered(true);
                }
                this.updateSingleSelection(selectedOptionId);
            },

            // get all the matching SKUs
            getMatchingSKUs: function(optionId) {
                var childSkus = this.product().childSKUs();
                var matchingSkus = [];
                var variantOptions = this.variantOptionsArray();
                var selectedOptionMap = {};
                for (var j = 0; j < variantOptions.length; j++) {
                    if (variantOptions[j].optionId != optionId && variantOptions[j].selectedOption() != undefined) {
                        selectedOptionMap[variantOptions[j].optionId] = variantOptions[j].selectedOption().value;
                    }
                }
                for (var i = 0; i < childSkus.length; i++) {
                    var skuMatched = true;
                    for (var key in selectedOptionMap) {
                        if (selectedOptionMap.hasOwnProperty(key)) {
                            if (!childSkus[i].dynamicPropertyMapLong[key] ||
                                childSkus[i].dynamicPropertyMapLong[key]() != selectedOptionMap[key]) {
                                skuMatched = false;
                                break;
                            }
                        }
                    }
                    if (skuMatched) {
                        matchingSkus.push(childSkus[i]);
                    }
                }
                return matchingSkus;
            },

            //this method constructs option values for all the options other than selected option
            //from the matching skus.
            updateOptionValuesFromSku: function(skus, selectedOptionID, currentOption) {
                var optionId = currentOption.optionId;
                var options = [];
                var optionValues = currentOption.originalOptionValues();
                for (var k = 0; k < skus.length; k++) {
                    var optionValue = skus[k].dynamicPropertyMapLong[optionId];
                    if (optionValue != undefined) {
                        options.push(optionValue());
                    }
                }
                for (var j = 0; j < optionValues.length; j++) {
                    var value = optionValues[j].value;
                    var visible = false;
                    var index = options.indexOf(value);
                    if (index != -1) {
                        visible = true;
                    }
                    optionValues[j].visible(visible);
                }
                return optionValues;
            },

            //This method returns true if the option passed is the only one not selected
            //and all other options are either selected or disabled.
            validForSingleSelection: function(optionId) {
                var variantOptions = this.variantOptionsArray();
                for (var j = 0; j < variantOptions.length; j++) {
                    if (variantOptions[j].disable() || (variantOptions[j].optionId != optionId && variantOptions[j].selectedOption() != undefined)) {
                        return true;
                    }
                    if (variantOptions[j].optionId != optionId && variantOptions[j].selectedOption() == undefined && variantOptions[j].countVisibleOptions() == 1) {
                        return true;
                    }
                }
                return false;
            },

            //This method updates the selection value for the options wiht single option values.
            updateSingleSelection: function(selectedOptionID) {
                var variantOptions = this.variantOptionsArray();
                for (var i = 0; i < variantOptions.length; i++) {
                    var optionId = variantOptions[i].optionId;
                    if (variantOptions[i].countVisibleOptions() == 1 && variantOptions[i].selectedOption() == undefined && optionId != selectedOptionID) {
                        var isValidForSingleSelection = this.validForSingleSelection(optionId);
                        var optionValues = variantOptions[i].originalOptionValues();
                        for (var j = 0; j < optionValues.length; j++) {
                            if (optionValues[j].visible() == true) {
                                variantOptions[i].selectedOption(optionValues[j]);
                                break;
                            }
                        }
                    }
                }
            },

            //this method convert the map to array of key value object and sort them based on the enum value
            //to use it in the select binding of knockout
            mapOptionsToArray: function(variantOptions, order) {
                var optionArray = [];

                for (var idx = 0, len = order.length; idx < len; idx++) {
                    if (variantOptions.hasOwnProperty(order[idx])) {
                        optionArray.push({
                            key: order[idx],
                            value: variantOptions[order[idx]],
                            visible: ko.observable(true)
                        });
                    }
                }
                return optionArray;
            },

            //this method returns the selected sku in the product, Based on the options selected
            getSelectedSku: function(variantOptions) {
                var childSkus = [];
                if (this.product()) {
                    childSkus = this.product().product.childSKUs;
                }
                var selectedSKUObj = {};
                for (var i = 0; i < childSkus.length; i++) {
                    selectedSKUObj = childSkus[i];
                    for (var j = 0; j < variantOptions.length; j++) {
                        if (!variantOptions[j].disable() && childSkus[i].dynamicPropertyMapLong[variantOptions[j].optionId] != variantOptions[j].selectedOption().value) {
                            selectedSKUObj = null;
                            break;
                        }
                    }
                    if (selectedSKUObj !== null) {
                        $.Topic(pubsub.topicNames.SKU_SELECTED).publish(this.product(), selectedSKUObj, variantOptions);
                        return selectedSKUObj;
                    }
                }
                return null;
            },

            getSelectedSkuId: function(data) {
                var selectedSkuId = '';
                if (data.selectedSku && data.selectedSku() && '' !== data.selectedSku().x_recordId) {
                    selectedSkuId = data.selectedSku().x_recordId;
                }
                console.log('-----', selectedSkuId);
                return selectedSkuId;
            },
            //refreshes the prices based on the variant options selected
            refreshSkuPrice: function(selectedSKUObj) {
                if (selectedSKUObj === null) {
                    if (this.product().hasPriceRange) {
                        this.priceRange(true);
                    } else {
                        this.listPrice(this.product().listPrice());
                        this.salePrice(this.product().salePrice());
                        this.priceRange(false);
                    }
                } else {
                    this.priceRange(false);
                    var skuPriceData = this.product().getSkuPrice(selectedSKUObj);
                    this.listPrice(skuPriceData.listPrice);
                    this.salePrice(skuPriceData.salePrice);
                }
            },

            //refreshes the stockstatus based on the variant options selected
            refreshSkuStockStatus: function(selectedSKUObj) {
                var key;
                var orderable = true;
                var stockStatusMap = this.product().stockStatus();
                if (selectedSKUObj === null) {
                    key = 'stockStatus';
                } else {
                    key = selectedSKUObj.repositoryId;
                    if (stockStatusMap != undefined && stockStatusMap.productSkuInventoryStatus != undefined) {
                        orderable = stockStatusMap.productSkuInventoryStatus[key] > 0 ? true : false;
                    }
                }
                for (var i in stockStatusMap) {
                    if (i == key) {
                        if ((stockStatusMap[key] == 'IN_STOCK' ||
                                stockStatusMap[key] == 'PREORDERABLE' ||
                                stockStatusMap[key] == 'BACKORDERABLE') && orderable) {
                            this.stockStatus(true);
                            this.stockState(stockStatusMap[key]);
                            this.availabilityDate(this.getAvailabilityDate(key));
                            if (selectedSKUObj === null) {
                                this.stockAvailable(1);
                            } else {
                                this.stockAvailable(selectedSKUObj.quantity);
                            }
                        } else {
                            this.stockStatus(false);
                            this.stockAvailable(0);
                            this.stockState('OUT_OF_STOCK');
                        }

                    }
                }
                // FOR BOPIS, if a store is selected - stock status should reflect actual SKU status in that store.
                if (this.selectedStore() && null !== this.selectedStore()) {
                    if (this.selectedStore().availableQuantity > 0) {
                        this.stockStatus(true);
                    } else {
                        this.stockStatus(false);
                    }
                }
            },

            refreshSkuData: function(selectedSKUObj) {
                this.refreshSkuPrice(selectedSKUObj);
                this.refreshSkuStockStatus(selectedSKUObj);
            },

            // this method returns the availabilityDate if present for the selected variant of the product
            getAvailabilityDate: function(pSkuId) {
                var date = null;
                var skuInventoryList = this.product().stockStatus().productSkuInventoryDetails;
                for (var i in skuInventoryList) {
                    var skuInfo = skuInventoryList[i];
                    if (skuInfo["catRefId"] === pSkuId) {
                        date = skuInfo["availabilityDate"];
                        break;
                    }
                }
                return date;
            },

            // this method  returns a map of all the options selected by the user for the product
            getSelectedSkuOptions: function(variantOptions) {
                var selectedOptions = [],
                    listingVariantImage;
                for (var i = 0; i < variantOptions.length; i++) {
                    if (!variantOptions[i].disable()) {
                        selectedOptions.push({
                            'optionName': variantOptions[i].optionDisplayName,
                            'optionValue': variantOptions[i].selectedOption().key,
                            'optionId': variantOptions[i].actualOptionId,
                            'optionValueId': variantOptions[i].selectedOption().value
                        });
                    }
                }
                return selectedOptions;
            },

            // this function  assign  sku specific image for style based item
            assignSkuIMage: function(newProduct, selectedSKU) {
                var variants, listingVariantId, listingVariantValues = {};
                for (var typeIdx = 0, typeLen = this.productTypes().length; typeIdx < typeLen; typeIdx++) {
                    if (this.productTypes()[typeIdx].id == newProduct.type) {
                        variants = this.productTypes()[typeIdx].variants;
                        for (var variantIdx = 0; variantIdx < variants.length; variantIdx++) {
                            if (variants[variantIdx].listingVariant) {
                                listingVariantId = variants[variantIdx].id;
                                listingVariantValues = variants[variantIdx].values;
                                break;
                            }
                        }
                    }
                }
                if (newProduct.childSKUs) {
                    for (var childSKUsIdx = 0; childSKUsIdx < newProduct.childSKUs.length; childSKUsIdx++) {
                        if (newProduct.childSKUs[childSKUsIdx][listingVariantId] === selectedSKU[listingVariantId] &&
                            !selectedSKU.primaryThumbImageURL) {
                            selectedSKU.primaryThumbImageURL = newProduct.childSKUs[childSKUsIdx].primaryThumbImageURL;
                            break;
                        }

                    }
                }
            },

            allOptionsSelected: function() {
                var allOptionsSelected = true;
                if (this.variantOptionsArray().length > 0) {
                    var variantOptions = this.variantOptionsArray();
                    for (var i = 0; i < variantOptions.length; i++) {
                        if (!variantOptions[i].selectedOption.isValid() && !variantOptions[i].disable()) {
                            allOptionsSelected = false;
                            this.selectedSku(null);
                            break;
                        }
                    }

                    if (allOptionsSelected) {
                        // get the selected sku based on the options selected by the user
                        var selectedSKUObj = this.getSelectedSku(variantOptions);
                        if (selectedSKUObj === null) {
                            return false;
                        }
                        this.selectedSku(selectedSKUObj);
                        // check the status of 'onlineOnly' flag for product / sku.
                        // If selectedSku has 'onlineOnly' flag set, take it. 
                        // If not take product level flag.
                        if (this.product().onlineOnly && ko.isObservable(this.product().onlineOnly)) {
                            this.isOnlineOnly(this.product().onlineOnly());
                        }
                        //check if 'onlineOnly' flag is set at SKU level.
                        if (this.product().childSKUs && null !== this.product().childSKUs() &&
                            this.product().childSKUs().length > 0) {

                            for (var index = 0; index < this.product().childSKUs().length; index++) {
                                if (this.product().childSKUs()[index].repositoryId &&
                                    ko.isObservable(this.product().childSKUs()[index].repositoryId) &&
                                    this.product().childSKUs()[index].repositoryId() === selectedSKUObj.repositoryId &&
                                    this.product().childSKUs()[index].onlineOnly &&
                                    ko.isObservable(this.product().childSKUs()[index].onlineOnly) &&
                                    this.product().childSKUs()[index].onlineOnly()) {
                                    this.isOnlineOnly(this.product().childSKUs()[index].onlineOnly);
                                }
                            }
                        }

                    }
                    this.refreshSkuData(this.selectedSku());
                }

                return allOptionsSelected;
            },

            quantityIsValid: function() {
                return this.itemQuantity() > 0 && this.itemQuantity() <= this.stockAvailable();
            },

            // this method validated if all the options of the product are selected
            validateAddToCart: function() {
               // widget.showMultipleVariants(false);
                //widget.showSingleVariants(true);
                var AddToCartButtonFlag = this.allOptionsSelected() && this.stockStatus() && this.quantityIsValid() && (this.listPrice() != null);
                // Requirement for configurable items. Do not allow item to be added to cart.
                if ((this.variantOptionsArray().length > 0) && this.selectedSku()) {
                    AddToCartButtonFlag = AddToCartButtonFlag &&
                        !this.selectedSku().configurable;
                } else {
                    // Check if the product is configurable. Since the product has only
                    // one sku,
                    // it should have the SKU as configurable.
                    AddToCartButtonFlag = AddToCartButtonFlag &&
                        !this.product().isConfigurable();
                }
                if(this.showSingleVariants()){
                    AddToCartButtonFlag = this.selectedSkuIdvalue() === '' ? false : true;
                }
                if(this.showMultipleVariants()){
                    AddToCartButtonFlag = ( this.multiSelectedSkuValue() !== '' && this.multiSelectSizeValue() !== '' )?  true : false;
                }
                if (!AddToCartButtonFlag) {
                    $('#cc-prodDetailsAddToCart').attr("aria-disabled", "true");
                }
                return AddToCartButtonFlag;

            },

            handleChangeQuantity: function(data, event) {
                var quantity = this.itemQuantity();

                if (quantity < 1) {
                    console.log('<= 0');
                } else if (quantity > this.stockAvailable()) {
                    console.log('> orderable quantity');
                }

                return true;
            },

            // Sends a message to the cart to add this product
            handleAddToCart: function() {
                notifier.clearError(this.WIDGET_ID);
                var variantOptions = this.variantOptionsArray();
                notifier.clearSuccess(this.WIDGET_ID);
                //get the selected options, if all the options are selected.
                var selectedOptions = this.getSelectedSkuOptions(variantOptions);

                var selectedOptionsObj = {
                    'selectedOptions': selectedOptions
                };

                //adding availabilityDate for product object to show in the edit summary 
                //dropdown for backorder and preorder
                var availabilityDateObj = {
                    'availabilityDate': this.availabilityDate()
                };
                var stockStateObj = {
                    'stockState': this.stockState()
                };

                console.log("this.product().............", this.product());

                var newProduct = $.extend(true, {}, this.product().product, selectedOptionsObj,
                    availabilityDateObj, stockStateObj);

                if (this.selectedSku() && !this.selectedSku().primaryThumbImageURL) {
                    this.assignSkuIMage(newProduct, this.selectedSku());
                }
                if (this.variantOptionsArray().length > 0) {
                    //assign only the selected sku as child skus
                    newProduct.childSKUs = [this.selectedSku()];
                }



                newProduct.orderQuantity = parseInt(this.itemQuantity(), 10);

                //add location information of inventory
                newProduct.selectedStore = ko.observable(this.selectedStore());
                newProduct.externalPriceQuantity = -1;
                newProduct.externalPrice = this.product().cartPrice;
                /*newProduct.external_list_price =this.product().x_productExternalListPrice;
                newProduct.external_sale_price=this.product().x_productExternalSalePrice;*/

                console.log(this.product().x_productExternalSalePrice, ".....this.product().x_productExternalSalePrice...........");
                console.log(this.product().x_productExternalListPrice, ".....this.product().x_productExternalSalePrice...........");



                // If the sum of item quantity available in cart and the item quantity being added, is greater than the available stock,
                // show a notifier error and stop the add to cart.
                var itemQuantityInCart = this.itemQuantityInCart(newProduct);
                var stockAvailable = newProduct.orderLimit && newProduct.orderLimit < this.stockAvailable() ? newProduct.orderLimit : this.stockAvailable();
                if ((itemQuantityInCart + parseInt(this.itemQuantity(), 10)) > stockAvailable) {
                    var notificationMsg = CCi18n.t('ns.productdetails:resources.totalItemQuantityExceeded', {
                        stockAvailable: stockAvailable,
                        itemQuantityInCart: itemQuantityInCart
                    });
                    notifier.sendError(this.WIDGET_ID, notificationMsg, true);
                    return;
                }

                $.Topic(pubsub.topicNames.CART_ADD).publishWith(
                    newProduct, [{
                        message: "success"
                    }]);

                $.Topic("UPDATE_PRICE.memory").publish(this.product());

                // To disable Add to cart button for three seconds when it is clicked and enabling again
                this.isAddToCartClicked(true);
                var self = this;
                setTimeout(enableAddToCartButton, 3000);

                function enableAddToCartButton() {
                    self.isAddToCartClicked(false);
                };

                if (self.isInDialog()) {
                    $(".modal").modal("hide");
                }
            },

            /**
             * Retrieve list of spaces for a user
             */

            customHandleAddToCart: function() {
                var widget = this;
                var newProduct = {};
                var selectedObj = ''
                var getSelectSku = '';
                
                 widget.isPDPAddtoCart(true);
                getSelectSku = widget.product();
                if(widget.product().childSKUs().length>2){
                    for (var j = 0; j < widget.product().childSKUs().length > 0; j++) {
                        if (widget.selectedSkuIdvalue() == widget.product().childSKUs()[j].repositoryId()) {
                            selectedObj = getSelectSku.childSKUs()[j];
                            break;
                        }
                    }
                } else if(widget.product().childSKUs().length==1){
                    selectedObj = getSelectSku.childSKUs()[0];
                }
                
                
               
              
                newProduct = $.extend(true, {}, this.product().product, true);
                newProduct['catRefId'] = widget.product().id();
                newProduct['orderQuantity'] = parseInt(this.itemQuantity(), 10);
                newProduct['externalPriceQuantity'] = -1;
                newProduct['externalPrice'] = this.product().cartPrice;
                newProduct.childSKUs = [selectedObj];
                widget.cart().addItem(ko.toJS(newProduct));
                 
                $("html, body").animate({scrollTop: 0}, "slow");
                   

            },

            getSpaces: function(callback) {
                var widget = this;
                var successCB = function(result) {
                    var mySpaceOptions = [];
                    var joinedSpaceOptions = [];
                    if (result.response.code.indexOf("200") === 0) {

                        //spaces
                        var spaces = result.items;
                        spaces.forEach(function(space, index) {
                            var spaceOption = {
                                spaceid: space.spaceId,
                                spaceNameFull: ko.observable(space.spaceName),
                                spaceNameFormatted: ko.computed(function() {
                                    return space.spaceName + " (" + space.creatorFirstName + " " + space.creatorLastName + ")";
                                }, widget),
                                creatorid: space.creatorId,
                                accessLevel: space.accessLevel,
                                spaceOwnerFirstName: space.creatorFirstName,
                                spaceOwnerLastName: space.creatorLastName
                            };

                            // if user created the space, add it to My Spaces, otherwise add it to Joined Spaces
                            if (space.creatorId == swmRestClient.apiuserid) {
                                mySpaceOptions.push(spaceOption);
                            } else {
                                joinedSpaceOptions.push(spaceOption);
                            }
                        });

                        // sort each group alphabetically
                        mySpaceOptions.sort(mySpacesComparator);
                        joinedSpaceOptions.sort(joinedSpacesComparator);

                        widget.spaceOptionsGrpMySpacesArr(mySpaceOptions);
                        widget.spaceOptionsGrpJoinedSpacesArr(joinedSpaceOptions);

                        var groups = [];
                        var mySpacesGroup = {
                            label: widget.translate('mySpacesGroupText'),
                            children: ko.observableArray(widget.spaceOptionsGrpMySpacesArr())
                        };
                        var joinedSpacesGroup = {
                            label: widget.translate('joinedSpacesGroupText'),
                            children: ko.observableArray(widget.spaceOptionsGrpJoinedSpacesArr())
                        };

                        var createOptions = [];
                        var createNewOption = {
                            spaceid: "createnewspace",
                            spaceNameFull: ko.observable(widget.translate('createNewSpaceOptText'))
                        };
                        createOptions.push(createNewOption);
                        var createNewSpaceGroup = {
                            label: "",
                            children: ko.observableArray(createOptions)
                        };

                        groups.push(mySpacesGroup);
                        groups.push(joinedSpacesGroup);
                        groups.push(createNewSpaceGroup);
                        widget.spaceOptionsArray(groups);
                        widget.mySpaces(mySpaceOptions);

                        if (callback) {
                            callback();
                        }
                    }
                };
                var errorCB = function(resultStr, status, errorThrown) {};

                swmRestClient.request('GET', '/swm/rs/v1/sites/{siteid}/spaces', '', successCB, errorCB, {});
            },

            // SC-4166 : ajax success/error callbacks from beforeAppear does not get called in IE9, ensure dropdown options are populated when opening dropdown
            openAddToWishlistDropdownSelector: function() {
                var widget = this;
                if (widget.spaceOptionsArray().length === 0) {
                    widget.getSpaces();
                }
            },
            // this method validates if all the options of the product are selected before allowing
            // add to space. Unlike validateAddToCart, however, it does not take into account inventory.
            validateAddToSpace: function() {
                var allOptionsSelected = true;
                if (this.variantOptionsArray().length > 0) {
                    var variantOptions = this.variantOptionsArray();
                    for (var i = 0; i < variantOptions.length; i++) {
                        if (!variantOptions[i].selectedOption.isValid() && !variantOptions[i].disable()) {
                            allOptionsSelected = false;
                            break;
                        }
                    }
                    if (allOptionsSelected) {
                        // get the selected sku based on the options selected by the user
                        var selectedSKUObj = this.getSelectedSku(variantOptions);

                        if (selectedSKUObj == null) {
                            return false;
                        }
                        var skuPriceData = this.product().getSkuPrice(selectedSKUObj);
                        if (skuPriceData.listPrice === null) {
                            return false;
                        }
                    }
                } else { //if no variants are there check product listPrice is not null
                    if (this.listPrice() == null) {
                        return false;
                    }
                }

                // Requirement for configurable items. Do not allow item to be added to WL.
                if ((this.variantOptionsArray().length > 0) && this.selectedSku()) {
                    allOptionsSelected = allOptionsSelected &&
                        !this.selectedSku().configurable;
                } else {
                    // Check if the product is configurable. Since the product has only
                    // one sku,
                    // it should have the SKU as configurable.
                    allOptionsSelected = allOptionsSelected &&
                        this.product() && !this.product().isConfigurable();
                }

                // get quantity input value
                var quantityInput = this.itemQuantity();
                if (quantityInput.toString() != "") {
                    if (!quantityInput.toString().match(/^\d+$/) || Number(quantityInput) < 0) {
                        return false;
                    }
                }

                var addToSpaceButtonFlag = allOptionsSelected && this.product().childSKUs().length > 0;
                if (!addToSpaceButtonFlag) {
                    $('#cc-prodDetailsAddToSpace').attr("aria-disabled", "true");
                }

                return addToSpaceButtonFlag;
            },

            //check whether all the variant options are selected and if so, populate selectedSku with the correct sku of the product.
            //this is generic method, can be reused in validateAddToSpace and validateAddToCart in future
            validateAndSetSelectedSku: function(refreshRequired) {
                var allOptionsSelected = true;
                if (this.variantOptionsArray().length > 0) {
                    var variantOptions = this.variantOptionsArray();
                    for (var i = 0; i < variantOptions.length; i++) {
                        if (!variantOptions[i].selectedOption.isValid() && !variantOptions[i].disable()) {
                            allOptionsSelected = false;
                            this.selectedSku(null);
                            break;
                        }
                    }
                    if (allOptionsSelected) {
                        // get the selected sku based on the options selected by the user
                        var selectedSKUObj = this.getSelectedSku(variantOptions);
                        if (selectedSKUObj === null) {
                            return false;
                        }
                        this.selectedSku(selectedSKUObj);
                    }
                    if (refreshRequired) {
                        this.refreshSkuData(this.selectedSku());
                    }
                }
                return allOptionsSelected;
            },

            // displays Add to Space modal
            addToSpaceClick: function(widget) {
                var variantOptions = this.variantOptionsArray();
                notifier.clearSuccess(this.WIDGET_ID);

                //get the selected options, if all the options are selected.
                var selectedOptions = this.getSelectedSkuOptions(variantOptions);
                var selectedOptionsObj = {
                    'selectedOptions': selectedOptions
                };
                var newProduct = $.extend(true, {}, this.product().product, selectedOptionsObj);
                newProduct.desiredQuantity = this.itemQuantity();

                if (this.variantOptionsArray().length > 0) {
                    //assign only the selected sku as child skus
                    newProduct.childSKUs = [this.selectedSku()];
                }
                newProduct.productPrice = (newProduct.salePrice != null) ? newProduct.salePrice : newProduct.listPrice;
                $.Topic(pubsub.topicNames.SOCIAL_SPACE_ADD).publishWith(newProduct, [{
                    message: "success"
                }]);
            },

            // displays Add to Space modal, triggered from selector button
            addToSpaceSelectorClick: function(widget) {
                var variantOptions = this.variantOptionsArray();
                notifier.clearSuccess(this.WIDGET_ID);

                //get the selected options, if all the options are selected.
                var selectedOptions = this.getSelectedSkuOptions(variantOptions);
                var selectedOptionsObj = {
                    'selectedOptions': selectedOptions
                };
                var newProduct = $.extend(true, {}, this.product().product, selectedOptionsObj);
                newProduct.desiredQuantity = this.itemQuantity();

                if (this.variantOptionsArray().length > 0) {
                    //assign only the selected sku as child skus
                    newProduct.childSKUs = [this.selectedSku()];
                }
                newProduct.productPrice = (newProduct.salePrice != null) ? newProduct.salePrice : newProduct.listPrice;
                $.Topic(pubsub.topicNames.SOCIAL_SPACE_SELECTOR_ADD).publishWith(newProduct, [{
                    message: "success"
                }]);
            },

            // automatically add product to selected space
            addToSpaceSelect: function(widget, spaceId) {
                var variantOptions = this.variantOptionsArray();
                notifier.clearSuccess(this.WIDGET_ID);

                //get the selected options, if all the options are selected.
                var selectedOptions = this.getSelectedSkuOptions(variantOptions);
                var selectedOptionsObj = {
                    'selectedOptions': selectedOptions
                };
                var newProduct = $.extend(true, {}, this.product().product, selectedOptionsObj);
                newProduct.desiredQuantity = this.itemQuantity();

                if (this.variantOptionsArray().length > 0) {
                    //assign only the selected sku as child skus
                    newProduct.childSKUs = [this.selectedSku()];
                }
                newProduct.productPrice = (newProduct.salePrice != null) ? newProduct.salePrice : newProduct.listPrice;
                $.Topic(pubsub.topicNames.SOCIAL_SPACE_ADD_TO_SELECTED_SPACE).publishWith(newProduct, [spaceId]);
            },

            /**
             * Fetch Facebook app id
             */
            fetchFacebookAppId: function() {
                var widget = this;
                var serverType = CCConstants.EXTERNALDATA_PRODUCTION_FACEBOOK;
                if (widget.isPreview()) {
                    serverType = CCConstants.EXTERNALDATA_PREVIEW_FACEBOOK;
                }
                ccRestClient.request(CCConstants.ENDPOINT_MERCHANT_GET_EXTERNALDATA,
                    null, widget.fetchFacebookAppIdSuccessHandler.bind(widget),
                    widget.fetchFacebookAppIdErrorHandler.bind(widget),
                    serverType);
            },

            /**
             * Fetch Facebook app id successHandler, update local and global scope data
             */
            fetchFacebookAppIdSuccessHandler: function(pResult) {
                var widget = this;
                widget.siteFbAppId(pResult.serviceData.applicationId);

                //if (widget.siteFbAppId()) {
                //  facebookSDK.init(widget.siteFbAppId());
                //}
            },

            /**
             * Fetch Facebook app id error handler
             */
            fetchFacebookAppIdErrorHandler: function(pResult) {
                logger.debug("Failed to get Facebook appId.", result);
            },

            // Share product to FB
            shareProductFbClick: function() {
                var widget = this;

                // open fb share dialog
                var protocol = window.location.protocol;
                var host = window.location.host;
                var siteBaseUrl = "";
                if (window.siteBaseURLPath && window.siteBaseURLPath !== "/") {
                    siteBaseUrl = window.siteBaseURLPath;
                }
                var productUrlEncoded = encodeURIComponent(protocol + "//" + host + siteBaseUrl + widget.product().route());

                var appID = widget.siteFbAppId();
                // NOTE: Once we can support the Facebook Crawler OG meta-tags, then we should try and use the newer Facebook Share Dialog URL
                //       (per https://developers.facebook.com/docs/sharing/reference/share-dialog).  Until then, we will use a legacy
                //       share URL.  Facebook may eventually not support this older URL, so would be good to replace it as soon as possible.
                //var fbShareUrl = "https://www.facebook.com/dialog/share?app_id=" + appID + "&display=popup&href=" + spaceUrlEncoded + "&redirect_uri=https://www.facebook.com";
                var fbShareUrl = "https://www.facebook.com/sharer/sharer.php?app_id=" + appID + "&u=" + productUrlEncoded;
                var facebookWin = window.open(fbShareUrl, 'facebookWin', 'width=720, height=500');
                if (facebookWin) {
                    facebookWin.focus();
                }
            },

            // Share product to Twitter
            shareProductTwitterClick: function() {
                var widget = this;
                var productNameEncoded = encodeURIComponent(widget.product().displayName());
                var protocol = window.location.protocol;
                var host = window.location.host;
                var siteBaseUrl = "";
                if (window.siteBaseURLPath && window.siteBaseURLPath !== "/") {
                    siteBaseUrl = window.siteBaseURLPath;
                }
                var productUrlEncoded = encodeURIComponent(protocol + "//" + host + siteBaseUrl + widget.product().route());
                var twitterWin = window.open('https://twitter.com/share?url=' + productUrlEncoded + '&text=' + productNameEncoded, 'twitterWindow', 'width=720, height=500');
                if (twitterWin) {
                    twitterWin.focus();
                }
            },

            // Share product to Pinterest
            shareProductPinterestClick: function() {
                var widget = this;
                var productNameEncoded = encodeURIComponent(widget.product().displayName());
                var protocol = window.location.protocol;
                var host = window.location.host;
                var siteBaseUrl = "";
                if (window.siteBaseURLPath && window.siteBaseURLPath !== "/") {
                    siteBaseUrl = window.siteBaseURLPath;
                }
                var productUrlEncoded = encodeURIComponent(protocol + "//" + host + siteBaseUrl + widget.product().route());
                var productMediaEncoded = encodeURIComponent(protocol + "//" + host + siteBaseUrl + widget.product().primaryLargeImageURL());
                var pinterestWin = window.open('https://pinterest.com/pin/create/button/?url=' + productUrlEncoded + '&description=' + productNameEncoded + '&media=' + productMediaEncoded, 'pinterestWindow', 'width=720, height=500');
                if (pinterestWin) {
                    pinterestWin.focus();
                }
            },

            // Share product by Email
            shareProductEmailClick: function() {
                var widget = this;
                var mailto = [];
                var protocol = window.location.protocol;
                var host = window.location.host;
                var siteBaseUrl = "";
                if (window.siteBaseURLPath && window.siteBaseURLPath !== "/") {
                    siteBaseUrl = window.siteBaseURLPath;
                }
                var productUrl = protocol + "//" + host + siteBaseUrl + widget.product().route();
                mailto.push("mailto:?");
                mailto.push("subject=");
                mailto.push(encodeURIComponent(widget.translate('shareProductEmailSubject', {
                    'productName': widget.product().displayName()
                })));
                mailto.push("&body=");
                var body = [];
                body.push(widget.translate('shareProductEmailBodyIntro', {
                    'productName': widget.product().displayName()
                }));
                body.push("\n\n");
                body.push(productUrl);
                mailto.push(encodeURIComponent(body.join("")));
                window.location.href = mailto.join("");
            },



            handleLoadEvents: function(eventName) {
                if (eventName.toUpperCase() === LOADING_EVENT) {
                    spinner.create(productLoadingOptions);
                    $('#cc-product-spinner').css('z-index', 1);
                } else if (eventName.toUpperCase() === LOADED_EVENT) {
                    this.removeSpinner();
                }
            },
            // Loads the Magnifier and/or Viewer, when required
            loadImage: function() {
                if (resourcesAreLoaded) {
                    var contents = $('#cc-image-viewer').html();
                    if (!contents) {
                        if (this.viewportWidth() > CCConstants.VIEWPORT_TABLET_UPPER_WIDTH) {
                            this.loadMagnifier();
                        } else if (this.viewportWidth() >= CCConstants.VIEWPORT_TABLET_LOWER_WIDTH) {
                            this.loadZoom();
                        } else {
                            //Load zoom on carousel
                            this.loadCarouselZoom();
                        }
                    } else {
                        this.loadViewer(this.handleLoadEvents.bind(this));
                    }
                } else if (resourcesNotLoadedCount++ < resourcesMaxAttempts) {
                    setTimeout(this.loadImage, 500);
                }
            },

            groupImages: function(imageSrc) {
                var self = this;
                var images = [];
                if (imageSrc) {
                    for (var i = 0; i < imageSrc.length; i++) {
                        if (i % 4 == 0) {
                            images.push(ko.observableArray([imageSrc[i]]));
                        } else {
                            images[images.length - 1]().push(imageSrc[i]);
                        }
                    }
                }
                return images;
            },

            handleCarouselArrows: function(data, event) {
                // Handle left key
                if (event.keyCode == 37) {
                    $('#prodDetails-imgCarousel').carousel('prev');
                }
                // Handle right key
                if (event.keyCode == 39) {
                    $('#prodDetails-imgCarousel').carousel('next');
                }
            },

            handleCycleImages: function(data, event, index, parentIndex) {
                var absoluteIndex = index + parentIndex * 4;
                // Handle left key
                if (event.keyCode == 37) {
                    if (absoluteIndex == 0) {
                        $('#prodDetails-imgCarousel').carousel('prev');
                        $('#carouselLink' + (this.product().thumbImageURLs.length - 1)).focus();
                    } else if (index == 0) {
                        // Go to prev slide
                        $('#prodDetails-imgCarousel').carousel('prev');
                        $('#carouselLink' + (absoluteIndex - 1)).focus();
                    } else {
                        $('#carouselLink' + (absoluteIndex - 1)).focus();
                    }
                }
                // Handle right key
                if (event.keyCode == 39) {
                    if (index == 3) {
                        $('#prodDetails-imgCarousel').carousel('next');
                        $('#carouselLink' + (absoluteIndex + 1)).focus();
                    } else if (absoluteIndex == (this.product().thumbImageURLs.length - 1)) {
                        // Extra check when the item is the last item of the carousel
                        $('#prodDetails-imgCarousel').carousel('next');
                        $('#carouselLink0').focus();
                    } else {
                        $('#carouselLink' + (absoluteIndex + 1)).focus();
                    }
                }
            },



            assignImagesToProduct: function(pInput) {
                if (this.firstTimeRender == true) {
                    this.product().primaryFullImageURL(pInput.primaryFullImageURL);
                    this.product().primaryLargeImageURL(pInput.primaryLargeImageURL);
                    this.product().primaryMediumImageURL(pInput.primaryMediumImageURL);
                    this.product().primarySmallImageURL(pInput.primarySmallImageURL);
                    this.product().primaryThumbImageURL(pInput.primaryThumbImageURL);
                    this.firstTimeRender = false;
                }

                this.product().thumbImageURLs(pInput.thumbImageURLs);
                this.product().smallImageURLs(pInput.smallImageURLs);
                this.product().mediumImageURLs(pInput.mediumImageURLs);
                this.product().largeImageURLs(pInput.largeImageURLs);
                this.product().fullImageURLs([]);
                this.product().fullImageURLs(pInput.fullImageURLs);
                this.product().sourceImageURLs(pInput.sourceImageURLs);

                this.mainImgUrl(pInput.primaryFullImageURL);
                //this.imgGroups(this.groupImages(pInput.thumbImageURLs));
                this.activeImgIndex(0);
                this.activeImgIndex.valueHasMutated();


                //Thumbnail Image Incorrect display Fix 
                var tempArraymedium = [];
                var tempArrayFull = [];
                var tempArrayLarge = [];
                for (var i = 0; i < this.product().mediumImageURLs().length; i++) {
                    if (tempArraymedium.indexOf(this.product().mediumImageURLs()[i]) == -1) {
                        tempArraymedium.push(this.product().mediumImageURLs()[i])

                    }
                }
                this.product().mediumImageURLs(tempArraymedium);

                for (var j = 0; j < this.product().fullImageURLs().length; j++) {
                    if (tempArrayFull.indexOf(this.product().fullImageURLs()[j]) == -1) {
                        tempArrayFull.push(this.product().fullImageURLs()[j]);
                    }
                }
                this.product().fullImageURLs(tempArrayFull);

                for (var k = 0; k < this.product().largeImageURLs().length; k++) {
                    if (tempArrayLarge.indexOf(this.product().largeImageURLs()[k]) == -1) {
                        tempArrayLarge.push(this.product().largeImageURLs()[k]);
                    }
                }
                this.product().largeImageURLs(tempArrayLarge);

                this.imgGroupRendering();
                //Ends
            },

            checkResponsiveFeatures: function(viewportWidth) {
                if (viewportWidth > 978) {
                    this.isMobile(false);
                } else if (viewportWidth <= 978) {
                    this.isMobile(true);
                }
            },
            priceUnavailableText: function() {
                return CCi18n.t('ns.medAesProductDetails:resources.priceUnavailable');
            },
            isInDialog: function() {
                return $("#CC-prodDetails-addToCart").closest(".modal").length;
            },


            /**
             *
             */
            getSelectedProducts: function() {
                if (!this.validateAddToPurchaseList()) {
                    notifier.sendError(this.WIDGET_ID, this.translate('productAddError'));
                } else {
                    var variantOptions = this.variantOptionsArray();
                    var selectedOptions = this.getSelectedSkuOptions(variantOptions);
                    var selectedOptionsObj = {
                        'selectedOptions': selectedOptions
                    };
                    var selectedProduct = $.extend(true, {}, this.product().product, selectedOptionsObj);
                    selectedProduct.desiredQuantity = parseInt(this.itemQuantity(), 10);
                    if (this.variantOptionsArray().length > 0) {
                        //assign only the selected sku as child skus
                        selectedProduct.childSKUs = [this.selectedSku()];
                    }
                    var productItem = {
                        "productId": selectedProduct.id,
                        "catRefId": selectedProduct.childSKUs[0].repositoryId,
                        "quantityDesired": selectedProduct.desiredQuantity,
                        "displayName": selectedProduct.displayName
                    };
                    var productItemArray = [];
                    productItemArray.push(productItem);
                    return productItemArray;
                }
            },


            // this method validates if all the options of the product are selected before allowing
            // add to purchase list.
            validateAddToPurchaseList: function() {
                //var self = this;
                var allOptionsSelected = true;
                if (this.variantOptionsArray().length > 0) {
                    var variantOptions = this.variantOptionsArray();
                    for (var i = 0; i < variantOptions.length; i++) {
                        if (!variantOptions[i].selectedOption.isValid() && !variantOptions[i].disable()) {
                            allOptionsSelected = false;
                            break;
                        }
                    }
                    if (allOptionsSelected) {
                        // get the selected sku based on the options selected by the user
                        var selectedSKUObj = this.getSelectedSku(variantOptions);

                        //var skuPriceData = this.product().getSkuPrice(selectedSKUObj);
                        if (selectedSKUObj === null) {
                            return false;
                        }
                    }
                }
                /*else { //if no variants are there check product listPrice is not null
                         if (this.listPrice() == null) {
                           return false;
                         }
                       }*/

                // Requirement for configurable items. Do not allow item to be added to WL.
                if ((this.variantOptionsArray().length > 0) && this.selectedSku()) {
                    allOptionsSelected = allOptionsSelected &&
                        !this.selectedSku().configurable;
                } else {
                    // Check if the product is configurable. Since the product has only
                    // one sku,
                    // it should have the SKU as configurable.
                    allOptionsSelected = allOptionsSelected &&
                        !this.product().isConfigurable();
                }

                // get quantity input value
                var quantityInput = this.itemQuantity();
                if (quantityInput.toString() != "") {
                    if (!quantityInput.toString().match(/^\d+$/) || Number(quantityInput) < 0) {
                        return false;
                    }
                }

                var addToPurchaseListFlag = allOptionsSelected && this.product().childSKUs().length > 0;

                return addToPurchaseListFlag;
            },

            /**
             * Handles store selection for BOPIS usecase.
             */
            displayStoreSelector: function() {

                var self = this;
                self.storeLookupStatus(0);
                var skuId = null;
                self.stores.removeAll();
                if (self.selectedSku && self.selectedSku() && '' !== self.selectedSku().repositoryId) {
                    skuId = self.selectedSku().repositoryId;
                }
                var inventory = new Inventory();
                var successCallBack = function(storeInfos) {
                    // clear previous search results, if any
                    self.stores.removeAll();
                    if (null !== storeInfos && storeInfos.length > 0) {
                        for (var index = 0; index < storeInfos.length; index++) {
                            self.stores.push(storeInfos[index]);
                        }
                    }
                }
                var errorCallBack = function(errorInfo) {
                    self.storeLookupStatus(errorInfo.storeLookupStatus);
                }
                inventory.getLocationInventoryForUserQuery({
                    searchText: self.storeSearchText(),
                    // If number of stores to display is not configured, defaulting it to 10.
                    noOfStoresToDisplay: (self.noOfStoresToDisplay && ko.isObservable(self.noOfStoresToDisplay)) ? self.noOfStoresToDisplay() : 10,
                    siteId: self.site().siteInfo.id,
                    catalogId: self.user().catalogId(),
                    locationType: 'store',
                    pickUp: true,
                    comparator: 'CO',
                    searchableFields: ['city', 'postalCode', 'name'],
                    productSkuIds: self.product().id() + ':' + skuId
                }, successCallBack.bind(self), errorCallBack.bind(self));
                $('#storePickUpModal').on('shown.bs.modal', function() {
                    // get the locator for an input in your modal.
                    $('#CC-storeSelect').focus();
                });
            },

            /**
             * Method to save shopper's selected store. We would save SKU's global inventory details.
             * They will be restored if shopper chose 'Ship Instead' option.
             * @param selectedStore
             */
            handleStoreSelection: function(selectedStore) {

                var self = this;
                self.selectedStore(selectedStore);
                self.stockState(selectedStore.availabilityStatusMsg);
                if (selectedStore && selectedStore.inventoryDetails && selectedStore.inventoryDetails.length > 0) {
                    for (var index = 0; index < selectedStore.inventoryDetails.length; index++) {
                        var inventoryObj = selectedStore.inventoryDetails[index];
                        if (inventoryObj.locationId === selectedStore.store.locationId) {
                            self.availabilityDate(inventoryObj.availabilityDate);
                        }
                    }
                }
                if (null !== self.product().stockStatus()) {
                    self.product().stockStatus()[self.selectedSku().repositoryId] = selectedStore.availabilityStatusMsg;
                    if (self.product().stockStatus().productSkuInventoryStatus) {
                        self.product().stockStatus().productSkuInventoryStatus[self.selectedSku().repositoryId] = selectedStore.availableQuantity;
                    }
                }
                self.selectedSku().quantity = selectedStore.availableQuantity;
                // set available quantity to self.stockAvailable
                if (selectedStore && selectedStore.inventoryDetails && selectedStore.inventoryDetails.length > 0) {
                    for (var inventoryIndex = 0; inventoryIndex < selectedStore.inventoryDetails.length; inventoryIndex++) {
                        if (selectedStore.locationId === selectedStore.inventoryDetails[inventoryIndex].locationId) {
                            self.setStockAvailability(selectedStore.availabilityStatusMsg, selectedStore.inventoryDetails[inventoryIndex].orderableQuantity);
                        }
                    }
                }
                // For configurable items, we store shopper selected locationId.
                // This would be later used to validate stock status when we add item to cart.
                if (self.product() && self.product().configurable()) {
                    var key = '';
                    if (self.selectedSku && ko.isObservable(self.selectedSku)) {
                        key = key + self.selectedSku().repositoryId;
                    }
                    var cpqConfig = {};
                    cpqConfig.selectedStore = selectedStore;
                    self.cart().cpqConfigMap.set(key, cpqConfig);
                }
                // update the stock status with the status of SKU at selected store.
                if (selectedStore.availabilityStatusMsg !== 'OUT_OF_STOCK') {
                    self.stockStatus(true);
                } else {
                    self.stockStatus(false);
                }
                self.handleStorePickupClose();

            },
            /**
             * Handles store removal. Get back SKU's global inventory details.
             */
            handleStoreRemoval: function() {

                var self = this;
                self.selectedStore(null);
                var inventory = new Inventory();
                var successCallBack = function(data) {
                    if (data && data.length > 0) {
                        for (var i = 0; i < data.length; i++) {
                            var inventoryInfo = data[i];
                            if (self.product().id() === inventoryInfo.productId &&
                                self.selectedSku().repositoryId === inventoryInfo.catRefId) {

                                self.setStockAvailability(inventoryInfo.stockStatus, inventoryInfo.orderableQuantity);
                                self.stockState(inventoryInfo.stockStatus);
                                self.availabilityDate(inventoryInfo.availabilityDate);
                                if (null !== self.product().stockStatus()) {
                                    self.product().stockStatus()[self.selectedSku().repositoryId] = inventoryInfo.stockStatus;
                                    if (self.product().stockStatus().productSkuInventoryStatus) {
                                        self.product().stockStatus().productSkuInventoryStatus[self.selectedSku().repositoryId] = inventoryInfo.inStockQuantity ? inventoryInfo.inStockQuantity : 0;
                                    }

                                }
                                self.selectedSku().quantity = inventoryInfo.inStockQuantity ? inventoryInfo.inStockQuantity : 0;

                                if (inventoryInfo.stockStatus === CCConstants.IN_STOCK ||
                                    inventoryInfo.stockStatus === CCConstants.PREORDERABLE ||
                                    inventoryInfo.stockStatus === CCConstants.BACKORDERABLE) {
                                    self.stockStatus(true);
                                } else {
                                    self.stockStatus(false);
                                }
                            }
                        }
                    }

                };
                var errorCallBack = function(errorInfo) {
                    console.log("ERROR IN FETCHING INVENTORY DETAILS");
                };
                inventory.getStockStatuses({
                    productSkuIds: self.product().id() + ":" + self.selectedSku().repositoryId,
                    catalogId: self.user().catalogId()
                }, successCallBack.bind(this), errorCallBack.bind(this));

            },

            /**
             * Sets the stock available quantity based on stock status.
             * For IN_STOCK / PREORDERABLE / BACKORDERABLE items, we would allow add to cart even if 'inStockQuantity'
             * is not defined.
             * @param stockStatusMsg
             * @param inStockQuantity
             */
            setStockAvailability: function(stockStatusMsg, inStockQuantity) {
                var self = this;
                if (stockStatusMsg === CCConstants.IN_STOCK ||
                    stockStatusMsg === CCConstants.PREORDERABLE ||
                    stockStatusMsg === CCConstants.BACKORDERABLE) {
                    if (inStockQuantity) {
                        self.stockAvailable(inStockQuantity);
                    } else {
                        self.stockAvailable(1);
                    }
                }
            },

            /**
             * Handles Close of Store selection popup.
             */
            handleClose: function() {
                // Close the modal.
                $('#cc-cpqmodalpane').modal('hide');
            },

            /**
             * Handles Close of Store selection popup.
             */
            handleStorePickupClose: function() {
                // Close the modal.
                this.storeSearchText('');
                $('#storePickUpModal').modal('hide');
            },

            handleKeyPress: function(data, event) {
                var self = this;
                var keyCode = (event.which ? event.which : event.keyCode);
                switch (keyCode) {
                    case CCConstants.KEY_CODE_ENTER:
                        // Enter key
                        self.displayStoreSelector();
                        $('#storePickUpModal').modal('show');

                }
                return true;
            },

            //External Inventory Click Availability Event
            checkExternalStock: function() {
                var widget = this;
                this.externalInventoryCheck(widget.xRecordIdForInventoryCheck());
                $('#CheckAvailStock').modal('show');
            },

            /*  //ObjectConstruct
             objConstruct: function() {
                   this.recordId= widgetModel.getSelectedSkuId(widgetModel);
                      this.quantity = widgetModel.itemQuantity();
             },*/
            generateExternalPricingSkusObj: function(selectskuObj) {
                this.skuId = widgetModel.product().childSKUs()[0].repositoryId();
                this.quotingCatIds = widgetModel.generateQuotingcatIds(widgetModel.product().childSKUs()[0].x_quotingCategoryIDs());
            },
            generateQuotingcatIds: function(quotingIds) {
                if (quotingIds) {
                    return quotingIds.replace(/<\/?p>/g, '');
                }
            },
            //External Pricing call Method
            externalPricingCall: function(skuIds) {
                console.log("skuIds", skuIds);
                var widget = this;
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
                    console.log("resultpricing", result);
                    if (result && result.hasOwnProperty('pricingRecords')) {
                        for (var o = 0; o < widget.product().childSKUs().length > 0; o++) {
                            for (var p = 0; p < result.pricingRecords.length > 0; p++) {
                                if (widget.product().childSKUs()[o].repositoryId() == result.pricingRecords[p].itemId) {
                                    widget.product().childSKUs()[o].listPrice(result.pricingRecords[p].listPrice);
                                    widget.product().listPrice(result.pricingRecords[p].listPrice);
                                    widget.product().childSKUs()[o].salePrice(result.pricingRecords[p].salePrice);
                                    widget.product().salePrice(result.pricingRecords[p].salePrice);
                                    widget.product().childSKUs()[o].salePrice.valueHasMutated();
                                    widget.product().salePrice.valueHasMutated();
                                    widget.product().childSKUs()[o].listPrice.valueHasMutated();
                                    widget.product().listPrice.valueHasMutated();
                                    widget.listPrice(widget.product().listPrice());
                                    widget.salePrice(widget.product().salePrice());
                                    widget.listPrice.valueHasMutated();
                                    widget.salePrice.valueHasMutated();
                                    widget.product().x_productExternalListPrice = result.pricingRecords[p].listPrice;
                                    widget.product().x_productExternalSalePrice = result.pricingRecords[p].salePrice;
                                    console.log("result.pricingRecords[p].listPrice", widget.product().salePrice());
                                    if (widget.salePrice()) {
                                        widget.product().cartPrice = widget.salePrice();
                                    } else {
                                        widget.product().cartPrice = widget.listPrice();
                                    }
                                    break;
                                }

                            }
                        }
                    } else if (err) {
                        console.log(err, "....Pricing Api error...");
                    }

                })


            },


            //Inventory API Call Method
            externalInventoryCheck: function(itemId) {
                var widget = this;
                var skuData = {
                    'skus': [{
                        "itemId": itemId,
                        "quantity": widgetModel.itemQuantity()
                    }],
                    "site": {
                        "siteURL": widget.site().extensionSiteSettings.externalSiteSettings.siteUrl,
                        "siteName": widget.site().extensionSiteSettings.externalSiteSettings.siteName
                    }
                };

                var data = {
                    "enpointUrl": helper.apiEndPoint.inventory,
                    "postData": skuData
                }


                // widget.externalStockDetails();          
                helper.postDataExternal(data, function(err, result) {
                    if (result.quantities && result.quantities.length > 0) {
                        widget.externalStockDetails(result.quantities);
                    } else if (err) {
                        console.log(err, "....inventory error...");
                    }
                })
            },
           /*quantityChanged : function(data,event) {
            
               if('click' === event.type || ('keypress' === event.type && event.keyCode === 13)) {
                      console.log(data,"...........data...");
                     console.log(event , ".............event...");
               }
                var self =this;
                // self.externalInventoryCheck(self.xRecordIdForInventoryCheck());
                
            },*/
            
            /* getSkuSize: function(selectedQuantity) {
                 if (skuSizeLength === 1) {
                     //  $('.cc-skuDropdownSize').trigger('click');
                     return true;
                 } else {
                     return false;
                 }
             },*/
            getSkuQuantity: function(selectedQuantity) {

                console.log(selectedQuantity, "....selectedQuantity");
                /*  if (selectedKeyValue.selectedOption() != undefined) {
                    if (selectedKeyValue.selectedOption().key == CurrentKeyValue) {
                        return true;
                    } else {
                        return false;
                    }

                }
*/

            },
            getSkuSize: function(selectedSize) {
                console.log(selectedSize, "....selectedSize");

            }

        };
    }
);