import { getValueFormatterIndex, formattedValueToString, GrafanaTheme2 } from '@grafana/data';
import { 
  DataRefDrive,
  FlowValueMapping, HighlightFactors,
  LabelSeparator, Link,
  PanelConfig, PanelConfigCell, PanelConfigCellColor,
  PanelConfigCellColorCompound,
  PanelConfigCellFillLevel, PanelConfigCellFlowAnimation, PanelConfigCellLabel,
  SiteConfig, VariableThresholdScalars } from 'components/Config';
import { TimeSeriesData } from 'components/TimeSeries';
import {
  cellIdFactory, CellIdMaker, getColor, primeColorCache,
  variableThresholdScalarsInit, variableThresholdScaleValue, isShapeElement } from 'components/Utils';
import { HighlightState } from './Highlighter';
import {
  CellFillLevelDriver, getClipper, isFillLevelElement } from 'components/FillLevel';
import { getTemplateSrv } from '@grafana/runtime';
import { attribDriverManager, bespokeDriveHandlerFactory, ScopedState, CellBespokeHandler, getBespokeData } from './bespokeDriver';

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
};

export type SvgElementAttribs = {
  name: string;
  dataRef: string | null;
  link: Link | null;
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

function recurseElements(el: HTMLElement, cellData: SvgCell, cellIdMaker: CellIdMaker, additions: HTMLElement[], bespokeStateHolder: BespokeStateHolder): boolean {
  const setAttributes = function(el: HTMLElement) {

    // 'pre' is needed to honour the CRs we embed in the label whilst also ensuring text doesn't
    // wrap if the label extends beyond the bounding box. It's needed on the innermost div and text
    // elements but if applied on outer divs can result in a right-shifting of the label when the svg
    // has been formatted.
    if (cellData.cellProps.label && (innerMostDiv(el) || (el.nodeName === 'text'))) {
      el.style.whiteSpace = 'pre';
    }
    if (cellData.cellProps.link) {
      el.style.cursor = 'pointer';
      el.setAttribute('cursor', 'pointer');
    }

    if (!el.id) {
      el.setAttribute('id', cellIdMaker());
    }
  }

  if (isShapeElement(el)) {
    // Stroke color drive
    if (cellData.cellProps.strokeColor || cellData.cellProps.strokeColorCompound) {
      cellData.strokeElements.push(el);
    }
  }

  if (isFillLevelElement(el)) {
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

  if (cellData.cellProps.bespoke) {
    bespokeDriveHandlerFactory(cellData.cellIdShort, cellData.cellProps.dataRef, el, cellData.cellProps.bespoke, bespokeStateHolder);
  }

  if (el.hasChildNodes()) {
    for (let child of el.childNodes) {
      const childNode = child as HTMLElement;
      const leaf = recurseElements(childNode, cellData, cellIdMaker, additions, bespokeStateHolder);
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
      cellData.textElements.push(el);
      setAttributes(el);
    }
    // return true for leaf node text elements
    return (el.nodeType === 3);
  }
  return false;
}

export function svgInit(doc: Document, grafanaTheme: GrafanaTheme2, panelConfig: PanelConfig, siteConfig: SiteConfig):  SvgAttribs {
  let cells = new Map<string, SvgCell>();
  const cellIdPreamble = panelConfig.cellIdPreamble;
  const namespaceState = new Map<string, ScopedState>();
  const bespokeHandlers: CellBespokeHandler[] = [];

  panelConfig.cells.forEach((cellProps, cellIdShort) => {
    const cellId = cellIdPreamble + cellIdShort;
    const cellIdMaker = cellIdFactory(cellId + panelConfig.cellIdExtender);
    let el = doc.getElementById(cellId);
    if (el) {
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
      };
      cells.set(cellIdShort, cell);

      const additions: HTMLElement[] = [];

      const bespokeStateHolder: BespokeStateHolder = {
        namespaceState: namespaceState,
        elementCounts: new Map<string, number>(),
        handlers: bespokeHandlers,
      }
      recurseElements(el, cell, cellIdMaker, additions, bespokeStateHolder);
      // Now the loop of recursions is done, add in the additional elements
      for (let addition of additions) {
        el.prepend(addition);
      }
    }
  });
  
  // Store original cell attribs for restoration when data is null, alongside
  // other required data such as links
  let elementAttribs = new Map<string, SvgElementAttribs>();

  cells.forEach((cell, cellIdShort) => {
    const panelConfigCell = panelConfig.cells.get(cellIdShort);
    const link = panelConfigCell ? panelConfigCell.link : null;
    [cell.textElements, cell.fillElements].forEach((arr) => {
      arr.forEach((el) => {
        elementAttribs.set(el.id, {
          name: cellIdShort,
          dataRef: panelConfigCell?.dataRef || null,
          link: link || null,
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
  // image won't scale and center corrently
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

  // Initialie the color cache and setup the background
  primeColorCache(grafanaTheme, svgAttribs, panelConfig.background);

  return svgAttribs;
} 

export function getCellValue(drive: DataRefDrive | undefined, tsData: TimeSeriesData, cellBespokeData: any) {
  // Return bespoke value if defined
  if (cellBespokeData && drive?.bespokeDataRef) {
    return cellBespokeData[drive.bespokeDataRef];
  }
  let value = null;
  if (drive?.dataRef) {
    const ts = tsData.ts.get(drive.dataRef);
    if (ts && (typeof ts.time.valuesIndex === 'number')) {
      value = ts.values[ts.time.valuesIndex];

      // lastNotNull results in a walkback till a non null value is found
      if (drive.datapoint === 'lastNotNull') {
        for (let i = ts.time.valuesIndex; i >= 0; i--) {
          value = ts.values[i];
          if (typeof value === 'number') {
            break;
          }
        }
      }
    }
  }
  return value;
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
    const cellValue = getCellValue(paramData, sdb.tsData, bespokeData);
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

export function svgUpdate(svgHolder: SvgHolder, tsData: TimeSeriesData, highlighterSelection: string | undefined, animationsEnabled: boolean) {
  const variableValues = svgHolder.attribs.variableValues;
  const elementAttribs = svgHolder.attribs.elementAttribs;
  const highlightFactors = svgHolder.attribs.highlightFactors;

  // Bespoke Attribute Drive
  const namespacedData = attribDriverManager(svgHolder.attribs.bespokeHandlers, tsData);

  const cells = svgHolder.attribs.cells;
  cells.forEach((cellData, cellId) => {
    const highlight = highlighterSelection && cellData.cellProps.tags?.has(highlighterSelection) ? HighlightState.Highlight : highlighterSelection ? HighlightState.Lowlight : HighlightState.Ambient;
    const sdb: SvgDriveBase = {
      variableValues: variableValues,
      tsData: tsData,
      highlightFactors: highlightFactors,
      cellData: cellData,
      highlight: highlight,
    };
    const cellBespokeData = getBespokeData(cellId, cellData.cellProps, namespacedData);
    
    const cellValue = getCellValue(cellData.cellProps, tsData, cellBespokeData);
    const cellValueSeed = variableThresholdScaleValue(variableValues, cellData, cellValue);

    const cellLabelData = cellData.cellProps.label;
    const cellLabelValueInner = getCellValue(cellLabelData, tsData, cellBespokeData);
    const cellLabelValue = cellLabelValueInner !== null ? cellLabelValueInner : cellValue;
    const cellLabelMappedValue = cellLabelData?.valueMappings ? valueMapping(cellLabelData.valueMappings, cellLabelValue) : null;
    const cellLabel = cellLabelMappedValue || (cellLabelData && (typeof cellLabelValue === 'number') ? formatCellValue(cellLabelData, cellLabelValue) : cellLabelValue);

    const cellStrokeColor = cellData.cellProps.strokeColorCompound ?
      getThresholdColorCompound(sdb, cellValueSeed, cellData.cellProps.strokeColorCompound, cellBespokeData) :
      getThresholdColor(sdb, cellValueSeed, cellData.cellProps.strokeColor, cellBespokeData);

    const cellFillColor = cellData.cellProps.fillColorCompound ?
      getThresholdColorCompound(sdb, cellValueSeed, cellData.cellProps.fillColorCompound, cellBespokeData) :
      getThresholdColor(sdb, cellValueSeed, cellData.cellProps.fillColor, cellBespokeData);

    const cellLabelColor = cellData.cellProps.labelColorCompound ?
      getThresholdColorCompound(sdb, cellValueSeed, cellData.cellProps.labelColorCompound, cellBespokeData) :
      getThresholdColor(sdb, cellValueSeed, cellData.cellProps.labelColor, cellBespokeData);

    const cellFillLevelData = cellData.cellProps.fillLevel;
    const cellFillLevelSeed = thresholdSeed(sdb, cellFillLevelData, cellValueSeed, cellBespokeData);

    const cellFlowAnimData = cellData.cellProps.flowAnimation;
    const cellFlowAnimSeed = thresholdSeed(sdb, cellFlowAnimData, cellValueSeed, cellBespokeData);
    const cellFlowAnimState = cellFlowAnimData ? getFlowAnimationState(cellFlowAnimData, animationsEnabled ? cellFlowAnimSeed : null ) : null;

    cellData.fillElements.forEach((el: HTMLElement) => {
      if (cellData.cellProps.labelColor || cellData.cellProps.labelColorCompound) {
        el.style.color = cellLabelColor?.color || elementAttribs.get(el.id)?.styleColor || '';
      }
      if (cellLabelData) {
        el.replaceChildren(cellData.text + (cellLabel || ''));
      }
    });
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
    if (cellFillLevelData) {
      cellData.fillClipDrivers.forEach((fillClipDriver) => {
        fillClipDriver(cellFillLevelSeed);
      });
    }
    if (cellFlowAnimState) {
      cellData.textElements.forEach((el: HTMLElement) => {
        setFlowAnimationAttributes(el, cellFlowAnimState);
      });
    }
  });
}
