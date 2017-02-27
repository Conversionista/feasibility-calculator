/*jshint esversion: 6 */
require('./../css/styles.scss');

// global variables
let basicConfiguration = {};
let pagePaths = [];
let requestStrings = [];
//	Google Auth object
let GoogleAuth;
//	Retrieve the discovery document for version 3 of Google Analytics core reporting API.
let discoveryUrl = 'https://www.googleapis.com/discovery/v1/apis/analytics/v3/rest';
let resultData = [];
let calculatedResult = [];
let rowId = 0;	//	init, for keeping track of funnels added by user
//	Access scope for API calls; read only
const SCOPE = ['https://www.googleapis.com/auth/analytics.readonly'];
//	client ID for app
const CLIENT_ID = '540679893971-kjh5477188leiq81h80vuq3s415n0ren.apps.googleusercontent.com';

//	DOM nodes
let addTableRowBtn = document.getElementById("add");
let calculateButton = document.getElementById("calculate");
let pageConfigurationForm = document.getElementById("pageConfigurationForm");
let basicConfigurationForm = document.getElementById("basicConfigurationForm");
let configurationTable = document.getElementById("pageConfigurationTable");
let configurationTableSection = document.getElementById("pagesToTest");
let authButton = document.getElementById("auth-button");
let resultTable = document.getElementById("resultTable");

//	Event listeners
addTableRowBtn.addEventListener("click", appendConfTableRow);
addTableRowBtn.addEventListener("click", pushPagePath);
calculateButton.addEventListener("click", addBasicConfiguration);
calculateButton.addEventListener("click", createRequestStrings);
calculateButton.addEventListener("click", authorize);
authButton.addEventListener('click', authorize);

// Function to enable/disable button
function toggleDisableButton (buttonId, shouldDisable) {
	// fetch button via DOM
	let button = document.getElementById(buttonId);
	
	// toggle disabled property
	shouldDisable === true ? button.setAttribute("disabled", "disabled") : button.removeAttribute("disabled");
}

//	Function to toggle css-class; pass in element and css-class as arguments
function toggleCssClass(element, className){
	let elementClasses = element.classList;
	elementClasses.toggle(className);
}

//	Function for adding basic configuratíon to conf-array
function addBasicConfiguration (evt, formInput) {
	evt.preventDefault();
	let inputElements = basicConfigurationForm.elements;
	let newBasicConf = {};
	for(let i = 0; i < inputElements.length; i++){
		Object.assign(newBasicConf, { [inputElements[i].name] : inputElements[i].value});
	}
	basicConfiguration = newBasicConf;
}

//	Function for appending page configuration to table by #add-button
//	todo: ADD DELETE BUTTON FOR EACH ROW
function appendConfTableRow(evt, tableInput) {
	evt.preventDefault();
	let inputElements = pageConfigurationForm.elements;
	let tr = document.createElement("tr");
	
	// omit last element because button
	for(let i = 0; i < inputElements.length - 1; i++){
		let td = document.createElement("td");
		td.innerHTML = inputElements[i].value;
		tr.appendChild(td);
	}
	configurationTable.getElementsByTagName("tbody")[0].appendChild(tr);

	//	if configuration table is hidden, display it
	if(configurationTableSection.classList.contains("hidden") === true){
		toggleCssClass(configurationTableSection, "hidden");
	}
}

//	Function for adding page configuration to page conf-array
function pushPagePath(evt, tableInput){
evt.preventDefault(); 
let inputElements = pageConfigurationForm.elements;
let newPagePath = {
	rowId : rowId,
	pagePath : inputElements[0].value,
	actionGoal : inputElements[1].value,
	conversionGoal : inputElements[2].value
};
	//	add new object to resultData array for future storage of result
	resultData.splice(rowId, 0, {});
	rowId++;
	//	push newPagePath to pagePaths array
	pagePaths.push(newPagePath);
}

