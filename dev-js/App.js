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
let callId = 0;	//	init
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
	callId : callId,
	pagePath : inputElements[0].value,
	actionGoal : inputElements[1].value,
	conversionGoal : inputElements[2].value
};
	//	add new object to resultData array for future storage of result
	resultData.splice(callId, 0, {});
	callId++;
	//	push newPagePath to pagePaths array
	pagePaths.push(newPagePath);
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
		engagementGoal = { 'callId' : element.callId, 'type' : 'engagementGoal',  'pagePath' : element.pagePath, 'metrics': 'ga:users,ga:bounceRate', 'segment' : `users::sequence::ga:pagePath=${element.pagePath}` };
		actionGoal = { 'callId' : element.callId, 'type' : 'actionGoal', 'pagePath' : element.pagePath, 'metrics': 'ga:users', 'segment' : `users::sequence::ga:pagePath=${element.pagePath}->>${element.actionGoal}` };
		conversionGoal = { 'callId' : element.callId, 'type' : 'conversionGoal', 'pagePath' : element.pagePath, 'metrics': 'ga:users', 'segment' : `users::sequence::ga:pagePath=${element.pagePath}->>${element.actionGoal}->>${element.conversionGoal}`};
		requestStrings.push(engagementGoal, actionGoal, conversionGoal);
		//	console.log('requestStrings', requestStrings);		
	});

	// authorize users and start communication with API when request strings are created
	authorize(event);
}

// Initialize the gapi.client object, which app uses to make API requests.
function authorize(event) {
// Handles the authorization flow.
// `immediate` should be false when invoked from the button click.
gapi.client.load('analytics', 'v3');
let useImmediate = event ? false : true;
let authData = {
  client_id: CLIENT_ID,
  scope: SCOPE,
  immediate: useImmediate
};

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
}

//	Function for sending request to Core reporting API when user is authourized
function makeAPICall () {
		requestStrings.forEach(function(element){
		 	//	delay of 0.1s per API call to avoid reaching call limit per second	
		window.setTimeout(function(){
			queryCoreReportingApi(element);
		}, 100)
		});
	}

//	Function for querying the Core reporting API, saves data for each response
function queryCoreReportingApi(element) {
 gapi.client.analytics.data.ga.get({
    'ids': 'ga:' + basicConfiguration.gaViewId,		//	  
    'start-date': `${basicConfiguration.samplePeriod * 7}daysAgo`,  //	user input is in weeks
    'end-date': 'yesterday',
    'samplingLevel' : basicConfiguration.samplingLevel,
    'metrics': element.metrics,
    'segment' : element.segment,
    'max-results' : 10000 //	https://developers.google.com/analytics/devguides/reporting/core/v3/reference#maxResults 

  })
  .then(function(response) {
    var formattedJson = JSON.stringify(response.result, null, 2);
    console.log(formattedJson);
    saveResult(response.result, element.callId, element.type, element.pagePath);
  })
  .then(null, function(err) {
      // Log any errors
      console.log(err);
  });
}

//	Function for saving relevant data for calculation from API-response
function saveResult(result, callId, type, pagePath){
	let resultObject = resultData[callId];

	if(type === "engagementGoal"){
		let engagementGoalUsers = result["totalsForAllResults"]["ga:users"];
		let bounceRate = result["totalsForAllResults"]["ga:bounceRate"]
		Object.assign(resultObject, { 'pagePath': pagePath, 'engagementGoalUsers' : engagementGoalUsers, 'bounceRate' : bounceRate});
	} else if(type === "actionGoal") {
		let actionGoalUsers = result["totalsForAllResults"]["ga:users"];
		Object.assign(resultObject, { 'actionGoalUsers' : actionGoalUsers });
	} else if(type === "conversionGoal") {	
		let conversionGoalUsers = result["totalsForAllResults"]["ga:users"];
		Object.assign(resultObject, { 'conversionGoalUsers' : conversionGoalUsers });
	} else {
		console.log("Unknown type");
	}
}

// 	Function to validate input

//	Function for validating number input

//	Function for deleting row in table

//	Function for splicing deleted table-row-object from conf array

//	Function to validate that user at least puts in one page path?

//	Function for fetching today's date

//	Function for saving data in local storage

//	?? Function to regEx input ?? 