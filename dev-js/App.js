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
let calculateBtn = document.getElementById("calculate");
let pageConfigurationForm = document.getElementById("pageConfigurationForm");
let basicConfigurationForm = document.getElementById("basicConfigurationForm");
let configurationTable = document.getElementById("pageConfigurationTable");
let configurationTableSection = document.getElementById("pagesToTest");
let authBtn = document.getElementById("authButton");
let resultTable = document.getElementById("resultTable");
let pagesToTestSection = document.getElementById("pagesToTest");
let resultSection = document.getElementById("result");

//	Event listeners
addTableRowBtn.addEventListener("click", addButton);
calculateBtn.addEventListener("click", calculateButton);
authBtn.addEventListener("click", authorize);

//	function to add behaviour to add-button
function addButton(evt){
	evt.preventDefault();
	toggleDisableButton("calculate", true);
	addBasicConfiguration();
	pushPagePath();
	createRequestStrings();
	authorize();
	
	//	timeout function to delay possibility for user to calculate result on data before it has been fetched from the API
	window.setTimeout(function(){
		appendConfTableRow(pagePaths[pagePaths.length - 1]);
		toggleDisableButton("calculate", false);		
	}, 2000);
}

//	function to add behavior to calculate-button
function calculateButton(evt){
	evt.preventDefault();

	//	clear calculatedResult-array from old elements
	calculatedResult.length = 0;
	resultData.forEach(function(element){
		calculateResult(element);
	 });
	displayResult();
}

// Function to enable/disable button
function toggleDisableButton (buttonId, shouldDisable) {
	// fetch button via DOM
	let button = document.getElementById(buttonId);
	
	// toggle disabled property
	shouldDisable === true ? button.setAttribute("disabled", "disabled") : button.removeAttribute("disabled");
}

//	Function to add css-class; pass in element and css-class as arguments
function toggleCssClass(element, className){
	let elementClasses = element.classList;
	elementClasses.toggle(className);
}

//	Function for adding basic configuratíon to conf-array
function addBasicConfiguration () {
	let inputElements = basicConfigurationForm.elements;
	let newBasicConf = {};
	for(let i = 0; i < inputElements.length; i++){
		Object.assign(newBasicConf, { [inputElements[i].name] : inputElements[i].value});
	}
	basicConfiguration = newBasicConf;
}

//	Function for appending page configuration to table by #add-button
function appendConfTableRow(element) {
	let inputElements = pageConfigurationForm.elements;
	let tr = document.createElement("tr");
	tr.setAttribute("id", `trPagePathRow${element.rowId}`);
	
	for(let i = 0; i < 3; i++){
		let td = document.createElement("td");
		
		switch (i) {
			case 0:
				td.innerHTML = element.pagePath;
				break;
			case 1:
				td.innerHTML = element.actionGoal;
				break;
			case 2:
				td.innerHTML = element.conversionGoal;
				break;
			default: 
				td.innerHTML = "N/A";
		}

		tr.appendChild(td);

	}

	// append delete-btn to each row
	let deleteBtn = document.createElement("button");
	deleteBtn.innerHTML = "Delete";
	deleteBtn.setAttribute("id", `${element.rowId}deletBtnRow`);
	deleteBtn.addEventListener("click", deletePagePath);

	tr.appendChild(deleteBtn);
	configurationTable.getElementsByTagName("tbody")[0].appendChild(tr);

	//	if configuration table is hidden, display it
	if(configurationTableSection.classList.contains("hidden") === true){
		toggleCssClass(configurationTableSection, "hidden");
	}
}

//	Function for adding page configuration to page conf-array
function pushPagePath(){
	let inputElements = pageConfigurationForm.elements;
	let newPagePath = {
		rowId : rowId,
		pagePath : inputElements[0].value,
		actionGoal : inputElements[1].value,
		conversionGoal : inputElements[2].value
	};
		//	add new object to resultData array for future storage of result
		resultData.push({rowId});
		rowId++;
		//	push newPagePath to pagePaths array
		pagePaths.push(newPagePath);
}

