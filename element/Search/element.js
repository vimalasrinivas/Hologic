define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['jquery', 'knockout', 'pubsub', 'notifications', 'ccConstants',
    'viewModels/customsearchTypeahead', 'placeholderPatch', 'navigation', 'storageApi', 'ccResourceLoader!global/api-helper'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function ($, ko, pubsub, notifications, CCConstants, searchTypeahead,
    placeholder, navigation, storageApi, helper) {
    "use strict";

    var ELEMENT_NAME = 'search';

    return {
      elementName: ELEMENT_NAME,

      searchText: ko.observable(""),
      SEARCH_SELECTOR: '.search-query',
      searchTypeVisible: ko.observable(false),
      searchTypeText: ko.observable('Product'),
      nrParam: '',
      nrParamNews: '',
      nParam: '',
      handleKeyPress: function (data, event) {
        // displays modal dialog if search is initiated with unsaved changes.
        if (data.user().isUserProfileEdited()) {
          $("#CC-customerProfile-modal").modal('show');
          data.user().isSearchInitiatedWithUnsavedChanges(true);
          return false;
        }
        var keyCode;

        keyCode = (event.which ? event.which : event.keyCode);

        switch (keyCode) {
          case CCConstants.KEY_CODE_ENTER:
            // Enter key
            this['elements'][ELEMENT_NAME].handleSearch(data, event);
            //document.activeElement.blur();
            $("input#CC-headerWidget-Search-Mobile").blur();
            return false;
        }
        return true;
      },

      // publishes a message to say create a search 
      handleSearch: function (data, event) {
        // Executing a full search, cancel any search typeahead requests
        $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_CANCEL).publish([{ message: "success" }]);

        var trimmedText = $.trim(this.searchText());
        console.log("trimmedText",trimmedText);
        console.log("trimmedText nParam",this.nParam);
        if (trimmedText.length !== 0) {
            if(this.nParam !="0") {
                trimmedText = trimmedText+'*';
              if (this.searchTypeText() === 'News') {
                navigation.goTo('/newsSearch' + "?"
                  + "N=" + this.nParam + "&"
                  + CCConstants.SEARCH_TERM_KEY + "="
                  + encodeURIComponent(trimmedText) + "&"
                  + CCConstants.SEARCH_TYPE + "=" + CCConstants.SEARCH_TYPE_SIMPLE + "&"
                  + CCConstants.PARAMETERS_TYPE + "=" + CCConstants.PARAMETERS_SEARCH_QUERY
                  + '&' + this.nrParamNews);
              } else {
                  var trimText = this.searchText().trim();
                  trimText = trimText+'*';
                // Send the search results and the related variables for the Endeca query on the URI
                    navigation.goTo("/searchresults" + "?"
                  + "N=" + this.nParam + "&"
                  + CCConstants.SEARCH_TERM_KEY + "="
                  + encodeURIComponent(trimText) + "&"
                  + CCConstants.SEARCH_RANDOM_KEY + "=" + Math.floor(Math.random() * 1000) + "&"
                  + CCConstants.SEARCH_TYPE + "=" + CCConstants.SEARCH_TYPE_SIMPLE + "&"
                  + CCConstants.PARAMETERS_TYPE + "=" + CCConstants.PARAMETERS_SEARCH_QUERY
                  + '&' + this.nrParam);
              }
            } else {
                /** If N value is empty redirect to no search results page*/
                console.log("no N value");
                navigation.goTo('/noSearchResults');    
            }
          this.searchText('');
        }
      },

      // Initializes search typeahead and the placeholder text
      initializeSearch: function () {
        storageApi.getInstance().setItem("searchType", this['elements'][ELEMENT_NAME].searchTypeText());
        this['elements'][ELEMENT_NAME].initTypeahead.bind(this)();
        this['elements'][ELEMENT_NAME].addPlaceholder();
        this['elements'][ELEMENT_NAME].getAccountData(this.user());
      },

      initTypeahead: function () {
        var typeAhead = searchTypeahead.getInstance(this['elements'][ELEMENT_NAME].SEARCH_SELECTOR, this.site().selectedPriceListGroup().currency);
        notifications.emptyGrowlMessages();
      },
      getAccountData: function (user) {
        var brandStr = '', bucketStr = '';
        if (user.loggedIn() === true) {
          var catalogHtmlObj = '';
          var tempBucketArray = [];
          var accBucket = user.currentOrganization().account_catalog_buckets;
          if (helper.isHTML(accBucket)) {
            catalogHtmlObj = $(accBucket);
            if (catalogHtmlObj[0].textContent) {
              tempBucketArray = catalogHtmlObj[0].textContent.split('|');
            }
          } else {
            catalogHtmlObj = accBucket;
            tempBucketArray = catalogHtmlObj.split('|');
          }
          for (var i = 0; i < tempBucketArray.length; i++) {
            var delim = i + 1 == tempBucketArray.length ? '' : ',';
            bucketStr += 'product.x_types:' + tempBucketArray[i] + delim;
          }
          var catalogBrandsObj = "";
          var tempBrandArray = [];
          var accBrand = user.currentOrganization().account_catalog_brands;
          if (helper.isHTML(accBrand)) {
            catalogBrandsObj = $(accBrand);
            if (catalogBrandsObj[0].textContent) {
              tempBrandArray = catalogBrandsObj[0].textContent.split('|');
            }
          } else {
            catalogBrandsObj = accBrand;
            tempBrandArray = catalogBrandsObj.split('|');
          }
          
          var NStr = "0";
            for (i = 0; i < tempBrandArray.length; i++) {
                for (j = 0; j < window.hologicNvalueList.length; j++) {
                    if(tempBrandArray[i] == window.hologicNvalueList[j].displayName) {
                        NStr=NStr+"+"+window.hologicNvalueList[j].nValue;
                    }
                }
                
            }
          for (var j = 0; j < tempBrandArray.length; j++) {
            var delimiter = j + 1 == tempBrandArray.length ? '' : ',';
            var brandVal = tempBrandArray[j].indexOf('/') > -1 ? encodeURIComponent(tempBrandArray[j]) : tempBrandArray[j];
            brandStr += 'product.brand:' + brandVal + delimiter;
          }
          
          
          this.nrParam = 'Nr=AND(OR(' + bucketStr + '),product.x_searchType:products)';
          this.nrParamNews = 'Nr=product.x_searchType:news';
          this.nParam = NStr;
          storageApi.getInstance().setItem("nrParam", this.nrParam);
          storageApi.getInstance().setItem("nrParamNews", this.nrParamNews);
          storageApi.getInstance().setItem("nParam", this.nParam);
        }
      },
      addPlaceholder: function () {
        $('#CC-headerWidget-Search-Desktop').placeholder();
        $('#CC-headerWidget-Search-Mobile').placeholder();
      },

      /**
       * Invoked when the search text box is in focus.
       * Used to fix the bug with growl messages not clearing on clicking
       * the search box
       */
      searchSelected: function () {
        notifications.emptyGrowlMessages();
        $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_HIDE).publish([{ message: "success" }]);
      },

      /**
       * Hide the search typeahead dropdown when the button is used for search
       */
      hideSearchDropdown: function (data, event) {
        var keyCode = (event.which ? event.which : event.keyCode);
        if (keyCode === CCConstants.KEY_CODE_ENTER) {
          $('#typeaheadDropdown').hide();
        } else {
          return true;
        }
      },
      setSearchType: function () {
        var widget = this;
        this.searchTypeVisible(!this.searchTypeVisible());
        $(document).ready(function () {
          $(".search-content").mouseleave(function () {
            widget.searchTypeVisible(false);
          });

          $(document).click(function (e) {
             if(!$(e.target).hasClass("sel-search") && !$(e.target).parents().hasClass("sel-search")) {
                 widget.searchTypeVisible(false);
             }
             
          });
        });
      },
      changeSearchType: function (text) {
        this.searchTypeText(text);
        storageApi.getInstance().setItem("searchType", text);
        this.searchTypeVisible(false);
      },
      handleMouseDown: function (text) {
        this.searchTypeVisible(false);
      }
    };
  }
);