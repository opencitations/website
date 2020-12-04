var browser_conf = {
  "sparql_endpoint": "https://w3id.org/oc/ccc/sparql",

  "prefixes": [
      {"prefix":"cito","iri":"http://purl.org/spar/cito/"},
      {"prefix":"deo","iri":"http://purl.org/spar/deo/"},
      {"prefix":"doco","iri":"http://purl.org/spar/doco/"},
      {"prefix":"dcterms","iri":"http://purl.org/dc/terms/"},
      {"prefix":"datacite","iri":"http://purl.org/spar/datacite/"},
      {"prefix":"literal","iri":"http://www.essepuntato.it/2010/06/literalreification/"},
      {"prefix":"biro","iri":"http://purl.org/spar/biro/"},
      {"prefix":"frbr","iri":"http://purl.org/vocab/frbr/core#"},
      {"prefix":"c4o","iri":"http://purl.org/spar/c4o/"},
      {"prefix":"co","iri":"http://purl.org/co/"},
      {"prefix":"bds","iri":"http://www.bigdata.com/rdf/search#"},
      {"prefix":"fabio","iri":"http://purl.org/spar/fabio/"},
      {"prefix":"pro","iri":"http://purl.org/spar/pro/"},
      {"prefix":"oa","iri":"http://www.w3.org/ns/oa#"},
      {"prefix":"oco","iri":"https://w3id.org/oc/ontology/"},
      {"prefix":"rdf","iri":"http://www.w3.org/1999/02/22-rdf-syntax-ns#"},
      {"prefix":"prism","iri":"http://prismstandard.org/namespaces/basic/2.0/"}
    ],

  "categories":{

    "document": {
          "rule": "br\/.*",
          "ask_query": `SELECT ?flag
                WHERE {
                  BIND(
                    NOT EXISTS {
                      VALUES ?exclude { fabio:Journal fabio:JournalVolume fabio:JournalIssue }
                      <https://w3id.org/oc/ccc/[[VAR]]> a ?exclude .}
                    as ?flag)
                }`,
          "query": `
            SELECT DISTINCT ?my_iri ?id_lit ?short_iri ?title ?year ?type ?s_type ?author ?author_br_iri (count(?next) as ?tot) (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited_by) AS ?in_cits) ?j_vol_br_iri ?j_br_iri ?journal ?journal_data
            WHERE{hint:Query hint:optimizer "Runtime".
                  BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri).
                  BIND('[[VAR]]' as ?short_iri).
                  ?my_iri rdf:type ?type.
                  BIND(REPLACE(STR(?type),'http://purl.org/spar/fabio/','','i') as ?s_type).

                  OPTIONAL{?my_iri dcterms:title ?title.}
                  OPTIONAL {?be biro:references ?my_iri;c4o:hasContent ?be_t.}
                  BIND(COALESCE(?title,CONCAT("No metadata available for: ",STR(?be_t)),"No title available") AS ?title).

                  OPTIONAL{?my_iri prism:publicationDate ?year.}
                  OPTIONAL {?my_iri datacite:hasIdentifier [datacite:usesIdentifierScheme datacite:doi;literal:hasLiteralValue ?id_lit] .}

                  OPTIONAL {?my_iri pro:isDocumentContextFor ?role.
                            ?role pro:withRole pro:author; pro:isHeldBy [
                  				foaf:familyName ?f_name;foaf:givenName ?g_name]; pro:isHeldBy ?author_iri .
                           OPTIONAL{?role oco:hasNext* ?next.}
                           }

                  OPTIONAL{?my_iri frbr:partOf+ ?journal_iri.?journal_iri a fabio:Journal;dcterms:title ?journal.}
                  OPTIONAL{?my_iri frbr:partOf+ ?j_vol_iri.?j_vol_iri a fabio:JournalVolume;fabio:hasSequenceIdentifier ?volume.
                         ?my_iri frbr:embodiment ?manifestation.?manifestation prism:startingPage ?start;prism:endingPage ?end.
                         BIND(CONCAT(', ',?volume,': ',?start,'-',?end) as ?journal_data).}

                  OPTIONAL{?cited_by cito:cites ?my_iri.}
                  OPTIONAL{?my_iri cito:cites ?cites.}
                  BIND(REPLACE(STR(?author_iri),'/ccc/','/ccc/browser/','i') as ?author_br_iri).
                  BIND(REPLACE(STR(?journal_iri),'/ccc/','/ccc/browser/','i') as ?j_br_iri).
                  BIND(REPLACE(STR(?j_vol_iri),'/ccc/','/ccc/browser/','i') as ?j_vol_br_iri).
                  BIND(CONCAT(?g_name,' ',?f_name) as ?author) .
            } GROUP BY ?my_iri ?id_lit ?short_iri ?title ?year ?type ?s_type ?author ?author_br_iri ?j_vol_br_iri ?j_br_iri ?journal ?journal_data ORDER BY DESC(?tot)`,
          "links": {
            "author": {"field":"author_br_iri","prefix":""},
            "id_lit": {"field":"id_lit","prefix":"http://dx.doi.org/"},
            "journal": {"field":"j_br_iri","prefix":""},
            "journal_data": {"field":"j_vol_br_iri","prefix":""}
          },
          "group_by": {"keys":["title"], "concats":["author","s_type"]},
          "none_values": { "author": "", "title": "", "id_lit":"", "id_issn":"","year":"", "journal":"", "journal_data":""},
          "text_mapping": {
              "s_type":[
                  {"regex": /Expression/g, "value":"Document"},
                  {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
              ]
          },
          "contents": {
            "extra": {
                "browser_view_switch":{
                  "labels":["Switch to metadata view","Switch to browser view"],
                  "values":["short_iri","short_iri"],
                  "regex":["br\/.*","\/ccc\/browser\/br\/.*"],
                  "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
                  "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
                }
            },
            "header": [
                {"classes":["20px"]},
                {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
                {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
                {"fields": ["id_lit"], "classes":["identifiers doi_before"] },
                {"fields": ["id_issn"], "classes":["identifiers issn_before"] },
                {"classes":["20px"]},
                {"fields": ["title"], "classes":["header-title"]},
                {"classes":["1px"]},
                {"classes":["1px"]},
                {"fields": ["author"], "concat_style":{"author": "inline"}}
            ],
            "details": [
              {"fields": ["journal"], "classes":["journal-data"]},
              {"fields": ["journal_data"], "classes":["journal-data"]},
              {"fields": ["year"], "classes":["journal-data-separator"] }

              ],
            "metrics": [
              {"fields": ["FREE-TEXT"], "values": ["Summary"], "classes": ["metrics-title"]},
              {"fields": ["in_cits"], "classes": ["cited"]},
              {"fields": ["out_cits"], "classes": ["refs"]},
              {"fields": ["FREE-TEXT"], "values": ["read more"], "classes":["know_more"]}
              // {"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Publisher: ", "crossref4doi.message.publisher"]},
              // {"fields": ["FREE-TEXT","EXT_DATA"], "values": ["test", "ramose4citations.creation"]},
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
                "rule": "doc_cites_list",
                "label":"References",
                "config_mod" : [
      							{"key":"page_limit_def" ,"value":30},
      							{"key":"categories.[[name,document]].fields.[[title,Cited by]].sort.default" ,"value":{"order": "desc"}},
      							{"key":"progress_loader.visible" ,"value":false},
                    {"key":"timeout.text" ,"value":""}
      					]
              },
              {
                "query_text": "my_iri",
                "rule": "mari_doc_cites_me_list",
                "label":"Citations",
                "config_mod" : [
      							{"key":"page_limit_def" ,"value":30},
                    {"key":"categories.[[name,document_intext]].fields.[[title,Year]].sort.default" ,"value":{"order": "asc"}},
      							{"key":"progress_loader.visible" ,"value":false},
                    {"key":"timeout.text" ,"value":""}
      					]
              }
            ]
          },
          "ext_data": {
            // "crossref4doi": {"name": call_crossref, "param": {"fields":["id_lit","FREE-TEXT"],"values":[null,1]}},
            // "ramose4citations": {"name": call_ramose, "param": {"fields":["id_lit","FREE-TEXT"],"values":[null,1]}}
          }
  },
    "issue": {
      "rule": "br\/.*",
      "ask_query": `SELECT ?flag
              WHERE {
                BIND(
                  EXISTS {
                    VALUES ?class { fabio:JournalIssue }
                    <https://w3id.org/oc/ccc/[[VAR]]> a ?class .}
                  as ?flag)
              }`,
      "query": `
      SELECT DISTINCT ?my_iri ?id_lit ?short_iri ?title ?year ?type ?s_type (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited_by) AS ?in_cits) ?j_br_iri ?journal
        WHERE{hint:Query hint:optimizer "Runtime".
              BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri).
              BIND('[[VAR]]' as ?short_iri).
              ?my_iri rdf:type ?type.
                FILTER (STR(?type) != 'http://purl.org/spar/fabio/Expression').
                BIND(REPLACE(STR(?type),'http://purl.org/spar/fabio/','','i') as ?s_type).

                OPTIONAL{?my_iri dcterms:title ?title.}
                OPTIONAL{?my_iri fabio:hasSequenceIdentifier ?issue_num.}
                BIND(COALESCE(?title, CONCAT("Issue n. ",STR(?issue_num)),"No title available") AS ?title).

                OPTIONAL {?my_iri frbr:partOf+ ?journal_iri . ?journal_iri datacite:hasIdentifier [datacite:usesIdentifierScheme datacite:issn;literal:hasLiteralValue ?id_lit] .}
                OPTIONAL{?my_iri frbr:partOf+ ?journal_iri. ?journal_iri a fabio:Journal;dcterms:title ?journal.}

                OPTIONAL{?my_iri prism:publicationDate ?year.}
                OPTIONAL{?my_iri ^frbr:partOf+ / prism:publicationDate ?year.}
                OPTIONAL{?my_iri ^frbr:partOf+ ?article . ?cited_by cito:cites ?article.}
                OPTIONAL{?my_iri ^frbr:partOf+ ?article . ?article cito:cites ?cites.}
                BIND(REPLACE(STR(?journal_iri),'/ccc/','/ccc/browser/','i') as ?j_br_iri).
          } GROUP BY ?my_iri ?id_lit ?short_iri ?title ?year ?type ?s_type ?j_br_iri ?journal`,
      "links": {
        "journal": {"field":"j_br_iri","prefix":""}
      },
      // "group_by": {"keys":["title"],"concats":["journal","year"]},
      "none_values": { "id_lit":"","year":"", "j_br_iri":"", "journal":""},
      "text_mapping": {
          "s_type":[
              {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
          ]
      },
      "contents": {
        "extra": {
            "browser_view_switch":{
              "labels":["Switch to metadata view","Switch to browser view"],
              "values":["short_iri","short_iri"],
              "regex":["br\/.*","\/ccc\/browser\/br\/.*"],
              "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
              "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
            }
        },
        "header": [
            {"classes":["20px"]},
            {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
            {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
            {"classes":["20px"]},
            {"fields": ["id_lit"], "classes":["identifiers issn_before"] },
            {"classes":["20px"]},
            {"fields": ["title"], "classes":["header-title"]},
            {"classes":["1px"]},
            {"classes":["1px"]},
            {"classes":["1px"]}
        ],
        "details": [
          {"fields": ["journal"], "classes":["journal-data"]},
          {"fields": ["year"], "classes":["journal-data-separator"] }
          ],
        "metrics": [
          {"fields": ["FREE-TEXT"], "values": ["Summary"], "classes": ["metrics-title"]},
          {"fields": ["in_cits"], "classes": ["cited"]},
          {"fields": ["out_cits"], "classes": ["refs"]},
          //{"fields": ["FREE-TEXT"], "values": ["read more"], "classes":["know_more"]}
        ],
        "oscar_conf": {
            "progress_loader":{
                      "visible": false,
                      "spinner": false,
                      "title":"Loading the list of Issues ...",
                      //"subtitle":"Be patient - this might take several seconds!"
                      //"abort":{"title":"Abort", "href_link":""}
                    }
        },
        "oscar": [
          {
            "query_text": "my_iri",
            "rule": "articles_in_issue_list",
            "label":"Articles",
            "config_mod" : [
                {"key":"page_limit_def" ,"value":30},
                {"key":"categories.[[name,document]].fields.[[title]].sort.default" ,"value":{"order": "desc"}},
                {"key":"progress_loader.visible" ,"value":false},
                {"key":"timeout.text" ,"value":""}
            ]
          }
        ]
      },
      "ext_data": {
        // "crossref4doi": {"name": call_crossref, "param": {"fields":["id_lit","FREE-TEXT"],"values":[null,1]}},
        // "ramose4citations": {"name": call_ramose, "param": {"fields":["id_lit","FREE-TEXT"],"values":[null,1]}}
      }
},
    "volume": {
        "rule": "br\/.*",
        "ask_query": `SELECT ?flag
                WHERE {
                  BIND(
                    EXISTS {
                      VALUES ?class { fabio:JournalVolume }
                      <https://w3id.org/oc/ccc/[[VAR]]> a ?class .}
                    as ?flag)
                }`,
        "query": `
        SELECT DISTINCT ?my_iri ?id_lit ?short_iri ?title ?year ?type ?s_type (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited_by) AS ?in_cits) ?j_br_iri ?journal
          WHERE{hint:Query hint:optimizer "Runtime".
                BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri).
                BIND('[[VAR]]' as ?short_iri).
                ?my_iri rdf:type ?type.
                  FILTER (STR(?type) != 'http://purl.org/spar/fabio/Expression').
                  BIND(REPLACE(STR(?type),'http://purl.org/spar/fabio/','','i') as ?s_type).

                  OPTIONAL{?my_iri dcterms:title ?title.}
                  OPTIONAL{?my_iri fabio:hasSequenceIdentifier ?vol_num.}
                  BIND(COALESCE(?title,CONCAT("Volume n. ",STR(?vol_num)),"No title available") AS ?title).

                  OPTIONAL {?my_iri frbr:partOf+ ?journal_iri . ?journal_iri datacite:hasIdentifier [datacite:usesIdentifierScheme datacite:issn;literal:hasLiteralValue ?id_lit] .}
                  OPTIONAL{?my_iri frbr:partOf+ ?journal_iri.?journal_iri a fabio:Journal;dcterms:title ?journal.}

                  OPTIONAL{?my_iri prism:publicationDate ?year.}
                  OPTIONAL{?my_iri ^frbr:partOf+ / prism:publicationDate ?year.}
                  OPTIONAL{?my_iri ^frbr:partOf+ ?article . ?cited_by cito:cites ?article.}
                  OPTIONAL{?my_iri ^frbr:partOf+ ?article . ?article cito:cites ?cites.}
                  BIND(REPLACE(STR(?journal_iri),'/ccc/','/ccc/browser/','i') as ?j_br_iri).
            } GROUP BY ?my_iri ?id_lit ?short_iri ?title ?year ?type ?s_type ?j_br_iri ?journal`,
        "links": {
          "journal": {"field":"j_br_iri","prefix":""}
        },
        // "group_by": {"keys":["title"],"concats":["journal","year"]},
        "none_values": { "id_lit":"","year":"", "j_br_iri":"", "journal":""},
        "text_mapping": {
            "s_type":[
                {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
            ]
        },
        "contents": {
          "extra": {
              "browser_view_switch":{
                "labels":["Switch to metadata view","Switch to browser view"],
                "values":["short_iri","short_iri"],
                "regex":["br\/.*","\/ccc\/browser\/br\/.*"],
                "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
                "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
              }
          },
          "header": [
              {"classes":["20px"]},
              {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
              {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
              {"classes":["20px"]},
              {"fields": ["id_lit"], "classes":["identifiers issn_before"] },
              {"classes":["20px"]},
              {"fields": ["title"], "classes":["header-title"]},
              {"classes":["1px"]},
              {"classes":["1px"]},
              {"classes":["1px"]}
          ],
          "details": [
            {"fields": ["journal"], "classes":["journal-data"]},
            {"fields": ["year"], "classes":["journal-data-separator"] }
            ],
          "metrics": [
            {"fields": ["FREE-TEXT"], "values": ["Summary"], "classes": ["metrics-title"]},
            {"fields": ["in_cits"], "classes": ["cited"]},
            {"fields": ["out_cits"], "classes": ["refs"]},
            //{"fields": ["FREE-TEXT"], "values": ["read more"], "classes":["know_more"]}
          ],
          "oscar_conf": {
              "progress_loader":{
                        "visible": false,
                        "spinner": false,
                        "title":"Loading the list of Issues ...",
                        //"subtitle":"Be patient - this might take several seconds!"
                        //"abort":{"title":"Abort", "href_link":""}
                      }
          },
          "oscar": [
            {
              "query_text": "my_iri",
              "rule": "issues_list",
              "label":"Issues",
              "config_mod" : [
                  {"key":"page_limit_def" ,"value":30},
                  {"key":"categories.[[name,issue]].fields.[[title]].sort.default" ,"value":{"order": "desc"}},
                  {"key":"progress_loader.visible" ,"value":false},
                  {"key":"timeout.text" ,"value":""}
              ]
            }
          ]
        },
        "ext_data": {
          // "crossref4doi": {"name": call_crossref, "param": {"fields":["id_lit","FREE-TEXT"],"values":[null,1]}},
          // "ramose4citations": {"name": call_ramose, "param": {"fields":["id_lit","FREE-TEXT"],"values":[null,1]}}
        }
},
    "journal": {
      "rule": "br\/.*",
      "ask_query": `SELECT ?flag
              WHERE {
                BIND(
                  EXISTS {
                    VALUES ?class { fabio:Journal }
                    <https://w3id.org/oc/ccc/[[VAR]]> a ?class .}
                  as ?flag)
              }`,
      "query": `
      SELECT DISTINCT ?my_iri ?id_lit ?short_iri ?title ?type ?s_type ?publisher ?publisher_br_iri (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited_by) AS ?in_cits)
        WHERE{hint:Query hint:optimizer "Runtime".
              BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri).
              BIND('[[VAR]]' as ?short_iri).
              ?my_iri rdf:type ?type.
                FILTER (STR(?type) != 'http://purl.org/spar/fabio/Expression').
                BIND(REPLACE(STR(?type),'http://purl.org/spar/fabio/','','i') as ?s_type).

                OPTIONAL{?my_iri dcterms:title ?title.}
                BIND(COALESCE(?title,"No title available") AS ?title).

                OPTIONAL {?my_iri datacite:hasIdentifier [datacite:usesIdentifierScheme datacite:issn;literal:hasLiteralValue ?id_lit] .}

                OPTIONAL{?my_iri ^frbr:partOf+ ?article . ?cited_by cito:cites ?article.}
                OPTIONAL{?my_iri ^frbr:partOf+ ?article . ?article cito:cites ?cites.}
                OPTIONAL{?my_iri ^frbr:partOf+ ?article .
                    ?article pro:isDocumentContextFor ?role .
                    ?role pro:withRole pro:publisher ; pro:isHeldBy ?publisher_iri .
                    ?publisher_iri foaf:name ?publisher .
                    BIND(REPLACE(STR(?publisher_iri),'/ccc/','/ccc/browser/','i') as ?publisher_br_iri).
                  }
                BIND(REPLACE(STR(?journal_iri),'/ccc/','/ccc/browser/','i') as ?j_br_iri).
          } GROUP BY ?my_iri ?id_lit ?short_iri ?title ?year ?type ?s_type ?publisher ?publisher_br_iri ?j_br_iri ?journal`,
      "links": {
        "publisher": {"field":"publisher_br_iri","prefix":""}
      },
      // "group_by": {"keys":["title"],"concats":["journal","year"]},
      "none_values": { "id_lit":"","year":"", "j_br_iri":"", "journal":"", "publisher":""},
      "text_mapping": {
          "s_type":[
              {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
          ]
      },
      "contents": {
        "extra": {
            "browser_view_switch":{
              "labels":["Switch to metadata view","Switch to browser view"],
              "values":["short_iri","short_iri"],
              "regex":["br\/.*","\/ccc\/browser\/br\/.*"],
              "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
              "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
            }
        },
        "header": [
            {"classes":["20px"]},
            {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
            {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
            {"classes":["20px"]},
            {"fields": ["id_lit"], "classes":["identifiers issn_before"] },
            {"classes":["20px"]},
            {"fields": ["title"], "classes":["header-title"]},
            {"classes":["1px"]},
            {"classes":["1px"]},
            {"fields": ["publisher"], "concat_style":{"publisher": "inline"}}
        ],
        "details": [
          {"fields": ["journal"], "classes":["journal-data"]},
          {"fields": ["year"], "classes":["journal-data-separator"] }
          ],
        "metrics": [
          {"fields": ["FREE-TEXT"], "values": ["Summary"], "classes": ["metrics-title"]},
          {"fields": ["in_cits"], "classes": ["cited"]},
          {"fields": ["out_cits"], "classes": ["refs"]},
          //{"fields": ["FREE-TEXT"], "values": ["read more"], "classes":["know_more"]}
        ],
        "oscar_conf": {
            "progress_loader":{
                      "visible": false,
                      "spinner": false,
                      "title":"Loading the list of Issues ...",
                      //"subtitle":"Be patient - this might take several seconds!"
                      //"abort":{"title":"Abort", "href_link":""}
                    }
        },
        "oscar": [
          {
            "query_text": "my_iri",
            "rule": "volumes_list",
            "label":"Volumes",
            "config_mod" : [
                {"key":"page_limit_def" ,"value":30},
                {"key":"categories.[[name,volume]].fields.[[title]].sort.default" ,"value":{"order": "desc"}},
                {"key":"progress_loader.visible" ,"value":false},
                {"key":"timeout.text" ,"value":""}
            ]
          }
        ]
      },
      "ext_data": {
        // "crossref4doi": {"name": call_crossref, "param": {"fields":["id_lit","FREE-TEXT"],"values":[null,1]}},
        // "ramose4citations": {"name": call_ramose, "param": {"fields":["id_lit","FREE-TEXT"],"values":[null,1]}}
      }
  },
    "author": {
          "rule": "ra\/.*",
          "ask_query": `SELECT ?flag
                  WHERE {
                    BIND(
                      EXISTS {
                        ?role pro:isHeldBy <https://w3id.org/oc/ccc/[[VAR]]> ; pro:withRole pro:author .}
                      as ?flag)
                  }`,
          "query": `
            SELECT ?orcid ?author_iri ?short_iri ?author ?s_type (COUNT(distinct ?doc) AS ?num_docs) (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited_by) AS ?in_cits_docs) (COUNT(?cited_by) AS ?in_cits_tot) WHERE {
    	         BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?author_iri) .
               BIND(REPLACE(STR(?author_iri), 'https://w3id.org/oc/ccc/', '', 'i') as ?short_iri) .
               OPTIONAL {?author_iri foaf:familyName ?fname .
    	            ?author_iri foaf:givenName ?name .
                  BIND(CONCAT(STR(?name),' ', STR(?fname)) as ?author_pers) .
               }
               OPTIONAL {?author_iri foaf:name ?author_org .}
               BIND(COALESCE(?author_pers, ?author_org) AS ?author).
    	         OPTIONAL {?role pro:isHeldBy ?author_iri ; pro:withRole ?aut_role.
                        ?doc pro:isDocumentContextFor ?role.
                        BIND(REPLACE(STR(?aut_role), 'http://purl.org/spar/pro/', '', 'i') as ?s_type) .
                        OPTIONAL {?doc cito:cites ?cites .}
                        OPTIONAL {?cited_by cito:cites ?doc .}
                  }

               OPTIONAL {
      	          ?author_iri datacite:hasIdentifier [
      		            datacite:usesIdentifierScheme datacite:orcid ;
  			              literal:hasLiteralValue ?orcid
                  ]
    	         }
             } GROUP BY ?orcid ?author_iri ?short_iri ?author ?s_type ?num_docs ?out_cits ?in_cits_docs
             `,
          "links": {
            //"author": {"field":"author_iri"},
            "title": {"field":"doc"},
            "orcid": {"field":"orcid","prefix":"https://orcid.org/"}
          },
          "group_by": {"keys":["author"], "concats":["doc","title","year"]},
          "none_values": {"orcid":"", "author": "", "title": ""},
          "contents": {
            "extra": {
                "browser_view_switch":{
                    "labels":["ldd","Browser"],
                    "values":["short_iri","short_iri"],
                    "regex":["w3id.org\/oc\/ccc\/ra\/.*","w3id.org\/oc\/ccc\/browser\/ra\/.*"],
                    "query":[["PREFIX pro:<http://purl.org/spar/pro/> SELECT ?role WHERE {?role pro:isHeldBy <https://w3id.org/oc/ccc[[VAR]]>. ?role pro:withRole pro:author . }"],["SELECT ?role WHERE {BIND(<https://w3id.org/oc/ccc[[VAR]]> as ?role)}"]],
                    "links":["https://w3id.org/oc/ccc[[VAR]]","https://w3id.org/ccc/browser/ccc[[VAR]]"]
                }
            },
            "header": [
              {"classes":["20px"]},
              {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
              {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers author_ids"]},
              {"fields": ["orcid"], "classes":["identifiers author_ids orcid_before"]},
              {"classes":["20px"]},
              {"classes":["20px"]},
              {"fields": ["author"], "classes":["header-title wrapline"]}
            ],
            "details": [


            ],
            "metrics": [
                {"fields": ["FREE-TEXT"], "values": ["Summary"], "classes": ["metrics-title"]},
                {"fields": ["num_docs"], "classes": ["num_docs"]},
                //{"fields": ["FREE-TEXT","in_cits_tot","FREE-TEXT"], "values": ["Cited ",null," number of times"], "classes": ["metric-entry","imp-value","metric-entry"]},
                {"fields": ["in_cits_docs"], "classes": ["cited"]}
                //{"classes":["5px"]}
                //{"fields": ["FREE-TEXT","in_cits_docs","FREE-TEXT"], "values": ["\xa0\xa0\xa0 by ",null," different documents"], "classes": ["metric-entry","imp-value","metric-entry"]}
            ],
            "oscar_conf": {
                "progress_loader":{
                          "visible": false,
                          "spinner": false,
                          "title":"Loading the list of Documents ...",
                          //"subtitle":"Be patient - this might take several seconds!"
                          //"abort":{"title":"Abort", "href_link":""}
                        }
            },
            "oscar": [
              {
                "query_text": "author_iri",
                "rule": "author_works",
                "label":"Related documents",
                "config_mod" : [
      							{"key":"categories.[[name,document]].fields.[[title,Year]]" ,"value":"REMOVE_ENTRY"},
      							{"key":"page_limit_def" ,"value":20},
      							{"key":"categories.[[name,document]].fields.[[title,Year]].sort.default" ,"value":{"order": "desc"}},
                    {"key":"progress_loader.visible" ,"value":false},
                    {"key":"timeout.text" ,"value":""}
      					]
              }
            ]
          }
        },
    "publisher": {
          "rule": "ra\/.*",
          "ask_query": `SELECT ?flag
                  WHERE {
                    BIND(
                      EXISTS {
                        ?role pro:isHeldBy <https://w3id.org/oc/ccc/[[VAR]]> ; pro:withRole pro:publisher .}
                      as ?flag)
                  }`,
          "query": `
            SELECT ?orcid ?author_iri ?short_iri ?author ?s_type (COUNT(distinct ?doc) AS ?num_docs) (COUNT(distinct ?cites) AS ?out_cits) (COUNT(distinct ?cited_by) AS ?in_cits_docs) (COUNT(?cited_by) AS ?in_cits_tot) WHERE {
    	         BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?author_iri) .
               BIND(REPLACE(STR(?author_iri), 'https://w3id.org/oc/ccc/', '', 'i') as ?short_iri) .
               OPTIONAL {?author_iri foaf:familyName ?fname .
    	            ?author_iri foaf:givenName ?name .
                  BIND(CONCAT(STR(?name),' ', STR(?fname)) as ?author_pers) .
               }
               OPTIONAL {?author_iri foaf:name ?author_org .}
               BIND(COALESCE(?author_pers, ?author_org) AS ?author).
    	         OPTIONAL {?role pro:isHeldBy ?author_iri ; pro:withRole ?aut_role.
                        ?doc pro:isDocumentContextFor ?role.
                        BIND(REPLACE(STR(?aut_role), 'http://purl.org/spar/pro/', '', 'i') as ?s_type) .
                        OPTIONAL {?doc cito:cites ?cites .}
                        OPTIONAL {?cited_by cito:cites ?doc .}
                  }

               OPTIONAL {
      	          ?author_iri datacite:hasIdentifier [
      		            datacite:usesIdentifierScheme datacite:orcid ;
  			              literal:hasLiteralValue ?orcid
                  ]
    	         }
             } GROUP BY ?orcid ?author_iri ?short_iri ?author ?s_type ?num_docs ?out_cits ?in_cits_docs
             `,
          "links": {
            //"author": {"field":"author_iri"},
            "title": {"field":"doc"},
            "orcid": {"field":"orcid","prefix":"https://orcid.org/"}
          },
          "group_by": {"keys":["author"], "concats":["doc","title","year"]},
          "none_values": {"orcid":"", "author": "", "title": ""},
          "contents": {
            "extra": {
                "browser_view_switch":{
                    "labels":["ldd","Browser"],
                    "values":["short_iri","short_iri"],
                    "regex":["w3id.org\/oc\/ccc\/ra\/.*","w3id.org\/oc\/ccc\/browser\/ra\/.*"],
                    "query":[["PREFIX pro:<http://purl.org/spar/pro/> SELECT ?role WHERE {?role pro:isHeldBy <https://w3id.org/oc/ccc[[VAR]]>. ?role pro:withRole pro:author . }"],["SELECT ?role WHERE {BIND(<https://w3id.org/oc/ccc[[VAR]]> as ?role)}"]],
                    "links":["https://w3id.org/oc/ccc[[VAR]]","https://w3id.org/ccc/browser/ccc[[VAR]]"]
                }
            },
            "header": [
              {"classes":["20px"]},
              {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
              {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers author_ids"]},
              {"fields": ["orcid"], "classes":["identifiers author_ids orcid_before"]},
              {"classes":["20px"]},
              {"classes":["20px"]},
              {"fields": ["author"], "classes":["header-title wrapline"]}
            ],
            "details": [


            ],
            "metrics": [
                {"fields": ["FREE-TEXT"], "values": ["Summary"], "classes": ["metrics-title"]},
                {"fields": ["num_docs"], "classes": ["num_docs"]},
                //{"fields": ["FREE-TEXT","in_cits_tot","FREE-TEXT"], "values": ["Cited ",null," number of times"], "classes": ["metric-entry","imp-value","metric-entry"]},
                {"fields": ["in_cits_docs"], "classes": ["cited"]}
                //{"classes":["5px"]}
                //{"fields": ["FREE-TEXT","in_cits_docs","FREE-TEXT"], "values": ["\xa0\xa0\xa0 by ",null," different documents"], "classes": ["metric-entry","imp-value","metric-entry"]}
            ],
            "oscar_conf": {
                "progress_loader":{
                          "visible": false,
                          "spinner": false,
                          "title":"Loading the list of Documents ...",
                          //"subtitle":"Be patient - this might take several seconds!"
                          //"abort":{"title":"Abort", "href_link":""}
                        }
            },
            "oscar": [
              {
                "query_text": "author_iri",
                "rule": "publisher_journals",
                "label":"Journals",
                "config_mod" : [
      							{"key":"categories.[[name,journal]].fields.[[title,Year]]" ,"value":"REMOVE_ENTRY"},
      							{"key":"page_limit_def" ,"value":20},
      							{"key":"categories.[[name,journal]].fields.[[title,Year]].sort.default" ,"value":{"order": "desc"}},
                    {"key":"progress_loader.visible" ,"value":false},
                    {"key":"timeout.text" ,"value":""}
      					]
              }
            ]
          }
        },
    "role": {
          "rule": "ar\/.*",
          "query": `
            SELECT ?role_iri ?short_iri ?s_type ?author ?author_br_iri ?title ?orcid ?doi ?doc_ref ?doc_br_iri ?year ?j_vol_br_iri ?j_br_iri ?journal ?journal_data
            WHERE {
               BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?role_iri) .
               BIND('[[VAR]]' as ?short_iri) .
               BIND("role" as ?s_type) .
               ?role_iri pro:isHeldBy ?author_iri ;
                     pro:withRole ?aut_role ;
                     ^pro:isDocumentContextFor ?doc ;
                     rdf:type ?type .
               OPTIONAL {?doc dcterms:title ?doc_ref } .
               OPTIONAL {?doc frbr:partOf+ ?journal_iri .
                 ?journal_iri a fabio:Journal ; dcterms:title ?journal .
                 OPTIONAL {?doc prism:publicationDate ?year } .
                 OPTIONAL {
                  ?doc frbr:partOf+ ?j_vol_iri .
                  ?j_vol_iri a fabio:JournalVolume ; fabio:hasSequenceIdentifier ?volume .
                  ?doc frbr:embodiment ?manifestation .
                  ?manifestation prism:startingPage ?start ; prism:endingPage ?end .
                  BIND(CONCAT(', ', ?volume,': ',?start,'-',?end) as ?journal_data) .
                 }
               } .

               BIND(REPLACE(STR(?aut_role), 'http://purl.org/spar/pro/', '', 'i') as ?r_type) .
               OPTIONAL {?author_iri foaf:familyName ?fname .
    	            ?author_iri foaf:givenName ?name .
                  BIND(CONCAT(STR(?name),' ', STR(?fname)) as ?author_pers) .
               }
               OPTIONAL {?author_iri foaf:name ?author_org .}
               BIND(COALESCE(?author_pers, ?author_org, "No name available") AS ?author).
               OPTIONAL {
      	          ?author_iri datacite:hasIdentifier [
      		            datacite:usesIdentifierScheme datacite:orcid ;
  			              literal:hasLiteralValue ?orcid
                  ]
    	         }
               OPTIONAL {
                   ?doc datacite:hasIdentifier [
                   datacite:usesIdentifierScheme datacite:doi ;
                   literal:hasLiteralValue ?doi
                   ] .
                 }
    	         BIND(CONCAT(STR(?name),' ', STR(?fname)) as ?author) .
               BIND(CONCAT(STR(?author), ', ', STR(?r_type), ' of ' ) as ?title) .
               BIND(REPLACE(STR(?author_iri), '/ccc/', '/ccc/browser/', 'i') as ?author_br_iri) .
               BIND(REPLACE(STR(?doc), '/ccc/', '/ccc/browser/', 'i') as ?doc_br_iri) .
               BIND(REPLACE(STR(?journal_iri), '/ccc/', '/ccc/browser/', 'i') as ?j_br_iri) .
               BIND(REPLACE(STR(?j_vol_iri), '/ccc/', '/ccc/browser/', 'i') as ?j_vol_br_iri) .
             }`,
          "links": {
            "doc_ref": {"field":"doc_br_iri","prefix":""},
            "doi": {"field":"doi","prefix":"http://dx.doi.org/"},
            "orcid": {"field":"orcid","prefix":"https://orcid.org/"},
            "journal": {"field":"j_br_iri","prefix":""},
            "journal_data": {"field":"j_vol_br_iri","prefix":""}
          },
          "group_by": {"keys":["title"], "concats":["doc","title","year"]},
          "none_values": {"title": "", "doi":"", "year":"", "journal":"", "journal_data":"", "orcid":""},
          "contents": {
            "extra": {
                "browser_view_switch":{
                    "labels":["ldd","Browser"],
                    "values":["short_iri","short_iri"],
                    "regex":["w3id.org\/oc\/ccc\/ar\/.*","w3id.org\/oc\/ccc\/browser\/ar\/.*"],
                    "query":[["PREFIX pro:<http://purl.org/spar/pro/> SELECT ?role WHERE {?role pro:isHeldBy <https://w3id.org/oc/ccc[[VAR]]>. ?role pro:withRole pro:author . }"],["SELECT ?role WHERE {BIND(<https://w3id.org/oc/ccc[[VAR]]> as ?role)}"]],
                    "links":["https://w3id.org/oc/ccc[[VAR]]","https://w3id.org/ccc/browser/ccc[[VAR]]"]
                }
            },
            "header": [
              {"classes":["20px"]},
              {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
              {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers author_ids"]},
              {"fields": ["orcid"], "classes":["identifiers author_ids orcid_before"]},
              {"classes":["20px"]},
              {"classes":["20px"]},
              {"fields": ["title"], "classes":["header-title wrapline"]},
              {"fields": ["doc_ref"], "classes":["journal-data"]}
            ],
            "details": [
              {"fields": ["journal"], "classes":["journal-data"]},
              {"fields": ["journal_data"], "classes":["journal-data"]},
              {"fields": ["year"], "classes":["journal-data-separator"]},
              {"fields": ["doi"], "classes":["identifiers doi_before"] }

            ],
            "metrics": []
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
      			// 				{"key":"categories.[[name,document]].fields.[[title,Year]]" ,"value":"REMOVE_ENTRY"},
      			// 				{"key":"page_limit_def" ,"value":20},
      			// 				{"key":"categories.[[name,document]].fields.[[title,Year]].sort.default" ,"value":{"order": "desc"}},
            //         {"key":"progress_loader.visible" ,"value":false},
            //         {"key":"timeout.text" ,"value":""}
      			// 		]
            //   }
            // ]
          }
        },
    "citation": {
          "rule": "ci\/.*",
          "query": `
              SELECT ?my_iri ?short_iri ?s_type ?title ?oci ?citing_br_iri ?cited_br_iri ?year ?intrepid ?citing_title ?cited_title
              WHERE {
                BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri) .
                BIND('[[VAR]]' as ?short_iri) .
                # BIND(REPLACE(STR(?short_iri), 'ci/', '', 'i') as ?oci) .
                ?my_iri datacite:hasIdentifier [
                 datacite:usesIdentifierScheme datacite:oci ;
                  literal:hasLiteralValue ?oci ] .
                ?my_iri rdf:type ?type .
                BIND(REPLACE(STR(?type), 'http://purl.org/spar/cito/', '', 'i') as ?s_type) .
                BIND(CONCAT('Citation ', STR(?oci)) as ?title) .

                ?my_iri cito:hasCitingEntity ?citing_iri ; cito:hasCitedEntity ?cited_iri .
                BIND(REPLACE(STR(?citing_iri), '/ccc/', '/ccc/browser/', 'i') as ?citing_br_iri) .
                BIND(REPLACE(STR(?cited_iri), '/ccc/', '/ccc/browser/', 'i') as ?cited_br_iri) .

                OPTIONAL {
                  ?citing_iri dcterms:title ?citing_title .
                }
                OPTIONAL {
                  ?cited_iri dcterms:title ?cited_title .
                }
              }
            `,
          "links": {
            "s_type": {"field":"type","prefix":"http://purl.org/spar/cito/"},
            "citing_title": {"field":"citing_br_iri","prefix":""},
            "cited_title": {"field":"cited_br_iri","prefix":""}
          },
          "group_by": {
            "keys":["title"], "concats":["author","s_type"]
          },
          "none_values": {"citing_title":"No title available", "cited_title":"No title available"},
          "contents": {
            "extra": {
                "browser_view_switch":{
                  "labels":["Switch to metadata view","Switch to browser view"],
                  "values":["short_iri","short_iri"],
                  "regex":["ci\/.*","\/ccc\/browser\/ci\/.*"],
                  "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
                  "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
                }
            },
            "header": [
                {"classes":["20px"]},
                {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
                {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
                {"fields": ["oci"], "classes":["identifiers oci_before"] },
                {"classes":["20px"]},
                {"classes":["20px"]},
                {"fields": ["title"], "classes":["header-title"]},
                {"classes":["20px"]},
                {"classes":["1px"]},
                {"fields": ["FREE-TEXT","citing_title"],"values":["CITING DOCUMENT", null], "classes":["citing_article"]},
                {"fields": ["FREE-TEXT","cited_title"], "values":["CITED DOCUMENT", null], "classes":["cited_article"]}
            ],
            "details": [
              // {"fields": ["journal"], "classes":["journal-data"]},
              // {"fields": ["journal_data"], "classes":["journal-data"]},
              // {"fields": ["year"], "classes":["journal-data-separator"] }
              //{"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Publisher: ", "crossref4doi.message.publisher"]},
            ],
            "oscar_conf": {
                "progress_loader":{
                          "visible": false,
                          "spinner": false,
                          "title":"Loading the list of In-text references ..."
                        }
            },
            "oscar": [
              {
                "query_text": "my_iri",
                "rule": "intext_refs_for_citation",
                "label":"In-text references",
                "config_mod" : [
                    {"key":"page_limit_def" ,"value":30},
                    {"key":"categories.[[name,intext_ref]].fields.[[intrepid]].sort.default" ,"value":{"order": "desc"}},
                    {"key":"progress_loader.visible" ,"value":true},
                    {"key":"timeout.text" ,"value":""}
                ]
              }
            ]
          }
    },
    "discourse_element": {
      "rule": "de\/.*",
      "query": `
          SELECT ?my_iri ?short_iri ?s_type ?seq_number ?title ?citing_br_iri ?short_citing_iri ?article_title ?table_br_iri ?table_num ?parent_iri ?parent_br_iri ?parent_title ?paragraph_iri ?paragraph_num ?paragraph_br_iri ?source_xml ?source_xml_iri (COUNT(distinct ?rp) AS ?intext_refs)
          WHERE {
            BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri) .
            BIND('[[VAR]]' as ?short_iri) .
            ?my_iri rdf:type ?type .
            BIND("Discourse Element" AS ?s_type).
            OPTIONAL {
              ?my_iri rdf:type ?d_type .
              FILTER( STRSTARTS(STR(?d_type),str(doco:)) ).
              BIND(REPLACE(STR(?d_type), 'http://purl.org/spar/doco/', '', 'i') as ?doco_type) .
            }
            OPTIONAL {
              ?my_iri rdf:type ?d_type .
              FILTER( STRSTARTS(STR(?d_type),str(deo:Cap)) ).
              BIND(REPLACE(STR(?d_type), 'http://purl.org/spar/deo/', '', 'i') as ?deo_type) .
            }
            OPTIONAL {?my_iri fabio:hasSequenceIdentifier ?seq_number .}
            OPTIONAL {?my_iri dcterms:title ?el_title .}
            BIND(COALESCE( CONCAT(": '",STR(?el_title),"'" ) , "") AS ?el_title_title).
            BIND(COALESCE(?doco_type, ?deo_type, ?s_type, "") AS ?part_title).
            BIND(COALESCE( CONCAT(' n. ', STR(?seq_number)) , "") AS ?seq_number_title).
            BIND(CONCAT(STR(?part_title), ?seq_number_title, ?el_title_title) as ?title) .

            ?my_iri ^frbr:part+ ?citing_iri .
            ?citing_iri datacite:hasIdentifier [
              datacite:usesIdentifierScheme datacite:pmid ;
              literal:hasLiteralValue ?id_pmid ] .
            OPTIONAL {?citing_iri dcterms:title ?article_title .}
            OPTIONAL {?my_iri ^frbr:part+ ?table_iri .
              ?table_iri a doco:Table ; fabio:hasSequenceIdentifier ?table_num .
              BIND(REPLACE(STR(?table_iri), '/ccc/','/ccc/browser/', 'i') as ?table_br_iri) .

            }
            OPTIONAL {?my_iri ^frbr:part+ ?parent_iri .
              ?parent_iri a doco:Section ; dcterms:title ?parent_title .
              BIND(REPLACE(STR(?parent_iri),'/ccc/','/ccc/browser/','i') as ?parent_br_iri).
            }
            OPTIONAL {?my_iri ^frbr:part+ ?paragraph_iri .
              ?paragraph_iri a doco:Paragraph ; fabio:hasSequenceIdentifier ?paragraph_num .
              BIND(REPLACE(STR(?paragraph_iri), '/ccc/','/ccc/browser/', 'i') as ?paragraph_br_iri) .
            }

            ?my_iri frbr:part*/c4o:isContextOf/co:element* ?rp . ?rp a c4o:InTextReferencePointer .
            BIND(COALESCE(?article_title, "No title available") AS ?article_title).
            BIND(REPLACE(STR(?citing_iri), 'https://w3id.org/oc/ccc/', '', 'i') as ?short_citing_iri) .
            BIND(REPLACE(STR(?citing_iri), '/ccc/','/ccc/browser/', 'i') as ?citing_br_iri) .
            BIND(?id_pmid AS ?source_xml).
            BIND(CONCAT("https://www.ebi.ac.uk/europepmc/webservices/rest/", STR(?id_pmid), "/fullTextXML") as ?source_xml_iri) .
          } GROUP BY ?my_iri ?short_iri ?s_type ?seq_number ?title ?citing_br_iri ?short_citing_iri ?article_title ?table_br_iri ?table_num ?parent_iri ?parent_br_iri ?parent_title ?paragraph_iri ?paragraph_num ?paragraph_br_iri ?source_xml ?source_xml_iri
        `,
      "links": {
        "source_xml": {"field":"source_xml_iri","prefix":""},
        "article_title": {"field":"citing_br_iri","prefix":""},
        "parent_title": {"field":"parent_br_iri","prefix":""},
        "paragraph_num": {"field":"paragraph_br_iri","prefix":""},
        "table_num": {"field":"table_br_iri","prefix":""}
      },
      "group_by": {
        "keys":["title"], "concats":["short_iri","s_type"]
      },
      "none_values": {"source_xml": "", "seq_number": "unknown", "parent_iri":"","parent_title":"","paragraph_num":"", "table_br_iri":"", "table_num":""},
      "text_mapping": {
          "s_type":[
              {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
          ]
      },
      "contents": {
        "extra": {
            "browser_view_switch":{
              "labels":["Switch to metadata view","Switch to browser view"],
              "values":["short_iri","short_iri"],
              "regex":["de\/.*","\/ccc\/browser\/de\/.*"],
              "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
              "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
            }
        },
        "header": [
            {"classes":["20px"]},
            {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
            {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
            {"fields": ["source_xml"], "classes":["identifiers source_before"] },
            {"classes":["20px"]},
            {"classes":["20px"]},
            {"fields": ["title"], "classes":["header-title"]},
            {"classes":["20px"]},
            {"classes":["1px"]},
            {"fields": ["table_num"], "classes":["info_box in_table"]},
            {"fields": ["paragraph_num"], "classes":["info_box in_paragraph"]},
            {"fields": ["parent_title"], "classes":["info_box in_section"]},
            {"fields": ["article_title"], "classes":["info_box in_article"]}
        ],
        "details": [
          // {"fields": ["journal"], "classes":["journal-data"]},
          // {"fields": ["journal_data"], "classes":["journal-data"]},
          // {"fields": ["year"], "classes":["journal-data-separator"] }
          //{"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Publisher: ", "crossref4doi.message.publisher"]},
        ],
      "metrics": [
        {"fields": ["FREE-TEXT"], "values": ["Includes"], "classes": ["metrics-title"]},
        {"fields": ["intext_refs"], "classes": ["intext_refs"]}
      ],
      "oscar_conf": {
          "progress_loader":{
                    "visible": false,
                    "spinner": false,
                    "title":"Loading the list of In-text references ..."
                  }
      },
      "oscar": [
        {
          "query_text": "my_iri",
          "rule": "intext_refs_list",
          "label":"In-text references",
          "config_mod" : [
              {"key":"page_limit_def" ,"value":30},
              {"key":"categories.[[name,intext_ref]].fields.[[intrepid]].sort.default" ,"value":{"order": "desc"}},
              {"key":"progress_loader.visible" ,"value":true},
              {"key":"timeout.text" ,"value":""}
          ]
        }
      ]
      }
},
    "pointer": {
      "rule": "rp\/.*",
      "query": `
          SELECT ?my_iri ?short_iri ?s_type ?intrepid ?title ?be_text ?be_br_iri ?pl_title ?pl_br_iri ?sentence_num ?sent_br_iri ?table_num ?table_br_iri ?caption_num ?caption_br_iri ?footnote_num ?footnote_br_iri ?paragraph_num ?paragraph_br_iri ?section_title ?section_br_iri ?article_title ?article_br_iri
          WHERE {
            BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri) .
            BIND('[[VAR]]' as ?short_iri) .
            ?my_iri rdf:type ?type ; datacite:hasIdentifier [
              datacite:usesIdentifierScheme datacite:intrepid ;
              literal:hasLiteralValue ?intrepid
              ] .
            BIND("In-text Reference Pointer" AS ?s_type).
            OPTIONAL {?my_iri c4o:hasContent ?rp_title .}

            OPTIONAL {?my_iri ^co:element ?pl_iri . ?pl_iri c4o:hasContent ?pl_title .
              BIND(REPLACE(STR(?pl_iri),'/ccc/','/ccc/browser/','i') as ?pl_br_iri).}

            OPTIONAL {?my_iri ^co:element*/^c4o:isContextOf+ ?sentence .
              ?sentence a doco:Sentence ; fabio:hasSequenceIdentifier ?sentence_num .
              BIND(REPLACE(STR(?sentence),'/ccc/','/ccc/browser/','i') as ?sent_br_iri).}

            OPTIONAL {?my_iri ^co:element*/^c4o:isContextOf+/^frbr:part+ ?parent .
                ?parent a doco:Table ; fabio:hasSequenceIdentifier ?table_num .
                BIND(REPLACE(STR(?parent),'/ccc/','/ccc/browser/','i') as ?table_br_iri).}
            OPTIONAL {?my_iri ^co:element*/^c4o:isContextOf+/^frbr:part+ ?parent .
                ?parent a doco:Footnote ; fabio:hasSequenceIdentifier ?footnote_num .
                BIND(REPLACE(STR(?parent),'/ccc/','/ccc/browser/','i') as ?footnote_br_iri).}
            OPTIONAL {?my_iri ^co:element*/^c4o:isContextOf+/^frbr:part+ ?parent .
                ?parent a deo:Caption ; fabio:hasSequenceIdentifier ?caption_num .
                BIND(REPLACE(STR(?parent),'/ccc/','/ccc/browser/','i') as ?caption_br_iri).}
            OPTIONAL {?my_iri ^co:element*/^c4o:isContextOf+/^frbr:part+ ?parent .
                ?parent a doco:Paragraph ; fabio:hasSequenceIdentifier ?paragraph_num .
                BIND(REPLACE(STR(?parent),'/ccc/','/ccc/browser/','i') as ?paragraph_br_iri).}

            OPTIONAL {?my_iri ^co:element*/^c4o:isContextOf+/^frbr:part+ ?parent_sec .
                ?parent_sec a doco:Section ; fabio:hasSequenceIdentifier ?section_num .
                OPTIONAL {?parent_sec dcterms:title ?section_title .} .
                BIND(REPLACE(STR(?parent_sec),'/ccc/','/ccc/browser/','i') as ?section_br_iri).
                }

            ?my_iri ^co:element*/^c4o:isContextOf+/^frbr:part+ ?article .
                ?article a fabio:Expression .
            OPTIONAL {?article dcterms:title ?article_title .}
            BIND(COALESCE(?article_title, "No title available") AS ?article_title) .
            BIND(REPLACE(STR(?article),'/ccc/','/ccc/browser/','i') as ?article_br_iri).

            OPTIONAL {?my_iri c4o:denotes ?be . ?be c4o:hasContent ?be_text ; biro:references ?br_iri .}
            BIND(REPLACE(STR(?be),'/ccc/','/ccc/browser/','i') as ?be_br_iri).
            BIND(COALESCE(?rp_title, ?pl_title, "no text available") AS ?title) .
            BIND(COALESCE(?be_text, "No bibliographic reference available.") AS ?be_text) .
          }
        `,
      "links": {
        "be_text": {"field":"be_br_iri","prefix":""},
        "pl_title": {"field":"pl_br_iri","prefix":""},
        "sentence_num": {"field":"sent_br_iri","prefix":""},
        "footnote_num": {"field":"footnote_br_iri","prefix":""},
        "caption_num": {"field":"caption_br_iri","prefix":""},
        "table_num": {"field":"table_br_iri","prefix":""},
        "paragraph_num": {"field":"paragraph_br_iri","prefix":""},
        "section_title": {"field":"section_br_iri","prefix":""},
        "article_title": {"field":"article_br_iri","prefix":""}
      },
      "none_values": {"pl_title":"","sentence_num":"","footnote_num":"","table_num":"","caption_num":"","paragraph_num":"","section_title":"No title", "article_title":"No title available"},
      "text_mapping": {
          "s_type":[
              {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
          ]
      },
      "contents": {
        "extra": {
            "browser_view_switch":{
              "labels":["Switch to metadata view","Switch to browser view"],
              "values":["short_iri","short_iri"],
              "regex":["rp\/.*","\/ccc\/browser\/rp\/.*"],
              "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
              "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
            }
        },
        "header": [
            {"classes":["20px"]},
            {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
            {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
            {"fields": ["intrepid"], "classes":["identifiers intrepid_before"] },
            {"classes":["20px"]},
            {"classes":["20px"]},
            {"fields": ["title"], "classes":["header-title"]},
            {"fields": ["pl_title"], "classes":["info_box in_list"]},
            {"fields": ["footnote_num"], "classes":["info_box in_footnote"]},
            {"fields": ["table_num"], "classes":["info_box in_table"]},
            {"fields": ["caption_num"], "classes":["info_box in_caption"]},
            {"fields": ["sentence_num"], "classes":["info_box in_sentence"]},
            {"fields": ["paragraph_num"], "classes":["info_box in_paragraph"]},
            {"fields": ["section_title"], "classes":["info_box in_section"]},
            {"fields": ["be_text"], "classes":["info_box be_cited"]},
            {"fields": ["article_title"], "classes":["info_box in_article"]}
        ],
        "details": [
          // {"fields": ["journal"], "classes":["journal-data"]},
          // {"fields": ["journal_data"], "classes":["journal-data"]},
          // {"fields": ["year"], "classes":["journal-data-separator"] }
          //{"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Publisher: ", "crossref4doi.message.publisher"]},
        ],
      "oscar_conf": {
          "progress_loader":{
                    "visible": false,
                    "spinner": false,
                    "title":"Loading the list of In-text references ..."
                  }
      },
      "oscar": [
        {
          "query_text": "my_iri",
          "rule": "cocited_list",
          "label":"Co-cited in-text references",
          "config_mod" : [
              {"key":"page_limit_def" ,"value":30},
              {"key":"categories.[[name,intext_ref]].fields.[[intrepid]].sort.default" ,"value":{"order": "desc"}},
              {"key":"progress_loader.visible" ,"value":true},
              {"key":"timeout.text" ,"value":""}
          ]
        }
      ]
      }
    },
    "pointer_list": {
      "rule": "pl\/.*",
      "query": `
          SELECT ?my_iri ?short_iri ?s_type ?source_xml ?source_xml_iri ?title ?be_text ?be_br_iri ?pl_title ?pl_br_iri ?sentence_num ?sent_br_iri ?table_num ?table_br_iri ?caption_num ?caption_br_iri ?footnote_num ?footnote_br_iri ?paragraph_num ?paragraph_br_iri ?section_title ?section_br_iri ?article_title ?article_br_iri
          WHERE {
            BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri) .
            BIND('[[VAR]]' as ?short_iri) .

            BIND("In-text Reference Pointer List" AS ?s_type).
            OPTIONAL {?my_iri c4o:hasContent ?pl_title .}
            ?my_iri co:element ?rp_iri .
            OPTIONAL {?my_iri ^c4o:isContextOf ?sentence .
              ?sentence a doco:Sentence ; fabio:hasSequenceIdentifier ?sentence_num .
              BIND(REPLACE(STR(?sentence),'/ccc/','/ccc/browser/','i') as ?sent_br_iri).}

            OPTIONAL {?my_iri ^c4o:isContextOf+/^frbr:part+ ?parent .
                ?parent a doco:Table ; fabio:hasSequenceIdentifier ?table_num .
                BIND(REPLACE(STR(?parent),'/ccc/','/ccc/browser/','i') as ?table_br_iri).}
            OPTIONAL {?my_iri ^c4o:isContextOf+/^frbr:part+ ?parent .
                ?parent a doco:Footnote ; fabio:hasSequenceIdentifier ?footnote_num .
                BIND(REPLACE(STR(?parent),'/ccc/','/ccc/browser/','i') as ?footnote_br_iri).}
            OPTIONAL {?my_iri ^c4o:isContextOf+/^frbr:part+ ?parent .
                ?parent a deo:Caption ; fabio:hasSequenceIdentifier ?caption_num .
                BIND(REPLACE(STR(?parent),'/ccc/','/ccc/browser/','i') as ?caption_br_iri).}
            OPTIONAL {?my_iri ^c4o:isContextOf+/^frbr:part+ ?parent .
                ?parent a doco:Paragraph ; fabio:hasSequenceIdentifier ?paragraph_num .
                BIND(REPLACE(STR(?parent),'/ccc/','/ccc/browser/','i') as ?paragraph_br_iri).}

            OPTIONAL {?my_iri ^c4o:isContextOf+/^frbr:part+ ?parent_sec .
                ?parent_sec a doco:Section ; fabio:hasSequenceIdentifier ?section_num .
                OPTIONAL {?parent_sec dcterms:title ?section_title .} .
                BIND(REPLACE(STR(?parent_sec),'/ccc/','/ccc/browser/','i') as ?section_br_iri).
                }

            ?my_iri ^c4o:isContextOf+/^frbr:part+ ?article .
                ?article a fabio:Expression ; datacite:hasIdentifier [
              datacite:usesIdentifierScheme datacite:pmid ;
              literal:hasLiteralValue ?source_xml ] .
            BIND(CONCAT("https://www.ebi.ac.uk/europepmc/webservices/rest/", STR(?source_xml), "/fullTextXML") as ?source_xml_iri) .
            OPTIONAL {?article dcterms:title ?article_title .}
            BIND(COALESCE(?article_title, "No title available") AS ?article_title) .
            BIND(REPLACE(STR(?article),'/ccc/','/ccc/browser/','i') as ?article_br_iri).

            BIND(COALESCE(?pl_title, "no text available") AS ?title) .

          }
        `,
      "links": {
        "source_xml": {"field":"source_xml_iri","prefix":""},
        "sentence_num": {"field":"sent_br_iri","prefix":""},
        "footnote_num": {"field":"footnote_br_iri","prefix":""},
        "caption_num": {"field":"caption_br_iri","prefix":""},
        "table_num": {"field":"table_br_iri","prefix":""},
        "paragraph_num": {"field":"paragraph_br_iri","prefix":""},
        "section_title": {"field":"section_br_iri","prefix":""},
        "article_title": {"field":"article_br_iri","prefix":""}
      },
      "none_values": {"sentence_num":"","footnote_num":"","table_num":"","caption_num":"","paragraph_num":"","section_title":"No title", "article_title":"No title available","source_xml":"Not available"},
      "text_mapping": {
          "s_type":[
              {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
          ]
      },
      "contents": {
        "extra": {
            "browser_view_switch":{
              "labels":["Switch to metadata view","Switch to browser view"],
              "values":["short_iri","short_iri"],
              "regex":["pl\/.*","\/ccc\/browser\/pl\/.*"],
              "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
              "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
            }
        },
        "header": [
            {"classes":["20px"]},
            {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
            {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
            {"fields": ["source_xml"], "classes":["identifiers source_before"] },
            {"classes":["20px"]},
            {"classes":["20px"]},
            {"fields": ["title"], "classes":["header-title"]},
            {"classes":["20px"]},
            {"fields": ["footnote_num"], "classes":["info_box in_footnote"]},
            {"fields": ["table_num"], "classes":["info_box in_table"]},
            {"fields": ["caption_num"], "classes":["info_box in_caption"]},
            {"fields": ["sentence_num"], "classes":["info_box in_sentence"]},
            {"fields": ["paragraph_num"], "classes":["info_box in_paragraph"]},
            {"fields": ["section_title"], "classes":["info_box in_section"]},
            {"fields": ["article_title"], "classes":["info_box in_article"]}
        ],
        "details": [
          // {"fields": ["journal"], "classes":["journal-data"]},
          // {"fields": ["journal_data"], "classes":["journal-data"]},
          // {"fields": ["year"], "classes":["journal-data-separator"] }
          //{"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Publisher: ", "crossref4doi.message.publisher"]},
        ],
      "oscar_conf": {
          "progress_loader":{
                    "visible": false,
                    "spinner": false,
                    "title":"Loading the list of In-text references ..."
                  }
      },
      "oscar": [
        {
          "query_text": "my_iri",
          "rule": "intext_refs_list_in_pl",
          "label":"In-text references",
          "config_mod" : [
              {"key":"page_limit_def" ,"value":30},
              {"key":"categories.[[name,intext_ref]].fields.[[intrepid]].sort.default" ,"value":{"order": "desc"}},
              {"key":"progress_loader.visible" ,"value":true},
              {"key":"timeout.text" ,"value":""}
          ]
        }
      ]
      }
    },
    "bib_entry": {
      "rule": "be\/.*",
      "query": `
          SELECT ?my_iri ?short_iri ?s_type ?source_xml ?source_xml_iri ?title ?pl_title ?article_title ?article_br_iri ?cited_title ?cited_br_iri
          WHERE {
            BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri) .
            BIND('[[VAR]]' as ?short_iri) .

            BIND("Bibliographic Entry" AS ?s_type).
            OPTIONAL {?my_iri c4o:hasContent ?pl_title .}

            ?my_iri ^frbr:part+ ?article .
                ?article a fabio:Expression ; datacite:hasIdentifier [
              datacite:usesIdentifierScheme datacite:pmid ;
              literal:hasLiteralValue ?source_xml ] .
            ?my_iri biro:references ?cited_iri .
            OPTIONAL {?cited_iri dcterms:title ?cited_title.}
            BIND(CONCAT("https://www.ebi.ac.uk/europepmc/webservices/rest/", STR(?source_xml), "/fullTextXML") as ?source_xml_iri) .
            OPTIONAL {?article dcterms:title ?article_title .}
            BIND(COALESCE(?article_title, "No title available") AS ?article_title) .
            BIND(COALESCE(?cited_title, "No title available") AS ?cited_title) .
            BIND(REPLACE(STR(?article),'/ccc/','/ccc/browser/','i') as ?article_br_iri).
            BIND(REPLACE(STR(?cited_iri),'/ccc/','/ccc/browser/','i') as ?cited_br_iri).

            BIND(COALESCE(?pl_title, "no text available") AS ?title) .

          }
        `,
      "links": {
        "article_title": {"field":"article_br_iri","prefix":""},
        "cited_title": {"field":"cited_br_iri","prefix":""},
        "source_xml": {"field":"source_xml_iri","prefix":""}
      },
      "none_values": {"article_title":"No title available","source_xml":"Not available"},
      "text_mapping": {
          "s_type":[
              {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
          ]
      },
      "contents": {
        "extra": {
            "browser_view_switch":{
              "labels":["Switch to metadata view","Switch to browser view"],
              "values":["short_iri","short_iri"],
              "regex":["be\/.*","\/ccc\/browser\/be\/.*"],
              "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
              "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
            }
        },
        "header": [
            {"classes":["20px"]},
            {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
            {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
            {"fields": ["source_xml"], "classes":["identifiers source_before"] },
            {"classes":["20px"]},
            {"classes":["20px"]},
            {"fields": ["title"], "classes":["header-title"]},
            {"classes":["20px"]},
            {"fields": ["article_title"], "classes":["info_box in_article"]},
            {"fields": ["cited_title"], "classes":["info_box ref_article"]}
        ],
        "details": [
          // {"fields": ["journal"], "classes":["journal-data"]},
          // {"fields": ["journal_data"], "classes":["journal-data"]},
          // {"fields": ["year"], "classes":["journal-data-separator"] }
          //{"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Publisher: ", "crossref4doi.message.publisher"]},
        ],
      "oscar_conf": {
          "progress_loader":{
                    "visible": false,
                    "spinner": false,
                    "title":"Loading the list of In-text references ..."
                  }
      },
      "oscar": [
        {
          "query_text": "my_iri",
          "rule": "intext_refs_list_for_be",
          "label":"In-text references",
          "config_mod" : [
              {"key":"page_limit_def" ,"value":30},
              {"key":"categories.[[name,intext_ref]].fields.[[intrepid]].sort.default" ,"value":{"order": "desc"}},
              {"key":"progress_loader.visible" ,"value":true},
              {"key":"timeout.text" ,"value":""}
          ]
        }
      ]
      }
    },
    "annotation": {
      "rule": "an\/.*",
      "query": `
          SELECT ?my_iri ?short_iri ?s_type ?title
          ?article_title ?article_br_iri
          ?cited_article_title ?cited_article_br_iri
          ?citation_title ?citation_br_iri
          ?be_br_iri ?rp_br_iri ?be_title ?rp_title
          WHERE {
            BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri) .
            BIND('[[VAR]]' as ?short_iri) .
            BIND("Annotation" AS ?s_type).
            ?my_iri oa:hasBody ?citation_iri ; ^oco:hasAnnotation ?be_or_rp_iri .
            ?citation_iri cito:hasCitingEntity ?article_iri ; cito:hasCitedEntity ?cited_article_iri.

            OPTIONAL {?article_iri dcterms:title ?article_title .}
            OPTIONAL {?cited_article_iri dcterms:title ?cited_article_title .}

            OPTIONAL {?be_or_rp_iri a c4o:InTextReferencePointer .
                OPTIONAL { ?be_or_rp_iri ^co:element*/c4o:hasContent ?rp_title .}
                BIND(REPLACE(STR(?be_or_rp_iri),'/ccc/','/ccc/browser/','i') as ?rp_br_iri).
            }

            OPTIONAL {?be_or_rp_iri a biro:BibliographicReference .
                OPTIONAL { ?be_or_rp_iri c4o:hasContent ?be_title .}
                BIND(REPLACE(STR(?be_or_rp_iri),'/ccc/','/ccc/browser/','i') as ?be_br_iri).
            }

            BIND(REPLACE(STR(?article_iri),'/ccc/','/ccc/browser/','i') as ?article_br_iri).
            BIND(REPLACE(STR(?cited_article_iri),'/ccc/','/ccc/browser/','i') as ?cited_article_br_iri).

            BIND(REPLACE(STR(?citation_iri),'/ccc/','/ccc/browser/','i') as ?citation_br_iri).
            ?citation_iri datacite:hasIdentifier [
              datacite:usesIdentifierScheme datacite:oci ;
              literal:hasLiteralValue ?cit_num ] .
            # BIND(REPLACE(STR(?citation_iri),'https://w3id.org/oc/ccc/ci/','','i') as ?cit_num).
            BIND(CONCAT("Annotation on citation OCI: ", ?cit_num) AS ?title) .
          }
        `,
      "links": {
        "article_title": {"field":"article_br_iri","prefix":""},
        "cited_article_title": {"field":"cited_article_br_iri","prefix":""},
        "be_title": {"field":"be_br_iri","prefix":""},
        "rp_title": {"field":"rp_br_iri","prefix":""}
      },
      "none_values": {"rp_title": "", "be_title":"", "article_title":"No title available","cited_article_title":"No title available"},
      "text_mapping": {
          "s_type":[
              {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
          ]
      },
      "contents": {
        "extra": {
            "browser_view_switch":{
              "labels":["Switch to metadata view","Switch to browser view"],
              "values":["short_iri","short_iri"],
              "regex":["an\/.*","\/ccc\/browser\/an\/.*"],
              "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
              "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
            }
        },
        "header": [
            {"classes":["20px"]},
            {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
            {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
            {"classes":["20px"]},
            {"classes":["20px"]},
            {"classes":["20px"]},
            {"fields": ["title"], "classes":["header-title"]},
            {"classes":["20px"]},
            {"fields": ["be_title"], "classes":["info_box ref_be"]},
            {"fields": ["rp_title"], "classes":["info_box rp_annotation"]},
            {"fields": ["article_title"], "classes":["info_box in_article"]},
            {"fields": ["cited_article_title"], "classes":["info_box ref_article"]}

        ],
        "details": [
          // {"fields": ["journal"], "classes":["journal-data"]},
          // {"fields": ["journal_data"], "classes":["journal-data"]},
          // {"fields": ["year"], "classes":["journal-data-separator"] }
          //{"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Publisher: ", "crossref4doi.message.publisher"]},
        ]
      }
    },
    "identifier": {
      "rule": "id\/.*",
      "query": `
          SELECT ?my_iri ?short_iri ?s_type ?id_type ?title ?entity_title ?entity_br_iri
          WHERE {
            BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri) .
            BIND('[[VAR]]' as ?short_iri) .
            BIND("Identifier" AS ?s_type).
            OPTIONAL {?my_iri literal:hasLiteralValue ?id_title }.
            ?my_iri datacite:usesIdentifierScheme ?id_type_uri ;
              ^datacite:hasIdentifier ?entity_iri .
            OPTIONAL {?entity_iri dcterms:title ?ent_title }.
            OPTIONAL {?entity_iri ^co:element*/c4o:hasContent ?rp_or_pl_title }.
            OPTIONAL {?entity_iri foaf:name ?org_title }.
            OPTIONAL {?entity_iri foaf:familyName ?fname .
               ?author_iri foaf:givenName ?name .
               BIND(CONCAT(STR(?name),' ', STR(?fname)) as ?author_title) .
            }
            BIND(COALESCE(?ent_title, ?rp_or_pl_title, ?org_title, ?author_title, "No text available") AS ?entity_title).

            BIND(REPLACE(STR(?entity_iri), '/ccc/', '/ccc/browser/', 'i') as ?entity_br_iri) .
            BIND(COALESCE(?id_title, "No text available") AS ?id_title).
            BIND(UCASE(STRAFTER(STR(?id_type_uri), "datacite/")) as ?id_type).
            BIND(STR(?id_title) AS ?title).
          }
        `,
      "links": {
        "entity_title": {"field":"entity_br_iri","prefix":""}
      },
      "none_values": {},
      "text_mapping": {
          "id_type":[
              {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
          ]
      },
      "contents": {
        "extra": {
            "browser_view_switch":{
              "labels":["Switch to metadata view","Switch to browser view"],
              "values":["short_iri","short_iri"],
              "regex":["id\/.*","\/ccc\/browser\/id\/.*"],
              "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
              "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
            }
        },
        "header": [
            {"classes":["20px"]},
            {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
            {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
            {"classes":["20px"]},
            {"classes":["20px"]},
            {"fields": ["id_type"], "classes":["identifiers id_schema_before"]},
            {"fields": ["title"], "classes":["header-title"]},
            {"classes":["20px"]},
            {"fields": ["entity_title"], "classes":["info_box identified_entity"]}

        ],
        "details": [
          // {"fields": ["journal"], "classes":["journal-data"]},
          // {"fields": ["journal_data"], "classes":["journal-data"]},
          // {"fields": ["year"], "classes":["journal-data-separator"] }
          //{"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Publisher: ", "crossref4doi.message.publisher"]},
        ]
      }
    },
    "resource_embodiment": {
      "rule": "re\/.*",
      "query": `
          SELECT ?my_iri ?short_iri ?s_type ?id_type ?title ?entity_title ?entity_br_iri ?journal_data
          WHERE {
            BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?my_iri) .
            BIND('[[VAR]]' as ?short_iri) .
            BIND("Resource embodiment" AS ?s_type).
            ?my_iri ^frbr:embodiment ?article_iri ;
              prism:startingPage ?start;prism:endingPage ?end.
            BIND(CONCAT('pages ', ?start,'-',?end) as ?journal_data).
            OPTIONAL {?article_iri dcterms:title ?article_title }.
            BIND(COALESCE(?article_title, "No title available") AS ?entity_title).
            BIND(REPLACE(STR(?article_iri),'/ccc/','/ccc/browser/','i') as ?entity_br_iri).
            BIND(CONCAT("Edition of document '",?article_title,"'") AS ?title).
          }
        `,
      "links": {
        "entity_title": {"field":"entity_br_iri","prefix":""}
      },
      "none_values": {},
      "text_mapping": {
          "id_type":[
              {"regex": /([a-z])([A-Z])/g, "value":"$1 $2"}
          ]
      },
      "contents": {
        "extra": {
            "browser_view_switch":{
              "labels":["Switch to metadata view","Switch to browser view"],
              "values":["short_iri","short_iri"],
              "regex":["re\/.*","\/ccc\/browser\/re\/.*"],
              "query":[["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"],["SELECT ?resource WHERE {BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?resource)}"]],
              "links":["https://w3id.org/oc/ccc/[[VAR]]","https://w3id.org/oc/ccc/browser/[[VAR]]"]
            }
        },
        "header": [
            {"classes":["20px"]},
            {"fields": ["s_type"], "concat_style":{"s_type": "last"} , "classes":["doc-type"]},
            {"fields": ["FREE-TEXT","short_iri"], "values":["Corpus ID: ", null] , "classes":["identifiers"]},
            {"classes":["20px"]},
            {"classes":["20px"]},
            {"classes":["20px"]},
            {"fields": ["title"], "classes":["header-title"]},
            {"fields": ["journal_data"], "classes":["journal-data"]},
            {"fields": ["entity_title"], "classes":["info_box identified_entity"]}

        ],
        "details": [
          // {"fields": ["journal"], "classes":["journal-data"]},

          // {"fields": ["year"], "classes":["journal-data-separator"] }
          //{"fields": ["FREE-TEXT", "EXT_DATA"], "values": ["Publisher: ", "crossref4doi.message.publisher"]},
        ]
      }
    }
  }
}



//"FUNC" {"name": call_crossref, "param":{"fields":[],"vlaues":[]}}
function call_crossref(str_doi, field){
  var call_crossref_api = "https://api.crossref.org/works/";
  var call_url =  call_crossref_api+ encodeURIComponent(str_doi);
  console.log(str_doi);
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

function call_ramose(str_doi,field) {
  var call_ramose_api_metadata = "https://w3id.org/oc/ccc/api/v1/citations/";
  var call_full = call_ramose_api_metadata + encodeURIComponent(str_doi);
  var result_data = "";
  $.ajax({
        dataType: "json",
        url: call_full,
        type: 'GET',
        async: false,
        success: function( res_obj ) {
            if (field == 1) {
              result_data = res_obj[0];
            }else {
              if (!b_util.is_undefined_key(res_obj[0],field)) {
                result_data = b_util.get_obj_key_val(res_obj[0],field);
              }
            }
        }
   });
   return result_data;
}

//Heuristics
function more_than_zero(val){
  return parseInt(val) > 0
}