// function to delete page path from various arrays
function deletePagePath(evt){
	evt.preventDefault();
	let rowId = (parseInt(this.id));
	
	// 	delete table row
	let tableRow = document.getElementById(`trPagePathRow${rowId}`);
	tableRow.parentElement.removeChild(tableRow);
	
	//	delete row in pagePaths
	let pagePathsIndex = findObjectInArray(pagePaths, "rowId", rowId);
	pagePaths.splice(pagePathsIndex, 1);

	//	delete row in requestStrings
	let requestStringsIndex = findObjectInArray(requestStrings, "rowId", rowId);
	requestStrings.splice(requestStringsIndex, 1);

	//	delete row in resultData
	let resultDataIndex = findObjectInArray(resultData, "rowId", rowId);
	resultData.splice(resultDataIndex, 1);

	//	if all page paths are deleted, hide section...
	if(pagePaths.length === 0){
		toggleCssClass( pagesToTestSection, "hidden");
	}
}

// function for finding corresponding object in array
function findObjectInArray(array, property, value){
	let objIndex; 
	array.findIndex(function(element, index){
		if(element[property] === value){
			objIndex = index;
		}
	});
	return objIndex;
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
		    authBtn.hidden = false;
		  }
		  else {
		    authBtn.hidden = true;
		    makeAPICall();
		  	}
		});
	});
}

//	Function for creating API request string. Arguments - single object from pagePaths array
function createRequestStrings() {
	let engagementGoal;
	let actionGoal; 
	let conversionGoal;

	//	empty requestStrings array to avoid multiple calls
	//	solution as suggested in http://stackoverflow.com/a/1232046
	requestStrings.length = 0;
	
	pagePaths.forEach(function(element){
		engagementGoal = { 'rowId' : element.rowId, 'type' : 'engagementGoal',  'pagePath' : element.pagePath, 'metrics': 'ga:users,ga:bounceRate', 'segment' : `users::sequence::ga:pagePath=${element.pagePath}` };
		actionGoal = { 'rowId' : element.rowId, 'type' : 'actionGoal', 'pagePath' : element.pagePath, 'actionGoal' : element.actionGoal, 'metrics': 'ga:users', 'segment' : `users::sequence::ga:pagePath=${element.pagePath};->>${element.actionGoal}` };
		conversionGoal = { 'rowId' : element.rowId, 'type' : 'conversionGoal', 'pagePath' : element.pagePath, 'conversionGoal' : element.conversionGoal, 'metrics': 'ga:users', 'segment' : `users::sequence::ga:pagePath=${element.pagePath};->>${element.actionGoal};->>${element.conversionGoal}`};
		requestStrings.push([engagementGoal, actionGoal, conversionGoal]);
	});
}

//	Function for sending request to Core reporting API when user is authourized
function makeAPICall () {
	requestStrings[requestStrings.length - 1].forEach(function(element){
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
    saveResult(response.result, element.rowId, element.type, element.pagePath, element.actionGoal, element.conversionGoal);
  })
  .then(null, function(err) {
      // Log any errors
      console.log(err);
  });
}

//	Function for saving relevant data for calculation from API-response
function saveResult(result, rowId, type, pagePath, actionGoal, conversionGoal){
	let index = findObjectInArray(resultData, "rowId", rowId);
	let resultObject = resultData[index];
	//Object.assign(resultObject, {rowId});

	if(type === "engagementGoal"){
		let engagementGoalUsers = result.totalsForAllResults["ga:users"];
		let bounceRate = result.totalsForAllResults["ga:bounceRate"];
		Object.assign(resultObject, { pagePath, bounceRate, engagementGoalUsers});
	} else if(type === "actionGoal") {
		let actionGoalUsers = result.totalsForAllResults["ga:users"];
		Object.assign(resultObject, { actionGoal, actionGoalUsers });
	} else if(type === "conversionGoal") {	
		let conversionGoalUsers = result.totalsForAllResults["ga:users"];
		Object.assign(resultObject, { conversionGoal, conversionGoalUsers });
	} else {
		console.log("Unknown type");
	}
}

