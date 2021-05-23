//url是 toggle 的样式 https://cdn.jsdelivr.net/gh/gitbrent/bootstrap4-toggle@3.6.1/css/bootstrap4-toggle.min.css

class Map {
  constructor(id, width, height) {
    this.parentDiv = d3.select(`#${id}`);
    this.width = width;
    this.height = height;
    this.svg = this.parentDiv
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    this.g = this.svg.append("g");
    this.tip();
    this.initMap();
  }
  async initData() {
    this.mapData = await d3.json("./counties-10m.json");

    this.data = await d3.csv("./output1withgeo.csv");
    this.state = await d3.csv("./state.csv");
    this.data.forEach((d) => {
      d.StateFullName = this.state.find(
        (v) => v.Abbreviation === d.State
      )?.State;
    });

    this.citiesMap = topojson.feature(
      this.mapData,
      this.mapData.objects.states
    );

    let salaryByid = d3.rollups(
      this.data,
      (d) => d3.mean(d, (v) => +v.Est_Salary),
      (d) => d.StateFullName
    );

    this.citiesMap.features.forEach((d) => {
      let value = salaryByid.find((v) => v[0] === d.properties.name);
      d.avgSalary = value?.[1];
    });
  }

  async initMap() {
    await this.initData();

    this.epsilon = 0.000001;

    this.project = d3
      .geoAlbersUsa()
      .fitSize([this.width, this.height], this.citiesMap);

    this.project
      .scale(this.width * 1.05)
      .translate([this.width / 2, this.height / 2]);

    this.geoPath = d3.geoPath().projection(this.project);

    this.addStatesPath();
  }
  addStatesPath() {
    const color = d3
      .scaleSqrt()
      .domain([0, d3.max(this.citiesMap.features, (d) => +d.avgSalary)])
      .range(["#fbe6c2", "#ac0d0d"]);

    this.g
      .selectAll("path")
      .data(this.citiesMap.features)
      .join("path")
      .attr("d", this.geoPath)
      .attr("fill", (d) => color(d.avgSalary ?? 0))
      .attr("stroke", "gray")
      .on("mouseover", this.tool_tip.show)
      .on("mouseout", this.tool_tip.hide);

    this.addLegend(color, this.svg, 50, 100);
  }

  // initialize the tooltip
  tip() {
    this.tool_tip = d3
      .tip()
      .attr("class", "d3-tip")
      .offset([1, 1])
      .html(
        (e, d) => `

          <li> State: ${d.properties.name} </li>
          <li> AvgSalary: ${
            d.avgSalary ? d3.format(".1f")(d.avgSalary) : "Null"
          } </li>
      `
      );

    this.svg.call(this.tool_tip);
  }

  addLegend(color, svg, x, y, count = 5, type = "linear") {
    const position = { top: y, left: x };
    const domain = color.domain();
    const g = svg
      .append("g")
      .attr("transform", `translate(${position.left},${position.top})`);
    count = type != "linear" ? domain.length : count;
    const data = Array(count).fill(1);
    data.forEach((d, i) => {
      if (type === "linear") {
        data[i] = ((domain[1] + domain[0]) / count) * i;
      } else {
        data[i] = domain[i];
      }
    });
    const h = 20,
      w = 20;

    g.selectAll("myrect")
      .data(data)
      .join("rect")
      .attr("fill", (d) => color(d))
      .attr("y", (d, i) => i * h + 10)
      .attr("x", 0)
      .attr("width", w)
      .attr("height", h);
    g.selectAll("myrect")
      .data(data)
      .join("text")
      .attr("fill", "gray")
      .attr("y", (d, i) => i * h + 26)
      .attr("x", 30)
      .text((d) => d3.format(".1s")(d));
  }
}

new Map("map", 1000, 800);
