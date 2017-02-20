/*jshint esversion: 6 */
require('./../css/styles.scss');

// global variables
var basicConfiguration = [];
var pagePaths = [];

//	fetch DOM nodes
let addTableRowBtn = document.getElementById("add");
let calculateButton = document.getElementById("calculate");
let pageConfigurationForm = document.getElementById("pageConfigurationForm");
let basicConfigurationForm = document.getElementById("basicConfigurationForm");
let configurationTable = document.getElementById("pageConfigurationTable");
let configurationTableSection = document.getElementById("pagesToTest");

//	add event listeners
addTableRowBtn.addEventListener("click", appendTableRow);
addTableRowBtn.addEventListener("click", pushPagePath);
calculateButton.addEventListener("click", addBasicConfiguration);

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
}

//	Function for appending page configuration to table by #add-button
//	todo: ADD DELETE BUTTON FOR EACH ROW
function appendTableRow(evt, tableInput) {
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
	pagePath : inputElements[0].value,
	engagementGoal : inputElements[1].value,
	conversionGoal : inputElements[2].value
};
	pagePaths.push(newPagePath);
}

// 	Function to validate input

//	Function for validating number input

//	Function for deleting row in table

//	Function for splicing deleted table-row-object from conf array

//	Function to validate that user at least puts in one page path?

//	Function for fetching today's date

//	Function for saving data in local storage

//	?? Function to regEx input ?? 

//	Function for creating API request string

//	Function for sending request to Core reporting API via #calculate-button
	//	delay of 0.1s per API call to avoid reaching call limit per second

//	Function for handling API-response

//	Function for calculating result

//	Function for displaying result
