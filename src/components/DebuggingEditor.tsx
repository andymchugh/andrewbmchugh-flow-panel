import React from 'react';
import { Button } from '@grafana/ui';
import { StandardEditorProps, getValueFormats } from '@grafana/data';
import { css, cx } from '@emotion/css';
import { PanelConfig } from 'components/Config';
import { SvgHolder } from 'components/SvgUpdater';
import { TimeSeriesData } from 'components/TimeSeries';
import { flowDebug } from './Utils';

function displayDocs() {
  window.open('https://github.com/andymchugh/andrewbmchugh-flow-panel/blob/main/src/README.md');
}

function displayUnits() {
  flowDebug().info(`Debugging TimeSeries Unit Map of Category -> Subcategory -> {text, value}
  where 'text' is the unit displayed and 'value' is the 'id' you enter in the yaml config.`,
  getValueFormats());
}

function displayData(context: any, onChange: any) {
  const ctrs = {...context.options.debuggingCtr};
  ctrs.dataCtr = (ctrs.dataCtr || 0) + 1;
  onChange(ctrs);
}

export function displayDataInner(rawSeries: any, tsData: TimeSeriesData) {
  flowDebug().info('Debugging Data enriched:', tsData);
  flowDebug().info('Debugging Data raw:', rawSeries);
}

function displayMappings(context: any, onChange: any) {
  const ctrs = {...context.options.debuggingCtr};
  ctrs.mappingsCtr = (ctrs.mappingsCtr || 0) + 1;
  onChange(ctrs);
}

export function displayMappingsInner(panelConfig: PanelConfig, svgHolder: SvgHolder) {
  // Get the set of svgIds that exist in the svg
  let unmappedSvgIds = new Set<string>();
  const innerMappedIdRegExp = new RegExp('.*' + panelConfig.cellIdExtender + '.*');
  const elements = svgHolder.doc.querySelectorAll('*[id]:not([id=""])');
  Array.prototype.forEach.call( elements, function( el, i ) {
    if (el.id.search(innerMappedIdRegExp) < 0) {
      unmappedSvgIds.add(el.id);
    }
  });

  let unmappedConfigIds = new Set<string>();
  panelConfig.cells.forEach((_, cellId) => {
    if (!svgHolder.attribs.cells.get(cellId)) {
      unmappedConfigIds.add(cellId);
    }
  });

  let abstract: any[] = [];
  svgHolder.attribs.cells.forEach((v, k) => {
    abstract.push(`id=${k}, svgCellId=${v.cellId}, dataRef=${v.cellProps.dataRef}`);
    unmappedSvgIds.delete(v.cellId);
  });

  flowDebug().info('Debugging Mappings: abstract:', abstract);
  flowDebug().info('Debugging Mappings: verbose:', svgHolder.attribs);
  flowDebug().info('Debugging Mappings: unmapped config ids:', unmappedConfigIds);
  flowDebug().info('Debugging Mappings: unmapped svg ids:', unmappedSvgIds);
}

function displayTimings(context: any, onChange: any) {
  const ctrs = {...context.options.debuggingCtr};
  ctrs.timingsCtr = (ctrs.timingsCtr || 0) + 1;
  onChange(ctrs);
}

function displayColors(context: any, onChange: any) {
  const ctrs = {...context.options.debuggingCtr};
  ctrs.colorsCtr = (ctrs.colorsCtr || 0) + 1;
  onChange(ctrs);
}

export function displayColorsInner(colors: any) {
  flowDebug().info('Debugging Colors:', colors);
}

function displaySvg(context: any, onChange: any) {
  const ctrs = {...context.options.debuggingCtr};
  ctrs.displaySvgCtr = (ctrs.displaySvgCtr || 0) + 1;
  onChange(ctrs);
}

export function displaySvgInner(svgStr: string) {
  flowDebug().info('Debugging svg:', svgStr);
}

export const DebuggingEditor = ({context, onChange}: StandardEditorProps<number>) => {
  return <div>
    <div className={cx(
      css`
      display: flex;
      gap: 5px;
    `
      )}>
      <Button onClick={() => displayDocs()}>Docs</Button>
      <Button onClick={() => displayMappings(context, onChange)}>Mappings</Button>
      <Button onClick={() => displayData(context, onChange)}>Data</Button>
    </div>
    <div className={cx(
      css`
      display: flex;
      gap: 5px;
      margin-top: 5px;
      `
      )}>
      <Button onClick={() => displayUnits()}>Units</Button>
      <Button onClick={() => displayColors(context, onChange)}>Colors</Button>
      <Button onClick={() => displaySvg(context, onChange)}>SVG</Button>
      <Button onClick={() => displayTimings(context, onChange)}>Timings</Button>
    </div>
  </div>
};

