// Script (C) 2012 by Mark Rosenfelder.
// You can modify the code for non-commercial use; 
// attribution would be nice.
// If you want to make money off it, please contact me.

var NLEX  = 150;
var NSENT = 30;
var s;
var ss;

var punc = ".?!";

var cat;
var ncat;
var syl;
var nsyl;
var catindex = "";
var badcats;

var monosyl = 0.0;
var dropoff = 50;

var rew;
var nrew;

var showsyl = 0;
var slowsyl = 0;
var syldrop = 50;

var defN = 0;

function find(s, ch)
{
     for (var i = 0; i < s.length; i++) { 
         if (s.charAt(i) == ch) { return i; } 
     } 
     return -1; 
}

function readStuff() 
{
	var theform = document.theform;

	// Parse the category list
	cat = theform.cats.value.split("\n");
	ncat = cat.length;
	badcats = false;

	// Make sure cats have structure like V=aeiou
	catindex = "";
	var w;
	for (w = 0; w < ncat; w++) {
		// A final empty cat can be ignored
		thiscat = cat[w];
		if (thiscat.charCodeAt(thiscat.length - 1) == 13) {
			thiscat = thiscat.substr(0, thiscat .length - 1);
			cat[w] = thiscat;
		}
		if (thiscat.length == 0 && w == ncat - 1) {
			ncat--;
		} else if (thiscat.length < 3) {
			badcats = true;
		} else {
			if (find(thiscat , "=") == -1) {
				badcats = true;
			} else {	
				catindex += thiscat.charAt(0);
			}
		}
	}

	// Parse the syllable list
	syl = theform.syls.value.split("\n");
	nsyl = syl.length;

	for (w = 0; w < nsyl; w++) {
		var t = syl[w];
		if (t.charCodeAt(t.length - 1) == 13) {
			syl[w] = t.substr(0, t.length - 1);
		}
	}
}

// A random percentage
function randpct() 
{
	var r = Math.floor(Math.random()*101);
	return r;
}

// Apply rewrite rules
function rewriterules() {
	var w;
	for (w = 0; w < nrew; w++) {
		if (rew[w].length > 2 && find(rew[w], "|") != -1) {
			var parse = rew[w].split("|");
			// for case insensitivity change to "gi"
			var regex = new RegExp(parse[0], "g");
			s = s.replace(regex, parse[1]);
		}
	}
}

// Apply rewrite rules on just one string 
function rewriterulesStr(s) {

	var w;
	for (w = 0; w < nrew; w++) {
		if (rew[w].length > 2 && find(rew[w], "|") != -1) {
			var parse = rew[w].split("|");
			// for case insensitivity change to "gi"
			var regex = new RegExp(parse[0], "g");
			s = s.replace(regex, parse[1]);
		}
	}

	return s;
}

// Cheap iterative implementation of a power law:
// our chances of staying at a bin are pct %.
function PowerLaw(max, pct) {

	var r;
	for (r = 0; true; r = (r+1) % max) {
		if (randpct() < pct) 
			return r;
	}
	return 0;
}


// Similar, but there's a peak at mode.
function PeakedPowerLaw(max, mode, pct)
{
	if (Math.random() > 0.5) {
		// going upward from mode
		return mode + PowerLaw(max - mode, pct);
	} else {
		// going downward from mode
		return mode - PowerLaw(mode + 1, pct);
	}
}

// Output a single syllable - this is the guts of the program 
function Syllable()
{
	// Choose the pattern
	var r = PowerLaw(nsyl, syldrop);
	var pattern = syl[r];

	// For each letter in the pattern, find the category
	var c;
	for (c = 0; c < pattern.length; c++) {
		var theCat = pattern.charAt(c);
		// Go find it in the categories list
		var ix = find(catindex, theCat);
		if (ix == -1) {
			// Not found: output syllable directly
			s += theCat;
		} else {
			// Choose from this category
			var expansion = cat[ix].substr(2);
			var r2;
			
			if (dropoff == 0) {
				r2 = Math.random() * expansion.length;
			} else {
				r2 = PowerLaw(expansion.length, dropoff);
			}

			var ch = expansion.charAt(r2);
			s += ch;
		}
	} 
}


