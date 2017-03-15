/*jshint esversion: 6 */
require('bootstrap-loader');
require ('bootstrap-sass');
require('./../css/styles.scss');
import $ from "jquery";

// GLOBAL VARIABLES
let basicConfiguration = {};

//	to keep track of if the added funnel is the default one or not
let calculatedOnce = false;
let calculatedResult = [];

let errors = false;

//	Google Auth object
let GoogleAuth;
let resultData = [];
let pagePaths = [];
let requestStrings = [];

//	init, for keeping track of funnels added by user
let rowId = 0;	

//	Retrieve the discovery document for version 3 of Google Analytics core reporting API.
const DISCOVERY_URL = 'https://www.googleapis.com/discovery/v1/apis/analytics/v3/rest';

//	Access scope for API calls; read only
const SCOPE = ['https://www.googleapis.com/auth/analytics.readonly'];
//	client ID for app
const CLIENT_ID = '540679893971-kjh5477188leiq81h80vuq3s415n0ren.apps.googleusercontent.com';

//	DOM NODES
let accountParagraph = document.getElementById("accountInfo");
let addTableRowBtn = document.getElementById("add");
let authBtn = document.getElementById("authButton");
let buttonSection = document.getElementById("buttons");

let basicConfigurationSection = document.getElementById("configuration");
let basicConfigurationForm1 = document.getElementById("basicConfigurationForm1");
let basicConfigurationForm2 = document.getElementById("basicConfigurationForm2");
let calculateBtn = document.getElementById("calculate");

let expLengthSpan = document.getElementById("expLength");

let configurationBtn = document.getElementById("configure");
let configurationTable = document.getElementById("pageConfigurationTable");
let configurationTableSection = document.getElementById("pagesToTest");
let customizeBtn = document.getElementById("customize");

let logoutBtn = document.getElementById("logout");

let pageConfigurationSection = document.getElementById("pagesConfiguration");
let pageConfigurationForm = document.getElementById("pageConfigurationForm");
let pagesToTestSection = document.getElementById("pagesToTest");

let resultTable = document.getElementById("resultTable");
let resultSection = document.getElementById("result");

let variationsSpan = document.getElementById("noVariations");

// input elements
let actionGoalInput = document.getElementById("actionGoal");
let conversionGoalInput = document.getElementById("conversionGoal");
let experimentLengthInput = document.getElementById("experimentLength");
let gaViewIdInput = document.getElementById("gaViewId");
let pagePathInput = document.getElementById("pagePath");
let samplingLevelInput = document.getElementById("samplingLevel");
let samplePeriodInput = document.getElementById("samplePeriod");
let variationsInput = document.getElementById("variations");

//	input element msg spans
let actionGoalMsg = document.getElementById("actionGoalMsg");
let conversionGoalMsg = document.getElementById("conversionGoalMsg");
let experimentLengthMsg = document.getElementById("experimentLengthMsg");
let funnelMsg = document.getElementById("funnelMsg");
let gaViewIdMsg = document.getElementById("gaViewIdMsg");
let pagePathMsg = document.getElementById("pagePathMsg");
let samplePeriodMsg = document.getElementById("samplePeriodMsg");
let variationsMsg = document.getElementById("variationsMsg");

//	EVENT LISTENERS BUTTONS
addTableRowBtn.addEventListener("click", addButton);
authBtn.addEventListener("click", authorize);
calculateBtn.addEventListener("click", calculateButton);
customizeBtn.addEventListener("click", customizeButton);

//	Temporary fix for "logout"-functionality so the user can change GA view ID
logoutBtn.addEventListener("click", function(){
	window.location.reload(true);
});

// FUNCTIONS for toggling CSS-classes, disable buttons, finding objects in array, validate input

// Function to enable/disable button
function toggleDisableButton (buttonId, shouldDisable) {
	// fetch button via DOM
	let button = document.getElementById(buttonId);
	
	// toggle disabled property
	if(shouldDisable){
		button.setAttribute("disabled", "disabled");
	} else {
		button.removeAttribute("disabled");
	}
}

