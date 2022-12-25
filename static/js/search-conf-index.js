var search_conf = {
"sparql_endpoint": "https://opencitations.net/index/sparql",
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
    {"prefix":"rdf","iri":"http://www.w3.org/1999/02/22-rdf-syntax-ns#"}
  ],

"rules":  [
    {
      "name":"citingdoi",
      "label": "References of a specific document (DOI)",
      "placeholder": "DOI e.g. 10.1016/J.WEBSEM.2012.08.001",
      "advanced": true,
      "freetext": false,
      "heuristics": [['lower_case','encodeDOIURL']],
      "category": "citation",
      "regex":"(10.\\d{4,9}\/[-._;()/:A-Za-z0-9][^\\s]+)",
      "query": [`
            {
              VALUES ?citing_iri {<https://doi.org/[[VAR]]> <http://dx.doi.org/[[VAR]]>} .
              ?iri cito:hasCitingEntity ?citing_iri .
              ?iri cito:hasCitingEntity ?citing_id_iri .
              BIND(STRAFTER(str(?citing_id_iri), '.org/') AS ?citing_id_val)
              ?iri cito:hasCitedEntity ?cited_id_iri .
              BIND(STRAFTER(str(?cited_id_iri), '.org/') AS ?cited_id_val)
            }`
      ]
    },
    {
      "name":"citeddoi",
      "label": "Citations of a specific document (DOI)",
      "placeholder": "DOI e.g. 10.1016/J.WEBSEM.2012.08.001",
      "advanced": true,
      "freetext": true,
      "heuristics": [['lower_case','encodeDOIURL']],
      "category": "citation",
      "regex":"(10.\\d{4,9}\/[-._;()/:A-Za-z0-9][^\\s]+)",
      "query": [`
            {
              VALUES ?cited_iri {<https://doi.org/[[VAR]]> <http://dx.doi.org/[[VAR]]>} .
              ?iri cito:hasCitedEntity ?cited_iri .
              ?iri cito:hasCitingEntity ?citing_id_iri .
              BIND(STRAFTER(str(?citing_id_iri), '.org/') AS ?citing_id_val)
              ?iri cito:hasCitedEntity ?cited_id_iri .
              BIND(STRAFTER(str(?cited_id_iri), '.org/') AS ?cited_id_val)
            }`
      ]
    },
    {
      "name":"oci",
      "label": "Data of a specific citation (OCI)",
      "placeholder": "OCI e.g: 0200101...-0200101...",
      "advanced": true,
      "freetext": false,
      "category": "citation",
      "regex":"(\\d{1,}-\\d{1,})",
      "query": [`
        {
          VALUES ?iri { <https://w3id.org/oc/index/coci/ci/[[VAR]]> <https://w3id.org/oc/index/doci/ci/[[VAR]]> <https://w3id.org/oc/index/croci/ci/[[VAR]]> }
          ?iri cito:hasCitingEntity ?citing_id_iri .
          BIND(STRAFTER(str(?citing_id_iri), '.org/') AS ?citing_id_val)
          ?iri cito:hasCitedEntity ?cited_id_iri .
          BIND(STRAFTER(str(?cited_id_iri), '.org/') AS ?cited_id_val)
        }
        `
      ]
    },
    {
      "name":"citedpmid",
      "label": "Citations of a specific document (PMID)",
      "placeholder": "PMID e.g. 11529879",
      "advanced": false,
      "freetext": false,
      "heuristics": [['lower_case','encodeDOIURL']],
      "category": "citation",
      "regex":"(\\d{1,})",
      "query": [`
            {
              VALUES ?cited_iri {<https://pubmed.ncbi.nlm.nih.gov/[[VAR]]>} .
              ?iri cito:hasCitedEntity ?cited_iri .
              ?iri cito:hasCitingEntity ?citing_id_iri .
              BIND(STRAFTER(str(?citing_id_iri), '.gov/') AS ?citing_id_val)
              ?iri cito:hasCitedEntity ?cited_id_iri .
              BIND(STRAFTER(str(?cited_id_iri), '.gov/') AS ?cited_id_val)
            }
            `
      ]
    }
  ],

