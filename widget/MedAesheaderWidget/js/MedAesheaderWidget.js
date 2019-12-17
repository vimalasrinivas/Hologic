/**
 * @fileoverview Header Widget.
 * 
 */
define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-----------------------------------------------------------------  
  ['knockout', 'pubsub', 'notifications', 'CCi18n', 'ccConstants', 'ccResourceLoader!global/api-helper', 'navigation', 'notifier', 'pageLayout/site',
    'ccLogger', 'jquery', 'ccNumber', 'ccRestClient', 'storageApi','viewModels/searchResultDetails','spinner'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION  
  //-------------------------------------------------------------------
  function (ko, pubsub, notifications, CCi18n, CCConstants, helper, navigation, notifier, SiteViewModel, ccLogger,
    $, ccNumber, ccRestClient, storageApi,searchResDetails,spinner) {

    "use strict";
    var widgetModel;
    var self;
    var prdAddToBagArray = [];
    return {

      linkList: ko.observableArray(),
      WIDGET_ID: 'header',

      // Keep track on whether the user should be able to see the cart.

      cartVisible: ko.observable(false),
      accountLevelBrandName: ko.observable(),
      ignoreBlur: ko.observable(false),
      collectionMenu: ko.observable(),
      rowsToAddToCart: ko.observableArray(),
      miniCartQty:ko.observable(),
      activeSearchBoxIndex: ko.observable(),
      skuList: ko.observableArray(),
      isDirty: ko.observable(false),
      selectedItems: [],
      isCartAdded: ko.observable(false),
      
      customHandleLogout: function() {
          $.Topic(pubsub.topicNames.USER_LOGOUT_SUBMIT).publishWith([{message : "success"}]);
      },
      
      mouseUponMiniCart: function () {
        this.showDropDownCart();
        $('.content').css('display', 'block');
      },

      miniCart: function () {
        $('.content').css('display', 'none');
      },
      rapidOrder: function () {
        //console.log("...........focusout.");
        $('#demo').removeClass('in');
      },
      addToCart: function () {
        var widget = this;
        var newProductArr = [];
        widget.createSpinner();
        notifier.clearError("quickOrderWidget");
        // console.log("widget.selectedItems",widget.selectedItems);
        // console.log("widget.widget.rowsToAddToCart()",widget.rowsToAddToCart());
        var newProduct = [];
        var pricingData = [];
        for (var items = 0; items < widget.selectedItems.length; items++) {
          console.log("widget.selectedItems[items].recordId", widget.selectedItems[items])
          if (widget.selectedItems[items].id !== '') {
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
                    if(items+1 === widget.selectedItems.length){
                      widget.addNewItemToCart(newProductArr);
                    }
                }
            } else{
              widget.destroySpinner();
              notifier.sendError(widget.WIDGET_ID,"Error when adding your item to your cart. Please try again.", true); 
            }             
            widget.rowsToAddToCart.removeAll();
            widget.destroySpinner();
            for (var loadInitialRows = 0; loadInitialRows < 5; loadInitialRows++) {
              widget.createNewRow();

            }
          });
        } else {
            widget.destroySpinner();
            notifier.sendError("quickOrder", "Error when adding your item to your cart. Please try again.", true);   
        }
      },
      moreEntryFields: function (data) {
        var widget = this;
        var fieldsArr = [];
        for (var items = 0; items < widget.rowsToAddToCart().length; items++) {
          if (widget.rowsToAddToCart()[items].productName() != "") {
            var orderFields = { "productName": "", "catRefId": "" };
            var fields = widget.rowsToAddToCart()[items];
            orderFields['productQuantity'] = fields.productQuantity();
            orderFields['productName'] = fields.productName();
            orderFields['catRefId'] = fields.catRefId;
            fieldsArr.push(orderFields);
            // console.log(orderFields);
          }
        }


        $.Topic('Quick_Order_Details.memory').publish(fieldsArr)
        navigation.goTo("/QuickOrderPage");
      },
      addToQuickOrder: function (param) {
        var widget = this;
        var newProduct = {};
        widget.selectedItems.push(param);
        //if (param.numberOfSKUs == 1 || param.selectedFromDialog) {
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
        // } else if (param.numberOfSKUs > 1) {
        // widget.handleQuickViewClick(widget.popupId, ProductViewModel, param.id);
        //}
      },
      addToRow: function (item) {
        var widget = this;
        widget.skuList()[widget.activeSearchBoxIndex()] = item.childSKUs[0].repositoryId;
        widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].productName(item.displayName);
        var nameToDisplay = item.displayName + '    ' + item.childSKUs[0].repositoryId;
        widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].productDisplay(nameToDisplay);
        widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].productQuantity(item.orderQuantity);
        widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].catRefId = item.childSKUs[0].repositoryId;
        widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].recordId(item.recordId);
        widget.rowsToAddToCart()[widget.activeSearchBoxIndex()].quotingCatId(item.quotingCategoryIDs);
        // console.log("add to rowwwww",widget.rowsToAddToCart());
        $(".modal").modal("hide");
      },
      removeRow: function (data, event) {
        console.log("event", event);
        // var currentEventTarget = event.currentTarget;
        $(event.currentTarget).parents(".QuickAddInputbox").remove();
        $(".inputqtybox1").val('');
        //  $(event.currentTarget).closest('.QuickAddInputbox').remove();
        // var cloneIndex = $(".quick-order-query").length;  
        //  console.log("cloneIndex",cloneIndex);  
        //  $('.right-inner-addon').remove();
        //  console.log( $(this).closest('.right-inner-addon').remove());  
      },
      updateQuantity: function (data, event, id) {
        console.log("data for updatableQuantity", event.type);
        if ('click' === event.type || ('keypress' === event.type && event.keyCode === 13) || 'blur' === event.type) {
          console.log("UpdatedQuantity")
          if (data.updatableQuantity && data.updatableQuantity.isValid()) {
            console.log("data is valid");
            $.Topic(pubsub.topicNames.CART_UPDATE_QUANTITY).publishWith(
              data.productData(), [{ "message": "success", "commerceItemId": data.commerceItemId }]);
            var button = $('#' + id);
            button.focus();
            button.fadeOut();
          }
        } else {
          this.quantityFocus(data, event);
        }
        return true;

      },
      quantityFocus: function (data, event) {
        var field = $('#' + event.target.id);
        var button = field.siblings("p").children("button");
      },

      createNewRow: function () {
        var widget = this;


        widget.rowsToAddToCart.push({
          productDisplay: ko.observable(""),
          productName: ko.observable(""),
          productQuantity: ko.observable(1),
          errorMessage: ko.observable(""),
          catRefId: "",
          recordId: ko.observable(""),
          quotingCatId: ko.observable("")
        });
        console.log('rowsAddTocart.........', widget.rowsToAddToCart().length);


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
            params: 2,
            message: widget.translate('quantitySmallerThanMsg', {
              quantity: 100
            })
          }
        });

      },
      lastRowCheck: function (index) {
        var widget = this;
        if (index == widget.rowsToAddToCart().length - 1) {
          //console.log("last row check");
          widget.createNewRow();
        }
      },
      searchSelected: function (index) {
        var widget = this;
        widget.activeSearchBoxIndex(index);
      },

      afterBlur: function (index, data, event) {
          
          console.log("parent.......", data);
          console.log("index.......", index);
          console.log("event.......", event);
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
                              <img class = 'typeaheadProductThumbnail visible-md visible-lg img-responsive'/> \
                          <span class = 'typeaheadProductName'> </span> \ </a></li>"
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
        //   $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD).publishWith({
        //     searchText: self.query,
        //     recordsPerPage: 5,
        //     recordOffSet: 0
        //   }, [{
        //     message: "success"
        //   }]);

        };

        this.timer = setTimeout(delayedSearch, 300);

      },

			/**
			 * @override
			 * Function to handle search result once published from search.js
			 * @param {result} success/failure message
			 */
      typeaheadResults: function (result) {
          console.log("inside typeaheadddd resultssss");
        if (self && self.options && (document.activeElement.className.indexOf('quick-order-query') > -1)) {
          var sourceArray = [];
          var searchResults = this[0] ? this[0] : [];
          var testResults = this[1] ? this[1] : [];
          var variantName, variantValue;

          $.each(testResults, function (i, item) {
            // console.log("resultsssss",item);
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
              product.recordId = this.records[0].attributes["sku-MedicalAesthetics.x_recordId"] ? this.records[0].attributes["sku-MedicalAesthetics.x_recordId"][0] : '';
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
          // console.log("itemitem",item)
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
          //i.find('.typeaheadProductPrice').text(formattedPrice);

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
        //	console.log("typeaheadSelecttypeaheadSelect",itemId)
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
      customTypeAheadService : function() {
            var l = {};
            var nrParam = storageApi.getInstance().getItem("nrParam");
            var searchQuery = '/ccstoreui/v1/assembler/assemble?Ntt=' + self.query + 
                                '&Ntk=' + CCConstants.TYPEAHEAD_SEARCH_INTERFACE + 
                                '&searchType=' + CCConstants.TYPEAHEAD_SEARCH_INTERFACE + 
                                '&language=en&path=' + CCConstants.ASSEMBLER_DEFAULT_TYPEAHEAD_PATH + 
                                '&redirects=yes&site=default&No=0&Nrpp=100&'+ 
                                nrParam;
            console.log('searchQuery',searchQuery)
    		ccRestClient.authenticatedRequest(searchQuery, l, function (result) {
                console.log("search dataaaaa",result);
                 var messageDetails = [{message: CCConstants.SEARCH_MESSAGE_SUCCESS}];
                if (result['@error']) {
                  log.error("search error returned :" + result['@error']);
        
                  messageDetails = [{message: CCConstants.SEARCH_MESSAGE_FAIL}];
                }
                
                // don't update result model or both result lists are updated when on
                // search results page. Just pass through what's needed
                var searchResults = [];
                
                if((result.resultsList) && (result.resultsList.records)) {
                  var typeaheadResults = [];
                  searchResults = result.resultsList.records;
                  searchResDetails.update(result);
                  typeaheadResults.push(searchResDetails.searchResults);
                  typeaheadResults.push(searchResults);
                }
                
                $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_UPDATED).publishWith(typeaheadResults,[{message:"success"}]);
            }, function(data) {
                var messageDetails = [{message: CCConstants.SEARCH_MESSAGE_FAIL}];
                var searchResults = [];
                $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_UPDATED).publishWith(searchResults,[{message:"success"}]);
                });    
         
      },    
      // 			External pricing call method

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


      // Externaldata
      addNewItemToCart: function (newProduct) {
        var widget = this;
        prdAddToBagArray = newProduct;
        if (prdAddToBagArray.length > 1) {
          widget.cart().addItem(prdAddToBagArray[0]);
          widget.isCartAdded(true);
        } else {
          $.Topic(pubsub.topicNames.CART_ADD).publishWith(
            prdAddToBagArray[0], [{
              message: "success"
            }]);
            widget.destroySpinner();
          widget.selectedItems = [];
        }
      },

      generateQuotingcatIds: function (quotingIds) {     
        console.log("quotingIds", quotingIds);
        if (quotingIds) {
          return quotingIds.replace(/\n/ig, "");
        }
      },

      onLoad: function (widget) {
          widgetModel = widget;
        $('#CC-headermodalpane').modal('hide');
        $('.modal-backdrop').remove();
        widget.selectedItems = [];
        $(document).on('click', '.preventDefault', function (e) {
          e.stopPropagation();
          e.preventDefault();
        });
        $(document).on('click', '#MobileNav a', function () {
          if(!$(this).hasClass("dropdown-toggle")) {
              $("#MobileNav").hide();
          }
        });
        // add the below if selecting an option should close the dropdown
        // $('.dropdown-menu option, .dropdown-menu select').change(function(e) {
        //   $('.dropdown.open .dropdown-toggle').dropdown('toggle').blur();
        // });
        $.Topic(pubsub.topicNames.CART_PRICE_COMPLETE).subscribe(function () {
          if (widget.isCartAdded()) {
            prdAddToBagArray.shift();
            if (prdAddToBagArray.length > 0) {
              if (prdAddToBagArray.length !== 1) {
                widget.cart().addItem(prdAddToBagArray[0]);
              } else {
                widget.selectedItems = [];
                widget.isCartAdded(false);
                widget.destroySpinner();
                $.Topic(pubsub.topicNames.CART_ADD).publishWith(
                  prdAddToBagArray[0], [{
                    message: "success"
                  }]);
              }
            }
          }
        });
        var isMegaMenuExpanded = false;
        ccLogger.info('on header load cart contains ' + widget.cart().items().length);

        var l = {};
        l['fields'] = 'childCategories(items)';
        l['expand'] = 'childCategories';
        l['catalogId'] = widget.user().catalogId();
        l['maxLevel'] = '1000';
        ccRestClient.authenticatedRequest("/ccstoreui/v1/collections/rootCategory", l, function (data) {
          //console.log(data);
          widget.collectionMenu(data.items);
          //	console.log("collectionMenu",widget.collectionMenu());      
        }, function (data) { }, "GET");

        // save the links in an array for later
        widget.linkList.removeAll();

        for (var propertyName in widget.links()) {
          widget.linkList.push(widget.links()[propertyName]);
        }
        // compute function to create the text for the cart link  "0 items - $0.00" "1 item - $15.25" "2 items - $41.05"
        widget.cartLinkText = ko.computed(function () {
          var cartSubTotal, linkText, numItems;
          var currencySymbol = widget.cart().currency.symbol;
          var cartSubTotal = widget.formatPrice(widget.cart().subTotal(), widget.cart().currency.fractionalDigits);
          if (currencySymbol.match(/^[0-9a-zA-Z]+$/)) {
            currencySymbol = currencySymbol + ' ';
          }
          numItems = widget.ccNumber(widget.cart().numberOfItems());         
             widget.miniCartQty(numItems);
          // use the CCi18n to format the text avoiding concatination  "0 items - $0.00"
          // we need to get the currency symbol from the site currently set to a $
          linkText = CCi18n.t('ns.common:resources.cartDropDownText',
            { count: widget.cart().numberOfItems(), formattedCount: numItems, currency: currencySymbol, totalPrice: cartSubTotal });
          return linkText;
        }, widget);
        var isiPad = navigator.userAgent.match(CCConstants.IPAD_STRING) != null;
        if (isiPad) {
          $(window).on('touchend', function (event) {
            if (!($(event.target).closest('#dropdowncart').length)) {
              //close the mini cart if clicked outside minicart
              $('#dropdowncart > .content').fadeOut('slow');
              $('#dropdowncart').removeClass('active');
            }
            if (!($(event.target).closest('#languagedropdown').length)) {
              //close the language picker if clicked outside language picker
              $('#languagedropdown > .content').fadeOut('slow');
              $('#languagedropdown').removeClass('active');
            }
            if (!($(event.target).closest('#CC-megaMenu').length)) {
              //close the mega menu if clicked outside mega menu
              $('li.cc-desktop-dropdown:hover > ul.dropdown-menu').css("display", "none");
              isMegaMenuExpanded = false;
            }
            else {
              if ($(event.target).closest('a').next('ul').length === 0) {
                return true;
              }
              //for ipad, clicking on megaMenu should show the megaMenu drop down, clicking again will take to the category page
              if (!isMegaMenuExpanded && $(window).width() >= CCConstants.VIEWPORT_TABLET_UPPER_WIDTH) {
                isMegaMenuExpanded = true;
                return false;
              } else if (isMegaMenuExpanded && $(event.target).closest('a').attr('href') === navigation.getRelativePath()) {
                return false;
              } else {
                return true;
              }
            }
          });
        }
        //  widget.externalData(widget);
      },
      beforeAppear: function (page) {   
        $('#CC-headermodalpane').modal('hide');
        $('.modal-backdrop').remove();
        var widget = this;
        widget.isCartAdded(false);
        widget.selectedItems = [];
        if (widget.user().loggedIn() === true) {
          var accountbrandroute = [];
          // console.log("hiiii111",widget);
          var catalogBrandsObj = "";
         var tempBrandsArray = [];
         var accBrand = this.user().currentOrganization().account_catalog_brands;
         if(helper.isHTML(accBrand)) {
             catalogBrandsObj = $(accBrand);
             if (catalogBrandsObj[0].textContent) {
              tempBrandsArray = catalogBrandsObj[0].textContent.split('|');
               widget.accountLevelBrandName(tempBrandsArray);
            }
         } else {
             catalogBrandsObj = accBrand;
             tempBrandsArray = catalogBrandsObj.split('|');
               widget.accountLevelBrandName(tempBrandsArray);
         }
        }
        widget.rowsToAddToCart.removeAll();
        widget.skuList.removeAll();
        for (var loadInitialRows = 0; loadInitialRows < 5; loadInitialRows++) {
          widget.createNewRow();
        }
        $('#MobileNav').css('display', 'none');
        // if ( $(window).width() < 767 ) { 
        //      $("#resource").append("</br>");        
        // }
      },

      /**
       * key press event handle
       * 
       * data - knockout data 
       * event - event data
       */
      keypressHandler: function (data, event) {


        var self, $this, keyCode;

        self = this;
        $this = $(event.target);
        keyCode = event.which ? event.which : event.keyCode;

        if (event.shiftKey && keyCode == CCConstants.KEY_CODE_TAB) {
          keyCode = CCConstants.KEY_CODE_SHIFT_TAB;
        }
        switch (keyCode) {
          case CCConstants.KEY_CODE_TAB:
            if (!($this[0].id === "CC-header-cart-total")) {
              this.handleCartClosedAnnouncement();
              $('#dropdowncart').removeClass('active');
            }
            break;

          case CCConstants.KEY_CODE_SHIFT_TAB:
            if ($this[0].id === "CC-header-cart-total") {
              this.handleCartClosedAnnouncement();
              $('#dropdowncart').removeClass('active');
            }
        }
        return true;
      },

      showDropDownCart: function () {

        // Clear any previous timeout flag if it exists
        if (this.cartOpenTimeout) {
          clearTimeout(this.cartOpenTimeout);
        }

        // Tell the template its OK to display the cart.
        this.cartVisible(true);

        $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.common:resources.miniCartOpenedText'));
        $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.common:resources.miniCartOpenedText'));

        notifications.emptyGrowlMessages();
        this.computeDropdowncartHeight();
        //this['header-dropdown-minicart'].currentSection(1);
        if(!$('#dropdowncart').hasClass('active')){
          this.computeMiniCartItems();
          $('#dropdowncart').addClass('active');
          $('#dropdowncart > .content').fadeIn('slow');
      }

        var self = this;
        $(document).on('mouseleave', '#dropdowncart', function () {
          self.handleCartClosedAnnouncement();
          $('#dropdowncart > .content').fadeOut('slow');
          $(this).removeClass('active');
        });

        // to handle the mouseout/mouseleave events for ipad for mini-cart
        var isiPad = navigator.userAgent.match(CCConstants.IPAD_STRING) != null;
        if (isiPad) {
          $(document).on('touchend', function (event) {
            if (!($(event.target).closest('#dropdowncart').length)) {
              self.handleCartClosedAnnouncement();
              $('#dropdowncart > .content').fadeOut('slow');
              $('#dropdowncart').removeClass('active');
            }
          });
        }
      },

      hideDropDownCart: function (data, event) {
     //   event.stopImmediatePropagation();
        // Tell the template the cart should no longer be visible.
        this.cartVisible(false);

        $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.common:resources.miniCartClosedText'));
        $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.common:resources.miniCartClosedText'));
        setTimeout(function () {
          $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
          $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
        }, 1000);

        $('#dropdowncart > .content').fadeOut('slow');
        $('#dropdowncart').removeClass('active');

        // Clear the timeout flag if it exists
        if (this.cartOpenTimeout) {
          clearTimeout(this.cartOpenTimeout);
        }

        return true;
      },

      toggleDropDownCart: function () {


        this.showDropDownCart();
        if ($('#dropdowncart').hasClass('active')) {
          this.hideDropDownCart();
        } else {
          this.showDropDownCart();
        }
      },

      // Sends a message to the cart to remove this product
      handleRemoveFromCart: function () {
        $.Topic(pubsub.topicNames.CART_REMOVE).publishWith(
          this.cartItem.productData(), [{ "message": "success", "commerceItemId": this.cartItem.commerceItemId, "shippingGroup": this.shippingGroupRelationship }]);
      },

      // Sends a message to the cart to remove this placeholder
      handlePlaceHolderRemove: function () {
        $.Topic(pubsub.topicNames.PLACE_HOLDER_REMOVE).publish(this);
      },

      /**
       * validate the cart items stock status as per the quantity. base on the 
       * stock status of cart items redirect to checkout or cart
       */
      handleValidateCart: function (data, event) {
        // returns if the profile has unsaved changes.
        if (data.user().isUserProfileEdited()) {
          return true;
        }
        data.cart().validatePrice = true;
        if (navigation.getRelativePath() == data.links().cart.route) {
          data.cart().skipPriceChange(true);
        }
        $.Topic(pubsub.topicNames.LOAD_CHECKOUT).publishWith(data.cart(), [{ message: "success" }]);
      },

      handleDropDownCheckout: function (data, event) {
        this.hideDropDownCart();
        this.handleValidateCart(data, event);
      },

      /**
       * Invoked to skip the repetitive navigation for assistive technologies
      */
      skipToContentHandler: function () {
        var id, i, regionsRendered = this;
        for (i = 0; i < regionsRendered.length; i++) {
          if (regionsRendered[i].type() === CCConstants.REGION_TYPE_BODY) {
            break;
          }
        }
        if (i == regionsRendered.length) {
          id = $("#main .row .redBox div:first-child").attr("id");
        } else {
          id = 'region-' + regionsRendered[i].name();
        }

        var idGen = "#" + id + " :focusable";
        if (idGen) {
          $(idGen).first().focus();
        }
      },

      /**
       * Process the Nr parameter by removing product.priceListPair or product.language
       */
      processNrParameter: function (data, source) {
        if (data.indexOf('(') === -1) {
          return data;
        }
        var rightToken = data.split('(')[1];
        var parseString = rightToken.split(')')[0];
        var tokenizedKeys = parseString.split(',');
        var finalString = '';
        for (var i = 0; i < tokenizedKeys.length; i++) {
          if (tokenizedKeys[i].indexOf('product.priceListPair') !== -1 && source === 'currency-picker') {
            continue;
          } else if (tokenizedKeys[i].indexOf('product.language') !== -1 && source === 'language-picker') {
            continue;
          }
          if (finalString === '') {
            finalString = tokenizedKeys[i];
          } else {
            finalString = finalString + "," + tokenizedKeys[i];
          }
        }
        finalString = data.split('(')[0] + '(' + finalString;
        finalString = finalString + ')' + data.split(')')[1];
        return finalString;
      },

      /**
       * Hand the aria announcement when the minicart is closed
       */
      handleCartClosedAnnouncement: function () {
        if ($('#dropdowncart').hasClass('active')) {
          $('#alert-modal-change').text(CCi18n.t('ns.common:resources.miniCartClosedText'));
          $('#CC-header-cart-total').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
          $('#CC-header-cart-empty').attr('aria-label', CCi18n.t('ns.header:resources.miniShoppingCartTitle'));
        }
      },


      openNav: function () {
          console.log("openNav called............")
        $('#MobileNav').css('display', 'block');
      },

      closeNav: function () {
        $('#MobileNav').css('display', 'none');
      },
      loginShow: function () {
        this.closeNav();
        $('#CC-loginHeader-login').trigger('click');
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

    };
  }
);