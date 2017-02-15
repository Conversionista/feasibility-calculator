/*jshint esversion: 6 */
require('./../css/styles.scss');

// global variables
let pagePaths = [];

//	fetch DOM nodes
let addTableRowBtn = document.getElementById("add");
let pageConfigurationForm = document.getElementById("pageConfigurationForm");
let configurationTable = document.getElementById("pageConfigurationTable");
let configurationTableSection = document.getElementById("pagesToTest");

//	add event listeners
addTableRowBtn.addEventListener("click", appendTableRow);
addTableRowBtn.addEventListener("click", pushPagePath);

// Function to enable/disable button
function toggleDisableButton (buttonId, shouldDisable) {
	// fetch button via DOM
	let button = document.getElementById(buttonId);
	
	// toggle disabled property
	shouldDisable === true ? button.setAttribute("disabled", "disabled") : button.removeAttribute("disabled");
}

// Function to validate input
function validateInput (input, type, buttonId, minLength, maxLength, expectedLength) {
	//	pass input to suitable validateInput function depending on type
	
	// use return value to disable/enable button and add css-classes	
		// toggleDisableButton(buttonId, passValidation);
		//	call css-class-setting function with passValidation-parameter	
}

//	Function for validating number input. 
// req args: input, buttonId, minLength
// optional args: expectedLength, maxLength

// SKRIV OM så att funktionen kollar om det är ett nummer, och därefter kallar på funktion för att kolla max/min längd eller expected. Men hur?
// default parameters? https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters

function validateNumberInput (input, buttonId, minLength, maxLength, expectedLength) {
		let passValidation;
		let containsNaN = false;
		let isNumber = Number(input);
		let inputArray = Array.from(input, x => parseInt(x));
		console.log(inputArray);
		
		//check if array contains NaN
		inputArray.forEach((element) => isNaN(element) ? containsNaN = true : containsNaN);
		
		if(!containsNaN){
			let arrayLength = inputArray.length;
		
			if(arrayLength >= minLength){
				passValidation = true;

				//continue here....

			} else {
				passValidation = false;
			}

		console.log('containsNaN?', containsNaN);
		console.log('passValidation?', passValidation);
		
		}
		return passValidation;
}

//	Function to toggle css-class; pass in element and css-class as arguments
function toggleCssClass(element, className){
	let elementClasses = element.classList;
	elementClasses.toggle(className);
}

//	Function for appending page configuration to table by #add-button
//	ADD DELETEBUTTON FOR EACH ROW
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

//	Function for adding page configuration to conf-array
function pushPagePath(evt, tableInput){
	evt.preventDefault();
	let inputElements = pageConfigurationForm.elements;
	let newPagePath = {
		pagePath : inputElements[0].value,
		engagementGoal : inputElements[1].value,
		conversionGoal : inputElements[2].value
	};
	pagePaths.push(newPagePath);
	console.log(pagePaths);
}

//	Function for deleting row in table

//	Function for splicing deleted table-row-object from conf array

//	Function to validate that user at least puts in one page path?

//	Function to regEx input?
//	Function for creating API request string

//	Function for sending request to Core reporting API via #calculate-button
	//	delay of 0.1s per API call to avoid reaching call limit per second

//	Function for handling API-response

//	Function for calculating result

//	Function for displaying result

//	Function for fetching today's date

//	?? Function for saving data in local storage