var ccc_api = "https://opencitations.net/ccc/api/v1/";

function call_ramose_citations(str_doi) {
  var call_ramose_api_metadata = ccc_api+"citations/";
  var call_full = call_ramose_api_metadata + encodeURIComponent(str_doi);
  var result_data = {};
  var creation_data = [];
  var self_data = [];
  $.ajax({
        dataType: "json",
        url: call_full,
        type: 'GET',
        async: false,
        success: function( res_obj ) {
            result_data = res_obj
            var groupedData = _.groupBy(res_obj, function(d){return d.creation});
            var selfData = _.groupBy(res_obj, function(d){return d.author_sc});
            self_data.push(selfData);

            for (var key in groupedData){
                  var obj = {};
                  var citations_num = groupedData[key].length;
                  obj["year"] = key
                  obj["citations"] = citations_num;
                  creation_data.push(obj);
            }
        }
   });
   return [creation_data,self_data,result_data];
};

function call_ramose_metadata(dois) {
  var call_ramose_api_metadata = ccc_api+"metadata/";
  var call_full = call_ramose_api_metadata + dois;
  var venues = [];
  $.ajax({
        dataType: "json",
        url: call_full,
        type: 'GET',
        async: false,
        success: function( res_obj ) {
            var groupedData = _.groupBy(res_obj, function(d){return d.source_title});
            for (var key in groupedData){
                var obj = {};
                var venue = key;
                var venue_count = groupedData[key].length;
                obj[venue] = venue_count;
                venues.push(obj);
            }
        }
   });
   return venues
};

function self_citations(data) {
  document.body.style.cursor = 'wait';
  var self_citations_block = "<div class='graph_block self_citations'><p class='title_graph'>citation types</p>";
  for (i = 0; i < data.length; i++) {
    for (var key in data[i]){
          var citations_num = data[i][key].length;
          self_citations_block += "<p class='"+key+"'><span>"+citations_num+"</span></p>";
    };
  };
  self_citations_block += "</div>";
  $("#browser_metrics").append(self_citations_block).show('slow');
};

function citation_venues(data) {
  document.body.style.cursor = 'wait';
  var dois = citing_dois(data);
  var venues = call_ramose_metadata(encodeURIComponent(dois));
  var venues_sort = [];
  for (i = 0; i < venues.length; i++) {
    for(journal in venues[i]) {
      venues_sort.push([journal, venues[i][journal] ]);
      }
  };

  var venues_block = "<div class='graph_block venues'><p class='title_graph'>citing venues</p>";
  for (i = 0; i < venues_sort.length; i++) {
      venues_block += "<p><span class='venue_count'>"+venues_sort[i][1]+"</span><span class='venue_title'>"+venues_sort[i][0]+"</span></p>";
  };
  venues_block += '</div>';
  $("#browser_metrics").append(venues_block).show('slow');
};

function call_ramose_metadata_authors(dois) {
  var call_ramose_api_metadata = ccc_api+"metadata/";
  var call_full = call_ramose_api_metadata + dois;
  console.log(call_full);
  var authors = {};
  $.ajax({
        dataType: "json",
        url: call_full,
        type: 'GET',
        async: false,
        success: function( res_obj ) {
          console.log(res_obj);
          for (i = 0; i < res_obj.length; i++) {
            var paper = res_obj[i];
            var authors_list = paper['author'].split("; ");;
              for (j = 0; j < authors_list.length; j++) {
                authors[authors_list[j]] = (authors[authors_list[j]] || 0) +1 ;
              }
          }

        }
   });

   return authors
};