//	Function for calculating result
function calculateResult(element){
	let bounceRate = Number(element.bounceRate);
	let engagementGoalUsers = Number(element.engagementGoalUsers);
	let noOfVariations = basicConfiguration.variations;
	let maxExperimentLength = basicConfiguration.experimentLength; 
	let samplePeriod = basicConfiguration.samplePeriod;
	let type = element.type;
	let rowId = element.rowId;
	let engagementRateShare = (bounceRate !== 0 ? (1 - (bounceRate/100)) : 1);
	let actionGoalUsers = Number(element.actionGoalUsers);
	let conversionGoalUsers = Number(element.conversionGoalUsers);
	let engagementGoalMDU;
	let actionCTR;
	let actionGoalMDU;
	let CR;
	let conversionGoalMDU;
	
	//	add new object to calculatedResult array for future storage of result
	calculatedResult.push({rowId});

	if (engagementGoalUsers !== 0){
		engagementGoalMDU = engagementGoalMinDetectUplift(noOfVariations, engagementRateShare, engagementGoalUsers, samplePeriod, maxExperimentLength);	
	} else {
		engagementGoalMDU = ("N/A");
	}
	
	if (actionGoalUsers && engagementGoalUsers !== 0 ){
		actionCTR = actionGoalClickThroughRate(actionGoalUsers, engagementGoalUsers);
		actionGoalMDU = actionGoalMinDetectUplift(noOfVariations, actionCTR, engagementGoalUsers, samplePeriod, maxExperimentLength);
	} else {
		actionCTR = ("N/A");
		actionGoalMDU = ("N/A");
	}
		
	if (conversionGoalUsers && engagementGoalUsers !== 0){
		CR = conversionRate(conversionGoalUsers, engagementGoalUsers);
		conversionGoalMDU = conversionGoalMinDetectUplift(noOfVariations, CR, engagementGoalUsers, samplePeriod, maxExperimentLength);	
	} else {
		CR = ("N/A");
		conversionGoalMDU = ("N/A");
	}

	saveCalculatedResult(element.pagePath, element.actionGoal, element.conversionGoal, rowId, {
		bounceRate,
		engagementGoalMDU,
		engagementGoalUsers,
		engagementRateShare,
		actionGoalUsers,
		actionCTR,
		actionGoalMDU,
		conversionGoalUsers,
		CR, 
		conversionGoalMDU
	});
}

function engagementGoalMinDetectUplift(noOfVariations, engagementRateShare, engagementGoalUsers, samplePeriod, maxExperimentLength){
	let engagementGoalMinDetectUplift = 100 * Math.sqrt(26*noOfVariations*(1-engagementRateShare)/engagementRateShare/((engagementGoalUsers/samplePeriod)*maxExperimentLength));
	return engagementGoalMinDetectUplift;
}
	
function actionGoalClickThroughRate(actionGoalUsers, engagementGoalUsers){
	let actionGoalClickThroughRate = 100 *(actionGoalUsers/engagementGoalUsers);
	return actionGoalClickThroughRate;
}

function actionGoalMinDetectUplift(noOfVariations, actionGoalClickThroughRate, engagementGoalUsers, samplePeriod, maxExperimentLength){
	let actionGoalMinDetectUplift = 100 * Math.sqrt(26*noOfVariations*(1-(actionGoalClickThroughRate/100))/(actionGoalClickThroughRate/100)/((engagementGoalUsers/samplePeriod)*maxExperimentLength));
	return actionGoalMinDetectUplift;
}

function conversionRate(conversionGoalUsers, engagementGoalUsers){
	let conversionRate = 100 * (conversionGoalUsers/engagementGoalUsers);
	return conversionRate;
}

function conversionGoalMinDetectUplift(noOfVariations, conversionRate, engagementGoalUsers, samplePeriod, maxExperimentLength){
	let conversionGoalMinDetectUplift = 100 * Math.sqrt(26*noOfVariations*(1-(conversionRate/100))/(conversionRate/100)/((engagementGoalUsers/samplePeriod)*maxExperimentLength));
	return conversionGoalMinDetectUplift;
}

