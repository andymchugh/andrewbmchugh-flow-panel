# Changelog

## 1.12.0
URL Grafana Variables
---------------------
Adds support for grafana variables in the SVG URL. Before this was only available in the YAML
URLs. It also corrects the variable change detection logic for all url variables to ensure we
get a fresh fetch when relevant variables change.

String Data
-----------
This adds support for string timeseries for label drives. Color can still be driven by having
number timeseries for colors and string timeseries for the label text. This is also compatible
with value mappings.

Relative Links
--------------
Adds support for relative links. Before only absolute links were available.

## 1.11.0
Flow Animations
---------------
Adds support for draw.io line flow animations. In draw.io lines with 'Flow Animation'
selected and the resulting SVG 'exported-as-svg' (not just saved as SVG) results in
animated lines that are controllable via 'direction' and 'duration' attributes. This
change adds yaml config to drive these animations off of data. When such config is
present a play/pause button is always added to the panel to ensure the panel is usable
by all. New config terms:
- cells.cell-name.flowAnimation

As well as provisioning dashboards, the above functionality is demonstrated in example 4:
- svg: https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/darkThemeSvg4.svg
- panelConfig: https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/panelConfig4.yaml

New test data added to facilitate testing of the flow-animations:
- test.testDataBaseOffset
- test.testDataExtendedZero

One Datapoint Interpolation fix
-------------------------------
Fixes a bug with timeSeries interpolation which resulted in no data when the timeSeries only had a single datapoint.

Value Mappings Support
----------------------
This allows you to configure a custom value based on data-match criteria. i.e. if your data is 0, 1, 2 you can use
this configuration to replace the 'label' text with 'auto', open', 'closed'. The criteria you can use to match are:
- exact value match
- range match
- partial range match.

New panelConfig terms:
- cells.cell-name.label.valueMappings
- cells.cell-name.label.valueMappingsRef

## 1.10.0
Increases the range of SVG shape support by relaxing the expected DOM element
hierachy.

## 1.9.0
Adds Accessibility in the form of Pan / Zoom to ensure the SVG is readable for the
greatest range of people.

## 1.8.0
Corrects the source of the time-field from the incoming dataFrame. Before it relied
on the name being toLower('time'). Now it correctly looks up the type and breaks
out on first match with type time. This fixes use with datasources like ElasticSearch
where the field name defaults to '@timestamp'.

## 1.7.0
Improves scaling in all ways but especially the sub 100% scaling so that it now correctly
fills the panel maintaining aspect ratio.

Changes the background color definition so that it applies to the available svg panel area
rather that the actual svg background.

Adds a new panelConfig field 'unitsPostfix'. This is an optional string that will be postfixed
to the label value. It can be used for specifying custom units. In yaml, unicode characters
are specified with a \u. i.e. "\u03bc" = Mu. New panel config terms:
- cells.cell-name.label.unitsPostfix

Adds a new panelConfig field 'condensed'. This mode which uses less vertical space for the controls when both the timeSlider and highlighter are enabled. New panelConfig terms:
- tagConfig.condensed

## 1.6.0
Adds resource links for website, license and yaml defs to the plugin landing page.

Fixes x-scaling ratio when the SVG x-dimension is smaller than the available
window. Now it scales with the window whereas before it scaled at twice the rate
resulting in it being much smaller than necessary.

Adds the ability to drive the SVG background. New panelConfig terms:
- background.darkThemeColor
- background.lightThemeColor
Can be used with the normal color-names, rbg, hex values. When the relevant term is
undefined the background color is not driven.

Extends the datapoint choice from 'last' to 'last' or 'lastNotNull'. 'last' remains
the default. When coupled with graphite functions 'keepLastValue' and 'transformNull', 'last'
offers the best control over the display. Where those graphite functions are not available
'lastNotNull' offers a consistent display when dealing with sparse data. 'lastNotNull' starts
with the same datapoint as 'last' and then walks back in time till a non-null value is found.
It's configurable in the panel yaml at the panel level and overridable at the cell level and cell-attribute level. To make this testable a 'test' table has been added to the yaml to allow
the testData to be generated in sparse mode.
New panel config terms of:
- datapoint
- cells.cell-name.datapoint
- cells.cell-name.label.datapoint
- cells.cell-name.labelColor.datapoint
- cells.cell-name.fillColor.datapoint
- test.testDataSparse

Adds 'Thread highlighting'. Each driven SVG cell can now be given an associated tag set
and these tags are selectable from an optional 'Highlighter' legend. This provides a way
to bring related terms to the fore to help spot correlations in flow. New panel config terms of:
- tagConfig
- cells.tags

## 1.5.0
Fixes the grafana variable threshold matching to break out on first rule
match for a given variable/cell tuple. Before it was continuing through
the rule set which meant various negative rules were also needed to achieve
the right effect.

Fix rendering of SVGs that contain multi-line text blocks. Before the domPurify
step was breaking the content making the image unrenderable. This is now fixed by
using PARSER_MEDIA_TYPE: 'application/xhtml+xml' in the domPurify sanitization.

Fix link time forwarding when sourced from the args. Before this worked correctly
if from/to arguments were present in the url, but when they were missing it would
add them in but set to 'null' resulting in a downstream dashboard have a non-existent
time window. Now if the values aren't in the url, they aren't appended to the link.

Expose decimalPoints=auto. Before the default was '0' and there was no way to specify
auto. Now setting decimalPoints to null will forward through as 'auto'. There's also
now a panel level override 'cellLabelDecimalPoints' that will be applied if the value
is not specified at the cell level. To keep back-compatibility, if not specified on the
cell or in this panel fallback it will still default to '0'.

## 1.4.0
Changes the data-series name to be sourced from getFieldDisplayName(field, frame).
This is a much more involved grafana backed name resolution that should work with
all the various ways grafana allows series to be named. Added to resolve issue raised
with a prometheus data query.

## 1.3.6
Grafana 10.0.0 base.

- rebases the required dependency to Grafana 10.0.0
- corrects readme example picture links to work from grafana plugins page
- starts maintaining this changelog

## 1.3.4
Grafana 10.0.3 base.

Initial release.
