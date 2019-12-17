define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery', 'knockout', 'pubsub'],

  // -------------------------------------------------------------------
  // MODULE DEFINITION
  // -------------------------------------------------------------------
  function ($, ko, pubsub) {
    "use strict";

    return {
      elementName: 'MedAesMinicartCustomElement',

      displayedMiniCartItems:    ko.observableArray(),
      currentSection:            ko.observable(1),
      totalSections:             ko.observable(),
      dropdowncartItemsHeight:   ko.observable(),
      gwpQualifiedMessage:       ko.observable(),
      isTotalRecordsGreater:     ko.observable(false),

      onLoad: function(widget) {
        var self = this;

        if (widget.hasOwnProperty('miniCartNumberOfItems')) {

          //If miniCartNumberOfItems is not configured then default value is 3
          if (widget.miniCartNumberOfItems() === undefined) {
            widget.miniCartNumberOfItems(3);
          }

          widget.miniCartNumberOfItems(parseInt(widget.miniCartNumberOfItems()));

          // Changing height of .dropdowncartItems based on miniCartNumberOfItems
          widget.computeDropdowncartHeight = function() {
            var itemHeight = $("#CC-headerWidget #dropdowncart .item").css("height");
            if (itemHeight) {    //Converting height from string to integer
              itemHeight = itemHeight.split("p");
              itemHeight = parseInt(itemHeight[0]);
            } else {    // default height
                itemHeight = 80;
            }
            self.dropdowncartItemsHeight(widget.miniCartNumberOfItems() * itemHeight + 24);
            self.dropdowncartItemsHeight(self.dropdowncartItemsHeight()+"px");
          };

          /**
           *As grouping is done based on miniCartNumberOfItems() , this
           variable stores the maximum groups of miniCartNumberOfItems()
           items possible based on number of items in the cart.
           Currently miniCartNumberOfItems() has a value of 3
           */
          self.totalSections = ko.computed(function() {
            if (widget.cart().allItems().length == 0) {
              return 0;
            } else {

              var totalNoOfRecords = 0;
              for(var index = 0; index < widget.cart().allItems().length; index++) {
                var cartItem = widget.cart().allItems()[index];
                if(cartItem.shippingGroupRelationships && null != cartItem.shippingGroupRelationships()) {
                  totalNoOfRecords += cartItem.shippingGroupRelationships().length;
                } else {
                  // We wouldn't have shippinggroups for GWP items.
                  totalNoOfRecords += 1;
                }
              if (!self.isTotalRecordsGreater.peek() && totalNoOfRecords > widget.miniCartNumberOfItems()) {
                self.isTotalRecordsGreater(true);
              } else if (totalNoOfRecords <= widget.miniCartNumberOfItems()) {
                self.isTotalRecordsGreater(false);
              }
              }
              return Math.ceil(totalNoOfRecords/widget.miniCartNumberOfItems());
            }
          }, widget);

          // function to display items in miniCart array when scrolling down
          widget.miniCartScrollDown = function() {
            // Clear any timeout flag if it exists. This is to make sure that
            // there is no interruption while browsing cart.
            if (widget.cartOpenTimeout) {
              clearTimeout(widget.cartOpenTimeout);
            }
            self.currentSection(self.currentSection() + 1);
            widget.computeMiniCartItems();
            if (self.displayedMiniCartItems()[0]) {   
              $("#CC-MedAesMinicartCustomElement-image-"+self.displayedMiniCartItems()[0].productId+self.displayedMiniCartItems()[0].catRefId).focus();
            }
          };

          // function to display items in miniCart array when scrolling up
          widget.miniCartScrollUp = function() {
            // Clear any timeout flag if it exists. This is to make sure that
            // there is no interruption while browsing cart.
            if (widget.cartOpenTimeout) {
              clearTimeout(widget.cartOpenTimeout);
            }
            self.currentSection(self.currentSection() - 1);
            widget.computeMiniCartItems();
            if (self.displayedMiniCartItems()[0]) {
              $("#CC-MedAesMinicartCustomElement-image-"+self.displayedMiniCartItems()[0].productId+self.displayedMiniCartItems()[0].catRefId).focus();
            }
          };

          // Re-populate displayedMiniCartItems array based on add/remove
          widget.computeMiniCartItems = function() {

            self.displayedMiniCartItems.removeAll();

            for(var index=0; index < widget.cart().allItems().length; index++) {
              var cartItem = widget.cart().allItems()[index];
              if(cartItem.shippingGroupRelationships && null != cartItem.shippingGroupRelationships()) {
                for(var sgIndex=0;sgIndex < cartItem.shippingGroupRelationships().length;sgIndex++) {
                  var miniCartitem = {};
                  miniCartitem.shippingGroupRelationship=cartItem.shippingGroupRelationships()[sgIndex];
                  miniCartitem.cartItem=cartItem;
                  miniCartitem.currency=widget.cart().currency;

                  self.displayedMiniCartItems.push(miniCartitem);
                }
              } else {
                self.displayedMiniCartItems.push(cartItem);
              }

            }
            if (self.currentSection() <= self.totalSections()) {
              self.displayedMiniCartItems(self.displayedMiniCartItems().slice((self.currentSection() - 1) * widget.miniCartNumberOfItems(),
                  self.currentSection() * widget.miniCartNumberOfItems()));
            } else {
              if (self.totalSections()) {
                self.displayedMiniCartItems(self.displayedMiniCartItems().slice((self.totalSections() - 1) * widget.miniCartNumberOfItems(),
                    self.totalSections() * widget.miniCartNumberOfItems()));
                self.currentSection(self.totalSections());
              } else { // Mini-cart is empty, so initialize variables
                self.displayedMiniCartItems.removeAll();
                self.currentSection(1);
              }
            }
          };

          widget.getCartItem = function(shippingGroup) {
            var cartItem = null;
            if(shippingGroup && shippingGroup.productId && shippingGroup.catRefId) {
              for(var index=0; index < widget.cart().allItems().length; index++) {
                var currentCartItem = widget.cart().allItems()[index];
                if(shippingGroup.productId === currentCartItem.productId && shippingGroup.catRefId === currentCartItem.catRefId) {
                  cartItem = currentCartItem;
                  break;
                }
              }
            }
            return cartItem;
          }
          /**
           * Function that makes sure that the mini cart opens of, if set to
           * and goes to the particular product that has just been added to cart.
           */
          widget.goToProductInDropDownCart = function(product) {
            
            widget.computeMiniCartItems();
            
            var skuId = product.childSKUs[0].repositoryId;
            var cartItems = widget.cart().allItems();
            var itemNumber = -1;
            // Focus at start.
            $('.cc-cartlink-anchor').focus();
            if (widget.displayMiniCart()) {
              for (var i = 0; i < cartItems.length; i++) {
                if ((product.id == cartItems[i].productId) && (cartItems[i].catRefId == skuId)) {
                  itemNumber = i;
                  break;
                }
              }
              if (itemNumber > -1) {
                widget.showDropDownCart();
                // Move down the number of times given
                var prodPage = Math.floor(itemNumber / widget.miniCartNumberOfItems());
                var prodNum = itemNumber % widget.miniCartNumberOfItems();
                self.currentSection(prodPage + 1);
                widget.computeMiniCartItems();
                // Now focus on the product
                $("#CC-MedAesMinicartCustomElement-image-"+product.id+skuId).focus();
                // Set the timeout if the item exists (should be there all the time.
                // Still a fallback).
                widget.cartOpenTimeout = setTimeout(function() {
                  widget.hideDropDownCart();
                  $('.cc-cartlink-anchor').focus();
                }, widget.miniCartDuration() * 1000);
              }
            }
          };

          $.Topic(pubsub.topicNames.CART_ADD_SUCCESS).subscribe(widget.goToProductInDropDownCart);
          $.Topic(pubsub.topicNames.CART_REMOVE_SUCCESS).subscribe(widget.computeMiniCartItems);
          $.Topic(pubsub.topicNames.SHIPPING_GROUP_REMOVE_SUCCESS).subscribe(widget.computeMiniCartItems);
          $.Topic(pubsub.topicNames.CART_UPDATE_QUANTITY_SUCCESS).subscribe(widget.computeMiniCartItems);
          $.Topic(pubsub.topicNames.CART_UPDATED).subscribe(widget.computeMiniCartItems);
          $.Topic(pubsub.topicNames.GWP_QUALIFIED_MESSAGE).subscribe(function (message) {
            widget['MedAesMinicartCustomElement'].gwpQualifiedMessage(message.summary);
          });
          $.Topic(pubsub.topicNames.GWP_CLEAR_QUALIFIED_MESSAGE).subscribe(function () {
            widget['MedAesMinicartCustomElement'].gwpQualifiedMessage(null);
          });
          
        }
      }


    };
  }
);