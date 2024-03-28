var search_conf = {
  "sparql_endpoint": "https://opencitations.net/ccc/sparql",
  "prefixes": [
      {"prefix":"cito","iri":"http://purl.org/spar/cito/"},
      {"prefix":"dcterms","iri":"http://purl.org/dc/terms/"},
      {"prefix":"datacite","iri":"http://purl.org/spar/datacite/"},
      {"prefix":"literal","iri":"http://www.essepuntato.it/2010/06/literalreification/"},
      {"prefix":"biro","iri":"http://purl.org/spar/biro/"},
      {"prefix":"frbr","iri":"http://purl.org/vocab/frbr/core#"},
      {"prefix":"co","iri":"http://purl.org/co/"},
      {"prefix":"c4o","iri":"http://purl.org/spar/c4o/"},
      {"prefix":"bds","iri":"http://www.bigdata.com/rdf/search#"},
      {"prefix":"deo","iri":"http://purl.org/spar/deo/"},
      {"prefix":"doco","iri":"http://purl.org/spar/doco/"},
      {"prefix":"fabio","iri":"http://purl.org/spar/fabio/"},
      {"prefix":"pro","iri":"http://purl.org/spar/pro/"},
      {"prefix":"oa","iri":"http://www.w3.org/ns/oa#"},
      {"prefix":"oco","iri":"https://w3id.org/oc/ontology/"},
      {"prefix":"rdf","iri":"http://www.w3.org/1999/02/22-rdf-syntax-ns#"},
      {"prefix":"prism","iri":"http://prismstandard.org/namespaces/basic/2.0/"}
    ],

  "rules":  [
    {
      "name":"doi",
      "label": "With a specific DOI",
      "placeholder": "DOI e.g. 10.1080/14756366.2020.1740695",
      "advanced": true,
      "freetext": true,
      "heuristics": [["lower_case"]],
      "category": "document",
      "regex":"(10.\\d{4,9}\/[-._;()/:A-Za-z0-9][^\\s]+)",
      "query": [`
              ?doi bds:search "[[VAR]]" ;
                     bds:matchExact "true" .
              ?doi_iri literal:hasLiteralValue ?doi ; datacite:usesIdentifierScheme datacite:doi .
              ?iri datacite:hasIdentifier ?doi_iri .`
      ]
    },
    {
      "name":"issues_list",
      "label": "List of issues included in a volume identified by IRI",
      "category": "issue",
      "regex":"(https:\/\/w3id\\.org\/oc\/ccc\/br\/\\d{1,})",
      "query": [`
              <[[VAR]]> ^frbr:partOf ?iri .
              ?iri a fabio:JournalIssue . `
      ]
    },
    {
      "name":"volumes_list",
      "label": "List of volumes included in a journal identified by IRI",
      "category": "volume",
      "regex":"(https:\/\/w3id\\.org\/oc\/ccc\/br\/\\d{1,})",
      "query": [`
              <[[VAR]]> ^frbr:partOf ?iri .
              ?iri a fabio:JournalVolume . `
      ]
    },
    {
      "name":"articles_in_issue_list",
      "label": "List of articles included in an issue identified by IRI",
      "category": "document",
      "regex":"(https:\/\/w3id\\.org\/oc\/ccc\/br\/\\d{1,})",
      "query": [`
              <[[VAR]]> ^frbr:partOf ?iri .
              ?iri a fabio:JournalArticle . `
      ]
    },
    {
      "name":"intext_refs_list",
      "label": "List of in-text reference pointers included in a discourse element IRI",
      "category": "intext_ref",
      "regex":"(https:\/\/w3id\\.org\/oc\/ccc\/de\/\\d{1,})",
      "query": [`
              <[[VAR]]> frbr:part*/c4o:isContextOf/co:element* ?rp_iri .
              ?rp_iri a c4o:InTextReferencePointer . `
      ]
    },
    {
      "name":"intext_refs_for_citation",
      "label": "List of in-text reference pointers given a citation IRI",
      "category": "intext_ref",
      "regex":"(https:\/\/w3id\\.org\/oc\/ccc\/ci\/.$)",
      "query": [`
              <[[VAR]]> cito:hasCitingEntity ?citing_iri ; cito:hasCitedEntity ?cited_iri.
              OPTIONAL {<[[VAR]]> ^oa:hasBody ?annotation .
                ?annotation ^oco:hasAnnotation ?rp_iri_single .
                ?rp_iri_single a c4o:InTextReferencePointer .}
              OPTIONAL {
                ?citation_rp cito:hasCitingEntity ?citing_iri ;
                      cito:hasCitedEntity ?cited_iri;
                      ^oa:hasBody ?annotation .
                ?annotation ^oco:hasAnnotation ?rp_iri_others .
                ?rp_iri_others a c4o:InTextReferencePointer . }
                BIND(COALESCE(?rp_iri_single, ?rp_iri_others) AS ?rp_iri).
            `
      ]
    },
    {
      "name":"intext_refs_list_in_pl",
      "label": "List of in-text reference pointers in a list",
      "category": "intext_ref",
      "regex":"(https:\/\/w3id\\.org\/oc\/ccc\/pl\/.$)",
      "query": [` <[[VAR]]> co:element ?rp_iri.`
      ]
    },
    {
      "name":"intext_refs_list_for_be",
      "label": "List of in-text reference pointers referencing a bib entry",
      "category": "intext_ref",
      "regex":"(https:\/\/w3id\\.org\/oc\/ccc\/be\/.$)",
      "query": [` <[[VAR]]> ^c4o:denotes ?rp_iri.`
      ]
    },
    {
      "name":"cocited_list",
      "label": "List of in-text reference pointers co-cited in the same element",
      "category": "intext_ref",
      "regex":"(https:\/\/w3id\\.org\/oc\/ccc\/rp\/.$)",
      "query": [`
        BIND(<[[VAR]]> as ?my_iri).
              ?sent_iri (c4o:isContextOf/co:element*) <[[VAR]]> ;
                      c4o:isContextOf/co:element* ?rp_iri .
        FILTER(str(?rp_iri) != "[[VAR]]").
        ?rp_iri a c4o:InTextReferencePointer .`
      ]
    },
    {
      "name":"br_resource",
      "label": "Bibiographic resource Corpus ID (e.g. br/0701)",
      "freetext": true,
      "category": "document",
      "regex":"(br\/\\d{1,})",
      "query": [
            "{",
            "BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?iri) . ",
            "}"
      ]
    },
    {
      "name":"br_resource",
      "label": "Bibiographic resource Id (br/)",
      "freetext": true,
      "category": "document",
      "regex":"(br\/\\d{1,})",
      "query": [
            "{",
            "BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?iri) . ",
            "}"
      ]
    },
    {
      "name":"doc_cites_list",
      "label": "List of documents cited by Bibiographic resource IRI",
      "category": "document",
      "regex": "(https:\/\/w3id\\.org\/oc\/ccc\/br\/\\d{1,})",
      "query": [
            "{",
            "<[[VAR]]> cito:cites ?iri .",
            "}"
      ]
    },
    {
      "name":"doc_cites_me_list",
      "label": "List of documents citing the Bibiographic resource IRI",
      "category": "document",
      "regex": "(https:\/\/w3id\\.org\/oc\/ccc\/br\/\\d{1,})",
      "query": [
            "{",
            "<[[VAR]]> ^cito:cites ?iri  .",
            "}"
      ]
    },
    {
      "name":"mari_doc_cites_me_list",
      "label": "Citations",
      "category": "document_intext",
      "regex": "(https:\/\/w3id\\.org\/oc\/ccc\/br\/\\d{1,})",
      "query": ["{",
      "BIND(<[[VAR]]> as ?cited_iri) <[[VAR]]> ^cito:cites ?iri  .",
      "}"
      ]
    },
    {
      "name":"orcid",
      "label": "ORCID",
      "placeholder": "ORCID e.g. 0000-0001-5506-523X",
      "advanced": true,
      "freetext": true,
      "category": "author",
      "regex":"([\\S]{4}-[\\S]{4}-[\\S]{4}-[\\S]{4})",
      "query": [`
        ?orcid bds:search "[[VAR]]" ;
               bds:matchExact "true" .
        ?orcid_iri literal:hasLiteralValue ?orcid ; datacite:usesIdentifierScheme datacite:orcid .
        ?author_iri datacite:hasIdentifier ?orcid_iri .`
      ]
    },
    {
      "name":"author_lname",
      "label": "Last name",
      "placeholder": "Free-text e.g. Peroni",
      "advanced": true,
      "heuristics": [["lower_case","capitalize_1st_letter"]],
      "category": "author",
      "regex":"[-'a-zA-Z ]+$",
      "query": [
              "{",
              "?author_iri foaf:familyName '[[VAR]]' .",
              "}"
      ]
    },
    {
      "name":"author_fname",
      "label": "First name",
      "placeholder": "Free-text e.g. Silvio",
      "advanced": true,
      "heuristics": [["lower_case","capitalize_1st_letter"]],
      "category": "author",
      "regex":"[-'a-zA-Z ]+$",
      "query": [
              "{",
              "?author_iri foaf:givenName '[[VAR]]' .",
              "}"
      ]
    },
    {
      "name":"author_works",
      "label": "Author Corpus ID (https://w3id.org/...)",
      "category": "document",
      "regex": "(https:\/\/w3id\\.org\/oc\/ccc\/ra\/\\d{1,})",
      "query": [
          "{",
          "?a_role_iri pro:isHeldBy <[[VAR]]> .",
          "?iri pro:isDocumentContextFor ?a_role_iri .",
          "}"
      ]
    },
    {
      "name":"publisher_journals",
      "label": "Journals by publisher ID (https://w3id.org/...)",
      "category": "journal",
      "regex": "(https:\/\/w3id\\.org\/oc\/ccc\/ra\/\\d{1,})",
      "query": [
          "{",
          "?a_role_iri pro:isHeldBy <[[VAR]]> ; pro:withRole pro:publisher .",
          "?article_iri pro:isDocumentContextFor ?a_role_iri ; frbr:partOf+ ?iri .",
          "?iri a fabio:Journal .",
          "}"
      ]
    },
    {
      "name":"ra_resource",
      "label": "Author resource Id (e.g. ra/0701)",
      "freetext": true,
      "category": "author",
      "regex":"(ra\/\\d{1,})",
      "query": [
            "{",
            "BIND(<https://w3id.org/oc/ccc/[[VAR]]> as ?author_iri) .",
            "}"
      ]
    },
    {
      "name":"author_text",
      "label": "Last name",
      "placeholder": "Free-text e.g. Shotton",
      "advanced": true,
      "freetext": true,
      "category": "document",
      "regex":"[-'a-zA-Z ]+$",
      "query": [
              "{",
              "?lit_au bds:search '[[VAR]]' .",
              "?lit_au bds:matchAllTerms 'true' .",
              "?lit_au bds:relevance ?score_au .",
              "?lit_au bds:minRelevance '0.2' .",
              "?lit_au bds:maxRank '300' .",

              "?myra foaf:familyName ?lit_au .",
              "?q_role pro:isHeldBy ?myra .",
              "?iri pro:isDocumentContextFor ?q_role .",
              "}"
      ]
    },
    {
      "name":"any_text",
      "label": "Title, Subtitle, Keywords",
      "placeholder": "Free-text e.g. Semantic web",
      "advanced": true,
      "freetext": true,
      "category": "document",
      "regex":"[-'a-zA-Z ]+$",
      "query": [
              "{",
              "?lit bds:search '[[VAR]]' .",
              "?lit bds:matchAllTerms 'true' .",
              "?lit bds:relevance ?score .",
              "?lit bds:minRelevance '0.2' .",
              "?lit bds:maxRank '300' .",
                "{?iri dcterms:title  ?lit }",
              "UNION",
                "{?iri fabio:hasSubtitle ?lit}",
              "}"
      ]
    }
  ],

  "categories": [
      {
        "name": "journal",
        "label": "",
        "macro_query": [
          `
          SELECT DISTINCT ?iri ?short_iri ?short_iri_id ?browser_iri ?short_type ?title ?issn ?subtitle
          WHERE{
                [[RULE]]
                ?iri rdf:type ?type .
                OPTIONAL {?iri dcterms:title ?title .}
                OPTIONAL {?iri fabio:hasSubtitle ?subtitle .}
                OPTIONAL {
                     ?iri datacite:hasIdentifier [
                     datacite:usesIdentifierScheme datacite:issn ;
                     literal:hasLiteralValue ?issn
                     ] .
                }

                     BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/ccc/', '', 'i') as ?short_iri) .
                     BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/ccc/br/', '', 'i') as ?short_iri_id) .
                     BIND(REPLACE(STR(?iri), '/ccc/', '/ccc/browser/', 'i') as ?browser_iri) .
                     BIND(REPLACE(STR(?type), 'http://purl.org/spar/fabio/', '', 'i') as ?short_type) .

                 }
              GROUP BY ?iri ?issn ?short_iri ?short_iri_id ?browser_iri ?title ?subtitle ?short_type`
        ],
        "fields": [
          {"iskey": true, "value":"short_iri", "label":{"field":"short_iri_id"}, "title": "Corpus ID","column_width":"30%","type": "text", "sort":{"value": "short_iri.label", "type":"int"}, "link":{"field":"browser_iri","prefix":""}},
          {"value":"issn", "title": "ISSN","column_width":"30%","type": "text"},
          {"value":"title", "title": "Title","column_width":"30%","type": "text", "sort":{"value": "title", "type":"text"}, "link":{"field":"browser_iri","prefix":""}}
          //{"value":"author", "label":{"field":"author_lbl"}, "title": "Authors", "column_width":"30%","type": "text", "sort":{"value": "author", "type":"text"}, "filter":{"type_sort": "text", "min": 10000, "sort": "label", "order": "asc"}, "link":{"field":"author_browser_iri","prefix":""}},
          ],
        "group_by": {"keys":["iri"], "concats":["title,subtitle"]}
      },
      {
    "name": "volume",
    "label": "",
    "macro_query": [
      `
      SELECT DISTINCT ?iri ?short_iri ?short_iri_id ?browser_iri ?short_type ?title ?issn ?subtitle ?year ?journal
      WHERE{
            [[RULE]]
            ?iri rdf:type ?type .
            OPTIONAL {?iri dcterms:title ?title .}
            OPTIONAL {?iri fabio:hasSequenceIdentifier ?vol_num .}
            BIND(COALESCE(?title, CONCAT("Volume n. ",?vol_num), "No title available") as ?title).
            OPTIONAL {?iri fabio:hasSubtitle ?subtitle .}
            OPTIONAL {?iri ^frbr:partOf / prism:publicationDate ?year .}
            OPTIONAL {
                 ?iri frbr:partOf+ ?journal_iri . ?journal_iri a fabio:Journal ;datacite:hasIdentifier [
                 datacite:usesIdentifierScheme datacite:issn ;
                 literal:hasLiteralValue ?issn
                 ] .
            }
            OPTIONAL {
                   ?iri frbr:partOf+ ?journal_iri . ?journal_iri a fabio:Journal ; dcterms:title ?journal .
                 }
                 BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/ccc/', '', 'i') as ?short_iri) .
                 BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/ccc/br/', '', 'i') as ?short_iri_id) .
                 BIND(REPLACE(STR(?iri), '/ccc/', '/ccc/browser/', 'i') as ?browser_iri) .
                 BIND(REPLACE(STR(?type), 'http://purl.org/spar/fabio/', '', 'i') as ?short_type) .

             }
          GROUP BY ?iri ?issn ?short_iri ?short_iri_id ?browser_iri ?title ?subtitle ?year ?journal ?short_type`
    ],
    "fields": [
      {"iskey": true, "value":"short_iri", "label":{"field":"short_iri_id"}, "title": "Corpus ID","column_width":"30%","type": "text", "sort":{"value": "short_iri.label", "type":"int"}, "link":{"field":"browser_iri","prefix":""}},
      {"value":"issn", "title": "ISSN","column_width":"30%","type": "text"},
      {"value":"title", "title": "Title","column_width":"30%","type": "text", "sort":{"value": "title", "type":"text"}, "link":{"field":"browser_iri","prefix":""}},
      //{"value":"author", "label":{"field":"author_lbl"}, "title": "Authors", "column_width":"30%","type": "text", "sort":{"value": "author", "type":"text"}, "filter":{"type_sort": "text", "min": 10000, "sort": "label", "order": "asc"}, "link":{"field":"author_browser_iri","prefix":""}},
      {"value":"journal", "title": "Journal", "column_width":"30%","type": "text"},
      {"value":"year", "title": "Year", "column_width":"30%","type": "int", "filter":{"type_sort": "int", "min": 10000, "sort": "value", "order": "desc"}, "sort":{"value": "year", "type":"int"} }
      ],
    "group_by": {"keys":["iri"], "concats":["journal_data"]}
  },
      {
      "name": "issue",
      "label": "",
      "macro_query": [
        `
        SELECT DISTINCT ?iri ?short_iri ?short_iri_id ?browser_iri ?short_type ?title ?issn ?subtitle ?year ?journal ?journal_data
        WHERE{
              [[RULE]]
              ?iri rdf:type ?type .
              OPTIONAL {?iri dcterms:title ?title .}
              OPTIONAL {?iri fabio:hasSequenceIdentifier ?issue_num .}
              BIND(COALESCE(?title, CONCAT("Issue n. ",?issue_num), "No title available") as ?title).
              OPTIONAL {?iri fabio:hasSubtitle ?subtitle .}
              OPTIONAL {?iri ^frbr:partOf / prism:publicationDate ?year .}
              OPTIONAL {
                   ?iri frbr:partOf+ ?journal_iri . ?journal_iri a fabio:Journal ;datacite:hasIdentifier [
                   datacite:usesIdentifierScheme datacite:issn ;
                   literal:hasLiteralValue ?issn
                   ] .
              }
              OPTIONAL {
                     ?iri frbr:partOf+ ?journal_iri . ?journal_iri a fabio:Journal ; dcterms:title ?journal .
                     OPTIONAL {
                      ?iri frbr:partOf ?journal_volume_iri .
                      ?journal_volume_iri a fabio:JournalVolume ; fabio:hasSequenceIdentifier ?volume .
                      BIND(COALESCE(CONCAT(', ',?volume), ', no volume') as ?journal_data)
                     }
                   }
                   BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/ccc/', '', 'i') as ?short_iri) .
                   BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/ccc/br/', '', 'i') as ?short_iri_id) .
                   BIND(REPLACE(STR(?iri), '/ccc/', '/ccc/browser/', 'i') as ?browser_iri) .
                   BIND(REPLACE(STR(?type), 'http://purl.org/spar/fabio/', '', 'i') as ?short_type) .

               }
            GROUP BY ?iri ?issn ?short_iri ?short_iri_id ?browser_iri ?title ?subtitle ?year ?journal ?journal_data ?short_type`
      ],
      "fields": [
        {"iskey": true, "value":"short_iri", "label":{"field":"short_iri_id"}, "title": "Corpus ID","column_width":"30%","type": "text", "sort":{"value": "short_iri.label", "type":"int"}, "link":{"field":"browser_iri","prefix":""}},
        {"value":"issn", "title": "ISSN","column_width":"30%","type": "text"},
        {"value":"title", "title": "Title","column_width":"30%","type": "text", "sort":{"value": "title", "type":"text"}, "link":{"field":"browser_iri","prefix":""}},
        //{"value":"author", "label":{"field":"author_lbl"}, "title": "Authors", "column_width":"30%","type": "text", "sort":{"value": "author", "type":"text"}, "filter":{"type_sort": "text", "min": 10000, "sort": "label", "order": "asc"}, "link":{"field":"author_browser_iri","prefix":""}},
        {"value":"journal", "title": "Journal", "column_width":"30%","type": "text"},
        {"value":"journal_data", "title": "Journal data", "column_width":"30%","type": "text"},
        {"value":"year", "title": "Year", "column_width":"30%","type": "int", "filter":{"type_sort": "int", "min": 10000, "sort": "value", "order": "desc"}, "sort":{"value": "year", "type":"int"} }
        ],
      "group_by": {"keys":["iri"], "concats":["journal_data"]}
    },
      {
        "name": "document_intext",
        "label": "",
        "macro_query": [
          `
          SELECT DISTINCT ?iri ?short_iri ?short_iri_id ?browser_iri ?short_type ?title ?doi ?subtitle ?year ?journal ?journal_data ?author ?author_browser_iri (count(?next) as ?tot) (count(DISTINCT ?rp) as ?mentions) (group_concat(distinct ?rp; separator=";") as ?pointers)
          WHERE{

                [[RULE]]
                ?iri rdf:type ?type .
                OPTIONAL {?iri dcterms:title ?title .}
                BIND(COALESCE(?title, "No title available") as ?title).

                     OPTIONAL {?iri fabio:hasSubtitle ?subtitle .}
                     OPTIONAL {?iri prism:publicationDate ?date . BIND(year(xsd:dateTime(?date)) as ?year) .}
                     OPTIONAL {
                         ?iri datacite:hasIdentifier [
                         datacite:usesIdentifierScheme datacite:doi ;
                         literal:hasLiteralValue ?doi
                         ] .
                     }


                    # in-text references

                    OPTIONAL {
                      ?citation cito:hasCitedEntity ?cited_iri ; cito:hasCitingEntity ?iri ;^oa:hasBody ?be_annotation .
                      ?be oco:hasAnnotation ?be_annotation .
                      ?pointer c4o:denotes ?be ; datacite:hasIdentifier [
                        datacite:usesIdentifierScheme datacite:intrepid ;
                        literal:hasLiteralValue ?rp
                        ] .
                    }

                     OPTIONAL {
                       ?iri frbr:partOf+ ?journal_iri .
                       ?journal_iri a fabio:Journal ; dcterms:title ?journal .
                       OPTIONAL {
                        ?journal_volume_iri a fabio:JournalVolume ; frbr:partOf+ ?journal_iri ; fabio:hasSequenceIdentifier ?volume .
                        ?iri frbr:embodiment ?manifestation .
                        ?manifestation prism:startingPage ?start ; prism:endingPage ?end .
                        BIND(CONCAT(', ', ?volume,': ',?start,'-',?end) as ?journal_data)
                       }
                     }
                     BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/ccc/', '', 'i') as ?short_iri) .
                     BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/ccc/br/', '', 'i') as ?short_iri_id) .
                     BIND(REPLACE(STR(?iri), '/ccc/', '/ccc/browser/', 'i') as ?browser_iri) .
                     BIND(REPLACE(STR(?type), 'http://purl.org/spar/fabio/', '', 'i') as ?short_type) .

                   #list of the doc authors


                   OPTIONAL {
                     ?iri pro:isDocumentContextFor ?role .
                     ?role pro:withRole pro:author ; pro:isHeldBy [
                         foaf:familyName ?f_name ;
                                      foaf:givenName ?g_name
                       ] .
                       ?role pro:isHeldBy ?author_iri .
                       OPTIONAL {?role oco:hasNext* ?next .}
                   }
                     BIND(REPLACE(STR(?author_iri), '/ccc/', '/ccc/browser/', 'i') as ?author_browser_iri) .
                     BIND(CONCAT(?g_name,' ',?f_name) as ?author) .

                 }
              GROUP BY ?iri ?doi ?short_iri ?short_iri_id ?browser_iri ?title ?subtitle ?year ?journal ?journal_data ?short_type ?author ?author_browser_iri ?mentions ?pointers ORDER BY DESC(?tot)`
        ],
        "fields": [
          {"iskey": true, "value":"short_iri", "label":{"field":"short_iri_id"}, "title": "Corpus ID","column_width":"30%","type": "text", "sort":{"value": "short_iri.label", "type":"int"}, "link":{"field":"browser_iri","prefix":""}},
          {"value":"doi", "title": "DOI","column_width":"30%","type": "text", "sort":{"value": "doi", "type":"text"}, "link":{"field":"doi","prefix":"http://dx.doi.org/"}},
          {"value":"title", "title": "Title","column_width":"30%","type": "text", "sort":{"value": "title", "type":"text"}, "link":{"field":"browser_iri","prefix":""}},
          {"value":"author", "label":{"field":"author_lbl"}, "title": "Authors", "column_width":"30%","type": "text", "sort":{"value": "author", "type":"text"}, "filter":{"type_sort": "text", "min": 10000, "sort": "label", "order": "asc"}, "link":{"field":"author_browser_iri","prefix":""}},
          {"value":"journal", "title": "Journal", "column_width":"30%","type": "text", "sort":{"value": "journal", "type":"text"}},
          {"value":"journal_data", "title": "Journal data", "column_width":"30%","type": "text"},
          {"value":"year", "title": "Year", "column_width":"30%","type": "int", "filter":{"type_sort": "int", "min": 10000, "sort": "value", "order": "desc"}, "sort":{"value": "year", "type":"int"} },
          {"value":"in_cits", "title": "Cited by", "column_width":"30%","type": "int", "sort":{"value": "in_cits", "type":"int"}},
          {"value":"mentions", "label":{"field":"mentions"}, "title": "Excerpts", "column_width":"30%","type": "int","link":{"field":"pointers","prefix":""}}
          ],
        "group_by": {"keys":["iri"], "concats":["author"]}
      },
      {
        "name": "document",
        "label": "Document",
        "macro_query": [
          `
          SELECT DISTINCT ?iri ?short_iri ?short_iri_id ?browser_iri ?short_type ?title ?doi ?subtitle ?year ?journal ?journal_data ?author ?author_browser_iri (COUNT(distinct ?cited_by) AS ?in_cits) (count(?next) as ?tot)
          WHERE{

                [[RULE]]
                 ?iri rdf:type ?type .
                 OPTIONAL {?iri dcterms:title ?title . }
                 BIND(COALESCE(?title, "No title available") as ?title).
                 OPTIONAL {?iri fabio:hasSubtitle ?subtitle .}
                 OPTIONAL {?iri prism:publicationDate ?date . BIND(year(xsd:dateTime(?date)) as ?year) . }
                 OPTIONAL {
                     ?iri datacite:hasIdentifier [
                     datacite:usesIdentifierScheme datacite:doi ;
                     literal:hasLiteralValue ?doi
                     ] .
                 }
                 OPTIONAL {?cited_by cito:cites ?iri .}
                 OPTIONAL {
                   ?iri frbr:partOf+ ?journal_iri .
                   ?journal_iri a fabio:Journal ; dcterms:title ?journal .
                   OPTIONAL {
                    ?journal_volume_iri a fabio:JournalVolume ; frbr:partOf+ ?journal_iri ; fabio:hasSequenceIdentifier ?volume .
                    ?iri frbr:embodiment ?manifestation .
                    ?manifestation prism:startingPage ?start ; prism:endingPage ?end .
                    BIND(CONCAT(', ', ?volume,': ',?start,'-',?end) as ?journal_data)
                   }
                  }
                 BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/ccc/', '', 'i') as ?short_iri) .
                 BIND(REPLACE(STR(?iri), 'https://w3id.org/oc/ccc/br/', '', 'i') as ?short_iri_id) .
                 BIND(REPLACE(STR(?iri), '/ccc/', '/ccc/browser/', 'i') as ?browser_iri) .
                 OPTIONAL {
                   FILTER( STRSTARTS(STR(?type),str(fabio:)) ).
                   FILTER( !STRSTARTS(STR(?type),str(fabio:Expre)) ).
                   BIND(REPLACE(STR(?type), 'http://purl.org/spar/fabio/', '', 'i') as ?short_type_exp) .}
                 OPTIONAL {FILTER( STRSTARTS(STR(?type),str(deo:)) ). FILTER(?type != 'deo:DiscourseElement'). BIND(REPLACE(STR(?type), 'http://purl.org/spar/deo/', '', 'i') as ?short_type_de) .}
                 OPTIONAL {FILTER( STRSTARTS(STR(?type),str(doco:)) ).  BIND(REPLACE(STR(?type), 'http://purl.org/spar/doco/', '', 'i') as ?short_type_doco) .}
                 BIND(COALESCE(?short_type_exp, ?short_type_de, ?short_type_doco) AS ?short_type_t).
                 BIND(COALESCE(replace(str(?short_type_t), '([a-z])([A-Z])', '$1 $2') , ?short_type_t) AS ?short_type) .
                 OPTIONAL {
                   ?iri pro:isDocumentContextFor ?role .
                   ?role pro:withRole pro:author ; pro:isHeldBy [
                       foaf:familyName ?f_name ;
                                    foaf:givenName ?g_name
                     ] .
                     ?role pro:isHeldBy ?author_iri .
                     OPTIONAL {?role oco:hasNext* ?next .}
                     BIND(REPLACE(STR(?author_iri), '/ccc/', '/ccc/browser/', 'i') as ?author_browser_iri) .
                     BIND(CONCAT(?g_name,' ',?f_name) as ?author) .
                 }
              }
              GROUP BY ?iri ?doi ?short_iri ?short_iri_id ?browser_iri ?title ?subtitle ?year ?journal ?journal_data ?short_type ?author ?author_browser_iri ORDER BY DESC(?tot)`
        ],
        "fields": [
          {"iskey": true, "value":"short_iri", "label":{"field":"short_iri_id"}, "title": "Corpus ID","column_width":"30%","type": "text", "sort":{"value": "short_iri.label", "type":"int"}, "link":{"field":"browser_iri","prefix":""}},
          {"value":"doi", "title": "DOI","column_width":"30%","type": "text", "sort":{"value": "doi", "type":"text"}, "link":{"field":"doi","prefix":"http://dx.doi.org/"}},
          {"value":"title", "title": "Title","column_width":"30%","type": "text", "sort":{"value": "title", "type":"text"}, "link":{"field":"browser_iri","prefix":""}},
          {"value":"author", "label":{"field":"author_lbl"}, "title": "Authors", "column_width":"30%","type": "text", "sort":{"value": "author", "type":"text"}, "filter":{"type_sort": "text", "min": 10000, "sort": "label", "order": "asc"}, "link":{"field":"author_browser_iri","prefix":""}},
          {"value":"journal", "title": "Journal", "column_width":"30%","type": "text", "sort":{"value": "journal", "type":"text"}},
          {"value":"journal_data", "title": "Journal data", "column_width":"30%","type": "text"},
          {"value":"year", "title": "Year", "column_width":"30%","type": "int", "filter":{"type_sort": "int", "min": 10000, "sort": "value", "order": "desc"}, "sort":{"value": "year", "type":"int"} },
          {"value":"in_cits", "title": "Cited by", "column_width":"30%","type": "int", "sort":{"value": "in_cits", "type":"int"}},
          {"value": "short_type", "title": "Type","type": "text","filter":{"type_sort": "text", "min": 10000, "sort": "label", "order": "asc"}}
          ],
        "group_by": {"keys":["iri"], "concats":["author"]}
      },
      {
        "name": "author",
        "label": "Author",
        "macro_query": [`
          SELECT ?author_iri ?author_browser_iri ?short_iri ?short_iri_id ?orcid ?author (COUNT(?doc) AS ?num_docs) (COUNT(?citing) AS ?citations) WHERE {
              [[RULE]]
              BIND(REPLACE(STR(?author_iri), 'https://w3id.org/oc/ccc/', '', 'i') as ?short_iri) .
              BIND(REPLACE(STR(?author_iri), 'https://w3id.org/oc/ccc/ra/', '', 'i') as ?short_iri_id) .
              BIND(REPLACE(STR(?author_iri), '/ccc/', '/ccc/browser/', 'i') as ?author_browser_iri) .
              #author attributes
              OPTIONAL {?author_iri datacite:hasIdentifier[
                        datacite:usesIdentifierScheme datacite:orcid ;
               			    literal:hasLiteralValue ?orcid].}
              OPTIONAL {
                      ?author_iri foaf:familyName ?fname .
                      ?author_iri foaf:givenName ?name .
                      BIND(CONCAT(STR(?name),' ', STR(?fname)) as ?author) .
              }
              #all his documents
              OPTIONAL {
                    ?role pro:isHeldBy ?author_iri .
                    ?doc pro:isDocumentContextFor ?role.
                    OPTIONAL {
                      ?citing cito:cites ?doc .
                    }
              }
          }GROUP BY ?author_iri ?author_browser_iri ?short_iri ?short_iri_id ?orcid ?author
          `
        ],
        "fields": [
          {"value":"short_iri", "title": "Corpus ID", "label":{"field":"short_iri_id"}, "column_width":"25%", "type": "text", "sort":{"value": "short_iri.label", "type":"int"}, "link":{"field":"author_browser_iri","prefix":""}},
          {"value":"orcid", "title": "ORCID","column_width":"25%", "type": "text", "link":{"field":"orcid","prefix":"https://orcid.org/"}},
          {"value":"author", "title": "Author","column_width":"35%", "type": "text","filter":{"type_sort": "text", "min": 10000, "sort": "value", "order": "desc"}, "sort": {"value": "author", "type":"text", "default": {"order": "desc"}}, "link":{"field":"author_browser_iri","prefix":""}},
          {"value":"num_docs", "title": "Works","column_width":"15%", "type": "int"},
          {"value":"citations", "title": "Citations","column_width":"15%", "type": "int"}
        ]
      },
      {
        "name": "intext_ref",
        "label": "",
        "macro_query": [
          `SELECT DISTINCT ?my_iri ?rp_iri ?short_iri ?short_iri_id ?browser_iri ?short_type ?title ?intrepid ?be_brw_iri ?be_text ?br_iri
          WHERE{
              [[RULE]]
               OPTIONAL {?rp_iri rdf:type ?type ; datacite:hasIdentifier [
                 datacite:usesIdentifierScheme datacite:intrepid ;
                 literal:hasLiteralValue ?intrepid
                 ] .}
               OPTIONAL {?rp_iri c4o:hasContent ?rp_title .}
               OPTIONAL {?rp_iri ^co:element ?pl_iri . ?pl_iri c4o:hasContent ?pl_title .}
               OPTIONAL {?rp_iri c4o:denotes ?be . ?be c4o:hasContent ?be_text ; biro:references ?br_iri .}

               BIND(COALESCE(?rp_title, ?pl_title, "no text") AS ?title) .
               BIND(COALESCE(?be_text, "No bibliographic reference available.") AS ?be_text) .
               BIND(REPLACE(STR(?rp_iri), 'https://w3id.org/oc/ccc/', '', 'i') as ?short_iri) .
               BIND(REPLACE(STR(?rp_iri), 'https://w3id.org/oc/ccc/rp/', '', 'i') as ?short_iri_id) .
               BIND(REPLACE(STR(?rp_iri), '/ccc/', '/ccc/browser/', 'i') as ?browser_iri) .
               BIND(REPLACE(STR(?be), '/ccc/', '/ccc/browser/', 'i') as ?be_brw_iri) .
               # BIND(REPLACE(STR(?type), 'http://purl.org/spar/c4o/', '', 'i') as ?short_type) .
               BIND("In-text reference pointer" as ?short_type) .
             }`
        ],
        "fields": [
          {"iskey": true, "value":"short_iri", "label":{"field":"short_iri_id"}, "title": "Corpus ID","column_width":"30%","type": "text", "sort":{"value": "short_iri.label", "type":"int"}, "link":{"field":"browser_iri","prefix":""}},
          {"value":"intrepid", "title": "InTRePID","column_width":"30%","type": "text", "sort":{"value": "intrepid", "type":"text"}},
          {"value":"title", "title": "Title","column_width":"30%","type": "text", "sort":{"value": "title", "type":"text"}, "link":{"field":"browser_iri","prefix":""}},
          // {"value":"author", "label":{"field":"author_lbl"}, "title": "Authors", "column_width":"30%","type": "text", "sort":{"value": "author", "type":"text"}, "filter":{"type_sort": "text", "min": 10000, "sort": "label", "order": "asc"}, "link":{"field":"author_browser_iri","prefix":""}},
          {"value":"be_text", "title": "Bib. Reference", "column_width":"30%","type": "text", "sort":{"value": "be_text", "type":"text"}, "link":{"field":"be_brw_iri","prefix":""}},
          // {"value":"journal_data", "title": "Journal data", "column_width":"30%","type": "text"},
          // {"value":"year", "title": "Year", "column_width":"30%","type": "int", "filter":{"type_sort": "int", "min": 10000, "sort": "value", "order": "desc"}, "sort":{"value": "year", "type":"int"} },
          // {"value":"in_cits", "title": "Cited by", "column_width":"30%","type": "int", "sort":{"value": "in_cits", "type":"int"}},
          // {"value":"mentions", "label":{"field":"mentions"}, "title": "Excerpts", "column_width":"30%","type": "int","link":{"field":"pointers","prefix":""}}
          //
        ]
      }
    ],

  "page_limit": [5,10,15,20,30,40,50],
  "page_limit_def": 10,
  "def_results_limit": 1,
  "search_base_path": "search",
  "advanced_search": true,
  "def_adv_category": "document",
  "adv_btn_title": "Search",

  "progress_loader":{
            "visible": true,
            "spinner": true,
            "title":"Searching the CCC Corpus ...",
            "subtitle":"Be patient - this search might take several seconds!",
            "abort":{"title":"Abort Search","href_link":"ccc_corpus.html"}
          },
  "timeout":{
    "value": 15000,
    "link": "ccc_corpus.html"
  }
};


