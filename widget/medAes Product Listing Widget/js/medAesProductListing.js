define(['knockout', 'viewModels/productListingViewModelFactory', 'CCi18n',
        'ccConstants', 'pubsub', 'pageLayout/product', 'storageApi', 'ccStoreConfiguration','notifier','ccResourceLoader!global/api-helper','ccRestClient','spinner'
    ],

    function(ko, ProductListingViewModelFactory, CCi18n, CCConstants, pubsub, Product, storageApi, CCStoreConfiguration,notifier,helper,ccRestClient,spinner) {

        "use strict";
        var loadCount = 1;
        var previousSearch = false;
        var itemsPerPage = CCConstants.DEFAULT_ITEMS_PER_PAGE;  
        var offset = 0;
        var currentListType = '';
        var pageData;
        var viewPortWidth;
        var imageSizeList = 300;
        var imageSizeGrid = 300;
        var imageSize2PerRow = 600;
        var imageSize3PerRow = 400;
        var imageSize4PerRow = 300;
        var lastCategoryId = "";
        var selectedProductsPerRowStorageKey = 'selectedProductsPerRow';
        var changedViaPagination = false;
        var productViewed = false;
        function getParameterByName(name, url) {
            if (!url) url = window.location.href;
            name = name.replace(/[\[\]]/g, "\\$&");
            var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
                results = regex.exec(url);
            if (!results) return null;
            if (!results[2]) return '';
            return decodeURIComponent(results[2].replace(/\+/g, " "));
        }
        return {
        
            productsPerRowArray: ko.observableArray([ko.observable(false), ko.observable(false), ko.observable(false), ko.observable(false), ko.observable(false)]),
            selectedProductsPerRow: ko.observable(),
            displayRefineResults: ko.observable(false),
            showListViewButton: ko.observable(false),
            showResultsPerPageSection: ko.observable(false),
            largeDimensions: ko.observable("300,300"),
            mediumDimensions: ko.observable("300,300"),
            imageSizes: [imageSizeList, imageSizeGrid, imageSize2PerRow, imageSize3PerRow, imageSize4PerRow], //image sizes for items per row (list, grid, 2,3,4)
            rowClass: ko.observable("items4"),
            WIDGET_ID: 'productListing',
            mobileSize: 300,
            priceCallCompleted: ko.observable(false),
            beforeAppearLoaded: $.Deferred(),
            isAndroidDevice: ko.observable(false),
            currentProductList :ko.observableArray([]),
            addCustomClassForMobile: function(){
                if($(window).width()<=991){
                     $('.stack-template').parent().parent().removeClass('col-sm-10').addClass('col-sm-12');
                } else{
                     $('.stack-template').parent().parent().removeClass('col-sm-12').addClass('col-sm-10');
                }
               
            },
           
            onLoad: function(widget) {
                var ua = navigator.userAgent.toLowerCase();
                var isAndroid = ua.indexOf("android") > -1;
                widget.isAndroidDevice(isAndroid);
                // create productTypes map for which listingVaariant exists.
                var productListingTypesMap = {};
                if ((widget.productTypes) && (widget.productTypes())) {
                    ko.utils.arrayForEach(widget.productTypes(), function(productType) {
                        for (var i = 0; i < productType.variants.length; i++) {
                            if (productType.variants[i].listingVariant) {
                                productListingTypesMap[productType.id] = productType.variants[i];
                                break;
                            }
                        }
                    });
                }
                widget.productListingTypes = productListingTypesMap;

                var contextObj = {};
                widget.productListing = new Object();
                contextObj[CCConstants.ENDPOINT_KEY] = CCConstants.ENDPOINT_PRODUCTS_LIST_PRODUCTS;
                contextObj[CCConstants.IDENTIFIER_KEY] = "productListingData";
                var filterKey = CCStoreConfiguration.getInstance().getFilterToUse(contextObj);
                if (filterKey) {
                    widget.productListing.filterKey = filterKey;
                }
                // disabling refine results button if there are no results for the selected category.
                $.Topic(pubsub.topicNames.SEARCH_RESULTS_FOR_CATEGORY_UPDATED).subscribe(function(obj) {
                    if (!this.navigation || this.navigation.length == 0) {
                        widget.displayRefineResults(false);
                    } else {
                        widget.displayRefineResults(true);
                    }
                });

                // disabling refine results button if search is unavailable.
                $.Topic(pubsub.topicNames.SEARCH_FAILED_TO_PERFORM).subscribe(function(obj) {
                    widget.displayRefineResults(false);
                });

                var self = this;
                // TODO: This sortOptions property would make a nice
                // configuration option. Should be specified server-side in widget
                // configuration
                var sortOptions = [{
                        "id": "sku.activePrice",
                        "displayText": CCi18n.t("ns.medAesProductListing:resources.sortByRelevanceText"),
                        "order": ko.observable("none"),
                        "maintainSortOrder": true,
                        "serverOnly": true
                    },
                    /* {
                              "id": "listPrice",
                              "displayText": CCi18n.t("ns.medAesProductListing:resources.sortByPriceAscText"),
                              "order": ko.observable("asc"),
                              "maintainSortOrder": true,
                              "serverOnly": true
                            }, {
                              "id": "listPrice",
                              "displayText": CCi18n.t("ns.medAesProductListing:resources.sortByPriceDescText"),
                              "order": ko.observable("desc"),
                              "maintainSortOrder": true,
                              "serverOnly": true  
                            },*/
                    {
                        "id": "product.x_itemNumber",
                        "displayText": "Sort By : Item Number",
                        "order": ko.observable("asc"),  
                        "maintainSortOrder": true,
                        "serverOnly": true
                    }    
                ];

                var searchSortOptions = [{
                        "id": "product.displayName",
                        "displayText": CCi18n.t("ns.medAesProductListing:resources.sortByRelevanceText"),  
                        "order": ko.observable("none"),
                        "maintainSortOrder": true,
                        "serverOnly": true  
                    }, {
                        "id": "sku.activePrice",
                        "displayText": CCi18n.t("ns.medAesProductListing:resources.sortByPriceAscText"),
                        "sortKey": "sku.activePrice",
                        "order": ko.observable("asc"),
                        "maintainSortOrder": true,
                        "serverOnly": true
                    }, {
                        "id": "sku.activePrice",
                        "displayText": CCi18n.t("ns.medAesProductListing:resources.sortByPriceDescText"),
                        "sortKey": "sku.activePrice",
                        "order": ko.observable("desc"),
                        "maintainSortOrder": true,
                        "serverOnly": true
                    },
                    {
                        "id": "sku.activePrice",
                        "displayText": CCi18n.t("ns.medAesProductListing:resources.sortByPriceDescText"),
                        "sortKey": "sku.activePrice",
                        "order": ko.observable("desc"),
                        "maintainSortOrder": true,
                        "serverOnly": true
                    }

                ];

                currentListType = widget.listType();

                widget.listingViewModel = ko.observable();
                widget.listingViewModel(
                    ProductListingViewModelFactory.createListingViewModel(widget));
                //if (widget.listType() === CCConstants.LIST_VIEW_PRODUCTS) {
                    widget.listingViewModel().sortOptions(sortOptions);
               // } else {
                    //widget.listingViewModel().sortOptions(searchSortOptions);
                //}

                // Optimizing product grid rows formation
                widget.listingViewModel().productGridExtension = true;
                // Using generic sort, to avoid hard coding of sort keys
                widget.listingViewModel().useGenericSort = true;
                // Using client side Product view model caching
                widget.listingViewModel().isCacheEnabled = widget.isViewModelCacheEnabled ? widget.isViewModelCacheEnabled() : false;
                // Specifying number of categories to cache on client side
                widget.listingViewModel().viewModelCacheLimit = widget.viewModelCacheLimit ? widget.viewModelCacheLimit() : 3;

                if (widget.user().catalog) {
                    widget.listingViewModel().catalog = widget.user().catalog.repositoryId;
                }
                widget.listingViewModel().idToSearchIdMap = {
                    "default": "product.relevance",
                    // "listPrice": "sku.activePrice",
                    "itemNumber": "product.id"
                };


                widget.listingViewModel().category.subscribe(function(cat) {
                    if (cat.repositoryId != widget.lastCategoryId) {
                        //changed cat, reset products per page
                        widget.listingViewModel().itemsPerPage = +widget.productsPerPage();
                        widget.listingViewModel().categoryOrSearchChanged = true;
                    }
                    widget.lastCategoryId = cat.repositoryId;
                });

                widget.sortingCallback = function(evt) {
                    // var element = $('#CC-product-sortAction');

                    // $(element).focus();
                };

                // set the initial items per page to the widget's config value for products per page
                widget.listingViewModel().itemsPerPage = +widget.productsPerPage();
                widget.listingViewModel().recordsPerPage(+widget.productsPerPage());


                widget.listingViewModel().submitSearch = function() {

                    var searchTerm = '';
                    var recSearchType = '';
                    if (this.searchText().trim()) {
                        searchTerm = CCConstants.PRODUCT_DISPLAYABLE + CCConstants.SEARCH_PROPERTY_SEPARATOR + this.searchText().trim();
                    }

                    if (this.parameters && this.parameters.searchType) {
                        recSearchType = this.parameters.searchType;
                    }

                    if (this.parameters.N != undefined) {
                        if (this.parameters.N.indexOf('+') != -1) {
                            var finalNVal = this.parameters.N.toString();
                            finalNVal = finalNVal.replace(/\+/g, " ");
                        } else {
                            var finalNVal = this.parameters.N;
                        }
                    } else if (this.parameters.N == undefined) {
                        var finalNVal = this.parameters.N;
                    }


                    var searchParams = {
                        getFromUrlParam: true,
                        newSearch: true,
                        navigationDescriptors: finalNVal,
                        recordsPerPage: this.blockSize,
                        recordOffSet: this.recordOffSet,
                        recDYMSuggestionKey: this.recDYMSuggestionKey,
                        searchType: recSearchType
                    };
                    searchParams.rangeFilter = undefined;
                    searchParams.suppressResults = false;



                    if (this.parameters.Ns) {
                        var sortValues = decodeURIComponent(this.parameters.Ns).split("|");
                        if (sortValues.length === 2) {
                            searchParams.sortDirectiveProperty = sortValues[0];
                            searchParams.sortDirectiveOrder = sortValues[1] == "1" ? "desc" : "asc";
                        }
                    } else {
                        searchParams.sortDirectiveProperty = 'sku.activePrice';
                        searchParams.sortDirectiveOrder = "asc";
                    }

                    if (window.location.search.indexOf('Ntk=product.active') > -1) {
                        searchParams.recSearchKey = "";
                    }

                    $.Topic(pubsub.topicNames.SEARCH_CREATE).publishWith(
                        searchParams, [{
                            message: "success"
                        }]);
                };

                /**
                 * Updates the refinement list for the selected category.
                 */
                widget.updateRefinements = function() {
                    var searchParams = {
                        recordsPerPage: itemsPerPage,
                        recordOffSet: offset,
                        newSearch: false,
                        navigationDescriptors: widget.dimensionId(),
                        suppressResults: true,
                        searchType: CCConstants.SEARCH_TYPE_SIMPLE
                    };
                    $.Topic(pubsub.topicNames.SEARCH_CREATE_CATEGORY_LISTING).publishWith(searchParams, [{
                        message: "success"
                    }]);

                    var categoryInfo = {
                        categoryRoute: widget.category().route,
                        categoryName: widget.category().displayName,
                        repositoryId: widget.category().repositoryId,
                        dimensionId: widget.dimensionId()
                    };
                    storageApi.getInstance().setItem("category", JSON.stringify(categoryInfo));
                    $.Topic(pubsub.topicNames.CATEGORY_UPDATED).publish(categoryInfo);
                };

                /**
                 * Scroll handler method used in phone and tablet modes.
                 *
                 * Method gets next set of products once bottom of product listing
                 * element comes into view
                 **/
                widget.scrollHandler = function(eventData) {

                    var scrollTop = $(window).scrollTop();
                    var viewportHeight = $(window).height();

                    var productListElement = $('#product-grid').hasClass('active') ? '#product-grid' : '#product-list';

                    var productListHeight = $(productListElement).height();

                    if ((scrollTop + viewportHeight) >= ((productListHeight / 5) * 4)) {
                        widget.listingViewModel().incrementPage();
                    }
                };

                // Scroll handle for mobile view
                widget.scrollHandleOnViewPort = function() {
                    // Clear previous scrolls
                    $(window).off('scroll.page');
                    widget.listingViewModel().isLoadOnScroll(false);
                    // Add scroll if it is mobile view only
                    if (widget.listingViewModel().viewportMode() == CCConstants.TABLET_VIEW ||
                        widget.listingViewModel().viewportMode() == CCConstants.PHONE_VIEW || (widget.isScrollEnabled && widget.isScrollEnabled())) {
                        $(window).on('scroll.page', widget.scrollHandler);
                        widget.listingViewModel().pageNumber = 1;
                        // if current page is already 1, then we need to trigger the computation of current products
                        widget.listingViewModel().isLoadOnScroll(true);
                    }
                };

                widget.productGrid = ko.observableArray([]);

                widget.changePageForSearch = function(otherData) {
                    // Do not search if the type is undefined or any other type that search.
                    $("html, body").animate({
                        scrollTop: 0
                    }, "slow");
                    widget.productGrid([]);
                    widget.listingViewModel().targetPage = 1;
                    if (this.parameters.type != CCConstants.PARAMETERS_SEARCH_QUERY) {
                        return;
                    }
                    if (this.parameters.page) {
                        widget.listingViewModel().pageNumber = parseInt(this.parameters.page);
                        widget.listingViewModel().targetPage = parseInt(this.parameters.page);
                    } else {
                        widget.listingViewModel().pageNumber = 1;
                    }
                    widget.listingViewModel().parameters = this.parameters;
                    if (widget.listType() == CCConstants.LIST_VIEW_SEARCH) {

                        if (widget.listingViewModel().recordsPerPage && widget.listingViewModel().recordsPerPage() != null && !widget.changedViaPagination) {
                            // Setting the recordsPerPage from widget configuration
                            if (isNaN(widget.productsPerPage())) {
                                widget.listingViewModel().recordsPerPage(CCConstants.DEFAULT_SEARCH_RECORDS_PER_PAGE);
                            } else {
                                widget.listingViewModel().recordsPerPage(parseInt(widget.productsPerPage()));
                            }
                        }

                        // Add scroll for mobile view
                        widget.scrollHandleOnViewPort();
                        widget.listingViewModel().load(1);
                    }
                    // Add pagination type as type 2
                    widget.listingViewModel().paginationType(2);
                };

                // Handle the page change event data to generate pages
                $.Topic(pubsub.topicNames.PAGE_CHANGED).subscribe(widget.getPageUrlData.bind(widget));
                // Handle the pagination calls
                $.Topic(pubsub.topicNames.PAGE_PAGINATION_CHANGE).subscribe(widget.changePage.bind(widget));
                // Handle search
                $.Topic(pubsub.topicNames.PAGE_PARAMETERS).subscribe(function(otherData) {
                    widget.beforeAppearLoaded.done(
                        widget.changePageForSearch.bind(this));
                });

                /**
                 * Formats the updated products
                 */
                widget.formatProducts = function(products) {
                    var formattedProducts = [];
                    var productsLength = products.length;
                    for (var i = 0; i < productsLength; i++) {
                        if (products[i]) {
                            formattedProducts.push(new Product(products[i]));
                        }
                    }
                    return formattedProducts;
                };

                 widget.resultsText = ko.computed(function() {      
                    var startIndex= widget.listingViewModel().pageStartIndex() + 1;
                        var plpData = {
                            "categoryName": widget.listingViewModel().titleText(),
                             "showResult":  ((widget.listingViewModel().pageEndIndex() != null)&& (widget.listingViewModel().totalNumber() != null))?("Showing" + " " + startIndex + "-" + widget.listingViewModel().pageEndIndex() + " " + "of" + " " + widget.listingViewModel().totalNumber() + " " + "results"):''
                        };
                        $.Topic('plpResultData.memory').publish(plpData);
                    return widget.listingViewModel().resultsText();  
                }, widget.listingViewModel());    

                widget.updateFocus = function() {
                    $.Topic(pubsub.topicNames.UPDATE_LISTING_FOCUS).publish();  
                    return true;
                };

                widget.updateScrollPosition = function() {
                    if (widget.listingViewModel().isCacheEnabled) {
                        var cachedIndex = widget.listingViewModel().findCachedResultIndex();
                        if (cachedIndex != undefined) {
                            widget.listingViewModel().cachedViewModels[cachedIndex].scrollPosition = window.pageYOffset || 0;
                        }
                    }
                };

                widget.updateFocusAndDisableQV = function(data, evt) {
                    //hide the QV to prevent the user clicking it while the main PDP is loading
                    $(".quickViewElement").hide();
                    return widget.updateFocus();
                };

                //Create productGrid computed for the widget
                widget.productGridComputed = ko.computed(function() {
                    widget.createSpinner();
                    var numElements, start, end, width;
                    var rows = [];

                    var products = widget.listingViewModel().currentProductsComputed();
                    if (!products) {
                        return;
                    }
                    for(var i=0; i < products.length ; i++){
                        products[i]['externalSalePrice'] = products[i].salePrice ? ko.observable(products[i].salePrice) : ko.observable(null);
                        products[i]['externalListPrice'] = products[i].listPrice ? ko.observable(products[i].listPrice) : ko.observable(null);
                        products[i]['disableAddToCart'] = ko.observable(true);
                    }
                    numElements = products.length;
                 //   console.log("products",products)
                    width = parseInt(widget.listingViewModel().itemsPerRow(), 10);
                    start = 0;
                    end = start + width;

                    while (end <= numElements) {
                        rows.push(products.slice(start, end));
                        start = end;
                        end += width;
                    }

                    if (end > numElements && start < numElements) {
                        rows.push(products.slice(start, numElements));
                    }

                    return rows;
                }, widget);

                // Below subscription updated productGrid observable array.
                widget.productGridComputed.subscribe(function(newValues) {
                    if (newValues && newValues.length > 0) {
                        if (widget.listingViewModel().refreshValues == true) {
                            widget.productGrid(newValues);
                            widget.listingViewModel().refreshValues = false;
                        } else {
                            widget.productGrid.push.apply(widget.productGrid, newValues); //Push the new row into the grid.
                        }
                    
                        
                    }
                });
                
                widget.currentProductList= ko.computed(function() {
                    return widget.listingViewModel().currentProducts();
                  }, widget).extend({ deferred: true});

                widget.currentProductList.subscribe(function(){
                    //console.log("widget.currentProductList........", widget.currentProductList());
                    if(widget.currentProductList().length > 0) {
                        widget.externalPricingCall();
                    }
                    
                });

                widget.adjustScrollPosition = function() {
                    if (widget.listingViewModel().isCacheEnabled &&
                        widget.productGrid() && widget.productGrid().length > 1) {
                        var cachedIndex = widget.listingViewModel().findCachedResultIndex();
                        if (cachedIndex != undefined && widget.listingViewModel().cachedViewModels[cachedIndex].scrollPosition > 0) {
                            // Stop if there is any scroll top animation.
                            $("html, body").stop();
                            $(window).scrollTop(widget.listingViewModel().cachedViewModels[cachedIndex].scrollPosition);
                        }
                    }
                };

                /**
                 * Updated the grids when the category has been upated
                 */
                widget.categoryUpdate = function(value) {

                    if (!value) {
                        return;
                    }

                    var category = widget.listingViewModel().category();
                    if (widget.listType() !== CCConstants.LIST_VIEW_PRODUCTS) {

                        widget.listType(CCConstants.LIST_VIEW_PRODUCTS);
                        widget.listingViewModel(
                            ProductListingViewModelFactory.createListingViewModel(widget));
                    }


                    if ((!category || (category.id != value.id)) || (previousSearch)) {

                        widget.listingViewModel().resetSortOptions();
                    }
                    if ((!category || (category.id != value.id)) || (previousSearch) || (!widget.listingViewModel().paginationOnly)) {
                        widget.listingViewModel().category(value);
                        widget.listingViewModel().clearOnLoad = true;
                        widget.productGrid([]); //On category update we will need to clear the product grid if it is completely a new category. Also removed a or condition here (!widget.listingViewModel().paginationOnly()). Is it useful anywhere?
                        widget.listingViewModel().targetPage = 1;
                        widget.listingViewModel().load(1);
                        widget.listingViewModel().paginationType(1);
                        previousSearch = false;
                    }
                };

                /**
                 * Issue with bootstrap tab-contents in that sometimes it loses the
                 * active tab, this ensures we have a tab chosen
                 */
                widget.ensureActiveTab = function() {
                    if (!($('#product-grid').hasClass('active') ||
                            $('#product-list').hasClass('active'))) {
                        $('#product-grid').addClass('active');
                    }
                };

                /**
                 *  Handle the widget response when the search result have been updated.
                 */
                if (widget.listType() !== CCConstants.LIST_VIEW_PRODUCTS) {
                    $.Topic(pubsub.topicNames.SEARCH_RESULTS_UPDATED).subscribe(function(obj) {
                        widget.category(null);
                        previousSearch = true;
                        if (widget.listType() !== CCConstants.LIST_VIEW_SEARCH) {
                            widget.listType(CCConstants.LIST_VIEW_SEARCH);
                            widget.listingViewModel(
                                ProductListingViewModelFactory.createListingViewModel(widget));
                        }
                        widget.ensureActiveTab();
                        if ((this.navigation && this.navigation.length > 0) || (this.breadcrumbs && this.breadcrumbs.refinementCrumbs.length > 0)) {
                            widget.displayRefineResults(true);
                        } else {
                            widget.displayRefineResults(false);
                        }
                    });
                }

                $.Topic(pubsub.topicNames.SEARCH_CREATE).subscribe(function(obj) {
                    if (!widget.listingViewModel().changedViaDropDown && !widget.changedViaPagination && !widget.productViewed) {
                        widget.listingViewModel().itemsPerPage = +widget.productsPerPage();
                        widget.listingViewModel().categoryOrSearchChanged = true;
                        widget.changedViaPagination = false;
                    } else if (widget.productViewed) {
                        widget.changedViaPagination = false;
                        widget.listingViewModel().categoryOrSearchChanged = false;
                        widget.productViewed = false;
                    }
                });

                $.Topic(pubsub.topicNames.PAGE_VIEW_CHANGED).subscribe(function(obj) {
                    widget.changedViaPagination = false;
                    // this is only paginated if there is a page in the url
                    if (obj && obj.path == 'searchresults' && obj.parameters != null && obj.parameters.indexOf('&page=') >= 0) {
                        widget.changedViaPagination = true;
                        widget.listingViewModel().categoryOrSearchChanged = false;
                    }
                });

                $.Topic(pubsub.topicNames.PRODUCT_VIEWED).subscribe(function(obj) {
                    widget.productViewed = document.location.pathname != '/searchresults' ? true : false;
                });

                viewPortWidth = $(window).width();

                // Check on viewport resize
                $(window).resize(function() {
                    // Empty product grid whenever view port changes ex: landscape to portrait in iPad
                    // widget.productGrid([]);
                    //Adding window.innerWidth for it to work correctly with the actual screen width
                    var windowWidth = (window.innerWidth || $(window).width());
                    if (widget.isActiveOnPage(pageData) && windowWidth != viewPortWidth) {
                        //widget.listingViewModel().refreshValues=true;
                        if (widget.listingViewModel().viewportMode() == CCConstants.PHONE_VIEW) {  
                            widget.productsPerRowChange(CCConstants.PHONE_VIEW);
                            widget.listingViewModel().itemsPerRow(CCConstants.PHONE_VIEW);

                            largeDimensions: ko.observable(widget.mobileSize + ',' + widget.mobileSize);
                            mediumDimensions: ko.observable(widget.mobileSize + ',' + widget.mobileSize);
                            widget.listingViewModel().listingImageSize(widget.mobileSize);
                                
                           // widget.rowClass("items2 mobile");

                        } else if (widget.listingViewModel().viewportMode() == CCConstants.TABLET_VIEW) {
                            //tablet view defaults to 4

                            widget.productsPerRowChange(CCConstants.LARGE_DESKTOP_VIEW);
                            widget.listingViewModel().itemsPerRow(CCConstants.LARGE_DESKTOP_VIEW);
                            
                        }
                        widget.triggerView()
                        widget.listingViewModel().checkResponsiveFeatures(windowWidth);
                        widget.scrollHandleOnViewPort();
                        widget.listingViewModel().cleanPage();
                        viewPortWidth = windowWidth;
               
                    }
                });
                 widget.triggerView();

                widget.handlePageChanged = function(pageData) {
                    var widget = this;
                    if (!(pageData.pageId == "category" || pageData.pageId == "searchresults")) {
                        $(window).off('scroll.page', widget.scrollHandler);
                    }
                };
                $.Topic(pubsub.topicNames.PAGE_CHANGED).subscribe(widget.handlePageChanged.bind(widget));

                // when the page loads get the selected products per row value from local storage
               
                widget.selectedProductsPerRow(widget.getSelectedProductsPerRow());
            
             



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
            },
            
            triggerView :function(){
                setTimeout(function(){
                    $('#CC-productList-GridButtonThree').trigger('click');
                },1000);
               
            },

            beforeAppear: function(page) {


                var widget = this;

                //Regsiter this subscription only if we are on medium, desktop and large screens
                // if ((widget.isScrollEnabled && !widget.isScrollEnabled()) || (widget.listingViewModel().viewportMode() != CCConstants.TABLET_VIEW && widget.listingViewModel().viewportMode() != CCConstants.PHONE_VIEW)) {
                //   // We will need to clear the grid once the page canges to hold the new set of data.
                //   widget.listingViewModel().currentPage.subscribe(function(newValue) {
                //     if(newValue) {
                //       widget.productGrid([]);
                //     }
                //   });
                // }
                currentListType = widget.listType();

                // Adding code to clear the values of previous search results
                if (widget.listType() == CCConstants.LIST_VIEW_SEARCH) {
                    widget.displayRefineResults(false);
                    widget.listingViewModel().titleText('');
                    widget.listingViewModel().noSearchResultsText('');
                    widget.listingViewModel().suggestedSearches({});
                }


                if (widget.category() && widget.listType() != CCConstants.LIST_VIEW_SEARCH) {
                    widget.categoryUpdate(widget.category());
                }

                // Updating refinements in the GuidedNavigation widget only if search is available.
                if (widget.listType() === CCConstants.LIST_VIEW_PRODUCTS) {
                    if (widget.displayRefineResults() && widget.listingViewModel().paginationOnly) {
                        // do nothing cause we don't want to update the refinements.
                    } else if (widget.dimensionId()) {
                        widget.updateRefinements();
                    } else {
                        widget.displayRefineResults(false);
                        $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_CLEAR).publish();
                    }
                }

                if (widget.showListViewOption) {
                    widget.showListViewButton(widget.showListViewOption());
                }

                if (widget.showResultsPerPageOption) {
                    var scrollEnabled = widget.isScrollEnabled && widget.isScrollEnabled();
                    widget.showResultsPerPageSection(widget.showResultsPerPageOption() && !scrollEnabled);
                }

                widget.listingViewModel().handleResponsiveViewports();

                widget.setDefaultItemsPerRow();
                widget.beforeAppearLoaded.resolve();
                setTimeout(function(){
                  //  console.log("quic)",$(".quick-view p").text("CHOOSE OPTIONS"));
                    // $(".quick-view p").text("CHOOSE OPTIONS");
                });
                
                var catSortByName = getParameterByName('Ns');
                //console.log("catSortByName.......", catSortByName);
                var  itemNumberText = "Sort By : Item Number";
                setTimeout(function(){
                    //console.log("CC-product-listing-sortby..........", $("#CC-product-listing-sortby").length);
                    if(catSortByName && catSortByName.indexOf("x_itemNumber") !=-1) {
                        $("#CC-product-listing-sortby option").each(function() { 
                            this.selected = (this.text == itemNumberText); 
                        });
                    }
                },1500);
                
                $(window).resize(function(){
                    widget.addCustomClassForMobile();
                 });
            
            },

            getPageUrlData: function(data) {
                var widget = this;
                // Set the data to the widget level variable
                pageData = data;
                // Only change these properties if we're on the correct page.
                if (data.pageId == CCConstants.CATEGORY_CONTEXT || data.pageId == CCConstants.SEARCH_RESULTS) {
                    widget.listingViewModel().pageId(data.pageId);
                    widget.listingViewModel().contextId(data.contextId);
                    widget.listingViewModel().seoslug(data.seoslug);
                }
            },
            
          quickview: function(data,event){
          //console.log("Quick View",data);
          var widget = this;
          //console.log(data);
          $("#quickModal").modal('show');
          },
            
             addItemQuickview : function(data, event) {
        // console.log("quickAdd",data);
           if(this.pageContext().page.id !== 'pa1500014') {
              var qty = $(".quick-qty").val();
             var dataProduct = [];
          
            var newProduct = $.extend(true, {}, data, true);
                newProduct.orderQuantity = parseInt(qty,10);
                dataProduct.push(newProduct);
                getWidget.cart().addItem(ko.toJS(dataProduct[0]));
                 $.Topic("external_Promotion_Flag").publish(true);
                 
                $.Topic(pubsub.topicNames.CART_UPDATED).subscribe(function() {
                           $("#quickModal").modal('hide');
                          document.body.scrollTop = 0; 
                          document.documentElement.scrollTop = 0; 
                          $(".content").css('display','block');
                          setTimeout(function(){
                              $(".content").css('display','none');
                          },1000)
                      });  
           }
            else{
                      var parsedData = data;
                      var id = parsedData.id();
                      var dataProduct = [];
                      var qty = $(".quick-qty").val();
                      
                        ccRestClient.authenticatedRequest("/ccstoreui/v1/products/"+ id, {}, function(e) {  
                    //    console.log("e---->",e);
                      
                        var newProduct = $.extend(true, {}, e, true); 
                         newProduct.orderQuantity = parseInt(qty,10);
                         dataProduct.push(newProduct);
                        // console.log(dataProduct,"dataProduct");
                         getWidget.cart().addItem(ko.toJS(dataProduct[0]));
                         $.Topic("external_Promotion_Flag").publish(true);
                 
                        $.Topic(pubsub.topicNames.CART_UPDATED).subscribe(function() {
                           $("#quickModal").modal('hide');
                          document.body.scrollTop = 0; 
                          document.documentElement.scrollTop = 0; 
                          $(".content").css('display','block');
                          setTimeout(function(){
                              $(".content").css('display','none');
                          },1000)
                      });       
                        
                    }, function(data) {
                        //console.log('ProductData Failure', data);
                        
                    }, "GET");  
            }
        },
            
            changePage: function(data) {
                var widget = this;
                $("html, body").animate({
                    scrollTop: 0
                }, "slow");
                // Handle the page number change
                if (data.page) {
                    widget.listingViewModel().pageNumber = parseInt(data.page);
                } else {
                    widget.listingViewModel().pageNumber = 1;
                    widget.listingViewModel().initializeIndex();
                }
                // Add scroll for mobile view
                if (widget.listType() == CCConstants.LIST_VIEW_PRODUCTS) {
                    widget.scrollHandleOnViewPort();
                }
                if ((widget.listType() == CCConstants.LIST_VIEW_PRODUCTS) && data.paginationOnly) {
                    widget.listingViewModel().getPage(widget.listingViewModel().pageNumber);
                }
                widget.listingViewModel().paginationOnly = data.paginationOnly;
                if (!widget.listingViewModel().isLoadOnScroll()) {
                    widget.productGrid([]);
                }
            },

            handleSortingHelper: function(sorting, cb) {
                var widget = this;
                widget.productGrid([]);
                widget.listingViewModel().handleSorting(sorting, cb);
            },

            /**
             * Handles click on refine results
             */
            handleRefineResults: function(data, event) {

                if (!($('#CC-overlayedGuidedNavigation-column').hasClass('open')) && !($('#CC-overlayedGuidedNavigation').hasClass('CC-overlayedGuidedNavigation-mobileView'))) {
                    $('#CC-overlayedGuidedNavigation').addClass('CC-overlayedGuidedNavigation-mobileView');
                    // Add a pubsub to open guided navigation
                    $.Topic(pubsub.topicNames.OVERLAYED_GUIDEDNAVIGATION_SHOW).publish();
                }
                if (($(window)[0].innerWidth || $(window).width()) < CCConstants.VIEWPORT_TABLET_LOWER_WIDTH) {
                    // Remove the scroll handling when the refinements is open in the mobile view.
                    // This saves extra calls when refinements are loaded.
                    $(window).off('scroll.page');
                    $('html, body').css('overflow-y', 'hidden');
                }
                $('#CC-overlayedGuidedNavigation-done').focus();
                return false;
            },
            priceUnavailableText: function() {
                return CCi18n.t('ns.medAesProductListing:resources.priceUnavailable');
            },
            /**
             * Set the numbers of items to display per row
             * @param items       number of items per row
             * @param imagesize   size of image (N.B. the image will be square so just one number ???)
             */
            setItemsPerRow: function(items, imageSize) {
                var widget = this;
                widget.listingViewModel().itemsPerRow(items);
                widget.productGrid([]);
                widget.listingViewModel().listingImageSize(null);
                widget.listingViewModel().itemsPerRowInTabletView(items);
                widget.listingViewModel().itemsPerRowInDesktopView(items);
                widget.listingViewModel().itemsPerRowInLargeDesktopView(items);
                widget.listingViewModel().listingImageSize(imageSize);
                widget.largeDimensions(imageSize + ',' + imageSize);
                widget.mediumDimensions(imageSize + ',' + imageSize);
            },
            /**
             *  Handles change of number of items per row
             *  Updates the values in the array
             *  @param  items   number of items to display per row
             */
            productsPerRowChange: function(itemsPerRow) {
                var widget = this,
                    mobileCss = "";

                if (itemsPerRow != widget.getSelectedProductsPerRow()) {

                    if (widget.isScrollEnabled && widget.isScrollEnabled()) {
                        widget.listingViewModel().currentPage(1);
                        widget.listingViewModel().currentPage.notifySubscribers();
                    }

                    widget.listingViewModel().scrolledViewModels = [];

                    if (itemsPerRow == 0) {
                        widget.setItemsPerRow(1, widget.imageSizes[1]);
                    } else {

                        if (itemsPerRow == -1) {
                            //grid button clicked in mobile/tablet view. 2 per row for mobile, 4 for tablet
                            if (widget.listingViewModel().viewportMode() == CCConstants.PHONE_VIEW) {
                                itemsPerRow = 2;
                                mobileCss = " mobile";
                            } else {
                                itemsPerRow = 4;
                            }

                            if (!widget.isScrollEnabled || (widget.isScrollEnabled && !widget.isScrollEnabled())) {
                                widget.listingViewModel().currentPage(1);
                                widget.listingViewModel().currentPage.notifySubscribers();
                            }
                        }

                        widget.setItemsPerRow(itemsPerRow, widget.imageSizes[itemsPerRow]);
                    }

                    widget.rowClass("items" + itemsPerRow + mobileCss);

                    $.each(widget.productsPerRowArray(), function(i, val) {
                        widget.setProductsPerRowArrayElement(i, itemsPerRow == i);
                    });

                    storageApi.getInstance().setItem(selectedProductsPerRowStorageKey, itemsPerRow);
                    widget.selectedProductsPerRow(itemsPerRow);
                }
            },
            /**
             * Get the value saved in local storage
             * If nothing has been stored yet then return 4 rows
             */
            getSelectedProductsPerRow: function() {
                var widget = this,
                    selectedProductsPerRow = storageApi.getInstance().getItem(selectedProductsPerRowStorageKey);

                if (selectedProductsPerRow == null) {
                    if (widget.listingViewModel().viewportMode() == CCConstants.PHONE_VIEW) {
                        // default to the grid button
                        selectedProductsPerRow = CCConstants.PHONE_VIEW;
                    } else if (widget.listingViewModel().viewportMode() == CCConstants.TABLET_VIEW) {
                        selectedProductsPerRow = CCConstants.LARGE_DESKTOP_VIEW;
                    } else {
                        // default to 4
                        selectedProductsPerRow = CCConstants.LARGE_DESKTOP_VIEW;
                    }
                }

                return selectedProductsPerRow;
            },
            /**
             * Set the default products per row
             */
            setDefaultItemsPerRow: function() {
                var widget = this,
                    selectedProductsPerRow = widget.getSelectedProductsPerRow(),
                    itemsPerRowToSet = selectedProductsPerRow;

                if (selectedProductsPerRow == 0) {
                    if (!widget.showListViewOption()) {
                        storageApi.getInstance().removeItem(selectedProductsPerRowStorageKey);
                        selectedProductsPerRow = widget.getSelectedProductsPerRow();
                        itemsPerRowToSet = selectedProductsPerRow;
                    } else {
                        itemsPerRowToSet = 1;
                    }
                }

                widget.selectedProductsPerRow(selectedProductsPerRow);
                storageApi.getInstance().setItem(selectedProductsPerRowStorageKey, selectedProductsPerRow);
                widget.setItemsPerRow(itemsPerRowToSet, widget.imageSizes[selectedProductsPerRow]);

                if (widget.listingViewModel().viewportMode() == CCConstants.PHONE_VIEW) {
                    widget.rowClass("items2 mobile");
                } else {
                    widget.rowClass("items" + selectedProductsPerRow);
                }

                $.each(widget.productsPerRowArray(), function(i, val) {
                    widget.setProductsPerRowArrayElement(i, selectedProductsPerRow == i);
                });
            },
            /**
             * Update the observable in the array
             * @param index - the index of the item to update
             * @param value - the value of the item
             */
            setProductsPerRowArrayElement: function(index, value) {
                var widget = this;
                widget.productsPerRowArray()[index](value);
            },
            /**
             * Get the class to be used in the ko css binding for
             * the products per row at the given index
             * @param index - the index of the item to update
             */
            getProductsPerRowClass: function(index) {
                return (this.productsPerRowArray()[index]() == true) ? 'active' : '';
            },
            /**
             * Get the class to be used in the ko css binding for
             * the grid or list
             * @param isGrid - whether it's the grid or list
             */
            getGridCss: function(isGrid) {
                var widget = this,
                    selectedProductsPerRow = widget.getSelectedProductsPerRow();

                if (isGrid) {
                    return selectedProductsPerRow != 0 ? 'active' : '';
                } else {
                    return selectedProductsPerRow == 0 ? 'active' : '';
                }
            },
            /**
             *Handle results per page change
             */
            handleResultsPerPageHelper: function(resultsPerPage, callback) {
                var widget = this;

                if (widget.listingViewModel().itemsPerPage != resultsPerPage.value) {
                    widget.productGrid([]);
                    widget.listingViewModel().handleResultsPerPage(resultsPerPage, callback);
                }
            },
            getProductsPerRowHasFocus: function(index) {
                var widget = this,
                    selectedProductsPerRow = widget.getSelectedProductsPerRow();
                return selectedProductsPerRow == index;
            },
            /**
             *Handle results per page change
             */
            resultsPerPageCallback: function(evt) {},

            //custom Add to cart in PLP page  - passing current data of the product as a parameter 

            addToCart: function(getProductData) {
                var widget = this;
                var newProduct = {};
                var currentTarget = event.currentTarget;
                $(currentTarget).attr('disabled','disabled');
                $(currentTarget).attr('style','opacity:0.6');
                newProduct = $.extend(true, {}, getProductData, true);
             //   console.log("plpnewProduct",newProduct); 
                if(widget.listType() == CCConstants.LIST_VIEW_SEARCH){
                    widget.searchAddToCart(newProduct,getProductData);
                } else{
                    newProduct.orderQuantity = parseInt(1, 10);
                    newProduct.externalPriceQuantity = -1;
                      if(getProductData.externalSalePrice() && getProductData.externalSalePrice() !== null){
                            newProduct.externalPrice = getProductData.externalSalePrice();
                    } else{
                        newProduct.externalPrice = getProductData.externalListPrice;
                    }

                    newProduct.external_list_price =getProductData.x_productExternalListPrice;
                    newProduct.external_sale_price=getProductData.x_productExternalSalePrice;  
                    widget.cart().addItem(ko.toJS(newProduct));
                    $.Topic("UPDATE_EXTERNAL_PRICE.memory").publish(getProductData); 
                }
                setTimeout(function(){
                     $(currentTarget).prop("disabled", false);
                     $(currentTarget).attr('style','opacity:1');  
                },500);
               
                // price complete call
               //  $.Topic(pubsub.topicNames.CART_PRICE_COMPLETE).subscribe(function(obj) {
                //     $('#dropdowncart').addClass('active');
                //     notifier.sendSuccess(widget.WIDGET_ID, "Item added to cart successfully", true);
             // });

            },
            searchAddToCart : function(newProduct,getProductData){
                var widget = this;
                var orderRequestHeader = {};
                orderRequestHeader['x-ccsite'] = widget.site().siteInfo.id;
                orderRequestHeader["x-ccorganization"] = widget.user().parentOrganization.id();
                var productId = newProduct.repositoryId()[0];
                var skuId =newProduct.childSKUs()[0].repositoryId;
                var catSkuList = [];
                var catSkuListIds = {};
                var id = newProduct.repositoryId()[0];
                var quanty = 1;
                catSkuList.push(productId);
                catSkuListIds["dataItems"] = "repositoryid";
                catSkuListIds["debugOn"] = "true";
                ccRestClient.authenticatedRequest("/ccstoreui/v1/products?productIds=" +catSkuList.toString() + "&fields=parentCategories,childSKUs,productVariantOptions,selectedOptions,testingRevNumber,orderQuantity,primaryThumbImageURL,primarySmallImageURL,displayName,id,listPrice,route", catSkuListIds , function(result) {
                    if (result.length > 0) {
                        result[0].externalPriceQuantity = -1;
                        if(getProductData.externalSalePrice() && getProductData.externalSalePrice() !== null){
                            result[0].externalPrice = getProductData.externalSalePrice();
                        } else{
                            result[0].externalPrice = getProductData.externalListPrice;
                        }
                        result[0].orderQuantity = 1;
                       // console.log('product data resulttt',result);
                        $.Topic(pubsub.topicNames.CART_ADD).publishWith(result[0], [{
                            message: "success"
                        }]);
                    }
                }, function (data) {}, "GET", false, true, orderRequestHeader);
            },
            externalPricingCall: function(productGridData) {
            var skuIds = [];
                var widget = this;
                for (var i = 0; i < widget.productGrid().length > 0; i++) {
                    for (var j = 0; j < widget.productGrid()[i].length > 0; j++) {
                        if (widget.productGrid()[i][j].childSKUs().length > 0) {
                            for (var k = 0; k < widget.productGrid()[i][j].childSKUs().length > 0; k++) {
                                var prodSku = widget.productGrid()[i][j].childSKUs()[k];
                             //   console.log(prodSku, "...repositoryId......");
                                var skuId = '';
                                var quotingCatId = '';
                                if (widget.listType() == CCConstants.LIST_VIEW_SEARCH) {
                                    if(widget.productGrid()[i][j]['sku.repositoryId']){
                                        //console.log("widget.productGrid()[i][j]",widget.productGrid()[i][j]);
                                        skuId = widget.productGrid()[i][j]['sku.repositoryId']()[0];   
                                     }
									if(widget.productGrid()[i][j].hasOwnProperty("sku.x_quotingCategoryIDs")){
										var temp = widget.productGrid()[i][j]["sku.x_quotingCategoryIDs"]();
										quotingCatId = temp.length > 0 ? temp[0].replace(/\n/ig, '') : '';
									}                                   
                                } else{
                                    skuId = prodSku.repositoryId()[0];
                                   quotingCatId = prodSku.dynamicPropertyMapBigString.hasOwnProperty("sku_x_quotingCategoryIDs") ? prodSku.dynamicPropertyMapBigString.sku_x_quotingCategoryIDs().replace(/<\/?p>/g, '') : "";
                                }
                                //console.log("skuIdddddddd",skuId);
                                if(skuId !== '' && quotingCatId !== ''){
                                    skuIds.push({
                                        "itemId": skuId,
                                        "quotingCatIds": quotingCatId
                                    }) ; 
                                }
                                break;
                            }

                        }
                    } 
                }
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
             //   console.log("skuData",skuData);
                helper.postDataExternal(data, function(err, result) {
                    widget.destroySpinner();
                    widget.priceCallCompleted(true);
                    if (result && result.hasOwnProperty('pricingRecords')) {
                        for (var m = 0; m < widget.productGrid().length > 0; m++) {
                            for (var n = 0; n < widget.productGrid()[m].length > 0; n++) {
                                if (widget.productGrid()[m][n].childSKUs().length > 0) {
                                    for (var o = 0; o < widget.productGrid()[m][n].childSKUs().length > 0; o++) {
                                        
                                        for (var p = 0; p < result.pricingRecords.length > 0; p++) {
                                           var isRecordIdMatched;
                                           if (widget.listType() == CCConstants.LIST_VIEW_SEARCH) {
                                                var xrecord =  widget.productGrid()[m][n]['sku.repositoryId'];
                                               isRecordIdMatched = xrecord && xrecord()[0] == result.pricingRecords[p].itemId; 
                                           } else{
                                               isRecordIdMatched = widget.productGrid()[m][n].childSKUs()[o].repositoryId() == result.pricingRecords[p].itemId;
                                           }       
                                            if (isRecordIdMatched) {
                                                widget.productGrid()[m][n].externalSalePrice(result.pricingRecords[p].salePrice);
                                                widget.productGrid()[m][n].externalListPrice(result.pricingRecords[p].listPrice);
                                                widget.productGrid()[m][n].x_productExternalListPrice=result.pricingRecords[p].listPrice;
                                                widget.productGrid()[m][n].x_productExternalSalePrice=result.pricingRecords[p].salePrice;   
                                               // widget.productGrid()[m][n].disableAddToCart= ko.observable(false);
                                                if(result.pricingRecords[p].salePrice && result.pricingRecords[p].salePrice>0){
                                                    widget.productGrid()[m][n].disableAddToCart(false);
                                                } 
                                                else if(result.pricingRecords[p].listPrice && result.pricingRecords[p].listPrice>0){
                                                     widget.productGrid()[m][n].disableAddToCart(false);
                                                }else{
                                                      widget.productGrid()[m][n].disableAddToCart(true);
                                                }
                                                break;
                                            }

                                        }
                                    }

                                }
                            }
                          }

                    } else if (err) {
                        widget.destroySpinner();
                       // console.log(err, "....Pricing Api error...");
                        //notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
                    } else{
                        widget.destroySpinner();
                        notifier.sendError(widget.WIDGET_ID,widget.site().extensionSiteSettings.externalSiteSettings.genericServiceError, true);
                    }
                })
               
            },
            setAddButtonText : function(){
                /** Added timeout for changing button text to Add to cart from Quickview */
                setTimeout(function(){
                      $('.addCart').find('.cc-product-quickview').text("ADD TO CART");
                },3000);
            },
            setChooseText : function(){
                /** Added timeout for changing button text to choose options from Quickview */
                setTimeout(function(){
                      $('.chooseItem').find('.cc-product-quickview').text("CHOOSE OPTIONS"); 
                },3000);
            },
            showPurChaseList: function(data) {
                
                var widget = this;
                $('#CC-purchaseList-name').val('');
                var productItem = {};
                if (widget.listType() == CCConstants.LIST_VIEW_SEARCH) {
                      productItem = {
                        "productId": data.id()[0],
                        "catRefId": data.childSKUs()[0].repositoryId()[0] ? data.childSKUs()[0].repositoryId()[0] : "",
                        "quantityDesired": 1,
                        "displayName": data.displayName()
                    }; 
                }else{
                    productItem = {
                        "productId": data.id(),
                        "catRefId": data.childSKUs()[0].repositoryId() ? data.childSKUs()[0].repositoryId() : "",
                        "quantityDesired": 1,
                        "displayName": data.displayName()
                    };    
                }    

                var productItemArray = [];
                productItemArray.push(productItem);
                $.Topic('PURCHASE_LIST.memory').publish(productItemArray);
                $('#CC-newPurchaseList-modal').modal('show');
            
            }
        };
    });