/*jshint esversion: 6 */
require('bootstrap-loader');
require ('bootstrap-sass');
require('./../css/styles.scss');
import $ from "jquery";

// global variables
let basicConfiguration = {};
let pagePaths = [];
let requestStrings = [];
let errors = false;
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
let pageConfigurationSection = document.getElementById("pagesConfiguration");
let pageConfigurationForm = document.getElementById("pageConfigurationForm");
let basicConfigurationSection = document.getElementById("configuration");
let basicConfigurationForm = document.getElementById("basicConfigurationForm");
let configurationTable = document.getElementById("pageConfigurationTable");
let configurationTableSection = document.getElementById("pagesToTest");
let authBtn = document.getElementById("authButton");
let logoutBtn = document.getElementById("logout");
let customizeBtn = document.getElementById("customize");
let configurationBtn = document.getElementById("configure");

let resultTable = document.getElementById("resultTable");
let pagesToTestSection = document.getElementById("pagesToTest");
let resultSection = document.getElementById("result");
let buttonSection = document.getElementById("buttons");

// input elements
let samplePeriodInput = document.getElementById("samplePeriod");
let experimentLengthInput = document.getElementById("experimentLength");
let variationsInput = document.getElementById("variations");
let gaViewIdInput = document.getElementById("gaViewId");
let pagePathInput = document.getElementById("pagePath");
let actionGoalInput = document.getElementById("actionGoal");
let conversionGoalInput = document.getElementById("conversionGoal");

//	input element msg spans
let samplePeriodMsg = document.getElementById("samplePeriodMsg");
let experimentLengthMsg = document.getElementById("experimentLengthMsg");
let variationsMsg = document.getElementById("variationsMsg");
let gaViewIdMsg = document.getElementById("gaViewIdMsg");
let pagePathMsg = document.getElementById("pagePathMsg");
let actionGoalMsg = document.getElementById("actionGoalMsg");
let conversionGoalMsg = document.getElementById("conversionGoalMsg");

//	Event listeners buttons
addTableRowBtn.addEventListener("click", addButton);
calculateBtn.addEventListener("click", calculateButton);
authBtn.addEventListener("click", authorize);
customizeBtn.addEventListener("click", customizeButton);
//	Temporary fix for "logout"-functionality so the user can change GA view ID
logoutBtn.addEventListener("click", function(){
	window.location.reload(true);
});
configurationBtn.addEventListener("click", function(){
	toggleCssClass(basicConfigurationSection, "hidden");
});

//	GA view id input event listener
gaViewIdInput.addEventListener("input", function(){
	let inputExists = validateNoEmptyInput(gaViewIdInput);
	if(inputExists){
		removeCssClass(gaViewIdInput, "incorrectInput");
		toggleDisableButton("authButton", false);
		toggleDisableButton("add", false);
		gaViewIdMsg.innerHTML = "Success";
	} else {
		gaViewIdMsg.innerHTML = "Please enter your Google Analytics View ID. You find it in Google Analytics --> Admin --> View --> View Settings --> View ID";
		addCssClass(gaViewIdInput, "incorrectInput");
		toggleDisableButton("add", true);
		}
});

//	Funnel input event listeners
pagePathInput.addEventListener("change", function(){
	let inputExists = validateNoEmptyInput(pagePathInput);
	if(inputExists){
		toggleDisableButton("add", false);
		pagePathMsg.innerHTML = "Success";
		} else {
		pagePathMsg.innerHTML = "Please enter a page path in Regex";
		toggleDisableButton("add", true);
	}
});

actionGoalInput.addEventListener("input", function(){
	let inputExists = validateNoEmptyInput(actionGoalInput);
	if(inputExists){
		toggleDisableButton("add", false);
		actionGoalMsg.innerHTML = "Success";
	} else {
		actionGoalMsg.innerHTML = "Please enter an action goal in Regex";
		toggleDisableButton("add", true);
	}
});

conversionGoalInput.addEventListener("input", function(){
	let inputExists = validateNoEmptyInput(conversionGoalInput);
	if(inputExists){
		conversionGoalMsg.innerHTML = "Success";
		toggleDisableButton("add", false);
		} else {
		conversionGoalMsg.innerHTML = "Please enter a conversion goal in Regex";
		toggleDisableButton("add", true);
	}
});

