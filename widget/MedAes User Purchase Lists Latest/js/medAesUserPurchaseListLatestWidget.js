/**
 * @fileoverview purchase list Widget.
 *
 */
define(
    //-------------------------------------------------------------------
    // DEPENDENCIES
    //-------------------------------------------------------------------
    ['knockout', 'pubsub', 'navigation', 'notifier', 'ccConstants', 'CCi18n', 'viewModels/purchaseList', 'viewModels/purchaseListListing', 'notifications',
        'ccNumber', 'pageLayout/product', 'pageLayout/site', 'ccRestClient', 'paginated', 'spinner', 'ccResourceLoader!global/api-helper', 'bstypeahead', 'js/jquery.simplePagination'
    ],

    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    function(ko, PubSub, navigation, notifier, CCConstants, CCi18n, PurchaseListViewModel, PurchaseListListingViewModel, notifications, ccNumber, ProductViewModel, SiteViewModel, ccRestClient, Paginated, spinner, helper) {

        "use strict";

        var self;
        var getProductIds = [];

        return {

            WIDGET_ID: "purchaseLists",
            //For typeahead search
            MIN_CHARACTERS: 2,
            locale: "",
            MAX_RESULTS: 5,
            SEARCH_DELAY: 300, // milliseconds
            LEFT_MARGIN: 10,
            popUpId: ko.observable(""),
            showErrorMessage: ko.observable(),
            errorMessage: ko.observable(),
            originalAccountSharing: ko.observable(),
            subscriptions: [],
            contextManager: null,
            confirmDeletePurchageListMessageAgent: ko.observable(),
            confirmAddToCartPurchageListMessageAgent: ko.observable(),
            homeRoute: "",
            getCurrentProductData: ko.observableArray([]),
            showSalePrice: ko.observable(false),
            // pagination

            koTotalPages: ko.observable(1),
            koCurrentPage: ko.observable(1),
            noOfRecordsPerPage: ko.observable(12),
            displayNoRecords: ko.observable(false),


            beforeAppear: function(page) {
                var widget = this;
                 widget.createSpinner();  
                widget.displayNoRecords(false);
    
                widget.getCurrentProductData([]);
                if (widget.user().loggedIn() == false || widget.user().isUserSessionExpired()) {
                    navigation.doLogin(navigation.getPath(), widget.homeRoute);
                    return;
                } else {
                    widget.purchaseListListingViewModel().clearOnLoad = true;
                    widget.sharedPurchaseListListingViewModel().clearOnLoad = true;
                    widget.purchaseListViewModel().profileId = widget.user().id();
                }
                //Agent Application
                if ((ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT) && widget.contextManager) {
                    widget.purchaseListListingViewModel().siteId(widget.contextManager.selectedSite());
                    widget.purchaseListListingViewModel().accountId(widget.contextManager.currentOrganizationId());
                    widget.purchaseListViewModel().siteId(widget.contextManager.selectedSite());
                    widget.purchaseListViewModel().accountId(widget.contextManager.currentOrganizationId());
                    widget.subscriptions.push(widget.contextManager.selectedSite.subscribe(function(pValue) {
                        widget.purchaseListListingViewModel().siteId(pValue);
                        widget.purchaseListViewModel().siteId(pValue);
                        widget.purchaseListListingViewModel().fetchAllPurchaseLists();
                        widget.displaySection("list");
                    }));
                    if (widget.user().isB2BUser()) {
                        widget.subscriptions.push(widget.contextManager.currentOrganizationId.subscribe(function(pValue) {
                            widget.purchaseListListingViewModel().accountId(pValue);
                            widget.purchaseListViewModel().accountId(pValue);
                            widget.purchaseListViewModel().isB2BUser(true);
                            widget.purchaseListListingViewModel().fetchAllPurchaseLists();
                            widget.displaySection("list");
                        }));
                    }
                }

                if (page.path !== undefined) {
                    //AgentApplication - logic to show display sections of widget according to the page
                    if (ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT) {
                        widget.displaySection("list");
                        widget.purchaseListListingViewModel().fetchAllPurchaseLists();
                        widget.hideEditAndCreateSection(true);
                        widget.purchaseListViewModel().items.removeAll();
                        widget.selectedPurchaseListItems.removeAll();

                    } else if (page.path.split("/")[0] == "purchaselists") {
                        widget.displaySection("list");
                        widget.purchaseListListingViewModel().siteId(SiteViewModel.getInstance()['siteInfo'].id);
                        widget.sharedPurchaseListListingViewModel().siteId(SiteViewModel.getInstance()['siteInfo'].id);
                        if (widget.user().isB2BUser()) {
                            widget.purchaseListListingViewModel().accountId(widget.user().currentOrganization().repositoryId);
                            widget.sharedPurchaseListListingViewModel().accountId(widget.user().currentOrganization().repositoryId);
                        }
                        widget.purchaseListListingViewModel().refinedFetch();
                        setTimeout(function(){
                                if(widget.purchaseListViewModel().items().length === 0){
                                  widget.destroySpinner();         
                            }   
                        },500);
                        // List of shared purchase lists is loaded for the first time only when use navigates to that tab.
                        // So reload that list only it is already loaded i.e., user has navigated to that list at least once.
                        if (widget.isSharedListLoaded()) {
                            widget.sharedPurchaseListListingViewModel().refinedFetch();
                        }
                        widget.hideEditAndCreateSection(true);
                        widget.purchaseListViewModel().items.removeAll();
                        widget.selectedPurchaseListItems.removeAll();

                    } else if (page.path.split("/")[0] == "purchaseList") {
                        if (page.path.split("/")[1]) {
                            widget.purchaseListViewModel().items.removeAll();
                            widget.selectedPurchaseListItems.removeAll();
                            widget.editPurchaseList(page.path.split("/")[1]);
                            widget.description('');
                        } else {
                            widget.purchaseListViewModel().items.removeAll();
                            widget.nameOfPurchaseListPrepopulate("");
                            widget.nameOfPurchaseListPrepopulate.isModified(false);
                            $('#search-bar-create').val('').change();
                            widget.displaySection("create");
                        }
                        widget.hideEditAndCreateSection(false);
                    }
                }
            },

            onLoad: function(widget) {
                widget.purchaseListViewModel = ko.observable();
                widget.purchaseListViewModel(new PurchaseListViewModel());
                widget.purchaseListViewModel().widgetId = widget.WIDGET_ID;
                widget.purchaseListListingViewModel = ko.observable();
                widget.purchaseListListingViewModel(new PurchaseListListingViewModel());
                widget.sharedPurchaseListListingViewModel = ko.observable();
                widget.accountSharingEnabled = ko.observable();
                widget.currentAccountId = widget.user().parentOrganization ? widget.user().parentOrganization.id() : null;
                widget.sharedPurchaseListListingViewModel(new PurchaseListListingViewModel({
                    listType: CCConstants.PURCHASE_LIST_TYPE_SHARED,
                    sortKeyAndDirections: {
                        name: "both",
                        "owner.email": "both",
                        "owner.lastName": "both"
                    },
                    spinnerId: "#shared-purchaseLists-info"
                }));
                $.Topic(PubSub.topicNames.PURCHASE_LIST_FETCH_SUCCESS).subscribe(function() {
                    widget.selectedPurchaseListItems(widget.purchaseListViewModel().items().slice(0));
                    widget.displaySection("edit");
                    widget.purchaseListViewModel().purchaseListName.isModified(false);
                    getProductIds = [];
                    for (var i = 0; i < widget.purchaseListViewModel().items().length; i++) {
                        getProductIds.push(widget.purchaseListViewModel().items()[i].productId);
                        widget.purchaseListViewModel().items()[i].quantityDesired.isModified(false);
                    }
                    // console.log(getProductIds, "....  console.log(widget.purchaseListViewModel().items())");
                    if (getProductIds.length > 0) {
                        widget.getProductData(getProductIds);

                    }
                });
                widget.filterOptions = ko.observableArray([{
                        label: CCi18n.t("ns.purchaseLists:resources.sharedViaEmail"),
                        value: CCConstants.EMAIL_ADDRESS_TEXT
                    },
                    {
                        label: CCi18n.t("ns.purchaseLists:resources.sharedViaThisAccount"),
                        value: CCConstants.PROFILE_ACCOUNT
                    },
                    {
                        label: CCi18n.t("ns.purchaseLists:resources.allPurchaseLists"),
                        value: CCConstants.ALL_PURCHASE_LISTS
                    }

                ]);

                widget.sharedPurchaseListListingViewModel().selectedListOption(CCConstants.EMAIL_ADDRESS_TEXT);
                widget.isSharedListLoaded = ko.observable(false);
                widget.purchaseListViewModel().profileId = widget.user().id();
                widget.displaySection = ko.observable("list");
                widget.hideEditAndCreateSection = ko.observable(true);
                widget.isDirty = ko.observable(false);
                widget.isModalVisible = ko.observable(false);
                widget.enableEmailSharing = ko.observable(false);
                widget.createdEmailConfigs = ko.observableArray();
                widget.deletedEmailConfigs = ko.observableArray();
                widget.updatedEmailConfigs = ko.observableArray();
                widget.emailSharingComment = ko.observable();
                widget.accountSharingComment = ko.observable();
                widget.defaultSharingEdit = ko.observable();

                // Subscription to reset the default edit access when the check box is unchecked.
                widget.accountSharingEnabled.subscribe(function(pValue) {
                    if (pValue === false) {
                        widget.defaultSharingEdit(false);
                    }
                }, this);

                widget.description = ko.observable();
                widget.purchaseListNewName = ko.observable().extend({
                    required: {
                        params: true,
                        message: CCi18n.t('ns.common:resources.listNameMandatoryText')
                    },
                    maxLength: {
                        params: 256,
                        message: CCi18n.t('ns.common:resources.maxAllowedListNameLength')
                    }
                });
                widget.enableEmailSharing.subscribe(function() {
                    if (widget.createdEmailConfigs().length == 0) {
                        widget.addEmail();
                    }
                })
                widget.editOptions = ko.observableArray([{
                        displayName: CCi18n.t("ns.purchaseLists:resources.canEditText"),
                        value: true
                    },
                    {
                        displayName: CCi18n.t("ns.purchaseLists:resources.readOnlyText"),
                        value: false
                    }
                ])
                widget.homeRoute = widget.links().home.route;
                if (ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT) {
                    widget.homeRoute = widget.links().agentHome.route;
                    widget.contextManager = require("agentViewModels/agent-context-manager").getInstance();
                }
                $.Topic(PubSub.topicNames.PAGE_CHANGED).subscribe(widget.triggerPageChangeEvent.bind(widget));
                $.Topic(PubSub.topicNames.ADD_ITEM_TO_PURCHASE_LIST).subscribe(widget.skuDataObjectFormation.bind(widget));
                widget.nameOfPurchaseListPrepopulate = ko.observable("");
                widget.nameOfPurchaseListPrepopulate.extend({
                    required: {
                        params: true,
                        message: CCi18n.t('ns.common:resources.listNameMandatoryText')
                    },
                    maxLength: {
                        params: 256,
                        message: CCi18n.t('ns.common:resources.maxAllowedListNameLength')
                    }
                });
                if (widget.purchaseListViewModel && widget.purchaseListViewModel().dynamicPropertyMetaInfo &&
                    !widget.purchaseListViewModel().dynamicPropertyMetaInfo.dynamicPropertyMetaCache.hasOwnProperty(CCConstants.ENDPOINT_PURCHASE_LIST_TYPE)) {
                    widget.purchaseListViewModel().populateDynamicPropertiesMetaData();
                }

                // To append locale for purchase List link
                widget.detailsLinkWithLocale = ko.computed(function() {
                    return navigation.getPathWithLocale('/purchaseList/');
                }, widget);
                //create purchaseList grid computed for the widget
                widget.purchaseListGrid = ko.computed(function() {
                    var numElements, start, end, width;
                    var rows = [];
                    var purchaseLists;
                    if (($(window)[0].innerWidth || $(window).width()) > CCConstants.VIEWPORT_TABLET_UPPER_WIDTH) {
                        var startPosition, endPosition;
                        // Get the orders in the current page
                        startPosition = (widget.purchaseListListingViewModel().currentPage() - 1) * widget.purchaseListListingViewModel().itemsPerPage;
                        endPosition = startPosition + widget.purchaseListListingViewModel().itemsPerPage;
                        purchaseLists = widget.purchaseListListingViewModel().data.slice(startPosition, endPosition);
                    } else {
                        purchaseLists = widget.purchaseListListingViewModel().data();
                    }
                    if (!purchaseLists) {
                        return;
                    }
                    numElements = purchaseLists.length;
                     var showEmptyMsg = numElements > 0 ? false :true;
                    widget.displayNoRecords(showEmptyMsg);
                    width = parseInt(widget.purchaseListListingViewModel().itemsPerRow(), 10);
                    start = 0;
                    end = start + width;
                    while (end <= numElements) {
                        rows.push(purchaseLists.slice(start, end));
                        start = end;
                        end += width;
                    }
                    if (end > numElements && start < numElements) {
                        rows.push(purchaseLists.slice(start, numElements));
                    }
                    return rows;
                }, widget);

                //create purchaseList grid computed for the widget
                widget.sharedPurchaseListGrid = ko.computed(function() {
                    var numElements, start, end, width;
                    var rows = [];
                    var purchaseLists;
                    if (($(window)[0].innerWidth || $(window).width()) > CCConstants.VIEWPORT_TABLET_UPPER_WIDTH) {
                        var startPosition, endPosition;
                        // Get the orders in the current page
                        startPosition = (widget.sharedPurchaseListListingViewModel().currentPage() - 1) * widget.sharedPurchaseListListingViewModel().itemsPerPage;
                        endPosition = startPosition + widget.sharedPurchaseListListingViewModel().itemsPerPage;
                        purchaseLists = widget.sharedPurchaseListListingViewModel().data.slice(startPosition, endPosition);
                    } else {
                        purchaseLists = widget.sharedPurchaseListListingViewModel().data();
                    }
                    if (!purchaseLists) {
                        return;
                    }
                    numElements = purchaseLists.length;
                    width = parseInt(widget.sharedPurchaseListListingViewModel().itemsPerRow(), 10);
                    start = 0;
                    end = start + width;
                    while (end <= numElements) {
                        rows.push(purchaseLists.slice(start, end));
                        start = end;
                        end += width;
                    }
                    if (end > numElements && start < numElements) {
                        rows.push(purchaseLists.slice(start, numElements));
                    }
                    return rows;
                }, widget);

                //array containing the checked items of purchase list 
                widget.selectedPurchaseListItems = ko.observableArray();

                widget.selectedAllPurchaseListItems = ko.pureComputed({
                    read: function() {
                        return widget.selectedPurchaseListItems().length === widget.purchaseListViewModel().items().length;
                    },

                    write: function(value) {
                        widget.selectedPurchaseListItems(value ? widget.purchaseListViewModel().items.slice(0) : []);
                    }
                });

                widget.dirtyCheck = ko.computed(function() {
                    if (widget.purchaseListViewModel().hasEditAccess()) {
                        if (widget.purchaseListViewModel().purchaseListName.isModified())
                            return true;

                        for (var i = 0; i < widget.purchaseListViewModel().items().length; i++) {
                            if (widget.purchaseListViewModel().items()[i].quantityDesired.isModified())
                                return true;
                        }

                        if (widget.isDirty())
                            return true;
                    }

                    return false;
                });

                widget.invalidQuantityCheck = ko.computed(function() {

                    var items = widget.selectedPurchaseListItems();

                    for (var i = 0; i < items.length; i++) {
                        if (!widget.isNumeric(items[i].quantityDesired()) || items[i].quantityDesired() == 0)
                            return true;
                    }

                    return false;
                });

                // hide the delete dialog box
                widget.hideModal = function() {
                    if (this.isModalVisible()) {
                        $("#CC-purchaseList-delete-modal-1").modal('hide');
                        $('body').removeClass('modal-open');
                        $('.modal-backdrop').remove();
                        this.isModalVisible(false);
                    }
                };

                widget.showModal = function() {
                    $("#CC-purchaseList-delete-modal-1").modal('show');
                    this.isModalVisible(true);
                };
                /** this commented for  Avoiding the calls  at list Purchase page */
                /*widget.purchaseListGrid.subscribe(function(newValues) {
                    if (newValues && newValues.length > 0) {
                        for (var i = 0; i < newValues.length; i++) {
                            for (var j = 0; j < newValues[i].length; j++) {
                                widget.editPurchaseList(newValues[i][j].id);
                            }

                        }
                    }
                });*/

                widget.displayPagination = ko.computed(function() {
                    var first = (widget.koCurrentPage() - 1) * widget.noOfRecordsPerPage();
                    var getItems = widget.getCurrentProductData.slice(first, first + widget.noOfRecordsPerPage());
                    console.log("getItems",getItems);
                    if(getItems.length===0){
                            console.log("getItems",getItems);
                    }
                    return getItems;
                }, widget);

            },
          
          
          setAddButtonText : function(){
                /** Added timeout for changing button text to Add to cart from Quickview */
                setTimeout(function(){
                      $('.remove-item-wrapper').find('.cc-product-quickview').text("Add To Cart");   
                },1000);
            },
            
            // funtion to flash popup for multiple skus items
            handleQuickViewClick: function(popUpId, widget, parent, productId) {
                var product = widget,
                    popup, popUpRegionContext, productDetailsWidget, productVariantOptions, requestData = {};
                if (product) {
                    popup = $(popUpId);
                    popUpRegionContext = ko.dataFor(popup[0]);
                    productDetailsWidget = popUpRegionContext.widgets()[0];

                    ccRestClient.request(CCConstants.ENDPOINT_PRODUCTS_GET_PRODUCT, requestData,   
                        function(data) {
                            var newProduct = new ProductViewModel(data, {});
                            // set the product to null to re-trigger the binding (cc-zoom doesn't pick up changes without this step)
                            productDetailsWidget.product(null);
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
                            productDetailsWidget.quickViewFromPurchaseList(true);
                            // call before appear
                            productDetailsWidget.beforeAppear();
                            popup.modal('show');
                        },
                        function(data) {
                            // console.log(data);
                        },
                        productId);
                }
            },

            /**
             * Purchase list share settings modal handler
             */
            openShareSettingsModal: function() {
                var widget = this;
                widget.showErrorMessage(false);
                widget.errorMessage("");
                var success = function(pResult) {
                    widget.purchaseListViewModel().fetchPurchaseListSettingsSuccess(pResult);
                    widget.originalAccountSharing(widget.purchaseListViewModel().organizationSharingEnabled());
                    widget.updatedEmailConfigs.removeAll();
                    var index = 0;
                    widget.purchaseListViewModel().sharedEmailConfigs().forEach(function(item) {
                        widget.updatedEmailConfigs.push(ko.mapping.fromJS(item));
                        widget.updatedEmailConfigs()[index].email.extend({
                            required: {
                                params: true,
                                message: CCi18n.t('ns.common:resources.emailAddressRequired')
                            },
                            email: {
                                params: true,
                                message: CCi18n.t('ns.common:resources.emailAddressInvalid'),
                                maxLength: {
                                    params: CCConstants.EMAIL_ID_MAX_LENGTH,
                                    message: CCi18n.t('ns.common:resources.maxlengthValidationMsg', {
                                        maxLength: CCConstants.EMAIL_ID_MAX_LENGTH
                                    })
                                }
                            }
                        });
                        widget.updatedEmailConfigs()[index].editEnabled.extend({
                            required: {
                                params: false
                            }
                        });
                        index++;
                    });
                    if (widget.updatedEmailConfigs().length > 0) {
                        widget.enableEmailSharing(true);
                    } else {
                        widget.enableEmailSharing(false);
                    }
                    widget.createdEmailConfigs.removeAll();
                    widget.deletedEmailConfigs.removeAll();
                    widget.accountSharingEnabled(widget.purchaseListViewModel().organizationSharingEnabled());
                    widget.defaultSharingEdit(widget.purchaseListViewModel().defaultEditEnabled());
                    widget.emailSharingComment('');
                    widget.accountSharingComment('');
                    $("#CC-purchaseList-share").modal('show');
                };
                widget.purchaseListViewModel().fetchPurchaseListSettings(widget.purchaseListViewModel().purchaseListId, widget.currentAccountId, success);

            },

            /**
             * View purchase list share settings modal handler
             */
            viewShared: function() {
                var widget = this;

                var success = function(pResult) {
                    widget.purchaseListViewModel().fetchPurchaseListSettingsSuccess(pResult);
                    widget.updatedEmailConfigs.removeAll();
                    var index = 0;
                    widget.purchaseListViewModel().sharedEmailConfigs().forEach(function(item) {
                        widget.updatedEmailConfigs.push(ko.mapping.fromJS(item));
                        widget.updatedEmailConfigs()[index].email.extend({
                            email: {
                                params: true,
                                message: CCi18n.t('ns.common:resources.emailAddressInvalid')
                            }
                        });
                        widget.updatedEmailConfigs()[index].editEnabled.extend({
                            required: {
                                params: false
                            }
                        });
                        index++;
                    });
                    if (widget.updatedEmailConfigs().length > 0) {
                        widget.enableEmailSharing(true);
                    }
                    widget.createdEmailConfigs.removeAll();
                    widget.deletedEmailConfigs.removeAll();
                    widget.accountSharingEnabled(widget.purchaseListViewModel().organizationSharingEnabled());
                    widget.defaultSharingEdit(widget.purchaseListViewModel().defaultEditEnabled());
                    $("#CC-purchaseList-view-share").modal('show');
                };
                widget.purchaseListViewModel().fetchPurchaseListSettings(widget.purchaseListViewModel().purchaseListId, widget.currentAccountId, success);

            },

            /*
             * Function to disable organization sharing when 'trash' icon in view 
             * shared setting modal is clicked.
             */
            disableOrganizationSharing: function() {
                var widget = this;
                widget.accountSharingEnabled(false);
            },

            /**
             * Function to delete recipients from share modal
             * @param index index of the deleted email in updatedEmailConfigs array
             */
            deleteEmailSharing: function(index) {
                var widget = this;
                widget.deletedEmailConfigs.push(widget.updatedEmailConfigs.splice(index, 1)[0]);
            },

            /**
             * Function to delete recipients from share modal
             * @param index index of the deleted email in updatedEmailConfigs array
             */
            deleteFromNewEmailSharing: function(index) {
                var widget = this;
                widget.createdEmailConfigs.splice(index, 1);
            },

            /*
             * Function to check validity of created/modified email addresses
             * of recipients before create/update share settings call is made.
             */
            isEmailAddressesValid: function() {
                var widget = this;
                var isValid = true;
                widget.updatedEmailConfigs().forEach(function(item) {
                    if (!item.email.isValid()) {
                        isValid = false;
                    }
                });
                if (isValid) {
                    widget.createdEmailConfigs().forEach(function(item) {
                        item.email.isModified(true);
                        if (!item.email.isValid()) {
                            isValid = false;
                        }
                    });
                }
                return isValid;
            },

            /*
             * Function to add email address of recipients.
             */
            addEmail: function() {
                var widget = this;
                widget.createdEmailConfigs.push({
                    editEnabled: ko.observable(false),
                    email: ko.observable().extend({
                        email: {
                            params: true,
                            message: CCi18n.t('ns.common:resources.emailAddressInvalid'),
                            maxLength: {
                                params: CCConstants.EMAIL_ID_MAX_LENGTH,
                                message: CCi18n.t('ns.common:resources.maxlengthValidationMsg', {
                                    maxLength: CCConstants.EMAIL_ID_MAX_LENGTH
                                })
                            }
                        },
                        required: {
                            params: true,
                            message: CCi18n.t('ns.common:resources.emailAddressRequired')
                        }
                    })
                });
            },

            /*
             * Function to initiate create/update purchase list settings call when
             * share button in modal is clicked.
             */
            sharePurchaseList: function() {
                var widget = this;
                widget.showErrorMessage(false);
                widget.errorMessage("");
                if (widget.isEmailAddressesValid() || !widget.enableEmailSharing()) {
                    if (widget.updatedEmailConfigs().length > 0 && !widget.enableEmailSharing()) {
                        widget.deletedEmailConfigs(widget.updatedEmailConfigs.removeAll());
                    }
                    if (widget.createdEmailConfigs().length > 0 && !widget.enableEmailSharing()) {
                        widget.createdEmailConfigs.removeAll();
                    }
                    if (widget.purchaseListViewModel().purchaseListSharingId() === null) {
                        var success = function(pResult) {
                            widget.purchaseListViewModel().purchaseListSharingId(pResult.id);
                            widget.createEmailConfigs();
                            if (pResult && (pResult.organizationSharingEnabled || pResult.sharedEmailConfigs.length > 0)) {
                                widget.purchaseListViewModel().isPurchaseListShared(true);
                            }
                        };

                        var error = function(pError) {
                            widget.showErrorMessage(true);
                            widget.errorMessage(pError.message);
                        };
                        widget.purchaseListViewModel().organizationSharingEnabled(widget.accountSharingEnabled());
                        widget.purchaseListViewModel().defaultEditEnabled(widget.defaultSharingEdit());
                        widget.purchaseListViewModel().createShareSettings(widget.purchaseListViewModel().purchaseListId, widget.currentAccountId, widget.accountSharingComment(), success, error);
                    } else {
                        widget.updateShareSettings();
                    }
                }
            },

            /*
             * Function to update purchase list share settings
             */
            updateShareSettings: function() {
                var widget = this;
                var success = function() {
                    widget.createEmailConfigs();
                };
                var error = function(pError) {
                    notifier.sendError(widget.WIDGET_ID, pError.message, true);
                };
                widget.purchaseListViewModel().organizationSharingEnabled(widget.accountSharingEnabled());
                widget.purchaseListViewModel().defaultEditEnabled(widget.defaultSharingEdit());
                widget.purchaseListViewModel().updateShareSettings(widget.purchaseListViewModel().purchaseListId, widget.currentAccountId, widget.accountSharingComment(), success, error);
            },

            /*
             * Function to initiate create Email configs in purchase list settings
             */
            createEmailConfigs: function() {
                var widget = this;
                if (widget.createdEmailConfigs().length > 0) {
                    var newEmails = ko.toJS(widget.createdEmailConfigs());
                    var index = 0;
                    newEmails.forEach(function(item) {
                        if (item.email == undefined) {
                            newEmails.splice(index, 1);
                        }
                        index++;
                    });
                    if (newEmails.length > 0) {
                        var success = function(pResult) {
                            if (pResult && pResult.emailConfigs && pResult.emailConfigs.length > 0) {
                                widget.purchaseListViewModel().isPurchaseListShared(true);
                            }
                            widget.deleteEmailConfigs();
                        };
                        var error = function(pError) {
                            widget.showErrorMessage(true);
                            widget.errorMessage(pError.message);
                        };
                        widget.purchaseListViewModel().createEmailConfigs(newEmails, widget.emailSharingComment(), success, error);
                    } else {
                        widget.deleteEmailConfigs();
                    }
                } else {
                    widget.deleteEmailConfigs();
                }
            },

            /*
             * Function to initiate delete Email configs in purchase list settings
             */
            deleteEmailConfigs: function() {
                var widget = this;
                if (widget.deletedEmailConfigs().length > 0) {
                    var deletedEmails = ko.toJS(widget.deletedEmailConfigs());
                    var success = function() {
                        widget.updateEmailConfigs();
                    };
                    var error = function(pError) {
                        notifier.sendError(widget.WIDGET_ID, pError.message, true);
                    };
                    widget.purchaseListViewModel().deleteEmailConfigs(deletedEmails, success, error);
                } else {
                    widget.updateEmailConfigs();
                }
            },

            /*
             * Function to initiate updateEmail configs in purchase list settings
             */
            updateEmailConfigs: function() {
                var widget = this;
                var updatedEmails = [];
                var emailsUpdated = false;
                widget.updatedEmailConfigs().forEach(function(item) {
                    if (item.email.isModified() || item.editEnabled.isModified()) {
                        emailsUpdated = true;
                        updatedEmails.push(ko.toJS(item));
                    }
                });
                if (emailsUpdated) {
                    var success = function(pResult) {
                        if (pResult && pResult.emailConfigs && pResult.emailConfigs.length > 0) {
                            widget.purchaseListViewModel().isPurchaseListShared(true);
                        }
                        $("#CC-purchaseList-share").modal('hide');
                        $("#CC-purchaseList-view-share").modal('hide');
                        widget.purchaseListViewModel().fetchPurchaseListSettings(widget.purchaseListViewModel().purchaseListId, widget.currentAccountId);
                        notifier.sendSuccess(widget.WIDGET_ID, widget.translate('shareSuccessText'), true);
                    };
                    var error = function(pError) {
                        widget.showErrorMessage(true);
                        widget.errorMessage(pError.message);
                    };
                    widget.purchaseListViewModel().updateEmailConfigs(updatedEmails, success, error);
                } else {
                    $("#CC-purchaseList-share").modal('hide');
                    $("#CC-purchaseList-view-share").modal('hide');
                    notifier.sendSuccess(widget.WIDGET_ID, widget.translate('shareSuccessText'), true);
                    widget.purchaseListViewModel().fetchPurchaseListSettings(widget.purchaseListViewModel().purchaseListId, widget.currentAccountId);
                }
            },

            /*
             * Function to handle preliminary operations and
             * open copy purchase list modal that asks for new purchase list name
             */
            openCopyPurchaseListModal: function() {
                var widget = this;
                widget.purchaseListNewName('');
                widget.purchaseListNewName.isModified(false);
                $("#CC-purchaseList-copy-list-modal").modal('show');
            },

            ensureSharedListIsLoaded: function() {
                var widget = this;
                if (!widget.isSharedListLoaded()) {
                    widget.sharedPurchaseListListingViewModel().refinedFetch();
                    widget.isSharedListLoaded(true);
                }
            },

            /*
             * Function to initiate copy purchase list when new name for the 
             * purchase list becomes available.
             */
            copyPurchaseList: function() {
                var widget = this;
                widget.purchaseListNewName.isModified(true);
                if (!widget.checkInvalidityOfData() && widget.purchaseListNewName.isValid()) {
                    widget.purchaseListViewModel().purchaseListName(widget.purchaseListNewName());
                    widget.purchaseListViewModel().
                    createNewPurchaseList(widget.createPurchaseListSuccess.bind(widget), widget.createPurchaseListError.bind(widget));
                    $("#CC-purchaseList-copy-list-modal").modal('hide');
                }
            },

            /**
             * Sort handler
             * @param pProperty Sort property key
             * @param pDirection Sort property direction
             * @param pListingContext Context of the purchase list in which user is currently in
             * @param Event object
             */
            sort: function(pProperty, pDirection, pListingContext, pEvent) {
                var widget = this;
                if (pEvent === "keypress") {
                    var keyCode = pEvent.which ? pEvent.which : pEvent.keyCode;
                    if (keyCode !== CCConstants.KEY_CODE_ENTER) {
                        return;
                    }
                }
                pListingContext.sortKeyAndDirections()[pProperty] = pDirection;
                var sortKeyAndDirections = pListingContext.sortKeyAndDirections();
                for (var sortKey in sortKeyAndDirections) {
                    if (sortKey !== pProperty) {
                        sortKeyAndDirections[sortKey] = "both";
                    }
                }
                pListingContext.sortKeyAndDirections(sortKeyAndDirections);
                pListingContext.sortKeyAndDirections.valueHasMutated();
                pListingContext.refinedFetch();
            },

            /**
             * Handler to perform filter by various options that current list supports
             * @param pListingContext Context of the purchase list in which user is currently in
             * @param pData Event payload
             * @param pEvent Event object
             */
            handleFilterSelection: function(pListingContext, pData, pEvent) {
                if (pEvent.originalEvent) {
                    pListingContext.refinedFetch();
                }
            },

            /**
             * Called when the user presses "Enter" key for search after the search term is entered:
             */
            handleSearchKeypress: function(pListingContext, pData, pEvent) {
                var widget = this;
                if (pEvent.which === 13) {
                    widget.handleSearch(pListingContext);
                    return false;
                }
                return true;
            },
            /**
             * Handler to perform search
             * @param pListingContext Context of the purchase list in which user is currently in
             */
            handleSearch: function(pListingContext) {
                if (pListingContext.searchTerm()) {
                    pListingContext.searchTerm(pListingContext.searchTerm().trim());
                }
                pListingContext.refinedFetch();
            },

            // display popup if sku count is greater that 1 
            handleSkuCount: function(data) {
                var widget = this;
                if (data.numberOfSKUs == 1) {
                    widget.purchaseListViewModel().addToPurchaseList(data);
                    widget.isDirty(true);
                } else {
                    var avoidMultiplePubsubCalls = ko.observable(true);
                    widget.handleQuickViewClick(widget.popUpId(), ProductViewModel, widget, data.id);
                    $.Topic(PubSub.topicNames.ADD_TO_PURCHASE_LIST).subscribe(function(data) {
                        $(".modal").modal("hide");
                        if (avoidMultiplePubsubCalls())
                            widget.purchaseListViewModel().addToPurchaseList(data);
                        widget.isDirty(true);
                        avoidMultiplePubsubCalls(false);
                    });
                }
            },

            //called on pressing the create button on purchaselist page 
            createPurchaseList: function() {
                var widget = this;
                widget.purchaseListViewModel().purchaseListName(widget.nameOfPurchaseListPrepopulate());
                if (!widget.checkInvalidityOfData()) {
                    widget.purchaseListViewModel().
                    createNewPurchaseList(widget.createPurchaseListSuccess.bind(widget), widget.createPurchaseListError.bind(widget));
                } else {
                    widget.nameOfPurchaseListPrepopulate.isModified(true);
                }
            },




            //called on pressing the delete button on purchase list page
            handleDeleteSelectedPurchaseList: function() {
                var widget = this;
                widget.purchaseListViewModel().deletePurchaseList(widget.purchaseListViewModel().purchaseListId,
                widget.deletePurchaseListSuccess.bind(widget), widget.deletePurchaseListError.bind(widget));
                widget.purchaseListViewModel().items.removeAll();
                widget.getCurrentProductData([]);
                widget.hideModal();
                widget.displayNoRecords(true);
                $('#CC-deletePurchaseList-modal').modal('hide');
                
                
            },

            //called on pressing the delete button on purchase list page
            deleteSelectedPurchaseList: function(pData) {
                var widget = this;
                widget.confirmDeletePurchageListMessageAgent(CCi18n.t("ns.purchaseLists:resources.agentConfirmDeletePurchageListMessage", {
                    name: widget.purchaseListViewModel().purchaseListName()
                }));
                if (widget.purchaseListViewModel().isPurchaseListShared() || (widget.purchaseListViewModel().items() &&
                        widget.purchaseListViewModel().items().length > 0)) {
                    widget.showModal();
                } else {
                    widget.handleDeleteSelectedPurchaseList();
                }
            },

            addToCartDialogOpen: function(pData) {
                var widget = this;
                if (widget.cart().items().length > 0 && !widget.dirtyCheck()) {
                    widget.confirmAddToCartPurchageListMessageAgent(CCi18n.t("ns.purchaseLists:resources.mergeWithCartItemsModalMessage"));
                    widget.showAddToCartModal();
                } else if (widget.cart().items().length === 0 && widget.dirtyCheck()) {
                    widget.confirmAddToCartPurchageListMessageAgent(CCi18n.t("ns.purchaseLists:resources.unsavedChangesModalMessage"));
                    widget.showAddToCartModal();
                } else if (widget.cart().items().length > 0 && widget.dirtyCheck()) {
                    widget.confirmAddToCartPurchageListMessageAgent(CCi18n.t("ns.purchaseLists:resources.populatedCartAndDirty"));
                    widget.showAddToCartModal();
                } else {
                    widget.addToCart();
                }
            },

            showAddToCartModal: function(pData) {
                var widget = this;
                $("#CC-purchaseList-addToCart-modal-1").modal('show');
                widget.isModalVisible(true);
            },

            addToCartDilaogClose: function(pData) {
                var widget = this;
                if (widget.isModalVisible()) {
                    $("#CC-purchaseList-addToCart-modal-1").modal('hide');
                    $('body').removeClass('modal-open');
                    $('.modal-backdrop').remove();
                    widget.isModalVisible(false);
                }

            },

            //called on pressing the delete icon against each purchaselist item
            removeItem: function(data) {
                var widget = this;
                widget.isDirty(true);
                if (widget.purchaseListViewModel().items().length > 1) {
                    var items = [];
                    for (var i = 0; i < widget.purchaseListViewModel().items().length > 0; i++) {
                        if (data.repositoryId() == widget.purchaseListViewModel().items()[i].productId) {
                            items.push({
                                "op": "delete",
                                "productId": widget.purchaseListViewModel().items()[i].productId,
                                "quantityDesired": widget.purchaseListViewModel().items()[i].quantityDesired,
                                "catRefId": widget.purchaseListViewModel().items()[i].catRefId
                            })
                        }

                    }

                    widget.purchaseListViewModel().items.remove(function(s) {
                        return s.productId == data.repositoryId();
                    })

                    for (var j = 0; j < widget.getCurrentProductData().length > 0; j++) {
                        if (data.repositoryId() == widget.getCurrentProductData()[j].repositoryId()) {
                            widget.getCurrentProductData().splice(widget.getCurrentProductData().indexOf(widget.getCurrentProductData()[j]), 1);
                        }

                    }
                    widget.getCurrentProductData.valueHasMutated();

                    var requestObj = {
                        "items": items
                    }

                    ccRestClient.request(CCConstants.ENDPOINT_ADD_ITEM_PURCHASE_LIST, requestObj, function(data) {
                    }, function(error) {
                    }, widget.purchaseListViewModel().purchaseListId);

                } else if (widget.purchaseListViewModel().items().length == 1) {
                    widget.handleDeleteSelectedPurchaseList();
                }


               if (widget.getCurrentProductData().length == widget.noOfRecordsPerPage()) {
                    widget.koCurrentPage(1)
                }
                widget.getPagination(widget.koCurrentPage());

            },

            isNumeric: function(value) {
                return /^\d+$/.test(value);
            },

            // validity check of data to be updated before update
            checkInvalidityOfData: function() {
                var widget = this;
                var invalid = false;
                for (var i = 0; i < widget.purchaseListViewModel().items().length; i++) {
                    if (!widget.isNumeric(widget.purchaseListViewModel().items()[i].quantityDesired()) ||
                        widget.purchaseListViewModel().items()[i].quantityDesired() == 0)
                        invalid = true;
                }
                if (widget.purchaseListViewModel().purchaseListName().length == 0 ||
                    widget.purchaseListViewModel().purchaseListName().length > 256) {
                    invalid = true;
                }
                return invalid;
            },

            // called on pressing cancel button on create section 
            hideCreatePurchaseListSection: function() {
                var widget = this;
                if (!(ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT)) {
                    navigation.goTo('/purchaselists');
                    widget.nameOfPurchaseListPrepopulate("");
                    widget.nameOfPurchaseListPrepopulate.isModified(false);
                } else {
                    widget.displaySection("list");
                }
            },

            // called on pressing cancel button on edit section
            hideEditPurchaseListSection: function() {
                var widget = this;
                if (!(ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT)) {
                    navigation.goTo('/purchaselists');
                } else {
                    widget.displaySection("list");
                }
            },

            // called on pressing save button on edit section
            updatePurchseList: function(pData) {
                var widget = this;
                widget.purchaseListViewModel().isB2BUser(widget.user().isB2BUser());
                if (!widget.checkInvalidityOfData()) {
                    widget.purchaseListViewModel().updatePurchaseList(widget.purchaseListViewModel().purchaseListId,
                        widget.updatePurchaseListSuccess.bind(widget), widget.updatePurchaseListError.bind(widget));
                }
            },

            // callback for create purchaseList error
            createPurchaseListError: function(pResult) {
                var widget = this;
                var errorMsg = widget.translate(pResult.message);
                notifier.clearError(widget.WIDGET_ID);
                notifier.clearSuccess(widget.WIDGET_ID);
                notifier.sendError(widget.WIDGET_ID, errorMsg, true);
                // notification 
            },

            // callback for create purchaseList success
            createPurchaseListSuccess: function(pResult) {
                var widget = this;
                var successMsg = widget.translate('createSuccessMsg');
                notifier.clearError(widget.WIDGET_ID);
                notifier.clearSuccess(widget.WIDGET_ID);
                notifier.sendSuccess(widget.WIDGET_ID, successMsg, true);
                widget.isDirty(false);
                widget.purchaseListViewModel().purchaseListName.isModified(false);
                widget.purchaseListViewModel().lastModifiedDate(pResult.lastModifiedDate);
                if (pResult.lastModifiedBy) {
                    widget.purchaseListViewModel().lastModifiedBy(pResult.lastModifiedBy.firstName + " " + pResult.lastModifiedBy.lastName);
                }
                for (var i = 0; i < widget.purchaseListViewModel().items().length; i++) {
                    widget.purchaseListViewModel().items()[i].quantityDesired.isModified(false);
                }
                if (!(ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT)) {
                    widget.user().validateAndRedirectPage(this.links().purchaseList.route + '/' + pResult.id);
                } else {
                    widget.fetchingPurchaseListDetailsForEdit(pResult.id);
                }
                widget.purchaseListListingViewModel().refinedFetch();
            },

            // callback for update purchaseList error
            updatePurchaseListError: function(pResult) {
                var widget = this;
                var errorMsg = widget.translate(pResult.message);
                notifier.clearError(widget.WIDGET_ID);
                notifier.clearSuccess(widget.WIDGET_ID);
                notifier.sendError(widget.WIDGET_ID, errorMsg, true);
                // notification 
            },

            // callback for update purchaseList success
            updatePurchaseListSuccess: function(pResult) {
                var widget = this;
                var successMsg = widget.translate('updateSuccessMsg');
                notifier.clearError(widget.WIDGET_ID);
                notifier.clearSuccess(widget.WIDGET_ID);
                notifier.sendSuccess(widget.WIDGET_ID, successMsg, true);
                widget.isDirty(false);
                widget.purchaseListViewModel().purchaseListName.isModified(false);
                widget.purchaseListViewModel().lastModifiedDate(pResult.lastModifiedDate);
                if (pResult.lastModifiedBy) {
                    widget.purchaseListViewModel().lastModifiedBy(pResult.lastModifiedBy.firstName + " " + pResult.lastModifiedBy.lastName);
                }
                for (var i = 0; i < widget.purchaseListViewModel().items().length; i++) {
                    widget.purchaseListViewModel().items()[i].quantityDesired.isModified(false);
                }
                widget.purchaseListListingViewModel().refinedFetch();
                if ((ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT)) {
                    widget.displaySection("list")
                }
            },

            // callback for delete purchaseList error
            deletePurchaseListError: function(pResult) {
                var widget = this;
                var errorMsg = widget.translate(pResult.message);
                notifier.clearError(widget.WIDGET_ID);
                notifier.clearSuccess(widget.WIDGET_ID);
                notifier.sendError(widget.WIDGET_ID, errorMsg, true);
            },

            // callback for delete purchaseList success
            deletePurchaseListSuccess: function() {
                var widget = this;
                var successMsg = widget.translate('deleteSuccessMsg');
                notifier.clearError(widget.WIDGET_ID);
                notifier.clearSuccess(widget.WIDGET_ID);
                widget.purchaseListListingViewModel().refinedFetch();
                if (!(ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT)) {
                    navigation.goTo('/purchaselists');
                } else {
                    widget.purchaseListListingViewModel().fetchAllPurchaseLists();
                    widget.displaySection("list");
                }
                setTimeout(function() {
                    notifier.sendSuccess(widget.WIDGET_ID, successMsg, true);
                }, 500);
            },

            //TypeAhead Functions
            setPopUp: function(popupId) {
                var widget = this;
                widget.popUpId(popupId);
            },

            /**
             * Bind the search box with bootstrap typeahead
             * @param {selectorId} id of the search box
             */
            initializer: function(selectorId, popUpId) {
                var widget = this;
                var selector = "#" + selectorId;
                $(selector).typeahead({
                    source: widget.typeaheadSource,
                    minLength: widget.MIN_CHARACTERS,
                    autoSelect: true,
                    items: widget.MAX_RESULTS,
                    fractionalDigits: widget.site().selectedPriceListGroup().currency.fractionalDigits,
                    symbol: widget.site().selectedPriceListGroup().currency.symbol,
                    matcher: widget.typeaheadMatch,
                    sorter: widget.typeaheadSort,
                    highlighter: widget.typeaheadHighlight,
                    render: widget.typeaheadRender, // Non-standard option!
                    select: widget.typeaheadSelect.bind(widget), // Non-standard option!
                    hide: widget.typeaheadHide, // Non-standard option!
                    menu: "<ul id='purchaseListDropDown' class='typeahead dropdown-menu' aria-live='polite'></ul>",
                    item: "<li class='typeaheadProduct'><a href='#'> \
                                <img class = 'typeaheadProductThumbnail visible-md visible-lg img-responsive'/> \
                            <span class = 'typeaheadProductName'> </span> \ <span class = 'typeaheadProductPrice'> </span> \ </a></li>"
                });

                $.Topic(PubSub.topicNames.SEARCH_TYPEAHEAD_UPDATED).subscribe(widget.typeaheadResults);
            },
            /**
             * @override 
             * Function to call search.js with query in purchase list
             */
            typeaheadSource: function(query, process) {
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
                    //log.info("Typeahead Timer Reset");
                }

                var delayedSearch = function() {
                    //log.info("Typeahead Delayed Search"); 
                    // save reference to 'process' callback as its 
                    // needed in the result method
                    self.callback = process;
                    $.Topic(PubSub.topicNames.SEARCH_TYPEAHEAD).publishWith({
                        searchText: self.query,
                        recordsPerPage: 5,
                        recordOffSet: 0
                    }, [{
                        message: "success"
                    }]);
                };
                this.timer = setTimeout(delayedSearch, 300);
            },

            /**
             * @override
             * Function to handle search result once published from search.js
             * @param {result} success/failure message
             */
            typeaheadResults: function(result) {
                if (self && self.options && (document.activeElement.className.indexOf('purchase-list-query-search') > -1)) {
                    var sourceArray = [];
                    var searchResults = this[0] ? this[0] : [];
                    var testResults = this[1] ? this[1] : [];
                    var variantName, variantValue;
                    $.each(testResults, function(i, item) {
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

                            var price = (function(item) {
                                var productPrice, minPrice, sku, skuPrice, index;
                                if (item.attributes["sku.minActivePrice"][0]) {
                                    return item.attributes["sku.minActivePrice"][0];
                                } else {
                                    if (item.records[0].attributes['sku.salePrice']) {
                                        productPrice = item.records[0].attributes['sku.salePrice'][0];
                                    } else if (item.records[0].attributes['sku.listPrice']) {
                                        productPrice = item.records[0].attributes['sku.listPrice'][0];
                                    }
                                    return productPrice;
                                }
                            })(item);
                            product.price = price;
                            product.numRecords = this.numRecords;
                            product.SKUid = this.records[0].attributes["sku.repositoryId"][0];
                            product.primaryThumbImageURL = this.records[0].attributes['product.primaryThumbImageURL'][0];
                            product.route = this.records[0].attributes['product.route'][0];

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
                            thumb: '',
                            link: ''
                        });
                    }

                    if (self.callback && typeof(self.callback) === 'function') {
                        self.callback(sourceArray);
                    }
                }
            },

            /**
             * @override
             * Overriding the function to prevent error because the search result
             * we are expecting is not the same as bootstrap typeahead result
             */
            typeaheadMatch: function(item) {
                // Matching handled server-side.
                return true;
            },
            /**
             * @override
             * Overriding the function to prevent error because the search result
             * we are expecting is not the same as bootstrap typeahead result
             */

            typeaheadSort: function(items) {
                // Sorting handled server-side.
                return items;
            },

            /**
             * @override
             * Overriding the function to prevent error because the search result
             * we are expecting is not the same as bootstrap typeahead result
             */
            typeaheadHighlight: function(item) {
                return item;
            },
            /**
             * @override
             * Function to render the search dropdown popup box
             * @param{items} array of products 
             */

            typeaheadRender: function(items) {
                if ((items.length === 1) && (items[0].id === "NO MATCHES FOUND")) {

                    var noMatchesFound = CCi18n.t('ns.common:resources.' + 'noMatchesFound');

                    this.$menu.html($("<li class='typeaheadTop' disabled>").text(noMatchesFound));

                    return this;
                }

                items = $(items).map(function(i, item) {
                    i = $(self.options.item).attr('data-value', item.name);
                    i.find('a').attr('title', item.name);
                    i.find('a').attr('id', item.id);
                    i.find('a').attr('numRecords', item.numRecords);
                    i.find('a').attr('SKUid', item.SKUid);
                    i.find('a').attr('primaryThumbImageURL', item.primaryThumbImageURL);
                    i.find('a').attr('route', item.route);
                    i.find('.typeaheadProductThumbnail').attr('src', item.thumb);
                    i.find('.typeaheadProductThumbnail').attr('alt', item.primaryImageAltText);
                    i.find('.typeaheadProductThumbnail').attr('title', item.primaryImageTitle);
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
            typeaheadSelect: function() {
                var activeItem = self.$menu.find('.active');

                var productUrl = activeItem.children('a').attr('href');
                var itemId = activeItem.children('a').attr('id');
                var temp = {
                    thumbnailUrl: activeItem[0].firstChild['attributes'].getNamedItem("primaryThumbImageURL").value,
                    path: activeItem[0].firstChild['attributes'].getNamedItem("route").value,
                    catalogRefId: activeItem[0].firstChild['attributes'].getNamedItem("skuid").value,
                    displayName: activeItem[0].firstChild['attributes'].getNamedItem("title").value,
                    id: activeItem.children('a').attr('id'),
                    numberOfSKUs: activeItem[0].firstChild['attributes'].getNamedItem("numrecords").value,
                    childSKUs: [{
                        "repositoryId": activeItem[0].firstChild['attributes'].getNamedItem("skuid").value
                    }]
                }
                this.handleSkuCount(temp);
                return self.hide();
            },

            editPurchaseList: function(id) {
                var widget = this;
                widget.clearSearchTextInElements();
                widget.purchaseListViewModel().purchaseListId = id;
                widget.purchaseListViewModel().items.removeAll();
                widget.purchaseListViewModel().fetchPurchaseList(id);
                widget.purchaseListViewModel().fetchPurchaseListSettings(id, widget.currentAccountId);

                //    console.log('....comig,,,,');
                //  console.log(widget.purchaseListViewModel().items(), "....  console.log(widget.purchaseListViewModel().items())");
              
            },


            getProductData: function() {
                var widget = this;
                var requestData = {};

                ccRestClient.request("/ccstoreui/v1/products?productIds=" + getProductIds.toString(), {}, function(data) {
                    if (data) {
                        widget.updateData(data);
                    }
                }, function(err) {
                    //  console.log(err)
                }, "GET");


            },
            updateData: function(getData) {
                var widget = this;
                ko.mapping.fromJS(getData, {}, this.getCurrentProductData);
                widget.getPagination(widget.koCurrentPage());
                widget.externalPricingCall();

            },


            getPagination: function() {
                var widget = this;
                 $('.pagiNation').removeClass('hide');
                  if(this.getCurrentProductData().length> widget.noOfRecordsPerPage()){
                     $('.pagiNation').removeClass('hide');
                }
                else{
                    $('.pagiNation').addClass('hide');
                }
               
                $('.pagiNation').pagination({
                    items: this.getCurrentProductData().length,
                    itemsOnPage: widget.noOfRecordsPerPage(),
                    currentPage: widget.koCurrentPage(),
                    onPageClick: function(currentPageNumber) {
                        widget.getPageData(currentPageNumber);
                    }
                });
                var totalCount = this.getCurrentProductData().length * 1;
                var count = 4 * 1;
                widget.koTotalPages(parseInt(totalCount / count));
            },


            externalPricingCall: function() {
                var widget = this;
                var skuIds = [];
                for (var i = 0; i < widget.getCurrentProductData().length > 0; i++) {
                    for (var j = 0; j < widget.getCurrentProductData()[i].childSKUs().length > 0; j++) {
                        var skuId = widget.getCurrentProductData()[i].childSKUs()[j].repositoryId();
                        var quotingCatId =
                            widget.getCurrentProductData()[i].childSKUs()[j].hasOwnProperty('dynamicPropertyMapBigString') ?
                            widget.getCurrentProductData()[i].childSKUs()[j].dynamicPropertyMapBigString.hasOwnProperty("sku_x_quotingCategoryIDs") ? widget.getCurrentProductData()[i].childSKUs()[j].dynamicPropertyMapBigString.sku_x_quotingCategoryIDs().replace(/<\/?p>/g, '') : "" : "";
                        skuIds.push({
                            "itemId": skuId,
                            "quotingCatIds": quotingCatId
                        })
                        break;
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
                };

                var data = {
                    "enpointUrl": helper.apiEndPoint.pricing,
                    "postData": skuData
                };
                helper.postDataExternal(data, function(err, result) {
                    widget.destroySpinner(); 
                    if (result.hasOwnProperty('pricingRecords')) {
                        for (var i = 0; i < widget.getCurrentProductData().length > 0; i++) {
                            for (var p = 0; p < result.pricingRecords.length > 0; p++) {
                                if (widget.getCurrentProductData()[i].childSKUs()[0].repositoryId() == result.pricingRecords[p].itemId) {
                                    widget.getCurrentProductData()[i].listPrice(result.pricingRecords[p].listPrice);
                                    widget.getCurrentProductData()[i].salePrice(result.pricingRecords[p].salePrice);
                                    widget.getCurrentProductData()[i].listPrice.valueHasMutated();
                                    widget.getCurrentProductData()[i].salePrice.valueHasMutated();
                                    widget.getCurrentProductData()[i].x_productExternalListPrice = result.pricingRecords[p].listPrice;
                                    widget.getCurrentProductData()[i].x_productExternalSalePrice = result.pricingRecords[p].salePrice;
                                    if (result.pricingRecords[p].hasOwnProperty('salePrice') && result.pricingRecords[p].salePrice !== null) {
                                        widget.showSalePrice(true);
                                        widget.getCurrentProductData()[i]['cartPrice'] = widget.getCurrentProductData()[i].salePrice()
                                    } else {
                                        widget.showSalePrice(false);
                                        widget.getCurrentProductData()[i]['cartPrice'] = widget.getCurrentProductData()[i].listPrice()
                                    }
                                    var childData = widget.getCurrentProductData()[i].childSKUs()[0];
                                    childData.listPrice(result.pricingRecords[p].listPrice);
                                    childData.listPrice.valueHasMutated();
                                    childData.salePrice(result.pricingRecords[p].salePrice);
                                    childData.salePrice.valueHasMutated();
                                    break;
                                }
                            }
                        }
                    } else if (err) {
                        widget.destroySpinner();           
                    }

                });

            },

            // add Single line item into cart

            addItemToCart: function(data, event) {
                var widget = this;
                var newProduct = {};
                newProduct = $.extend(true, {}, data, true);
                newProduct.orderQuantity = parseInt(1, 10);
                newProduct.externalPriceQuantity = -1;
                newProduct.externalPrice = data.cartPrice;
                widget.cart().addItem(ko.toJS(newProduct));
                $.Topic("UPDATE_EXTERNAL_PRICE.memory").publish(data);
                navigation.goTo('/cart');
            },
            displayDeletePurchaseListModal: function(){   
                $('#CC-deletePurchaseList-modal').modal('show');
            },

    
            //add to cart function called on pressing add to cart button
            addToCart: function() {
                var widget = this;
                if ((ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT) && widget.isModalVisible()) {
                    widget.addToCartDilaogClose();
                }
                var spinnerOptions = {
                    parent: 'body',
                    posTop: '50%',
                    posLeft: '50%'
                };
                notifier.clearError(widget.WIDGET_ID);
                notifier.clearSuccess(widget.WIDGET_ID);
                var success = function(success) {
                    if (!(ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT)) {
                        widget.user().validateAndRedirectPage("/cart");
                    } else {
                        spinner.destroy();
                        notifier.sendSuccess("CartViewModel", this.translate("productsAddedToCart"), true);
                        widget.user().validateAndRedirectPage(widget.links()["agentCheckout"].route);
                    }
                };
                var error = function(errorBlock) {
                    var errMessages = "";
                    var displayName;
                    for (var k = 0; k < errorBlock.length; k++) {
                        //Changing the error message from "None of the items in this order can be added to the cart" to "None of the items in this list can be added to the cart."
                        if (errorBlock[k].errorCode == CCConstants.NONE_OF_THE_ITEMS_ADDED) {
                            errorBlock[k].errorMessage = CCi18n.t("ns.purchaseLists:resources.addToCartErrorMsg");
                        }
                        errMessages = errMessages + "\r\n" + errorBlock[k].errorMessage;
                    }
                    if (!(ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT)) {
                        if (errorBlock[0].errorCode == CCConstants.CREATE_ORDER_SKU_NOT_FOUND || errorBlock[0].errorCode == CCConstants.PRODUCT_ADD_TO_CART_OUT_OF_STOCK) {
                            notifier.sendErrorToPage("CartViewModel", errMessages, true, "cart", true);
                        } else {
                            notifier.sendError("CartViewModel", errMessages, true);
                        }
                    } else {
                        spinner.destroy();
                        notifier.sendError("CartViewModel", errMessages, true);
                        widget.user().validateAndRedirectPage(widget.links()["agentCheckout"].route);
                    }
                };

                var items = widget.selectedPurchaseListItems();
                for (var i = 0; i < items.length; i++) {
                    for (var j = 0; j < widget.getCurrentProductData().length > 0; j++) {
                        if (widget.getCurrentProductData()[j].repositoryId() == items[i].productId) {
                            var getProductData = [];
                            var newProduct = {};
                            newProduct = $.extend(true, {}, widget.getCurrentProductData()[j], true);
                            newProduct.orderQuantity = parseInt(1, 10);
                            newProduct.externalPriceQuantity = -1;
                            newProduct.externalPrice = widget.getCurrentProductData()[j].cartPrice;
                            getProductData.push(ko.toJS(newProduct));
                            //   console.log(getProductData,"...getProductData..");
                            widget.cart().addItems(getProductData, success.bind(widget), error.bind(widget));
                            $.Topic("UPDATE_EXTERNAL_PRICE.memory").publish(widget.getCurrentProductData()[j]);
                            navigation.goTo('/cart');
                        }

                    }
                }
                if (!widget.invalidQuantityCheck()) {
                    if (ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT) {
                        spinner.create(spinnerOptions);
                    }

                    widget.isDirty(false);
                    widget.purchaseListViewModel().purchaseListName.isModified(false);
                    for (var i = 0; i < widget.purchaseListViewModel().items().length; i++) {
                        widget.purchaseListViewModel().items()[i].quantityDesired.isModified(false);
                    }
                }
            },

            clickPurchaseListDetails: function(data, event) {
                var widget = this;
                if (!(ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT)) {
                    widget.user().validateAndRedirectPage(this.links().purchaseList.route + '/' + data.id);
                } else {
                    widget.fetchingPurchaseListDetailsForEdit(data.id);
                }
            },

            //==============================================================================================//
            fetchingPurchaseListDetailsForEdit: function(id) {
                var widget = this;
                widget.clearSearchTextInElements();
                widget.purchaseListViewModel().items.removeAll();
                widget.selectedPurchaseListItems.removeAll();
                widget.editPurchaseList(id);
                widget.hideEditAndCreateSection(false);
            },

            clearSearchTextInElements: function() {
                var widget = this;
                if (ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT && widget.elements && widget.elements["product-search"] && widget.elements["sku-search"]) {
                    widget.elements["product-search"].resetSearch();
                    widget.elements["sku-search"].resetSearch();
                    widget.elements["product-search"].hideProductSearchInputBox();
                    widget.elements["sku-search"].hideSKUSearchInputBox();
                }
            },

            /**
             * Loads the lookup for product details from the server.
             */
            productSearchSuccessCallback: function(pProductId) {
                var widget = this;
                widget.isSkuSearch = false;
                widget.clearSearchTextInElements();
                widget.purchaseListViewModel().selectedPriceListGroup = widget.user().selectedPriceListGroup();
                // the pProductId would be empty array incase "No Matches Found" is selected
                if ((pProductId instanceof Array) && !pProductId.length) {
                    return;
                }
                var data = {};
                data[CCConstants.STORE_PRICELISTGROUP_ID] = widget.purchaseListViewModel().selectedPriceListGroup.id;
                data[CCConstants.SHOW_INACTIVE_SKU] = false;
                ccRestClient.request(CCConstants.ENDPOINT_PRODUCTS_GET_PRODUCT, data,
                    // success callback
                    function(pData) {
                        if (!pData || !pData.childSKUs) {
                            notifier.sendError(widget.WIDGET_ID, CCi18n.t('ns.searchAndAddItemsToCart:resources.productDetailsErrorText'), true);
                            return;
                        }
                        pData.selectedPriceListGroupId = widget.site().selectedPriceListGroup().id;
                        var showPopup = widget.showPopupIfCustomizable(pData);
                        if (!showPopup) {
                            widget.purchaseListViewModel().addToPurchaseList(pData);
                        }
                    },
                    // error callback
                    function(pData) {
                        notifier.sendError(widget.WIDGET_ID, CCi18n.t('ns.searchAndAddItemsToCart:resources.productDetailsErrorText'), true);
                    },
                    pProductId);
            },
            /**
             * Show the product details pop up if customizable
             *
             * @param pData
             *       {Object} the product details object.
             */
            showPopupIfCustomizable: function(pData) {
                var widget = this;
                var childSkus = pData.childSKUs;
                var isCustomizable = false;
                if (childSkus.length == 1) {
                    isCustomizable = childSkus[0].configurable;
                } else {
                    isCustomizable = pData.configurable;
                }
                widget.agentPopUpId = widget.popupId;
                if ((pData.childSKUs.length > 1 || pData.addOnProducts.length > 0 || isCustomizable) && widget.agentPopUpId) {
                    // Display modal
                    widget.showPopup(pData);
                    return true;
                } else {
                    return false;
                }
            },
            /**
             * Show the product details pop up.
             */
            showPopup: function(pData) {
                var widget = this;
                var popupId = widget.agentPopUpId;
                if (popupId) {
                    require(['productDetailsUtils'], function(pUtils) {
                        pUtils.showProductDetailsPopup(pData, popupId);
                    });
                }
            },
            /**
             * This method adds sku to cart from the search result.
             * @param{object} pData 
             */
            skuSearchSuccessCallback: function(pData) {
                r
                var widget = this;
                widget.clearSearchTextInElements();
                widget.isSkuSearch = true;
                widget.purchaseListViewModel().selectedPriceListGroup = widget.user().selectedPriceListGroup();
                var productData = widget.skuDataObjectFormation(pData, true);
                var showPopup = widget.showPopupIfCustomizable(productData);
                if (!showPopup) {
                    widget.purchaseListViewModel().addToPurchaseList(productData);
                }
            },
            triggerPageChangeEvent: function() {
                var widget = this;
                var length = widget.subscriptions.length;
                for (var i = 0; i < length; i++) {
                    widget.subscriptions[i].dispose();
                }
                widget.subscriptions = []
            },

            skuDataObjectFormation: function(pData, isSKUSearch, orderQuantity) {
                var widget = this;
                var productData = pData[0].parentProducts[0];
                var skuInfo = pData[0];
                productData.childSKUs = [];
                skuInfo.parentProducts = null; // Remove parent.
                productData.childSKUs.push(skuInfo);
                if (pData[0].shippingSurcharge) {
                    productData.shippingSurcharge = pData[0].shippingSurcharge;
                }
                //populate sku variant information
                productData.selectedOptions = [];
                if (pData.length > 1) {
                    pData[1].forEach(function(item) {
                        productData.selectedOptions.push(item);
                    });
                }
                if (!isSKUSearch) {
                    productData.orderQuantity = orderQuantity;
                    widget.purchaseListViewModel().addToPurchaseList(productData);
                } else {
                    return productData;
                }
            },

            openCreatePurchaseList: function(pData) {
                var widget = this;
                if (ccRestClient.profileType === CCConstants.PROFILE_TYPE_AGENT) {
                    widget.clearSearchTextInElements();
                    widget.purchaseListViewModel().items.removeAll();
                    widget.nameOfPurchaseListPrepopulate("");
                    $('#search-bar-create').val('').change();
                    widget.displaySection("create");
                    widget.hideEditAndCreateSection(false);
                }
            },

            returnUniqueValueForId: function() {
                var widget = this;
                return Math.floor((Math.random() * 100) + 1) + "_" + Math.floor((Math.random() * 100) + 1) + "_" + Math.floor((Math.random() * 100) + 1);
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
            previous: function() {
                if (this.koCurrentPage() != 0) {
                    this.koCurrentPage(this.koCurrentPage() - 1)
                }
                this.displayArrows();
            },
            next: function() {
                if (this.koCurrentPage() < this.koTotalPages()) {
                    this.koCurrentPage(this.koCurrentPage() + 1)
                }
                this.displayArrows();
            },
            getPageData: function(pageNumber) {
                var widget = this;
                if (widget.koCurrentPage() === pageNumber) {
                    return;
                }
                widget.displayArrows();
                widget.koCurrentPage(pageNumber);
            },
            displayArrows: function() {
                var widget = this;
                if (widget.koCurrentPage() == 0) {
                    $('.prev').addClass("previousButton");
                }
                if (widget.koTotalPages() != widget.koCurrentPage() + 1) {
                    $('.next').removeClass("nextButton");
                }
                if (widget.koCurrentPage() != 0) {
                    $('.prev').removeClass("previousButton");
                }
                if (widget.koTotalPages() == widget.koCurrentPage() + 1) {
                    $('.next').addClass("nextButton");
                }
            },
           
            
            //=============================================================================//
        };
    }
);