// Initializes the gapi.client object, which app uses to make API requests.
// Handles the authorization flow.
function authorize(event) {
// `immediate` should be false when invoked from the button click.
	let useImmediate = event ? false : true;
	let authData = {
	  client_id: CLIENT_ID,
	  scope: SCOPE,
	  immediate: useImmediate
	};

	gapi.client.load('analytics', 'v3', function () {
		gapi.auth.authorize(authData, function(response) {
		//	if user denies the permission of the app to read Google Analytics data, display 'Authorize'-button so that user can authorize later on if wished
		  if (response.error) {
		    authButton.hidden = false;
		  }
		  else {
		    authButton.hidden = true;
		    makeAPICall();
		  	}
		});
	});
}

//	Function for creating API request string. Arguments - single object from pagePaths array
function createRequestStrings (event) {
	let engagementGoal;
	let actionGoal; 
	let conversionGoal;

	//	empty requestStrings array to avoid multiple calls
	//	solution as suggested in http://stackoverflow.com/a/1232046
	requestStrings.length = 0;
	
	pagePaths.forEach(function(element){
		engagementGoal = { 'rowId' : element.rowId, 'type' : 'engagementGoal',  'pagePath' : element.pagePath, 'metrics': 'ga:users,ga:bounceRate', 'segment' : `users::sequence::ga:pagePath=${element.pagePath}` };
		actionGoal = { 'rowId' : element.rowId, 'type' : 'actionGoal', 'pagePath' : element.pagePath, 'metrics': 'ga:users', 'segment' : `users::sequence::ga:pagePath=${element.pagePath};->>${element.actionGoal}` };
		conversionGoal = { 'rowId' : element.rowId, 'type' : 'conversionGoal', 'pagePath' : element.pagePath, 'metrics': 'ga:users', 'segment' : `users::sequence::ga:pagePath=${element.pagePath};->>${element.actionGoal};->>${element.conversionGoal}`};
		requestStrings.push(engagementGoal, actionGoal, conversionGoal);
	});
}

//	Function for sending request to Core reporting API when user is authourized
function makeAPICall () {
		requestStrings.forEach(function(element){
			queryCoreReportingApi(element);
	});
}

//	Function for querying the Core reporting API, saves data for each response
function queryCoreReportingApi(element) {
 	gapi.client.analytics.data.ga.get({
    'ids': 'ga:' + basicConfiguration.gaViewId,	  
    'start-date': `${basicConfiguration.samplePeriod * 7}daysAgo`,  //	user input is in weeks
    'end-date': 'yesterday',
    'samplingLevel' : basicConfiguration.samplingLevel,
    'metrics': element.metrics,
    'segment' : element.segment,
    'max-results' : 10000 //	https://developers.google.com/analytics/devguides/reporting/core/v3/reference#maxResults 
  })
  .then(function(response) {
    saveResult(response.result, element.rowId, element.type, element.pagePath);
  })
  .then(function() {
	resultData.forEach( function(resultElement){
		calculateResult(resultElement);
	});
   })
  .then(null, function(err) {
      // Log any errors
      console.log(err);
  });
}

//	Function for saving relevant data for calculation from API-response
function saveResult(result, rowId, type, pagePath){
	let resultObject = resultData[rowId];
	Object.assign(resultObject, {"type" : type, "rowId": rowId});

	if(type === "engagementGoal"){
		let engagementGoalUsers = result["totalsForAllResults"]["ga:users"];
		let bounceRate = result["totalsForAllResults"]["ga:bounceRate"];
		Object.assign(resultObject, { 'pagePath': pagePath, 'bounceRate' : bounceRate, 'engagementGoalUsers' : engagementGoalUsers});
	} else if(type === "actionGoal") {
		let actionGoalUsers = result["totalsForAllResults"]["ga:users"];
		Object.assign(resultObject, { 'actionGoalUsers' : actionGoalUsers });
	} else if(type === "conversionGoal") {	
		let conversionGoalUsers = result["totalsForAllResults"]["ga:users"];
		Object.assign(resultObject, { 'conversionGoalUsers' : conversionGoalUsers });
	} else {
		console.log("Unknown type");
	}
	console.log(resultData);
}

