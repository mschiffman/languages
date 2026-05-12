var treeData = {
  name: "Conversation 1",
  children: [
    {
      name: "Daily routine and work",
      style: { stroke: "#ff7f50", fill: "#ff7f50" },
      children: [
        { name: "C’était la course - It was a race/a hectic day" },
        { name: "Bosser - to work" },
        { name: "Récupérer les enfants - pick up the children" },
        { name: "Gérer - to mangage" },
        { name: "Mission accomplie - mission accomplished" },
      ],
    },
    {
      name: "Feelings and relaxation",
      style: { stroke: "#d60101ff", fill: "#d60101ff" },
      children: [
        { name: "Crevé(e) - exhausted/dead tired" },
        { name: "Se poser - to settle down/relax" },
        { name: "Décompresser - to decompress or unwind" },
        { name: "Lâcher prise - to let go" },
        { name: "plomber le moral - weigh down/kill the mood" },
      ],
    },
    {
      name: "Entertainment and media",
      style: { stroke: "#d2019eff", fill: "#d2019eff" },
      children: [
        { name: "Se marrer - to laugh/have a laugh" },
        { name: "Enchaîner - to chain" },
        { name: "Une série historique - a historical series" },
        { name: "Romanesque - a style that is novelistic" },
        { name: "Burlesque - slapstick comedy" },
        { name: "Câlins - cuddles" },
      ],
    },
    {
      name: "Health and care",
      style: { stroke: "#8402c5ff", fill: "#8402c5ff" },
      children: [
        { name: "Kiné - short for kinésithérapeute - physical therapist" },
        { name: "Gonflement - swelling" },
        { name: "Soulagement - relief from pain or stress" },
        { name: "Négligeable - negligible or insignificant" },
      ],
    },
    {
      name: "Useful connectors and fillers",
      style: { stroke: "#244bfaff", fill: "#244bfaff" },
      children: [
        { name: "Au fur et à mesure - as we go/gradually" },
        { name: "Histoire de - just to" },
        { name: "Carrément - definitely/totally" },
        { name: "En revanche - on the other hand/however" },
        { name: "Tout ce qui touche à - anything related to" },
      ],
    },
    {
      name: "Grammar in context: Restriction",
      style: { stroke: "#0196b7ff", fill: "#0196b7ff" },
      children: [
        { name: "ne...que - only" },
        { name: "e.g., Il n’y en a qu’un - There's only one" },
        { name: "'ne' is dropped in casual French" },
        { name: "e.g., Y en a qu’un - There's only one" },
      ],
    },
  ],
};

var colors = {
  node: {
    rootFill: "#1d03e1ff",
    defaultFill: "rgb(39, 43, 77)",
    strokeHasChildren: "rgb(3, 192, 220)",
    strokeLeaf: "rgba(222, 38, 173, 1)",
  },
  text: {
    root: "rgba(255, 255, 255, 1)",
    hasChildren: "#ffffff",
    leaf: "rgba(255, 255, 255, 1)",
  },
  link: "#ccc",
};

var margin = { top: 20, right: 90, bottom: 30, left: 90 },
  width = 960 - margin.left - margin.right,
  height = 500 - margin.top - margin.bottom;

var svgSelection = d3
  .select("body")
  .append("svg")
  .attr("width", "100vw")
  .attr("height", "100vh");

var svg = svgSelection
  .append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var zoom = d3.zoom().on("zoom", function () {
  svg.attr("transform", d3.event.transform);
});

svgSelection
  .call(zoom)
  .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));

var i = 0,
  duration = 750,
  root;
var treemap = d3.tree().nodeSize([40, 180]);
root = d3.hierarchy(treeData, function (d) {
  return d.children;
});
root.x0 = height / 2;
root.y0 = 0;
root.children.forEach(collapse);

update(root);
function collapse(d) {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapse);
    d.children = null;
  }
}

