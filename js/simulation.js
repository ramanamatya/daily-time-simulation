let USER_SPEED = "slow";

const width = 780;
const height = 800;
const padding = 1;
const maxRadius = 3;

// color = d3.scale.category10();
const sched_objs = [];

let curr_minute = 0;

const act_codes = [{
    "index": "0",
    "short": "accounts.google.com"
  },
  {
    "index": "1",
    "short": "facebook.com"
  },
  {
    "index": "2",
    "short": "mail.google.com"
  },
  {
    "index": "3",
    "short": "myaccount.google.com"
  },
  {
    "index": "4",
    "short": "youtube.com"
  },
  {
    "index": "5",
    "short": "google.com"
  },
  {
    "index": "6",
    "short": "google.com.np"
  },
  {
    "index": "7",
    "short": "attend.cf"
  },
  {
    "index": "8",
    "short": "instagram.com"
  },
  {
    "index": "9",
    "short": "Pomodoro break"
  },
  {
    "index": "10",
    "short": "Shifting"
  },
];

const speeds = {
  "slow": 1000,
  "medium": 200,
  "fast": 50
};

const time_notes = [{
    "start_minute": 1,
    "stop_minute": 240,
    "note": "Shift A"
  },
  {
    "start_minute": 250,
    "stop_minute": 480,
    "note": "Shift B"
  },
  {
    "start_minute": 490,
    "stop_minute": 720,
    "note": "Shift C"
  },
  {
    "start_minute": 730,
    "stop_minute": 960,
    "note": "Shift D"
  },
  {
    "start_minute": 970,
    "stop_minute": 1200,
    "note": "Shift E"
  },
  {
    "start_minute": 1210,
    "stop_minute": 1440,
    "note": "Shift F"
  },
];
let notes_index = 0;

// Activity to put in center of circle arrangement
const center_act = "Shifting";

const center_pt = {
  "x": 380,
  "y": 365
};

// Coordinates for activities
const foci = {};
act_codes.forEach(({short, index}, i) => {
  if (short == center_act) {
    foci[index] = center_pt;
  } else {
    const theta = 2 * Math.PI / (act_codes.length - 1);
    foci[index] = {
      x: 250 * Math.cos(i * theta) + 380,
      y: 250 * Math.sin(i * theta) + 365
    };
  }
});

// Start the SVG
const svg = d3.select("#chart").append("svg")
  .attr("width", width)
  .attr("height", height);

