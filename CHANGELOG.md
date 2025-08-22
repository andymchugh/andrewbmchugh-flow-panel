# Changelog

## 1.18.5

Time Slider Time String
-----------------------
The time-string on the time-slider has been changed to always display time
using a 24 hour clock. This keeps it in common with the grafana time selector
and the grafana time series panel x axis display. Before it used a browser format
which meant with some language settings the string displayed using a 12 hour clock.

## 1.18.2

Gradient Support
----------------
Allow use of the following svg terms:
- tags: linearGradient, radialGradient
- attributes: gradientUnits, gradientTransform

The latest draw.io version (27.0.5) has started using these on certain exported widgets
such as the 'hard disk' icon.

## 1.18.1

TimeSlider hookup with the shared tooltip/cursor http fix
---------------------------------------------------------
Remove use of function introduced in 1.18.1 that was only available on https and localhost.
It wasn't available on http.

## 1.18

TimeSlider hookup with the shared tooltip/cursor
------------------------------------------------
To celebrate the panels 1st year anniversary which coincides with it reaching 1M downloads,
this change adds a new panel option for the TimeSlider Mode. It has three values:
- Local    - This is the existing behavior where the timeSlider applies to just this panel.
             It's the default mode so there is no change of behavior when upgrading.
- Time     - In this mode the timeSlider 'time' value is shared. It synchronises with other
             shared timeSliders as well as timeSeries panel shared-crosshairs.
- Position - This mode is the same as 'Time' but the shared value is the slider 'position'
             rather than 'time'.
'Time' mode makes sense where all the panels are displaying a similar time-range. In this mode
the 'Time' value will accurately reflect across all panels. 'Position' mode comes into its own
where you have Flow panels with different time-offsets. i.e. one showing today and one showing
the same day from one week ago. These kind of offsets are settable at the top of the Grafana
query pane. By sharing the slider position rather than time you get a meaningful way to
traverse the time-range in both panels, but note the actual time reflection will be more
approximate as each panel has a unique time-range based off of the returned query data.

Note that a panel can participate in this sharing even when its timeSlider is deselected. As such
you can have a suite of Flow Panels laid out on your dashboard with just a single timeSlider
to control all the panels.

The mode selection is not affected by the dashboard 'Graph Tooltip' selection. These multi-panel
updates have a performance cost so by keeping selection independent you can have Flow panels
colaborate whilst not suffering the overhead of all the timeSeries panels joining in; and vice versa.

Logo Modification
-----------------
Colors tweaked to improve legibility.

## 1.17.5

Pass Highlighter bar settings through to the bespoke drive
----------------------------------------------------------
This change makes the 'highlighterSelection' and 'highlighterState' available to the bespoke
drive math.js formulas in the utils object. Providing access to this information allows users
to drive attributes such as visibility off of the highlighter setting. It also adds attributes
'opacity' and 'fill-opacity' to the list of attributes the bespoke drive is allowed to add to
the svg.

This version also corrects some inefficiencies in bespoke formula evaluation repeats.

## 1.17.4

Fix Fill-Level Drive on Repeating Panels
----------------------------------------
This fixes a bug with fill-level drives on 'repeating grafana panels'. Before the fill-level from one
panel drove the fill-level on all the repeats. With the fix they are now independent.

## 1.17.3

Fix url links variable substitution
-----------------------------------
This corrects a few bugs with variable substitutions in links. The link variables can now contain references
to the reserved names (cell.name and cell.dataRef).

## 1.17.2

FillColor drive filter to support shapes with foreground detail
---------------------------------------------------------------
Complex shapes represented my more than one element (path, rect, etc.) sometimes need
fillColor to be applied to just a subset of the elements that make up the shape. The
draw.io 'L3 switch' is one such example that's represented using two 'rect' elements and
two 'path' elements. Applying fillColor to all elements results in a loss of the foreground
detail. This change introduces a new yaml term that allows you to filter the application
of fillColor to make these complex shapes drivable.

New config terms in panelConfig:
- panelConfig:fillColorElementFilter

## 1.17.0

Light / Dark Theme Support with draw.io 26.0
--------------------------------------------
draw.io 26.0 introduced light / dark theme support where all colors can be defined as tuples
in the SVG. This version of draw.io requires this version of the panel plugin due to the
change in how the dynamic color attributes need to be applied.

As well as making the plugin compatible with this draw.io version, it also fully exposes the theme
support ensuring the SVG theme is kept in line with the selected grafana theme. As non-driven colors
will now respond to theme selection, new colorMapping config terms have been added to allow you to
define theme dependent colors. i.e. red in a dark theme can be mapped to light-red; whilst in a light
theme it could be mapped to dark-red; etc.

New config terms in panelConfig:
- panelConfig:cellColorMappings
New config terms in siteConfig:
- siteConfig:cellColorMappings

## 1.16.6

YAML maxAliasCount
------------------
The yaml loader recursive alias count has been increased from the library default by 100x
to allow for larger more complex configuration whilst not exposing the dashboard to unreasonable
load.

Downloads badge fix
-------------------
Downloads badge corrected following recent github changes.

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
