/**
 * @fileoverview productAddToSpaceWidget
 *
 */
/*global window: false, Image: false, document: false */
define(

//-------------------------------------------------------------------
// DEPENDENCIES
//-------------------------------------------------------------------
['jquery', 'knockout', 'pubsub', 'notifier', 'ccLogger', 'swmRestClient', 'swmKoValidateRules', 'placeholderPatch', 'ccConstants', 'CCi18n'],

//-------------------------------------------------------------------
// MODULE DEFINITION
//-------------------------------------------------------------------
function($, ko, PubSub, notifier, logger, swmRestClient, swmKoValidateRules, placeholder, CCConstants, CCi18n) {

  "use strict";

  return {

    WIDGET_ID: 'productAddToSpace',
    spaceOptionsArray: ko.observableArray([]),
    resumeAddProductToSpaceWorkflow : ko.observable(false),
    spaceName: ko.observable(''),
    newSpaceAccessLevel : ko.observable("0"),
    mySpaces: ko.observableArray([]),
    productToAdd: null,
    errBadRequestSpaceName: ko.observable(false),
    createSpaceName: ko.observable(''),
    createSpaceAccessLevel : ko.observable('0'),
    createSpaceSelectorName: ko.observable(''),
    createSpaceSelectorAccessLevel : ko.observable('0'),

    /**
     * Runs the first time the module is loaded on a page.
     * It is passed the widgetViewModel which contains the configuration from the server.
     */
    onLoad : function(widget) {

      swmRestClient.init(widget.site().tenantId, widget.isPreview(), widget.locale());
      widget.addToSpaceLoginSuccessCallback = widget.addToSpaceLoginSuccessCallback.bind(widget);
      $.Topic(PubSub.topicNames.USER_LOGIN_SUCCESSFUL).subscribe(widget.addToSpaceLoginSuccessCallback);
      $.Topic(PubSub.topicNames.USER_AUTO_LOGIN_SUCCESSFUL).subscribe(widget.addToSpaceLoginSuccessCallback);

      $.Topic(PubSub.topicNames.SOCIAL_SPACE_ADD).subscribe(function(obj) {
        // keep a reference to the product we'll be adding
        widget.productToAdd = this;
        widget.addToSpaceInit();
      });

      $.Topic(PubSub.topicNames.SOCIAL_SPACE_ADD_SUCCESS).subscribe(function(obj) {
        widget.successMessageProductName = ko.observable(obj.displayName);
        widget.successMessageSpaceName = ko.observable(obj.spaceName);
        var wlLinkObj = {url: widget.links().wishlist.route + '/' + obj.spaceId};
        widget.successMessageSpaceIdLink = ko.observable(wlLinkObj);
        if (obj.productUpdated){
          notifier.sendTemplateSuccess(widget.WIDGET_ID, widget, widget.notificationTemplateUrl('product-content-updated-template'), true); 
        }
        else {
          notifier.sendTemplateSuccess(widget.WIDGET_ID, widget, widget.notificationTemplateUrl('product-content-created-template'), true);
        }
      });
      
      $.Topic(PubSub.topicNames.SOCIAL_SPACE_ADD_TO_SELECTED_SPACE).subscribe(function(obj) {
        // keep a reference to the product we'll be adding
        widget.productToAdd = this;
        widget.addToSpaceSelected(obj.spaceid, obj.spaceNameFull());
      });
      
      $.Topic(PubSub.topicNames.SOCIAL_SPACE_SELECTOR_ADD).subscribe(function(obj) {
        widget.productToAdd = this;
        widget.addToSpaceInit();
        
        // attach handler to shown.bs.modal to process after css transitions
	      $('#SWM-modalContainer').one('shown.bs.modal', function () {
	        var elem = $('#SWM-space-selector').val('createnewspace');
	        
          $('#SWM-space-name-div').removeClass('hide');
          //put focus on the text box
          $('#SWM-addToSpace-name').focus();
	      });
      });
      
      // add Validation
      widget.addSpaceValidation();
    },

    /**
     * Display the Add To Space modal
     */
    addToSpaceInit: function() {
      var widget = this;

      // if user is NOT logged in, prompt for login
      if (!widget.user().loggedIn()) {
        //flag to resume Add Product to Wishlist process after login or create account success.
        widget.resumeAddProductToSpaceWorkflow(true);
        
        //trigger the login modal
        $.Topic(PubSub.topicNames.USER_UNAUTHORIZED).publish();
        
        // Attach event listener, if the user cancel or exits the login/registration modal, cancel the Add Product to Wishlist process.
        $('#CC-headermodalpane').one('hidden.bs.modal', function() {
          if (!widget.user().loggedIn()){ // user is not logged in at the time the login modal is hidden, therefore he's cancelling the add product to wishlist flow.
            widget.resumeAddProductToSpaceWorkflow(false); 
          }
        });
      }
      // otherwise, display modal to add product to space
      else {
        var errorCB = function(resultStr, status, errorThrown) {
          notifier.clearSuccess(widget.WIDGET_ID);
          notifier.clearError(widget.WIDGET_ID);
          notifier.sendError(widget.WIDGET_ID, widget.translate('spaceAddProductError'), true);
        };
        var successCB = function(result) {
          var mySpaceOptions = [];
          var joinedSpaceOptions = [];
          if (result.response.code.indexOf("200") === 0) {
            result.items.forEach( function(space){
              var spaceOption = {
                spaceid: space.spaceId,
                spaceNameFull: space.spaceName,
                spaceNameFormatted : ko.computed(function(){
                  if (space.creatorId == swmRestClient.apiuserid) {
                    return space.spaceName;
                  }
                  return space.spaceName + " (" + space.creatorFirstName + " " + space.creatorLastName + ")";
                }, widget),
                spaceNameAbbr: space.spaceName.substr(0,41)
              };

              // if user created the space, add it to My Spaces, otherwise add it to Joined Spaces
              if (space.creatorId == swmRestClient.apiuserid) {
                if (spaceOption.spaceNameFull.length > 42) {
                  spaceOption.spaceNameAbbr += "...";
                }
                mySpaceOptions.push(spaceOption);
              }
              else {
                spaceOption.spaceNameFull += " (" + space.creatorFirstName + " " + space.creatorLastName + ")";
                spaceOption.spaceNameAbbr = spaceOption.spaceNameFull.substr(0,41);
                if (spaceOption.spaceNameFull.length > 42) {
                  spaceOption.spaceNameAbbr += "...";
                }
                joinedSpaceOptions.push(spaceOption);
              }
            });

            // sort each group alphabetically
            mySpaceOptions.sort(function(opt1, opt2) {
              if (opt1.spaceNameFull > opt2.spaceNameFull) {
                return 1;
              } else if (opt1.spaceNameFull < opt2.spaceNameFull) {
                return -1;
              } else {
                return 0;
              }
            });

            joinedSpaceOptions.sort(function(opt1, opt2) {
              if (opt1.orderIndex > opt2.orderIndex) {
                return 1;
              } else if (opt1.orderIndex < opt2.orderIndex) {
                return -1;
              } else {
                return 0;
              }
            });

            var groups = [];
            var mySpacesGroup = {
              label: CCi18n.t('ns.productaddtospace:resources.mySpacesGroupText'),
              children: mySpaceOptions
            };
            var joinedSpacesGroup = {label: CCi18n.t('ns.productaddtospace:resources.joinedSpacesGroupText'), children: joinedSpaceOptions};

            var createOptions = [];
            var createNewOption = {
              spaceid: "createnewspace",
              spaceNameFull: CCi18n.t('ns.productaddtospace:resources.createNewSpaceOptText'),
              spaceNameFormatted: CCi18n.t('ns.productaddtospace:resources.createNewSpaceOptText'),
              spaceNameAbbr: CCi18n.t('ns.productaddtospace:resources.createNewSpaceOptText')
            };
            createOptions.push(createNewOption);
            var createNewSpaceGroup = {
              label: "",
              children: createOptions
            };

            groups.push(mySpacesGroup);
            //if there are no joined spaces, omit the group
            if (joinedSpaceOptions.length > 0){
              groups.push(joinedSpacesGroup); 
            }
            groups.push(createNewSpaceGroup);
            widget.spaceOptionsArray(groups);
            widget.mySpaces(mySpaceOptions);

            widget.showAddToSpaceModal();
            widget.onSpaceSelectionChange(widget);
          }
        };

        swmRestClient.request("GET", '/swm/rs/v1/sites/{siteid}/spaces', '', successCB, errorCB, {});
      }
    },

    /**
     * Login callback used when Add To Space is clicked but user is not logged in
     */
    addToSpaceLoginSuccessCallback: function() {
      var widget = this;
      if (widget.resumeAddProductToSpaceWorkflow()){
        widget.addToSpaceInit();
      }
    },
    
    /**
     * Add space validation
     */
    addSpaceValidation : function() {
      var widget = this;
      widget.spaceName.extend({
        required: {
          message: widget.translate('emptyNameMsg')
        }
      }).extend({
        uniquespacename: {
          params: widget.mySpaces,
          message: widget.translate('uniqueNameMsg')
        }
      }).extend({
        badrequestspacename: {
          message: widget.translate('uniqueNameMsg'),
          onlyIf: widget.errBadRequestSpaceName
        }
      });
      
      widget.createSpaceName.extend({
	      required: {
	        message: widget.translate('emptyNameMsg')
	      }
	    }).extend({
	      uniquespacename: {
	        params: widget.mySpaces,
	        message: widget.translate('uniqueNameMsg')
	      }
	    }).extend({
	      badrequestspacename: {
	        message: widget.translate('uniqueNameMsg'),
	        onlyIf: widget.errBadRequestSpaceName
	      }
	    });
	    
	    widget.createSpaceSelectorName.extend({
	      required: {
	        message: widget.translate('emptyNameMsg')
	      }
	    }).extend({
	      uniquespacename: {
	        params: widget.mySpaces,
	        message: widget.translate('uniqueNameMsg')
	      }
	    }).extend({
	      badrequestspacename: {
	        message: widget.translate('uniqueNameMsg'),
	        onlyIf: widget.errBadRequestSpaceName
	      }
	    });
    },
    
    /**
     * Handler for space selection changes within the Add to Space modal
     */
    onSpaceSelectionChange: function() {
      var widget = this;

      var elem = $('#SWM-space-selector')[0];
      if (elem && elem.options.length > 0) {
        var spaceid = elem.options[elem.selectedIndex].value;
        widget.spaceName.isData = true;

        if (spaceid == 'createnewspace') {
          $('#SWM-space-name-div').removeClass('hide');
          //put focus on the text box
          $('#SWM-addToSpace-name').focus();
        }
        else{
          $('#SWM-space-name-div').addClass('hide');
        }
      }
    },

    /**
     * Shows the Add To Space modal
     */
    showAddToSpaceModal : function() {
      var widget = this;
      // clear out input fields

      widget.spaceName('');

      // remove validations on observables after css transitions
      $('#SWM-modalContainer').one('hidden.bs.modal', function(){
        widget.spaceName('');
        widget.spaceName.isModified(false);
        widget.errBadRequestSpaceName(false);
        widget.newSpaceAccessLevel("0");
        $('#SWM-space-name-div').addClass('hide');
      });

      // attach handler to hide.bs.modal to process before css transitions
      $('#SWM-modalContainer').one('hide.bs.modal', function() {
        //hide the contents under the modal
        $('#SWM-modalPane').hide();
      });

      // attach handler to show.bs.modal to process before css transitions
      $('#SWM-modalContainer').one('show.bs.modal', function () {
        //show the contents under the modal
        $('#SWM-modalPane').show();
      });

      // attach handler to shown.bs.modal to process after css transitions
      $('#SWM-modalContainer').one('shown.bs.modal', function () {
        //put focus on the text box
        $('#SWM-addToSpace-comment').focus();
      });

      // After attaching event handlers to modal, SWM-modalContainer, now open the modal
      $('#SWM-modalContainer').modal('show');
    },

    createSpaceInputUnmodified : function() {
      var widget = this;
      widget.spaceName.isModified(false);
    },
  
    handleCancelAddToSpace: function() {
      var widget = this;

      $('#SWM-modalPane').hide();
      widget.closeModalById('#SWM-modalContainer');
    },

    /**
     * Contacts SWM server to add this product to a selected space
     */
    handleAddToSpace: function() {
      var widget = this;

      if (widget.productToAdd === null) {
        alert('no product!');
        return;
      }

      // get selected space
      var elem = $('#SWM-space-selector')[0];
      var spaceid = elem.options[elem.selectedIndex].value;

      // callbacks for adding product to space
      var emptyCB = function(result) {};
      var errorCB = function(err) {
        var errResponse = JSON.parse(err);
        notifier.clearSuccess(widget.WIDGET_ID);
        notifier.clearError(widget.WIDGET_ID);
        
        if (errResponse['o:errorCode'] === "403.4") {
          var errMsg = widget.translate('productAddMaxProductsMsg');
          notifier.sendError(widget.WIDGET_ID, errMsg, true);
        }
        else {
          notifier.sendError(widget.WIDGET_ID, widget.translate('spaceAddProductError'), true);
        }

        // reset the product for next time, we've added it already
        widget.productToAdd = null;
      };

      var successCB = function(result) {
        if (result.response.code.indexOf("200") === 0 || result.response.code.indexOf("201") === 0) {
          notifier.clearSuccess(widget.WIDGET_ID);
          notifier.clearError(widget.WIDGET_ID);
          // Duplicate SKU was found so product content updated
          var productUpdated = result.response.code.indexOf("200") === 0 ? true : false;
          // Attach and pass in productUpdated boolean flag to Topic subscribers
          addToSpaceData.productUpdated = productUpdated;
          $.Topic(PubSub.topicNames.SOCIAL_SPACE_ADD_SUCCESS).publishWith(widget.productToAdd, [addToSpaceData]);

          var contentid = result.contentId;

          var errorCB = function(err) {};

          // If product content was CREATED AND there is a file extension in primaryFullImageURL, upload product media
          if (!productUpdated && widget.productToAdd.primaryFullImageURL.lastIndexOf(".") > 0) {
            var fileExt = widget.productToAdd.primaryFullImageURL.slice(widget.productToAdd.primaryFullImageURL.lastIndexOf("."));
            var prodImg = new Image();
            prodImg.src = widget.productToAdd.primarySmallImageURL;
            prodImg.onload = function() {
              var imgContents = widget.imageToBase64(this, fileExt);
  
              var mediaJson = {
                file: imgContents,
                fileName: "productImage" + fileExt
              };
  
              var mediaSuccessCB = function(result) {
                // do not wait on this call since the image will be virus scanned and the result is irrelevant
              };
  
              // now add media image and comment to product post
              swmRestClient.request("POST", '/swm/rs/v1/spaces/{spaceid}/products/{contentid}/media',
                mediaJson, mediaSuccessCB, errorCB, {"spaceid":spaceid, "contentid":contentid});
            };
          }

          // reset the product for next time, we've added it already
          widget.productToAdd = null;
        }
      };

      if (spaceid == "createnewspace") {
        widget.spaceName.isModified(true);
        this.spaceName(this.spaceName().trim());
        widget.errBadRequestSpaceName(false);
        if (!this.spaceName.isValid()) {
          return;
        }

        var createSpaceErrorCB = function(err) {
          var errResponse = JSON.parse(err);
	        if (errResponse['o:errorCode'] === "403.4") {
	          var errMsg = widget.translate('spaceCreateMaxSpacesMsg');
	          notifier.sendError(widget.WIDGET_ID, errMsg, true);
	          $('#SWM-modalPane').hide();
          	$('#SWM-modalContainer').modal('hide');
	        }
          else if (errResponse['o:errorCode'] === "409.0") {
            widget.errBadRequestSpaceName(true);
          }
        };

        var createSpaceSuccessCB = function(result) {        
          if (result.response.code.indexOf("201") === 0) {
            $.Topic(PubSub.topicNames.SOCIAL_REFRESH_SPACES).publish(true);
            spaceid = result.spaceId;
            addToSpaceData.spaceId = result.spaceId; 
            // figure out sale price, if any
            var productToAddSalePrice = "";
            if (widget.productToAdd.childSKUs[0].salePrice != null) {
              productToAddSalePrice = JSON.stringify(widget.productToAdd.childSKUs[0].salePrice);
            }

            var productTitleToAdd = widget.productToAdd.displayName ? widget.productToAdd.displayName : '';
            
            var json = {
                // instantiate minimum payload
                productTitle: productTitleToAdd,
                productPrice: widget.productToAdd.childSKUs[0].listPrice,
                productSalePrice: productToAddSalePrice,
                productUrl: widget.productToAdd.route,
                productProductId: widget.productToAdd.id,
                productSkuId: widget.productToAdd.childSKUs[0].repositoryId,
                productVariantOptions: JSON.stringify(widget.productToAdd.selectedOptions),
                productCurrencyCode: widget.site().selectedPriceListGroup().currency.currencyCode,
                notificationProductPrice : widget.site().selectedPriceListGroup().currency.symbol + widget.formatPrice(widget.productToAdd.childSKUs[0].listPrice, widget.site().selectedPriceListGroup().currency.fractionalDigits)
            };
            
            if (widget.productToAdd.primarySmallImageURL && widget.productToAdd.primarySmallImageURL != 'no-image') {
              // if there is a primarySmallImageURL in ProductViewModel AND primarySmallImageURL value is not 'no-image', then include productImageUrl in request payload.
            	json.productImageUrl = window.location.protocol + "//" + window.location.host + widget.productToAdd.primarySmallImageURL;
            }
            
            if (widget.productToAdd.desiredQuantity && widget.productToAdd.desiredQuantity < 1000 ) {  
              // include desiredQuantity in payload, if productDesiredQuanity is set or is less than or equal to 1000.
              json.productDesiredQuantity = widget.productToAdd.desiredQuantity; 
            }
            
            if (json.productSalePrice) {
              // if product is on sale, update payload.notificationProductPrice to be sale price.
              json.notificationProductPrice = widget.site().selectedPriceListGroup().currency.symbol + widget.formatPrice(widget.productToAdd.childSKUs[0].salePrice, widget.site().selectedPriceListGroup().currency.fractionalDigits);
            }

            // call SWM server to add product to space
            notifier.clearSuccess(widget.WIDGET_ID);
            notifier.clearError(widget.WIDGET_ID);
            swmRestClient.request("POST", '/swm/rs/v1/spaces/{spaceid}/products',
              json, successCB, errorCB, {"spaceid":spaceid} );
          }

          $('#SWM-modalPane').hide();
          widget.closeModalById('#SWM-modalContainer');
        };

        var json = {
          siteId: swmRestClient.siteid,
          spaceName: $('#SWM-addToSpace-name')[0].value.trim(),
          spaceDescription: 'sample description from storefront',
          accessLevel: widget.newSpaceAccessLevel()
        };

        var addToSpaceData = {
          displayName: widget.productToAdd.displayName,
          spaceName: $('#SWM-addToSpace-name')[0].value,
          productId: widget.productToAdd.id
        };

        // call SWM server to create space
        swmRestClient.request("POST", '/swm/rs/v1/spaces', json, createSpaceSuccessCB, createSpaceErrorCB);
      }
      else {

        // figure out sale price, if any
        var productToAddSalePrice = "";
        if (widget.productToAdd.childSKUs[0].salePrice != null) {
          productToAddSalePrice = JSON.stringify(widget.productToAdd.childSKUs[0].salePrice);
        }
        
        var productTitleToAdd = widget.productToAdd.displayName ? widget.productToAdd.displayName : '';
        var json = {
            productTitle: productTitleToAdd,
            productPrice: JSON.stringify(widget.productToAdd.childSKUs[0].listPrice),
            productSalePrice: productToAddSalePrice,
            productUrl: widget.productToAdd.route,
            productProductId: widget.productToAdd.id,
            productSkuId: widget.productToAdd.childSKUs[0].repositoryId,
            productVariantOptions: JSON.stringify(widget.productToAdd.selectedOptions),
            productCurrencyCode: widget.site().selectedPriceListGroup().currency.currencyCode,
            notificationProductPrice : widget.site().selectedPriceListGroup().currency.symbol + widget.formatPrice(widget.productToAdd.childSKUs[0].listPrice, widget.site().selectedPriceListGroup().currency.fractionalDigits)
        };
        
        if (widget.productToAdd.primarySmallImageURL && widget.productToAdd.primarySmallImageURL != 'no-image') {
          // if there is a primarySmallImageURL in ProductViewModel AND primarySmallImageURL value is not 'no-image', then include productImageUrl in request payload.
          json.productImageUrl = window.location.protocol + "//" + window.location.host + widget.productToAdd.primarySmallImageURL;
        }
        
        if (widget.productToAdd.desiredQuantity && widget.productToAdd.desiredQuantity < 1000 ) {  
          // not including quantity
          json.productDesiredQuantity = widget.productToAdd.desiredQuantity;
        }
        
        if (json.productSalePrice) {
          // if product is on sale, update payload.notificationProductPrice to be sale price.
          json.notificationProductPrice = widget.site().selectedPriceListGroup().currency.symbol + widget.formatPrice(widget.productToAdd.childSKUs[0].salePrice, widget.site().selectedPriceListGroup().currency.fractionalDigits);
        }
        
        var addToSpaceData = {
          displayName: widget.productToAdd.displayName,
          spaceName: elem.options[elem.selectedIndex].innerHTML,
          spaceId: elem.options[elem.selectedIndex].value,
          productId: widget.productToAdd.id
        };

        // call SWM server to add product to space
        notifier.clearSuccess(widget.WIDGET_ID);
        notifier.clearError(widget.WIDGET_ID);
        swmRestClient.request("POST", '/swm/rs/v1/spaces/{spaceid}/products',
          json, successCB, errorCB, {"spaceid":spaceid});

        $('#SWM-modalPane').hide();
        widget.closeModalById('#SWM-modalContainer');
      }
    },
	  
	  // ----- Begin: ADD TO SPACE SELECTOR METHODS ----- //
	  /**
	   * Handler: existing wish list selected from dropdown, automatically add to wish list
	   */
	  addToSpaceSelected : function(spaceId, spaceName) {
	    var widget = this;

	    var addToSpaceData = {
        displayName: widget.productToAdd.displayName,
        spaceName: spaceName,
        spaceId: spaceId,
        productId: widget.productToAdd.id
      };
        
	    // callbacks for adding product to space
      var emptyCB = function(result) {};
      var errorCB = function(err) {
        var errResponse = JSON.parse(err);
        notifier.clearSuccess(widget.WIDGET_ID);
        notifier.clearError(widget.WIDGET_ID);
        
        if (errResponse['o:errorCode'] === "403.4") {
          var errMsg = widget.translate('productAddMaxProductsMsg');
          notifier.sendError(widget.WIDGET_ID, errMsg, true);
        }
        else {
          notifier.sendError(widget.WIDGET_ID, widget.translate('spaceAddProductError'), true);
        }

        // reset the product for next time, we've added it already
        widget.productToAdd = null;
      };

      var successCB = function(result) {
        if (result.response.code.indexOf("200") === 0 || result.response.code.indexOf("201") === 0) {
          notifier.clearSuccess(widget.WIDGET_ID);
          notifier.clearError(widget.WIDGET_ID);
          // Duplicate SKU was found so product content updated
          var productUpdated = result.response.code.indexOf("200") === 0 ? true : false;
          // Attach and pass in productUpdated boolean flag to Topic subscribers
          addToSpaceData.productUpdated = productUpdated;
          $.Topic(PubSub.topicNames.SOCIAL_SPACE_ADD_SUCCESS).publishWith(widget.productToAdd, [addToSpaceData]);

          var contentid = result.contentId;

          var errorCB = function(err) {};

          // If product content was CREATED AND there is a file extension in primaryFullImageURL, upload product media
          if (!productUpdated && widget.productToAdd.primaryFullImageURL.lastIndexOf(".") > 0) {
            var fileExt = widget.productToAdd.primaryFullImageURL.slice(widget.productToAdd.primaryFullImageURL.lastIndexOf("."));
            var prodImg = new Image();
            prodImg.src = widget.productToAdd.primarySmallImageURL;
            prodImg.onload = function() {
              var imgContents = widget.imageToBase64(this, fileExt);
  
              var mediaJson = {
                file: imgContents,
                fileName: "productImage" + fileExt
              };
  
              var mediaSuccessCB = function(result) {
                // do not wait on this call since the image will be virus scanned and the result is irrelevant
              };
  
              // now add media image and comment to product post
              swmRestClient.request("POST", '/swm/rs/v1/spaces/{spaceid}/products/{contentid}/media',
                mediaJson, mediaSuccessCB, errorCB, {"spaceid":spaceId, "contentid":contentid});
            };
          }

          // reset the product for next time, we've added it already
          widget.productToAdd = null;
        }
      };
      
      addToSpaceData.spaceId = spaceId; 
      // figure out sale price, if any
      var productToAddSalePrice = "";
      if (widget.productToAdd.childSKUs[0].salePrice != null) {
        productToAddSalePrice = JSON.stringify(widget.productToAdd.childSKUs[0].salePrice);
      }

      var productTitleToAdd = widget.productToAdd.displayName ? widget.productToAdd.displayName : '';
        
      var json = {
          productTitle: productTitleToAdd,
          productPrice: widget.productToAdd.childSKUs[0].listPrice,
          productSalePrice: productToAddSalePrice,
          productUrl: widget.productToAdd.route,
          productProductId: widget.productToAdd.id,
          productSkuId: widget.productToAdd.childSKUs[0].repositoryId,
          productVariantOptions: JSON.stringify(widget.productToAdd.selectedOptions),
          productCurrencyCode: widget.site().selectedPriceListGroup().currency.currencyCode,
          notificationProductPrice : widget.site().selectedPriceListGroup().currency.symbol + widget.formatPrice(widget.productToAdd.childSKUs[0].listPrice, widget.site().selectedPriceListGroup().currency.fractionalDigits)
      };
      
      if (widget.productToAdd.primarySmallImageURL && widget.productToAdd.primarySmallImageURL != 'no-image') {
        // if there is a primarySmallImageURL in ProductViewModel AND primarySmallImageURL value is not 'no-image', then include productImageUrl in request payload.
        json.productImageUrl = window.location.protocol + "//" + window.location.host + widget.productToAdd.primarySmallImageURL;
      }
      
      if (widget.productToAdd.desiredQuantity && widget.productToAdd.desiredQuantity < 1000) {  // not including quantity
        json.productDesiredQuantity = widget.productToAdd.desiredQuantity ;
      }

      if (json.productSalePrice) {
        // if product is on sale, update payload.notificationProductPrice to be sale price.
        json.notificationProductPrice = widget.site().selectedPriceListGroup().currency.symbol + widget.formatPrice(widget.productToAdd.childSKUs[0].salePrice, widget.site().selectedPriceListGroup().currency.fractionalDigits);
      }
      
      // call SWM server to add product to space
      notifier.clearSuccess(widget.WIDGET_ID);
      notifier.clearError(widget.WIDGET_ID);
      swmRestClient.request("POST", '/swm/rs/v1/spaces/{spaceid}/products',
        json, successCB, errorCB, {"spaceid":spaceId} );
	  },
	  
	  /**
	   * Handler: wish list selected from modal
	   */
	  handleSelectorAddToSpace : function() {
	    var widget = this;
	    var spaceid;
	    
	    if (widget.productToAdd === null) {
        alert('no product!');
        return;
      }
      
      // callbacks for adding product to space
      var emptyCB = function(result) {};
      var errorCB = function(err) {
        notifier.clearSuccess(widget.WIDGET_ID);
        notifier.clearError(widget.WIDGET_ID);
        notifier.sendError(widget.WIDGET_ID, widget.translate('spaceAddProductError'), true);

        // reset the product for next time, we've added it already
        widget.productToAdd = null;
      };

      var successCB = function(result) {
        if (result.response.code.indexOf("200") === 0 || result.response.code.indexOf("201") === 0) {
          notifier.clearSuccess(widget.WIDGET_ID);
          notifier.clearError(widget.WIDGET_ID);
          // Duplicate SKU was found so product content updated
          var productUpdated = result.response.code.indexOf("200") === 0 ? true : false;
          // Attach and pass in productUpdated boolean flag to Topic subscribers
          addToSpaceData.productUpdated = productUpdated;
          $.Topic(PubSub.topicNames.SOCIAL_SPACE_ADD_SUCCESS).publishWith(widget.productToAdd, [addToSpaceData]);

          var contentid = result.contentId;

          var errorCB = function(err) {};

          // If product content was CREATED AND there is a file extension in primaryFullImageURL, upload product media
          if (!productUpdated && widget.productToAdd.primaryFullImageURL.lastIndexOf(".") > 0) {
            var fileExt = widget.productToAdd.primaryFullImageURL.slice(widget.productToAdd.primaryFullImageURL.lastIndexOf("."));
            var prodImg = new Image();
            prodImg.src = widget.productToAdd.primarySmallImageURL;
            prodImg.onload = function() {
              var imgContents = widget.imageToBase64(this, fileExt);
  
              var mediaJson = {
                file: imgContents,
                fileName: "productImage" + fileExt
              };
  
              var mediaSuccessCB = function(result) {
                // do not wait on this call since the image will be virus scanned and the result is irrelevant
              };
  
              // now add media image and comment to product post
              swmRestClient.request("POST", '/swm/rs/v1/spaces/{spaceid}/products/{contentid}/media',
                mediaJson, mediaSuccessCB, errorCB, {"spaceid":spaceid, "contentid":contentid});
            };
          }

          // reset the product for next time, we've added it already
          widget.productToAdd = null;
        }
      };

      widget.createSpaceSelectorName.isModified(true);
      this.createSpaceSelectorName(this.createSpaceSelectorName().trim());
      widget.errBadRequestSpaceName(false);
      if (!this.createSpaceSelectorName.isValid()) {
        return;
      }

      var createSpaceErrorCB = function(err) {
        var errResponse = JSON.parse(err);
        if (errResponse['o:errorCode'] === "409.0") {
          widget.errBadRequestSpaceName(true);
        }
      };

      var createSpaceSuccessCB = function(result) {
        if (result.response.code.indexOf("201") === 0) {
          $.Topic(PubSub.topicNames.SOCIAL_REFRESH_SPACES).publish(true);
          spaceid = result.spaceId;
          addToSpaceData.spaceId = result.spaceId; 
          // figure out sale price, if any
          var productToAddSalePrice = "";
          if (widget.productToAdd.childSKUs[0].salePrice != null) {
            productToAddSalePrice = JSON.stringify(widget.productToAdd.childSKUs[0].salePrice);
          }

          var productTitleToAdd = widget.productToAdd.displayName ? widget.productToAdd.displayName : '';
          var json = {
              // instantiate 
              productTitle: productTitleToAdd,
              productPrice: widget.productToAdd.childSKUs[0].listPrice,
              productSalePrice: productToAddSalePrice,
              productUrl: widget.productToAdd.route,
              productProductId: widget.productToAdd.id,
              productSkuId: widget.productToAdd.childSKUs[0].repositoryId,
              productVariantOptions: JSON.stringify(widget.productToAdd.selectedOptions),
              productCurrencyCode: widget.site().selectedPriceListGroup().currency.currencyCode,
              notificationProductPrice : widget.site().selectedPriceListGroup().currency.symbol + widget.formatPrice(widget.productToAdd.childSKUs[0].listPrice, widget.site().selectedPriceListGroup().currency.fractionalDigits)
          };
          
          if (widget.productToAdd.primarySmallImageURL && widget.productToAdd.primarySmallImageURL != 'no-image') {
            // if there is a primarySmallImageURL in ProductViewModel AND primarySmallImageURL value is not 'no-image', then include productImageUrl in request payload.
            json.productImageUrl = window.location.protocol + "//" + window.location.host + widget.productToAdd.primarySmallImageURL;
          }
          
          if (widget.productToAdd.desiredQuantity && widget.productToAdd.desiredQuantity < 1000) {  // not including quantity
            json.productDesiredQuantity = widget.productToAdd.desiredQuantity;
          }

          if (json.productSalePrice) {
            // if product is on sale, update payload.notificationProductPrice to be sale price.
            json.notificationProductPrice = widget.site().selectedPriceListGroup().currency.symbol + widget.formatPrice(widget.productToAdd.childSKUs[0].salePrice, widget.site().selectedPriceListGroup().currency.fractionalDigits);
          }
          
          // call SWM server to add product to space
          notifier.clearSuccess(widget.WIDGET_ID);
          notifier.clearError(widget.WIDGET_ID);
          swmRestClient.request("POST", '/swm/rs/v1/spaces/{spaceid}/products',
            json, successCB, errorCB, {"spaceid":spaceid} );
        }

        $('#SWM-selector-modalPane').hide();
        widget.closeModalById('#SWM-selector-modalContainer');
      };

      var json = {
        siteId: swmRestClient.siteid,
        spaceName: $('#SWM-selector-createSpace-name')[0].value.trim(),
        spaceDescription: 'sample description from storefront',
        accessLevel: widget.createSpaceSelectorAccessLevel()
      };

      var addToSpaceData = {
        displayName: widget.productToAdd.displayName,
        spaceName: $('#SWM-selector-createSpace-name')[0].value,
        productId: widget.productToAdd.id
      };

      // call SWM server to create space
      swmRestClient.request("POST", '/swm/rs/v1/spaces', json, createSpaceSuccessCB, createSpaceErrorCB);
	  },
	
	  /**
	   * Handler: create space modal canceled
	   */
	  handleSelectorAddToSpaceCancel : function() {
	    var widget = this;
	    widget.closeModalById('#SWM-selector-modalContainer');
	
	    // clear the viewModel field, which in binded to the input field
	    widget.createSpaceSelectorName('');
	  },
	  
	  // ----- End: ADD TO SPACE SELECTOR METHODS ----- //

    /**
     * Clear all error messages in the notification bar for this widget
     */
    clearAllErrorNotifications : function() {
      var widget = this;
      notifier.clearError(widget.WIDGET_ID);
    },

    /**
     * Clear all success messages in the notification bar for this widget
     */
    clearAllSuccessNotifications : function() {
      var widget = this;
      notifier.clearSuccess(widget.WIDGET_ID);
    },
    
    /**
     * Close a modal by it's element id. 
     * 
     * Note: Fix SC-4106: MS Edge 'spartan'
     * browser requires removing 'modal-open' and 'modal-backdrop' from DOM,
     * as event propagation stops after 'hide' listener, in bootstrap 3.1.
     * 
     * modalId should be passed in with '#' identifier, example '#modalId'
     */
    closeModalById: function(modalId) {
      $(modalId).modal('hide');
      $('body').removeClass('modal-open');
      $('.modal-backdrop').remove();
    },
    
	  /**
	   * Reset widget
	   */
	  resetWidget : function() {
	    var widget = this;
	
	    // remove create space validations on observables
	    widget.createSpaceName('');
	    widget.createSpaceAccessLevel('0');
	    widget.createSpaceSelectorName('');
	    widget.createSpaceSelectorAccessLevel('0');
	    widget.newSpaceAccessLevel("0");
	  },

    /**
     * Encode a PNG, GIF, JPG or JPEG image to base64
     */
    imageToBase64: function(img, fileExt) {
      var contentType = "image/jpeg";
      if (fileExt == ".gif")
        contentType = "image/gif";
      else if (fileExt == ".png")
        contentType = "image/png";

      // create empty canvas
      var canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      // copy image contents to canvas
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      var data = canvas.toDataURL(contentType);

      return data.replace(/data\:image\/(png|gif|jpg|jpeg)\;base64\,/,"");
    },

    /**
     * Runs late in the page cycle on every page where the widget will appear.
     */
    beforeAppear : function(page) {

      var widget = this;
      widget.resumeAddProductToSpaceWorkflow(false);
    }
  };
});