//heuristic functions
//you can define your own heuristic functions here
var heuristics = (function () {

      function lower_case(str){
        return str.toLowerCase();
      }
      function capitalize_1st_letter(str){
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
      function decodeURIStr(str) {
        return decodeURIComponent(str);
      }
      function encodeURIStr(str) {
        return encodeURIComponent(str);
      }

      function timespan_translate(str) {
        var new_str = "";
        var years = 0;
        var months = 0;
        var days = 0;

        let reg = /(\d{1,})Y/g;
        let match;
        while (match = reg.exec(str)) {
          if (match.length >= 2) {
            years = match[1] ;
            new_str = new_str + years +" Years "
          }
        }

        reg = /(\d{1,})M/g;
        while (match = reg.exec(str)) {
          if (match.length >= 2) {
            months = match[1] ;
            new_str = new_str + months +" Months "
          }
        }

        reg = /(\d{1,})D/g;
        while (match = reg.exec(str)) {
          if (match.length >= 2) {
            days = match[1] ;
            new_str = new_str + days +" Days "
          }
        }

        return new_str;
      }
      function timespan_in_days(str) {
        var new_str = "";
        var years = 0;
        var months = 0;
        var days = 0;

        let reg = /(\d{1,})Y/g;
        let match;
        while (match = reg.exec(str)) {
          if (match.length >= 2) {
            years = parseInt(match[1]) ;
          }
        }

        reg = /(\d{1,})M/g;
        while (match = reg.exec(str)) {
          if (match.length >= 2) {
            months = parseInt(match[1]) ;
          }
        }

        reg = /(\d{1,})D/g;
        while (match = reg.exec(str)) {
          if (match.length >= 2) {
            days = parseInt(match[1]) ;
          }
        }

        return String(years * 365 + months * 30 + days);
      }
      function short_version(str, max_chars = 20) {
        var new_str = "";
        for (var i = 0; i < max_chars; i++) {
          if (str[i] != undefined) {
            new_str = new_str + str[i];
          }else {
            break;
          }
        }
        return new_str+"...";
      }


      return {
        lower_case: lower_case,
        capitalize_1st_letter: capitalize_1st_letter,
        decodeURIStr: decodeURIStr,
        encodeURIStr: encodeURIStr,
        short_version: short_version,
        timespan_in_days: timespan_in_days,
        timespan_translate: timespan_translate
       }
})();
