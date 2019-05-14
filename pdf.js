var system = require('system');
var args = system.args;


// Send some info node's childProcess' stdout

var fs = require('fs');
var async = require('async');
var AWS = require('aws-sdk');
var util = require('util');
var request = require('request');
var mktemp = require("mktemp");
var pdfFiller = require('pdffiller');
var s3 = new AWS.S3();
var ts=(new Date().getTime());

var event=args[1];
var context=args[2];



    //lambdaResponse.file.pre_signed_key = context.awsRequestId+'_'+ts+'_preSigned.pdf';
    lambdaResponse.file.pre_signed_key=event.gid;
    lambdaResponse.file.filename = context.awsRequestId+'_'+ts+'_.pdf';
    //lambdaResponse.file.pre_signed_url = s3.getSignedUrl('putObject', {Bucket: config.awsBucket, Key: lambdaResponse.file.pre_signed_key, Expires:3000});
    //console.log("The URL is",lambdaResponse);
    async.waterfall([
        function buildPDF(next) {
            console.log('generating pdf');
            var sourcePDF, destinationPDF;
            sourcePDF="./"+event.form_name; 
            destinationPDF = mktemp.createFileSync("/tmp/"+lambdaResponse.file.filename);
            //fs.chmod(destinationPDF,'777');
            var shouldFlatten = false;
            var data = event.fields;
            pdfFiller.fillForm(sourcePDF, destinationPDF, data, shouldFlatten, next);

            setTimeout(function() {
                console.log("Set Timeout Finished");
                //var fileStream = fs.createReadStream(destinationPDF);  
                var data=fs.readFileSync(destinationPDF);
                var base64 = new Buffer(data).toString('base64');
                //request({method: 'PUT', url: lambdaResponse.file.pre_signed_url, body: data}, function(err, res, base64){
                //  if(err) callback(addError(config.errors[3]));
                //  console.log("uploaded to S3: ");
                  next(null, base64);
                //});
           }, 20000);
        },
        function uploadToS3(pdfData, next) {
                var params = {
                    Bucket: config.awsBucket,
                    Key: event.gid,
                    ACL:"bucket-owner-full-control", //http://docs.aws.amazon.com/AmazonS3/latest/API/RESTObjectPUTacl.html
                    Body: pdfData,
                    ContentType: "application/pdf"
                }
                s3.putObject(params, function(err, response) {
                    if (err) {
                        system.stdout.write(addError(config.errors[3]));
                    } else {
                        console.log("S3 response");
                        console.log(response);
                        next();
                    }
                });
        }

        ], function (err) {
            if (err) {
                //console.log(err);
                system.stdout.write(addError(config.errors[0]));
            } else {
                system.stdout.write(JSON.stringify(lambdaResponse));
            }
        }
    );

    function validateEvent(event){
            if (event) {
                system.stdout.write(addError(config.errors[7]));
            }
            if (event) {
                system.stdout.write(addError(config.errors[8]));
            }
    }
    function addError(errorObj){
        errorObj.request_id=context.awsRequestId;
        console.log(errorObj);
        system.stdout.write(JSON.stringify(errorObj));
    }