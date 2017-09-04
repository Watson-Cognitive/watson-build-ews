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

var bodyParser = require('body-parser');
var dashboard_query = "SELECT CM.CM_CP_NAME,CM.CM_ULTIMATE_PARENT_NAME,CDC.CDC_LEGAL_ENTITYTYPE,CDC.CDC_MTM_NET,CDC.CDC_CVA,(SELECT AD_SCORE FROM ANALYTICAL_DETAILS WHERE AD_COUNTERPARTY_ID = CM.CM_CP_ID)AS AD_SCORE,(SELECT AD_SCORE_UPDATETIME FROM ANALYTICAL_DETAILS WHERE AD_COUNTERPARTY_ID = CM.CM_CP_ID)AS AD_SCORE_UPDATETIME, CM.CM_CURRENT_RATING FROM COUNTERPARTY_MASTER CM,DETAILS_FROM_CLIENT CDC WHERE CM.CM_CP_ID IN (SELECT TT_COUNTERPARTY_ID FROM TRACKING_TABLE WHERE TT_CLIENT_ID = 'CLID1' AND TT_TRACKING_STATUS = 'Y') AND CDC.CDC_CLIENT_ID = 'Dummy Client 1'";
var newsonly_query = "SELECT CM.CM_CP_NAME,CM.CM_ULTIMATE_PARENT_NAME,(SELECT AD_SCORE FROM ANALYTICAL_DETAILS WHERE AD_COUNTERPARTY_ID = CM.CM_CP_ID)AS AD_SCORE,(SELECT AD_SCORE_UPDATETIME FROM ANALYTICAL_DETAILS WHERE AD_COUNTERPARTY_ID = CM.CM_CP_ID)AS AD_SCORE_UPDATETIME,CM.CM_CURRENT_RATING FROM COUNTERPARTY_MASTER CM WHERE CM.CM_CP_ID IN (SELECT TT_COUNTERPARTY_ID FROM TRACKING_TABLE WHERE TT_CLIENT_ID = 'CLID1' AND TT_TRACKING_STATUS = 'Y')";
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());

app.listen(appEnv.port, '0.0.0.0', function() {
  console.log("server starting on " + appEnv.url);
});

app.get('/',function(req,res){
	res.render('login');
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
						if(rows.length > 0){
							res.data = rows;
							console.log("There are values" + rows[0].CM_CP_NAME);
						}else{
							console.log("There are NO values");
						}
						//cb (res) ;
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
	}else if(client = "client2"){
		ibmdb.open(connString, function(err, conn) {
			if (err ) {
				res.send("error occurred " + err.message);
			}
			else{
				conn.query(newsonly_query, function(err, rows) {
					if ( !err ) {
						console.log(rows.length + "is the number of rows");
						if(rows.length > 0){
							res.data = rows;
							console.log("There are values" + rows[0].CM_CP_NAME);
						}else{
							console.log("There are NO values");
						}
						//cb (res) ;
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
});

//DB2 Connection
var db2 = {
        db: "BLUDB",
        hostname: "dashdb-txn-flex-yp-sjc03-01.services.dal.bluemix.net",
        port: 50000,
        username: "bluadmin",
        password: "Yjg1ZThkNjA5YThh",
        schema: "EWS DATABASE"
     };

var connString = "DRIVER={DB2};DATABASE=" + db2.db + ";UID=" + db2.username + ";PWD=" + db2.password + ";HOSTNAME=" + db2.hostname + ";port=" + db2.port + ";CurrentSchema=" + db2.schema;