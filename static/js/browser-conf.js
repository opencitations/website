var browser_conf = {
  //"sparql_endpoint": "http://localhost:8080/sparql",
  "sparql_endpoint": "https://w3id.org/oc/sparql",

  "prefixes": [
      {"prefix":"cito","iri":"http://purl.org/spar/cito/"},
      {"prefix":"dcterms","iri":"http://purl.org/dc/terms/"},
      {"prefix":"datacite","iri":"http://purl.org/spar/datacite/"},
      {"prefix":"literal","iri":"http://www.essepuntato.it/2010/06/literalreification/"},
      {"prefix":"biro","iri":"http://purl.org/spar/biro/"},
      {"prefix":"frbr","iri":"http://purl.org/vocab/frbr/core#"},
      {"prefix":"c4o","iri":"http://purl.org/spar/c4o/"},
      {"prefix":"bds","iri":"http://www.bigdata.com/rdf/search#"},
      {"prefix":"fabio","iri":"http://purl.org/spar/fabio/"},
      {"prefix":"pro","iri":"http://purl.org/spar/pro/"},
      {"prefix":"oco","iri":"https://w3id.org/oc/ontology/"},
      {"prefix":"rdf","iri":"http://www.w3.org/1999/02/22-rdf-syntax-ns#"},
      {"prefix":"prism","iri":"http://prismstandard.org/namespaces/basic/2.0/"}
    ],

  "categories":{

    "document": {
          "rule": "br\/.*",
          "query": [`
            SELECT DISTINCT ?my_iri ?id_lit ?short_iri ?title ?subtitle ?year ?type ?short_type ?label ?author ?author_browser_iri (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited_by) AS ?in_cits) Where{
              	BIND(<https://w3id.org/oc/corpus/[[VAR]]> as ?my_iri) .
            	  ?my_iri rdf:type ?type .
              	OPTIONAL {?my_iri dcterms:title ?title .}
              	BIND('[[VAR]]' as ?short_iri) .
            	  BIND(REPLACE(STR(?type), 'http://purl.org/spar/fabio/', '', 'i') as ?short_type) .
            	  OPTIONAL {?my_iri fabio:hasSubtitle ?subtitle .}
            	  OPTIONAL {?my_iri prism:publicationDate ?year .}
            	  OPTIONAL {?my_iri cito:cites ?cites .}
              	OPTIONAL {?cited_by cito:cites ?my_iri .}
                OPTIONAL {
                      ?my_iri datacite:hasIdentifier [
                      datacite:usesIdentifierScheme datacite:doi ;
                      literal:hasLiteralValue ?id_lit
                      ]
                }
              	{
                  SELECT ?my_iri ?label ?author ?author_browser_iri (count(?next) as ?tot){
                  				         ?my_iri rdfs:label ?label .
                                  OPTIONAL {
                                      ?my_iri pro:isDocumentContextFor ?role .
                                      ?role pro:withRole pro:author ; pro:isHeldBy [
                                          foaf:familyName ?f_name ;
                                           foaf:givenName ?g_name
                                      ] .
                                      ?role pro:isHeldBy ?author_iri .
                                      BIND(REPLACE(STR(?author_iri), '/corpus/', '/browser/', 'i') as ?author_browser_iri) .
                                      OPTIONAL { ?role oco:hasNext* ?next }
                                      BIND(CONCAT(?g_name,' ',?f_name) as ?author)
                                  }
                  } GROUP BY ?my_iri ?label ?author ?author_browser_iri ORDER BY DESC(?tot)
              	}
            } GROUP BY ?my_iri ?id_lit ?short_iri ?title ?subtitle ?year ?type ?short_type ?label ?author ?author_browser_iri
            `
          ],
          "links": {
            "author": {"field":"author_browser_iri","prefix":""},
            "short_type": {"field":"type","prefix":""},
            "id_lit": {"field":"id_lit","prefix":"http://dx.doi.org/"}
          },
          "group_by": {"keys":["label"], "concats":["author","short_type"]},
          "none_values": {"subtitle": "", "author": "No authors", "title": "Document without title"},

          "text_mapping": {
              "short_type":[
                  {"regex": /Expression/g, "value":"Document"},
                  {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
              ]
          },

          "contents": {
            "extra": {
                "browser_view_switch":{
                    "labels":["Switch to metadata view","Switch to browser view"],
                    "values":["short_iri","short_iri"],
                    "regex":["corpus\/br\/.*","browser\/br\/.*"],
                    "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/corpus/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/corpus/[[VAR]]> as ?resource)}"]],
                    "links":["https://w3id.org/oc/corpus/[[VAR]]","https://w3id.org/oc/browser/[[VAR]]"]
                }
            },
            "header": [
                {"classes":["40px"]},
                {"fields": ["title"], "classes":["header-title"]},
                {"fields": ["subtitle"], "classes":["sub-header-title"]},
                {"classes":["10px"]},
                {"fields": ["author"], "concat_style":{"author": "inline"}}
            ],
            "details": [
              {"classes":["20px"]},
              {"fields": ["FREE-TEXT","id_lit"], "values":["DOI: ", null] },
              {"fields": ["FREE-TEXT","year"], "values":["Publication date: ", null] },
              {"fields": ["FREE-TEXT","short_iri"], "values":["OpenCitations Corpus ID: ", null] },
              //{"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Publisher: ", "crossref4doi.message.publisher"]},
              {"fields": ["FREE-TEXT","short_type"], "values":["Document type: ",null], "concat_style":{"short_type": "last"} }
            ],
            "metrics": [
              {"classes":["30px"]},
              {"fields": ["FREE-TEXT"], "values": ["Metrics"], "classes": ["metrics-title"]},
              {"classes":["15px"]},
              {"fields": ["FREE-TEXT","in_cits","FREE-TEXT"], "values": ["Cited by ",null," documents"], "classes": ["metric-entry","imp-value","metric-entry"]},
              {"classes":["10px"]},
              {"fields": ["FREE-TEXT","out_cits","FREE-TEXT"], "values": ["Cites ",null," documents"], "classes": ["metric-entry","imp-value","metric-entry"], "respects":[[],[more_than_zero],[]]}
            ],
            "oscar_conf": {
                "progress_loader":{
                          "visible": false,
                          "spinner": false,
                          "title":"Loading the list of Citations and References ...",
                          //"subtitle":"Be patient - this might take several seconds!"
                          //"abort":{"title":"Abort", "href_link":""}
                        }
            },
            "oscar": [
              {
                "query_text": "my_iri",
                "rule": "doc_cites_me_list",
                "label":"Citations of this work by others",
                "config_mod" : [
      							{"key":"page_limit_def" ,"value":30},
                    //{"key":"categories.[[name,citation]].fields.[[title,Cited reference]]" ,"value":"REMOVE_ENTRY"},
      							{"key":"categories.[[name,document]].fields.[[title,Year]].sort.default" ,"value":{"order": "asc"}},
      							{"key":"progress_loader.visible" ,"value":false},
                    {"key":"timeout.text" ,"value":""}
      					]
              },
              {
                "query_text": "my_iri",
                "rule": "doc_cites_list",
                "label":"Outgoing references",
                "config_mod" : [
      							{"key":"page_limit_def" ,"value":30},
      							{"key":"categories.[[name,document]].fields.[[title,Cited by]].sort.default" ,"value":{"order": "desc"}},
      							{"key":"progress_loader.visible" ,"value":false},
                    {"key":"timeout.text" ,"value":""}
      					]
              }
            ]
          },
          "ext_data": {
            //"crossref4doi": {"name": call_crossref, "param": {"fields":["id_lit","FREE-TEXT"],"values":[null,1]}}
          }
    },

    "author": {
          "rule": "ra\/.*",
          "query": [`
            SELECT ?label ?orcid ?author_iri ?short_iri ?author (COUNT(distinct ?doc) AS ?num_docs) (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited_by) AS ?in_cits_docs) (COUNT(?cited_by) AS ?in_cits_tot) WHERE {
    	         BIND(<https://w3id.org/oc/corpus/[[VAR]]> as ?author_iri) .
               BIND(REPLACE(STR(?author_iri), 'https://w3id.org/oc/corpus', '', 'i') as ?short_iri) .
               ?author_iri rdfs:label ?label .
    	         ?author_iri foaf:familyName ?fname .
    	         ?author_iri foaf:givenName ?name .
    	         BIND(CONCAT(STR(?name),' ', STR(?fname)) as ?author) .
    	         OPTIONAL {?role pro:isHeldBy ?author_iri .}
               OPTIONAL {?doc pro:isDocumentContextFor ?role.}
               OPTIONAL {?doc cito:cites ?cites .}
               OPTIONAL {?cited_by cito:cites ?doc .}
               OPTIONAL {
      	          ?author_iri datacite:hasIdentifier [
      		            datacite:usesIdentifierScheme datacite:orcid ;
  			              literal:hasLiteralValue ?orcid
                  ]
    	         }
             } GROUP BY ?label ?orcid ?author_iri ?short_iri ?author
             `
          ],
          "links": {
            //"author": {"field":"author_iri"},
            "title": {"field":"doc"},
            "orcid": {"field":"orcid","prefix":"https://orcid.org/"}
          },
          "group_by": {"keys":["label"], "concats":["doc","title","year"]},

          "contents": {
            "extra": {
                "browser_view_switch":{
                    "labels":["ldd","Browser"],
                    "values":["short_iri","short_iri"],
                    "regex":["w3id.org\/oc\/corpus\/ra\/.*","w3id.org\/oc\/browser\/ra\/.*"],
                    "query":[["PREFIX pro:<http://purl.org/spar/pro/> SELECT ?role WHERE {?role pro:isHeldBy <https://w3id.org/oc/corpus[[VAR]]>. ?role pro:withRole pro:author . }"],["SELECT ?role WHERE {BIND(<https://w3id.org/oc/corpus[[VAR]]> as ?role)}"]],
                    "links":["https://w3id.org/oc/corpus[[VAR]]","https://w3id.org/oc/browser[[VAR]]"]
                }
            },
            "header": [
                {"classes":["40px"]},
                {"fields": ["author"], "classes":["header-title"]}
            ],
            "details": [
                {"classes":["20px"]},
                {"fields": ["FREE-TEXT","orcid"], "values": ["Author ORCID: ",null]}
            ],
            "metrics": [
                {"classes":["5px"]},
                {"fields": ["FREE-TEXT"], "values": ["Metrics"], "classes": ["metrics-title"]},
                {"classes":["25px"]},
                {"fields": ["FREE-TEXT","num_docs","FREE-TEXT"], "values": ["Author of ",null," documents"], "classes": ["metric-entry","imp-value"]},
                {"classes":["10px"]},
                //{"fields": ["FREE-TEXT","in_cits_tot","FREE-TEXT"], "values": ["Cited ",null," number of times"], "classes": ["metric-entry","imp-value","metric-entry"]},
                {"fields": ["FREE-TEXT","in_cits_docs","FREE-TEXT"], "values": ["Cited by ",null," different documents"], "classes": ["metric-entry","imp-value","metric-entry"]}
                //{"classes":["5px"]}
                //{"fields": ["FREE-TEXT","in_cits_docs","FREE-TEXT"], "values": ["\xa0\xa0\xa0 by ",null," different documents"], "classes": ["metric-entry","imp-value","metric-entry"]}
            ],
            // "oscar_conf": {
            //     "progress_loader":{
            //               "visible": false,
            //               "spinner": false,
            //               "title":"Loading the list of Documents ...",
            //               //"subtitle":"Be patient - this might take several seconds!"
            //               //"abort":{"title":"Abort", "href_link":""}
            //             }
            // },
            // "oscar": [
            //   {
            //     "query_text": "author_iri",
            //     "rule": "author_works",
            //     "label":"Author's documents",
            //     "config_mod" : [
      			// 				{"key":"categories.[[name,document]].fields.[[title,Publisher]]" ,"value":"REMOVE_ENTRY"},
      			// 				{"key":"page_limit_def" ,"value":20},
      			// 				{"key":"categories.[[name,document]].fields.[[title,Year]].sort.default" ,"value":{"order": "desc"}},
            //         {"key":"progress_loader.visible" ,"value":false},
            //         {"key":"timeout.text" ,"value":""}
      			// 		]
            //   }
            // ]
          }
        }
      }
}

//"FUNC" {"name": call_crossref, "param":{"fields":[],"vlaues":[]}}
function call_crossref(str_doi, field){
  var call_crossref_api = "https://api.crossref.org/works/";
  var call_url =  call_crossref_api+ encodeURIComponent(str_doi);

  var result_data = "";
  $.ajax({
        dataType: "json",
        url: call_url,
        type: 'GET',
        async: false,
        success: function( res_obj ) {
            if (field == 1) {
              result_data = res_obj;
            }else {
              if (!b_util.is_undefined_key(res_obj,field)) {
                result_data = b_util.get_obj_key_val(res_obj,field);
              }
            }
            //console.log(result_data);
            //browser._update_page();
        }
   });
   return result_data;
}


//Heuristics
function more_than_zero(val){
  return parseInt(val) > 0
}