function citing_authors(data) {
  document.body.style.cursor = 'wait';
  var dois = citing_dois(data);
  var authors = call_ramose_metadata_authors( encodeURIComponent(dois) );
  var authors_sort = [];
  for (var author in authors) {
      authors_sort.push([author, authors[author]]);
  }

  authors_sort.sort(function(a, b) {
      return b[1] - a[1];
  });

  var authors_block = "<div class='graph_block authors'><p class='title_graph'>citing authors</p>";
  for (i = 0; i < authors_sort.length; i++) {
      authors_block += "<p><span class='venue_count'>"+authors_sort[i][1]+"</span><span class='venue_title'>"+authors_sort[i][0]+"</span></p>";
  };
  authors_block += '</div>';
  $("#browser_metrics").append(authors_block).show('slow');
};

function citations_by_year(data) {
  document.body.style.cursor = 'wait';
    $("#browser_metrics").append("<div id='citations_year' class='graph_block citations_year'><p class='title_graph'>citations per year</p>").show('slow')
    const svgContainer = d3.select("#citations_year").append("svg");
    const svg = d3.select('svg');
    const margin = 20;
    const width = 180 - 2 * margin;
    const height = 220 - 2 * margin;

    const chart = svg.append('g')
      .attr('transform', `translate(${margin}, 10)`);

    const xScale = d3.scaleBand()
      .range([0, width])
      .domain(data.map((s) => s.year))
      .padding(0.1);


    const yScale = d3.scaleBand()
      .range([height, 0])
      .domain(data.map((s) => s.citations));

    const makeYLines = () => d3.axisLeft()
      .scale(yScale)

    chart.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("text-anchor", "end")
        .attr("transform", "rotate(-65)")
        .attr("dx", "-.8em")
        .attr("dy", ".15em");

    chart.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale));

    const barGroups = chart.selectAll()
      .data(data)
      .enter()
      .append('g')

    barGroups
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (g) => xScale(g.year))
      .attr('y', (g) => yScale(g.citations))
      .attr('opacity', 0.6)
      .attr('height', (g) => height - yScale(g.citations))
      .attr('width', xScale.bandwidth())
      .on('mouseenter', function (actual, i) {
        d3.selectAll('.value')
          .attr('opacity', 1)

        d3.select(this)
          .transition()
          .duration(300)
          .attr('opacity', 1)

      })
      .on('mouseleave', function () {
        d3.selectAll('.value')
          .attr('opacity', 0.6)

        d3.select(this)
          .transition()
          .duration(300)
          .attr('opacity', 0.6)
          .attr('x', (a) => xScale(a.year))
          .attr('width', xScale.bandwidth())

        chart.selectAll('#limit').remove()
        chart.selectAll('.divergence').remove()
      })

    barGroups
      .append('text')
      .attr('class', 'value')
      .attr('x', (a) => xScale(a.year) + xScale.bandwidth() / 2)
      .attr('y', (a) => yScale(a.citations) + 30)
      .attr('text-anchor', 'middle')
      .text((a) => `${a.citations}`)

    svg
      .append('text')
      .attr('class', 'label_graph')
      .attr('x', -(height / 2) - margin)
      .attr('y', margin / 2.4)
      .attr('transform', 'rotate(-90)')
      .attr('text-anchor', 'middle')
      // .text('citations')

    svg.append('text')
      .attr('class', 'label_graph')
      .attr('x', width )
      .attr('y', height + margin * 2)
      .attr('text-anchor', 'middle')
      // .text('year')

    // svg.append('text')
    //   .attr('class', 'title_graph')
    //   .attr('x', 70)
    //   .attr('y', 10)
    //   .attr('text-anchor', 'middle')
    //   .text('citations per year')
    $("#browser_metrics").append("</div>").show('slow')
};

function citing_dois(data) {
  var dois = '';
  for (i = 0; i < data.length; i++) {
        if (data[i]['citing_doi'].length > 0 && i < data.length-1) {
          var citing = data[i]['citing_doi'];
          dois += citing+'__';
        };
        if (data[i]['citing_doi'].length > 0 && i == data.length-1) {
          var citing = data[i]['citing_doi'];
          dois += citing;
        };
  };
  return dois
};

function normalise(val, max, min) { return (val - min) / (max - min); };