// Output a single word
function Word(capitalize)
{
	s = "";

	var nw = 1;
	if (monosyl > 0.0) 
		if (Math.random() > monosyl) 
			nw += 1 + PowerLaw(4, 50);
	var w;
	for (w = 0; w < nw ; w++) {
		Syllable();
		if (showsyl && w < nw - 1) s += "˙";
	}

	rewriterules();

	if (capitalize) s= s.charAt(0).toUpperCase() + s.substring(1);

	ss += s;
}

// Output a pseudo-text
function CreateText()
{
	var sent, w;
	var r;
	var nWord;
	for (sent = 0; sent < NSENT; sent++) {
		nWord = 1 + PeakedPowerLaw(15, 5, 50); 
		for (w = 0; w < nWord; w++) {

			Word(w == 0);

			if (w == nWord - 1) {
				ss += punc.charAt(PowerLaw(punc.length, 75)); 
			}
			ss += " ";
		}
	}
}

// Create a list of NLEX words
function CreateLex()
{
	var w;
	ss += "<table>";
	for (w = 0; w < NLEX; w++) {
		if (w % 10 == 0) {
			ss += "<tr>";
		}
		ss += "<td>";
		Word(false);
		ss += "</td>";
		if (w % 10 == 9) {
			ss += "</tr>";
		}
	}
	ss += "</table>";
}

function CreateLongLex()
{
	for (w = 0; w < NLEX * 5; w++) {
		Word(false);
		ss += "<br/>";
	}
}


var arr = [];

// Generate all the syllables following a particular pattern, plus an initial.
// 1. Look at the first item in pattern, e.g. V
// 2. For each member m of that class (e.g. aeiou)…
//    a. If it ends the pattern, just generate the word initial + m
//    b. If not, call genall recursively with m added to the initial,
//       and a pattern consisting of the rest of the string.
function genall(initial, pattern) {

	if (pattern.length == 0) return;

	var theCat = pattern[0];
	var lastOne = pattern.length == 1;

	// Find category
	var ix = find(catindex, theCat);
	if (ix == -1) {
		// Not a category, just output it straight
		if (lastOne) {
			arr.push(rewriterulesStr(initial + theCat));
		} else {
			genall(initial + theCat, pattern.slice(1));
		}
	} else {
		// It's a category; iterate over the members
		var i, m, t;
		var members = cat[ix].substr(2);

		for (i = 0; i < members.length; i++) {
			m = members.charAt(i);
			if (lastOne) {
				arr.push(rewriterulesStr(initial + m));
			} else {
				genall(initial + m, pattern.slice(1));
			}
		}
	}
}

function CreateAll() {
	arr = [];
	s = "";
	var t;

	for (w = 0; w < nsyl; w++) {
		genall("", syl[w]);
	}

	// Sort
	arr = arr.sort();

	// Output
	var lastel = "";
	for (i = 0; i < arr.length; i++) {
		t = arr[i];
		if (i == 0 || t != lastel) {
			s += t + "<br>";
			lastel = t;
		}
	}

	ss = s;

	arr = [];
}