function saveCalculatedResult(pagePath, actionGoal, conversionGoal, rowId, calculatedValues){
	let index = findObjectInArray(calculatedResult, "rowId", rowId);
	let resultObject = calculatedResult[index];
	let bounceRate = calculatedValues.bounceRate;
	let engagementGoalUsers = calculatedValues.engagementGoalUsers;
	let engagementGoalMDU = calculatedValues.engagementGoalMDU;
	let actionGoalUsers = calculatedValues.actionGoalUsers ;
	let actionCTR = calculatedValues.actionCTR;
	let actionGoalMDU = calculatedValues.actionGoalMDU;
	let conversionGoalUsers = calculatedValues.conversionGoalUsers;
	let conversionRate = calculatedValues.CR;
	let conversionGoalMinDetectUplift = calculatedValues.conversionGoalMDU;
	
	Object.assign(resultObject, { 
		pagePath,
		actionGoal,
		conversionGoal,
		rowId,
		bounceRate,
		engagementGoalUsers,
		engagementGoalMDU,
		actionGoalUsers,
		actionCTR,
		actionGoalMDU,
		conversionGoalUsers,
		conversionRate,
		conversionGoalMinDetectUplift
	});
}

function displayResult(){
//	hide section while table is constructed
toggleCssClass(resultSection, "hidden");

//	clear table of old results
	let tableRows = resultTable.getElementsByTagName("tr");
	let length = tableRows.length;

	//	2 first elements should always remain
	if(length > 2){
		for(let i = length - 1 ; i > 1; i--){
		resultTable.getElementsByTagName("tbody")[0].removeChild(tableRows[i]);
		}
	}
	
	//	only calculate values and display table if there is any results to make calculations on...
	if(calculatedResult.length > 0){
		calculatedResult.forEach(appendResultTableRow);
		resultSection.classList.remove("hidden");
	}
}

function appendResultTableRow(element){
	let tr = document.createElement("tr");
	tr.setAttribute("id", `trResultRow${element.rowId}`);

	if (!document.getElementById(`trResultRow${element.rowId}`)) {
		for(let i = 0; i < 12; i++){
		var td = document.createElement("td");
		td.setAttribute("id", `td${i}`);

		switch (i) {
		  case 0:
		    td.innerHTML = element.pagePath;
		    break;
		  case 1:
		  //	formatting of thousands eg 17000 --> 17 000
		  //	see http://stackoverflow.com/a/2901298
		    td.innerHTML = element.engagementGoalUsers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		    break;
		  case 2:
		    td.innerHTML = `${element.bounceRate.toFixed(1)}%`;
		    break;
		  case 3:
		    td.innerHTML = `${element.engagementGoalMDU.toFixed(1)}%`;
		    break;
		  case 4:
		    td.innerHTML = element.actionGoal;
		    break;
		  case 5:
		  	td.innerHTML = element.actionGoalUsers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		    break;
		  case 6:
		  	td.innerHTML = `${element.actionCTR.toFixed(1)}%`;
		    break;
		  case 7:
		  	td.innerHTML = `${element.actionGoalMDU.toFixed(1)}%`;
		    break;
		  case 8:
		  	td.innerHTML = element.conversionGoal;
		    break;
		  case 9:
		  	td.innerHTML = element.conversionGoalUsers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		    break;
		  case 10:
		  	td.innerHTML = `${element.conversionRate.toFixed(1)}%`;
		    break;
		  case 11:
		  	td.innerHTML = `${element.conversionGoalMinDetectUplift.toFixed(1)}%`;
		    break;
		  default:
		    td.innerHTML = "nothing yet";
		}

		tr.appendChild(td);
		resultTable.getElementsByTagName("tbody")[0].appendChild(tr);
		}
	}
}

// 	Function to validate input

//	Function for validating number input

//	Function to validate that user at least puts in one page path?

//	Function for fetching today's date

//	Function for saving data in local storage

//	?? Function to regEx input ?? 