"categories": [
    {
      "name": "citation",
      "label": "Citation",
      "macro_query": [
        `
            SELECT DISTINCT ?iri ?source ?browser ?short_iri ?citing_id_val ?citing_id_iri ?cited_id_val ?cited_id_iri ?creationdate ?timespan
                        WHERE  {
                        GRAPH ?g {

                            [[RULE]]

                            BIND(STRAFTER(STR(?iri), '/ci/') as ?short_iri) .
                            OPTIONAL {
                                ?iri cito:hasCitationCreationDate ?creationdate .
                                ?iri cito:hasCitationTimeSpan ?timespan .
                              }
                            BIND(REPLACE(STR(?iri), '/index/', '/index/browser/', 'i') as ?browser) .
                            BIND(STRAFTER(str(?g), "/index/") AS ?source)
                        }
            }
            `
      ],
      "fields": [
        //{"value":"source", "value_map": ["map_source"],"title": "Source", "column_width":"10%", "type": "text", "sort":{"value": "source", "type":"text"}},
        {"iskey": true, "value":"iri", "value_map": ["ci_label"], "title": "Id","column_width":"16%", "type": "text", "sort":{"value": "source", "type":"text"}, "link":{"field":"browser","prefix":""}},
        //{"value":"citing_id_val", "value_map": ["decodeURIStr"],"title": "Citing", "column_width":"12%", "type": "text", "sort":{"value": "citing_id_val", "type":"text"}, "link":{"field":"citing_id_iri","prefix":""}},
        {"value": "ext_data.citing_ref.reference", "title": "Citing entity", "column_width":"29%", "type": "text"},
        //{"value":"cited_id_val", "value_map": ["decodeURIStr"], "title": "Cited", "column_width":"12%", "type": "text", "sort":{"value": "cited_id_val", "type":"text"}, "link":{"field":"cited_id_iri","prefix":""}},
        {"value": "ext_data.cited_ref.reference", "title": "Cited entity", "column_width":"29%", "type": "text"},
        {"value":"creationdate", "value_map":["creation_year"], "title": "Creation", "column_width":"12%", "type": "text", "sort":{"value": "creationdate", "type":"text"},"filter":{"type_sort": "int", "min": 10000, "sort": "sum", "order": "desc"}},
        {"value":"timespan", "value_map":["timespan_in_months"], "title": "Timespan\n(months)", "column_width":"14%", "type": "text", "sort":{"value": "timespan", "type":"int"}, "filter":{"type_sort": "int", "min": 10000, "sort": "value", "order": "desc"}}
      ],
      "ext_data": {
        //"citing_ref": {"name": call_crossref, "param": {"fields":["citing_id_val"]}, "async": true},
        "citing_ref": {"name": "meta_call_to_get_ref", "param": {"fields":["citing_id_val","citing_id_iri"]}, "async": true},
        "cited_ref": {"name": "meta_call_to_get_ref", "param": {"fields":["cited_id_val","cited_id_iri"]}, "async": true}
      },
      "extra_elems":[
        {"elem_type": "a","elem_value": "Back to search" ,"elem_class": "btn btn-primary left" ,"elem_innerhtml": "Show the search interface", "others": {"href": "/index/search"}}
      ]
    }
  ],

  "page_limit": [5,10,15,20,30,40,50],
  "def_results_limit": 1,
  "search_base_path": "search",
  "advanced_search": true,
  "def_adv_category": "citation",
  "adv_btn_title": "Search in the OpenCitations Indexes",

  "progress_loader":{
            "visible": true,
            "spinner": true,
            "title":"Searching in the OpenCitations Indexes ...",
            "subtitle":"Be patient - this search might take several seconds!",
            "abort":{"title":"Abort Search","href_link":"/index/search"}
          },

   "timeout":{
            "value": 9000,
            "link": "/index/search"
          }

  }