// User hit the action button.  Make things happen!
function process() 
{
	//Read parameters
	var theform = document.theform;
	var isLong = theform.outtype[2].checked;
	var isText = theform.outtype[0].checked;
	var doAll = theform.outtype[3].checked;

	showsyl = theform.showsyl.checked;
	slowsyl = theform.slowsyl.checked;

	monosyl = 0.0;
	if (theform.monosyl[1].checked) monosyl = 0.85;
	else if (theform.monosyl[2].checked) monosyl = 0.50;
	else if (theform.monosyl[3].checked) monosyl = 0.20;
	else if (theform.monosyl[4].checked) monosyl = 0.07;

	dropoff = 30;
	if (theform.dropoff[0].checked) dropoff = 45;
	else if (theform.dropoff[2].checked) dropoff = 15;
	else if (theform.dropoff[3].checked) dropoff = 8;
	else if (theform.dropoff[4].checked) dropoff = 0;

	// Stuff we can do once
	ss = "";

	readStuff();

	rew = theform.rewrite.value.split("\n");
	nrew = rew.length;

	// Syllable dropoff
	if (slowsyl) {
		if (nsyl == 2) syldrop = 50;
		else if (nsyl == 3) syldrop = 40;
		if (nsyl < 9) syldrop = 46 - nsyl * 4;
		else syldrop = 11;
 	} else {
		if (nsyl < 9) syldrop = 60 - nsyl * 5;
		else syldrop = 12;
	}

	// Error checking
	if (ncat <= 0 || nsyl <= 0) {
		ss = '<div class="alert alert-danger" role="alert"><strong>Error!</strong> You must have both categories and syllables to generate text.</div>';
		document.querySelector("#div-cats").classList += " has-error";
		document.querySelector("#div-syls").classList += " has-error";
	} else if (badcats) {
		ss = '<div class="alert alert-danger" role="alert"><strong>Error!</strong> Categories must be in the form of <code>V=aeiou</code>. That is, a single letter, an equal sign, then a list of possible expansions.</div';
		document.querySelector("#div-cats").classList += " has-error";
	} else if (theform.syls.value == "") {
		ss = '<div class="alert alert-danger" role="alert"><strong>Error!</strong> There must be at least one syllable type.</div>';
		document.querySelector("#div-syls").classList += " has-error";
	} else {
		// Actually generate text
		document.querySelector("#div-cats").classList.remove("has-error");
		document.querySelector("#div-syls").classList.remove("has-error");

		if (isText ) {
			CreateText();
		} else if (isLong) {
			CreateLongLex();
		} else if (doAll) {
			CreateAll();
		} else {
			CreateLex();
		}

	}

	// Set the output field
	document.getElementById("mytext").innerHTML = ss;
}

function erase()
{
	document.getElementById("mytext").innerHTML = "";
}

function clearAll()
{
	if (confirm("Are you sure you want to clear the Categories, Rewrite rules, and Syllable types?\n\nThis action cannot be reversed!"))
	{
		var cats = document.querySelector("#cats");
		var rewrite = document.querySelector("#rewrite")
		var syls = document.querySelector("#syls")
		cats.value = "";
		rewrite.value = "";
		syls.value = "";
		erase();

		infoAlertMessage("clrAll");
	}
}

// Defaults
function defaultme()
{
	if (++defN == 6) defN = 1;

	switch (defN) {
	case 1: // Large inventory
		theform.cats.value = "C=ptknslrmbdgfvwyhšzñxčžŋ\nV=aiuoeɛɔâôüö\nR=rly";
		theform.syls.value = "CV\nV\nCVC\nCRV";
		theform.rewrite.value = "â|ai\nô|au";
		break;
	case 2: // Latinate
		theform.cats.value = "C=tkpnslrmfbdghvyh\nV=aiueo\nU=aiuôê\nR=rl" +
					"\nM=nsrmltc\nK=ptkbdg";
		theform.syls.value = "CV\nCUM\nV\nUM\nKRV\nKRUM";
		theform.rewrite.value = "ka|ca\nko|co\nku|cu\nkr|cr";
		break;
	case 3: // Simple
		theform.cats.value = "C=tpknlrsmʎbdgñfh\nV=aieuoāīūēō\nN=nŋ";
		theform.syls.value = "CV\nV\nCVN";
		theform.rewrite.value = "aa|ā\nii|ī\nuu|ū\nee|ē\noo|ō\nnb|mb\nnp|mp";
		break;
	case 4: // Chinese
		theform.cats.value = "C=ptknlsmšywčhfŋ\nV=auieo\nR=rly" +
					"\nN=nnŋmktp\nW=io\nQ=ptkč";
		theform.syls.value = "CV\nQʰV\nCVW\nCVN\nVN\nV\nQʰVN";
		theform.rewrite.value = "uu|wo\noo|ou\nii|iu\naa|ia\nee|ie";
		break;
	case 5: // Original default
		theform.cats.value = "C=ptkbdg\nR=rl\nV=ieaou";
		theform.syls.value = "CV\nV\nCRV";
		theform.rewrite.value = "ki|či";
	}

}