//	Function to add css-class; pass in element and css-class as arguments
function addCssClass(element, className){
	let elementClasses = element.classList;
	elementClasses.add(className);
}

//	Function to remove css-class; pass in element and css-class as arguments
function removeCssClass(element, className){
	let elementClasses = element.classList;
	elementClasses.remove(className);
}

//	Function to toggle css-class; pass in element and css-class as arguments
function toggleCssClass(element, className){
	let elementClasses = element.classList;
	elementClasses.toggle(className);
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

// 	Function to validaten that input is not empty
function validateNoEmptyInput(inputElement){
	let pass;
	if(inputElement.value){
		pass = true;
	} else {
		pass = false;
		}
	return pass; 
}

//	Function for validating number input with min and max range
function validateMinMax(inputElement, min, max){
	let pass;
	if(inputElement.value >= min && inputElement.value <= max){
		pass = true;
	} else {
		pass = false;
		}
	return pass;
}

// EVENT LISTENERS INPUT FIELDS

//	GA view id input event listener
gaViewIdInput.addEventListener("input", function(){
	let inputExists = validateNoEmptyInput(gaViewIdInput);
	if(inputExists){
		toggleDisableButton("authButton", false);
		toggleDisableButton("add", false);
		gaViewIdMsg.innerHTML = "";
	} else {
		gaViewIdMsg.innerHTML = "Please enter your Google Analytics View ID. You find it in Google Analytics --> Admin --> View --> View Settings --> View ID";
		toggleDisableButton("add", true);
		}
});

//	Funnel input event listeners
pagePathInput.addEventListener("change", function(){
	let inputExists = validateNoEmptyInput(pagePathInput);
	if(inputExists){
		pagePathMsg.innerHTML = "";
		toggleDisableButton("add", false);
		} else {
		pagePathMsg.innerHTML = "Please enter a page path in Regex.";
		toggleDisableButton("add", true);
	}
});

actionGoalInput.addEventListener("input", function(){
	let inputExists = validateNoEmptyInput(actionGoalInput);
	if(inputExists){
		actionGoalMsg.innerHTML = "";
		toggleDisableButton("add", false);
	} else {
		actionGoalMsg.innerHTML = "Please enter an action corresponding to <a href=\"https://developers.google.com/analytics/devguides/reporting/core/dimsmets#segments=true&cats=custom_variables_or_columns,ecommerce,page_tracking\" target=\"_blank\">Googles core reporting API</a>";
		toggleDisableButton("add", true);
	}
});

conversionGoalInput.addEventListener("input", function(){
	let inputExists = validateNoEmptyInput(conversionGoalInput);
	if(inputExists){
		conversionGoalMsg.innerHTML = "";
		toggleDisableButton("add", false);
		} else {
		conversionGoalMsg.innerHTML = "Please enter a conversion goal corresponding to <a href=\"https://developers.google.com/analytics/devguides/reporting/core/dimsmets#segments=true&cats=custom_variables_or_columns,ecommerce,page_tracking\" target=\"_blank\">Googles core reporting API</a>";
		toggleDisableButton("add", true);
	}
});

//	Configuration parameters input listeners
samplePeriodInput.addEventListener("input", function(){
	let inputExists = validateNoEmptyInput(samplePeriodInput);
	let inputIsInRange = validateMinMax(samplePeriodInput, 4, 12);

	if(inputExists && inputIsInRange){
		samplePeriodMsg.innerHTML = "";
		toggleDisableButton("add", false);
		addBasicConfiguration();
		makeAPICall();
		
		//	allow data to be fetched from API before it is displayed in result table
		let time = 2000 + (requestStrings.length * 500);
		window.setTimeout(function(){
			calculatedResult.length = 0;
			resultData.forEach(calculateResult);
			displayResult();
		}, time);
	} else {
		if(!inputExists){
			samplePeriodMsg.innerHTML = "Please enter a number of weeks";
		} else if(!inputIsInRange){
			samplePeriodMsg.innerHTML = "Enter a number of weeks, if you use a value less than 4 it probably will be misleading. 12 weeks is maximum.";	
		}
		//	disable add button if input is invalid
		toggleDisableButton("add", true);
	}
});

samplingLevelInput.addEventListener("input", function(){
		toggleDisableButton("add", false);
		addBasicConfiguration();
		makeAPICall();

		//	allow data to be fetched from API before it is displayed in result table
		let time = 2000 + (requestStrings.length * 500);
		window.setTimeout(function(){
			calculatedResult.length = 0;
			resultData.forEach(calculateResult);
			displayResult();
		}, time);
});

//	NOTE: validation of this input element is not necessary since input is of type range - but validation is still
// made in case input type is changed to number
experimentLengthInput.addEventListener("input", function (){
	let inputExists = validateNoEmptyInput(experimentLengthInput);
	let inputIsInRange = validateMinMax(experimentLengthInput, 2, 1000);

	if(inputExists && inputIsInRange){
		toggleDisableButton("add", false);
		
		//	make sure no error message is displayed
		experimentLengthMsg.innerHTML = "";
		
		//	update basic configuration and re-calculate results
		addBasicConfiguration();
		calculateButton();
	} else {
		if(!inputExists){
			experimentLengthMsg.innerHTML = "Please enter a number of weeks. Shorter periods than 2 weeks is not recommended";
		} else if(!inputIsInRange){
			experimentLengthMsg.innerHTML = "Experiments are seldom valid if they run shorter than 2 weeks. Please enter a number greater than or equal to 2.";	
		}
		//	disable add button if input is invalid
		toggleDisableButton("add", true);
	}
});

//	NOTE: validation of this input element is not necessary since input is of type range - but validation is still
// made in case input type is changed to number
variationsInput.addEventListener("input", function(){
	let inputExists = validateNoEmptyInput(variationsInput);
	let inputIsInRange = validateMinMax(variationsInput, 2, 100);

	if(inputExists && inputIsInRange){
		//	make sure no error message is displayed
		variationsMsg.innerHTML = "";
		toggleDisableButton("add", false);

		//	update basic configuration and re-calculate results
		addBasicConfiguration();
		calculateButton();
	} else {
		if(!inputExists){
			variationsMsg.innerHTML = "Please enter the number of variations in your experiment including the original/control.";
		} else if(!inputIsInRange){
			variationsMsg.innerHTML = "You can't run an experiment with less than two variations. Please enter a number greater than or equal to 2.";
		}
		//	disable add button if input is invalid
		toggleDisableButton("add", true);
		}
});

//	BUTTON FUNCTIONS

//	Function to add behaviour to add-button. Can also be called without click on add-button, then without event or event as null
function addButton(evt){
	if(evt){
		evt.preventDefault();
	}
	//	disable calculate and customize buttons while data is being fetched
	toggleDisableButton("calculate", true);
	toggleDisableButton("customize", true);
	addBasicConfiguration();
	pushPagePath();
	createRequestStrings();
	makeAPICall(evt);

	//	timeout function to delay possibility for user to calculate result on data before it has been fetched from the API
	window.setTimeout(function(){
			if(!errors){
				appendConfTableRow(pagePaths[pagePaths.length - 1]);
				toggleDisableButton("calculate", false);
				toggleDisableButton("customize", false);

			if(configurationTable.classList.contains("hidden")){
				removeCssClass( configurationTable, "hidden");
			}
				removeCssClass(funnelMsg, "error");
				funnelMsg.innerHTML = "Please enter a page path as a regular expression. Action and conversion goals needs to be configured accordning to <a href=\"https://developers.google.com/analytics/devguides/reporting/core/dimsmets#segments=true&cats=custom_variables_or_columns,ecommerce,page_tracking\" target=\"_blank\">Googles core reporting API</a>.";
				addCssClass(resultSection, "hidden");
			} else {
				deletePagePath(null, (pagePaths.length - 1));
				//errors = false; 
			}
		}, 3000);
	}

//	function to add behavior to calculate-button. Can also be called without click on calculate-button, then without event or event as null
function calculateButton(evt){
	if(evt){
		evt.preventDefault();
	}
	calculatedOnce = true;
	
	//	clear calculatedResult-array from old elements
	calculatedResult.length = 0;
	resultData.forEach(function(element){
		calculateResult(element);
	 });
	
	// Hide page conf-section if it is displayed and calculateButton is called from button
	if(evt){
		if(pageConfigurationSection.classList.contains("in")){
			removeCssClass(pageConfigurationSection, "in");	
		}
	}
	displayResult();
}

//	function to add behavior to customize-button. Can also be called without click on customize-button, then without event or event as null
function customizeButton (evt){
	if(evt){
		evt.preventDefault();
	}

	//	delete the predefined funnel and the data already fetched for it if it exists and 
	// user has not made any calculations on it
	if(document.getElementById(`trPagePathRow0`) && calculatedOnce === false){
		deletePagePath(null, 0);
	}
}

// CONFIGURATION FUNCTIONS

//	Function for adding basic configuration to conf-array
function addBasicConfiguration () {
	let inputElements1 = basicConfigurationForm1.elements;
	let inputElements2 = basicConfigurationForm2.elements;
	let inputElements = [...inputElements1, ...inputElements2];
	for(let i = 0; i < inputElements.length; i++){
		Object.assign(basicConfiguration, { [inputElements[i].name] : inputElements[i].value});
	}
}

//	Function for appending page configuration to table, called by addButton-function
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
	deleteBtn.setAttribute("class", "btn btn-default btn-xs");
	deleteBtn.addEventListener("click", deletePagePath);

	let btnTd = document.createElement("td");
	btnTd.appendChild(deleteBtn);
	tr.appendChild(btnTd);

	// append complete table row to table
	configurationTable.getElementsByTagName("tbody")[0].appendChild(tr);

	// if buttons are hidden, display them
	if(buttonSection.classList.contains("hidden") === true){
		toggleCssClass(buttonSection, "hidden");
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
		//	add new object to resultData array for future storage of result, add rowId for identification
		resultData.push({rowId});
		rowId++;

		pagePaths.push(newPagePath);
}

// function to delete page path from various arrays. id only provided if not called from delete button
function deletePagePath(evt, id){
	if(evt){
		evt.preventDefault();		
	}

	// if evt, rowId is fetched from delete button id, otherwise passed to function
	let deleteId = evt ? parseInt(this.id) : id;
	
	//	delete row in pagePaths
	let pagePathsIndex = findObjectInArray(pagePaths, "rowId", deleteId );
	pagePaths.splice(pagePathsIndex, 1);

	//	delete row in requestStrings
	let requestStringsIndex = findObjectInArray(requestStrings, "rowId", deleteId );
	requestStrings.splice(requestStringsIndex, 1);

	// 	if called from delete button or if calculated once is false, and table row exists, delete it
	if(evt || !calculatedOnce){
	let tableRow = document.getElementById(`trPagePathRow${deleteId }`);
	if(tableRow){
		tableRow.parentElement.removeChild(tableRow);
		}
	}
	
	//	if row exists, delete row in resultData
	if(evt){	
		let resultDataIndex = findObjectInArray(resultData, "rowId", deleteId);
		let resultDataRow = resultData[resultDataIndex];
		if(resultDataRow){
			resultData.splice(resultDataIndex, 1);		
		}	
	} else {
		// solution for deleting result data row when not called from event
		let resultDataIndex = findObjectInArray(resultData, "rowId", (rowId - 1));
		let resultDataRow = resultData[resultDataIndex];
		if(resultDataRow){
			resultData.splice(resultDataIndex, 1);		
		}
	}
	
	//	if all page paths are deleted, hide pagesToTestSection and resultSection, disable calculate button.
	//	or if user deletes funnel but hasn't calculated anything yet, do not calculate results
	//	else, recalculate results
	if(pagePaths.length === 0 ){
		if(!configurationTable.classList.contains("hidden")){
			addCssClass( configurationTable, "hidden");
		}
		if(!resultSection.classList.contains("hidden")){
			addCssClass( resultSection, "hidden" );
		}
		toggleDisableButton("calculate", true);
		} else if (calculatedOnce){
		calculateButton();
	}

	//	if no event, reset errors.error after paths have been deleted
	if(!evt){
		errors = false;
	}
}

// AUTHORIZATION

// Function for handling the authorization flow. Called from authorize-button
function authorize(evt) {
	evt.preventDefault();
	// `immediate` should be false when invoked from the button click.
	let useImmediate = evt ? false : true;
	let authData = {
	  client_id: CLIENT_ID,
	  scope: SCOPE,
	  immediate: useImmediate
	};

	gapi.client.load('analytics', 'v3').then(function(){
		gapi.auth.authorize(authData, function(response) {
	//	if user denies the permission of the app to read Google Analytics data, display 'Authorize'-button so that user can authorize later on if wished
		if (response.error) {
		    removeCssClass(authBtn, "hidden");
			addCssClass(logoutBtn, "hidden");
		} else {
			gaViewIdInput.disabled = true;
			toggleCssClass(authBtn, "hidden");
			toggleCssClass(logoutBtn, "hidden");
			Object.assign(basicConfiguration, {"gaViewId" : gaViewIdInput.value});

		    //	make initial request
		    addButton();
		  	}
		});
	});
}


// FUNCTIONS FOR CREATING REQUEST STRINGS, MAKING API CALLS & SAVING RESPONSE FROM API

//	Function for creating API request strings. 
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


//	Function for sending request to Core reporting API when user is authourized. Can also be called without click on authorize or add button, then without event or event as null
function makeAPICall (evt) {
	//	if called from add or authorize button, only make API call on last added element in request strings array
	if(evt){
	requestStrings[requestStrings.length - 1].forEach(function(element){
			queryCoreReportingApi(element);
		});

	//	if called from configuration table on change, make API call on all elements in request strings.
	} else {
		requestStrings.forEach(function(element){
			element.forEach(function(childElement){
				queryCoreReportingApi(childElement);
			});
		});

	}
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
    'max-results' : 10000 	//	https://developers.google.com/analytics/devguides/reporting/core/v3/reference#maxResults 
  })
  .then(function(response) {
  	//	Add name of account to top of page
	accountParagraph.innerHTML = `Account name: ${response.result.profileInfo.profileName}`;
    saveResult(response.result, element.rowId, element.type, element.pagePath, element.actionGoal, element.conversionGoal);
  })
  .then(null, function(err) {
  		errors = true;
  		if(err.status === 400){
  			window.scrollTo(pageConfigurationSection.offsetLeft,pageConfigurationSection.offsetTop);
  			addCssClass(funnelMsg, "error");
  			funnelMsg.innerHTML = "Either your page path or one of your goals is incorrectly set up. Please make sure the page path is written as a regular expression and your goals are configured accordning to <a href=\"https://developers.google.com/analytics/devguides/reporting/core/dimsmets#segments=true&cats=custom_variables_or_columns,ecommerce,page_tracking\" target=\"_blank\">Googles core reporting API</a>.";
  		} else if (err.status === 403){
  			if(err.result.error.errors[0].reason === "insufficientPermissions"){
  				gaViewIdInput.focus();
  				gaViewIdMsg.innerHTML = "Seems like you don't have permissions to view data for this Google Analytics View Id. Did you type in the correct one?";
  			} else {
  				window.scrollTo(pageConfigurationSection.offsetLeft,pageConfigurationSection.offsetTop);
  				addCssClass(funnelMsg, "error");
  				funnelMsg.innerHTML = "The API call limit has been exceeded - please remove some of your funnels and try again.";

  			//	TO DO: HANDLE THIS KIND OF ERROR in relevant way. 
  			}
  		} else if (err.status === 500 || err.status === 503){
  			//	500/503 error = Unexpected internal server error/server returned an error
  			//	Query should not be retried - reload app ---> QUICK FIX. 
  			//	TO DO: handle with expontential back off, see:
  			//	https://developers.google.com/analytics/devguides/reporting/core/v3/errors#handling_500_or_503_responses
  			document.body.innerHTML = "An unexpected error occured. App will reload";
  			window.location.reload(true);
  		}
      return errors;
    });
  return errors;
}

