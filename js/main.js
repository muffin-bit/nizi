"use strict";

// Hazel Chan vs Chen

//
//   CONSTANTS
//

var OFFSET = 23;
var NORMAL_WIDTH = 6;
var SELECT_WIDTH = 8;
var NORMAL_OPACITY = 0.1;
var SELECT_OPACITY = 1;
var CHART_WIDTH = 500;

// Cutoffs
// var EP10_CUTOFF = 60;
// var EP16_CUTOFF = 35;
// var EP_UNKNOWN_CUTOFF = 20;
var FINAL_CUTOFF = 35;

var height = 400; // Make sure to update this in css too?
var padding = 40;
var middlePadding = (padding * 2) + 100;
var width = $(window).width() - middlePadding - CHART_WIDTH - 30;

var episodes = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"];
var totalData;
var dFirst;

var colors = {
    "A": "#fb9fcb",
    "B": "#ff951c",
    "C": "#fff200",
    "D": "#00a500",
    "F": "gray"
};






//
//   SET UP CHART
//

var svg = d3.select("#plot").append("svg")
    .attr("class", "axis")
    .attr("height", height + padding * 2)
    .attr("width", width + padding * 2);

var scaleX = d3.scaleLinear().domain([0, episodes.length - 1]).range([0, width]);
var scaleY = d3.scaleLinear().domain([0, 14]).range([0, height]);
var plot = svg.append("g").attr("transform", "translate(" + padding + "," + padding + ")");
var pathGenerator = d3.line()
    .x(function (d) { return scaleX(d.x); })
    .y(function (d) { return scaleY(d.rank); });


setXAxis();

// Get data
d3.csv("nizi.csv", parseLine, function (err, data) {
    totalData = processData(data);
    plotData(data);
    selectLine(dFirst, "#line1");
    showChart("latestRank", true);
});

// Set notes
for (var i = 0; i < episodes.length; i++) {
    $("#note" + i).css("left", scaleX(i) + OFFSET + 40).hide();
}

resetLines();

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};





//
//   CHART CALCULATIONS
//

function setXAxis() {
    episodes.forEach(function (episode, i) {
        // Add episode label
        plot.append("text")
            .text("D." + episode)
            .attr("x", scaleX(i))
            .attr("y", -20)
            .attr("class", "episodeLabel smallCaps");

        // Add gridline
        plot.append("path")
            .attr("d", "M" + scaleX(i) + "," + scaleY(0) + "L" + scaleX(i) + "," + scaleY(99))
            .style("opacity", "0.1")
            .style("stroke-width", 3);
    });
}


// Sort chart by key
function toggleSort(key) {
    var sortAsc = $("#" + key).data("asc");
    // Select this key if needed
    if (!$("#" + key).hasClass("selectedSort")) {
        $("#top th").removeClass("selectedSort");
        $("#" + key).addClass("selectedSort");
    }
    $("#" + key).data("asc", !sortAsc); // Toggle sort
    showChart(key, !sortAsc);
}