function saveToJSON()
{
	var jsonData = new Object();
	jsonData.cats = document.querySelector("#cats").value;
	jsonData.rules = document.querySelector("#rewrite").value;
	jsonData.syls = document.querySelector("#syls").value;

	var contText, table, wordlist, all;
	contText = document.querySelector("#outType-contText").checked;
	table = document.querySelector("#outType-table").checked;
	wordlist = document.querySelector("#outType-wordlist").checked;
	all = document.querySelector("#outType-all").checked;

	if (contText)
	{
		jsonData.outType = "contText";
	}
	else if (table)
	{
		jsonData.outType = "table";
	}
	else if (wordlist)
	{
		jsonData.outType = "wordlist";
	}
	else
	{
		jsonData.outType = "all";
	}

	var show, slow;
	show = document.querySelector("#syls-show").checked;
	slow = document.querySelector("#syls-slow").checked;

	jsonData.show = show;
	jsonData.slow = slow;

	var fast, medium, slow2, molasses, eq;
	fast = document.querySelector("#dropoff-fast").checked;
	medium = document.querySelector("#dropoff-medium").checked;
	slow2 = document.querySelector("#dropoff-slow").checked;
	molasses = document.querySelector("#dropoff-molasses").checked;
	eq = document.querySelector("#dropoff-eq").checked;

	if (fast)
	{
		jsonData.dropoff = "fast";
	}
	else if (medium)
	{
		jsonData.dropoff = "medium";
	}
	else if (slow2)
	{
		jsonData.dropoff = "slow";
	}
	else if (molasses)
	{
		jsonData.dropoff = "molasses";
	}
	else
	{
		jsonData.dropoff = "eq";
	}

	var always, mostly, freq, less, rare;
	always = document.querySelector("#monosyl-always").checked;
	mostly = document.querySelector("#monosyl-mostly").checked;
	freq = document.querySelector("#monosyl-freq").checked;
	less = document.querySelector("#monosyl-less").checked;
	rare = document.querySelector("#monosyl-rare").checked;

	if (always)
	{
		jsonData.monosyl = "always";
	}
	else if (mostly)
	{
		jsonData.monosyl = "mostly";
	}
	else if (freq)
	{
		jsonData.monosyl = "freq";
	}
	else if (less)
	{
		jsonData.monosyl = "less";
	}
	else
	{
		jsonData.monosyl = "rare";
	}

	var jsonString = JSON.stringify(jsonData, null, 4);

	document.querySelector("#imex").innerHTML = jsonString;
}

