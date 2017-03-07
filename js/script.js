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
	} else if (badcats) {
		ss = '<div class="alert alert-danger" role="alert"><strong>Error!</strong> Categories must be in the form of <code>V=aeiou</code>. That is, a single letter, an equal sign, then a list of possible expansions.</div';
	} else if (theform.syls.value == "") {
		ss = '<div class="alert alert-danger" role="alert"><strong>Error!</strong> There must be at least one syllable type.</div>';
	} else {
		// Actually generate text

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

function helpme() 
{
	window.open("genhelp.html"); 
}

function clearAll()
{
	if (confirm("Are you sure you want to clear the Categories, Rewrite rules, and Syllable types? It cannot be reversed!"))
	{
		console.log("log 'o' shit");
		var cats = document.querySelector("#cats");
		var rewrite = document.querySelector("#rewrite")
		var syls = document.querySelector("#syls")
		cats.value = "";
		rewrite.value = "";
		syls.value = "";
		erase();
	}
}

// Parse the Cat field into the three input fields
function parsecat() 
{
	var theform = document.theform;
	cat = theform.cats.value.split("\n");
	ncat = cat.length;
	
	var osyl= "";
	var orew = "";
	var ocat = "";

	for (w = 0; w < ncat; w++) {
		var t = cat[w];
		if (find(t, "|") != -1) 
			orew += t + "\n";
		else if (find(t, "=") != -1) 
			ocat += t + "\n";
		else 
			osyl += t + "\n";
	}

	if (osyl == "" && theform.syls.value != "") {
		alert("No syllable types were found in the categories box, and you have content in the syllable types box.  You probably don't want to do a Parse then.");
		return;
	}
	if (orew == "" && theform.rewrite.value != "") {
		alert("No rewrite rules were found in the categories box, and you have content in the rewrite rules box.  You probably don't want to do a Parse then.");
		return;
	}

	theform.cats.value = ocat;
	theform.rewrite.value = orew;
	theform.syls.value = osyl;
}

// Copy all three input fields back into the SC area
function intocat()
{
	var theform = document.theform;

	theform.cats.value =
		theform.cats.value + "\n" + 
		theform.rewrite.value + "\n" + 
		theform.syls.value + "\n";
}

// Display the IPA
function showipa()
{
	s = "<font face='Gentium'>&#x00b2; &#x2023; &#x2026; ";
	for (var i = 0x0250; i <= 0x02af; i++) {
		s += String.fromCharCode(i) + " ";
	}
	for (var i = 0x00c0; i <= 0x0237; i++) {
		s += String.fromCharCode(i) + " ";
	}
	s += "</font>";
	document.getElementById("mytext").innerHTML = s;
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