// Update chart
function showChart(key, asc) {
    var sortedData = sortByKey(totalData, key, asc);
    console.log(sortedData);
    var top = d3.select("#topBody");

    top.selectAll("tr.top").remove();
    var topDivs = top.selectAll("tr.top").data(sortedData);

    topDivs.enter().append("tr")
        .attr("class", function(d) {
            if (d.isEliminated) {
                return "top";
            } else {
                return "top wanna-members";
            }
        })
        .html(function(d) {
            // var letter = '<div class="letter" style="background: ' + getLetterGradeBackground(d) + '; color: ' + getLetterGradeTextColor(d) + '">' + d.letter + '</div>';
            var rank = d.latestRank;
            if (rank == 1000) {
                rank = "-";
            }
            return td(rank, "rankWidth") + td(displayRankChange(d), "deltaWidth") + td(d.name, "nameWidth") + td(d.s1CubesObtained, "companyWidth") + td(d.s2CubesObtained, "letterWidth");
        })
        .on("mouseover", function(d) {
            selectLine(d, "#line" + d.latestRank);
        });
 }

 function td(str, cl) {
     return "<td class='" + cl + "'>" + str + "</td>";
 }

 function resetLines() {
     plot.selectAll("path.ranking")
         .style("opacity", NORMAL_OPACITY)
         .style("stroke-width", NORMAL_WIDTH);
 }

 // Select line indicated by lineId
 function selectLine(d, lineId) {
     // Hide other lines
     plot.selectAll("path.ranking").style("opacity", NORMAL_OPACITY);

     // Move line to front and select
     var line = d3.select(lineId);
     line.moveToFront();
     line.style("opacity", SELECT_OPACITY).style("stroke-width", SELECT_WIDTH);

     // Show notes
     updateNotes(d);

     // Update box
     displayProfile(d);
     $("#profile").show();
     // $("#profile").css("top", getInfoTop(d));
 }

 function plotData(data) {
     // Update y axis
     scaleY.domain([1, getLowestRank(data)]);

     var paths = plot.selectAll("path.ranking").data(data);
     var pathGenerator = d3.line()
     .x(function (d) { return scaleX(d.x); })
     .y(function (d) { return scaleY(d.rank); });

     paths.enter().append("path")
         .attr("class", "ranking")
         .attr("id", function(d) {
             if (d.latestRank == 1) {
                 dFirst = d;
             }
             if (d.specialNote != "") { // Special Line
                 return "sline" + d.latestRank;
             }
             return "line" + d.latestRank;
         })
         .attr("d", function(d, i) {
             return pathGenerator(d.ranking);
         })
         .style("stroke", function(d, i) {
             return getLetterGradeBackground(d);
         })
         .style("stroke-width", NORMAL_WIDTH)
         .on("mouseover", function (d) {
             selectLine(d, this);
         })
         .on("mouseout", function(d) {
             resetLines();

             // Hide notes and box
             $(".note").hide();
             $("#profile").hide();
         });

     paths.exit().remove();
 }






//
//   DATA PROCESSING
//

// Add rank info to data
function processData(data) {
    data.forEach(function(d) {
        d.latestRank = getLatestRank(d);
        d.currentRank = getCurrentRank(d);
        d.isEliminated = isEliminated(d);
        d.rankChange = getRankChange(d);
        d.s1CubesObtained = getS1CubesObtained(d);
        d.s2CubesObtained = getS2CubesObtained(d);
    })
    return data;
}

// Parse line of csv to return a new row with episode, x, rank, and rankings[]
function parseLine(row) {
    var r = {};
    r.name = row["Name on Show"];
    r.nameJapanese = row["Japanese Name"];
    r.letter = "A"
    r.specialNote = row.note;
    r.ranking = [];

    // S1 Cubes
    r.s1Cubes = {};
    r.s1Cubes["Dance"] = row["S1 Dance Cube"] == "Y"
    r.s1Cubes["Vocal"] = row["S1 Vocal Cube"] == "Y";
    r.s1Cubes["Personality"] = row["S1 Personality Cube"] == "Y";
    r.s1Cubes["Star"] = row["S1 Star Cube"] == "Y";

    // S2 Cubes
    r.s2SNTs = {};
    r.s2SNTs["Round 1"] = row["S2 SNT 1"] == "Y";
    r.s2SNTs["Round 2"] = row["S2 SNT 2"] == "Y";
    r.s2SNTs["Round 3"] = row["S2 SNT 3"] == "Y";
    r.s2SNTs["Round 4"] = row["S2 SNT 4"] == "Y";

    // Ranking by day
    episodes.forEach(function(episode, i) {
        var rank = getRank(row["Voting Day " + episode]);
        if (rank > 0) {
            var o = {};
            o.episode = episode;
            o.x = i;
            o.rank = rank;
            r.ranking.push(o);
        }
    })
    return r;


}

// Returns rank with image according to [change], which must be a number
function displayRankChange(d) {
    if (d.rankChange == "-") {
        return "-";
    } else if (d.rankChange > 0) {
        return "<img src='img/up-arrow.png' class='arrow'><span class='change up'>" + d.rankChange + '<span>';
    } else if (d.rankChange < 0) {
        return "<img src='img/down-arrow.png' class='arrow'><span class='change down'>" + Math.abs(d.rankChange) + '<span>';
    } else {
        return "<img src='img/neutral-arrow.png' class='arrow'><span class='change'>0</span>";
    }
}

