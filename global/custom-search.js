/**
 * @fileoverview the search module handle the call to the search service and for updating
 * the search result details.
 */

/*global define */
define(
    //-------------------------------------------------------------------
    // PACKAGE NAME
    //-------------------------------------------------------------------
    'pageLayout/customSearch',
    
    //-------------------------------------------------------------------
    // DEPENDENCIES
    //-------------------------------------------------------------------
    ['knockout', 'pubsub', 'ccLogger', 'viewModels/searchResultDetails', 'ccConstants', 'pageViewTracker', 'navigation', 'ccStoreConfiguration'],
      
    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function (ko, pubsub, log, searchResDetails, CCConstants, pageViewTracker, navigation, CCStoreConfiguration) {
      
      'use strict';
      
      /**
       * Search view model manages layout of results returned from searches. SearchViewModel is a singleton
       * class and you can access it by calling getInstance.
       * 
       * @param {Object} pAdapter
       * @param {Object} data
       * 
       * @private
       * @class
       * @name SearchViewModel
       * @property {Object} adapter Internal copy of adapter object.
       * @property {boolean} isNewSearch=true Whether this SearchViewModel is performing a new search.
       * @property {boolean} isCategorySearch=false Whether this SearchViewModel is performing a category search.
       * @property {boolean} isRequesting=false Whether there is a search request in progress.
       * @property {observable<Object>} searchLocale Current locale for this search.
       * @property {CCStoreConfiguration} storeConfiguration An instance of the cc-store-configuration containing store-configuration data.
       */
      function SearchViewModel(pAdapter, data) {
        
        if(SearchViewModel.prototype.singleInstance) {
          throw new Error("Cannot instantiate more than one SearchViewModel, use SearchViewModel.getInstance(pAdapter, data)");  
        }
        
        var self = this;
  
        self.siteId = "Default";
        self.pagePath = "searchresults";
        self.defaultTypeaheadService = "Default/services/typeahead";
        self.popularTypeaheadSearchService = "Default/keywords/typeahead";
        self.popularTypeaheadSearchInterface = "keywords";
        self.searchPathPattern = RegExp("^.*(" + self.pagePath + ".*)$");
  
        self.adapter = pAdapter;
        self.isNewSearch = true;
        self.isCategorySearch = false;
        self.isRequesting = false;
        self.searchLocale = ko.observable();
        self.storeConfiguration = CCStoreConfiguration.getInstance();
        /**
         * Create a search request.
         * Set the flag getFromUrlParam to true if you want the data from the url
         * instead of providing the params.
         * 
         * @function
         * @name SearchViewModel#createSearch
         * @param {Object} otherData
         */ 
        self.createSearch = function (otherData) {
          var inputParams;
          // Set the this value to a variable and use it as required
          var current = this;
          var useEnhancedSearchEndpoint = (window.clientConfigData && window.clientConfigData.useEnhancedSearch && window.clientConfigData.useEnhancedSearch == "true") ? true : false;
  
          self.assemblerPagesPath = null;
  
          // Set this to the search view model in case the data is to be taken from the url params
          if (current.getFromUrlParam) {
            current = self;
          }
          // Set all the extra data sent to the current
          for (var property in this) {
            if (this.hasOwnProperty(property)) {
              current[property] = this[property];
            }
          }
          inputParams = {};
          
          /*
           * If data is sent through pubsub binding from other places, it will be present in current.
           * Put them in inputParams directly.
           */
  
          if (typeof current.navigationDescriptors != "undefined" && current.navigationDescriptors != "") {
            inputParams[CCConstants.SEARCH_NAV_DESCRIPTORS_KEY] = current.navigationDescriptors;
          }
  
          if (current.suppressResults !== null && current.suppressResults !== undefined) {
            inputParams[CCConstants.SEARCH_SUPPRESS_RESULTS] = current.suppressResults;
          }
  
          if (current.searchType) {
              inputParams[CCConstants.SEARCH_TYPE] = current.searchType;
            }
  
          if (current.recordOffSet !== null && current.recordOffSet !== undefined) {
              inputParams[CCConstants.SEARCH_NAV_ERECS_OFFSET] = current.recordOffSet;
          }
  
          if (current.recordsPerPage !== null && current.recordsPerPage !== undefined) {
              inputParams[CCConstants.SEARCH_REC_PER_PAGE_KEY] = current.recordsPerPage;
          }
  
          if (current.recSearchKey){
            inputParams[CCConstants.SEARCH_NAV_EREC_SEARCHES_KEY] = current.recSearchKey;
          }
  
          if (current.searchText) {
             inputParams[CCConstants.SEARCH_TERM_KEY] = current.searchText ;
           }
  
          if (current.searchInterface) {
            inputParams[CCConstants.SEARCH_NAV_EREC_SEARCHES_KEY] = current.searchInterface ;
          }
  
          if (current.sortDirectiveProperty) {
            var sortParam = current.sortDirectiveProperty;
              if( (current.sortDirectiveOrder !== undefined) && (current.sortDirectiveOrder === "desc") ) {
                sortParam = sortParam + "|1";
              } else {
                sortParam = sortParam + "|0";
              }
              inputParams[CCConstants.SEARCH_SORT_ORDER] = sortParam;
          }
  
          if (current.recSpellCorrectionKey) {
            inputParams[CCConstants.SEARCH_DYM_SPELL_CORRECTION_KEY] = current.recSpellCorrectionKey;
          }
  
          if (current.rangeFilter) {
            inputParams[CCConstants.SEARCH_RANGE_FILTER] = current.rangeFilter;
          }
  
          if (current.recFilter) {
            inputParams[CCConstants.SEARCH_NAV_RECORD_FILTER_KEY] = current.recFilter;
          }
  
          //Map all the additional search query parameters to the input params
          if (current.additionalSearchQueryParams) {
            inputParams = Object.assign(inputParams, current.additionalSearchQueryParams);
          }
  
          var ignoreList = ["page"]; //Url properties to be ignored for the search request
          /*
           * Copy all other properties from url available in searchKeysMap in inputParams
           */
          for(var prop in current.searchKeysMap){
            if(ignoreList.indexOf(prop) < 0 && (inputParams[prop] == null || inputParams[prop] == undefined)){
              inputParams[prop] = current.searchKeysMap[prop];
            }
          }
          // Add additional properties in inputParams
          inputParams[CCConstants.VISITOR_ID] = pageViewTracker.getVisitorId();
          inputParams[CCConstants.VISIT_ID] = pageViewTracker.getVisitId();
          inputParams[CCConstants.SEARCH_LANGUAGE] = self.searchLocale();
  
          if (current.newSearch !== undefined){
            self.isNewSearch = current.newSearch;
          } else {
            self.isNewSearch = true;
          }
  
          // Get URL path:
          // e.g. "/Default/searchresults/all-products/_/N-123" becomes
          // "Default/searchresults/all-products/_/N-123".
          // If not matched, URL path falls back to "Default/searchresults".
          var id = self.siteId + "/" + self.pagePath;
          var rawPath = window.location.pathname;
          var matched = self.searchPathPattern.exec(rawPath);
          if (matched != null) {
            var matchedSearchPath = matched[1];
            id = self.siteId + "/" + matchedSearchPath;
          }
          if (otherData.assemblerPagesPath){
            //Replacing assemblerPagesPath in the place of "searchresults" in id
            id = id.replace(self.pagePath, otherData.assemblerPagesPath);
            self.assemblerPagesPath = otherData.assemblerPagesPath;
          } else {
            self.assemblerPagesPath = null;
          }
          if (!self.isRequesting) {
            self.isRequesting = true;
  
            if (current.searchText !== undefined) {
              self.isCategorySearch = false;
            } else {
              self.isCategorySearch = true;
            }
            if (useEnhancedSearchEndpoint || self.assemblerPagesPath) {
              self.adapter.loadJSON(CCConstants.ENDPOINT_SEARCH_ASSEMBLER_PAGES, id,
                  inputParams, self.searchSuccess, self.searchError);
            } else {
              self.adapter.loadJSON(CCConstants.ENDPOINT_SEARCH_SEARCH, id,
                  inputParams, self.searchSuccess, self.searchError);
            }
            self.matchedSearchPath = "";
          }
        };
        
        /**
         * Creates a search and adds the search data.
         * This is used when an array of data is sent from the parameters.
         * 
         * @function
         * @name SearchViewModel#createSearchAndAddData
         * @param {Object} otherData
         */
        self.createSearchAndAddData = function(otherData) {
          // Map to store search keys and their values
          self.searchKeysMap = {};
  
          /*
           *Parse the this.parameters from url for the keys which need default value.
           */
  
          // If page number is not available set default value of 1
          if (!(this.parameters.page) || (typeof parseInt(this.parameters.page) != "number")) {
            self.pageNumber = 1;
          } else{
            self.pageNumber = parseInt(this.parameters.page);
          }
  
          // Calculate recordOffSet with No and pageNumber, if not available, give default value
          if(this.parameters[CCConstants.SEARCH_NAV_ERECS_OFFSET] === null
              || this.parameters[CCConstants.SEARCH_NAV_ERECS_OFFSET] === undefined
                || typeof parseInt(this.parameters[CCConstants.SEARCH_NAV_ERECS_OFFSET]) != "number"){
                  self.recordOffSet = 0 + (self.pageNumber - 1) * CCConstants.DEFAULT_SEARCH_RECORDS_PER_PAGE;
          }else{
            self.recordOffSet = parseInt(this.parameters[CCConstants.SEARCH_NAV_ERECS_OFFSET]) +
                                  (self.pageNumber - 1) * CCConstants.DEFAULT_SEARCH_RECORDS_PER_PAGE;
          }
          self.searchKeysMap[CCConstants.SEARCH_NAV_ERECS_OFFSET] = self.recordOffSet;
  
          // Parse Nrpp to recordsPerPage, if not available, give default value
          if(this.parameters[CCConstants.SEARCH_REC_PER_PAGE_KEY] === null
              || this.parameters[CCConstants.SEARCH_REC_PER_PAGE_KEY] === undefined
                || typeof parseInt(this.parameters[CCConstants.SEARCH_REC_PER_PAGE_KEY]) != "number"){
                  self.recordsPerPage = CCConstants.DEFAULT_SEARCH_RECORDS_PER_PAGE;
          }else{
            self.recordsPerPage = parseInt(this.parameters[CCConstants.SEARCH_REC_PER_PAGE_KEY]);
          }
          self.searchKeysMap[CCConstants.SEARCH_REC_PER_PAGE_KEY] = self.recordsPerPage;
  
          // Parse Ntt to searchText as it is used in other places, also to maintain backward compatibility
          if(this.parameters[CCConstants.SEARCH_TERM_KEY] !== null
              && this.parameters[CCConstants.SEARCH_TERM_KEY] !== undefined){
                self.searchText = decodeURIComponent(this.parameters[CCConstants.SEARCH_TERM_KEY]);
                self.searchKeysMap[CCConstants.SEARCH_TERM_KEY] = self.searchText;
          }else{
            self.searchText = "";
          }
  
          // Parse Ntk to searchText as it is used in other places, also to maintain backward compatibility
          if (this.parameters[CCConstants.SEARCH_NAV_EREC_SEARCHES_KEY] !== null
                && this.parameters[CCConstants.SEARCH_NAV_EREC_SEARCHES_KEY] !== undefined) {
              self.recSearchKey = decodeURIComponent(this.parameters[CCConstants.SEARCH_NAV_EREC_SEARCHES_KEY]);
              self.searchKeysMap[CCConstants.SEARCH_NAV_EREC_SEARCHES_KEY] = self.recSearchKey;
          }
          if (self.recSearchKey === undefined) {
            self.recSearchKey = "";
          }
  
          // Parse N to navigationDescriptors and searchKeysMap after replacing "+" with " "
          if(this.parameters[CCConstants.SEARCH_NAV_DESCRIPTORS_KEY] !== null
              && this.parameters[CCConstants.SEARCH_NAV_DESCRIPTORS_KEY] !== undefined){
            self.navigationDescriptors = decodeURIComponent(this.parameters[CCConstants.SEARCH_NAV_DESCRIPTORS_KEY]).replace(/\+/g, " ");
            self.searchKeysMap[CCConstants.SEARCH_NAV_DESCRIPTORS_KEY] = self.navigationDescriptors;
          } else {
            self.navigationDescriptors = "";
          }
  
          /*
          *Iterate through all the properties in this.parameters from url and store them in searchKeysMap.
          *Also put the parsed values in viewmodel variables as they are used from other places too.
          */
          for(var prop in this.parameters){
  
            // Do not search if type is undefined or type other than "search"
            if(prop == CCConstants.PARAMETERS_TYPE){
              if(this.parameters[prop] != CCConstants.PARAMETERS_SEARCH_QUERY){
                return;
              }
            }
            // Put all other properties from url in searchKeysMap as it is.
            else{
              if(this.parameters[prop] !== null && this.parameters[prop] !== undefined){
                self.searchKeysMap[prop] = decodeURIComponent(this.parameters[prop]);
              }
            }
          }
        };
        
        /**
         * Search request success callback function which publishes a pubsub event with the search results.
         * 
         * @private
         * @function
         * @name SearchViewModel#searchSuccess
         */
        self.searchSuccess = function(result){
          if(result){
              //If search result json object contains key as "endeca:redirect"  then we will redirect to url specified in the redirect keyword configuration
              //In this case search results page will not be shown even if there are any products available with the search term.
            if(result['endeca:redirect'] && result['endeca:redirect'].link && result['endeca:redirect'].link.url){
              var redirectUrl= result['endeca:redirect'].link.url;
              //If redirectUrl starts with / then it might be internal site
              if(redirectUrl.charAt(0) !== '/') {
                //It will redirect the user to a configured Redirect URL
                //In IE and Edge browsers redirect URL will be opened  in new tab and in other browsers we will open it in same tab
                if(navigator.userAgent.match(/Trident/) ||
                     navigator.userAgent.match(/Edge/)) {
                  window.open(redirectUrl, '_newtab');
                } else {
                  window.location.replace(redirectUrl);
                }
              }else{
                //It will redirect to the uri with the current hostname
                navigation.goTo(redirectUrl, false, true);
              }
              self.isRequesting = false;
              return;
            }
          }
          var messageDetails = [{
                                  message: CCConstants.SEARCH_MESSAGE_SUCCESS,
                                  requestor: self
                               }];
          
          if (result['@error']) {
            log.error("search error returned :" + result['@error']);
  
            messageDetails = [{message: CCConstants.SEARCH_MESSAGE_FAIL}];
          } else {
            result.assemblerPagesPath = self.assemblerPagesPath; //Adding the assemblerPagesPath to the result
            searchResDetails.update(result);
            searchResDetails.isNewSearch = self.isNewSearch;
          }
          
          // Publish 
          if (self.isCategorySearch) {
            $.Topic(pubsub.topicNames.SEARCH_RESULTS_FOR_CATEGORY_UPDATED).publishWith(searchResDetails, messageDetails);
          }
          else {
            $.Topic(pubsub.topicNames.SEARCH_RESULTS_UPDATED).publishWith( searchResDetails,messageDetails);
          }
          self.isRequesting = false;
        };
        
        /**
         * Search request failure callback function. This publishes a search failed pubsub event.
         * 
         * @private
         * @function
         * @name SearchViewModel#searchError
         */
        self.searchError = function(result){
  
          // Publish
          if (self.isCategorySearch) {
            $.Topic(pubsub.topicNames.SEARCH_FAILED_TO_PERFORM).publish();
          }
          else {
            var messageDetails = [{message: CCConstants.SEARCH_MESSAGE_FAIL}];
            $.Topic(pubsub.topicNames.SEARCH_RESULTS_UPDATED).publishWith(result,messageDetails);
          }
        self.isRequesting = false;
        };
        
        /**
         * Create a typeahead search request.
         * 
         * @function
         * @name SearchViewModel#typeaheadSearch
         * @param {Object} otherData
         */
        self.typeaheadSearch = function (otherData) {
            alert("inside typeaheadSearch");
          var id, inputParams;
          if (this.searchText !== undefined) {
            this.searchText = this.searchText.trim();
          }
          if(this.typeaheadConfig !== undefined && this.typeaheadConfig.searchText !== undefined) {
            this.searchText = this.typeaheadConfig.searchText;
          }
          var typeaheadConfig = this.typeaheadConfig;
          var successCallBack = function(result) {
            self.successTypeahead(result, typeaheadConfig);
          }
  
          var visitorId = pageViewTracker.getVisitorId();
          var visitId = pageViewTracker.getVisitId();
          inputParams = {};
          inputParams[CCConstants.SEARCH_TERM_KEY] =  this.searchText;
          inputParams[CCConstants.SEARCH_NAV_EREC_SEARCHES_KEY] = CCConstants.TYPEAHEAD_SEARCH_INTERFACE;
          inputParams[CCConstants.VISITOR_ID] = visitorId;
          inputParams[CCConstants.VISIT_ID] = visitId;
          inputParams[CCConstants.SEARCH_TYPE] = CCConstants.SEARCH_TYPE_TYPEAHEAD;
          inputParams[CCConstants.SEARCH_LANGUAGE] = self.searchLocale();
          inputParams[CCConstants.ASSEMBLER_PATH_QUERY_PARAM] = CCConstants.ASSEMBLER_DEFAULT_TYPEAHEAD_PATH;
          inputParams[CCConstants.ASSEMBLER_REDIRECTS_QUERY_PARAM] = "yes";
          inputParams[CCConstants.ASSEMBLER_SITE_QUERY_PARAM] = "default";
  
          if(this.typeaheadConfig !== undefined && this.typeaheadConfig.queryParams !== undefined ) {
  
            if (this.newSearch !== undefined){
              self.isNewSearch = this.newSearch;
            }
  
            // iterate over input map entries and add them to assembler query request.
            this.typeaheadConfig.queryParams.forEach(function(value, key) {
              inputParams[key] = value;
            });
            $.each(this.typeaheadConfig.queryParams, function(key, value) {
              inputParams[key] = value;
            });
  
            if(typeaheadConfig.usePopularSearch === true){
              inputParams[CCConstants.SEARCH_NAV_EREC_SEARCHES_KEY] = self.popularTypeaheadSearchInterface;
              id = self.popularTypeaheadSearchService;
              self.adapter.loadJSON(CCConstants.ENDPOINT_SEARCH_ASSEMBLER_PAGES, id, inputParams, successCallBack,  self.failureTypeahead);
            } else {
              id = typeaheadConfig.assemblerPagesPath ? typeaheadConfig.assemblerPagesPath : 'Default/services/typeahead'; //Updating the id of the call with assemblerPagesPath.
              self.adapter.loadJSON(CCConstants.ENDPOINT_SEARCH_ASSEMBLER_PAGES, id, inputParams, successCallBack,  self.failureTypeahead); //Endpoint call to new assembler pages endpoint.
            }
  
          } else {
  
            inputParams[CCConstants.SEARCH_NAV_ERECS_OFFSET] = this.recordOffSet;
            inputParams[CCConstants.SEARCH_REC_PER_PAGE_KEY] = this.recordsPerPage;
  
  
            if (this.newSearch !== undefined){
              self.isNewSearch = this.newSearch;
            }
  
            id = 'assembler';
            self.adapter.loadJSON('assembler', id, inputParams, self.typeaheadSuccess, self.typeaheadError);
  
          }
  
        };
  
        self.successTypeahead = function(result, typeaheadConfig) {
  
          var messageDetails = [{message: CCConstants.SEARCH_MESSAGE_SUCCESS}];
          if (result['@error']) {
            log.error("search error returned :" + result['@error']);
            messageDetails = [{message: CCConstants.SEARCH_MESSAGE_FAIL}];
          }
  
          if((result.resultsList) && (result.resultsList.records)) {
  
            var productRecords = result.resultsList.records;
            for (var i = 0; i < productRecords.length; i++) {
              if(!typeaheadConfig.assemblerPagesPath && typeaheadConfig.usePopularSearch !== true){
  
              var skuRecord = productRecords[i].records[0];
              var displayRecord = {}, displayPrice;
              $.each(typeaheadConfig.displayProps, function(index, displayProp){
  
                if(skuRecord.attributes[displayProp]
                    && skuRecord.attributes[displayProp] !== undefined) {
  
                  displayRecord[displayProp] = skuRecord.attributes[displayProp][0];
                } else {
                  displayRecord[displayProp] = '';
                }
  
              });
  
              // Map the default set of properties to response object
              // build product link. 
              // For style based products, build query params for variant name and value.
              displayRecord["product.route"] = skuRecord.attributes["product.route"][0];
              if(Array.isArray(skuRecord.attributes["sku.styleProperty"]) ) {
                $.each(skuRecord.attributes["sku.styleProperty"], function(index, styleProperty){
                    var styleValue;
                    if (Array.isArray(skuRecord.attributes["sku."+styleProperty])) {
                        styleValue = skuRecord.attributes["sku."+styleProperty][0];
                    }
                    if (styleValue) {
                      displayRecord["product.route"] = displayRecord["product.route"]
                                     + "?variantName=" + styleProperty + "&variantValue=" + styleValue;
                    } 
                });
                
              }
              // calculate price to be displayed in typeahead dropdown.
              // OOTB, assembler search query would give the aggregated record
              // rolled up on 'product.id'. In such cases we would pick 'sku.minActivePrice'.
              // If not, we loop through the sku's list and find the minimum sale price among them.
              if(productRecords[i].attributes && productRecords[i].attributes["sku.minActivePrice"]
                      && Array.isArray(productRecords[i].attributes["sku.minActivePrice"])) {
                // use the calculated 'sku.minActivePrice'
                displayPrice = productRecords[i].attributes["sku.minActivePrice"][0];
              } else {
                // calculate the displayPrice by looping through all SKU's.
                var productSalePrice = (skuRecord.attributes["product.salePrice"]) ? skuRecord.attributes["product.salePrice"][0] : null;
                var productListPrice = (skuRecord.attributes["product.listPrice"]) ? skuRecord.attributes["product.listPrice"][0] : null;
                var productPrice = productSalePrice ? productSalePrice : productListPrice;
                var minSkuPrice;
                if(Array.isArray(productRecords[i].records) && productRecords[i].records.length > 0) {
                  $.each(productRecords[i].records, function (index, skuRec){
                    var skuSalePrice = (skuRec.attributes["sku.salePrice"]) ? skuRec.attributes["sku.salePrice"][0] : null;
                    var skuListPrice = (skuRec.attributes["sku.listPrice"]) ? skuRec.attributes["sku.listPrice"][0] : null;
                    var skuPrice = skuSalePrice ? skuSalePrice : skuListPrice;
                    if(!skuPrice) {
                      skuPrice = productPrice;
                    }
                    if(!minSkuPrice || (skuPrice < minSkuPrice)) {
                      minSkuPrice = skuPrice;
                    }
                  });
                }
                displayPrice = minSkuPrice;
              }
              displayRecord["displayPrice"] = displayPrice;
              displayRecord["product.repositoryId"] = skuRecord.attributes["product.repositoryId"][0];
              if(Array.isArray(skuRecord.attributes["product.primaryImageAltText"])) {
                displayRecord["product.primaryImageAltText"] = skuRecord.attributes["product.primaryImageAltText"][0];
              } else {
                  displayRecord["product.primaryImageAltText"] = "";    
              }
              if(Array.isArray(skuRecord.attributes["product.primaryImageTitle"])) {
                displayRecord["product.primaryImageTitle"] = skuRecord.attributes["product.primaryImageTitle"][0];
              } else {
                  displayRecord["product.primaryImageTitle"] = "";
              }
              typeaheadConfig.searchResults.push(displayRecord);
            } else {
              typeaheadConfig.searchResults.push(productRecords[i].attributes);
            }
            }
          }
          var result = (typeaheadConfig.getSearchResponse !== undefined && typeaheadConfig.getSearchResponse) ? result : null;
          typeaheadConfig.displayCallback(typeaheadConfig, result);
        };
  
        self.failureTypeahead = function(result) {
          log.error("Couldn't execute typeahead search query.");
        };
  
        /**
         * Typeahead search request success callback function which publishes a pubsub event with the search results.
         * 
         * @private
         * @function
         * @name SearchViewModel#typeaheadSuccess
         */      
        self.typeaheadSuccess = function(result) {
          
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
            
        };
        
        /**
         * Typeahead search request failure callback function which publishes a pubsub failure event.
         * 
         * @private
         * @function
         * @name SearchViewModel#typeaheadError
         */   
        self.typeaheadError = function(result){
          
          var messageDetails = [{message: CCConstants.SEARCH_MESSAGE_FAIL}];
          
           var searchResults = [];
          $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_UPDATED).publishWith(searchResults,[{message:"success"}]);
          
        };
              
        // Subscribe to the search create pubsub.topicNames.SEARCH_CREATE_CATEGORY_LISTING
        $.Topic(pubsub.topicNames.SEARCH_CREATE_CATEGORY_LISTING).subscribe(self.createSearch);
        // Subscribe to the search create pubsub.topicNames.SEARCH_CREATE
        $.Topic(pubsub.topicNames.SEARCH_CREATE).subscribe(self.createSearch);
        
        // Subscribe to the page parameters pubsub.topicNames.PAGE_PARAMETERS
        // Please note that the SEARCH_CREATE is kept intact since it is also used
        // in searchTypeAhead
        $.Topic(pubsub.topicNames.PAGE_PARAMETERS).subscribe(self.createSearchAndAddData);
        
        // Subscribe to the search create pubsub.topicNames.SEARCH_TYPEAHEAD
        $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD).subscribe(self.typeaheadSearch);
        
        return(self);
      }
      
      /**
       * setContext
       * Set the context data from the SearchDataInitializer
       *
       * @function
       * @name SearchViewModel#setContext
       * @param {Object} pContext
       */
      SearchViewModel.prototype.setContext = function(pContext) {
        var self = this;
        if (pContext.global.locale) {
          self.searchLocale(pContext.global.locale);
        }
        self.contextData = pContext;
      };
      
      /**
       * Return the singleton instance of SearchViewModel.
       *
       * @function
       * @name SearchViewModel#getInstance
       * @param {Object} pAdapter
       * @param {Object} data 
       * @param {Object} pParams Optional params object which will be used as the context for the search.
       */
      SearchViewModel.getInstance = function(pAdapter, data, pParams) {
        if(!SearchViewModel.prototype.singleInstance) {
          SearchViewModel.prototype.singleInstance = new SearchViewModel(pAdapter, data);
        }
        if (pParams) {
          SearchViewModel.prototype.singleInstance.setContext(pParams);
        }
        
        return SearchViewModel.prototype.singleInstance;
      };
      
      /**
       * Get the navigation parameters excluding the additional search params.
       * 
       * @function
       * @name SearchViewModel#getFilteredNavState
       * @returns {string} The navigation state as a URI param string.
       */
      SearchViewModel.prototype.getFilteredNavState = function(navivationString) {
        var filteredArray = [];
        var addnlSearchParams = [CCConstants.VISITOR_ID, CCConstants.VISIT_ID, CCConstants.SEARCH_LANGUAGE, CCConstants.SEARCH_TYPE];
        var params = navivationString.split("&");
        for (var i = 0; i < params.length; i++) {
          var tempParam = params[i].split("=");
          if (addnlSearchParams.indexOf(tempParam[0]) == -1){
            filteredArray.push(params[i]);
          }
        }    	
        return filteredArray.join("&");
      };
      
      return SearchViewModel;
      
    });
  
  