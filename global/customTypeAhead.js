/**
 * @fileoverview searchResultsDetails holds the information returned from a search.
 * 
 */
define(
  //-------------------------------------------------------------------
  // PACKAGE NAME
  //-------------------------------------------------------------------
  'viewModels/customsearchTypeahead',
  
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['knockout', 'pubsub', 'ccConstants', 'CCi18n', 'navigation', 'jquery', 'ccNumber', 'pageLayout/product', 'pageLayout/site', 'ccRestClient', 'storageApi', 'viewModels/searchResultDetails','bstypeahead', 'bootstrap'],
    
  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function (ko, pubsub, CCConstants, CCi18n, navigation, $, ccNumber, Product, SiteViewModel, ccRestClient, storageApi, searchResDetails) {
  
    "use strict";
    var mInstance = null;
    
    var PRODUCT_URL_ROOT = '/product/';
    if (CCConstants.ALLOW_HASHBANG) {
     PRODUCT_URL_ROOT = '#!' + PRODUCT_URL_ROOT; 
    }
    var COMMON_RESOURCES = 'ns.common:resources.';
    var NO_MATCHES_FOUND = '--noMatchesFound--';
    
    var CLOSE            = 'close';
    var SHOW_ALL         = 'showall';
    
    var MIN_CHARACTERS   = 2;
    
    var locale = ccRestClient.getStoredValue(CCConstants.LOCAL_STORAGE_USER_CONTENT_LOCALE);
    if(locale != null) {
      locale = JSON.parse(locale)[0].name;
    } else {
      locale = $(':root').attr('lang');
    }
    // Configuring chinese locales to support typeahead with minimum one character length
    if(locale == "zh_CN" || locale == "zh_TW") {
        MIN_CHARACTERS = 1;
    }

    var MAX_RESULTS      = 5;
    var SEARCH_DELAY     = 300; // milliseconds
    var LEFT_MARGIN      = 10;
    
    var self;
    var currencySymbol;
    var productListing = ko.observable(null);
    var isModal = ko.observable(false) ;
    
    var isExactSearch = ko.observable(false);
    var fractionalDigits;
    var dropdownOpenedFlag = ko.observable(false);
    var noImageThumb = ko.observable('/img/no-image.jpg');

    $.fn.typeahead.Constructor.prototype.keyup = function (e) {
      switch(e.keyCode) {
        case 9: // tab
        case 40: // down arrow
        case 38: // up arrow
        case 16: // shift
        case 17: // ctrl
        case 18: // alt
          break;

        case 13: // enter
          if (!this.shown) return;
          isExactSearch(true)
          this.select();
          break;

        case 27: // escape
          if (!this.shown) return;
          this.hide();
          break;

        default:
          this.lookup();
      }

      e.stopPropagation();
      e.preventDefault();
    }
      
    $.fn.typeahead.Constructor.prototype.move = function (e) {
      if (!this.shown) return;

      switch(e.keyCode) {          
        case 13: // enter
        case 27: // escape
          e.preventDefault();
          break;

        case 38: // up arrow
          if(e.type == "keyup"){
            e.preventDefault();
            this.prev();
          }
          break;

        case 9: // tab  
          e.preventDefault();
          e.stopPropagation();
                       
          if(e.shiftKey) {
            var active = this.$menu.find('.active').removeClass('active')
              , prev = active.prev();
            if (!prev.length) {
              if (!this.shown) return;
              this.hide();	 
            }

            prev.addClass('active');
                  
          }
          else {
            var active = this.$menu.find('.active').removeClass('active')
              , next = active.next();
            if (!next.length) {
              if(next.prevObject.length == 0 && this.$menu.find('li').length > 1) {
                next = $(this.$menu.find('li')[0]);  
              }            
              else {
                this.$element.next().next().focus();
              }            	  
            }
 
            if (next.length === 0) {
              $('#desktopSearchSubmit').focus();             
            }
            else {
              next.addClass('active');
            } 
          }

          break;
              
        case 40: // down arrow
          if(e.type == 'keydown'){
            e.preventDefault();
            this.next();
          }
          break;
      }

      e.stopPropagation();
    }
      
      
    $.fn.typeahead.Constructor.prototype.blur = function (e) {
      this.focused = false;
      if (!this.mousedover && this.shown) {
        this.$menu.hide();        
        return this;
      }
    }

    /**
     * Creates a SearchTypeahead View Model
     * @private
     * @name SearchTypeahead
     * @param selector Takes the selector which is used to initialize the SearchTypeahead singleton. 
     * @param currency Takes the currency object as input.
     * @param productURLRoot Takes the productURL as input. Its an optional configurable URL root for 
     *                       linking the typeahead results to the product details page. If this value is
     *                       not passed, it uses "#!/product/" as default.
     * @param searchResultPage Takes searchResultsHash as input. It is a optional configurable URL root 
     *                         for search results page. If this value is not passed, it uses "/searchresults" 
     *                         as default.
     * @class SearchTypeahead
     */
    function SearchTypeahead(selector, currency, productURLRoot, searchResultPage, ismodal, prodListing) {
      
      if(mInstance !== null){
          throw new Error("Cannot instantiate more than one SearchTypeahead, use SearchTypeahead.getInstance()");
      }
      currencySymbol = currency.symbol;
      if(currencySymbol.match(/^[0-9a-zA-Z]+$/)) {
        currencySymbol = currencySymbol + ' ';
      }
      fractionalDigits = currency.fractionalDigits;
      this.productURLRoot = productURLRoot ? productURLRoot : PRODUCT_URL_ROOT;
      this.searchResultPage = searchResultPage ? searchResultPage : CCConstants.SEARCH_RESULTS_HASH;
      isModal = (ismodal == null) ? false : ismodal;
      productListing = (prodListing == null) ? null : prodListing;
      this.initialize(selector);
    }
    
    
    SearchTypeahead.prototype = {
      
      // Initializes the singleton.       
      initialize: function(selector) {
        
        if(selector === undefined){
          throw new Error("Cannot instantiate SearchTypeahead, without a selector");
        }

        $(selector).typeahead({source: this.typeaheadSource,
                                minLength: MIN_CHARACTERS, 
                                items: MAX_RESULTS, 
                                matcher: this.typeaheadMatch,
                                sorter: this.typeaheadSort,
                                updater: this.typeaheadUpdater,
                                highlighter: this.typeaheadHighlight,
                                render: this.typeaheadRender,// Non-standard option!
                                select: this.typeaheadSelect,// Non-standard option!
                                hide: this.typeaheadHide,    // Non-standard option!
                                menu: "<ul id='typeaheadDropdown' class='typeahead dropdown-menu' aria-live='polite'></ul>",
                                item: "<li class='typeaheadProduct'><a href='#' onclick = $('#typeaheadDropdown').hide()> \
                                          <img class='typeaheadProductThumbnail visible-md visible-lg img-responsive'/> \
                                          <span class='typeaheadProductName'></span> \
                                          <span class='typeaheadProductPrice'></span> \
                                        </a></li>" });
                                      
        $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_UPDATED).subscribe(this.typeaheadResults);
        $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_CANCEL).subscribe(this.typeaheadCancel.bind(this));

      }, 

      
      typeaheadUpdater: function(item) {
        return item; 
      },


      typeaheadSource: function(query, process) {
        // Finish the set-up of the search typeahead
        // This isn't related to setting the source array
        // but it is the first opportunity to override
        // the render, select & hide methods, which bootstrap
        // doesn't allow for in its options.
        self = this;
        
        this.render = this.options.render || this.render;
        this.select = this.options.select || this.select;
        this.hide   = this.options.hide   || this.hide;
        
        var oldSearchQuery = self.query; 
        this.searchQuery = '';
        
        // Need to set the width of the dropdown in JS as it
        // is positioned absolutely and 'loses' knowledge of
        // parent element width
        this.$menu.css('width', this.$element.width()-(LEFT_MARGIN/2));
        this.$menu.css('margin-left', LEFT_MARGIN);

        // Work out which no-image image to use
        if (SiteViewModel.getInstance().noImageSrc()
          && SiteViewModel.getInstance().noImageSrc() != '') {
          noImageThumb(SiteViewModel.getInstance().noImageSrc());
          var siteNoImage = new Image();
          siteNoImage.onerror = function() {
            noImageThumb('/img/no-image.jpg');
          }
          siteNoImage.src = SiteViewModel.getInstance().noImageSrc()
        }

        // Setup the delayed search request
        if(this.timer) {
          clearTimeout(this.timer);
          //log.info("Typeahead Timer Reset");
        }
        
        var delayedSearch = function() {
          //log.info("Typeahead Delayed Search"); 
          // save reference to 'process' callback as its 
          // needed in the result method
          self.callback = process;
          
          self.query = self.query ? self.query : oldSearchQuery;

          // save the query used in the search
          self.searchQuery = self.query;
          var searchType = storageApi.getInstance().getItem("searchType");
          if(searchType === 'News'){
              SearchTypeahead.customTypeAheadNewsService();
          } else{
              SearchTypeahead.customTypeAheadService();
          }
          // $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD).publishWith(
          //   { searchText : self.query, 
          //     recordsPerPage : MAX_RESULTS, 
          //     recordOffSet : 0},
          //     [{message:"success"}]);
          
        };
        
        this.timer = setTimeout(delayedSearch, SEARCH_DELAY);
          
      },
      typeaheadResults: function(result) {
        if(self && self.focused && !dropdownOpenedFlag()){ 
          if ($('#typeaheadDropdown').css('display') == 'none') {
            $('#alert-modal-change').text(CCi18n.t('ns.common:resources.searchDropdownOpenedText'));
            dropdownOpenedFlag(true);
          }
        }
        if (self && self.focused && self.options){ 
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
                                       record.attributes['product.primaryThumbImageURL'][0] : noImageThumb());
                  product.noImageSrc = 'src="' + noImageThumb() + '"';
                  if (product.thumb == '/img/no-image.jpg') {
                    product.thumb = noImageThumb();
                    product.noImageSrc = 'src="/img/no-image.jpg"';
                  }
                }
                if (record.attributes['product.primaryImageTitle']) {
                  product.primaryImageTitle = record.attributes['product.primaryImageTitle'][0];
                }
                if (product.primaryImageAltText = record.attributes['product.primaryImageAltText']) {
                  product.primaryImageAltText = record.attributes['product.primaryImageAltText'][0];	
                }

                product.link = record.attributes['product.route'][0];
                
                //Extract listing variant name and value from the endeca result records
                if (Array.isArray(record.attributes["sku.styleProperty"])) {
                  variantName = record.attributes["sku.styleProperty"][0];
                  if (variantName) {
                    if (Array.isArray(record.attributes["sku."+variantName])) {
                      variantValue = record.attributes["sku."+variantName][0];
                    }
                    if (variantValue) {
                      product.link = product.link
                                     + "?variantName=" + variantName
                                     + "&variantValue=" + variantValue;
                    }
                  }
                }

                product.price = "";
                sourceArray.push(product);
              }            
            });
          
            $.each(searchResults, function (i, item) {
              if (item.id[0] === sourceArray[i].id) {
                var price = (function (item) {
                  var productPrice, minPrice, sku, skuPrice, index;
                  var productChildSKUsLength = item.childSKUs ? item.childSKUs.length : 0;
                  if (item.minActivePrice) {
                    return item.minActivePrice;
                  } else {
                    productPrice = (item.salePrice || item.salePrice === 0) ? item.salePrice : item.listPrice;                
                    if (item.childSKUs) {
                      if (productChildSKUsLength > 0) {
                        for (var index in item.childSKUs) {
                          sku = item.childSKUs[index];
                          skuPrice = (sku.salePrice || sku.salePrice === 0) ? sku.salePrice : sku.listPrice;             
                          if (!skuPrice && skuPrice != 0) {
                            skuPrice = productPrice;
                          }
                          if ((!minPrice && minPrice != 0) || skuPrice < minPrice) {
                            minPrice = skuPrice;
                          }
                        }
                      } else {
                        minPrice = productPrice;
                      }
                    }        
                    return minPrice;
                  }
                })(item);
                sourceArray[i].price = price;
              }            
            });

            if(!sourceArray.length) {
              // component will not render the dropdown unless there is at least
              // one entry in the source array, so to display a 'no matches found'
              // message, a fake entry must be created.
              sourceArray.push({id: NO_MATCHES_FOUND, name: '', price: '', thumb: '', link: ''});
            }
          
            if(self.callback && typeof(self.callback) === 'function') {
              self.callback(sourceArray);
            }
        }
      },
      
      
      typeaheadCancel: function() {
        self = this;
        if(self.timer) {
          clearTimeout(self.timer);
          //log.info("Typeahead Timer Cancelled");
        }
      },
      
      
      typeaheadMatch: function(item) {
        // Matching handled server-side.
        return true;
      },
      
      
      typeaheadSort: function(items) {
        // Sorting handled server-side.
        return items; 
      },  
      
      
      typeaheadHighlight: function (item) {
        return item;
      }, 
      
      
      typeaheadRender: function (items) {
        if((items.length === 1) && (items[0].id === NO_MATCHES_FOUND)) {
          
          var noMatchesFound = CCi18n.t(COMMON_RESOURCES+'noMatchesFound');
          
          this.$menu.html($("<li class='typeaheadTop' disabled>").text(noMatchesFound));
          
          return this;
        }

        items = $(items).map(function (i, item) {
          i = $(self.options.item).attr('data-value', item.name);

          if(!isModal) {
            i.find('a').attr('href', navigation.getPathWithLocale(item.link)).on('click',function(e) {
            var url = $(this).attr('href');
            navigation.goTo(url);
            e.preventDefault();
            return false;
          });}
          else if(productListing != null) {
            i.find('a').attr('href', "#").on('click', function(e) {
            productListing.getProductDetails.call(productListing, item.id, isModal);
            e.preventDefault();
            return false;
          });}

          i.find('a').attr('title', item.name);
          i.find('a').attr('id', item.id);

          i.find('.typeaheadProductThumbnail').attr('src', item.thumb);
          i.find('.typeaheadProductThumbnail').attr('alt', item.primaryImageAltText);
          i.find('.typeaheadProductThumbnail').attr('title', item.primaryImageTitle);
          i.find('.typeaheadProductThumbnail').attr('onError', item.noImageSrc);
          i.find('.typeaheadProductName').html(item.name);
          
          var formattedPrice;
          var price = parseFloat(item.price).toFixed(fractionalDigits).toString();
          if(price === "NaN" || price === '' || price === null) {
              formattedPrice = CCi18n.t(COMMON_RESOURCES+'priceUnavailable');
          } else {
              var priceSplit = price.split(".")
              formattedPrice = ccNumber.formatNumber(priceSplit[0], true);
              if (fractionalDigits === 0) {
                formattedPrice = formattedPrice.substring(0, formattedPrice.length-3) ;
              } else {
                formattedPrice = formattedPrice.substring(0, formattedPrice.length-2);
                formattedPrice = formattedPrice + priceSplit[1];  
              }
              formattedPrice = currencySymbol + formattedPrice;
          }
          i.find('.typeaheadProductPrice').text(formattedPrice);
          
          return i[0];
        }); 
                
        items.first().addClass('firstResult');
        
        var closeText = CCi18n.t(COMMON_RESOURCES+'closeText');
        var showAllResultsText = CCi18n.t(COMMON_RESOURCES+'showAllResultsText');
        
        this.$menu.html(items);
        this.$menu.prepend(
          $("<li/>").attr({
            "class" : "typeaheadClose",
            "data-value" : CLOSE
          }).append(
            $('<a/>').attr({
              "href" : "#",
              "tabindex" : "0"
            }).text(closeText)
          )
        );

        this.$menu.prepend(
          $("<li/>").attr({
            "class" : "typeaheadAllProducts visible-lg visible-md",
            "data-value" : SHOW_ALL
          }).append(
            $('<a/>').attr({
              "href" : "#",
              "title" : "Show all results"
            }).text(showAllResultsText)
          )
        );

        return this;
      },
      
      
      typeaheadSelect: function() {
        var activeItem = this.$menu.find('.active');
        var nrparam = '';  
        var nrparamnews = '';
        var nparam = '';  
        var productUrl = activeItem.children('a').attr('href');
        var itemId = activeItem.children('a').attr('id');

        if(productUrl &&  productUrl !== '' && productUrl !== '#') {
          // go to product page
          window.location = productUrl;
        } else if(productUrl && productUrl === '#' && isModal && (productListing != null) && (itemId != null)) {
          // This will invoke the viewModel
          productListing.getProductDetails.call(productListing, itemId, isModal);
        } else {
          var val = activeItem.attr('data-value');
          
          // activeItem will be empty if nothing was selected in the drop down
          // i.e. the user hit enter / search with focus on the main input.        
          if((val === SHOW_ALL) || (!activeItem.length)) {
            // cancel any outstanding delayed typeahead request
            mInstance.typeaheadCancel();
            // save the query used in the search
            this.searchQuery = this.query;
            var trimmedText;
            if(isExactSearch()) {
              trimmedText = $.trim(this.query);
              isExactSearch(false);
            } else {
              trimmedText = this.query.trim() + CCConstants.SEARCH_WILDCARD
            }
             var searchType = storageApi.getInstance().getItem("searchType");
             nrparam = storageApi.getInstance().getItem("nrParam");
             nrparamnews = storageApi.getInstance().getItem("nrParamNews");
              nparam = storageApi.getInstance().getItem("nParam");
              if (nparam != "0"){
                  trimmedText = trimmedText+'*';
                  if(searchType === 'News'){
                      if (trimmedText.length !== 0){
                      navigation.goTo('/newsSearch' + "?"
                           + "N=" + nparam + "&"
                          + CCConstants.SEARCH_TERM_KEY + "="
                          + encodeURIComponent(trimmedText) + "&"
                          + CCConstants.SEARCH_TYPE + "=" + CCConstants.SEARCH_TYPE_SIMPLE + "&"
                          + CCConstants.PARAMETERS_TYPE + "=" + CCConstants.PARAMETERS_SEARCH_QUERY
                          + '&' + nrparamnews);
                    } 
                  } else{
                      
                    if (trimmedText.length !== 0){
                        // full search
                      navigation.goTo(mInstance.searchResultPage + "?"
                          + "N=" + nparam + "&"
                          + CCConstants.SEARCH_TERM_KEY + "="
                          + encodeURIComponent(trimmedText) + "&"
                          + CCConstants.SEARCH_RANDOM_KEY + "=" + Math.floor(Math.random()*1000) + "&"
                          + CCConstants.SEARCH_TYPE + "=" + CCConstants.SEARCH_TYPE_SIMPLE + "&"
                          + CCConstants.PARAMETERS_TYPE + "=" + CCConstants.PARAMETERS_SEARCH_QUERY
                          + '&' + nrparam);
                      
                    }
                  }
              } else {
                /** If N value is empty redirect to no search results page*/
                  console.log("no N value");
                  navigation.goTo('/noSearchResults');
              }
          } 
          // else val === CLOSE, no action needed

        }
        
        return this.hide();
      },
      
      
      typeaheadHide: function() {
        // clear the search value, unless user has started
        // typing something else.
        if( this.$element.val() === this.searchQuery ) {
          this.$element.val('').change();
        }
        
        this.$menu.hide();
        this.shown = false;
        if(dropdownOpenedFlag()){
          if ($('#typeaheadDropdown').css('display') == 'none') {
            $('#alert-modal-change').text(CCi18n.t('ns.common:resources.searchDropdownClosedText'));
            dropdownOpenedFlag(false);
          }        	
        }
        return this;
      }
    };

    SearchTypeahead.performTypeAhead = function(typeAheadConfig) {

        // Setup the delayed search request
        if(this.timer) {
            clearTimeout(this.timer);

        }
        var delayedSearch = function() {

            $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD).publishWith(
                {
                    typeaheadConfig : typeAheadConfig
                },
                [{message:"success"}]);

        };
        this.timer = setTimeout(delayedSearch, SEARCH_DELAY);
    }

    SearchTypeahead.getTypeAheadDefaultQueryParams = function() {

        var defaultTypeahedQueryParams = new Map();

        // Record search key
        defaultTypeahedQueryParams.set("Ntk", "TypeAhead");
        // Record search match mode
        defaultTypeahedQueryParams.set("Ntx", "mode matchany");
        // Record Offset
        defaultTypeahedQueryParams.set("No", "0");
        // Number of records per page
        defaultTypeahedQueryParams.set("Nrpp", "5");
        // Minimum number of characters for typeahead search
        defaultTypeahedQueryParams.set("typeaheadMinLength", MIN_CHARACTERS);

        return defaultTypeahedQueryParams;
    },
    /** Custom typeahead changes for product type*/
    SearchTypeahead.customTypeAheadService = function() {
          var l = {};
          var nrParam = storageApi.getInstance().getItem("nrParam");
          var nParam = storageApi.getInstance().getItem("nParam");
          
          if(nParam == "0") {
              /** If N value is empty redirect to no search results page*/
              console.log("no N value");
              var messageDetails = [{message: CCConstants.SEARCH_MESSAGE_FAIL}];
              var searchResults = [];
              $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_UPDATED).publishWith(searchResults,[{message:"success"}]);
              return false;
          } 
          var searchQuery = '/ccstoreui/v1/assembler/assemble?N='+ nParam +'&Ntt=' + self.query + 
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
    /** Custom typeahead changes for News type*/
    SearchTypeahead.customTypeAheadNewsService = function(){
          var l = {};
          var nParam = storageApi.getInstance().getItem("nParam");
          var nrParamNews = storageApi.getInstance().getItem("nrParamNews");
          if(nParam == "0") {
              /** If N value is empty redirect to no search results page*/
              console.log("no N value");
              var messageDetails = [{message: CCConstants.SEARCH_MESSAGE_FAIL}];
              var searchResults = [];
              $.Topic(pubsub.topicNames.SEARCH_TYPEAHEAD_UPDATED).publishWith(searchResults,[{message:"success"}]);
              return false;
          } 
          var searchQuery = '/ccstoreui/v1/assembler/assemble?N='+ nParam +'&Ntt=' + self.query + 
                              '&Ntk=' + CCConstants.TYPEAHEAD_SEARCH_INTERFACE + 
                              '&searchType=' + CCConstants.TYPEAHEAD_SEARCH_INTERFACE + 
                              '&language=en&path=' + CCConstants.ASSEMBLER_DEFAULT_TYPEAHEAD_PATH + 
                              '&redirects=yes&site=default&No=0&Nrpp=100&'+nrParamNews;
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

    /**
     * Fetches an instance of the SearchTypeahead Viewmodel singleton
     * @name SearchTypeahead.getInstance
     * 
     * @param selector Takes the selector which is used to initialize the SearchTypeahead singleton. 
     * @param currency Takes the currency object as input.
     * @param productURLRoot Takes the productURL as input. Its an optional configurable URL root for 
     *                       linking the typeahead results to the product details page. If this value is
     *                       not passed, it uses "#!/product/" as default.
     * @param searchResultPage Takes searchResultsHash as input. It is a optional configurable URL root 
     *                         for search results page. If this value is not passed, it uses "/searchresults" 
     *                         as default.
     * @param isModal         This value will be set to true when the call is made from Agent, so that a viewModal 
     *                        is loaded.
     * @param prodListing     This will contain the instance of ProductListing. Applicable in case of Agent.
     * 
     * @return a singleton instance of the Search Typeahead Viewmodel
     */
    SearchTypeahead.getInstance = function(selector, currency, productURLRoot, searchResultPage, isModal, prodListing) {
        // summary:
        //      Gets an instance of the singleton. It is better to use 
        mInstance = null;
        mInstance = new SearchTypeahead(selector, currency, productURLRoot, searchResultPage, isModal, prodListing);
        return mInstance;
    };

    return SearchTypeahead;
});

