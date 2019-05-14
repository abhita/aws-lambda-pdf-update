process.env['PATH'] = process.env['PATH'] + ':' + process.env['LAMBDA_TASK_ROOT'] + '/bin';
process.env['LD_LIBRARY_PATH'] = process.env['LAMBDA_TASK_ROOT'] + '/bin';

var fs = require('fs');
//var localLambda=require('lambda-local');
var async = require('async');
var AWS = require('aws-sdk');
var util = require('util');
//var request = require('request');
var mktemp = require("mktemp");
var pdfFiller = require('pdffiller');
var s3 = new AWS.S3();
var ts=(new Date().getTime());
//var retrotaxPdf = require('pdf.js');

//https://github.com/lob/lambda-pdftk-example
// Set the PATH and LD_LIBRARY_PATH environment variables.
exports.handler = function(event, context,callback) {
    // You can set this property to false to request AWS Lambda to freeze the process soon after the callback is called, 
    //even if there are events in the event loop.
    context.callbackWaitsForEmptyEventLoop=true;
    console.log(event);
    console.log(context);

    var config = JSON.parse(fs.readFileSync('config.json', { encoding: "utf8" }));
    var lambdaResponse = config.lambdaResponse;
    lambdaResponse.request_id=context.awsRequestId;
    lambdaResponse.log_stream_name=context.logStreamName ?  context.logStreamName : config.localLambda.logStreamName
    callback(null,JSON.stringify(lambdaResponse));

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
                //var base64 = new Buffer(data).toString('base64');
                //request({method: 'PUT', url: lambdaResponse.file.pre_signed_url, body: data}, function(err, res, data){
                //  if(err) callback(addError(config.errors[3]));
                //  console.log("uploaded to S3: ");
                  next(null, data);
                //});
           }, 2000);
        },
        function uploadToS3(pdfData, next) {
                var params = {
                    Bucket: config.awsBucket,
                    Key: event.gid,
                    ACL:"bucket-owner-full-control", //http://docs.aws.amazon.com/AmazonS3/latest/API/RESTObjectPUTacl.html
                    Body: pdfData
                }
                s3.putObject(params, function(err, response) {
                    if (err) {
                        callback(addError(config.errors[3]));
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
                callback(addError(config.errors[0]));
            } else {
                callback(null,JSON.stringify(lambdaResponse));
            }
        }
    );

    function validateEvent(event){
            if (event) {
                callback(addError(config.errors[7]));
            }
            if (event) {
                callback(addError(config.errors[8]));
            }
    }
    function addError(errorObj){
        errorObj.request_id=context.awsRequestId;
        console.log(errorObj);
        callback(JSON.stringify(errorObj));
    }
    


};//end handler