function updateNotes(d) {
    $(".note").show();
    for (var i = 0; i < episodes.length; i++) {
        // No ranking, contestant dropped at this point -- hide note
        if (d.ranking[i] == undefined || d.ranking[i].rank == undefined) {
            $("#note" + i).hide();
        } else { // Show rank
            var rank = d.ranking[i].rank;
            $("#note" + i)
                .text(rank)
                .css("top", scaleY(rank) + OFFSET)
                .css("background", getLetterGradeBackground(d))
                .css("color", getLetterGradeTextColor(d));
        }
    }
}

// Displays profile
function displayProfile(d) {
    $("#pic").attr("src", getImageSource(d));
    $("#infoName").text(d.name);
    $("#infoNameJapanese").text(d.nameJapanese);
    $("#infoLetter")
        .text(d.letter)
        .css("background", getLetterGradeBackground(d))
        .css("color", getLetterGradeTextColor(d));
    // $("#infoCompany").text(getFullCompanyInfo(d));
    $("#infoRank").html(getRankInfo(d));
}



//
//   HELPERS
//

function getS1CubesObtained(d) {
  var cubesObtained = 0;
  Object.values(d.s1Cubes).forEach(obtained => obtained ? cubesObtained++ : cubesObtained );
  return cubesObtained + " / 4";
}

function getS2CubesObtained(d) {
  var cubesObtained = 0;
  Object.values(d.s2SNTs).forEach(obtained => obtained ? cubesObtained++ : cubesObtained );
  return cubesObtained + " / 4";
}

function getImageSource(d) {
    return "pics/" + d.name + ".jpg";
}

function getLowestRank(data) {
    var min = 13;
    data.forEach(function(d) {
        d.ranking.forEach(function(d2) {
            if (d2 < min) {
                min = d2;
            }
        })
    })
    return min;
}

// Returns the latest rank for every contestant, 1000 for those never ranked
function getLatestRank(d) {
    var ranking = d.ranking[d.ranking.length - 1];
    if (ranking == undefined) {
        return 1000;
    }
    return ranking.rank;
}

// Returns the rank for current contestants, and -1 for all those eliminated
function getCurrentRank(d) {
    if (d.ranking.length < episodes.length) {
        return -1;
    }
    return getLatestRank(d);
}

// Returns the change in rank, or "-" for eliminated contestants
function getRankChange(d) {
    if (d.ranking.length < episodes.length) {
        return "-";
    }
    var prevRank = d.ranking[d.ranking.length - 2].rank;
    return prevRank - getCurrentRank(d);
}

// Return rank or -1 if no rank (eliminated)
function getRank(n) {
    if (n == "-" || n == "") {
        return -1;
    }
    return Number(n);
}

function isEliminated(d) {
    return (d.ranking == undefined || d.latestRank > FINAL_CUTOFF);
}

// Returns the change for current contestants, or shows elimination
function getRankInfo(d) {
    if (d.specialNote != undefined && d.specialNote != "") {
        return d.specialNote;
    } else if (d.ranking.length == 0) {
        return "Withdrew from show";
    } else if (d.isEliminated) {
      // Special situation: they never released the rankings for
      // those eliminated in the 60+  cutoff
      var elimMessage = "Eliminated in Episode " + episodes[d.ranking.length - 1];
        return elimMessage
    }
    // return "Final Member, Rank " + d.currentRank + " " + displayRankChange(d);
    return ""
}

// Get color of note text (all white except for yellow rank C)
function getLetterGradeTextColor(d) {
    if (d.letter == "C") {
        return "black";
    }
    return "white";
}

function getLetterGradeBackground(d) {
    return colors[d.letter];
}





//
//   GENERIC HELPERS
//

// Sorts an array of objects by key
function sortByKey(array, key, asc) {
    return array.sort(function(a, b) {
        var x = a[key];
        var y = b[key];
        if (asc) {
            if (x == "-") {
                return 1;
            }
            if (y == "-") {
                return -1;
            }
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        }
        if (y == "-") {
            return -1;
        }
        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    });
}

function translate(x, y) {
    return "translate(" + x + "," + y + ")";
}
