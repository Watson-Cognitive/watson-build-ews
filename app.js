var express = require('express');
var watson = require('watson-developer-cloud');
var fs     = require('fs');
var cfenv = require('cfenv');
var app = express();
app.set('title','Early Warning System');
app.set('view engine','ejs');
app.use(express.static(__dirname + '/public'));
var ibmdb = require('ibm_db');
var appEnv = cfenv.getAppEnv();

//
var request = require('request');
var cheerio = require('cheerio');
var URL = require('url-parse');
var MAX_PAGES_TO_VISIT=10;
var numPagesVisited = 0;
var pagesVisited = {};
var pagesToVisit = [];
var url = " ";
var baseUrl = " ";
var SEARCH_WORD =" ";
var START_URL=" ";
var CP_ID =" ";
var DOMAIN_NAME=" ";
var max_seq_no=" ";

var bodyParser = require('body-parser');
var dashboard_query = "SELECT CDC.CDC_CNTRY_RISK,CM.CM_CNCTD_CP_ID,CM.CM_CP_NAME,CM.CM_ULT_PARNT_NAME,CDC.CDC_LEGAL_ENTITYTYPE,CDC.CDC_MTM_NET,CDC.CDC_CVA,(SELECT AD_SCORE FROM ANALYTICAL_DETAILS WHERE AD_COUNTERPARTY_ID = CM.CM_CP_ID)AS AD_SCORE,(SELECT AD_SCORE_UPDTIME FROM ANALYTICAL_DETAILS WHERE AD_COUNTERPARTY_ID = CM.CM_CP_ID)AS AD_SCORE_UPDTIME, CM.CM_CURRENT_RATING  FROM COUNTERPARTY_MASTER CM,DETAILS_FROM_CLIENT CDC WHERE CM.CM_CP_ID IN (SELECT TT_COUNTERPARTY_ID FROM TRACKING_TABLE WHERE TT_CLIENT_ID = 'CLID1' AND TT_TRACKING_STATUS = 'Y') AND CDC.CDC_CLIENT_ID = 'Dummy Client 1' ORDER BY CM.CM_CP_NAME";
var newsonly_query = "SELECT CM.CM_CP_ID,.CM_CP_NAME,CM.CM_ULT_PARNT_NAME,(SELECT AD_SCORE FROM ANALYTICAL_DETAILS WHERE AD_COUNTERPARTY_ID = CM.CM_CP_ID)AS AD_SCORE,(SELECT AD_SCORE_UPDTIME FROM ANALYTICAL_DETAILS WHERE AD_COUNTERPARTY_ID = CM.CM_CP_ID)AS AD_SCORE_UPDTIME,CM.CM_CURRENT_RATING FROM COUNTERPARTY_MASTER CM WHERE CM.CM_CP_ID IN (SELECT TT_COUNTERPARTY_ID FROM TRACKING_TABLE WHERE TT_CLIENT_ID = 'CLID1' AND TT_TRACKING_STATUS = 'Y')";
var counterparty_query = "SELECT CM.CM_CNCTD_CP_ID,CM.CM_CP_ID,CM.CM_CP_NAME,CM.CM_ULT_PARNT_NAME,CM.CM_NTR_RLTN,CDC.CDC_LEGAL_ENTITYTYPE,CDC.CDC_MTM_NET,CDC.CDC_CVA,(SELECT AD_SCORE FROM ANALYTICAL_DETAILS WHERE AD_COUNTERPARTY_ID = CM.CM_CP_ID)AS AD_SCORE, (SELECT AD_SCORE_UPDTIME FROM ANALYTICAL_DETAILS WHERE AD_COUNTERPARTY_ID = CM.CM_CP_ID)AS AD_SCORE_UPDTIME,CM.CM_CURRENT_RATING FROM COUNTERPARTY_MASTER CM,DETAILS_FROM_CLIENT CDC WHERE CM.CM_CNCTD_CP_ID = ? AND CDC.CDC_CLIENT_ID = 'Dummy Client 1'";
var portfoliodetails_query = "SELECT CDC_LEGAL_ENTITYTYPE,CDC_PRODUCTS,CDC_DEAL_COUNT,CDC_EXP_TYPE,CDC_MEASURE,CDC_TIME_BAND,CDC_LIMIT,CDC_EXPOSURE,CDC_AVAILABLE,CDC_LIMIT_EXP,CDC_TENOR FROM DETAILS_FROM_CLIENT WHERE CDC_CP_ID  = ?";
var counterpartyother_query = "SELECT CM.CM_CP_NAME,CM.CM_CP_ID,CM.CM_ULT_PARNT_NAME,CM.CM_ULT_PARENT_ID,CM.CM_CURRENT_RATING,CLM.CLM_RISK_OFFICER,CDC.CDC_INT_RATING,CDC.CDC_CNTRY_RISK,CDC.CDC_CNTRY_DMCILE FROM COUNTERPARTY_MASTER CM, CLIENT_MASTER CLM,DETAILS_FROM_CLIENT CDC WHERE CM.CM_CP_ID = ? AND CLM.CLM_CLIENT_ID = 'CLID1' AND CDC.CDC_CLIENT_ID = 'Dummy Client 1'"

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.listen(appEnv.port, '0.0.0.0', function() {
  console.log("server starting on " + appEnv.url);
});

