import { getValueFormatterIndex, formattedValueToString, GrafanaTheme2 } from '@grafana/data';
import { 
  ClickActions,
  DataRefDrive,
  FlowValueMapping, HighlightFactors,
  LabelSeparator, Link,
  PanelConfig, PanelConfigCell, PanelConfigCellColor,
  PanelConfigCellColorCompound,
  PanelConfigCellFillLevel, PanelConfigCellFlowAnimation, PanelConfigCellLabel,
  PanelConfigElementFilter, PanelConfigTooltipsElement,
  SiteConfig, VariableThresholdScalars } from 'components/Config';
import { TimeSeriesData } from 'components/TimeSeries';
import {
  cellIdFactory, CellIdMaker, getColor, primeColorCache,
  variableThresholdScalarsInit, variableThresholdScaleValue, isShapeElement, 
  regExpMatch} from 'components/Utils';
import { highlightState, HighlightState } from './Highlighter';
import {
  CellFillLevelDriver, getClipper, isFillLevelElement } from 'components/FillLevel';
import { getTemplateSrv } from '@grafana/runtime';
import { attribDriverManager, bespokeDriveHandlerFactory, ScopedState, CellBespokeHandler, getBespokeData } from './bespokeDriver';
import { sanitize } from 'dompurify';

type TooltipVariableInstanceType = "label" | "labelColor" | "ts" | "default";

export type TooltipVariableInstance = {
  varName: string;
  type: TooltipVariableInstanceType;
  pattern?: RegExp;
  // the "whole" string to substitute in pattern 
  varString: string;
}

export type TooltipVar = {
  element: PanelConfigTooltipsElement | undefined;
  value: any;
  color: any;
  ts: any;
}
export type TooltipHolder = {
  tooltipContent: string;
  usedVars: Map<string, TooltipVar>;
  // usedInstances: Map<string, TooltipVariableInstance>;
  usedInstances: TooltipVariableInstance[];
}

// Defines the metadata stored against each drivable svg cell
export type SvgCell = {
  cellId: string;
  cellIdShort: string;
  textElements: HTMLElement[];
  strokeElements: HTMLElement[];
  fillElements: HTMLElement[];
  fillClipDrivers: CellFillLevelDriver[];
  text: string;
  cellProps: PanelConfigCell;
  variableThresholdScalars: Map<string, VariableThresholdScalars[]>;
  tooltip: TooltipHolder;

};

export type SvgElementAttribs = {
  name: string;
  dataRef: string | null;
  link: Link | null;
  clickActions: ClickActions | null;
  strokeColor: string | null;
  fillColor: string | null;
  styleColor: string | null;
  styleFillColor: string | null;
  styleStrokeColor: string | null;
};


export type SvgAttribs = {
  width: number;
  height: number;
  scaleDrive: boolean;
  cells: Map<string, SvgCell>;
  elementAttribs: Map<string, SvgElementAttribs>;
  variableValues: Map<string, string>;
  highlightFactors: HighlightFactors;
  bespokeHandlers: CellBespokeHandler[];
};

export type SvgHolder = {
  doc: Document;
  attribs: SvgAttribs;
}

type FlowAnimationState = {
  durationSecs: number;
  direction: string;
};

export type BespokeStateHolder = {
  namespaceState: Map<string, ScopedState>;
  elementCounts: Map<string, number>;
  handlers: CellBespokeHandler[];
}

function generateLabelPreamble(label: string | null, separator: LabelSeparator | null) {

  // label space stripping is needed when the svg has been formatted to allow us to change
  // the whitespace style to 'pre'.
  label = (label || '').replace(/\s+/g, ' ');
  label = label.trim();

  if (separator === 'cr') {
    return label + '\n';
  }
  else if (separator === 'colon') {
    return label + ': ';
  }
  else if (separator === 'space') {
    return label + ' ';
  }
  else if (separator === 'replace') {
    return '';
  }
  else {
    return label;
  }
}

function dimensionCoherence(doc: Document) {
  const width = doc.documentElement.getAttribute('width');
  const viewBox: number[] = (doc.documentElement.getAttribute('viewBox') || '').split(' ').map(Number);

  if (viewBox.length === 4) {
    return {
      width: viewBox[2] - viewBox[0],
      height: viewBox[3] - viewBox[1],
      scaleDrive: (typeof width === 'string') && !width.includes('%'),
    }
  }
  else {
    return {
      width: 100,
      height: 100,
      scaleDrive: false,
    }
  }
}