//	Function for saving relevant data for calculation from API-response
function saveResult(result, rowId, type, pagePath, actionGoal, conversionGoal){
	let index = findObjectInArray(resultData, "rowId", rowId);
	let resultObject = resultData[index];

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

//	FUNCTIONS FOR CALCULATING RESULTS ON FETCHED DATA AND SAVING CALCULATED RESULTS

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
	
	//	add new object to calculatedResult array for future storage of result if not already present
	if(!calculatedResult[rowId]){
		calculatedResult.push({rowId});
	}

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

function saveCalculatedResult(pagePath, actionGoal, conversionGoal, rowId, calculatedValues){
	let index = findObjectInArray(calculatedResult, "rowId", rowId);
	let resultObject = calculatedResult[index];
	
	let actionGoalUsers = calculatedValues.actionGoalUsers ;
	let actionCTR = calculatedValues.actionCTR;
	let actionGoalMDU = calculatedValues.actionGoalMDU;
	let bounceRate = calculatedValues.bounceRate;
	let conversionGoalUsers = calculatedValues.conversionGoalUsers;
	let conversionRate = calculatedValues.CR;
	let conversionGoalMinDetectUplift = calculatedValues.conversionGoalMDU;
	let engagementGoalUsers = calculatedValues.engagementGoalUsers;
	let engagementGoalMDU = calculatedValues.engagementGoalMDU;
	
	Object.assign(resultObject, { 
		pagePath,
		actionGoal,
		conversionGoal,
		rowId,
		bounceRate,
		engagementGoalUsers,
		engagementGoalMDU,
		actionCTR,
		actionGoalMDU,
		conversionRate,
		conversionGoalMinDetectUplift
	});
}

function engagementGoalMinDetectUplift(noOfVariations, engagementRateShare, engagementGoalUsers, samplePeriod, maxExperimentLength){
	let engagementGoalMinDetectUplift = Math.sqrt(26*noOfVariations*(1-engagementRateShare)/engagementRateShare/((engagementGoalUsers/samplePeriod)*maxExperimentLength));
	engagementGoalMinDetectUplift = canABTest(engagementGoalMinDetectUplift);
	return engagementGoalMinDetectUplift;
}
	
function actionGoalClickThroughRate(actionGoalUsers, engagementGoalUsers){
	let actionGoalClickThroughRate = 100 *(actionGoalUsers/engagementGoalUsers);
	return actionGoalClickThroughRate;
}

function actionGoalMinDetectUplift(noOfVariations, actionGoalClickThroughRate, engagementGoalUsers, samplePeriod, maxExperimentLength){
	let actionGoalMinDetectUplift = Math.sqrt(26*noOfVariations*(1-(actionGoalClickThroughRate/100))/(actionGoalClickThroughRate/100)/((engagementGoalUsers/samplePeriod)*maxExperimentLength));
	actionGoalMinDetectUplift = canABTest(actionGoalMinDetectUplift);
	return actionGoalMinDetectUplift;
}

function conversionRate(conversionGoalUsers, engagementGoalUsers){
	let conversionRate = 100 * (conversionGoalUsers/engagementGoalUsers);
	return conversionRate;
}

function conversionGoalMinDetectUplift(noOfVariations, conversionRate, engagementGoalUsers, samplePeriod, maxExperimentLength){
	let conversionGoalMinDetectUplift = Math.sqrt(26*noOfVariations*(1-(conversionRate/100))/(conversionRate/100)/((engagementGoalUsers/samplePeriod)*maxExperimentLength));
	conversionGoalMinDetectUplift = canABTest(conversionGoalMinDetectUplift);
	return conversionGoalMinDetectUplift;
}

function canABTest (mdu){
	if(mdu < 0.09999){
		mdu = "<span class=\"glyphicon glyphicon-thumbs-up yes\" aria-hidden=\"true\"></span><span class=\"hidden\">Yes</span>";
	} else if (mdu < 0.19999) {
		mdu = "<span class=\"glyphicon glyphicon-question-sign maybe\" aria-hidden=\"true\"></span><span class=\"hidden\">Maybe</span>";
	} else {
		mdu = "<span class=\"glyphicon glyphicon-thumbs-down no\" aria-hidden=\"true\"></span><span class=\"hidden\">No</span>";
	}
	return mdu;
}

//	FUNCTION FOR DISPLAYING RESULT

function displayResult(){
//	hide section while table is constructed
toggleCssClass(resultSection, "hidden");
expLengthSpan.innerHTML = basicConfiguration.experimentLength;
variationsSpan.innerHTML = basicConfiguration.variations;

//	clear table of old results
	let tableRows = resultTable.getElementsByTagName("tr");
	let length = tableRows.length;

	//	2 first elements should always remain; contains headers
	if(length > 2){
		for(let i = length - 1 ; i > 1; i--){
		resultTable.getElementsByTagName("tbody")[0].removeChild(tableRows[i]);
		}
	}
	
	//	only calculate values and display table if there is any results to make calculations on...
	if(calculatedResult.length > 0){
		calculatedResult.forEach(appendResultTableRow);
		removeCssClass(resultSection, "hidden");
	}
}

function appendResultTableRow(element){
	let tr = document.createElement("tr");
	tr.setAttribute("id", `trResultRow${element.rowId}`);

		for(let i = 0; i < 10; i++){
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
		    td.setAttribute("class", "text-center");
		    td.innerHTML = element.engagementGoalMDU;
		    break;
		  case 4:
		    td.innerHTML = element.actionGoal;
		    break;
		  case 5:
		  	let ACTR = parseInt(element.actionCTR);
		  	td.setAttribute("class", "text-center");
		  	if(isNaN(ACTR)){
		  		td.innerHTML = "N/A";
		  	} else {
		  		td.innerHTML = `${ACTR.toFixed(1)}%`;	
		  	}
		    break;
		  case 6:
		  	let AGMDU = parseInt(element.actionGoalMDU);
			td.innerHTML = element.actionGoalMDU;
		    break;
		  case 7:
		  	td.innerHTML = element.conversionGoal;
		    break;
		  case 8:
		  	let CR = parseInt(element.conversionRate);
		  	td.setAttribute("class", "text-center");
		  	if(isNaN(CR)){
		  		td.innerHTML = "N/A";
		  	} else {		  		
		  		td.innerHTML = `${CR.toFixed(1)}%`;
		  	}
		    break;
		  case 9:
		  	let CGMDU = parseInt(element.conversionGoalMinDetectUplift);
		  	td.innerHTML = element.conversionGoalMinDetectUplift;
		    break;
		  default:
		    td.innerHTML = "nothing yet";
		}

		tr.appendChild(td);
		resultTable.getElementsByTagName("tbody")[0].appendChild(tr);
		}
}

