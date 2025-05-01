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

  // Calculate seconds per kilometer
  const secondsPerKm = totalSeconds / kilometers;

  // Convert back to MM:SS format
  const paceMinutes = Math.floor(secondsPerKm / 60);
  const paceSeconds = Math.round(secondsPerKm % 60);

  // Format seconds with leading zero if needed
  const formattedSeconds = paceSeconds.toString().padStart(2, "0");

  return `${paceMinutes}:${formattedSeconds} min/km`;
}

function getPaceColor(paceString) {
  // Extract minutes and seconds from the pace string (e.g. "4:30 min/km")
  const match = paceString.match(/(\d+):(\d+)/);
  if (!match) return "#000000"; // Default black

  const minutes = parseInt(match[1]);
  const seconds = parseInt(match[2]);
  const totalSeconds = minutes * 60 + seconds;

  // Define pace thresholds (in seconds per km)
  const excellentPace = 4 * 60;     // 4:00 min/km - very fast
  const goodPace = 5 * 60;          // 5:00 min/km - good
  const averagePace = 6 * 60;       // 6:00 min/km - average
  const slowPace = 7 * 60;          // 7:00 min/km - slow

  // Define colors for the gradient
  if (totalSeconds <= excellentPace) {
    return "#1E88E5";               // Blue for excellent pace
  } else if (totalSeconds <= goodPace) {
    return "#43A047";               // Green for good pace
  } else if (totalSeconds <= averagePace) {
    return "#FFA000";               // Orange for average pace
  } else if (totalSeconds <= slowPace) {
    return "#E53935";               // Red for slow pace
  } else {
    return "#8E24AA";               // Purple for very slow pace
  }
}

(function($) {
  "use strict";

  function processRows() {
    const rows = $(".training-activity-row");

    if (rows.length === 0) {
      console.log("No rows found yet");
      return false; // Signal that we didn't find rows
    }

    // Add the header for the pace column if it doesn't exist yet
    const headerRow = $("table.activities thead tr");
    if (headerRow.length > 0 && headerRow.find(".col-pace").length === 0) {
      const elevHeader = headerRow.find("th.col-elev");
      const paceHeader = $("<th class='col-pace col-sort-control'></th>");
      const paceSortButton = $("<button class='btn button-white btn-block btn-xs btn-sort' data-order='elev_gain DESC'>Pace</button>");

      paceHeader.append(paceSortButton);
      elevHeader.after(paceHeader);
    }

    rows.each(function() {
      // Check if the activity is a run
      const activityType = $(this).find("td.col-type").text().trim();

      const time = $(this).find(".col-time").text();
      const distanceText = $(this).find(".col-dist").text().replace(/\s+/g, "");
      const distance = parseFloat(distanceText);

      const pace = calculatePace(time, distance);

      // Check if we've already added a pace cell to this row
      if ($(this).find(".col-pace").length === 0) {
        // Insert pace after elevation column
        const paceCell = $("<td class='view-col col-pace'></td>");

        if (activityType === "Run") {
          paceCell.text(pace);
          paceCell.css("display", "table-cell");
          paceCell.css("text-align", "right");
          paceCell.css("color", getPaceColor(pace));
        }

        $(this).find(".col-elev").after(paceCell);
      }
    });

    return true; // Signal success
  }

  function retryWithTimeout(maxRetries = 10, interval = 500) {
    let retries = 0;

    function attempt() {
      if (processRows()) {
        return; // Success
      }

      retries++;
      if (retries < maxRetries) {
        setTimeout(attempt, interval);
      } else {
        console.log("Max retries reached, couldn't find rows");
      }
    }

    attempt();
  }

  // Use jQuery's ready function to ensure jQuery is loaded
  $(function() {
    retryWithTimeout();
  });
})(jQuery);
