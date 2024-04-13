# Changelog

## 1.x.x
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
