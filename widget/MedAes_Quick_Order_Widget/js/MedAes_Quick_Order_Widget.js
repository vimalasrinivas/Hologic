/**
 * @fileoverview Quick Order.
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery', 'knockout', 'pubsub', 'notifications', 'notifier', 'CCi18n', 'ccConstants', 'spinner', 'placeholderPatch', 'navigation', 'pageLayout/product',
    'ccRestClient', 'pageLayout/site', 'ccResourceLoader!global/api-helper', 'viewModels/searchResultDetails', 'storageApi', 'bstypeahead',
  ],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function ($, ko, pubsub, notifications, notifier, CCi18n, CCConstants, spinner, placeholder, navigation, ProductViewModel, ccRestClient, SiteViewModel, helper, searchResDetails, storageApi) {
    "use strict";

    var self;
    var widgetModel;
    var cartSuccess = [];
    var prdAddToBagArray = [];
    return {

      WIDGET_ID: 'quickOrder',
      rowsToAddToCart: ko.observableArray(),
      activeSearchBoxIndex: ko.observable(),
      skuList: ko.observableArray(),
      interceptedLink: ko.observable(null),
      isDirty: ko.observable(false),
      isModalVisible: ko.observable(false),
      popupId: "",
      disableAddToCartButton: ko.observable(false),
      disableFavorites: ko.observable(true),
      skuIds: [],
      lines: [],
      invalidSKUs: [],
      newProducts: [],
      fileToUpload: ko.observable(null),
      spinnerOptions: {
        parent: "#quick-order-body",
        posTop: '30%',
        posLeft: '20%'
      },
      quickOrderDetails: [],
      //For typeahead search
      MIN_CHARACTERS: 2,
      locale: "",
      MAX_RESULTS: 5,
      LEFT_MARGIN: 10,
      selectedItems: [],
      //Because listsku endpoint call cannot handle calls with
      //large no. of SKUs we send it in multiple batches.
      MAX_ITEMS_PER_BATCH: 50,
      isCartAdded: ko.observable(false),

      beforeAppear: function () {
        var widget = this;
        window.onbeforeunload = null;
        widget.isCartAdded(false);
        widget.rowsToAddToCart.removeAll();
        widget.skuList.removeAll();
        for (var loadInitialRows = 0; loadInitialRows < widget.noOfRowsToDisplay(); loadInitialRows++) {
          if (widget.quickOrderDetails.length > 0 && loadInitialRows < widget.quickOrderDetails.length) {
            for (var i = 0; i < widget.quickOrderDetails.length; i++) {
              widget.createNewRow(widget.quickOrderDetails[loadInitialRows]);
              loadInitialRows++;

            }
          } else {
            widget.createNewRow("");
          }
        }
        $("remove-Entry").click(function () {
          $("createNewRow().index").remove();
        });

        setTimeout(function () {
          $('#quickOrderWidget').parents('.redBox').addClass("quickOrderCloumnContainer");
          $(".quickOrderCloumnContainer").wrapInner("<div class='container' style='padding:0px'></div>");
          $('.quickOrderCloumnContainer').css("background-color", "#f6f6f6");
        }, 300);
      },



      /**  
       * Function to display quickview popup when no of SKUs is greater than 1
       * @param {popupId} id of the quickview model
       * @param {widget} Product details widget
       * @param{productId} product id of product to display in popup 
       */
      handleQuickViewClick: function (popUpId, widget, productId) {
        var product = widget,
          popup, popUpRegionContext, productDetailsWidget, productVariantOptions, requestData = {};

        if (product) {
          popup = $(popUpId);
          popUpRegionContext = ko.dataFor(popup[0]);
          console.log(".....popUpRegionContext....", popUpRegionContext)
          productDetailsWidget = popUpRegionContext;

          ccRestClient.request(
            CCConstants.ENDPOINT_PRODUCTS_GET_PRODUCT,
            requestData,
            function (data) {
              var newProduct = new ProductViewModel(data, {});
              // set the product to null to re-trigger the binding (cc-zoom doesn't pick up changes without this step)
              //   productDetailsWidget.product(null);
              productDetailsWidget.product(newProduct);

              // reset and reapply the variant options
              productDetailsWidget.variantOptionsArray([]);
              productVariantOptions = newProduct.productVariantOptions ? ko.mapping.toJS(newProduct.productVariantOptions()) : null;
              productDetailsWidget.productVariantOptions(productVariantOptions);
              var productType = [];
              productType.push({
                "id": data.type
              });
              var productTypeVariants = [];
              if (productVariantOptions !== null) {
                for (var variants = 0; variants < productVariantOptions.length; variants++) {
                  productTypeVariants.push({
                    "id": productVariantOptions[variants].optionId,
                    "values": Object.keys(productVariantOptions[variants].optionValueMap)
                  })
                }
              }
              productType[0].variants = productTypeVariants;
              productDetailsWidget.productTypes(productType);
              // call before appear
              productDetailsWidget.beforeAppear();
              popup.modal('show');
            },
            function (data) {
              console.log(data)
            },
            productId
          );
        }
      },

      onLoad: function (widget) {
        $.Topic(pubsub.topicNames.CART_PRICE_COMPLETE).subscribe(function () {
          if (window.location.href.toLowerCase().indexOf('quickorder') !== -1) {
            prdAddToBagArray.shift();
            if (prdAddToBagArray.length > 0) {
              if (prdAddToBagArray.length !== 1) {
                widget.cart().addItem(prdAddToBagArray[0]);
              } else {
                widget.selectedItems = [];
                $.Topic(pubsub.topicNames.CART_ADD).publishWith(
                  prdAddToBagArray[0], [{
                    message: "success"
                  }]);
                  widget.destroySpinner();
              }
            }
          }
        });
        widgetModel = widget;
        var clickedElementId = ko.observable(null);
        // price complete call
        widget.locale = ccRestClient.getStoredValue(CCConstants.LOCAL_STORAGE_USER_CONTENT_LOCALE);
        if (widget.locale != null) {
          widget.locale = JSON.parse(widget.locale)[0].name;
        } else {
          widget.locale = $(':root').attr('lang');
        }
        // Configuring chinese locales to support typeahead with minimum one character length
        if (widget.locale == "zh_CN" || widget.locale == "zh_TW") {
          widget.MIN_CHARACTERS = 1;
        }
        $.Topic(pubsub.topicNames.ADD_TO_QUICK_ORDER).subscribe(widget.addToQuickOrder.bind(widget));

        // handler for anchor click event.
        widget.handleUnsavedChanges = function (e, linkData) {
          var usingCCLink = linkData && linkData.usingCCLink;
          // If URL is changed explicitly from profile.
          if (!usingCCLink && !navigation.isPathEqualTo(widget.links().profile.route)) {
            widget.removeEventHandlersForAnchorClick();
            return true;
          }
          if (widget.user().loggedIn()) {
            clickedElementId = this.id;
            if (clickedElementId === "CC-header-cart-total") {
              return true;
            }
            widget.interceptedLink = e.currentTarget.pathname;
            if (widget.isDirty()) {
              widget.showModal();
              usingCCLink && (linkData.preventDefault = true);
              return false;
            }
          }
        };

        widget.showModal = function () {
          //$("#CC-quickOrder-modal").modal('show');
          //widget.isModalVisible(true);
          widget.navigateAway();
        };

        widget.navigateAway = function () {
          if (clickedElementId === "CC-header-checkout" || clickedElementId === "CC-loginHeader-logout" || clickedElementId === "CC-customerAccount-view-orders" ||
            clickedElementId === "CC-header-language-link" || clickedElementId.indexOf("CC-header-languagePicker") != -1) {
            widget.removeEventHandlersForAnchorClick();
            // Get the DOM element that was originally clicked.
            var clickedElement = $("#" + clickedElementId).get()[0];
            clickedElement.click();
          } else if (clickedElementId === "CC-loginHeader-myAccount") {
            // Get the DOM element that was originally clicked.
            var clickedElement = $("#" + clickedElementId).get()[0];
            clickedElement.click();
          } else {
            if (!navigation.isPathEqualTo(widget.interceptedLink)) {
              navigation.goTo(widget.interceptedLink);
              widget.removeEventHandlersForAnchorClick();
            }
          }
        };


        /**
         *  Adding event handler for anchor click.
         */

        widget.handleModalCancelUpdateDiscard = function () {
          $("#CC-quickOrder-modal").modal('hide');
          widget.navigateAway();
        };

        widget.addEventHandlersForAnchorClickSetPopupId = function (popupId) {
          widget.popupId = popupId;
          $("body").on("click.cc.unsaved", "a", widget.handleUnsavedChanges);
        };

        /**
         *  removing event handlers explicitly that has been added when anchor links are clicked.
         */
        widget.removeEventHandlersForAnchorClick = function () {
          $("body").off("click.cc.unsaved", "a", widget.handleUnsavedChanges);
        };


        /**
         *  Navigates window location to the interceptedLink OR clicks checkout/logout button explicitly.
         */
        widget.navigateAway = function () {

          if (clickedElementId === "CC-header-checkout" || clickedElementId === "CC-loginHeader-logout" || clickedElementId === "CC-customerAccount-view-orders" ||
            clickedElementId === "CC-header-language-link" || clickedElementId.indexOf("CC-header-languagePicker") != -1) {
            widget.removeEventHandlersForAnchorClick();
            // Get the DOM element that was originally clicked.
            var clickedElement = $("#" + clickedElementId).get()[0];
            clickedElement.click();
          } else if (clickedElementId === "CC-loginHeader-myAccount") {
            // Get the DOM element that was originally clicked.
            var clickedElement = $("#" + clickedElementId).get()[0];
            clickedElement.click();
          } else {
            if (!navigation.isPathEqualTo(widget.interceptedLink)) {
              navigation.goTo(widget.interceptedLink);
              widget.removeEventHandlersForAnchorClick();
            }
          }
          widget.isDirty(false);
        }

        widget.hideModal = function () {
          if (widget.isModalVisible() || widget.user().isSearchInitiatedWithUnsavedChanges()) {
            $("#CC-quickOrder-modal").modal('hide');
            $('body').removeClass('modal-open');
            $('.modal-backdrop').remove();
          }
        }
        $.Topic('Quick_Order_Details.memory').subscribe(function (data) {
          console.log(data);
          widget.quickOrderDetails = data;
        });

      },
  
      /**
       * Function to add products from quick order to cart
       * and call success/error function for products to cart and not added to cart respectively  
       */
      addToCart: function () {
        var widget = this;        
        var newProductArr = [];
        var pricingData = [];
       if (widget.selectedItems.length >0) {    
        widget.createSpinner();
          for (var items = 0; items < widget.selectedItems.length; items++) {
            if (widget.selectedItems[items].id !== '') {
              console.log("widget.selected ite,mmm SKUid", widget.selectedItems);
              pricingData.push({
                "itemId": widget.selectedItems[items].childSKUs[0].repositoryId,
                "quotingCatIds": widget.generateQuotingcatIds(widget.selectedItems[items].quotingCategoryIDs)
              })
            }
          }
          if (pricingData.length > 0) {
            widget.externalPricingCall(pricingData, function (result) {
              if (result.hasOwnProperty('pricingRecords')) {
                for (var items = 0; items < widget.selectedItems.length; items++) {
                  for (var res = 0; res < result.pricingRecords.length; res++) {
                    if (result.pricingRecords[res].itemId === widget.selectedItems[items].childSKUs[0].repositoryId && (result.pricingRecords[res].salePrice || result.pricingRecords[res].listPrice)) {
                      widget.rowsToAddToCart()[items].errorMessage("");
                      widget.selectedItems[items].catRefId = widget.selectedItems[items].childSKUs[0].repositoryId;
                      widget.selectedItems[items].orderQuantity = widget.rowsToAddToCart()[items].productQuantity();
                      widget.selectedItems[items].externalPriceQuantity = -1;
                      widget.selectedItems[items].externalPrice = result.pricingRecords[res].salePrice ? result.pricingRecords[res].salePrice : result.pricingRecords[res].listPrice;
                      newProductArr.push(widget.selectedItems[items]);
                      break;
                    }
                  }
                  if (items + 1 === widget.selectedItems.length) {
                    widget.methodAddToCart(newProductArr);
                  }
                }
              } else {
                widget.selectedItems = [];
                widget.destroySpinner();
                notifier.sendError(widget.WIDGET_ID, widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
              }
              widget.rowsToAddToCart.removeAll();
              for (var loadInitialRows = 0; loadInitialRows < 5; loadInitialRows++) {
                widget.createNewRow("");
              }
            });
          } else {
            //widget.disableFavorites(tr);
            notifier.sendError("quickOrder", "Error when adding your item to your cart. Please try again.", true);
          }
        } else {
          notifier.sendError("quickOrder", "Please select an item to add to your cart.", true);
        }
      },

      methodAddToCart: function (newProduct) {
        var widget = this;
        prdAddToBagArray = newProduct;
        if (prdAddToBagArray.length > 1) {
          widget.cart().addItem(prdAddToBagArray[0]);
        } else {
          $.Topic(pubsub.topicNames.CART_ADD).publishWith(
            prdAddToBagArray[0], [{
              message: "success"
            }]);
          widget.selectedItems = [];
          widget.destroySpinner();
        }


      },


      showPurChaseList: function (data) {
        $('#CC-purchaseList-name').val('');
        console.log(data, "...purchaselist..");
        var widget = this;
        var productItemArray = [];
        if (widget.selectedItems.length >0) {
          for (var items = 0; items < widget.rowsToAddToCart().length; items++) {
            if (widget.rowsToAddToCart()[items].productName() !== "") {
              var productItem = { "productName": "", "catRefId": "", "productQuantity": "" };
              var itemDetails = widget.rowsToAddToCart()[items];
              productItem['productQuantity'] = itemDetails.productQuantity();
              productItem['productName'] = itemDetails.productName();
              productItem['catRefId'] = itemDetails.catRefId;
              productItemArray.push(productItem);
            }
          }
          $.Topic('PURCHASE_LIST.memory').publish(productItemArray);
          $('#CC-newPurchaseList-modal').modal('show');
        } else {
          notifier.sendError("quickOrder", "Please select an item to add to your Favorites.", true);
        }
      },

      /**
       * Function to check if product is selected from dialog or search
       * @param {param} Product selected from search or dialog box
       */
      addToQuickOrder: function (param) {

        var widget = this;
        widget.selectedItems.push(param);
        param.orderQuantity = (param.orderQuantity || 1);
        var index = widget.skuList.indexOf(param.childSKUs[0].repositoryId);
        if (index > -1) {
          widget.rowsToAddToCart()[index].productQuantity(widget.rowsToAddToCart()[index].productQuantity() + 1);
          widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].productQuantity(1);
          if (widget.activeSearchBoxIndex() !== index) {
            widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].productDisplay("");
          } else {
            widget.addToRow(param);
          }
          return;
        }
        widget.addToRow(param);

        /*if (param.numberOfSKUs == 1 || param.selectedFromDialog) {
          param.orderQuantity = (param.orderQuantity || 1);
          var index = widget.skuList.indexOf(param.childSKUs[0].repositoryId);
          if (index > -1) {
            widget.rowsToAddToCart()[index].productQuantity(widget.rowsToAddToCart()[index].productQuantity() + 1);
            widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].productQuantity(1);
            if (widget.activeSearchBoxIndex() !== index) {
              widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].productDisplay("");
            } else {
              widget.addToRow(param);
            }
            return;
          }
          widget.addToRow(param);
        } else if (param.numberOfSKUs > 1) {
            console.log(".......param.....",param.numberOfSKUs)
            widget.handleQuickViewClick(widget.popupId, ProductViewModel, param.id);
        }*/
      },

      /**
       * Once product is selected, display it according to given format
       * @param {item} item to add to quick order
       */
      addToRow: function (item) {
        var widget = this;
        widget.skuList()[widget.activeSearchBoxIndex()] = item.childSKUs[0].repositoryId;
        widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].productName(item.displayName);
        var nameToDisplay = item.displayName + '    ' + item.childSKUs[0].repositoryId;
        widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].productDisplay(nameToDisplay);
        widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].productQuantity(item.orderQuantity);
        widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].catRefId = item.childSKUs[0].repositoryId;
        $(".modal").modal("hide");
        //widget.disableFavorites(true);
      },
      removeRow: function (data, index, event) {
        var widget = this;
        var finalArr = widget.selectedItems.splice(index, 1);
        widget.rowsToAddToCart().splice(index, 1);
        $(event.currentTarget).parents(".inputbox-row").remove();
      },

      //   * Function to create new row in quick-order
      //   */
      createNewRow: function (data) {
        var widget = this;
        widget.rowsToAddToCart.push({
          productDisplay: data.productName ? ko.observable(data.productName) : ko.observable(""),
          productName: data.productName ? ko.observable(data.productName) : ko.observable(""),
          productQuantity: data.productQuantity ? ko.observable(data.productQuantity) : ko.observable("1"),
          errorMessage: ko.observable(""),
          catRefId: data.productQuantity ? ko.observable(data.productQuantity) : ""

        });
        //console.log(data, "hi")
        widget.skuList.push("");
        widget.rowsToAddToCart()[(widget.rowsToAddToCart().length - 1)].productQuantity.extend({
          required: {
            params: true,
            message: widget.translate('quantityRequireMsg')
          },
          digit: {
            params: true,
            message: widget.translate('quantityNumericMsg')
          },
          min: {
            params: 1,
            message: widget.translate('quantityGreaterThanMsg', {
              quantity: 0
            })
          },
          max: {
            params: widget.maxQuantityOfItems,
            message: widget.translate('quantitySmallerThanMsg', {
              quantity: widget.maxQuantityOfItems()
            })
          }
        });
      },
      /**
       * Check if the active row is last row
       * @param {index} index of the active row
       */
      lastRowCheck: function (index) {
        var widget = this;
        if (index == widget.rowsToAddToCart().length - 1 && widget.rowsToAddToCart()[index].productDisplay() != "") {
          widget.createNewRow("");
        }
      },

      /**
       * Invoked when the search text box is in focus.
       * Used to fix the bug with growl messages not clearing on clicking
       * the search box
       */
      searchSelected: function (index) {
        var widget = this;
        widget.activeSearchBoxIndex(index);
        //  $('.right-inner-addon input').css('text-overflow','ellipsis');  
      },

      afterBlur: function (index,data, event) {
        var widget = this;
        var searchBoxVal = event.target.id;
        if(($('#'+searchBoxVal).val()) === '' && widget.rowsToAddToCart()[index].catRefId !== ''){  
            for(var i = 0; i<widget.skuList().length;i++){
                if(widget.skuList()[i] === widget.rowsToAddToCart()[index].catRefId){
                  widget.skuList()[i] = '';
                }  
            }  
            widget.rowsToAddToCart()[index].productDisplay('');  
            widget.rowsToAddToCart()[index].productName('');
            if(parseInt(widget.rowsToAddToCart()[index].productQuantity()) > 1 ){
                widget.rowsToAddToCart()[index].productQuantity('1');      
            }  
            widget.rowsToAddToCart()[index].errorMessage('');
            widget.rowsToAddToCart()[index].catRefId = '';
        }
        if (widget.rowsToAddToCart()[index].productDisplay() === "") {
          widget.rowsToAddToCart()[index].errorMessage("");
        }
      },

      handleFiles: function (widget, pEvent) {
        var target = pEvent.target ? pEvent.target : pEvent.srcElement;
        var file, fileName;
        if (target.files) {
          file = target.files[0];  
          if (file.name.split('.').pop() !== "csv") {
            notifier.sendError("quickOrderWidget", widget.translate('invalidFileText'), true);
            return;
          } else {
            widget.fileToUpload(file);
          }
          target.value = '';
        }
      },

      getAsText: function () {
        var widget = this;
        var reader = new FileReader();
        // Read file into memory as UTF-8      
        reader.readAsText(widget.fileToUpload());
        // Handle errors load
        reader.onload = widget.loadHandler.bind(this);
        reader.onerror = widget.errorHandler.bind(this);
      },

      loadHandler: function (event) {
        var widget = this;
        var csv = event.target.result;
        widget.processData.call(widget, csv);
      },

      processData: function (csv) {
        var widget = this;
        var allTextLines = csv.split(/\r\n|\n/);
        var rowToAddFromCSV = {};
        var index;
        var floor;
        var partSKUList;
        widget.skuIds = [];
        widget.lines = [];
        for (var i = 0; i < allTextLines.length; i++) {
          var data = allTextLines[i].split(';');
          var rowFromFile = [];
          for (var j = 0; j < data.length; j++) {
            rowFromFile.push(data[j]);
            if (rowFromFile[i] !== "") {
              if (rowFromFile[0].split(',')[0] !== "") {
                widget.skuIds.push(rowFromFile[0].split(',')[0]);
                widget.lines.push(rowFromFile);
              }
            }
          }
        }
        if (widget.lines.length > widget.maxNoOfItemsInCSV()) {
          notifier.sendError("quickOrderWidget", widget.translate('maxNoInFileErrorText'), true);
          return;
        };
        widget.total = widget.skuIds.length;
        floor = widget.total - widget.MAX_ITEMS_PER_BATCH;
        if (floor < 0) {
          floor = 0;
        }
        partSKUList = widget.skuIds.slice(floor, widget.total);
        widget.initialSKUCall(partSKUList);
        spinner.create(widget.spinnerOptions);
      },

      initialSKUCall: function (partSKUList) {
        var widget = this;
        var input = {};
        var rowToAddFromCSV = {};
        var index;
        var floor;
        input[CCConstants.CATALOG] = widget.cart().catalogId();
        input[CCConstants.SKU_IDS] = partSKUList;
        input[CCConstants.PROD_STATE] = true;
        input[CCConstants.STORE_PRICELISTGROUP_ID] = SiteViewModel.getInstance().selectedPriceListGroup().id;
        ccRestClient.request(CCConstants.ENDPOINT_PRODUCTS_LIST_SKUS, input,
          function (data) {
            widget.invalidSKUs = widget.invalidSKUs.concat(data.deletedSkus);
            if (widget.total > 0 && widget.total - widget.MAX_ITEMS_PER_BATCH > 0) {
              widget.total = widget.total - widget.MAX_ITEMS_PER_BATCH;
              floor = widget.total - widget.MAX_ITEMS_PER_BATCH;
              if (floor < 0) {
                floor = 0;
              }
              partSKUList = widget.skuIds.slice(floor, widget.total);
              widget.initialSKUCall(partSKUList);
            } else {
              for (i = 0; i < widget.lines.length; i++) {
                if (widget.skuIds[i] !== "") {
                  rowToAddFromCSV = {
                    productName: ko.observable(""),
                    productDisplay: ko.observable(widget.skuIds[i]),
                    catRefId: "",
                    productQuantity: ko.observable(widget.lines[i][0].split(',')[1]).extend({
                      required: {
                        params: true,
                        message: widget.translate('quantityRequireMsg')
                      },
                      digit: {
                        params: true,
                        message: widget.translate('quantityNumericMsg')
                      },
                      min: {
                        params: 1,
                        message: widget.translate('quantityGreaterThanMsg', {
                          quantity: 0
                        })
                      },
                      max: {
                        params: widget.maxQuantityOfItems,
                        message: widget.translate('quantitySmallerThanMsg', {
                          quantity: widget.maxQuantityOfItems()
                        })
                      }
                    }).isModified(true),
                    errorMessage: ko.observable("")
                  };
                  if (widget.invalidSKUs.indexOf(rowToAddFromCSV.productDisplay()) !== -1) {
                    rowToAddFromCSV.errorMessage(widget.translate('invalidSKUText'));
                  }
                  index = widget.rowsToAddToCart().map(function (x) { return x.productDisplay(); }).indexOf("");
                  if (index > -1) {
                    widget.rowsToAddToCart.splice(index, 1, rowToAddFromCSV);
                  } else {
                    widget.rowsToAddToCart.push(rowToAddFromCSV);
                  }
                }
              }
              widget.lastRowCheck(widget.rowsToAddToCart().length - 1);
              spinner.destroyWithoutDelay(widget.spinnerOptions.parent);
              widget.fileToUpload(null);
            }
          }, function () {
            notifier.sendError("quickOrderWidget", widget.translate('fileParsingErrorText'), true);
            spinner.destroyWithoutDelay(widget.spinnerOptions.parent);
            return;
          }, partSKUList);
      },
      errorHandler: function (evt) {
        if (evt.target.error.name == "NotReadableError") {
          alert("Cannot read file !");
        }
      },// 			External pricing call method

      externalPricingCall: function (skuIds, callback) {
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
        //  console.log(data, ".data...........");
        helper.postDataExternal(data, function (err, result) {
          if (result) {
            callback(result);
          } else {
            callback(err);
          }
        })
      },
      generateQuotingcatIds: function (quotingIds) {
        console.log("quotingIds", quotingIds);
        if (quotingIds) {
          return quotingIds.replace(/\n/ig, "");
        }
      },
      clearAll: function () {
        var widget = this;
        widget.beforeAppear();
        $(csvFileInput)[0].value = "";
        widget.fileToUpload(null);
      },
      //TypeAhead Functions      
      /**
       * Bind the search box with bootstrap typeahead
       * @param {selectorId} id of the search box
       */
      initializer: function (selectorId) {
        var widget = this;
        var selector = "#" + selectorId;

        $(selector).typeahead({
          source: widget.typeaheadSource,
          minLength: widget.MIN_CHARACTERS,
          items: widget.MAX_RESULTS,
          fractionalDigits: widget.site().selectedPriceListGroup().currency.fractionalDigits,
          symbol: widget.site().selectedPriceListGroup().currency.symbol,
          matcher: widget.typeaheadMatch,
          sorter: widget.typeaheadSort,
          highlighter: widget.typeaheadHighlight,
          render: widget.typeaheadRender, // Non-standard option!
          select: widget.typeaheadSelect.bind(widget), // Non-standard option!
          menu: "<ul id='quickOrderDropDown' class='typeahead dropdown-menu' aria-live='polite'></ul>",
          item: "<li class='typeaheadProduct'><a href='#'> \
                              <img alt='thumbnail' class = 'typeaheadProductThumbnail visible-md visible-lg img-responsive'/> \
                          <span class = 'typeaheadProductName'> </span> \ <span class = 'typeaheadProductPrice hide'> </span> \ </a></li>"
        });
        $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_UPDATED).subscribe(widget.typeaheadResults);
      },

      /**
       * @override 
       * Function to call search.js with query in quick-order
       */
      typeaheadSource: function (query, process) {
        // Finish the set-up of the search typeahead
        // This isn't related to setting the source array
        // but it is the first opportunity to override
        // the render, select & hide methods, which bootstrap
        // doesn't allow for in its options.                          
        self = this;

        this.render = this.options.render || this.render;
        this.select = this.options.select || this.select;

        this.noImageThumb = ko.observable(SiteViewModel.getInstance().noImageSrc() ? SiteViewModel.getInstance().noImageSrc() : '/img/no-image.jpg');

        // Need to set the width of the dropdown in JS as it
        // is positioned absolutely and 'loses' knowledge of
        // parent element width
        this.$menu.css('margin-left', 10);

        // Setup the delayed search request
        if (this.timer) {
          clearTimeout(this.timer);
        }

        var delayedSearch = function () {
          // save reference to 'process' callback as its 
          // needed in the result method
          self.callback = process;
          widgetModel.customTypeAheadService();
          /*$.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD).publishWith({
            searchText: self.query,
            recordsPerPage: 5,
            recordOffSet: 0
          }, [{
            message: "success"
          }]);*/

        };

        this.timer = setTimeout(delayedSearch, 300);

      },

      /**
       * @override
       * Function to handle search result once published from search.js
       * @param {result} success/failure message
       */
      typeaheadResults: function (result) {
        if (self && self.options && (document.activeElement.className.indexOf('quick-order-query') > -1)) {
          var sourceArray = [];
          var searchResults = this[0] ? this[0] : [];
          var testResults = this[1] ? this[1] : [];
          var variantName, variantValue;

          $.each(testResults, function (i, item) {
            //item = product.resultsList.records;
            if (item.records[0]) {
              var record = item.records[0];
              var product = {};
              product.id = record.attributes['product.repositoryId'][0];
              // Adding a fail safe in case there is no name for the product.
              if (record.attributes['product.displayName']) {
                product.name = record.attributes['product.displayName'][0];
              }
              // If displayName doesn't exist
              else {
                product.name = "";
              }
              if (($(window)[0].innerWidth || $(window).width()) > CCConstants.VIEWPORT_TABLET_LOWER_WIDTH) {
                product.thumb = record.attributes['sku.listingThumbImageURL'] ?
                  record.attributes['sku.listingThumbImageURL'] :
                  (record.attributes['product.primaryThumbImageURL'] ?
                    record.attributes['product.primaryThumbImageURL'][0] : self.noImageThumb());
                product.noImageSrc = 'src="' + self.noImageThumb() + '"';
              }
              var price = (function (item) {
                var productPrice, minPrice, sku, skuPrice, index;
                if (item.attributes["sku.minActivePrice"][0]) {
                  return item.attributes["sku.minActivePrice"][0];
                } else {
                  productPrice = (item.records[0].attributes['sku.salePrice'] || item.records[0].attributes['sku.salePrice'][0] === 0) ? item.records[0].attributes['sku.salePrice'][0] : item.records[0].attributes['sku.listPrice'][0];
                  return productPrice;
                }
              })(item);
              product.price = price;
              product.numRecords = this.numRecords;
              product.SKUid = this.records[0].attributes["sku.repositoryId"][0];
              product.recordId = this.records[0].attributes["sku.x_recordId"] ? this.records[0].attributes["sku.x_recordId"][0] : '';
              product.quotingCategoryIDs = this.records[0].attributes["sku.x_quotingCategoryIDs"] ? this.records[0].attributes["sku.x_quotingCategoryIDs"][0] : '';
              sourceArray.push(product);
            }
          });

          if (!sourceArray.length) {
            // component will not render the dropdown unless there is at least
            // one entry in the source array, so to display a 'no matches found'
            // message, a fake entry must be created.
            sourceArray.push({
              id: "NO MATCHES FOUND",
              name: '',
              price: '',
              thumb: ''
            });
          }

          if (self.callback && typeof (self.callback) === 'function') {
            self.callback(sourceArray);
          }
        }
      },

      /**
       * @override
       * Overriding the function to prevent error because the search result
       * we are expecting is not the same as bootstrap typeahead result
       */
      typeaheadMatch: function (item) {
        return true;
      },

      /**
       * @override
       * Overriding the function to prevent error because the search result
       * we are expecting is not the same as bootstrap typeahead result
       */
      typeaheadSort: function (items) {
        // Sorting handled server-side.
        return items;
      },

      /**
       * @override
       * Overriding the function to prevent error because the search result
       * we are expecting is not the same as bootstrap typeahead result
       */
      typeaheadHighlight: function (item) {
        return item;
      },

      /**
       * @override
       * Function to render the search dropdown popup box
       * @param{items} array of products 
       */
      typeaheadRender: function (items) {
        if ((items.length === 1) && (items[0].id === "NO MATCHES FOUND")) {

          var noMatchesFound = CCi18n.t('ns.common:resources.' + 'noMatchesFound');

          this.$menu.html($("<li class='typeaheadTop' disabled>").text(noMatchesFound));

          return this;
        }

        items = $(items).map(function (i, item) {
          i = $(self.options.item).attr('data-value', item.name);
          i.find('a').attr('title', item.name);
          i.find('a').attr('id', item.id);
          i.find('a').attr('numRecords', item.numRecords);
          i.find('a').attr('SKUid', item.SKUid);
          i.find('a').attr('recordId', item.recordId);
          i.find('a').attr('quotingCategoryIDs', item.quotingCategoryIDs);
          i.find('.typeaheadProductThumbnail').attr('src', item.thumb);
          i.find('.typeaheadProductThumbnail').attr('onError', item.noImageSrc);
          i.find('.typeaheadProductName').html(item.name);

          var formattedPrice;
          var price = parseFloat(item.price).toFixed(self.options.fractionalDigits).toString();
          if (price === "NaN" || price === '' || price === null) {
            price = CCi18n.t('ns.common:resources.' + 'priceUnavailable');
          }
          formattedPrice = self.options.symbol + price;
          i.find('.typeaheadProductPrice').text(formattedPrice);

          return i[0];
        });

        items.first().addClass('firstResult');

        this.$menu.html(items);

        return this;
      },

      /**
       * @override
       * Overridden the function to have select behaviour according to our requirement
       */
      typeaheadSelect: function () {
        var activeItem = self.$menu.find('.active');

        var productUrl = activeItem.children('a').attr('href');
        var itemId = activeItem.children('a').attr('id');
        var temp = {
          displayName: activeItem[0].firstChild['attributes'].getNamedItem("title").value,
          id: activeItem.children('a').attr('id'),
          numberOfSKUs: activeItem[0].firstChild['attributes'].getNamedItem("numrecords").value,
          childSKUs: [{
            "repositoryId": activeItem[0].firstChild['attributes'].getNamedItem("skuid").value
          }],
          recordId: activeItem[0].firstChild['attributes'].getNamedItem("recordId").value,
          quotingCategoryIDs: activeItem[0].firstChild['attributes'].getNamedItem("quotingCategoryIDs").value
        }
        this.addToQuickOrder(temp);
        this.isDirty(true);
        return self.hide();
      },
      /** Custom typeahead changes for product type*/
      customTypeAheadService: function () {
        var l = {};
        var nrParam = storageApi.getInstance().getItem("nrParam");
        var searchQuery = '/ccstoreui/v1/assembler/assemble?Ntt=' + self.query +
          '&Ntk=' + CCConstants.TYPEAHEAD_SEARCH_INTERFACE +
          '&searchType=' + CCConstants.TYPEAHEAD_SEARCH_INTERFACE +
          '&language=en&path=' + CCConstants.ASSEMBLER_DEFAULT_TYPEAHEAD_PATH +
          '&redirects=yes&site=default&No=0&Nrpp=100&' +
          nrParam;
        //console.log('searchQuery',searchQuery)
        ccRestClient.authenticatedRequest(searchQuery, l, function (result) {
          console.log("search dataaaaa", result);
          var messageDetails = [{ message: CCConstants.SEARCH_MESSAGE_SUCCESS }];
          if (result['@error']) {
            log.error("search error returned :" + result['@error']);

            messageDetails = [{ message: CCConstants.SEARCH_MESSAGE_FAIL }];
          }

          // don't update result model or both result lists are updated when on
          // search results page. Just pass through what's needed
          var searchResults = [];

          if ((result.resultsList) && (result.resultsList.records)) {
            var typeaheadResults = [];
            searchResults = result.resultsList.records;
            searchResDetails.update(result);
            typeaheadResults.push(searchResDetails.searchResults);
            typeaheadResults.push(searchResults);
          }

          $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_UPDATED).publishWith(typeaheadResults, [{ message: "success" }]);
        }, function (data) {
          var messageDetails = [{ message: CCConstants.SEARCH_MESSAGE_FAIL }];
          var searchResults = [];
          $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_UPDATED).publishWith(searchResults, [{ message: "success" }]);
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
          }
    }
  }
);