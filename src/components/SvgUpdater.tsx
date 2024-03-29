import { getValueFormatterIndex, formattedValueToString } from '@grafana/data';
import { 
   LabelSeparator, Link,
   PanelConfig, PanelConfigCell, PanelConfigCellColor, PanelConfigCellLabel,
   SiteConfig, VariableThresholdScalars } from 'components/Config';
import { TimeSeriesData } from 'components/TimeSeries';
import {
   cellIdFactory, CellIdMaker, getColor,
   variableThresholdScalarsInit, variableThresholdScaleValue } from 'components/Utils';

// Defines the metadata stored against each drivable svg cell
export type SvgCell = {
  cellId: string;
  textElements: HTMLElement[];
  fillElements: HTMLElement[];
  text: string;
  cellProps: PanelConfigCell;
  variableThresholdScalars: Map<string, VariableThresholdScalars[]>;
};

export type SvgAttribs = {
  width: number;
  height: number;
  scaleDrive: boolean;
  cells: Map<string, SvgCell>;
  elementLinks: Map<string, Link>;
  variableValues: Map<string, string>;
}

export type SvgHolder = {
  doc: Document;
  attribs: SvgAttribs;
}

function generateLabelPreamble(label: string | null, separator: LabelSeparator | null) {
  label = (label || '').trim();
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

function recurseElements(el: HTMLElement, cellData: SvgCell, cellIdMaker: CellIdMaker): boolean {
  const setAttributes = function(el: HTMLElement) {
    el.style.whiteSpace = 'pre';

    if (cellData.cellProps.link) {
      el.style.cursor = 'pointer';
      el.setAttribute('cursor', 'pointer');
    }

    if (!el.id) {
      el.setAttribute('id', cellIdMaker());
    }
  }

  if (el.hasChildNodes()) {
    for (let childNode of el.childNodes) {
      let leaf = recurseElements(childNode as HTMLElement, cellData, cellIdMaker);
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
    return true;
  }
  return false;
}

export function svgInit(doc: Document, panelConfig: PanelConfig, siteConfig: SiteConfig):  SvgAttribs {
  let cells = new Map<string, SvgCell>();
  const cellIdPreamble = panelConfig.cellIdPreamble;
  panelConfig.cells.forEach((cellProps, cellIdShort) => {
    const cellId = cellIdPreamble + cellIdShort;
    const cellIdMaker = cellIdFactory(cellId + panelConfig.cellIdExtender);
    let el = doc.getElementById(cellId);
    if (el) {
      const cell = {
        cellId: cellId,
        textElements: [],
        fillElements: [],
        text: '',
        cellProps: cellProps,
        variableThresholdScalars: new Map<string, VariableThresholdScalars[]>(),
      };
      cells.set(cellIdShort, cell);
      recurseElements(el, cell, cellIdMaker);
    }
  });
  
  // Create the overall call->link map
  let elementLinks = new Map<string, Link>();
  cells.forEach((cell, cellIdShort) => {
    const panelConfigCell = panelConfig.cells.get(cellIdShort);
    const link = panelConfigCell ? panelConfigCell.link : null;
    if (link) {
      cell.textElements.forEach((el) => {
        elementLinks.set(el.id, link);
      });
      cell.fillElements.forEach((el) => {
        elementLinks.set(el.id, link);
      });
    }
  });

  // Create the variable-scalar override set. Both Panel and Site declare the data the same way
  // so we initialise with panel first with fallback rules in site
  const variableValues = new Map<string, string>();
  variableThresholdScalarsInit(variableValues, cells, panelConfig.variableThresholdScalars);
  variableThresholdScalarsInit(variableValues, cells, siteConfig.variableThresholdScalars);
  
  // Ensure the viewBox and dimension attributes are coherent. Without this the resulting
  // image won't scale and center corrently
  let dimensions = dimensionCoherence(doc);

  return {
    width: dimensions.width,
    height: dimensions.height,
    scaleDrive: dimensions.scaleDrive,
    cells: cells,
    elementLinks: elementLinks,
    variableValues: variableValues,
  };
} 

function getCellValue(tsName: string, tsData: TimeSeriesData) {
  let value = null;
  const ts = tsData.ts.get(tsName);
  if (ts && (typeof ts.time.valuesIndex === 'number')) {
    value = ts.values[ts.time.valuesIndex];
  }
  return value;
}

function formatCellValue(cellLabelData: PanelConfigCellLabel, value: number) {
  const format = cellLabelData.units || 'none';
  const decimalPoints = cellLabelData.decimalPoints;
  const formatter = getValueFormatterIndex()[format];
  if (formatter) {
    return formattedValueToString(formatter(value, decimalPoints));
  }
  else {
    return value.toString();
  }
}

export function svgUpdate(svgHolder: SvgHolder, tsData: TimeSeriesData) {
  const variableValues = svgHolder.attribs.variableValues;
  const cells = svgHolder.attribs.cells;
  cells.forEach((cellData) => {

    // This function sources the dataRef from the inner paramData and scales it using
    // the variables to a threshold seed. If it doesn't exist it returns the passed in
    // default.
    function thresholdSeed(paramData: PanelConfigCellColor | undefined, defaultSeed: number | null) {
      if (paramData?.dataRef) {
        const cellValue = getCellValue(paramData.dataRef, tsData);
        return variableThresholdScaleValue(variableValues, cellData, cellValue);
      }
      else {
        return paramData ? defaultSeed : null;
      }
    }
    const cellDataRef = cellData.cellProps.dataRef;
    const cellValue = cellDataRef ? getCellValue(cellDataRef, tsData) : null;
    const cellValueSeed = variableThresholdScaleValue(variableValues, cellData, cellValue);

    const cellLabelData = cellData.cellProps.label;
    const cellLabelValue = cellLabelData?.dataRef ? getCellValue(cellLabelData.dataRef, tsData) : cellValue;
    const cellLabel = cellLabelData && (typeof cellLabelValue === 'number') ? formatCellValue(cellLabelData, cellLabelValue) : null;

    const cellFillColorData = cellData.cellProps.fillColor;
    const cellFillColorSeed = thresholdSeed(cellFillColorData, cellValueSeed);
    const cellFillColor = cellFillColorData && (typeof cellFillColorSeed === 'number') ? getColor(cellFillColorData, cellFillColorSeed) : null;

    const cellLabelColorData = cellData.cellProps.labelColor;
    const cellLabelColorSeed = thresholdSeed(cellLabelColorData, cellValueSeed);
    const cellLabelColor = cellLabelColorData && (typeof cellLabelColorSeed === 'number') ? getColor(cellLabelColorData, cellLabelColorSeed) : null;

    cellData.fillElements.forEach((el: HTMLElement) => {
      if (cellFillColorData) {
        el.setAttribute('fill', cellFillColor || '');
      }
      if (cellLabelColorData) {
        el.style.color = cellLabelColor || '';
      }
      if (cellLabelData) {
        el.replaceChildren(cellData.text + (cellLabel || ''));
      }
    });
    if (cellFillColorData) {
      cellData.textElements.forEach((el: HTMLElement) => {
        el.setAttribute('fill', cellFillColor || '');
      });
    }
  });
}
