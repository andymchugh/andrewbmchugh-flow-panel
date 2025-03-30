# Flow

SVG flowchart visualization

![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?logo=grafana&query=$.version&url=https://grafana.com/api/plugins/andrewbmchugh-flow-panel&label=Marketplace&prefix=v&color=F47A20)
![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?logo=grafana&query=$.downloads&url=https://grafana.com/api/plugins/andrewbmchugh-flow-panel&label=Downloads&color=F47A20)
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
  - Open the panel editor and deselect the time slider to see the SVG expand into the additional space and revert to *last values*.
  - Open the panel editor and select time-slider 'Time' mode. In this mode the time-slider will drive other panel time-sliders and timeSeries shared-crosshairs. 
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
Any tool can be used to maintain your SVG but [draw.io](https://app.diagrams.net/?p=svgData) is the tool used for all of these examples. draw.io is available online and also as an app download.
When launching the online version or the desktop app, you must ensure the svgdata plugin is added by going to *Extras->plugins->Add->svgdata.js*. The plugin ensures the cell IDs get saved in the SVG file. Note that prior to September 2024 the online version could be launched with the argument the *?p=svgdata* to automatically enable the plugin. That tail no longer works so you must now add the plugin as just described.

The cell IDs can be edited in-situ by selecting the cell then *Edit->Edit Data->Double click on the ID value->edit the ID*.

The draw.io IDs under the hood get given a preamble of *cell-*. To make this easier the panelConfig yaml allows the preamble to be set so the actual yaml data can reference the IDs as you've entered them. You can see the difference in the Mappings data as it shows your ID as well as the full svg ID.

The SVG can be entered directly into the panel or it can be referenced via url.

### Using YAML to configure your Flowcharts
YAML offers a few useful features over other config formats. (1) It can be commented. (2) It supports anchors and aliases. Both of these features are really useful for long term maintainability. The yaml files can be entered directly into the panel or they can be referenced via url.

The panelConfig details the set of SVG IDs that are going to be driven and how they are going to be driven. It's particular to the panel.

The siteConfig details common settings that you are using across a suite of panels. It provides a way to define a system level theme, so all the panels respond in a similar way and can be maintained with single touch points. You don't have to use a siteConfig. All parameters can be defined in the panelConfig. The only reason for using a siteConfig is for when you are maintaining a suite of panels. The panelConfig and siteConfig urls will have grafana variables replaced prior to fetching the files. This gives you some level of multi-site configurability.

Grafana Variables can also be used to scale threshold definitions. i.e. if you have an *environment* variable you could scale the thresholds differently in dev and prod.

These links take you to yaml files where each of the settings are documented:
- [panelConfig yaml](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/yaml_defs/panelConfig.yaml)
- [siteConfig yaml](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/yaml_defs/siteConfig.yaml)

### Environment Setup & Editing Workflow
Creating panels is best achieved by using using three IDEs together as a holistic set in the followng way:
- Install the draw.io app and add the svgdata plugin by going to *Extras->plugins->Add->svgdata.js*. Using the app rather than the online version makes it much easier to load and save from/to your local disk.
- Create a github repo for your svg and yaml files. This gives many things but the really big one is providing a central hub from where the files can be loaded and edited.
- Install VSCode for viewing and editing the above repo. It offers yaml syntax highlighting and gives a place to copy out the svg for pasting into the panel.
- With the above setup, follow an iterative workflow of:
  - draw.io: Edit the svg -> save as svg. *Note that if using Flow Animations or widgets containing embedded images you have to `Export as -> SVG...` rather than just save.*
  - vscode: Copy the svg -> paste into the grafana panel
  - vscode: Edit the panelConfig yaml -> Copy the yaml -> paste the yaml into the grafana panel
  - repeat
With this workflow all three editors (draw.io/vscode/grafana) remain open and just act as specialised windows. Although you could edit yaml or the svg directly in the grafana panel, you'll find it much simpler to copy/paste into the panel and use the gihub repo as the underlying main version.

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
- Remember to switch of 'Test Data Generation' when finished so your panel doesn't suffer the overhead.

## Feature Exploration
The API for all the panel features is detailed in the [yaml_defs](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/yaml_defs). The features are also demonstrated in the provisioning dashboards. The associated SVG and yaml files used in those dashboards, linked below in the `Data Files` column, are a good starting point to explore the feature drives. Note when clicking on the SVG links you initially land on the `Preview` tab. Just switch to the `Code` tab to be able to copy out the SVG.

To explore each feature, copy/paste the SVG and yaml data into your panel. That gives you a working starting point from which to explore as you read the associated API. Exploring these features is best done by following the workflow described above in [Environment Setup & Editing Workflow](#environment-setup--editing-workflow). With the majority of them the functionality is best seen by moving the time-slider back and forth.

|Feature|Description|Setup|Data Files|
|-------|-----------|-----|----------|
|Background Color|Background is normally left untouched but the panel yaml can define a darkTheme and a lightTheme color. If the yaml field is present the background color is driven. Go to user -> profile to change the theme from dark to light.||[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/backgroundColor.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/backgroundColor.yaml)|
|Bespoke Drive|The bespoke drive demonstrates how to drive any svg attribute via mathjs formulas. See the [Bespoke Drive Example](#Bespoke-drive-example) below for details.|Variable `myVar`|[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/bespokeDrive.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/bespokeDrive.yaml)|
|Color Mappings for Themes|SVGs created in draw.io 26.0 and onwards contain both light and dark theme colors. The cell colors defined in thresholds allow you to specify a single color and the colorMappings allow you to adjust the value of that color for each theme. i.e. In the cell config specify red, amber and green on the thresholds. Then in the colorMappings specify the exact colors you want in each theme for red, amber and green.||[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/examples/ambiThemeSvg1.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/colorMappingsPanel.yaml), [siteConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/colorMappingsSite.yaml)|
|Compound Color|This demonstrates compound colors, the ability to drive a cell color field based off of an aggregation of dataRefs. The panel shows labelColor, fillColor and strokeColor being driven based off of aggregation functions 'max' and 'min'. By default thresholds inherit their array position as their order but the order term can be explicitly set. The 'inverse' box demonstrates an inverted threshold order resulting in min-data displaying as max color. Where the single 'color' drive is defined alongside a compound drive, the single drive is prepended to the compound in element 0. This is demonstrated in the 'both' cell.||[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/compoundColor.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/compoundColor.yaml)|
|Decimal Points|This demonstrates the panel level decimalPoints overrides. Each box has a different decimalPoint setting at the cell level with the last box being undefined at the cell level and so falling back on the panel level default.||[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/decimalPointTest.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/decimalPointTest.yaml)|
|Fill Filter|Fill colors, when applied to simple shapes, provide a great way to visualize thresholds. But for more complex shapes, that contain a background with foregound detail, the fillColor needs to apply to one or the other, otherwise the detail gets lost. This is managed using the yaml fillColorElementFilter. It requires you to understand a bit about how your shape is constructed, but with that knowledge you can then specify which parts of the shape should be filled. The best way to introspect your shape is to view the SVG in Visual Studio after formatting it using the SVG formatter extension. Find your shape by searching on your cell-id and then explore the yaml filter based on what you see.||[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/complexShapes.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/complexShapes.yaml)|
|Fill Level|Fill levels are underpinned by the SVG clip-path feature. The yaml maps the data to fill percentages and that then drives an applied clip-path rect to achieve the desired fill level. The panel demonstrates the following features: (1) A range of ellipse, rect and path shapes all being filled correctly. (2) The four rects-in-a-cross demonstrate the four fill directions. (3) The 'blue' demonstrates a static fill color defined in the SVG. (4) The bottom four rects show the percentage capping, the optional 'off' setting and the own-dataref. Note that shapes with complex inner detail such as the DB and circle-inner-cross do not render perfectly as they contain multiple path elements and so have multiple overlapping clip and fill regions.||[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/fillLevel.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/fillLevel.yaml)|
|Flow Animation|draw.io has a line property called 'flow animation'. When selected the line animates in a particular direction at a particular rate to visualize flow. For these animations to be available in the panel you must use the draw.io `Export As -> SVG` rather than `Save`. The yaml data assumes directionality based on sign but that can be overriden by marking it as unidirectional. The animation duration is defined with three bounds: off, lower and upper. Whenever animations are present in the yaml data, a control is visible in the bottom left corner. This is on the timeSlider -> highlighter -> own section depending on visibility. The panel options also allows the initial animation state to be selectable.||[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/flowAnim.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/flowAnim.yaml)|
|Links|This shows widgets with absolute and relative links, with and without time. The third row shows variable substitutions as defined in the site and panel config. The fourth row shows the `${cell.name}` reserved variable substitution. This yaml really only works with this repos provisioning setup as relative links have to be to something in the same site. It's included here because it does offer a set of worked examples to help demonstrate how the functionality is configured. Note that for time-variable forwarding to work, the `from` and `to` variables must be in the original url.||[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/links.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/links.yaml), [siteConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/linksSite.yaml)|
|stroke Color|This demonstrates stroke-color. It shows how shapes and lines can have their stroke component colored based on thresholds and incoming data.||[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/flowAnim.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/strokeColor_flowAnim.yaml)|
|Thread Highlighting|This demonstrates thread highlighting. The cells are tagged with attribute type and technology type allowing the data to be higlighted across these dimensions. The intent behind this is to make it easier to spot correlations. This example also shows how the highlighter state is available in the bespoke drive allowing you to adjust things like visibility based on selection.||[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/highlighter.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/highlighter.yaml)|
|Time Slider Mode|This panel setting controls time-slider collaboration across the dashboard. Explore this by creating two Flow panels and a Time-Series panel. In the dashboard settings enable 'Graph tooltip'->'shared crosshair'. With all this in place change the Flow panel 'Time Slider Mode' to 'Time'. Move the mouse over the time-series panel; see the sliders keep in sync. Move one of the time-sliders; see the shared-crosshairs respond. Change the mode to 'Position' in both Flow panels and adjust the time offset in one of them to be 24 hours. Move the sliders and see how their positions remain in sync, even though their time settings are 24 hour apart.|||
|Units|This demonstrates normal units with associated grafana scaling alongside custom units specified using the unitsPostfix yaml field. It demonstrates normal ascii alongside unicode characters.||[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/examples/darkThemeSvg1.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/units.yaml)||
|Value Mappings|This demonstrates value mappings via range based substitution of numbers at both the panelConfig level and the siteConfig level. Grafana variable substitutions are applied to the text values in the 'low' state.|Variable `exampleVar`|[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/valueMappings.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/valueMappings.yaml), [siteConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/valueMappingsSite.yaml)|
|Zoom Pan Pinch|This demonstrates the Zoom-Pan-Pinch configurability which supports enablement along with wheel activation keys. The activation keys are helpful as there's a clash of interests between dashboard scroll and panel zoom.|Pan / Zoom Enabled|[svg](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/examples/darkThemeSvg1.svg), [panelConfig](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/provisioning/dashboardData/zoomPanPinch.yaml)|

### Bespoke Drive Example
This panel demonstrates the bespoke drive in the following ways:
- Top Left Rect - scales with data around the top left corner
- Middle Rect - demonstrates rect label driven from bespoke data with grafana-variable replacement.
- Bottom Left Range Ring - scales with data around the center with aligned label again driven from a bespokeDataRef as shown by the value aliasing. label.
- Middle Clocks - Hands rotate around the centre demonstrating namespacing alongside normal stroke color drives. The second clock leverages the same formulas as the first clock but with different data, courtesy of dataRef name setup in the per-clock constants.
- Middle Bottom Arrow - Shows head (aka direction) configurability based off of data.
- Left 'column of rects' - Shows all the normal drives being driven from bespokeDataRefs as defined at the drive level.
- Right 'column of rects' - Shows all the normal drives being driven from bespokeDataRefs as defined at the cell level.
- Right Propeller - Shows two paths, one for each blade, rotating around a set origin, both with coherent fillLevel drives.

## Troubleshooting FAQ
- After upgrading to draw.io 26.0 the color drives are no longer working and the colors in the SVG in general look wrong.
  - This version of draw.io introduced theme colors. i.e. each color defined in the SVG is defined as a tuple of the color to use on a dark theme and the color to use on a light theme. This was a breaking change for this plugin that is fixed in Flow Panel version 1.17. You need to upgrade to that version of this plugin if you are using draw.io 26.0 or later. Note that even with the new version some SVG editing in draw.io may still be necessary as draw.io does not perfectly upgrade the color definitions. Once you have upgraded, your SVGs will correctly render in both dark and light themes.
- When I edit the SVG and resave nothing works anymore?
  - This is most likely caused by not having the svgdata plugin loaded in draw.io which results in all the IDs being stripped off the SVG. If unsure look at the difference between the two versions of the SVG.
- My label isn't being driven even though 'Debugging Mappings' says it's correctly mapped?
  - This is most likely caused by having a multi-line label in the SVG. Multi-line isn't drivable. Your labels can be multi-word but can't contain \<CRs\>.
- I've added a shape (rect, ellipse, etc.) and it maps correctly to yaml but the label doesn't appear?
  - It's not enough to just add the shape. You must also double click in it and type some text to add a label. Then the label is drivable. In theory you could just add a space but if you do that you have no visual indication on your diagram as to whether the label element exists, where it's positioned, how it's formatted, etc. Everything may work as you want but if it doesn't your journey to understanding why will be much harder.
- My flow animation looks great in draw.io but doesn't work in the panel?
  - This is most likely due to the way you saved the SVG. Flow animations have to be 'exported as svg' from draw.io, they can't just be 'saved as svg'.
- My widget renders well in draw.io but is missing detail in the panel or just not there?
  - This is most likely due to the way you saved the SVG. More complex widgets have to be 'exported as svg' from draw.io, they can't just be 'saved as svg'.
- My widget renders well in draw.io and the panel but it looses all inner detail when I apply a fillColor?
  - If fillColor is obliterating inner detail that's probably because the widget contains several internal SVG elements and fillColor should only be applied to a subset of them. An example of this would be the draw.io 'L3 switch'. To correct this you have to apply a fillColorElementFilter. Look at the examples under 'Fill Filter' in the 'Feature Exploration' section above.
- My timeseries is sparse and often the last value is null resulting in the widgets not showing a label value?
  - By default the 'datapoint' selection is 'last' but this can be changed to 'lastNotNull'. In 'lastNotNull' mode the datapoint is walked back from the current time until it hits a non-null data value.
- I don't understand what to put into dataRef to see my data?
  - dataRef is a general purpose name, short for data-reference. It doesn't map to a single 'grafana' term, but instead refers to the name grafana give your data when they present it to the plugin in a dataFrame format. How the name is determined by grafana is complex and datasource dependent. Given this, the easiest way to understand what to type for the value is to press 'Debugging Data'. This lists in the console your data as the plugin sees it. If you are having trouble understanding what in the log is 'your name', look for the test_data names such as "test-data-large-sin". Alongside it you should see your data. Once you understand how the data is coming through you can adjust your query to give it the name you actually want. [first panel](https://github.com/andymchugh/andrewbmchugh-flow-panel/tree/main/src#first-panel) explains how to follow this process. The [yaml_defs](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/yaml_defs/panelConfig.yaml#L186) also explain what the term is.
- I've created my first yaml file and pasted it into the panel but the panel refuses to load it. I don't understand the console error...
  - All yaml files should begin with the start-of-document marker '---'. Although this is optional in the yaml spec, it's mandatory in this space because the plugin has to decide whether the passed in string is a url or a yaml document. Without the '---' the content when pasted into the panel will likely be considered a url.
  - If that doesn't solve the problem, just keep reducing your yaml down to a minimal example until you find the problem. Editing the file in a smart IDE just as VSCode makes this a lot simpler as it should highlight syntax errors for you. 
- I've set the time-slider mode to 'Position' but the times in the panels aren't exactly the same, they are a few minutes apart?
  - The time-slider time range in each panel is determined from the time-range in the query response. Only if no times are available from the queries does it fall back on the dashboard time-range. It's done this way so the slider can control the range of data which can be quite different from the dashboard time-range when time-offsets are used in the query configuration. The end result of this is that each panel will have a slightly different time-range depending on the query response. That means when using 'Position' to synchronize sliders the times will be more approximate. If not using time-offsets in queries, prefer the 'Time' mode. In that mode the times will exactly match. Only use 'Position' mode when using time-offsets.

## Want to make changes?
Go to the [Grafana Getting Started](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/grafana-getting-started.md) guide to get going with downloading a fork and setting up your test environment.
Once up you'll find dashboards available (sourced from the provisioning directory) that act as demonstrators for the functionality.
