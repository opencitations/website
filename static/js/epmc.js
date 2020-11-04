var ccc_api = "http://localhost:8080/api/v1/";

function expand_context(td,pointers) {
  $(document).ajaxStart(function() {
      $(document.body).css({'cursor' : 'wait'});
  }).ajaxStop(function() {
      $(document.body).css({'cursor' : 'default'});
  });
  var ramose_api = ccc_api+"intext-citation/"
  var pointers_list = pointers.split(";");
  var sentences = {};
  var new_td = $("<td>", {"class": "sentences remove"});

  $.each(pointers_list, function( index, intrepid ) {

    var query_ramose =  String(ramose_api)+ intrepid;
    //call ramose to retrieve data of indtrepids
    $.ajax({
          dataType: "json",
          url: query_ramose,
          type: 'GET',
          success: function( res_data ) {
              if (res_data.length == 0) {
                pass
              } else {
                  var query_epmc_xml = res_data[0].source
                  var sent_xpath = res_data[0].xpath_container
                  if (res_data[0].xpath_intext_reference.length == 0 && res_data[0].in_list.length != "no") {
                    var rp_xpath = res_data[0].in_list
                  } else {
                    var rp_xpath = res_data[0].xpath_intext_reference
                  }
                  // call EPMC to get the XML document
                  if (query_epmc_xml.length != 0) {
                    $.ajax({
                        dataType: "json",
                        url: query_epmc_xml,
                        type: 'GET',
                        dataType: "xml",
                        success: function( res_xml ) {
                            if (res_xml.length == 0) { pass }
                            else {
                              var rp_content = document.evaluate("string("+rp_xpath+")", res_xml, null, XPathResult.ANY_TYPE, null);

                              if (sent_xpath.length != 0) {
                                var sent_content = document.evaluate(sent_xpath, res_xml, null, XPathResult.ANY_TYPE, null);
                                sentences[sent_content.stringValue] = rp_content.stringValue;
                                $(new_td).append("<span class='sentence'>"+sent_content.stringValue+"</span>");

                              }
                            }
                        }
                   });
                 };
                }
          }

     });
  });
  return [new_td, sentences];
}