function loadFromJSON()
{
	var jsonData = new Object();
	jsonData = JSON.parse(document.querySelector("#imex").value);

	console.log(jsonData);

	document.querySelector("#cats").value = jsonData.cats;
	document.querySelector("#rewrite").value = jsonData.rules;
	document.querySelector("#syls").value = jsonData.syls;

	var contText, table, wordlist, all;
	contText = document.querySelector("#outType-contText");
	table = document.querySelector("#outType-table");
	wordlist = document.querySelector("#outType-wordlist");
	all = document.querySelector("#outType-all");

	if (jsonData.outType == "contText")
	{
		contText.checked = true;
	}
	else if (jsonData.outType == "table")
	{
		table.checked = true;
	}
	else if (jsonData.outType == "wordlist")
	{
		wordlist.checked = true;
	}
	else
	{
		all.checked = true;
	}

	var show, slow;
	show = document.querySelector("#syls-show");
	slow = document.querySelector("#syls-slow");

	if (jsonData.show)
	{
		show.checked = true;
	}

	if (jsonData.slow)
	{
		slow.checked = slow;
	}

	if (jsonData.dropoff == "fast")
	{
		document.querySelector("#dropoff-fast").checked = true;
	}
	else if (jsonData.dropoff == "medium")
	{
		document.querySelector("#dropoff-medium").checked = true;
	}
	else if (jsonData.dropoff == "slow")
	{
		document.querySelector("#dropoff-slow").checked = true;
	}
	else if (jsonData.dropoff == "molasses")
	{
		document.querySelector("#dropoff-molasses").checked = true;
	}
	else
	{
		document.querySelector("#dropoff-eq").checked = true;
	}

	if (jsonData.monosyl == "always")
	{
		document.querySelector("#monosyl-always").checked = true;
	}
	else if (jsonData.monosyl == "mostly")
	{
		document.querySelector("#monosyl-mostly").checked = true;
	}
	else if (jsonData.monosyl == "freq")
	{
		document.querySelector("#monosyl-freq").checked = true;
	}
	else if (jsonData.monosyl == "less")
	{
		document.querySelector("#monosyl-less").checked = true;
	}
	else
	{
		document.querySelector("#monosyl-rare").checked = true;
	}

	infoAlertMessage("opened");
}

function displayLoadMessage()
{
	if (localStorage.getItem("ConlangTextGen-Data") == null)
	{
		neuterOpenStyle(false);
	}
}

function deleteJSON()
{
	if (confirm("Are you sure you want to delete your save file?\n\nThis cannot be reversed."))
	{
		localStorage.removeItem("ConlangTextGen-Data");
		neuterOpenStyle(true);
	}
}

function neuterOpenStyle(animate)
{
	if (document.querySelector("#load-message") != null)
	{
		if (animate)
		{
			$(".flash-loadmsg").fadeTo(500, 0).slideUp(500, function()
			{
				$(this).remove();
			});
		}
		else
		{
			document.querySelector("#controls").removeChild(document.querySelector("#load-message"));
		}
		document.querySelector("#btn-open").className = "btn btn-default";
	}
}

function infoAlertMessage(messagePreset)
{
	var newAlert = document.createElement("div");
	var textHTML;

	switch (messagePreset)
	{
		case "saved":
			textHTML = "<strong>Saved.</strong> The settings were saved successfully.";
			break;
		case "opened":
			textHTML = "<strong>Opened.</strong> The settings were successfully opened.";
			break;
		case "nodata":
			textHTML = "<strong>No saved data.</strong> There is no saved data in your local storage.";
			break;
	}

	newAlert.innerHTML = textHTML;

	newAlert.className = "alert alert-info alert-dismissible flash";
	newAlert.id = "infoAlertMessage";

	var before = document.querySelector("#btn-options-panel");
	var parent = document.querySelector("#controls");

	parent.insertBefore(newAlert, before);

	window.setTimeout(function() {
	$(".flash").fadeTo(500, 0).slideUp(500, function(){
		$(this).remove();
	});
	}, 3000);
}

var controlPanel = new Object();

controlPanel.generate = document.querySelector("#btn-generate");
controlPanel.export = document.querySelector("#btn-export");
controlPanel.import = document.querySelector("#btn-import");
controlPanel.cycle = document.querySelector("#btn-cycle");
controlPanel.clrOut = document.querySelector("#btn-clrOut");
controlPanel.clrAll = document.querySelector("#btn-clrAll");

// Button clicking functions
controlPanel.generate.addEventListener("click", function()
{
	process();
});

controlPanel.export.addEventListener("click", function()
{
	saveToJSON();
});

controlPanel.import.addEventListener("click", function()
{
	loadFromJSON();
});

controlPanel.cycle.addEventListener("click", function()
{
	defaultme();
});

controlPanel.clrOut.addEventListener("click", function()
{
	erase();
});

controlPanel.clrAll.addEventListener("click", function()
{
	clearAll();
});