// Load data and let's do it.
d3.tsv("./js/data/days-simulated-v2.tsv", (error, data) => {
  data.forEach(({day}) => {
    const day_array = day.split(",");
    const activities = [];
    for (let i = 0; i < day_array.length; i++) {
      // Duration
      if (i % 2 == 1) {
        activities.push({
          'act': day_array[i - 1],
          'duration': +day_array[i]
        });
      }
    }
    sched_objs.push(activities);
  });

  // Used for percentages by minute
  const act_counts = {
    "0": 0,
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
    "7": 0,
    "8": 0,
    "9": 0,
    "10": 0
  };

  // A node for each person's schedule
  const nodes = sched_objs.map((o, i) => {
    const act = o[0].act;
    act_counts[act] += 1;
    const init_x = foci[act].x + Math.random();
    const init_y = foci[act].y + Math.random();
    return {
      act,
      radius: 3,
      x: init_x,
      y: init_y,
      color: color(act),
      moves: 0,
      next_move_time: o[0].duration,
      sched: o,
    };
  });

  const force = d3.layout.force()
    .nodes(nodes)
    .size([width, height])
    // .links([])
    .gravity(0)
    .charge(0)
    .friction(.9)
    .on("tick", tick)
    .start();

  const circle = svg.selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("r", ({radius}) => radius)
    .style("fill", d => d.color);
  // .call(force.drag);

  // Activity labels
  const label = svg.selectAll("text")
    .data(act_codes)
    .enter().append("text")
    .attr("class", "actlabel")
    .attr("x", ({short}, i) => {
      if (short == center_act) {
        return center_pt.x;
      } else {
        const theta = 2 * Math.PI / (act_codes.length - 1);
        return 340 * Math.cos(i * theta) + 380;
      }
    })
    .attr("y", ({short}, i) => {
      if (short == center_act) {
        return center_pt.y;
      } else {
        const theta = 2 * Math.PI / (act_codes.length - 1);
        return 340 * Math.sin(i * theta) + 365;
      }
    });

  label.append("tspan")
    .attr("x", function () {
      return d3.select(this.parentNode).attr("x");
    })
    // .attr("dy", "1.3em")
    .attr("text-anchor", "middle")
    .text(({short}) => short);
  label.append("tspan")
    .attr("dy", "1.3em")
    .attr("x", function () {
      return d3.select(this.parentNode).attr("x");
    })
    .attr("text-anchor", "middle")
    .attr("class", "actpct")
    .text(({index}) => `${act_counts[index]}%`);

  // Update nodes based on activity and duration
  function timer() {
    d3.range(nodes.length).map(i => {
      const curr_node = nodes[i];
      let curr_moves = curr_node.moves;

      // Time to go to next activity
      if (curr_node.next_move_time == curr_minute) {
        if (curr_node.moves == curr_node.sched.length - 1) {
          curr_moves = 0;
        } else {
          curr_moves += 1;
        }

        // Subtract from current activity count
        act_counts[curr_node.act] -= 1;

        // Move on to next activity
        curr_node.act = curr_node.sched[curr_moves].act;

        // Add to new activity count
        act_counts[curr_node.act] += 1;

        curr_node.moves = curr_moves;
        curr_node.cx = foci[curr_node.act].x;
        curr_node.cy = foci[curr_node.act].y;

        nodes[i].next_move_time += nodes[i].sched[curr_node.moves].duration;
      }
    });

    force.resume();
    curr_minute += 1;

    // Update percentages
    label.selectAll("tspan.actpct")
      .text(({index}) => readablePercent(act_counts[index]));

    // Update time
    const true_minute = curr_minute % 1440;
    d3.select("#current_time").text(minutesToTime(true_minute));

    // Update notes
    // var true_minute = curr_minute % 1440;
    if (true_minute == time_notes[notes_index].start_minute) {
      d3.select("#note")
        .style("top", "0px")
        .transition()
        .duration(600)
        .style("top", "20px")
        .style("color", "#000000")
        .text(time_notes[notes_index].note);
    }

    // Make note disappear at the end.
    else if (true_minute == time_notes[notes_index].stop_minute) {

      d3.select("#note").transition()
        .duration(1000)
        .style("top", "300px")
        .style("color", "#ffffff");

      notes_index += 1;
      if (notes_index == time_notes.length) {
        notes_index = 0;
      }
    }

    setTimeout(timer, speeds[USER_SPEED]);
  }
  setTimeout(timer, speeds[USER_SPEED]);

  function tick({alpha}) {
    const k = 0.04 * alpha;

    // Push nodes toward their designated focus.
    nodes.forEach((o, i) => {
      const curr_act = o.act;

      // Make sleep more sluggish moving.
      if (curr_act == "0") {
        var damper = 0.6;
      } else {
        var damper = 1;
      }
      o.color = color(curr_act);
      o.y += (foci[curr_act].y - o.y) * k * damper;
      o.x += (foci[curr_act].x - o.x) * k * damper;
    });

    circle
      .each(collide(.5))
      .style("fill", d => d.color)
      .attr("cx", ({x}) => x)
      .attr("cy", ({y}) => y);
  }

  // Resolve collisions between nodes.
  function collide(alpha) {
    const quadtree = d3.geom.quadtree(nodes);
    return d => {
      const r = d.radius + maxRadius + padding;
      const nx1 = d.x - r;
      const nx2 = d.x + r;
      const ny1 = d.y - r;
      const ny2 = d.y + r;
      quadtree.visit(({point}, x1, y1, x2, y2) => {
        if (point && (point !== d)) {
          let x = d.x - point.x;
          let y = d.y - point.y;
          let l = Math.sqrt(x * x + y * y);
          const r = d.radius + point.radius + (d.act !== point.act) * padding;
          if (l < r) {
            l = (l - r) / l * alpha;
            d.x -= x *= l;
            d.y -= y *= l;
            point.x += x;
            point.y += y;
          }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
      });
    };
  }

  // Speed toggle
  d3.selectAll(".togglebutton")
    .on("click", function () {
      if (d3.select(this).attr("data-val") == "slow") {
        d3.select(".slow").classed("current", true);
        d3.select(".medium").classed("current", false);
        d3.select(".fast").classed("current", false);
      } else if (d3.select(this).attr("data-val") == "medium") {
        d3.select(".slow").classed("current", false);
        d3.select(".medium").classed("current", true);
        d3.select(".fast").classed("current", false);
      } else {
        d3.select(".slow").classed("current", false);
        d3.select(".medium").classed("current", false);
        d3.select(".fast").classed("current", true);
      }

      USER_SPEED = d3.select(this).attr("data-val");
    });
}); // @end d3.tsv

function color(activity) {

  const colorByActivity = {
    "0": "#e0d400",
    "1": "#1c8af9",
    "2": "#51BC05",
    "3": "#FF7F00",
    "4": "#DB32A4",
    "5": "#00CDF8",
    "6": "#E63B60",
    "7": "#8E5649",
    "8": "#68c99e",
    "9": "#a477c8",
    "10": "#5C76EC",
    "11": "#E773C3",
    "12": "#799fd2",
    "13": "#038a6c",
    "14": "#cc87fa",
    "15": "#ee8e76",
    "16": "#bbbbbb",
  };
  return colorByActivity[activity];
}

// Output readable percent based on count.
function readablePercent(n) {

  let pct = 100 * n / 1000;
  if (pct < 1 && pct > 0) {
    pct = "<1%";
  } else {
    pct = `${Math.round(pct)}%`;
  }
  return pct;
}

// Minutes to time of day. Data is minutes from 4am.
function minutesToTime(m) {
  const minutes = (m + 5 * 60) % 1440;
  let hh = Math.floor(minutes / 60);
  let ampm;
  if (hh > 12) {
    hh = hh - 12;
    ampm = "pm";
  } else if (hh == 12) {
    ampm = "pm";
  } else if (hh == 0) {
    hh = 12;
    ampm = "am";
  } else {
    ampm = "am";
  }
  let mm = minutes % 60;
  if (mm < 10) {
    mm = `0${mm}`;
  }
  return `${hh}:${mm}${ampm}`;
}