app.get('/',function(req,res){
	res.render('login');
});

var fetchConnectedCounterpartyList = function(conn,selectedCNCTDCP,otherDetails,res){
	console.log("In the method $$ " + selectedCNCTDCP);
	var connectedCounterPartyList;
	conn.query(counterparty_query,selectedCNCTDCP,function(err, rows) {
		if ( !err ) {
			console.log(rows.length + " is the number of rows " + rows[0].CM_CP_ID);
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				connectedCounterPartyList = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		fetchConnectedcounterpartyOther(conn,connectedCounterPartyList,otherDetails,res);
	});
}

var fetchConnectedcounterpartyOther = function(conn,connectedCounterPartyList,otherDetails,res){
	var pgdata = {
		ccpl:connectedCounterPartyList,
		cp_name:otherDetails[0],
		ult_parnt_name:otherDetails[1],
		ad_score:otherDetails[2],
		cdc_cntry_risk:otherDetails[3]
	};
	res.render('connectedcounterparty',{page_title:"Connected Counterparty",data:pgdata});
}

var fetchPortfolioDetailsList = function(conn,portfolioDetailsQueryArgs,otherDetails,res){
	var portfolioDetailsList;
	conn.query(portfoliodetails_query,portfolioDetailsQueryArgs,function(err, rows) {
		if ( !err ) {
			console.log(rows.length + " is the number of rows " + rows[0].CM_CNCTD_CP_ID);
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				portfolioDetailsList = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		fetchCounterpartyDetailsOther(conn,portfolioDetailsList,portfolioDetailsQueryArgs,otherDetails,res);
	});
}

var fetchCounterpartyDetailsOther = function(conn,portfolioDetailsList,portfolioDetailsQueryArgs,otherDetails,res){
	var counterpartyOtherDetails;
	console.log("THis is the Counterparty ID : " + portfolioDetailsQueryArgs[0]);
	conn.query(counterpartyother_query,portfolioDetailsQueryArgs,function(err, rows) {
		if ( !err ) {
			console.log(rows.length + " is the number of rows ###### " + rows[0].CM_CNCTD_CP_ID);
			if(rows.length == 0){
				console.log("There are NO values");
			}else{
				counterpartyOtherDetails = rows;
			}
		}else{
			console.log("error occurred " + err.message);
		}
		var pgdata = {
			pdl:portfolioDetailsList,
			cod:counterpartyOtherDetails,
			cp_name:otherDetails[0],
			ult_parnt_name:otherDetails[1],
			ad_score:otherDetails[2],
		};
		res.render('counterpartydetails',{page_title:"Counterparty Details",data:pgdata});
	});
}

app.get('/connectedcounterparty',function(req,res){
	var cp_name = req.query.cp_name;
	var cnctd_cp_id = req.query.cnctd_cp_id;
	var ult_parnt_name = req.query.ult_parnt_name;
	var ad_score = req.query.ad_score;
	var cdc_cntry_risk = req.query.cdc_cntry_risk;
	var selectedCNCTDCP = [];
	var otherDetails = [];
	selectedCNCTDCP.push(cnctd_cp_id);
	otherDetails.push(cp_name);
	otherDetails.push(ult_parnt_name);
	otherDetails.push(ad_score);
	otherDetails.push(cdc_cntry_risk);
	var pageData;
	ibmdb.open(connString, function(err, conn) {
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			fetchConnectedCounterpartyList(conn,selectedCNCTDCP,otherDetails,res);
		}
	});
});

app.get('/counterpartydetails',function(req,res){
	var cp_id = req.query.cp_id;
	var cp_name = req.query.cp_name;
	var ult_parnt_name = req.query.ult_parnt_name;
	var ad_score = req.query.ad_score;
	var portfolioDetailsQueryArgs = [];
	var otherDetails = [];
	otherDetails.push(cp_name);
	otherDetails.push(ult_parnt_name);
	otherDetails.push(ad_score);
	portfolioDetailsQueryArgs.push(cp_id);
	console.log("Counterparty Id is : " + cp_id);
	ibmdb.open(connString, function(err, conn) {
		if (err ) {
			res.send("error occurred " + err.message);
		}
		else{
			fetchPortfolioDetailsList(conn,portfolioDetailsQueryArgs,otherDetails,res);
		}
	});
});

app.post('/auth', function(req, res) {
	var client = req.body.username;
	console.log(client + " : is the user name");
	
	if(client == "client1"){
		ibmdb.open(connString, function(err, conn) {
			if (err ) {
				res.send("error occurred " + err.message);
			}
			else{
				conn.query(dashboard_query, function(err, rows) {
					if ( !err ) {
						console.log(rows.length + "is the number of rows");
						if(rows.length == 0){
							console.log("There are NO values");
						}
					}else{
						console.log("error occurred " + err.message);
					}
					conn.close(function(){
						console.log("Connection Closed");
					});
					res.render('dashboard',{page_title:"Dashboard",data:rows});
				});
			}
		});
	}else if(client == "client2"){
		ibmdb.open(connString, function(err, conn) {
			if (err ) {
				res.send("error occurred " + err.message);
			}
			else{
				conn.query(newsonly_query, function(err, rows) {
					if ( !err ) {
						console.log(rows.length + " is the number of rows");
						if(rows.length == 0){
							console.log("There are NO values");
						}
					}else{
						console.log("error occurred " + err.message);
					}
					conn.close(function(){
						console.log("Connection Closed");
					});
					res.render('newsonly',{page_title:"News Only",data:rows});
				});
			}
		});
	}
	else if(client == "admin"){
		res.render('admin',{page_title:"Admin"});
	}
});

app.post('/crawl', function(req, res) {
	var queryString = "select CM_CP_NAME,NS_DOMAIN_URL,CM_CP_ID,NS_DOMAIN_NAME from COUNTERPARTY_MASTER, NEWS_SOURCE_MASTER WHERE CM_CP_ID=NS_CP_ID and CM_CP_NAME in ('Mumbai','RBI') AND NS_TRACKING_STATUS='Y' and CM_TRACKING_STATUS='Y'";
	ibmdb.open(connString, function(err, conn){
        if(err) {

          	console.error("error: ", err.message);
          	console.log("*************** DB not open");
        } 
        else
        {
        	console.log("*************** DB connection open");
        	conn.query("set schema EWS_DATABASE", function(err1, data1, moreResultSets) {			
               if(err1)
               	console.error("Error setting schema : ", err1.message);
          	   else
          	   	console.log("Schema is set");
			 });
			 
			 			conn.query(queryString, function(err2, data2, moreResultSets) {				 
               if(err2)
               	console.error("Error selecting data from NEWS_REPOSITORY : ", err2.message);
          	   else
          	   	{
				console.log("Data is selected. No of records : ", data2.length);
					
					
					for (var i=0;i<data2.length;i++)
						//for (var i in data2)
						{

	 SEARCH_WORD= data2[i].CM_CP_NAME;
	 START_URL= data2[i].NS_DOMAIN_URL;
	 CP_ID=data2[i].CM_CP_ID;
	 DOMAIN_NAME=data2[i].NS_DOMAIN_NAME;
	
	console.log("Searching for ", data2[i].CM_CP_NAME,"on ", START_URL= data2[i].NS_DOMAIN_URL);
	numPagesVisited = 0;
	MAX_PAGES_TO_VISIT=10;
		 pagesVisited = {};
//var numPagesVisited = 0;
 pagesToVisit = [];
 url = new URL(START_URL);
 baseUrl = url.protocol + "//" + url.hostname;
//var MAX_PAGES_TO_VISIT=10;

pagesToVisit.push(START_URL);	
crawl();
//callback();
						}
function collectInternalLinks($) {
  var allRelativeLinks = [];
  var allAbsoluteLinks = [];

  var relativeLinks = $("a[href^='/']");
  relativeLinks.each(function() {
      allRelativeLinks.push($(this).attr('href'));

  });

  var absoluteLinks = $("a[href^='http']");
  absoluteLinks.each(function() {
      allAbsoluteLinks.push($(this).attr('href'));
  });

  console.log("Found " + allRelativeLinks.length + " relative links");
  console.log("Found " + allAbsoluteLinks.length + " absolute links");
}


function crawl(callback) {
  if(numPagesVisited >= MAX_PAGES_TO_VISIT) {
    console.log("Reached max limit of number of pages to visit.");
    return;
  }
  var nextPage = pagesToVisit.pop();
  if (nextPage in pagesVisited) {
    // We've already visited this page, so repeat the crawl
    crawl();
  } else {
    // New page we haven't visited
    visitPage(nextPage, crawl);
  }
}

function visitPage(url, callback) {
  // Add page to our set
  pagesVisited[url] = true;
  numPagesVisited++;
  // Make the request
  console.log("Visiting Page " + url);
  
  //*problem is here
  request(url, function(error, response, body) {
     // Check statuscode (200 is HTTP OK)
	// console.log("reached here");
     console.log("Status code: " + response.statusCode);
	   if(response.statusCode !== 200) {  
       callback();
       return;  
     }
     // Parse the document body
     var $ = cheerio.load(body);
	 
     var isWordFound = searchForWord($, SEARCH_WORD);
     if(isWordFound) {
       console.log('Word ' + SEARCH_WORD + ' found at page ' + url);
	   	   
	   console.log("Inserting records into the database");
	   
			                	  	//var insrt_qry = "update NEWS_REPOSITORY set NR_SCORE = " + sc + " where NR_SEQUENCE_NO = " + seq_no;
									
									
	/* var max_Seq_Number_qry = "select max(NR_SEQUENCE_NO) from EWS_DATABASE.NEWS_REPOSITORY";
									
			                	  	console.log("selecting max seq number from news repository : ", max_Seq_Number_qry);
									conn.query(max_Seq_Number_qry, function(err4, data3, moreResultSets) {			
               						if(err4)
               							console.error("error selecting seq number : ", err4.message);
          	   						else
          	   							console.log("max_seq_no selected",data3[0]);
									max_seq_no=data3[0];
			 						});	 */							
									
									
									
	//var insrt_qry = "insert into EWS_DATABASE.NEWS_REPOSITORY (NR_SEQUENCE_NO,NR_COUNTERPARTY_ID,NR_NEWS_URL,NR_NEWS_SOURCE) VALUES ("+"(select max(NR_SEQUENCE_NO) from EWS_DATABASE.NEWS_REPOSITORY)+1"+",'"+CP_ID+"', '"+url+"','"+DOMAIN_NAME+"')";
									
			                	  	//console.log("insert query : ", insrt_qry);
									/*conn.query(insrt_qry, function(err4, data3, moreResultSets) {			
               						if(err4)
               							console.error("Error Updating Score : ", err4.message);
          	   						else
          	   							console.log("Record inserted");
			 						});*/
	   
									 res.status(200).send('OK');
	   //console.log($('html > body').text()); // get text from news website
     } else {
       collectInternalLinks($);
       // In this short program, our callback is just calling crawl()
       callback();
     }
  });
}

function searchForWord($, word) {
  var bodyText = $('html > body').text().toLowerCase();
   
  return(bodyText.indexOf(word.toLowerCase()) !== -1);
  
}

function collectInternalLinks($) {
    var relativeLinks = $("a[href^='/']");
    console.log("Found " + relativeLinks.length + " relative links on page");
    relativeLinks.each(function() {
        pagesToVisit.push(baseUrl + $(this).attr('href'));
    });
}

				


					
          	
  	   		}


			 });
}
//conn.close(function(){console.log("Connection Closed");});
});
});

//DB2 Connection
var db2 = {
        db: "BLUDB",
        hostname: "dashdb-txn-flex-yp-sjc03-01.services.dal.bluemix.net",
        port: 50000,
        username: "bluadmin",
        password: "Yjg1ZThkNjA5YThh",
        schema: "EWS_DATABASE"
     };

var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port + ";CurrentSchema=" + db2.schema;