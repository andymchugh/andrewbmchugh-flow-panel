# Changelog

## 1.16.5

SVG formatting support improvements
-----------------------------------
Formatting of diagrams edited in the latest draw.io (v24.7.8) caused label layout problems; especially
if the labels were multi-word. This should now be fixed by removing multi-spaces from labels at initialization
and further limiting the application of whitespace style 'pre'.

TimeSlider label
----------------
Improvements made to the timeSlider timezone application and label positioning to remove artifacts
seen when not using browser-time or the 24 hour clock.

Getting Started Docs Improvements
---------------------------------
Three new sections have been added to the docs:

[Environment Setup & Editing Workflow](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/src/README.md#environment-setup--editing-workflow)

[Feature Exploration](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/src/README.md#feature-exploration)

[Troubleshooting FAQ](https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/src/README.md#troubleshooting-faq)

## 1.16.4

SVG 'marker' element support
----------------------------
This change allows use of all the marker element attributes. Before they were being incorrectly
stripped due to a bug in the underlying SVG purification. Use of 'markers' came to the fore with
the availablity of the bespoke drive.

Flow Animation speed bias
-------------------------
Adds a new term to the flow animation drive that applies a power curve to the flow rate. Before
the flow animation speed linearly ramped with data. Now speed ramps in at the rate of your choice.

New config terms in panelConfig:
- panelConfig:cells.cell-name.flowAnim.biasPower

## 1.16.3

SVG formating support
---------------------
Using SVGs post formatting for better readability could cause label positions to shift.
This is now fixed by limiting the scope of how style->whitespace is applied dynamically to labels.

## 1.16.2

Animation play/pause button optional
------------------------------------
New panel level switch added to allow removal of the animation play/pause control.

Bespoke formulas fix
--------------------
Bespoke formulas would only run if the cell also included a bespoke attribute 'get' or 'set'. This
restriction has been removed so formulas can now be used stand-alone for computing new data terms for
use in the other drives.

## 1.16.1

Single data point dataFrames
----------------------------
Support added for incoming data that doesn't have an associated time array, just a single data-point
in the array.

Bespoke Attribute Drive 
-----------------------
New mathjs based drive for SVG element attributes. This allows clients to do bespoke things such as
transform their shape elements according to incoming data. Multiple incoming data sources can be
combined in mathjs formulas to derive new values and these values can be used to drive attributes or
as a source for any of the other fixed drives such as label, labelColor, etc. To ensure javascript
can't be injected into the plugin the following bespoke attribute restrictions are in place:
- No attribute values beginning 'on' are drivable.
- Only attributes 'transform', 'transform-origin', 'visibility' can be added.
- Any other attribute value can be driven provided the attribute still exists after the svg has parsed
  through dompurify at initialization.

New config terms in panelConfig:
- panelConfig:cells.cell-name.bespoke
- panelConfig:cells.cell-name.bespokeDataRef
- panelConfig:cells.cell-name.label.bespokeDataRef
- panelConfig:cells.cell-name.labelColor.bespokeDataRef
- panelConfig:cells.cell-name.fillColor.bespokeDataRef
- panelConfig:cells.cell-name.strokeColor.bespokeDataRef
- panelConfig:cells.cell-name.flowAnim.bespokeDataRef
- panelConfig:cells.cell-name.fillLevel.bespokeDataRef

TimeSlider time range compatible with time-shift 
------------------------------------------------
Corrects the way the time-slider time range is initialized so that it now behaves correctly
when used in conjunction with panel-query-options time-shift.

## 1.15.0

This version was never published but contained an earlier version of 1.16.0 that based the bespoke
drive off of client defined javascript. That drive in the later version was re-written purely in
terms of client defined mathjs.

## 1.14.0

Threshold Support for Text Data 
-------------------------------
This adds the ability to configure thresholds using regex patterns for text data.
New config terms in siteConfig and panelConfig:
- siteConfig:thresholdPatterns
- panelConfig:cells.cell-name.labelColor.thresholdPatterns
- panelConfig:cells.cell-name.labelColor.thresholdPatternsRef
- panelConfig:cells.cell-name.strokeColor.thresholdPatterns
- panelConfig:cells.cell-name.strokeColor.thresholdPatternsRef
- panelConfig:cells.cell-name.fillColor.thresholdPatterns
- panelConfig:cells.cell-name.fillColor.thresholdPatternsRef

Link in the Same Tab
--------------------
This adds the ability to configure links to open in the same tab rather than a new tab.
It can be set at the cell, panel or site level. New config terms in siteConfig and panelConfig:
- siteConfig:linkWindow
- panelConfig:linkWindow
- panelConfig:cells.cell-name.link.sameTab

Link Variables
---------------
This adds the ability to define link url substitutions to simplify oft-repeated base urls
or argument sets. New config terms in siteConfig and panelConfig:
- linkVariables

Zoom Pan Pinch Wheel Activation
-------------------------------
This adds the ability to require an activation key such as 'Alt' to be pressed in order to enter
panel zoom. There's a clash of interest between panel zoom and dashboard scroll which can be
avoided by using this feature. New config terms in siteConfig and panelConfig:
- zoomPanPinch

Compound Colors
---------------
This feature allows a labelColor, strokeColor or fillColor to be driven based off
an array of dataRef inputs. i.e you can choose the worst or the best color based off of
a set of inputs. To support this a new field has been added to 'threshold' called 'order'.
It defaults to the threshold-array index but can be explicitly driven in yaml. This is the term used to compare thresholds from different dataRefs. On the whole it won't be needed but it's inclusion means no implicit ordering has to cross all threshold definitions.
New config terms:
- cells.cell-name.labelColors
- cells.cell-name.strokeColors
- cells.cell-name.fillColors

## 1.13.0
Fill Level
----------
Adds support for driving fill levels. The yaml defines a data->percentage-fill mapping. Under the
hood it's implemented using the SVG clip-path feature. The shapes bounding box is calculated and
an additional clip-path rect is added to the SVG. This rect then gets driven based off of the
incoming data. New config terms:
- cells.cell-name.fillLevel

Stroke Color
------------
Adds support for driving stroke color. i.e. coloring the structural lines of shapes and connections.
The yaml drive is identical in nature to the fillColor drive.
New config terms:
- cells.cell-name.strokeColor

Grafana Variable Substitution in ValueMappings
----------------------------------------------
Adds support for passing valueMappings text through grafana variable substitution. i.e. to substitute
all values of a timeseries with a variable value:
cell abc:
  valueMappings:
    - {text = "${myVariableName}"}

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