function innerMostDiv(el: HTMLElement) {
  if (el.nodeName === 'div') {
    if (el.hasChildNodes()) {
      for (const child of el.childNodes) {
        const childNode = child as HTMLElement;
        if (childNode.nodeName === 'div') {
          return false;
        }
      }
    }
    return true;
  }
  return false;
}

function isFillColorElement(filters: PanelConfigElementFilter[] | undefined, elementName: string, elementPosition: number) {
  if (filters) {
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i];
      if (regExpMatch(filter.name, elementName) && regExpMatch(filter.position, elementPosition.toString())) {
        return true;
      }
    }
    return false;
  }
  return true;
}

function recurseElements(level: number, el: HTMLElement, cellData: SvgCell, cellIdMaker: CellIdMaker, additions: HTMLElement[], bespokeStateHolder: BespokeStateHolder): boolean {
  const setAttributes = function(el: HTMLElement) {

    // 'pre' is needed to honour the CRs we embed in the label whilst also ensuring text doesn't
    // wrap if the label extends beyond the bounding box. It's needed on the innermost div and text
    // elements but if applied on outer divs can result in a right-shifting of the label when the svg
    // has been formatted.
    if (cellData.cellProps.label && (innerMostDiv(el) || (el.nodeName === 'text'))) {
      el.style.whiteSpace = 'pre';
    }
    if (cellData.cellProps.link ||
      cellData.cellProps.clickActions?.highlighterSelection ||
      cellData.cellProps.clickActions?.grafanaVariables?.on) {
      el.style.cursor = 'pointer';
      el.setAttribute('cursor', 'pointer');
    }

    if (!el.id) {
      el.setAttribute('id', cellIdMaker());
    }
  }

  // Increment nodeName count
  bespokeStateHolder.elementCounts.set(el.nodeName, (bespokeStateHolder.elementCounts.get(el.nodeName) || 0) + 1);
  const elementPosition = bespokeStateHolder.elementCounts.get(el.nodeName) as number;

  if (isShapeElement(el)) {
    // Stroke color drive
    if (cellData.cellProps.strokeColor || cellData.cellProps.strokeColorCompound) {
      cellData.strokeElements.push(el);
    }
  }

  // Apply the element tree filter to determine if this can be part of the fillColor element set
  const fillColorElement = isFillColorElement(cellData.cellProps.fillColorElementFilter, el.nodeName, elementPosition);

  if (fillColorElement && isFillLevelElement(el)) {
    // The fill-level drive is achieved by cloning the original widget and then applying a
    // rectangular clip-path to the original. The clone ensures the full shape is shown whilst
    // the original gets dynamically clipped.
    if (cellData.cellProps.fillLevel?.valid) {
      const clipper = getClipper(cellData.cellProps.fillLevel, cellIdMaker, el);
      if (clipper) {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.setAttribute('fill-opacity', '0.0');
        additions.push(clipper.element);
        additions.push(clone);
        el.setAttribute('clip-path', clipper.reference);
        cellData.fillClipDrivers.push(clipper.driver);
        if (cellData.cellProps.strokeColor) {
          cellData.strokeElements.push(clone);
        }
      }
    }
  }

  // Setup the bespoke drive
  bespokeDriveHandlerFactory(level, cellData.cellIdShort, cellData.cellProps, el, bespokeStateHolder, elementPosition);

  if (el.hasChildNodes()) {
    for (let child of el.childNodes) {
      const childNode = child as HTMLElement;
      const leaf = recurseElements(level + 1, childNode, cellData, cellIdMaker, additions, bespokeStateHolder);
      setAttributes(el);
      if (leaf && (el.childNodes.length === 1) && (el.nodeName !== 'title')) {
    
        cellData.fillElements.push(el);
        const separator = cellData.cellProps.label ? cellData.cellProps.label.separator : null;
        cellData.text = generateLabelPreamble(el.textContent, separator);
      }
      else if (el.getAttribute('fill')) {
        cellData.fillElements.push(el);
      }
    }
  }
  else {
    if (el.nodeType === 1) {
      if (fillColorElement) {
        cellData.textElements.push(el);
      }
      setAttributes(el);
    }
    // return true for leaf node text elements
    return (el.nodeType === 3);
  }
  return false;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function svgInit(doc: Document, grafanaTheme: GrafanaTheme2, panelConfig: PanelConfig, siteConfig: SiteConfig, 
  ):  SvgAttribs {
  let cells = new Map<string, SvgCell>();
  const cellIdPreamble = panelConfig.cellIdPreamble;
  const namespaceState = new Map<string, ScopedState>();
  const bespokeHandlers: CellBespokeHandler[] = [];

  panelConfig.cells.forEach((cellProps, cellIdShort) => {
    const cellId = cellIdPreamble + cellIdShort;
    const cellIdMaker = cellIdFactory(cellId + panelConfig.cellIdExtender);
    let el = doc.getElementById(cellId);
    if (el) {
      const tooltip: TooltipHolder = {
        tooltipContent: '',
        usedVars: new Map<string, TooltipVar>(),
        // usedInstances: new Map<string, TooltipVariableInstance>(),
        usedInstances: [],
      }
      const cell = {
        cellIdShort: cellIdShort,
        cellId: cellId,
        strokeElements: [],
        textElements: [],
        fillElements: [],
        fillClipDrivers: [],
        text: '',
        cellProps: cellProps,
        variableThresholdScalars: new Map<string, VariableThresholdScalars[]>(),
        tooltip: tooltip,
      };
      cells.set(cellIdShort, cell);

      const additions: HTMLElement[] = [];

      const bespokeStateHolder: BespokeStateHolder = {
        namespaceState: namespaceState,
        elementCounts: new Map<string, number>(),
        handlers: bespokeHandlers,
      }
      recurseElements(1, el, cell, cellIdMaker, additions, bespokeStateHolder);
      // Now the loop of recursions is done, add in the additional elements
      for (let addition of additions) {
        el.prepend(addition);
      }

      // if tooltip is defined, build a map for known variables set in format attributes and defined elements list
      if (cellProps.tooltips) {
        if (!cellProps.tooltips.format || cellProps.tooltips.format === '' || cellProps.tooltips.format === 'default') {
          cellProps.tooltips.format = `<span style="display: block; text-align: center;">$ts</span><hr><span>value: $current</span>`;
        }
        let usedInstances= new Map<string, TooltipVariableInstance>();
        for (const match of cellProps.tooltips.format.matchAll(/\$({?([a-zA-Z_]\w*)(?:\.([a-zA-Z_]\w*))?}?)/g)) {
          // analyze var format.
          // match[1] is the pattern that we will to substitute during render.
          // match[2] is the variable name
          // match[3] if defined is the attribute name from variable to used, else pattern type is default
          
          // if instance is already in map not necessary to prepare again!
          if ( !usedInstances.get(match[1]) ) {
            // build tooltips var map or remove name not found in elements
            // check if variable name exists in element list
            if( !tooltip.usedVars.get(match[2]) ) {
              let element, found = false;
              // console.log("sgvInit(): add tooltip for ", cellIdShort, "var ", match[2], "not already defined")
              if ( ["ts", "current"].includes(match[2]) ) {
                element = undefined;
                found = true;
                // console.log("sgvInit(): add tooltip for ", cellIdShort, "var ", match[2], "is internal")
              } else if (cellProps.tooltips.newElements) {
                element = cellProps.tooltips.newElements.get(match[2]);
                if (element !== undefined) {
                  // console.log("sgvInit(): add tooltip for ", cellIdShort, "var ", match[2], "found in elements.")
                  found = true;
                } else {
                  // console.log("sgvInit(): add tooltip for ", cellIdShort, "var ", match[2], "not found: not in elements.")
                }
              } else {
                // console.log("sgvInit(): add tooltip for ", cellIdShort, "var ", match[2], "not found: no elements defined.")
              }
              if (found) {
                // console.log("sgvInit(): add tooltip for ", cellIdShort, " var:", match[2])
                let variable: TooltipVar = {
                  element: element,
                  value: undefined,
                  color: undefined,
                  ts: undefined,
                }
                tooltip.usedVars.set(match[2], variable);
              }
            }

            let instance: TooltipVariableInstance = {
              varName: match[2],
              type: "default",
              pattern: undefined,
              varString: match[1],
            }
            if (match[3] !== undefined) {
              if( ["labelColor", "label", "ts"].includes(match[3]) ) {
                instance.type = match[3] as TooltipVariableInstanceType;
              }
            }

            // Precompute pattern (use literal escape to avoid regexp injection and special chars)
            try {
              instance.pattern = new RegExp(escapeRegExp('$' + match[1]), 'g');
            } catch (e) {
              // fallback: if for some reason invalid, still store a safe pattern matching the literal
              instance.pattern = new RegExp('$' + match[1], 'g');
            }

            // console.log("sgvInit(): add tooltip for ", cellIdShort, " var instance type:", match[1], instance.type)
            usedInstances.set(match[1],instance)
          }
        }
        if (usedInstances.size >0) {
          const keys = Array.from(usedInstances.keys());
          for( const key of  keys.sort((a, b) => b.length - a.length) ) {
            const instance = usedInstances.get(key);
            if ( instance ) {
              tooltip.usedInstances.push(instance)
            }
          }
        }
      }
    }
  });
  
  // Store original cell attribs for restoration when data is null, alongside
  // other required data such as links
  let elementAttribs = new Map<string, SvgElementAttribs>();

  cells.forEach((cell, cellIdShort) => {
    const panelConfigCell = panelConfig.cells.get(cellIdShort);
    [cell.textElements, cell.fillElements].forEach((arr) => {
      arr.forEach((el) => {
        elementAttribs.set(el.id, {
          name: cellIdShort,
          dataRef: panelConfigCell?.dataRef || null,
          link: panelConfigCell?.link || null,
          clickActions: panelConfigCell?.clickActions || null,
          strokeColor: el.getAttribute('stroke'),
          fillColor: el.getAttribute('fill'),
          styleColor: el.style?.color,
          styleStrokeColor: el.style?.stroke,
          styleFillColor: el.style?.fill
        });
      });
    });
  });

  // Create the variable-scalar override set. Both Panel and Site declare the data the same way
  // so we initialise with panel first with fallback rules in site
  const variableValues = new Map<string, string>();
  variableThresholdScalarsInit(variableValues, cells, panelConfig.variableThresholdScalars);
  variableThresholdScalarsInit(variableValues, cells, siteConfig.variableThresholdScalars);
  
  // Ensure the viewBox and dimension attributes are coherent. Without this the resulting
  // image won't scale and center correctly
  const dimensions = dimensionCoherence(doc);

  // Set the SVG theme to match grafana. This ensures undriven aspects of the drawing
  // are rendered in the correct light-dark colors.
  doc.documentElement.style.colorScheme = grafanaTheme.isDark ? 'dark' : 'light';

  const svgAttribs = {
    width: dimensions.width,
    height: dimensions.height,
    scaleDrive: dimensions.scaleDrive,
    cells: cells,
    elementAttribs: elementAttribs,
    variableValues: variableValues,
    highlightFactors: panelConfig.highlighter.factors,
    bespokeHandlers: bespokeHandlers,
  };

  // Initialize the color cache and setup the background
  primeColorCache(grafanaTheme, svgAttribs, panelConfig.background);

  return svgAttribs;
} 

export type GetCellValueType = {
  value: string|number| any;
  ts: number|any;
  labels: any;
  aggregations: any;
}

export function getCellValue(
  drive: DataRefDrive | undefined,
  tsData: TimeSeriesData,
  cellBespokeData: any,
): GetCellValueType {
  // Return bespoke value if defined
  let value = null, retTs=null, labels=null, agg = null;

  if (cellBespokeData && drive?.bespokeDataRef) {
    value = cellBespokeData[drive.bespokeDataRef]?.value
    retTs = cellBespokeData[drive.bespokeDataRef]?.ts;
    labels = cellBespokeData[drive.bespokeDataRef]?.labels;
    agg = cellBespokeData[drive.bespokeDataRef]?.aggregations;
  }
  else if (drive?.dataRef) {
    const ts = tsData.ts.get(drive.dataRef);
    if (ts && (typeof ts.time.valuesIndex === 'number')) {
      value = ts.values[ts.time.valuesIndex];
      retTs = ts.time.values[ts.time.valuesIndex];
      labels = ts.labels;
      agg = ts.aggregations;          
      // lastNotNull results in a walkback till a non null value is found
      if (drive.datapoint === 'lastNotNull') {
        for (let i = ts.time.valuesIndex; i >= 0; i--) {
          value = ts.values[i];
          if (typeof value === 'number') {
            retTs = ts.time.values[i];
            break;
          }
        }
      }
    }
  }
  return { value: value, ts: retTs, labels: labels, aggregations: agg };
}

export function valueMapping(valueMappings: FlowValueMapping[], value: number | string | null) {
  for (const mapping of valueMappings) {
    if (mapping.valid) {
      let match = false;
      if (typeof mapping.value !== 'undefined') {
        match = (value === mapping.value);
      }
      else if (typeof value === 'number') {
        match =
          ((typeof mapping.valueMin === 'undefined') || (value >= mapping.valueMin)) &&
          ((typeof mapping.valueMax === 'undefined') || (value <= mapping.valueMax));
      }
      if (match) {
        return mapping.variableSubst ? getTemplateSrv().replace(mapping.text) : mapping.text;
      }
    }
  }
  return null;
}

function formatCellValue(cellLabelData: PanelConfigCellLabel, value: number) {
  const format = cellLabelData.units || 'none';
  const decimalPoints = cellLabelData.decimalPoints;
  const formatter = getValueFormatterIndex()[format];
  let res = formatter ? formattedValueToString(formatter(value, decimalPoints)) : value.toString();

  if (cellLabelData.unitsPostfix) {
    res = res.concat(" ", cellLabelData.unitsPostfix);
  }
  return res;
}

export function getFlowAnimationState(config: PanelConfigCellFlowAnimation, cellValue: number | string | null) {
  if (typeof cellValue === 'number' && config.dataCoherent) {
    const absValue = Math.abs(cellValue);
    let durationSecs = 0;

    if ((typeof config.thresholdOffValue === 'number') && (absValue <= config.thresholdOffValue)) {
      durationSecs = 0;
    }
    else if (absValue <= config.thresholdLwrValue) {
      durationSecs = config.thresholdLwrDurationSecs;
    }
    else if (absValue >= config.thresholdUprValue) {
      durationSecs = config.thresholdUprDurationSecs;
    }
    else {
      const factor = Math.pow((absValue - config.thresholdLwrValue) / (config.thresholdUprValue - config.thresholdLwrValue), config.biasPower);
      const periodDelta = (config.thresholdLwrDurationSecs - config.thresholdUprDurationSecs);
      durationSecs = config.thresholdUprDurationSecs + ((1 - factor) * periodDelta);
    }
    return {
      durationSecs: durationSecs,
      direction: (cellValue >= 0) || config.unidirectional ? 'normal' : 'reverse',
    }
  }
  return {
    durationSecs: 0,
    direction: 'normal',
  }
}

function setStrokeAttribute(el: HTMLElement, color: string | null | undefined, elAttribs: SvgElementAttribs | undefined) {
  // Drive color via the theme agnostic attribute
  if (color) {
    el.style.stroke = "";
    el.setAttribute('stroke', color);
  }
  else {
    el.style.stroke = elAttribs?.styleStrokeColor || "";
    if (elAttribs?.strokeColor) {
      el.setAttribute('stroke', elAttribs.strokeColor);
    }
    else {
      el.removeAttribute('stroke');
    }
  }
}

function setFillAttribute(el: HTMLElement, color: string | null | undefined, elAttribs: SvgElementAttribs | undefined) {
  // Drive color via the theme agnostic attribute
  if (color) {
    el.style.fill = "";
    el.setAttribute('fill', color);
  }
  else {
    el.style.fill = elAttribs?.styleFillColor || "";
    if (elAttribs?.fillColor) {
      el.setAttribute('fill', elAttribs.fillColor);
    }
    else {
      el.removeAttribute('fill');
    }
  }
}

function setFlowAnimationAttributes(el: HTMLElement, state: FlowAnimationState) {
  el.style.animationDuration = state.durationSecs.toString() + 's';
  el.style.animationDirection = state.direction;
}

type SvgDriveBase = {
  variableValues: Map<string, string>,
  tsData: TimeSeriesData,
  cellData: SvgCell,
  highlight: HighlightState,
  highlightFactors: HighlightFactors,
};

// This function sources the dataRef from the inner paramData and scales it using
// the variables to a threshold seed. If it doesn't exist it returns the passed in
// default.
function thresholdSeed(sdb: SvgDriveBase,
  paramData: PanelConfigCellColor | PanelConfigCellFillLevel | PanelConfigCellFlowAnimation | undefined,
  defaultSeed: number | string | null,
  bespokeData: any) {
  if (paramData?.dataRef || paramData?.bespokeDataRef) {
    const cellValue = getCellValue(paramData, sdb.tsData, bespokeData)?.value;
    return variableThresholdScaleValue(sdb.variableValues, sdb.cellData, cellValue);
  }
  else {
    return paramData ? defaultSeed : null;
  }
}

function getThresholdColor(sdb: SvgDriveBase,
  cellValueSeed: string | number | null,
  configCellColor: PanelConfigCellColor | undefined,
  bespokeData: any) {
  const colorSeed = thresholdSeed(sdb, configCellColor, cellValueSeed, bespokeData);
  const thresholdColor = configCellColor && (colorSeed !== null) ? getColor(configCellColor, colorSeed, sdb.highlight, sdb.highlightFactors) : null;
  return thresholdColor;
}

function getThresholdColorCompound(sdb: SvgDriveBase,
  cellValueSeed: string | number | null,
  configCellColorCompound: PanelConfigCellColorCompound,
  bespokeData: any) {
  const chooseSecond = configCellColorCompound.function === 'min' ?
    (first: number, second: number) => second <= first:
    (first: number, second: number) => second >= first; // default is 'max'

  let compound: any = undefined;
  configCellColorCompound.colors.forEach((configCellColor) => {
    const thresholdColor = getThresholdColor(sdb, cellValueSeed, configCellColor, bespokeData);
    if (thresholdColor) {
      compound = compound && chooseSecond(thresholdColor.order, compound.order) ? compound : thresholdColor;
    }
  })
  return compound;
}

export function svgUpdate(
    svgHolder: SvgHolder, 
    tsData: TimeSeriesData, 
    highlighterSelection: string | undefined, 
    animationsEnabled: boolean,
    setTooltipContent: React.Dispatch<React.SetStateAction<string | React.JSX.Element>> | null,
    tooltipContentRef: React.MutableRefObject<string>,
    tooltipElementIdRef: React.MutableRefObject<string>,
  ) {
  const variableValues = svgHolder.attribs.variableValues;
  const elementAttribs = svgHolder.attribs.elementAttribs;
  const highlightFactors = svgHolder.attribs.highlightFactors;

  // Bespoke Attribute Drive
  const namespacedData = attribDriverManager(svgHolder.attribs.bespokeHandlers, tsData, highlighterSelection);

  const cells = svgHolder.attribs.cells;
  cells.forEach((cellData, cellId) => {
    const highlight = highlightState(highlighterSelection, cellData.cellProps.tags)
    const sdb: SvgDriveBase = {
      variableValues: variableValues,
      tsData: tsData,
      highlightFactors: highlightFactors,
      cellData: cellData,
      highlight: highlight,
    };
    const cellBespokeData = getBespokeData(cellId, cellData.cellProps, namespacedData);
    
    const currentValue = getCellValue(cellData.cellProps, tsData, cellBespokeData)
    const cellValue = currentValue.value;
    const cellValueSeed = variableThresholdScaleValue(variableValues, cellData, cellValue);

    const cellLabelData = cellData.cellProps.label;
    const currentValueInner = getCellValue(cellLabelData, tsData, cellBespokeData);
    const cellLabelValueInner = currentValueInner.value;
    const cellLabelValue = cellLabelValueInner !== null ? cellLabelValueInner : cellValue;
    const cellLabelMappedValue = cellLabelData?.valueMappings ? valueMapping(cellLabelData.valueMappings, cellLabelValue) : null;
    const cellLabel = cellLabelMappedValue || (cellLabelData && (typeof cellLabelValue === 'number') ? formatCellValue(cellLabelData, cellLabelValue) : cellLabelValue);

    const cellStrokeColor = cellData.cellProps.strokeColorCompound
      ? getThresholdColorCompound(sdb, cellValueSeed, cellData.cellProps.strokeColorCompound, cellBespokeData)
      : getThresholdColor(sdb, cellValueSeed, cellData.cellProps.strokeColor, cellBespokeData);

    const cellFillColor = cellData.cellProps.fillColorCompound
      ? getThresholdColorCompound(sdb, cellValueSeed, cellData.cellProps.fillColorCompound, cellBespokeData)
      : getThresholdColor(sdb, cellValueSeed, cellData.cellProps.fillColor, cellBespokeData);

    const cellLabelColor = cellData.cellProps.labelColorCompound
      ? getThresholdColorCompound(sdb, cellValueSeed, cellData.cellProps.labelColorCompound, cellBespokeData)
      : getThresholdColor(sdb, cellValueSeed, cellData.cellProps.labelColor, cellBespokeData);

    const cellFillLevelData = cellData.cellProps.fillLevel;
    const cellFillLevelSeed = thresholdSeed(sdb, cellFillLevelData, cellValueSeed, cellBespokeData);

    const cellFlowAnimData = cellData.cellProps.flowAnimation;
    const cellFlowAnimSeed = thresholdSeed(sdb, cellFlowAnimData, cellValueSeed, cellBespokeData);
    const cellFlowAnimState = cellFlowAnimData ? getFlowAnimationState(cellFlowAnimData, animationsEnabled ? cellFlowAnimSeed : null ) : null;

    // Update fill elements/text elements: cache often used values locally
    const labelValueForReplace = cellData.text + (cellLabel ?? '');

    if ((cellData.cellProps.labelColor || cellData.cellProps.labelColorCompound) && cellLabelColor) {
      // cache color string
      const labelColorStr = cellLabelColor?.color || '';
      for (const el of cellData.fillElements) {
        const elAttrib = elementAttribs.get(el.id);

        el.style.color = labelColorStr || elAttrib?.styleColor || '';
        if (cellLabelData) {
          // only replace children when value changed could be added later
          el.replaceChildren(document.createTextNode(labelValueForReplace));
        }
      }
    } else {
      // no label color handling but still set text if required
      for (const el of cellData.fillElements) {
        if (cellLabelData) {
          el.replaceChildren(document.createTextNode(labelValueForReplace));
      }
      }
    }

    if (cellData.cellProps.strokeColor || cellData.cellProps.strokeColorCompound) {
      cellData.strokeElements.forEach((el: HTMLElement) => {
        setStrokeAttribute(el, cellStrokeColor?.color, elementAttribs.get(el.id));
      });
    }
    if (cellData.cellProps.fillColor || cellData.cellProps.fillColorCompound) {
      cellData.fillElements.forEach((el: HTMLElement) => {
        setFillAttribute(el, cellFillColor?.color, elementAttribs.get(el.id));
      });
      cellData.textElements.forEach((el: HTMLElement) => {
        setFillAttribute(el, cellFillColor?.color, elementAttribs.get(el.id));
      });
    }

    // fill level clipping
    if (cellFillLevelData) {
      cellData.fillClipDrivers.forEach((fillClipDriver) => {
        fillClipDriver(cellFillLevelSeed);
      });
    }

    // flow animation
    if (cellFlowAnimState) {
      cellData.textElements.forEach((el: HTMLElement) => {
        setFlowAnimationAttributes(el, cellFlowAnimState);
      });
    }

    // ---- Tooltip handling (heavy, so keep it compact & safe) ----
    if (cellData.cellProps.tooltips && cellData.cellProps.tooltips.format) {
      // get format line end trimmed
      let content = cellData.cellProps.tooltips.format.replace(/\s*\r?\n\s*/g, '');

      // 1) update usedVars values
      for (const [varKey, element] of cellData.tooltip.usedVars) {
        // console.log('svgUpdate(): for ',  cellId, 'update var values key:',key, 'element:', element, "content:", content);
        switch (varKey) {
          case "ts":
            const formater = getValueFormatterIndex()['dateTimeAsSystem'];
            element.value = formater(currentValue?.ts, 0, 0, "").text;
            break;
          case "current":
            element.value = cellLabel;
            element.color = cellLabelColor?.color || null;
            break;
          default:
            let cellTooltipValueSeed: any = null;
            if(element.element?.label) {
              const cellTooltipsData = element.element.label;
              const cellTooltipsValueInner = getCellValue(cellTooltipsData, tsData, cellBespokeData);
              const cellTooltipsValue = cellTooltipsValueInner?.value !== null ? cellTooltipsValueInner?.value : cellValue;
              cellTooltipValueSeed = variableThresholdScaleValue(variableValues, cellData, cellTooltipsValue);
              const cellTooltipsMappedValue = cellTooltipsData?.valueMappings ? valueMapping(cellTooltipsData.valueMappings, cellTooltipsValue) : null;
              element.value = cellTooltipsMappedValue || (cellTooltipsData && (typeof cellTooltipsValue === 'number') ? formatCellValue(cellTooltipsData, cellTooltipsValue) : cellTooltipsValue);
              const formater = getValueFormatterIndex()['dateTimeAsSystem'];
              element.ts = formater(cellTooltipsValueInner?.ts, 0, 0, "").text;
            }
            if(element.element?.labelColor && cellTooltipValueSeed) {
              element.color = getThresholdColor(sdb, cellTooltipValueSeed, element.element.labelColor, cellBespokeData)?.color || null;          }
            break;
        }
      }

      // 2) replace instances — ensure we treat the key as literal (escape special chars)
      for (const instance of cellData.tooltip.usedInstances) {
        const element = cellData.tooltip.usedVars.get(instance.varName);
        // console.log('svgUpdate(): for ',  cellId, 'instance:', instance, 'element:', element, "content:", content);
        if (!element) {
          continue;
        }

        const pattern = instance.pattern ?? new RegExp(escapeRegExp(instance.varString), 'g');
        let value: string | number | any = instance.varString;

        switch (instance.type) {
          case "label":
            value = element.value ?? '';
            break;
          case "labelColor":
            value = element.color ?? '';
            break;
          case "ts":
            value = element.ts ?? '';
            break;
          default:
            value = element.value ?? '';
            if (element.color) {
              value = `<font style="color: ${element.color};">${value}</font>`
            }
            break;
        }
        // do replacement
        if (value !== '' && value !== instance.varString) {
          content = content.replace(pattern, String(value))
        }
      }

      // check change to sanitize only if necessary
      const previousSanitized = cellData.tooltip.tooltipContent;
      // const rawChanged = content !== previousSanitized;
      // const tc = tooltipConfigRef?.current;
      // console.log('svgUpdate(): for ',  cellId, //'currentId:', tc?.elementId,
      //   'content:', content, 'prev:', previousSanitized, 'rawChanged:', content !== previousSanitized);
      // sanitize result once
      if (content !== previousSanitized) {
        const sanitized = sanitize(content)

        // update tooltip holder and potentially the visible tooltip
        if ( previousSanitized !== sanitized ) {
          cellData.tooltip.tooltipContent = sanitized;

          // if( tooltipConfigRef && tooltipConfigRef.current ) {
          //   console.log('svgUpdate(): tooltipTriggerElementId:', tooltipConfigRef.current?.elementId)
          // } else {
          //   console.log('svgUpdate(): tooltipTriggerElementId:null')
          // }
          // if( !tooltipConfigRef || !tooltipConfigRef.current ) {
          //   console.log('svgUpdate(): tooltipContentRef.current:', tooltipContentRef.current, '- content:', content)
          //   return;
          // }
          // console.log('svgUpdate(): tooltipContentRef.current:', tooltipContentRef.current, '- content:', content)

          // update visible tooltip content by matching tooltipConfigRef
          const elementId = tooltipElementIdRef?.current;
          // console.log('svgUpdate() tooltip: cellId:', cellId, " - tooltipElementIdRef.current:", elementId, ' - tooltipContentRef.current:', tooltipContentRef.current)
          if (elementId && cellData.cellId === elementId && tooltipContentRef.current !== sanitized) {
            // console.log('svgUpdate: will update content for cell', cellId)
            tooltipContentRef.current = sanitized;
            setTooltipContent?.(content);
          }
        }
        // console.log('svgUpdate: tooltip.content', sanitized)
      }
    }
  });
}
