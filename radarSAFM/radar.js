// The MIT License (MIT)
// Copyright (c) 2017-2024 Zalando SE

function radar_visualization(config) {

    var c400 = 350;
    config.svg_id = config.svg || "radar";
    config.width = config.width || c400 * 3.8;
    config.height = config.height || c400 * 2.5;
    config.colors = ("colors" in config) ? config.colors : {
        background: "#fff",
        grid: '#adadad',
        inactive: "#ddd"
    };
    config.print_layout = ("print_layout" in config)
     ? config.print_layout
     : true;
    config.links_in_new_tabs = ("links_in_new_tabs" in config)
     ? config.links_in_new_tabs
     : true;
    config.repo_url = config.repo_url || '#';
    config.print_ring_descriptions_table = ("print_ring_descriptions_table" in config)
     ? config.print_ring_descriptions_table
     : false;
    config.legend_offset = config.legend_offset || [{
                x: c400 + 30,
                y: c400 - 270
            }, {
                x:  - (c400 + 280),
                y: c400 - 270
            }, {
                x:  - (c400 + 280),
                y:  - (c400 - 80)
            }, {
                x: c400 + 30,
                y:  - (c400 - 80)
            }
        ]
        config.title_offset = config.title_offset || {
        x:  - (c400 + 280),
        y:  - (c400 + 40)
    };
    config.footer_offset = config.footer_offset || {
        x:  - (c400 - 280),
        y: (c400 + 30)
    };
    config.legend_column_width = config.legend_column_width || 250
        config.legend_line_height = config.legend_line_height || 10

        var seed = 101;
    function random() {
        var x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }
    function random_between(min, max) {
        return min + random() * (max - min);
    }
    function normal_between(min, max) {
        return min + (random() + random()) * 0.5 * (max - min);
    }

    const quadrants = [{
            radial_min: 0,
            radial_max: 0.5,
            factor_x: 1,
            factor_y: 1
        }, {
            radial_min: 0.5,
            radial_max: 1,
            factor_x: -1,
            factor_y: 1
        }, {
            radial_min: -1,
            radial_max: -0.5,
            factor_x: -1,
            factor_y: -1
        }, {
            radial_min: -0.5,
            radial_max: 0,
            factor_x: 1,
            factor_y: -1
        }
    ];

    const rings = [{
            radius: c400 - 200
        }, {
            radius: c400 - 100
        }, {
            radius: c400
        }
    ];

    function polar(cartesian) {
        var x = cartesian.x,
        y = cartesian.y;
        return {
            t: Math.atan2(y, x),
            r: Math.sqrt(x * x + y * y)
        }
    }
    function cartesian(polar) {
        return {
            x: polar.r * Math.cos(polar.t),
            y: polar.r * Math.sin(polar.t)
        }
    }
    function bounded_interval(value, min, max) {
        var low = Math.min(min, max),
        high = Math.max(min, max);
        return Math.min(Math.max(value, low), high);
    }
    function bounded_ring(polar, r_min, r_max) {
        return {
            t: polar.t,
            r: bounded_interval(polar.r, r_min, r_max)
        }
    }
    function bounded_box(point, min, max) {
        return {
            x: bounded_interval(point.x, min.x, max.x),
            y: bounded_interval(point.y, min.y, max.y)
        }
    }

    function segment(quadrant, ring) {
        var polar_min = {
            t: quadrants[quadrant].radial_min * Math.PI,
            r: ring === 0 ? 30 : rings[ring - 1].radius + 10
        };
        var polar_max = {
            t: quadrants[quadrant].radial_max * Math.PI,
            r: rings[ring].radius - 40
        };
        var cartesian_min = {
            x: 15 * quadrants[quadrant].factor_x,
            y: 15 * quadrants[quadrant].factor_y
        };
        var cartesian_max = {
            x: rings[2].radius * quadrants[quadrant].factor_x,
            y: rings[2].radius * quadrants[quadrant].factor_y
        };
        return {
            clipx: function (d) {
                var c = bounded_box(d, cartesian_min, cartesian_max);
                var p = bounded_ring(polar(c), polar_min.r + 15, polar_max.r - 15);
                d.x = cartesian(p).x;
                return d.x;
            },
            clipy: function (d) {
                var c = bounded_box(d, cartesian_min, cartesian_max);
                var p = bounded_ring(polar(c), polar_min.r + 15, polar_max.r - 15);
                d.y = cartesian(p).y;
                return d.y;
            },
            random: function () {
                return cartesian({
                    t: random_between(polar_min.t, polar_max.t),
                    r: normal_between(polar_min.r, polar_max.r)
                });
            }
        }
    }

    for (var i = 0; i < config.entries.length; i++) {
        var entry = config.entries[i];
        entry.segment = segment(entry.quadrant, entry.ring);
        var point = entry.segment.random();
        entry.x = point.x;
        entry.y = point.y;
        entry.color = entry.active || config.print_layout ? config.rings[entry.ring].color : config.colors.inactive;
    }

    var segmented = new Array(4);
    for (let quadrant = 0; quadrant < 4; quadrant++) {
        segmented[quadrant] = new Array(4);
        for (var ring = 0; ring < 3; ring++) {
            segmented[quadrant][ring] = [];
        }
    }
    for (var i = 0; i < config.entries.length; i++) {
        var entry = config.entries[i];
        segmented[entry.quadrant][entry.ring].push(entry);
    }

    var id = 1;
    for (quadrant of[2, 3, 1, 0]) {
        for (var ring = 0; ring < 3; ring++) {
            var entries = segmented[quadrant][ring];
            entries.sort((a, b) => a.label.localeCompare(b.label));
            for (var i = 0; i < entries.length; i++) {
                entries[i].id = "" + id++;
            }
        }
    }

    function translate(x, y) {
        return "translate(" + x + "," + y + ")";
    }
    function viewbox(quadrant) {
        return [
            Math.max(0, quadrants[quadrant].factor_x * c400) - c400 - 20,
            Math.max(0, quadrants[quadrant].factor_y * c400) - c400 - 20,
            c400 + 40, c400 + 40
        ].join(" ");
    }

    config.scale = config.scale || 1;
    var scaled_width = config.width * config.scale;
    var scaled_height = config.height * config.scale;

    var svg = d3.select("svg#" + config.svg_id)
        .style("background-color", config.colors.background)
        .attr("width", scaled_width)
        .attr("height", scaled_height);

    var radar = svg.append("g");
    if ("zoomed_quadrant" in config) {
        svg.attr("viewBox", viewbox(config.zoomed_quadrant));
    } else {
        radar.attr("transform", translate(scaled_width / 2, scaled_height / 2).concat(`scale(${config.scale})`));
    }

    var grid = radar.append("g");
    config.font_family = config.font_family || "Arial, Helvetica";

    grid.append("line").attr("x1", 0).attr("y1", -c400).attr("x2", 0).attr("y2", c400)
    .style("stroke", config.colors.grid).style("stroke-width", 1);
    grid.append("line").attr("x1", -c400).attr("y1", 0).attr("x2", c400).attr("y2", 0)
    .style("stroke", config.colors.grid).style("stroke-width", 1);

    var defs = grid.append("defs");
    var filter = defs.append("filter").attr("x", 0).attr("y", 0).attr("width", 1).attr("height", 1).attr("id", "solid");
    filter.append("feFlood").attr("flood-color", "rgb(0,0,0,0.8)");
    filter.append("feComposite").attr("in", "SourceGraphic");

    for (var i = 0; i < rings.length; i++) {
        grid.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", rings[i].radius)
        .style("fill", config.rings[i].color)
        .style("opacity", 0.08)
        .style("stroke", config.colors.grid)
        .style("stroke-width", 1);
        if (config.print_layout) {
            grid.append("path")
            .attr("id", "ringPath" + i)
            .attr("d", d3.arc().innerRadius(rings[i].radius - 45).outerRadius(rings[i].radius - 35)
                .startAngle(-Math.PI / 3).endAngle(Math.PI / 3))
            .style("fill", "none").style("stroke", "none");
            grid.append("text").append("textPath")
            .attr("xlink:href", "#ringPath" + i).attr("startOffset", "25%")
            .style("text-anchor", "middle").style("font-family", config.font_family)
            .style("font-size", "30px").style("font-weight", "bold")
            .style("fill", config.rings[i].color).style("opacity", 0.5)
            .text(config.rings[i].name);
        }
    }

    for (var i = 0; i < rings.length; i++) {
        grid.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", rings[i].radius)
        .style("fill", "none")
        .style("stroke", config.colors.grid)
        .style("stroke-width", 1);
    }

    function legend_transform(quadrant, ring, legendColumnWidth, index = null, previousHeight = 0) {
        const ringOffset = ring * 1; // регулюй відстань між групами
        const dy = (index == null ? -16 : index * (config.legend_line_height + 2)) + ringOffset;
        return translate(config.legend_offset[quadrant].x, config.legend_offset[quadrant].y + dy + previousHeight);
    }

    if (config.print_layout) {
        radar.append("a").attr("href", config.repo_url)
        .attr("transform", translate(config.title_offset.x, config.title_offset.y))
        .append("text").attr("class", "hover-underline")
        .text(config.title).style("font-family", config.font_family)
        .style("font-size", "30").style("font-weight", "bold");

        radar.append("text").attr("transform", translate(config.title_offset.x, config.title_offset.y + 20))
        .text(config.date || "").style("font-family", config.font_family)
        .style("font-size", "14").style("fill", "#999");

        radar.append("text").attr("transform", translate(config.footer_offset.x, config.footer_offset.y))
        .text("★ вибіркові     ⬤ обов'язкові")
        .attr("xml:space", "preserve").style("font-family", config.font_family)
        .style("font-size", "12px");

        const legend = radar.append("g");
        for (let quadrant = 0; quadrant < 4; quadrant++) {
            legend.append("text")
            .attr("transform", translate(config.legend_offset[quadrant].x, config.legend_offset[quadrant].y - 45))
            .text(config.quadrants[quadrant].name)
            .style("font-family", config.font_family)
            .style("font-size", "18px")
            .style("font-weight", "bold");

            let previousLegendHeight = 0;
            for (let ring = 0; ring < 3; ring++) {
                legend.append("text")
                .attr("transform", legend_transform(quadrant, ring, config.legend_column_width, null, previousLegendHeight))
                .text(config.rings[ring].name)
                .style("font-family", config.font_family)
                .style("font-size", "12px")
                .style("font-weight", "bold")
                .style("fill", config.rings[ring].color);

                legend.selectAll(".legend" + quadrant + ring)
                .data(segmented[quadrant][ring])
                .enter()
                .append("a")
                .attr("href", d => d.link || "#")
                .attr("target", d => (d.link && config.links_in_new_tabs) ? "_blank" : null)
                .append("text")
                .attr("transform", (d, i) => legend_transform(quadrant, ring, config.legend_column_width, i + 1, previousLegendHeight))
                .attr("class", "legend" + quadrant + ring)
                .attr("id", d => "legendItem" + d.id)
                .text(d => `${d.id}. ${d.label}`)
                .style("font-family", config.font_family)
                .style("font-size", "11px")
                .on("mouseover", (event, d) => {
                    showBubble(d);
                    highlightLegendItem(d);
                })
                .on("mouseout", (event, d) => {
                    hideBubble(d);
                    unhighlightLegendItem(d);
                })
                .call(wrap_text)
                .each(function () {
                    previousLegendHeight += d3.select(this).node().getBBox().height;
                });

                previousLegendHeight += 40;
            }
        }
    }

    function wrap_text(text) {
        let heightForNextElement = 0;
        const indent = 10;

        text.each(function () {
            const textElement = d3.select(this);
            const fullText = textElement.text();
            const paragraphs = fullText.split(/\n+/);
            textElement.text(null);

            paragraphs.forEach((paragraph, pIndex) => {
                const words = paragraph.trim().split(/\s+/);
                let line = [];

                let numberWidth = 0;
                if (pIndex === 0) {
                    const number = `${paragraph.split(".")[0]}. |`;
                    const legendNumberText = textElement.append("tspan").text(number);
                    const legendBar = textElement.append("tspan").text("|");
                    numberWidth = legendNumberText.node().getComputedTextLength() - legendBar.node().getComputedTextLength();

                    textElement.text(null);
                }

                let tspan = textElement
                    .append("tspan")
                    .attr("x", pIndex === 0 ? 0 : numberWidth + indent)
                    .attr("y", heightForNextElement)
                    .attr("dy", pIndex === 0 ? 0 : config.legend_line_height)
                    .text(null);

                for (let i = 0; i < words.length; i++) {
                    line.push(words[i]);
                    tspan.text(line.join(" "));

                    if (tspan.node().getComputedTextLength() > config.legend_column_width && i !== 1) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [words[i]];

                        tspan = textElement
                            .append("tspan")
                            .attr("x", numberWidth + indent)
                            .attr("dy", config.legend_line_height)
                            .text(words[i]);
                    }
                }

                if (pIndex < paragraphs.length - 1) {
                    textElement.append("tspan")
                    .attr("x", numberWidth + indent)
                    .attr("dy", config.legend_line_height * 1.3);
                }

                const textBoundingBox = textElement.node().getBBox();
                heightForNextElement = textBoundingBox.y + textBoundingBox.height;
            });
        });
    }

    // layer for entries
    var rink = radar.append("g")
        .attr("id", "rink");

    // rollover bubble (on top of everything else)
    var bubble = radar.append("g")
        .attr("id", "bubble")
        .attr("x", 0)
        .attr("y", 0)
        .style("opacity", 0)
        .style("pointer-events", "none")
        .style("user-select", "none");
    bubble.append("rect")
    .attr("rx", 4)
    .attr("ry", 4)
    .style("fill", "#333");
    bubble.append("text")
    .style("font-family", config.font_family)
    .style("font-size", "10px")
    .style("fill", "#fff");
    bubble.append("path")
    .attr("d", "M 0,0 10,0 5,8 z")
    .style("fill", "#333");

    function showBubble(d) {
        if (d.active || config.print_layout) {
            var tooltip = d3.select("#bubble text")
                .text(d.label);
            var bbox = tooltip.node().getBBox();
            d3.select("#bubble")
            .attr("transform", translate(d.x - bbox.width / 2, d.y - 16))
            .style("opacity", 0.8);
            d3.select("#bubble rect")
            .attr("x", -5)
            .attr("y", -bbox.height)
            .attr("width", bbox.width + 10)
            .attr("height", bbox.height + 4);
            d3.select("#bubble path")
            .attr("transform", translate(bbox.width / 2 - 5, 3));
        }
    }

    function hideBubble(d) {
        var bubble = d3.select("#bubble")
            .attr("transform", translate(0, 0))
            .style("opacity", 0);
    }

    function highlightLegendItem(d) {
        var legendItem = document.getElementById("legendItem" + d.id);
        legendItem.setAttribute("filter", "url(#solid)");
        legendItem.setAttribute("fill", "white");
    }

    function unhighlightLegendItem(d) {
        var legendItem = document.getElementById("legendItem" + d.id);
        legendItem.removeAttribute("filter");
        legendItem.removeAttribute("fill");
    }

    // draw blips on radar
    var blips = rink.selectAll(".blip")
        .data(config.entries)
        .enter()
        .append("g")
        .attr("class", "blip")
        .attr("transform", function (d, i) {
            return legend_transform(d.quadrant, d.ring, config.legend_column_width, i);
        })
        .on("mouseover", function (event, d) {
            showBubble(d);
            highlightLegendItem(d);
        })
        .on("mouseout", function (event, d) {
            hideBubble(d);
            unhighlightLegendItem(d);
        });

    // configure each blip
    blips.each(function (d) {
        var blip = d3.select(this);

        // blip link
        if (d.active && Object.prototype.hasOwnProperty.call(d, "link") && d.link) {
            blip = blip.append("a")
                .attr("xlink:href", d.link);

            if (config.links_in_new_tabs) {
                blip.attr("target", "_blank");
            }
        }

        // blip shape
        if (d.moved == 1) {
            blip.append("path")
            .attr("d", "M -11,5 11,5 0,-13 z") // triangle pointing up
            .style("fill", d.color);
        } else if (d.moved == -1) {
            blip.append("path")
            .attr("d", "M -11,-5 11,-5 0,13 z") // triangle pointing down
            .style("fill", d.color);
        } else if (d.moved == 2) {
            blip.append("path")
            .attr("d", d3.symbol().type(d3.symbolStar).size(400))
            .style("fill", d.color);
        } else {
            blip.append("circle")
            .attr("r", 11)
            .attr("fill", d.color);
        }

        // blip text
        if (d.active || config.print_layout) {
            var blip_text = config.print_layout ? d.id : d.label.match(/[a-z]/i);
            blip.append("text")
            .text(blip_text)
            .attr("y", 3)
            .attr("text-anchor", "middle")
            .style("fill", "#fff")
            .style("font-family", config.font_family)
            .style("font-size", function (d) {
                return blip_text.length > 2 ? "8px" : "9px";
            })
            .style("pointer-events", "none")
            .style("user-select", "none");
        }
    });

    // make sure that blips stay inside their segment
    function ticked() {
        blips.attr("transform", function (d) {
            return translate(d.segment.clipx(d), d.segment.clipy(d));
        })
    }

    // distribute blips, while avoiding collisions
    d3.forceSimulation()
    .nodes(config.entries)
    .velocityDecay(0.19) // magic number (found by experimentation)
    .force("collision", d3.forceCollide().radius(12).strength(0.85))
    .on("tick", ticked);

    function ringDescriptionsTable() {
        var table = d3.select("body").append("table")
            .attr("class", "radar-table")
            .style("border-collapse", "collapse")
            .style("position", "relative")
            .style("top", "-70px") // Adjust this value to move the table closer vertically
            .style("margin-left", "50px")
            .style("margin-right", "50px")
            .style("font-family", config.font_family)
            .style("font-size", "13px")
            .style("text-align", "left");

        var thead = table.append("thead");
        var tbody = table.append("tbody");

        // define fixed width for each column
        var columnWidth = `${100 / config.rings.length}%`;

        // create table header row with ring names
        var headerRow = thead.append("tr")
            .style("border", "1px solid #f00");

        headerRow.selectAll("th")
        .data(config.rings)
        .enter()
        .append("th")
        .style("padding", "8px")
        .style("border", "1px solid #ddd")
        .style("background-color", d => d.color)
        .style("color", "#ddd")
        .style("width", columnWidth)
        .text(d => d.name);

        // create table body row with descriptions
        var descriptionRow = tbody.append("tr")
            .style("border", "1px solid #ddd");

        descriptionRow.selectAll("td")
        .data(config.rings)
        .enter()
        .append("td")
        .style("padding", "8px")
        .style("border", "1px solid #ddd")
        .style("width", columnWidth)
        .text(d => d.description);
    }

    if (config.print_ring_descriptions_table) {
        ringDescriptionsTable();
    }
}
