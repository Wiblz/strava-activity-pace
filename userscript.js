// ==UserScript==
// @name         Strava Pace Calculator
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Calculate pace for Strava activities
// @author       Wiblz
// @match        https://www.strava.com/athlete/training
// @icon         https://www.google.com/s2/favicons?sz=64&domain=strava.com
// @grant        GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// ==/UserScript==

function calculatePace(timeString, kilometers) {
  // Parse the time string into total seconds
  const timeParts = timeString.split(":").map(part => parseInt(part));
  let totalSeconds = 0;

  if (timeParts.length === 3) { // H:MM:SS format
    totalSeconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
  } else if (timeParts.length === 2) { // MM:SS format
    totalSeconds = timeParts[0] * 60 + timeParts[1];
  }

  return totalSeconds / kilometers;
}

function getPaceColor(pace) {
  // Define pace thresholds (in seconds per km)
  const excellentPace = 6 * 60;
  const goodPace = 6 * 60 + 30;
  const averagePace = 7 * 60;
  const slowPace = 7 * 60 + 30;

  // Define colors for the gradient
  if (pace <= excellentPace) {
    return "#8E24AA";
  } else if (pace <= goodPace) {
    return "#43A047";
  } else if (pace <= averagePace) {
    return "#ffd000";
  } else if (pace <= slowPace) {
    return "#e57035";
  } else {
    return "#E53935";
  }
}

(function ($) {
  "use strict";

  function addPaceHeader() {
    const headerRow = $("table.activities thead tr");
    if (headerRow.length > 0 && headerRow.find(".col-pace").length === 0) {
      const elevHeader = headerRow.find("th.col-elev");
      const paceHeader = $("<th class='col-pace col-sort-control'></th>");
      const paceSortButton = $("<button class='btn button-white btn-block btn-xs btn-sort' data-order='elev_gain DESC'>Pace</button>");

      paceHeader.append(paceSortButton);
      elevHeader.after(paceHeader);
    }
  }

  function processRows() {
    // Add the header for the pace column if it doesn't exist yet
    addPaceHeader();

    // Process only rows that don't have pace cells yet
    const unprocessedRows = $(".training-activity-row").filter(function () {
      return $(this).find(".col-pace").length === 0;
    });

    unprocessedRows.each(function () {
      // Check if the activity is a run
      const activityType = $(this).find("td.col-type").text().trim();

      const time = $(this).find(".col-time").text();
      const distanceText = $(this).find(".col-dist").text().replace(/\s+/g, "");
      const distance = parseFloat(distanceText);

      const pace = calculatePace(time, distance);

      // Insert pace after elevation column
      const paceCell = $("<td class='view-col col-pace'></td>");

      if (activityType === "Run") {
        paceCell.text(`${Math.floor(pace / 60)}:${(Math.round(pace % 60)).toString().padStart(2, "0")} min/km`);
        paceCell.css("display", "table-cell");
        paceCell.css("text-align", "right");
        paceCell.css("color", getPaceColor(pace));
      }

      $(this).find(".col-elev").after(paceCell);
    });
  }

  function setupTableObserver() {
    // Wait for the table to be available in the DOM
    const checkForTable = setInterval(function () {
      const tableBody = $("table.activities tbody");

      if (tableBody.length > 0) {
        clearInterval(checkForTable);

        const observer = new MutationObserver(function (mutations) {
          processRows();
        });

        observer.observe(tableBody[0], {
          childList: true,  // observe direct children changes (added/removed rows)
          subtree: true     // observe deeper changes in row content
        });

        // Process initially loaded rows
        processRows();
      }
    }, 300);
  }

  // Use jQuery's ready function to ensure jQuery is loaded
  $(function () {
    setupTableObserver();
  });
})(jQuery);
