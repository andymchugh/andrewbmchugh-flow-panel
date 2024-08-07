# Flow

SVG flowchart visualization

![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?logo=grafana&query=$.version&url=https://grafana.com/api/plugins/andrewbmchugh-flow-panel&label=Marketplace&prefix=v&color=F47A20)
[![Downloads](https://img.shields.io/badge/dynamic/json?logo=grafana&color=F47A20&label=downloads&query=%24.items%5B%3F%28%40.slug%20%3D%3D%20%22andrewbmchugh-flow-panel%22%29%5D.downloads&url=https%3A%2F%2Fgrafana.com%2Fapi%2Fplugins)](https://grafana.com/grafana/plugins/andrewbmchugh-flow-panel)
[![License](https://img.shields.io/github/license/andymchugh/andrewbmchugh-flow-panel)](LICENSE)

The Flow plugin provides side-by-side metric visualization on SVG diagrams. You provide the SVG diagram along with configuration on how you want the diagram to behave. The panel then combines these with your time-series data to bring your diagram to life.

## Example 1
![example1](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/src/img/example1.png?raw=true)

## Example 2
![example2](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/src/img/example2.png?raw=true)

## Example 3
![example3](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/src/img/threadHighlighting.gif?raw=true)

## Target Audience
Dashboards detailing flow through distributed systems quickly get big and often benefit from some kind of lead in architecture diagram. This panel is aimed at supporting these diagrams. You create the SVG in a rich editor such as draw.io and then associate the data-series and thresholds via yaml config. As well as annotating the diagram with data, you can also add links allowing you to click on the different widgets and dive into an 'exploded' view of the selected component.

Think glass-cockpit with layers of detail; each layer giving ever increasing detail on system health. When creating dashboard suites such as these you often end up with many similar widgets that benefit from sharing the same threshold config. This panel actively supports this by allowing you to share thresholds and links, both within a panel and also across panels. It even goes one step further by allowing you to tailor threshold sets based off of grafana variable selections. This really helps make the thresholds relevant in all situations.

The panel isn't limited to just last-values. We've already paid the price of pulling in a time-range so this panel allows you to see the diagram at any of those points in time. Traverse the timeSlider back and forth to see your flows evolve. There is no grafana overhead for this because the data-series have already been fetched; we're just changing the point-of-interest.

## Feature Set
The plugin content is defined with three data files:
- SVG: This defines the flowchart with controllable widgets identified via the cell IDs.
- PanelConfig: Defined in yaml, this associates the above cell IDs with time-series, thresholds, links and visualization config.
- SiteConfig: Defined in yaml, this provides cross-panel shared configuration such as thresholds, links, colors, etc.

The data files can be pasted into the panel, but they can alternatively be loaded from external URLs such as github. When first rendered the panel shows the flowchart at *last-values*. i.e. the end of the time-window. But this is movable. A Time-Slider at the bottom of the panel allows the full timeseries to be traversed so you can see how the flow evolves over the time window.

The supported visualizations are:
- label content
- label color
- fill color
- stroke color
- links
- connector flow animations
- fill level
- bespoke SVG element attribute drives

*Note that tooltips have no inbuilt support in the panel, but can be defined in the SVG and will appear in the panel on-hover courtesy of the underlying framework. To set a tooltip in draw.io, `select widget -> Edit -> Edit Tooltip`; or `select widget -> <ALT><SHFT>T`.*

## Getting Started
Create a Flow Panel in your dashboard. The initial setup loads the first example from this repo via urls. It also enables *test-timeseries-enrichment*. These test timeseries ensure the initial dashboard has some data to show. It gives you a working example straight out of the box.

### Explore
- Scale:
  - Change the size and shape of the grafana panel. See the SVG automatically scale to fill the content whilst maintaining aspect ratio.
- Time Slider:
  - Drag the time-slider back and forth. See the flow labels, label colors, fill colors change according to the defined thresholds.
  - Open the panel editor and disable the time slider to see the SVG expand into the additional space and revert to *last values*.
- Links:
  - Move the mouse over a cell. See the cursor change to a pointer. Click and dive off to the associated link.
  - Move the mouse over the 'Active Workers' cell. note the mouse doesn't change as there is no associated link.
- SVG and Config References:
  - Edit the SVG reference and see the SVG dissapear. Change it back and see it reappear.
  - Edit the Panel Config reference and see the annotation dissapear. Change it back and see it reappear.
  - Change the links over to the second example. This shows a bus middleware example and also demonstrates use of a the shared siteConfig file:
    - svg: https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/darkThemeSvg2.svg
    - panelConfig: https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/panelConfig2.yaml
    - siteConfig: https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/siteConfig.yaml
  - Change the links over to the third example. This shows a selection of interacting queues. The cells have all been given threadHighlighting tags and the Highlighter legend is enabled allowing different sets of data to be highlighted to spot correlations:
    - svg: https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/darkThemeSvg3.svg
    - panelConfig: https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/panelConfig3.yaml
  - Change the links over to the fourth example. This shows connectors with flow animations. Flow speed is dynamically controlled from the incoming data. Whenever flow animations are defined a pause/play button is visible in the bottom left hand corner of the panel. Move the time-slider back and forth to see the flow rates adjust.
    - svg: https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/darkThemeSvg4.svg
    - panelConfig: https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/panelConfig4.yaml
  - Change the links over to the fifth example. This shows dynamic fill levels and bespoke attribute driving. It shows elements rotating and scaling and labels showing values dynamically calculated from a set of incoming mathjs formulas. Move the time-slider back and forth to see all the drives in action.
    - svg: https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/darkThemeSvg5.svg
    - panelConfig: https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/panelConfig5.yaml
- Test Data Generation:
  - Deselect generation and see the SVG change to unannotated. Reselect and see the color and values come back.
- Debugging: *Note these steps all need you to open your browser console.*
  - Data: Press the button and expand the two log lines of *Debugging Data raw* and *Debugging Data enriched*. The raw view is the timeseries grafana has sent to the panel. The enriched view is the data after test-data has been included. In the enriched view every used time-series has a corresponding *time* series and the *time* series also shows the valuesIndex that has been chosen based on the time-slider position.
  - Mappings: Press the button and you'll get log lines for abstract and verbose. The *abstract* line shows how SVG cell IDs have been assigned to time-series. The *verbose* line gives all of the SVG mapping information.
  - Units: Press the button and expand out the log line showing the Category -> Subcategory -> {text, value} for every potential unit. The unit strings you enter in the yaml config are the *values* shown here.
  - Colors: Press the button and see the available grafana theme hues. Each hue has mutiple shades. These color names can be used directly in the yaml. Alternatively you can enter short hex, long hex, rgb or hsl. All of these formats will be recognised and so will also work with *gradient* selected. If you want to enter html color names instead, they will be passed through to the SVG but they won't be understood by the panel and so *gradient* will have no effect.
  - SVG: Press the button and see the serialized svg that is being displayed. Copy it out to compare to the passed in svg template or save away as a snapshot image.
  - Timings: Press the button to instrument the next render pass. This allows you to see where the time is going:
    * toDataFrame: The panel only understands the dataframe format so the first step is to convert incoming data into this format. If you aren't sure what format you are receiving, run the query in *Query inspector* and look at the response. i.e. a dataframe will contain a *fields* array whilst a time-series will contain a *datapoints* or *points* array. Note that moving the timeSlider requires a fresh render pass and the panel has no way of telling if the data received is the result of a fresh fetch. As such this step has to be repeated each time the timeSlider moves. However, it's only expensive if the incoming data is not in a dataframe format.
    * transform: This converts the dataframes to the format needed by this panels interpolation. It's a light weight array restructuring.
    * seriesExtend: This adds in the test time-series. You will only see this if test time series are enabled in the panel options.
    * seriesInterpolate: This interpolates each of the time arrays to determine the correct index for the given timeSlider position.
    * svgUpdate: This applies the label and threshold settings to the document.
    * createJsx: This creates the JSX from the svg document html.

### Using draw.io to create your SVG
Any tool can be used to maintain your SVG but [draw.io](https://app.diagrams.net/?p=svgData) is the tool used for all of these examples. draw.io is available online and also as an app download. When launching the online version remember to include the *?p=svgdata* as an argument. This loads the svgdata plugin and ensures your cell IDs will be saved down in your SVG file. Via the app, you get the same by going to *Extras->plugins->Add->svgdata.js*. With the plugin, any ID can be edited in-situ by selecting the cell then *Edit->Edit Data->Double click on the ID value->edit the ID*.

Note that draw.io IDs under the hood get given a preamble of *cell-*. To make this easier the panelConfig yaml allows the preamble to be set so the actual yaml data can reference the IDs as you've entered them. You can see the difference in the Mappings data as it shows your ID as well as the full svg ID.

The SVG can be entered directly into the panel or it can be referenced via url.

### Using YAML to configure your Flowcharts
YAML offers a few useful features over other config formats. (1) It can be commented. (2) It supports anchors and aliases. Both of these features are really useful for long term maintainability. The yaml files can be entered directly into the panel or they can be referenced via url.

The panelConfig details the set of SVG IDs that are going to be driven and how they are going to be driven. It's particular to the panel.

The siteConfig details common settings that you are using across a suite of panels. It provides a way to define a system level theme, so all the panels respond in a similar way and can be maintained with single touch points. You don't have to use a siteConfig. All parameters can be defined in the panelConfig. The only reason for using a siteConfig is for when you are maintaining a suite of panels. The panelConfig and siteConfig urls will have grafana variables replaced prior to fetching the files. This gives you some level of multi-site configurability.

Grafana Variables can also be used to scale threshold definitions. i.e. if you have an *environment* variable you could scale the thresholds differently in dev and prod.

These links take you to yaml files where each of the settings are documented:
- [panelConfig yaml](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/yaml_defs/panelConfig.yaml)
- [siteConfig yaml](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/yaml_defs/siteConfig.yaml)

### First Panel
Once your familiar with the controls creating your first proper panel boils down to this process:
- In draw.io, create an SVG and edit the cell IDs to meaningful names. Keep it minimal in the first instance.
- Copy an example panelConfig as that's setup with cellIds that are using testData. Edit the cellIDs to match your SVG IDs.
- Create your Flow panel and set it to be driven from your SVG and your panelConfig.
- See your SVG responding in the correct units to the test data.
- Develop your time-series query in its own time-series panel until you are happy with the result. Remember to alias the time-series to a meaningful name as you will use in your Flow panel.
- Copy your query into the Flow panel.
- Press 'Debugging Data' to see your query time-series coming through to the panel.
- Change your panel config dataRef to map the cell ID to your time-series name.
- Use the time-slider to see your value being correctly echoed in the SVG.
- Rinse / Repeat. 

## Want to make changes?
Go to the [Grafana Getting Started](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/grafana-getting-started.md) guide to get going with downloading a fork and setting up your test environment.
Once up you'll find dashboards available (sourced from the provisioning directory) that act as demonstrators for the functionality.