//	Function for calculating result
function calculateResult(element){
	let bounceRate = element.bounceRate;
	let engagementGoalUsers = Number(element.engagementGoalUsers);
	let noOfVariations = basicConfiguration.variations;
	let maxExperimentLength = basicConfiguration.experimentLength; 
	let samplePeriod = basicConfiguration.samplePeriod;
	let type = element.type;
	
	if(type === "engagementGoal"){
		let engagementGoalMDU;
		let engagementRateShare = (bounceRate !== 0 ? (1 - (bounceRate/100)) : 1);
		
		if(engagementGoalUsers !== 0){
			engagementGoalMDU = engagementGoalMinDetectUplift(noOfVariations, engagementRateShare, engagementGoalUsers, samplePeriod, maxExperimentLength);	
		}else{
			engagementGoalMDU = ("N/A");
		}
		console.log('emdu', engagementGoalMDU);
	
	} else if(type === "actionGoal") {
		let actionCTR;
		let actionGoalMDU;
		let actionGoalUsers = Number(element.actionGoalUsers);
		
		if(actionGoalUsers && engagementGoalUsers !== 0 ){
			actionCTR = actionGoalClickThroughRate(actionGoalUsers, engagementGoalUsers);
			actionGoalMDU = actionGoalMinDetectUplift(noOfVariations, actionCTR, engagementGoalUsers, samplePeriod, maxExperimentLength);
		} else {
			actionCTR = ("N/A");
			actionGoalMDU = ("N/A");
		}
		console.log('actr, acmdu', actionCTR, actionGoalMDU);
	
	} else if(type === "conversionGoal") {
		let CR;
		let conversionGoalMDU;
		let conversionGoalUsers = Number(element.conversionGoalUsers);
		
		if(conversionGoalUsers !== 0 && engagementGoalUsers !== 0){
			CR = conversionRate(conversionGoalUsers, engagementGoalUsers);
			conversionGoalMDU = conversionGoalMinDetectUplift(noOfVariations, CR, engagementGoalUsers, samplePeriod, maxExperimentLength);	
		}else{
			CR = ("N/A");
			conversionGoalMDU = ("N/A");
		}
		console.log('cr, crmdu', CR, conversionGoalMDU);
	
	} else {
		console.log("Unknown type");
	}
}

function engagementGoalMinDetectUplift(noOfVariations, engagementRateShare, engagementGoalUsers, samplePeriod, maxExperimentLength){
	let engagementGoalMinDetectUplift = 100 * Math.sqrt(26*noOfVariations*(1-engagementRateShare)/engagementRateShare/((engagementGoalUsers/samplePeriod)*maxExperimentLength));
	return engagementGoalMinDetectUplift;
}
	
function actionGoalClickThroughRate(actionGoalUsers, engagementGoalUsers){
	let actionGoalClickThroughRate = (actionGoalUsers/engagementGoalUsers);
	return actionGoalClickThroughRate;
}

function actionGoalMinDetectUplift(noOfVariations, actionGoalClickThroughRate, engagementGoalUsers, samplePeriod, maxExperimentLength){
	let actionGoalMinDetectUplift = 100 * Math.sqrt(26*noOfVariations*(1-actionGoalClickThroughRate)/actionGoalClickThroughRate/((engagementGoalUsers/samplePeriod)*maxExperimentLength));
	return actionGoalMinDetectUplift;
}

function conversionRate(conversionGoalUsers, engagementGoalUsers){
	let conversionRate = (conversionGoalUsers/engagementGoalUsers);
	return conversionRate;
}

function conversionGoalMinDetectUplift(noOfVariations, conversionRate, engagementGoalUsers, samplePeriod, maxExperimentLength){
	let conversionGoalMinDetectUplift = 100 * Math.sqrt(26*noOfVariations*(1-conversionRate)/conversionRate/((engagementGoalUsers/samplePeriod)*maxExperimentLength));
	return conversionGoalMinDetectUplift;
}

//	Function for saving calculated result

//	Function for displaying result

// 	Function to validate input

//	Function for validating number input

//	Function for deleting row in table

//	Function for splicing deleted table-row-object from conf array

//	Function to validate that user at least puts in one page path?

//	Function for fetching today's date

//	Function for saving data in local storage

//	?? Function to regEx input ?? 