$(window).load(function () {
  let last_date;
  let lastDate;
  const baseurl = ""

  // Default data visualizations: from the year before the last available month to the last available month

  axios.get(baseurl+'/statistics/last-month')
    .then(function (response) {
      // handle success
      metricsStr = response.data;
      var array0 = metricsStr.split(/\r?\n/);
      var filtered0 = array0.filter(function (value, index, arr) {
        return (!value.startsWith("#")) && (value.includes("opencitations_date_info"));
      });
      last_m_y = filtered0[0];

      //reference: https://stackoverflow.com/a/19793380/15097248

      function extractAllText(last_m_y) {
        const re = /"(.*?)"/g;
        const result = [];
        let current;
        while (current = re.exec(last_m_y)) {
          result.push(current.pop());
        }
        return (result.length > 0
          ? result
          : [last_m_y]);
      };

      let date_list = extractAllText(last_m_y)
      let end_year = date_list[1]
      let end_month = date_list[0]
      last_date = String(end_year + "-" + end_month) // Format: MM-YYYY
      $("#End_1").val(end_month + "/" + end_year)
      $("#End").val(end_month + "/" + end_year)
      lastDate = new Date(last_date) // Format: (Ora legale dell’Europa centrale) Day Mon DD YYYY HH:HH:HH GMT+0200
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    .then(function () {
      // -12 months from last date
      // reference: modificato da https://bobbyhadz.com/blog/javascript-date-subtract-months#:~:text=To%20subtract%20months%20from%20a,the%20value%20for%20the%20date.
      function subtractMonths(numOfMonths, date) {
        ybf_date = new Date(date)
        ybf_date.setMonth(ybf_date.getMonth() - numOfMonths);
        return ybf_date;
      };

      let yearbeforeDate = subtractMonths(12, lastDate); // Format: (Ora legale dell’Europa centrale) Day Mon DD YYYY HH:HH:HH GMT+0200

      function get_YYYY_MM_date(date_format) {
        let month = String(date_format.getUTCMonth() + 1);
        if (month.length < 2) {
          month = "0" + month;
        }
        let year = String(date_format.getUTCFullYear());
        return year + "-" + month
      };

      let yearbefore_date = get_YYYY_MM_date(yearbeforeDate)

      get_start_input_date_array = yearbefore_date.split("-");
      st_year = get_start_input_date_array[0];
      st_month = get_start_input_date_array[1];
      $("#Start_1").val(st_month + "/" + st_year);
      $("#Start").val(st_month + "/" + st_year);



      function get_default_query_array(st_mon, end_mon) {
        let dateStart = moment(st_mon);
        let dateEnd = moment(end_mon);
        let timeValues = [];

        while (dateEnd > dateStart || dateStart.format('M') === dateEnd.format('M')) {
          timeValues.push(baseurl+"/statistics/" + dateStart.format('YYYY-MM'));
          dateStart.add(1, 'month');
        }
        return timeValues;
      };

      let default_query_array = get_default_query_array(yearbefore_date, last_date);

      months = { "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec" };

      requests_list = []
      for (i = 0; i < default_query_array.length; i++) {
        let ax_req_serv = axios.get(default_query_array[i])
        requests_list.push(ax_req_serv)
      }

      let dict_name = {};
      axios.all(requests_list).then(axios.spread((...responses) => {
        for (i = 0; i < responses.length; i++) {
          element = default_query_array[i];
          const datePattern = /(\d{4})\-(\d{1,2})/;
          const date = datePattern.exec(element);
          metricsStr = (responses[i]).data;

          // The prometheus content is new-line-delimited
          var array1 = metricsStr.split(/\r?\n/);
          // or : var array = metricsStr.match(/[^\r\n]+/g);
          var filtered = array1.filter(function (value, index, arr) {
            return !value.startsWith("#");
            // discard the rows starting with "#", since those are comments
          });

          // populate a dictionary with the data extracted from the prometheus
          prom_to_dict = {}

          const pattern = /{/;
          //reference: https://stackoverflow.com/a/19793380/15097248
          function extractQuotedText(str) {
            const matches = str.match(/"(.*?)"/);
            return (matches
              ? matches[1]
              : str);
          };

          for (let i = 0; i < filtered.length; i++) {
            if (pattern.test(filtered[i]) == true) {
              let pos_open_par = filtered[i].indexOf('{')
              let pos_close_par = filtered[i].indexOf('}')

              let dict_key = filtered[i].substr(0, pos_open_par);
              if (!(dict_key in prom_to_dict)) {
                prom_to_dict[dict_key] = {}
              };

              let nest_dict_key = extractQuotedText(filtered[i])
              let nest_dict_val = filtered[i].substr(pos_close_par + 2);

              prom_to_dict[dict_key][nest_dict_key] = nest_dict_val

            } else {
              // The whitespace is used as separator between a key and a value
              // TO DO: Handle the possibility of multiple spaces (never encountered up to now)
              let pos_space = filtered[i].indexOf(' ');
              let dict_key = filtered[i].substr(0, pos_space);
              let dict_val = filtered[i].substr(pos_space + 1);
              prom_to_dict[dict_key] = dict_val
            };
          }

          // extraction of required data: api_req e dataset_req
          api_req = prom_to_dict.opencitations_agg_counter_total.oc_api_requests
          dataset_req = prom_to_dict.opencitations_agg_counter_total.dataset_requests


          let result = {};
          result["api_requests"] = Number(api_req);
          result["dataset_requests"] = Number(dataset_req);

          key_name = months[date[2]] + " " + date[1];
          dict_name[key_name] = result;


        }

        api_req_list = [];
        dataset_req_list = [];
        labels_list = [];

        for (const key in dict_name) {
          labels_list.push(key);
          api_req_list.push(dict_name[key].api_requests);
          dataset_req_list.push(dict_name[key].dataset_requests);
        }

        /// Data visualizations update, with the data chosen by the user
        // BarChart for Usage of Services
        var barChartData = {
          labels: labels_list,
          datasets: [
            {
              label: "API",
              backgroundColor: "#3C41E5",
              borderColor: "blue",
              borderWidth: 1,
              data: api_req_list
            },
            {
              label: "Datasets",
              backgroundColor: "#AB54FD",
              borderColor: "purple",
              borderWidth: 1,
              data: dataset_req_list
            },
          ]
        };

        var chartOptions = {
          responsive: true,
          legend: {
            position: "top"
          },
          title: {
            display: true,
            text: "Services Usage Bar Chart"
          },
          scales: {
            y: {
              display: true,
              type: 'logarithmic',
              /*
              ticks: {
                  callback: function(value, index, ticks) {
                      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                  }
              }*/
            }
          }
        }


        var ctx = document.getElementById("myChart2").getContext("2d");

        myBar = new Chart(ctx, {
          type: "bar",
          data: barChartData,
          options: chartOptions
        });

      })).catch(errors => {
        // react on errors.
      });




      // LineChart for Indexed Records

      let default_query_array_bimestr = [];
      for (const [index, element] of default_query_array.entries()) {
        if (index % 2 == 0) {
          default_query_array_bimestr.push(element);
        }
      }

      requests_list_1 = []

      for (i = 0; i < default_query_array_bimestr.length; i++) {
        let ax_req = axios.get(default_query_array_bimestr[i])
        requests_list_1.push(ax_req)
      }

      let dict_name_1 = {};
      axios.all(requests_list_1).then(axios.spread((...responses) => {
        for (i = 0; i < responses.length; i++) {
          element = default_query_array_bimestr[i];
          const datePattern = /(\d{4})\-(\d{1,2})/;
          const date = datePattern.exec(element);
          metricsStr = (responses[i]).data;

          //The prometheus content is new-line-delimited
          var array1 = metricsStr.split(/\r?\n/);
          // or : var array = metricsStr.match(/[^\r\n]+/g);
          var filtered = array1.filter(function (value, index, arr) {
            return !value.startsWith("#");
            // discard the rows starting with "#", since those are comments
          });
          // populate a dictionary with the data extracted from the prometheus
          prom_to_dict = {}
          const pattern = /{/;
          //reference: https://stackoverflow.com/a/19793380/15097248
          function extractQuotedText(str) {
            const matches = str.match(/"(.*?)"/);
            return (matches
              ? matches[1]
              : str);
          };

          for (let i = 0; i < filtered.length; i++) {
            if (pattern.test(filtered[i]) == true) {
              let pos_open_par = filtered[i].indexOf('{')
              let pos_close_par = filtered[i].indexOf('}')

              let dict_key = filtered[i].substr(0, pos_open_par);
              if (!(dict_key in prom_to_dict)) {
                prom_to_dict[dict_key] = {}
              };

              let nest_dict_key = extractQuotedText(filtered[i])
              let nest_dict_val = filtered[i].substr(pos_close_par + 2);

              prom_to_dict[dict_key][nest_dict_key] = nest_dict_val

            } else {
              // The whitespace is used as separator between a key and a value
              // TO DO: Handle the possibility of multiple spaces (never encountered up to now)
              let pos_space = filtered[i].indexOf(' ');
              let dict_key = filtered[i].substr(0, pos_space);
              let dict_val = filtered[i].substr(pos_space + 1);
              prom_to_dict[dict_key] = dict_val
            };
          }

          // extraction of required data: api_req e dataset_req
          ind_rec = prom_to_dict.opencitations_indexed_records
          let result = {};
          result["indexed_records"] = Number(ind_rec);
          key_name = months[date[2]] + " " + date[1];
          dict_name_1[key_name] = result;


        }

        ind_rec_list = [];
        labels_list = [];


        for (const key in dict_name_1) {
          labels_list.push(key);
          ind_rec_list.push(dict_name_1[key].indexed_records);
        }

        // Data visualizations update, with the data chosen by the user
        // Linechart for Indexed Records

        var lineChartData = {
          labels: labels_list,
          datasets: [
            {
              label: "OC Indexed Records",
              backgroundColor: "#AB54FD",
              borderColor: "purple",
              borderWidth: 1,
              data: ind_rec_list
            },
          ]
        }

        var lineChartOptions = {

          responsive: true,
          legend: {
            position: "top"
          },
          title: {
            display: true,
            text: "Indexed records Line Chart"
          },
          scales: {
            y: {
              display: true,
              type: 'linear',
              /*
              ticks: {
                  callback: function(value, index, ticks) {
                      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                  }
              }*/
            }
          }

        }

        var ctx2 = document.getElementById("myChart").getContext("2d");
        myLine = new Chart(ctx2, {
          type: "line",
          data: lineChartData,
          options: lineChartOptions
        });

        done();

      })).catch(errors => {
        // react on errors.
      })
    })
    .then(function () {
      // code for computing the number of months elapsed between two dates
      // Reference: https://stackoverflow.com/questions/2536379/difference-in-months-between-two-dates-in-javascript/2536445#2536445
      function elapsedMonths(d1, d2) {
        var months;
        months = (d2.getFullYear() - d1.getFullYear()) * 12;
        months -= d1.getMonth();
        months += d2.getMonth();
        return months <= 0 ? 0 : months;
      }

      let init_data_month = new Date('2021-01-01') // Jan 2021 is the first months whose data were made available by opencitations/statistics
      let cur_data_month = new Date();
      let ultima_data_array = $("#End").val().split("/")
      let ultima_data = ultima_data_array[0] + "/01/" + ultima_data_array[1]
      //console.log("ultima_data", ultima_data)
      let latest_data_month = new Date(ultima_data);
      //console.log("latest_data_month", latest_data_month)

      let elapsed_record_months = elapsedMonths(init_data_month, cur_data_month);
      //console.log("latest_data_month", latest_data_month)
      let latest_cur_elapsed_record_months = elapsedMonths(latest_data_month, cur_data_month);
      //console.log("latest_cur_elapsed_record_months", latest_cur_elapsed_record_months)


      // default-value variables
      let split_array_start = $("#Start").val().split("/")
      let split_array_end = $("#End").val().split("/")

      let start = split_array_start[1] + "-" + split_array_start[0];
      //console.log("start", start)
      let end = split_array_end[1] + "-" + split_array_end[0];
      let StartDate = new Date(split_array_start[0] + "/01/" + split_array_start[1]);
      let EndDate = new Date(split_array_end[0] + "/01/" + split_array_end[1]);
      let Interval = 1; // Log data are computed monthly

      let start_1 = split_array_start[1] + "-" + split_array_start[0];
      let end_1 = split_array_end[1] + "-" + split_array_end[0];
      let StartDate_1 = new Date(split_array_start[0] + "/01/" + split_array_start[1]);
      let EndDate_1 = new Date(split_array_end[0] + "/01/" + split_array_end[1]);
      let Interval_1 = 2; // Indexed Records growth is computed on two-month base

      $('#Start').MonthPicker({
        MaxMonth: - latest_cur_elapsed_record_months, // it depends on the last-month available (API response - statistics/last-month)
        MinMonth: - elapsed_record_months,
        OnAfterChooseMonth: function (selectedDate) {
          StartDate = selectedDate;
          year = selectedDate.getFullYear();
          month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
          let date_for_query = year + "-" + month;
          //console.log(date_for_query);
          start = date_for_query;
          //comment if you do not want auto generation of the chart
          $('#Invio').click();
        }
      });


      $('#Start_1').MonthPicker({
        MaxMonth: - latest_cur_elapsed_record_months, // it depends on the last-month available (API response - statistics/last-month)
        MinMonth: - elapsed_record_months,
        OnAfterChooseMonth: function (selectedDate) {
          StartDate_1 = selectedDate;
          year_1 = selectedDate.getFullYear();
          month_1 = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
          let date_for_query_1 = year_1 + "-" + month_1;
          //console.log(date_for_query_1);
          start_1 = date_for_query_1;
          //comment if you do not want auto generation of the chart
          $('#Invio_1').click();
        }
      });

      $('#End').MonthPicker({
        MaxMonth: - latest_cur_elapsed_record_months, // it depends on the last-month available (API response - statistics/last-month)
        MinMonth: - elapsed_record_months,
        OnAfterChooseMonth: function (selectedDate) {
          EndDate = selectedDate;
          year = selectedDate.getFullYear();
          month = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
          let date_for_query = year + "-" + month;
          //console.log(date_for_query);
          end = date_for_query;
          //comment if you do not want auto generation of the chart
          $('#Invio').click();
        }
      });

      $('#End_1').MonthPicker({
        MaxMonth: - latest_cur_elapsed_record_months, // it depends on the last-month available (API response - statistics/last-month)
        MinMonth: - elapsed_record_months,
        OnAfterChooseMonth: function (selectedDate) {
          EndDate_1 = selectedDate;
          year_1 = selectedDate.getFullYear();
          month_1 = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
          let date_for_query_1 = year_1 + "-" + month_1;
          //console.log(date_for_query_1);
          end_1 = date_for_query_1;
          //comment if you do not want auto generation of the chart
          $('#Invio_1').click();
        }
      });


      $('#Intervallo').on('change', function () {
        Interval = ($(this).val());
        //comment if you do not want auto generation of the chart
        $('#Invio').click();
      });

      $('#Intervallo_1').on('change', function () {
        Interval_1 = ($(this).val());
        //comment if you do not want auto generation of the chart
        $('#Invio_1').click();
      });

      // Data visualizations update and error-handling

      $('#Invio').click(function () {
        if (StartDate == "" && EndDate == "") {
          window.alert("Select a Start Date and an End Date (Bar Chart)")
        } else if (StartDate == "") {
          window.alert(EndDate, "Select a Start Date (Bar Chart)")
        } else if (EndDate == "") {
          window.alert("Select an End Date (Bar Chart)")
        } else {


          if (StartDate >= EndDate) {
            StartDate = ""
            EndDate = ""
            $('#Start').val("")
            $('#End').val("")

            window.alert("Start Date must precede End Date (Bar Chart)")
            throw "Start Date must precede End Date (Bar Chart)"
          } else {
            //console.log(StartDate, EndDate)

            // Month list extraction: http://jsfiddle.net/McCroskey42/1tp1hw8w/419/
            var start_Date = moment(start);
            var end_Date = moment(end);
            var result = [];
            while (start_Date.isBefore(end_Date)) {
              result.push(baseurl+"/statistics/" + start_Date.format("YYYY-MM"));
              start_Date.add(1, 'month');
            }
            result.push(baseurl+"/statistics/" + end_Date.format("YYYY-MM"))
          }


          let result_w_interval = [];

          // Month-interval management
          if (Interval == 1) {
            result_w_interval = result;
          } else {
            for (const [index, element] of result.entries()) {
              if (index % Interval == 0) {
                result_w_interval.push(element);
              }
            }
          }


          // Preparation of the axios API requests list
          requests_list = []

          for (i = 0; i < result_w_interval.length; i++) {
            let ax_req_serv = axios.get(result_w_interval[i])
            requests_list.push(ax_req_serv)
          }

          let dict_name = {};
          months = { "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec" };

          // Parallel requests: for each request, prometheus data are stored in a dictionary.
          // The dictionary is filtered, so to keep the relevant data only (i.e., indexed records number and data about services usage)
          // This reduced dictionary has the dates as keys (Mon_YYYY format) and dictionaries storing the relevant data as values.

          axios.all(requests_list).then(axios.spread((...responses) => {
            for (i = 0; i < responses.length; i++) {
              element = result_w_interval[i];
              const datePattern = /(\d{4})\-(\d{1,2})/;
              const date = datePattern.exec(element);
              metricsStr = (responses[i]).data;

              var array1 = metricsStr.split(/\r?\n/);
              var filtered = array1.filter(function (value, index, arr) {
                return !value.startsWith("#");
              });

              prom_to_dict = {}

              const pattern = /{/;
              //reference: https://stackoverflow.com/a/19793380/15097248
              function extractQuotedText(str) {
                const matches = str.match(/"(.*?)"/);
                return (matches
                  ? matches[1]
                  : str);
              };

              for (let i = 0; i < filtered.length; i++) {
                if (pattern.test(filtered[i]) == true) {
                  let pos_open_par = filtered[i].indexOf('{')
                  let pos_close_par = filtered[i].indexOf('}')

                  let dict_key = filtered[i].substr(0, pos_open_par);
                  if (!(dict_key in prom_to_dict)) {
                    prom_to_dict[dict_key] = {}
                  };

                  let nest_dict_key = extractQuotedText(filtered[i])
                  let nest_dict_val = filtered[i].substr(pos_close_par + 2);

                  prom_to_dict[dict_key][nest_dict_key] = nest_dict_val

                } else {
                  let pos_space = filtered[i].indexOf(' ');
                  let dict_key = filtered[i].substr(0, pos_space);
                  let dict_val = filtered[i].substr(pos_space + 1);
                  prom_to_dict[dict_key] = dict_val
                };
              }

              api_req = prom_to_dict.opencitations_agg_counter_total.oc_api_requests
              dataset_req = prom_to_dict.opencitations_agg_counter_total.dataset_requests


              let result = {};
              result["api_requests"] = Number(api_req);
              result["dataset_requests"] = Number(dataset_req);

              key_name = months[date[2]] + " " + date[1];
              dict_name[key_name] = result;


            }

            api_req_list = [];
            dataset_req_list = [];
            labels_list = [];

            for (const key in dict_name) {
              labels_list.push(key);
              api_req_list.push(dict_name[key].api_requests);
              dataset_req_list.push(dict_name[key].dataset_requests);
            }

            // Visualizations Update
            // Destruction of current visualizations
            myBar.destroy()

            // Creation of new graphs with data about the months requested by the user
            // BarChart for Usage of Services
            var barChartData = {
              labels: labels_list,
              datasets: [
                {
                  label: "API",
                  backgroundColor: "#3C41E5",
                  borderColor: "blue",
                  borderWidth: 1,
                  data: api_req_list
                },
                {
                  label: "Datasets",
                  backgroundColor: "#AB54FD",
                  borderColor: "purple",
                  borderWidth: 1,
                  data: dataset_req_list
                },
              ]
            };

            var chartOptions = {
              responsive: true,
              legend: {
                position: "top"
              },
              title: {
                display: true,
                text: "Services Usage Bar Chart"
              },
              scales: {
                y: {
                  display: true,
                  type: 'logarithmic',
                  /*
                  ticks: {
                      callback: function(value, index, ticks) {
                          return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                      }
                  }*/
                }
              }
            }


            var ctx = document.getElementById("myChart2").getContext("2d");

            myBar = new Chart(ctx, {
              type: "bar",
              data: barChartData,
              options: chartOptions
            });

          })).catch(errors => {
            // react on errors.
          })
        }
      });




      // Data visualizations update and error-handling

      $('#Invio_1').click(function () {
        if (StartDate_1 == "" && EndDate_1 == "") {
          window.alert("Select a Start Date and an End Date (Line Chart)")
        } else if (StartDate_1 == "") {
          window.alert("Select a Start Date (Line Chart)")
        } else if (EndDate_1 == "") {
          window.alert("Select an End Date (Line Chart)")
        } else {


          if (StartDate_1 >= EndDate_1) {
            StartDate_1 = ""
            EndDate_1 = ""
            $('#Start_1').val("")
            $('#End_1').val("")

            window.alert("Start Date must precede End Date (Line Chart)")
            throw "Start Date must precede End Date (Line Chart)"
          } else {
            //console.log(StartDate_1, EndDate_1)

            // Month list extraction: http://jsfiddle.net/McCroskey42/1tp1hw8w/419/
            var start_Date_1 = moment(start_1);
            var end_Date_1 = moment(end_1);
            var result_1 = [];
            while (start_Date_1.isBefore(end_Date_1)) {
              result_1.push(baseurl+"/statistics/" + start_Date_1.format("YYYY-MM"));
              start_Date_1.add(1, 'month');
            }
            result_1.push(baseurl+"/statistics/" + end_Date_1.format("YYYY-MM"))
          }


          let result_w_interval_1 = [];

          // Month-interval management
          if (Interval_1 == 1) {
            result_w_interval_1 = result_1;
          } else {
            for (const [index, element] of result_1.entries()) {
              if (index % Interval_1 == 0) {
                result_w_interval_1.push(element);
              }
            }
          }


          // Preparation of the axios API requests list
          requests_list_1 = []

          for (i = 0; i < result_w_interval_1.length; i++) {
            let ax_req = axios.get(result_w_interval_1[i])
            requests_list_1.push(ax_req)
          }

          let dict_name_1 = {};
          months = { "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec" };

          // Parallel requests: for each request, prometheus data are stored in a dictionary.
          // The dictionary is filtered, so to keep the relevant data only (i.e., indexed records number and data about services usage)
          // This reduced dictionary has the dates as keys (Mon_YYYY format) and dictionaries storing the relevant data as values.

          axios.all(requests_list_1).then(axios.spread((...responses) => {
            for (i = 0; i < responses.length; i++) {
              element = result_w_interval_1[i];
              const datePattern = /(\d{4})\-(\d{1,2})/;
              const date = datePattern.exec(element);
              metricsStr = (responses[i]).data;

              var array1 = metricsStr.split(/\r?\n/);
              var filtered = array1.filter(function (value, index, arr) {
                return !value.startsWith("#");
              });

              prom_to_dict = {}

              const pattern = /{/;
              //reference: https://stackoverflow.com/a/19793380/15097248
              function extractQuotedText(str) {
                const matches = str.match(/"(.*?)"/);
                return (matches
                  ? matches[1]
                  : str);
              };

              for (let i = 0; i < filtered.length; i++) {
                if (pattern.test(filtered[i]) == true) {
                  let pos_open_par = filtered[i].indexOf('{')
                  let pos_close_par = filtered[i].indexOf('}')

                  let dict_key = filtered[i].substr(0, pos_open_par);
                  if (!(dict_key in prom_to_dict)) {
                    prom_to_dict[dict_key] = {}
                  };

                  let nest_dict_key = extractQuotedText(filtered[i])
                  let nest_dict_val = filtered[i].substr(pos_close_par + 2);

                  prom_to_dict[dict_key][nest_dict_key] = nest_dict_val

                } else {
                  let pos_space = filtered[i].indexOf(' ');
                  let dict_key = filtered[i].substr(0, pos_space);
                  let dict_val = filtered[i].substr(pos_space + 1);
                  prom_to_dict[dict_key] = dict_val
                };
              }

              ind_rec = prom_to_dict.opencitations_indexed_records

              let result = {};
              result["indexed_records"] = Number(ind_rec);
              key_name = months[date[2]] + " " + date[1];
              dict_name_1[key_name] = result;


            }

            ind_rec_list = [];
            labels_list = [];


            for (const key in dict_name_1) {
              labels_list.push(key);
              ind_rec_list.push(dict_name_1[key].indexed_records);
            }

            // Visualizations Update
            // Destruction of current visualizations

            myLine.destroy()

            // Creation of new graphs with data about the months requested by the user
            // Linechart for Indexed Records
            var lineChartData = {
              labels: labels_list,
              datasets: [
                {
                  label: "OC Indexed Records",
                  backgroundColor: "#AB54FD",
                  borderColor: "purple",
                  borderWidth: 1,
                  data: ind_rec_list
                },
              ]
            }

            var lineChartOptions = {

              responsive: true,
              legend: {
                position: "top"
              },
              title: {
                display: true,
                text: "Indexed records Line Chart"
              },
              scales: {
                y: {
                  display: true,
                  type: 'linear',
                  /* replace "." > ","
                  ticks: {
                      callback: function(value, index, ticks) {
                          return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                      }
                  }*/
                }
              }
            }

            var ctx2 = document.getElementById("myChart").getContext("2d");
            myLine = new Chart(ctx2, {
              type: "line",
              data: lineChartData,
              options: lineChartOptions
            });

          })).catch(errors => {
            // react on errors.
          })
        }
      });

    });

});

function done() {
    document.getElementById("loading").style = "display: none;";
    document.getElementById("page_cont").style = "display: visible;",
    document.getElementsByTagName("footer")[0].style = "display: visible;"
}
