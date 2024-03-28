var yasqe = YASQE(document.getElementById("yasqe"), {
	sparql: {
		showQueryButton: true,
		endpoint: "https://w3id.org/oc/sparql",
		requestMethod: "GET"
	}
});
var yasr = YASR(document.getElementById("yasr"), {
	//this way, the URLs in the results are prettified using the defined prefixes in the query
	getUsedPrefixes: yasqe.getPrefixesFromQuery
});
