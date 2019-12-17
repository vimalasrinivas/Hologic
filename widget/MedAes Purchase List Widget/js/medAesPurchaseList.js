define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery', 'knockout', 'ccRestClient', 'ccConstants', 'viewModels/purchaseList', 'notifier', 'pubsub', 'CCi18n', 'navigation'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function ($, ko, ccRestClient, CCConstants, PurchaseListViewModel, notifier, pubsub, CCi18n, navigation) {
    "use strict";
    var getWidget = '';
    var purchaseList = '';
    return {
      elementName: 'purchase-list',
      purchaseListArray: ko.observableArray([]),
      EnableAddToItemBtn: ko.observable(true),
      disableAddToPurchaseList: ko.observable(false),
      getSelectedProducts: ko.observable(),
      /**
       * Populate this element's purchaseListArray  observableArray with the current profile's
       * purchase lists.
       */
      onLoad: function (widget) {
        EnableAddToItemBtn: ko.observable(true),
          $.Topic('PURCHASE_LIST.memory').subscribe(function (data) {
            console.log(data, ".....current prodcut data... ");
            widget.getSelectedProducts(data);

          })
        var self = this;
        getWidget = widget;
        widget.purchaseListViewModel = ko.observable();
        widget.purchaseListViewModel(new PurchaseListViewModel());
        // Load current profile's purchase lists
        if (widget.user().loggedIn()) {
          self.getAllPurchaseList();
        }

        $.Topic(pubsub.topicNames.PRODUCT_ADDED_TO_PURCHASE_LIST_SUCCESS).subscribe(function (publishableData) {
          var productNameList = '';
          for (var i = 0; i < publishableData.items.length - 1; i++) {
            productNameList += publishableData.items[i].displayName + ',';
          }
          productNameList += publishableData.items[publishableData.items.length - 1].displayName;
          widget.successMessageProductName = ko.observable(productNameList);
          widget.successMessagePurchaseListName = ko.observable(publishableData.purchaseList.purchaseListName);
          var wlLinkObj = {
            url: window.isAgentApplication ? navigation.getPathWithLocale('/agentPurchaseList/') :
              navigation.getPathWithLocale('/purchaseList/' + publishableData.purchaseList.purchaseListId)
          };
          widget.successMessagePurchaseListIdLink = ko.observable(wlLinkObj);
          notifier.sendSuccess(this.WIDGET_ID, 'Item has been added to "' + widget.successMessagePurchaseListName() + '" List successfully. ', true);
          widget.hideModal(widget);
          //  notifier.sendTemplateSuccess(widget.WIDGET_ID, widget, widget.notificationTemplateUrl('notification-add-to-purchaselist-success'), true);
        });

        /**
        * Show the modal window to create new purchase list.
        */
        widget.showModal = function () {
          $("#CC-newPurchaseList-modal").modal('show');
          $('#CC-newPurchaseList-modal').on('hidden.bs.modal', function () {
            $('#CC-purchaseList-name').val('');
            $('#cc-purchaseListName-error').addClass('cc-alert');
          });
        };

        /**
        * Hide the modal window.
        */
        widget.hideModal = function (widget) {
          $("#CC-newPurchaseList-modal").modal('hide');
          // If the purchase list is over another modal, don't remove the backdrop 
          // as it will remove the backdrop for the widget modal also.
          if (widget.isInDialog && widget.isInDialog()) {
            return;
          } else {
            $('.modal-backdrop').remove();
          }
        };

        /**
        * Handle the submit button after entering purchase list name
        * in the modal input box. Also call the endpoint to create new purchase list with
        * the selected product/products. If any error occurs in create purchase list
        * error message will appear on the screen. After successful entry the modal window
        * will be closed and success message will appear on the screen.
        */
        widget.handleModalYes = function (widget) {
          var self = this;
          var purchaselistname = $('#CC-purchaseList-name').val();
          /*   for(var i=0;i< self.purchaseListArray().length;i++){
               if(self.purchaseListArray()[i].purchaseListName ==purchaselistname){
                     notifier.sendError(this.WIDGET_ID, '"' + purchaselistname + '"'+" List has not been created, please try again." ,false);
               } 
             }*/
          if ($.trim(purchaselistname) === "") {
            $('#cc-purchaseListName-error').removeClass('cc-alert');
          } else {
            var itemArray = widget.getSelectedProducts();
            var requestJson = {
              "name": purchaselistname,
              "items": itemArray
            };

            var handleCreateNewPurchaseListSuccess = function (result) {
              var purchaseListOption = {
                purchaseListId: result.id,
                purchaseListName: result.name,
                purchaseListDescription: result.description
              };
              getWidget.purchaseListArray.push(purchaseListOption);

              notifier.sendSuccess(this.WIDGET_ID, '"' + result.name + '"' + ' List has been created and your item has been added successfully.', true);
            }.bind(this);
            var handleCreateNewPurchaseListError = function () {
              notifier.sendError(this.WIDGET_ID, '"' + purchaselistname + '"' + "List is already exist.Please create a new one.", false);
            }.bind(this);

            ccRestClient.request(CCConstants.ENDPOINT_CREATE_PURCHASE_LIST, requestJson,
              handleCreateNewPurchaseListSuccess, handleCreateNewPurchaseListError);
            widget.hideModal(widget);
            if (getWidget.purchaseListArray.length === 0) {
              //getWidget.purchaseListArray('');   
            }
          }
          $(".popup-stack .modal").modal("hide");
        };

        /**
        * Close the modal window if Cancel button is clicked
        */
        widget.handleModalNo = function (widget) {
          widget.hideModal(widget);
        };

        $("body").delegate("#choosePurchaseList", "change", function (e) {
          //widget.purchaseListArray('');       
          var value = $(e.currentTarget).val();
          if ($(e.currentTarget).val() !== "") {
            widget.EnableAddToItemBtn(false);
            purchaseList = JSON.parse(value);
          } else {
            widget.EnableAddToItemBtn(true);
          }

        });


      },

      /** 
       * Get the list of purchase lists if the list is empty.
       */
      openAddToPurchaseListDropDownSelector: function () {
        var self = this;
        if (getWidget.purchaseListArray().length === 0) {
          getWidget.getAllPurchaseList();
        }
      },

      /**
       * Fetch purchase list from rest endpoint and create data for dropdown list
       */
      getAllPurchaseList: function () {
        var self = this;
        var handlePurchaseListResponse = function (result) {
          getWidget.purchaseListArray([]);
          if (result.totalResults > 0) {
            var purchaseLists = result.items;
            purchaseLists.forEach(function (purchaseListItem, index) {
              var purchaseListOption = {
                purchaseListId: purchaseListItem.id,
                purchaseListName: purchaseListItem.name,
                purchaseListDescription: purchaseListItem.description
              };
              getWidget.purchaseListArray.push(purchaseListOption);
            });
          }
        };

        var handlePurchaseListError = function (resultStr, status, errorThrown) { };

        var queryParameters = {
          fields: "id,name,description"
        };
        ccRestClient.request(CCConstants.ENDPOINT_LIST_PURCHASE_LIST,
          queryParameters, handlePurchaseListResponse, handlePurchaseListError);
      },

      handleAddProductToPurchaseListSuccess: function (itemsArray, purchaseList) {
        var publishableData = { items: itemsArray, purchaseList: purchaseList };
        $.Topic(pubsub.topicNames.PRODUCT_ADDED_TO_PURCHASE_LIST_SUCCESS).publish(publishableData);
      },

      handleAddProductToPurchaseListError: function (pResult) {
        notifier.sendError("", pResult.message, false);
      },



      /**
       * Method to add product to a purchase list. Call the view model's addItemToPurchaseList
       * method to add item in purchase list.
       */
      addItemToPurchaseList: function (widget) {

        var self = this;
        var items = self.getSelectedProducts();
        var addToPurchaseListSuccessCallback = null;
        var addToPurchaseListErrorCallback = null;
        // If the widget has a success/failure callback, use it. Else use the element's success/failure callback.
        if (self.handleAddProductToPurchaseListSuccess && typeof self.handleAddProductToPurchaseListSuccess === "function") {
          addToPurchaseListSuccessCallback = self.handleAddProductToPurchaseListSuccess.bind(self);
        } else {
          addToPurchaseListSuccessCallback = handleAddProductToPurchaseListSuccess;
        }

        if (self.handleAddProductToPurchaseListError && typeof self.handleAddProductToPurchaseListError === "function") {
          addToPurchaseListErrorCallback = self.handleAddProductToPurchaseListError.bind(self);
        } else {
          addToPurchaseListErrorCallback = handleAddProductToPurchaseListError;
        }
        self.purchaseListViewModel().
          addItemToPurchaseList(purchaseList,
            items,
            addToPurchaseListSuccessCallback,
            addToPurchaseListErrorCallback);

      },

      addItemToGivenPurchaseList: function (product) {
        var variantOptions = this.variantOptionsArray();
        //get the selected options, if all the options are selected.
        var selectedOptions = this.getSelectedSkuOptions(variantOptions);

        var selectedOptionsObj = { 'selectedOptions': selectedOptions };

        //adding availabilityDate for product object to show in the edit summary 
        //dropdown for backorder and preorder
        var availabilityDateObj = { 'availabilityDate': this.availabilityDate() };
        var stockStateObj = { 'stockState': this.stockState() };


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
        newProduct.selectedFromDialog = true;

        $.Topic(pubsub.topicNames.ADD_TO_PURCHASE_LIST).publish(newProduct);
        // return newProduct;
      },

      /**
       * Add product to new purchase list
       */
      addToNewPurchaseListClick: function (widget) {
        widget.showModal();
      },
      beforeAppear: function (page) {
        console.log("quickOrderModalShow-----");
        getWidget.getAllPurchaseList();
      }
    };
  }
);