//	Configuration parameters input listeners
samplePeriodInput.addEventListener("input", function(){
	let inputExists = validateNoEmptyInput(samplePeriodInput);
	let inputIsInRange = validateMinMax(samplePeriodInput, 4, 12);
	if(inputExists && inputIsInRange){
		samplePeriodMsg.innerHTML = "Success";
		toggleDisableButton("add", false);
		addBasicConfiguration();
		makeAPICall();
		//	allow data to be fetched from API before it is displayed in result table
		let time = 2000 + (requestStrings.length * 500);
		window.setTimeout(function(){
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

experimentLengthInput.addEventListener("input", function (){
	let inputExists = validateNoEmptyInput(experimentLengthInput);
	let inputIsInRange = validateMinMax(experimentLengthInput, 2, 1000);
	if(inputExists && inputIsInRange){
		toggleDisableButton("add", false);
		experimentLengthMsg.innerHTML = "Success";

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

variationsInput.addEventListener("input", function(){
	let inputExists = validateNoEmptyInput(variationsInput);
	let inputIsInRange = validateMinMax(variationsInput, 2, 100);
	if(inputExists && inputIsInRange){
		toggleDisableButton("add", false);
		variationsMsg.innerHTML = "Success";

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

//	Button functions
function customizeButton (evt){
	if(evt){
		evt.preventDefault();
	}

	//	delete the predefined funnel and the data already fetched for it if it exists
	if(document.getElementById(`trPagePathRow0`)){
		deletePagePath(null, 0);
	}
	toggleCssClass(pagesConfiguration, "hidden");
}

//	function to add behaviour to add-button
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
			} else {
				console.log('error path', pagePaths[pagePaths.length - 1]);
				deletePagePath(null, pagePaths[pagePaths.length - 1]);
				errors = false; 
			}
		}, 3000);	
	}

//	function to add behavior to calculate-button
function calculateButton(evt){
	if(evt){
		evt.preventDefault();
	}

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
	if(shouldDisable){
		button.setAttribute("disabled", "disabled");
	} else {
		button.removeAttribute("disabled");
	}
}

//	Function to toggle css-class; pass in element and css-class as arguments
function toggleCssClass(element, className){
	let elementClasses = element.classList;
	elementClasses.toggle(className);
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

//	Function for adding basic configuratíon to conf-array
function addBasicConfiguration () {
	let inputElements = basicConfigurationForm.elements;
	for(let i = 0; i < inputElements.length; i++){
		Object.assign(basicConfiguration, { [inputElements[i].name] : inputElements[i].value});
	}
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
		//	add new object to resultData array for future storage of result
		resultData.push({rowId});
		rowId++;
		//	push newPagePath to pagePaths array
		pagePaths.push(newPagePath);
}

// function to delete page path from various arrays. rowId only provided if not called from delete button
function deletePagePath(evt, id){
	if(evt){
		evt.preventDefault();		
	}

	// if evt, rowId is fetched from delete button id, otherwise passed to function
	let rowId = evt ? parseInt(this.id) : id;
	
	//	delete row in pagePaths
	let pagePathsIndex = findObjectInArray(pagePaths, "rowId", rowId);
	pagePaths.splice(pagePathsIndex, 1);

	//	delete row in requestStrings
	let requestStringsIndex = findObjectInArray(requestStrings, "rowId", rowId);
	requestStrings.splice(requestStringsIndex, 1);

	// 	if called from delete button, delete table row and result data
	//if(evt){
		let tableRow = document.getElementById(`trPagePathRow${rowId}`);
		tableRow.parentElement.removeChild(tableRow);

		//	delete row in resultData
		let resultDataIndex = findObjectInArray(resultData, "rowId", rowId);
		resultData.splice(resultDataIndex, 1);
	//}

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

// Handles the authorization flow.
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
		    authBtn.hidden = false;
		} else {
			gaViewIdInput.disabled = true;
			authBtn.hidden = true;
			logoutBtn.hidden = false;
			Object.assign(basicConfiguration, {"gaViewId" : gaViewIdInput.value});
		    //	make initial request
		    addButton();
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
function makeAPICall (evt) {
	//	if called from add-button, only make API call on last added element in request strings array
	if(evt){
	requestStrings[requestStrings.length - 1].forEach(function(element){
			queryCoreReportingApi(element);
		});
	} else {
		//	if called from configuration table on change, make API call on all elements in request strings. Timeout function to prevent exceeding API call limit per second
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
    'max-results' : 10000 //	https://developers.google.com/analytics/devguides/reporting/core/v3/reference#maxResults 
  })
  .then(function(response) {
    saveResult(response.result, element.rowId, element.type, element.pagePath, element.actionGoal, element.conversionGoal);
  })
  .then(null, function(err) {
  		errors = true;
  		if(err.status === 400){
  			console.log('400 error');
  		} else if (err.status === 403){
  			if(err.result.error.errors[0].reason === "insufficientPermissions"){
  				gaViewIdInput.focus();
  				toggleCssClass(gaViewIdInput, "incorrectInput");
  				gaViewIdMsg.innerHTML = "Seems like you don't have permissions to view data for this Google Analytics View Id. Did you type in the correct one?";
  			} else {

  			}
  		} else {
  			console.log('500/503 error');
  		}
      // Log any errors
      //console.log(err);
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
		removeCssClass(resultSection, "hidden");
	}
}

function appendResultTableRow(element){
	let tr = document.createElement("tr");
	tr.setAttribute("id", `trResultRow${element.rowId}`);

	//if (!document.getElementById(`trResultRow${element.rowId}`)) {
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
		  	let ACTR = parseInt(element.actionCTR);
		  	td.innerHTML = `${ACTR.toFixed(1)}%`;
		    break;
		  case 7:
		  	let AGMDU = parseInt(element.actionGoalMDU);
		  	td.innerHTML = `${AGMDU.toFixed(1)}%`;
		    break;
		  case 8:
		  	td.innerHTML = element.conversionGoal;
		    break;
		  case 9:
		  	td.innerHTML = element.conversionGoalUsers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
		    break;
		  case 10:
		  	let CR = parseInt(element.conversionRate);
		  	td.innerHTML = `${CR.toFixed(1)}%`;
		    break;
		  case 11:
		  	let CGMDU = parseInt(element.conversionGoalMinDetectUplift);
		  	td.innerHTML = `${CGMDU.toFixed(1)}%`;
		    break;
		  default:
		    td.innerHTML = "nothing yet";
		}

		tr.appendChild(td);
		resultTable.getElementsByTagName("tbody")[0].appendChild(tr);
		}
	//}
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

//	Function for validating number input
function validateMinMax(inputElement, min, max){
	let pass;
	if(inputElement.value >= min && inputElement.value <= max){
		pass = true;
	} else {
		pass = false;
		}
	return pass;
}
