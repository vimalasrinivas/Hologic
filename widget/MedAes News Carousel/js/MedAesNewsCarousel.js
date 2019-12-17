/**
 * @fileoverview hero Widget.
 * 
 * @author 
 */
define(
    //-------------------------------------------------------------------
    // MODULE DEFINITION
    //-------------------------------------------------------------------
    ['knockout', 'jquery', 'js/Eventslick'],  

    function(ko, $) {

        "use strict";

        return {
        bannerImages : ko.observableArray([]),
        eventsFeed : ko.observable(),


            slickIntitator : function(){
                    setTimeout(function(){ 
                     $("#news_Widget").parent().parent().addClass('centerContent');

                    $('.news-carousel__slides').on('init', function(event, slick) {
                        $('.Count').html("<span>0" + (slick.currentSlide + 1) + "</span><span>/</span><span>0" + slick.slideCount + "</span>");
                    });

                    $('.news-carousel__slides').slick({
                        dots: true,
                        infinite: true,
                        autoplay: true,
                        speed: 1000,
                        arrows: true,
                        prevArrow: $('.prev'),
                        nextArrow: $('.next'),
                        slidesToScroll: 1,
                        slidesPerRow: 3,
                         slidesToShow: 3
                         
                    });

                    $('.news-carousel__slides').on('beforeChange', function(event, slick, currentSlide, nextSlide) {
                        $('.Count').html("<span>0" + (+nextSlide + 1) + "</span><span>/</span><span>0" + slick.slideCount + "</span>");                        
                    });
                    }, 100); 
                    $('.news-carousel__slides').slick("unslick")
             
            },
            onLoad: function(widget) {
                  widget.xmlevents();
                 widget.bannerImages.push(widget.bannerImage1);
                 widget.bannerImages.push(widget.bannerImage2);
                  widget.bannerImages.push(widget.bannerImage3);
                   widget.bannerImages.push(widget.bannerImage4);
                //Slick Initilize
                widget.slickIntitator();
            },    
            getDateData: function(data){
                var widget=this;  
                var dateshow;
                var newDate;
               if(data){
                    dateshow = new Date(data.startdate);
                    newDate = dateshow.toDateString().slice(3);
                    return  newDate;     
               }
               else{
                   return "";
               }
                
              
                     
            },
             externalEventProductsCall: function(data) {
            var skuIds = [];
                var widget = this;
                var skuData = { 
                }
                console.log(widget,"widget");
                console.log(widget, widget.site().extensionSiteSettings.externalSiteSettings.feedEventsUrl, "...skuData.")
                $.ajax({
                    type: "POST",
                     headers: {
                    'Access-Control-Allow-Origin': '*'
                   },
                    url: widget.site().extensionSiteSettings.externalSiteSettings.feedEventsUrl,
                    async: false,
                    data: ko.toJSON(skuData),   
                    crossDomain:true,
                    success: function(result) {
                
                         console.log(result , "........result........");
                    },
                    error: function(e) {

                    }
                });
                
            },
            xmlevents : function(){
                    var widget =this;
                    var parser, xmlDoc;
                    var text = '<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wfw="http://wellformedweb.org/CommentAPI/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:sy="http://purl.org/rss/1.0/modules/syndication/" xmlns:slash="http://purl.org/rss/1.0/modules/slash/" xmlns:ev="http://purl.org/rss/1.0/modules/event/" xmlns:geo="http://www.w3.org/2003/01/geo/wgs84_pos#" xmlns:vCard="http://www.w3.org/2006/vcard/ns#" > <channel> <title>Cynosure a Hologic Company</title> <link>https://www.cynosure.com</link> <description>We help people discover their Beautiful.</description> <lastBuildDate>Thu, 15 Aug 2019 21:24:18 +0000</lastBuildDate> <language>en-US</language> <sy:updatePeriod>hourly</sy:updatePeriod> <sy:updateFrequency>1</sy:updateFrequency> <atom:link href="https://www.cynosure.com/feed/events" rel="self" type="application/rss+xml" /> <generator>https://wordpress.org/?v=5.1.1</generator> <image> <url>https://www.cynosure.com/wp-content/uploads/2018/10/cropped-android-chrome-512x512-3-32x32.png</url> <title>Cynosure a Hologic Company</title> <link>https://www.cynosure.com</link> <width>32</width> <height>32</height> </image> <item> <title>White Plains, NY</title> <link>https://www.cynosure.com/events/aesthetic-exchange/white-plains-ny-2</link> <guid isPermaLink="false">https://www.cynosure.com/?post_type=event&#038;p=3136</guid> <description> Join featured speakers Dr. Dianne Quibell and Flo Goshgarian, along with aesthetic industry experts and marketing sponsors, for a weekend of discussions, demonstrations, and networking. With the information you’ll learn, you will leave confident and able to expand your practice offerings to include the most popular and profitable procedures. </description> <ev:startdate>2019-09-07T00:00:00+00:00</ev:startdate> <ev:enddate>2019-09-08T00:00:00+00:00</ev:enddate> <vCard:adr> <vCard:street-address>The Ritz Carlton New York, Westchester</vCard:street-address> <vCard:extended-address>3 Renaissance Square</vCard:extended-address> <vCard:locality>White Plains</vCard:locality> <vCard:postal-code>10601</vCard:postal-code> <vCard:region>NY</vCard:region> </vCard:adr> <geo:lat>41.03307699999999</geo:lat> <geo:long>-73.76770019999998</geo:long> </item> <item> <title>Nashville, TN</title> <link>https://www.cynosure.com/events/aesthetic-exchange/nashville-tn</link> <guid isPermaLink="false">https://www.cynosure.com/?post_type=event&#038;p=3135</guid> <description> Join featured speakers Dr. Dianne Quibell and Flo Goshgarian, along with aesthetic industry experts and marketing sponsors, for a weekend of discussions, demonstrations, and networking. With the information you’ll learn, you will leave confident and able to expand your practice offerings to include the most popular and profitable procedures. </description> <ev:startdate>2019-09-14T00:00:00+00:00</ev:startdate> <ev:enddate>2019-09-15T00:00:00+00:00</ev:enddate> <vCard:adr> <vCard:street-address>Hutton Hotel</vCard:street-address> <vCard:extended-address>1808 West End Ave</vCard:extended-address> <vCard:locality>Nashville</vCard:locality> <vCard:postal-code>37203</vCard:postal-code> <vCard:region>TN</vCard:region> </vCard:adr> <geo:lat>36.15287</geo:lat> <geo:long>-86.79708199999999</geo:long> </item> <item> <title>West Hollywood, CA</title> <link>https://www.cynosure.com/events/aesthetic-exchange/west-hollywood-ca</link> <guid isPermaLink="false">https://www.cynosure.com/?post_type=event&#038;p=3176</guid> <description> Join featured speaker Dr. Kian Karimi, along with aesthetic industry experts and marketing sponsors, for a weekend of discussions, demonstrations, and networking. With the information you’ll learn, you will leave confident and able to expand your practice offerings to include the most popular and profitable procedures. </description> <ev:startdate>2019-09-14T00:00:00+00:00</ev:startdate> <ev:enddate>2019-09-15T00:00:00+00:00</ev:enddate> <vCard:adr> <vCard:street-address>The London West Hollywood at Beverly Hills</vCard:street-address> <vCard:extended-address>1020 N San Vicente Blvd</vCard:extended-address> <vCard:locality>West Hollywood</vCard:locality> <vCard:postal-code>90069</vCard:postal-code> <vCard:region>CA</vCard:region> </vCard:adr> <geo:lat>34.0897641</geo:lat> <geo:long>-118.38518190000002</geo:long> </item> <item> <title>Princeton, NJ</title> <link>https://www.cynosure.com/events/aesthetic-exchange/princeton-nj</link> <guid isPermaLink="false">https://www.cynosure.com/?post_type=event&#038;p=3187</guid> <description> Join featured speakers Dr. Dianne Quibell and Flo Goshgarian, along with aesthetic industry experts and marketing sponsors, for a weekend of discussions, demonstrations, and networking. With the information you’ll learn, you will leave confident and able to expand your practice offerings to include the most popular and profitable procedures. </description> <ev:startdate>2019-09-21T00:00:00+00:00</ev:startdate> <ev:enddate>2019-09-22T00:00:00+00:00</ev:enddate> <vCard:adr> <vCard:street-address>The Westin Princeton Forrestal Village</vCard:street-address> <vCard:extended-address>201 Village Blvd</vCard:extended-address> <vCard:locality>Princeton</vCard:locality> <vCard:postal-code>08540</vCard:postal-code> <vCard:region>NJ</vCard:region> </vCard:adr> <geo:lat>40.3557374</geo:lat> <geo:long>-74.6114033</geo:long> </item> <item> <title>Toronto, ON</title> <link>https://www.cynosure.com/events/aesthetic-exchange/toronto-on</link> <guid isPermaLink="false">https://www.cynosure.com/?post_type=event&#038;p=3416</guid> <description> Join featured speakers Dr. Dianne Quibell and Flo Goshgarian, along with aesthetic industry experts and marketing sponsors, for a day of discussions, demonstrations, and networking. With the information you’ll learn, you will leave confident and able to expand your practice offerings to include the most popular and profitable procedures. </description> <ev:startdate>2019-09-28T00:00:00+00:00</ev:startdate> <ev:enddate>1970-01-01T00:00:00+00:00</ev:enddate> <vCard:adr> <vCard:street-address>Sheraton Centre Toronto Hotel </vCard:street-address> <vCard:extended-address>123 Queen Street West </vCard:extended-address> <vCard:locality>Toronto</vCard:locality> <vCard:postal-code>M5H 2M9</vCard:postal-code> <vCard:region>ON</vCard:region> </vCard:adr> <geo:lat>43.6511441</geo:lat> <geo:long>-79.3843286</geo:long> </item> <item> <title>Orlando, FL</title> <link>https://www.cynosure.com/events/aesthetic-exchange/orlando-fl-2</link> <guid isPermaLink="false">https://www.cynosure.com/?post_type=event&#038;p=3507</guid> <description> Join featured speakers Dr. Dianne Quibell and Flo Goshgarian, along with aesthetic industry experts and marketing sponsors, for a weekend of discussions, demonstrations, and networking. With the information you’ll learn, you will leave confident and able to expand your practice offerings to include the most popular and profitable procedures	</description> <ev:startdate>2019-11-09T00:00:00+00:00</ev:startdate> <ev:enddate>2019-11-10T00:00:00+00:00</ev:enddate> <vCard:adr> <vCard:street-address>Loews Sapphire Falls Resort at Universal Orlando</vCard:street-address> <vCard:extended-address>6601 Adventure Way</vCard:extended-address> <vCard:locality>Orlando</vCard:locality> <vCard:postal-code>32819</vCard:postal-code> <vCard:region>FL</vCard:region> </vCard:adr> <geo:lat>28.466522303368222</geo:lat> <geo:long>-81.47102983995057</geo:long> </item> </channel> </rss>';
                    parser = new DOMParser();
                    xmlDoc = parser.parseFromString(text,"text/xml");
                    var arr = [];
                    var items = xmlDoc.getElementsByTagName("channel")[0].getElementsByTagName("item");
                    var itemslength = items.length;
                    if(items && itemslength > 0){
                    	for(var i=0; i<itemslength; i++){
                    		var nodeItems = items[i].childNodes;
                    		var nodeLength = nodeItems.length;
                    		var newObj = {};
                    		 var splitValue;
                    		for(var j=1; j<nodeLength; j=j+2){
                    		    if(nodeItems[j].nodeName.indexOf(':')!=-1){
                    		           splitValue = nodeItems[j].nodeName.split(':');
                    		           newObj[splitValue[1]]  = nodeItems[j].childNodes[0].nodeValue;	
                    		      }else{
                    		           newObj[nodeItems[j].nodeName]  = nodeItems[j].childNodes[0].nodeValue;
                    		      }
                    			     	
                    			}
                    	arr.push(newObj);
                    	widget.eventsFeed(arr);  
                        console.log("arr",widget.eventsFeed());
                    	}
                    }
            },
            beforeAppear: function(page) {
              var widget = this ;   
              //widget.externalEventProductsCall();    
             //widget.bannerImages.push(widget.bannerImage1.src());
               /* bannerImages[0]= widget.bannerImage1.src();
                bannerImages[1]= widget.bannerImage2.src();
                bannerImages[2]= widget.bannerImage3.src();
                bannerImages[3]= widget.bannerImage4.src();*/  
                
            widget.xmlevents();
         //   widget.getData();  
                 widget.getDateData(); 
            },
        };
    }
);