function update(source) {
  var treeData = treemap(root);
  var nodes = treeData.descendants(),
    links = treeData.descendants().slice(1);
  nodes.forEach(function (d) {
    d.x = d.x + height / 2;
  });
  var node = svg.selectAll("g.node").data(nodes, function (d) {
    return d.id || (d.id = ++i);
  });
  var nodeEnter = node
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", function (d) {
      return "translate(" + source.y0 + "," + source.x0 + ")";
    })
    .on("click", click);
  nodeEnter
    .attr("class", "node")
    .attr("r", 1e-6)
    .style("fill", function (d) {
      var p = d;
      while (p) {
        if (p.data.style && p.data.style.fill) return p.data.style.fill;
        p = p.parent;
      }
      return d.parent ? colors.node.defaultFill : colors.node.rootFill;
    });

  nodeEnter
    .append("text")
    .style("fill", function (d) {
      if (d.parent) {
        return d.children || d._children
          ? colors.text.hasChildren
          : colors.text.leaf;
      }
      return colors.text.root;
    })
    .attr("dy", ".35em")
    .attr("text-anchor", function (d) {
      return "middle";
    })
    .text(function (d) {
      return d.data.name;
    });

  nodeEnter.each(function (d) {
    var bbox = this.querySelector("text").getBBox();
    d.width = bbox.width + 20;
    d.height = bbox.height + 10;
  });

  var maxDepthWidth = [];
  nodes.forEach(function (d) {
    if (!maxDepthWidth[d.depth] || d.width > maxDepthWidth[d.depth]) {
      maxDepthWidth[d.depth] = d.width;
    }
  });
  var depthY = [0];
  for (var i = 1; i <= maxDepthWidth.length; i++) {
    depthY[i] = depthY[i - 1] + (maxDepthWidth[i - 1] || 0) + 80;
  }
  nodes.forEach(function (d) {
    d.y = depthY[d.depth];
  });

  nodeEnter
    .insert("rect", "text")
    .attr("rx", 6)
    .attr("ry", 6)
    .attr("stroke-width", function (d) {
      return d.parent ? 1 : 0;
    })
    .attr("stroke", function (d) {
      var p = d;
      while (p) {
        if (p.data.style && p.data.style.stroke) return p.data.style.stroke;
        p = p.parent;
      }
      return d.children || d._children
        ? colors.node.strokeHasChildren
        : colors.node.strokeLeaf;
    })
    .attr("stroke-dasharray", "0")
    .attr("stroke-opacity", function (d) {
      return d.children || d._children ? "1" : "0.6";
    })
    .attr("x", 0)
    .attr("y", function (d) {
      return -(d.height / 2);
    })
    .attr("width", function (d) {
      return d.width;
    })
    .attr("height", function (d) {
      return d.height;
    });

  nodeEnter.selectAll("text").attr("x", function (d) {
    return d.width / 2;
  });

  nodeEnter
    .filter(function (d) {
      return d.children || d._children;
    })
    .append("text")
    .attr("class", "plus-sign")
    .attr("x", function (d) {
      return d.width;
    })
    .attr("y", 0)
    .attr("dy", ".35em")
    .style("fill", "black")
    .attr("text-anchor", "middle")
    .text("+");

  var nodeUpdate = nodeEnter.merge(node);

  nodeUpdate.select(".plus-sign").style("display", function (d) {
    return d._children ? "inline" : "none";
  });

  nodeUpdate
    .transition()
    .duration(duration)
    .attr("transform", function (d) {
      return "translate(" + d.y + "," + d.x + ")";
    });
  var nodeExit = node
    .exit()
    .transition()
    .duration(duration)
    .attr("transform", function (d) {
      return "translate(" + source.y + "," + source.x + ")";
    })
    .remove();
  nodeExit.select("rect").style("opacity", 1e-6);
  nodeExit.select("rect").attr("stroke-opacity", 1e-6);
  nodeExit.selectAll("text").style("fill-opacity", 1e-6);
  var link = svg.selectAll("path.link").data(links, function (d) {
    return d.id;
  });
  var linkEnter = link
    .enter()
    .insert("path", "g")
    .attr("class", "link")
    .style("stroke", function (d) {
      var p = d;
      while (p) {
        if (p.data.style && p.data.style.stroke) return p.data.style.stroke;
        p = p.parent;
      }
      return colors.link;
    })
    .attr("d", function (d) {
      var o = { x: source.x0, y: source.y0 };
      return diagonal(o, o);
    });
  var linkUpdate = linkEnter.merge(link);
  linkUpdate
    .transition()
    .duration(duration)
    .attr("d", function (d) {
      return diagonal(d, d.parent);
    });
  var linkExit = link
    .exit()
    .transition()
    .duration(duration)
    .attr("d", function (d) {
      var o = { x: source.x, y: source.y };
      return diagonal(o, o);
    })
    .remove();
  nodes.forEach(function (d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
  function diagonal(s, d) {
    var path = `M ${s.y} ${s.x}
            C ${(s.y + d.y) / 2} ${s.x},
              ${(s.y + d.y) / 2} ${d.x},
              ${d.y} ${d.x}`;

    return path;
  }
  function click(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
      if (d.depth === 0 && d.children) {
        d.children.forEach(collapse);
      }
    }
    update(d);
  }
}

function expand(d) {
  if (d._children) {
    d.children = d._children;
    d._children = null;
  }
  if (d.children) {
    d.children.forEach(expand);
  }
}

var actionBar = d3
  .select("body")
  .append("div")
  .attr("class", "action-bar")
  .style("position", "fixed")
  .style("top", "10px")
  .style("left", "10px")
  .style("z-index", "1000")
  .style("display", "flex")
  .style("gap", "10px");

actionBar
  .append("button")
  .attr("class", "btn btn-sm btn-light border shadow-sm")
  .html('<i class="bi bi-arrows-expand"></i> Expand All')
  .on("click", function () {
    expand(root);
    update(root);
  });

actionBar
  .append("button")
  .attr("class", "btn btn-sm btn-light border shadow-sm")
  .html('<i class="bi bi-arrows-collapse"></i> Collapse All')
  .on("click", function () {
    root.children.forEach(collapse);
    update(root);
  });

actionBar
  .append("button")
  .attr("class", "btn btn-sm btn-light border shadow-sm")
  .html('<i class="bi bi-aspect-ratio"></i> Reset Zoom')
  .on("click", function () {
    svgSelection
      .transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity.translate(margin.left, margin.top));
  });
