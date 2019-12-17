define(
  ['jquery', 'knockout', 'ccRestClient', 'pageLayout/cart', 'ccConstants', 'storageApi', 'pubsub', 'navigation', 'viewModels/dynamicProperty', 'viewModels/address', 'CCi18n', 'notifier', 'pageLayout/user'],
  function ($, ko, restClient, cart, ccConstants, storageApi, pubsub, nav, DynamicProperty, Address, CCi18n, notifier, user) {
    "use strict";
    if(localStorage && !localStorage.getItem('enableConsole')) {
      console.log = function() {}
    }
    window.hologicCollectionList = [];
    window.hologicNvalueList = [];
    cart.prototype.updateDynamicProperties = function (data) {
      console.log("Hacked....in here.....", data);
      $.Topic("CART_PRICE_RESPONSE_DATA.memory").publish(data);
      var self = this;
      if (data.dynamicProperties && self.dynamicProperties) {
        var refreshMetadata = false;
        for (var i = 0; i < data.dynamicProperties.length; i++) {
          var propertyFound = false;
          for (var j = 0; j < self.dynamicProperties().length; j++) {
            if (data.dynamicProperties[i].id === self.dynamicProperties()[j].id()) {
              self.dynamicProperties()[j].value(data.dynamicProperties[i].value);
              propertyFound = true;
              break;
            }
          }

          // If property not found then metadata is stale
          // Save ID and value for now
          if (!propertyFound) {
            refreshMetadata = true;
            var dynPropItem = new DynamicProperty();
            dynPropItem.id(data.dynamicProperties[i].id);
            dynPropItem.value(data.dynamicProperties[i].value);
            self.dynamicProperties.push(dynPropItem);
          }
        }
        //RemoveAll is required in Agent so that the template gets notified.
        if (restClient.profileType === ccConstants.PROFILE_TYPE_AGENT) {
          var existingDynamicProperties = self.dynamicProperties.slice(0);
          self.dynamicProperties.removeAll();
          self.dynamicProperties(existingDynamicProperties);
        }
        // Refresh the metadata if required
        if (refreshMetadata) {
          self.getDynamicPropertiesMetadata(false);
        }
      }
    };
    user.prototype.handlePageChanged = function(layout, event) {
      
      console.log("occs_organization_id-storefrontUI....", storageApi.getInstance().getItem("occs_organization_id-storefrontUI"));
        
      var orgSwitch = storageApi.getInstance().getItem("orgSwitch");
      if(orgSwitch) {
          var self = this;
            var isFreshPageLoad = self.storeConfiguration.isFreshPageLoad;
      
            var unSavedCart =false;
            if(self.storeConfiguration.isLargeCart() === true && isFreshPageLoad === true){
              var cookieData = storageApi.getInstance().getItem("shoppingCart");
              if (cookieData && typeof cookieData == 'string') {
                cookieData = JSON.parse(cookieData);
                if(cookieData.userActionPending === true){
                  unSavedCart = true; 
                }
              }
            } 
            //Note for large cart :Do not  refresh the cart in case of page navigation ,when large cart is active 
            //Note for large cart :Don't load the cart from server side ,if its page refresh and there is unsaved cart on server 
            //Note for large cart : programmatically possible /application driven refresh scenarios will 
            //have saved the cart before refresh after the shopper choice
            //if (!self.isPageRedirected() && self.loggedIn() && !self.loggedinAtCheckout() && !window.isAgentApplication) {}
            if ((!self.isPageRedirected() && self.loggedIn() && !self.loggedinAtCheckout() && !event.onLogin && !window.isAgentApplication && !self.storeConfiguration.isLargeCart()) 
                ||(self.storeConfiguration.isLargeCart() === true && isFreshPageLoad === true && unSavedCart ===false) ) {
              $.Topic(pubsub.topicNames.REFRESH_USER_CART).publish(self);
            }
            self.isPageRedirected(false);
            storageApi.getInstance().removeItem("orgSwitch");
      } else {
            var self = this;
            var isFreshPageLoad = self.storeConfiguration.isFreshPageLoad;
           var customCartCheck = false;
            var unSavedCart =false;
            if(self.storeConfiguration.isLargeCart() === true && isFreshPageLoad === true){
              var cookieData = storageApi.getInstance().getItem("shoppingCart");
              if (cookieData && typeof cookieData == 'string') {
                cookieData = JSON.parse(cookieData);
                if(cookieData.userActionPending === true){
                  unSavedCart = true; 
                }
              }
            } 
            
            var tempShoppingCart = storageApi.getInstance().getItem("shoppingCart");
            if (tempShoppingCart && typeof tempShoppingCart == 'string') {
                tempShoppingCart = JSON.parse(tempShoppingCart);
                if(tempShoppingCart.items.length  === 0){
                  customCartCheck = true; 
                }
              }
            //Note for large cart :Do not  refresh the cart in case of page navigation ,when large cart is active 
            //Note for large cart :Don't load the cart from server side ,if its page refresh and there is unsaved cart on server 
            //Note for large cart : programmatically possible /application driven refresh scenarios will 
            //have saved the cart before refresh after the shopper choice
            //if (!self.isPageRedirected() && self.loggedIn() && !self.loggedinAtCheckout() && !window.isAgentApplication) {}
            if ((!self.isPageRedirected() && self.loggedIn() && !self.loggedinAtCheckout() && !event.onLogin && !window.isAgentApplication && !self.storeConfiguration.isLargeCart() && !customCartCheck) 
                ||(self.storeConfiguration.isLargeCart() === true && isFreshPageLoad === true && unSavedCart ===false && !customCartCheck) ) {
              $.Topic(pubsub.topicNames.REFRESH_USER_CART).publish(self);
            }
            self.isPageRedirected(false);
      }
  
    };
    /* $.Topic(pubsub.topicNames.PAGE_READY).subscribe(function(obj) {
         var user = storageApi.getInstance().getItem("user");
        console.log("page readysss",user);
        if(user){
                    if(user.isUserSessionExpired || user.isUserLoggedOut){
        //if (data.user().loggedIn() === false && data.site().siteInfo.id === 'siteUS' || data.user().isUserSessionExpired() && data.site().siteInfo.id === 'siteUS'){
            console.log("coming in preview page"); 
            // window.location.replace(window.location.origin+"/signinPageTest");
            // window.location.href = window.location.origin+"/signinPageTest";
            nav.goTo("/signIn"); 
            
            }
        } else{
            if(window.location.pathname !== '/signIn' && window.location.pathname !== '/signUp'){
                var qparam = window.location.search!== '' ? window.location.search : '';
                window.location.href = "/signIn" + qparam;  

            }
        }
     });    */
    var helper = {
      apiEndPoint: {
        orderHistory: '/ccstorex/custom/v1/orders/list',
        createAddress: '/ccstorex/custom/v1/addresses/request',
        orderDetails: '/ccstorex/custom/v1/orders/details',
        cardsList: '/ccstorex/custom/v1/storedCards',
        addressList: '/ccstorex/custom/v1/addresses',
        cancelItem: '/ccstorex/custom/v1/orders/cancel',
        pricing: "/ccstorex/custom/v1/pricing",
        inventory: "/ccstorex/custom/v1/inventory",
        addCard: "/ccstorex/custom/v1/createCard",
        updateCard: "/ccstorex/custom/v1/updateCard",
        invoiceList: "/ccstorex/custom/v1/invoices/list",
        invoiceDetails: "/ccstorex/custom/v1/invoices/details",
        inovicePayment: "/ccstorex/custom/v1/invoices/payment",
        eventProductCarousel: "/ccstorex/custom/v1/events",
        getListCountry: "/file/JSON/countries.json",
        getUSstates: "/ccstoreui/v1/countries/US",
        getCanadastates: "/ccstoreui/v1/countries/CA",
        createProfile: "/ccstoreui/v1/profileRequests",
        downloadCsv: "/ccstorex/custom/v1/invoices/list/csv",
        addressesRequest: "/ccstorex/custom/v1/addresses/approved_rejected",
        print: "/ccstorex/custom/v1/invoices/print",
        packageSlip: "/ccstorex/custom/v1/orders/packingSlip",
        poDocumentUpload: "/ccstorex/custom/v1/orders/upload",
        trackFedEx: "https://www.fedex.com/apps/fedextrack/index.html?cntry_code=us&tracknumbers=",
        trackUPS: "https://www.ups.com/track?loc=en_US&tracknum=",
        trackDHL: "https://www.dhl.com/en/express/tracking.html?brand=DHL&AWB=",
      },
      postDataExternal: function (reqData, callback) {
        restClient.authenticatedRequest(reqData.enpointUrl, reqData.postData, function (data) {
          callback(null, data);
        }, function (err) { console.log('Post Service Failure', err); callback(err, null) }, "POST");
      },
      getDataExternal: function (endpointUrl, callback) {
        restClient.authenticatedRequest(endpointUrl, {}, function (data) {
          callback(null, data);
        }, function (err) { console.log('Get Service Failure', err); callback(err, null) }, "GET");
      },
      putDataExternal: function (reqData, callback) {
        restClient.authenticatedRequest(reqData.enpointUrl, reqData.postData, function (data) {
          callback(null, data);
        }, function (err) { console.log('Put Service Failure', err); callback(err, null) }, "PUT");
      },
      deleteDataExternal: function (reqData, callback) {
        console.log("reqData.enpointUrl", reqData.enpointUrl);
        console.log("reqData.postData", reqData.postData);
        restClient.authenticatedRequest(reqData, {}, function (data) {
          callback(null, data);
        }, function (err) { console.log('Delete service Failure', err); callback(err, null) }, "DELETE");
      },
      checkUserLoggedInOrNot: function (data, nav) {
        if (data.user().loggedIn() === false && data.site().siteInfo.id === 'siteUS' || data.user().isUserSessionExpired() && data.site().siteInfo.id === 'siteUS') {
          if (data.pageContext().page.name != "signIn") {
            var qparam = window.location.search !== '' ? window.location.search : '';
            window.location.href = "/signIn" + qparam;
          }
        }
      },
      onLoad: function () {
        //console.log("api helper onload..............");
        function getParameterByName(name, url) {
          if (!url) url = window.location.href;
          name = name.replace(/[\[\]]/g, "\\$&");
          var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
              results = regex.exec(url);
          if (!results) return null;
          if (!results[2]) return '';
          return decodeURIComponent(results[2].replace(/\+/g, " "));
        }
        
        $.get("/ccstoreui/v1/collections/rootCategory?catalogId=cloudCatalog&maxLevel=3&expand=childCategories&fields=childCategories(items),childCategories.displayName,childCategories.id", function(data, status){
          console.log("api helper collection data", data);
          window.hologicCollectionList = data.items;
          //console.log("api helper window.hologicCollectionList", window.hologicCollectionList);
        });
      
        $.get("/ccstoreui/v1/search?N=0&suppressResults=true", function(data, status){
          console.log("api helper N List", data);
          for(var i=0; i<data.navigation.navigation.length; i++) {
              if(data.navigation.navigation[i].dimensionName == "product.brand") {
                  for(var j=0; j<data.navigation.navigation[i].refinements.length; j++) {
                      var tempObj = {};
                      tempObj.displayName = data.navigation.navigation[i].refinements[j].label;
                      
                      var tempN = getParameterByName("N", data.navigation.navigation[i].refinements[j].navigationState);
                      var tempNArr = tempN.split(" ");
                      tempObj.nValue = tempNArr[1];
                      
                      window.hologicNvalueList.push(tempObj);
                  }
              }
          }
          console.log("api helper window.hologicNvalueList", window.hologicNvalueList);
        });

      },
      isHTML: function(str) {
        var a = document.createElement('div');
        a.innerHTML = str;
      
        for (var c = a.childNodes, i = c.length; i--; ) {
          if (c[i].nodeType == 1) return true; 
        }
      
        return false;
      },
      
      

    };
    return helper;
  });