var heuristics = (function () {

      //heuristic functions
      //you can define your own heuristic functions here
      function lower_case(str){
        return str.toLowerCase();
      }
      function capitalize_1st_letter(str){
        return str.charAt(0).toUpperCase() + str.slice(1);
      }
      function ci_label(str) {
        //var a = str.split("/ci/")[0];
        //var b = a.split("/index/");
        //var source = b[b.length - 1];
        //return source.toUpperCase();
        var a = str.split("/index/");
        return a[a.length - 1];
      }
      function map_source(str) {
        return str.toUpperCase().replace("/","");
      }
      function decodeURIStr(str) {
        return decodeURIComponent(str);
      }
      function encodeURIStr(str) {
        var dec_str = decodeURIStr(str);
        return encodeURIComponent(dec_str).replace(/[!'()*]/g, function (c) {
          return '%' + c.charCodeAt(0).toString(16);
        });
      }
      function encodeDOIURL(str) {
        //encode only the last part of the DOI
        //e.g. 10.3241/<ENCODE THIS>
        var dec_str = decodeURIStr(str);
        var parts = dec_str.split('/');
        var decoded_doi = parts[0] + "/" + encodeURIComponent(parts[1]).replace(/[!'()*]/g, function (c) {
          return '%' + c.charCodeAt(0).toString(16);
        });
        return decoded_doi;
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
      function creation_year(str) {
        return str.substring(0, 4);
      }

      function _timespan_parts(str) {
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

        return {"years":years,"months":months,"days":days};

      }

      function timespan_in_days(str) {
        var tparts = _timespan_parts(str);
        return String(tparts.years * 365 + tparts.months * 30 + tparts.days);
      }
      function timespan_in_months(str) {
        var tparts = _timespan_parts(str);
        return String(tparts.years * 12 + tparts.months);
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
        ci_label: ci_label,
        map_source: map_source,
        decodeURIStr: decodeURIStr,
        encodeURIStr: encodeURIStr,
        encodeDOIURL: encodeDOIURL,
        short_version: short_version,
        creation_year: creation_year,
        timespan_in_days: timespan_in_days,
        timespan_in_months: timespan_in_months,
        timespan_translate: timespan_translate
       }
})();

var callbackfunctions = (function () {

    function call_crossref(conf_params, index, async_bool, callbk_func, key_full_name, data_field, func_name ){
      var call_crossref_api = "https://api.crossref.org/works/";

      var str_doi = conf_params[0];
      if (str_doi != undefined) {
        var call_url =  call_crossref_api+ encodeURIComponent(str_doi);
        //var result_data = "...";
        $.ajax({
              dataType: "json",
              url: call_url,
              type: 'GET',
              async: async_bool,
              success: function( res_obj ) {
                  var func_param = [];
                  func_param.push(index, key_full_name, data_field, async_bool, func_name, conf_params, res_obj);
                  Reflect.apply(callbk_func,undefined,func_param);
              }
         });
      }
    }
    //https://citation.crosscite.org/format?doi=10.1145%2F2783446.2783605&style=apa&lang=en-US
    function ext_call_to_get_ref(conf_params, index, async_bool, callbk_func, key_full_name, data_field, func_name ){
      var call_crossref_api = "https://citation.crosscite.org/format?doi=";
      var suffix = "&style=apa&lang=en-US";

      var str_doi = conf_params[0];

      if (str_doi != undefined) {
        var call_url =  call_crossref_api+str_doi+suffix;
        //var result_data = "...";
        $.ajax({
              url: call_url,
              type: 'GET',
              async: async_bool,
              success: function( res ) {
                  var res_obj = {"reference": res};
                  var func_param = [];
                  func_param.push(index, key_full_name, data_field, async_bool, func_name, conf_params, res_obj);
                  Reflect.apply(callbk_func,undefined,func_param);
              }
         });
      }
    }

    function meta_call_to_get_ref(conf_params, index, async_bool, callbk_func, key_full_name, data_field, func_name ){
      //https://opencitations.net/meta/api/v1/metadata/doi:10.1007/978-1-4020-9632-7
      var call_meta = "https://opencitations.net/meta/api/v1/metadata/";
      var str_id = conf_params[0];
      var link_id = conf_params[1];

      if (str_id != undefined) {
        var call_id = "doi:"+str_id;
        if (/^\d{1,}$/.test(str_id)) {
          call_id = "pmid:"+str_id;
        }

        $.ajax({
              url: call_meta + call_id,
              type: 'GET',
              async: async_bool,
              success: function( call_res ) {

                  if (call_res.length > 0) {
                    // meta is supposed to return 1 entity only
                    res = call_res[0];
                    var entity_ref = "<a href='"+link_id+"'>"+str_id +"</a><br/><br/>";
                    if (res != undefined){
                      if ("title" in res) {
                        if (res["title"] != "") {
                          entity_ref += "Title: <i>"+res["title"]+"</i><br/><br/>";
                        }
                      }
                      if ("author" in res) {
                        if (res["author"] != "") {
                            entity_ref += "Author: <i>"+res["author"]+"</i>";
                        }
                      }
                      //if ("pub_date" in res) {
                      //  entity_ref += "Publication date: <i>"+res["pub_date"]+"</i>";
                      //}
                    }
                    var res_obj = {"reference": entity_ref};
                    var func_param = [];
                    func_param.push(index, key_full_name, data_field, async_bool, func_name, conf_params, res_obj);
                    Reflect.apply(callbk_func,undefined,func_param);
                  }
              },
              error: function (error)
              {
                  var res_obj = {"reference": "<a href='"+link_id+"'>"+str_id +"</a><br/><br/>"};
                  var func_param = [];
                  func_param.push(index, key_full_name, data_field, async_bool, func_name, conf_params, res_obj);
                  Reflect.apply(callbk_func,undefined,func_param);
              }
         });
      }
    }


  return {
    call_crossref: call_crossref,
    ext_call_to_get_ref: ext_call_to_get_ref,
    meta_call_to_get_ref: meta_call_to_get_ref
   }
  })();
