import React, { useEffect, useState, useRef } from 'react';
import { css, cx } from '@emotion/css';
import { useStyles2, useTheme2 } from '@grafana/ui';
import { getTemplateSrv } from '@grafana/runtime';
import { GrafanaTheme2, PanelProps, toDataFrame } from '@grafana/data';
import { FlowOptions, DebuggingCtrs } from '../types';
import { configInit, Link, panelConfigFactory, PanelConfig, siteConfigFactory, SiteConfig } from 'components/Config';
import { loadSvg, loadYaml } from 'components/Loader';
import { svgInit, svgUpdate, SvgHolder } from 'components/SvgUpdater';
import { seriesExtend, seriesInterpolate , seriesTransform } from 'components/TimeSeries';
import { TimeSliderFactory } from 'components/TimeSlider';
import { displayColorsInner, displayDataInner, displayMappingsInner } from 'components/DebuggingEditor';
import { primeColorCache, appendUrlParams } from 'components/Utils';
import { addHook, sanitize } from 'dompurify';

interface Props extends PanelProps<FlowOptions> {}

// Sanitize externally defined SVG using DOMPurify. DrawIO svg's rely on
// foreignObject. In addition, the cursor changing to a pointer on mouse-over of
// cells with links, relies on foreignObject defining 'pointer-events: none'. As
// such sanitization is configured to retain these objects and put back the
// pointer-events attribute.
addHook('afterSanitizeAttributes', function(el) {
  if (el.nodeName === 'foreignObject') {
    el.setAttribute('pointer-events', 'none');
  }
});
function sanitizeSvgStr(svgStr: string) {
  return sanitize(svgStr, {ADD_TAGS: ['foreignObject']});
}

const getStyles = () => {
  return {
    wrapper: css`
      font-family: Open Sans;
      position: relative;
    `,
    svg: css`
      position: absolute;
      top: 0;
      left: 0;
    `,
    textBox: css`
      position: absolute;
      bottom: 0;
      left: 0;
      padding: 10px;
    `,
  };
};

function clickHandlerFactory(elementLinks: Map<string, Link>) {
  return (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (event.target) {
      const element = event.target as HTMLElement;
      const link = elementLinks.get(element.id);
      if (link) {
        let url = link.url;
        if (link.params === 'time') {
          const urlParams = new URLSearchParams(window.location.search);
          const from = urlParams.get('from');
          const to = urlParams.get('to');
          url = appendUrlParams(url, `?from=${from}&to=${to}`);
        }
        else if (link.params === 'all') {
          url = appendUrlParams(url, window.location.search);
        }
        window.open(getTemplateSrv().replace(url));
      }
    }
  }
}

export const FlowPanel: React.FC<Props> = ({ options, data, width, height, timeZone }) => {
  //---------------------------------------------------------------------------
  // State for 'load -> init -> update' startup phasing

  const [svgStr, setSvgStr] = useState<string | undefined>();
  const [panelConfig, setPanelConfig] = useState<PanelConfig | undefined>(undefined);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | undefined>(undefined);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [timeSliderLabel, setTimeSliderLabel] = useState<string>();
  const timeSliderScalarRef = useRef<number>(1);
  const debuggingCtrRef = useRef<DebuggingCtrs>({...options.debuggingCtr});
  const svgHolderRef = useRef<SvgHolder>();
  const clickHandlerRef = useRef<any>(null);
  const svgDocBlankRef = useRef<Document>(new DOMParser().parseFromString('<svg/>', "text/xml"));
  const grafanaTheme = useRef<GrafanaTheme2>(useTheme2());
  
  //---------------------------------------------------------------------------
  // Load config and svg

  useEffect(() => {
    svgHolderRef.current = undefined;
    setInitialized(false);
    setSvgStr(undefined);
    setPanelConfig(undefined);
    setSiteConfig(undefined);
    loadSvg(options.svg, setSvgStr);
    loadYaml(options.siteConfig, (config) => {setSiteConfig(siteConfigFactory(config))});
    loadYaml(options.panelConfig, (config) => {setPanelConfig(panelConfigFactory(config))});
  }, [options.svg, options.panelConfig, options.siteConfig]);

  //---------------------------------------------------------------------------
  // Initialise DOM and config

  useEffect(() => {
    if (svgStr && panelConfig && siteConfig) {
      configInit(siteConfig, panelConfig);

      const svgDoc = new DOMParser().parseFromString(sanitizeSvgStr(svgStr), "text/xml");
      const svgAttribs = svgInit(svgDoc, panelConfig, siteConfig);
      primeColorCache(grafanaTheme.current, svgAttribs);
      svgHolderRef.current = {
        doc: svgDoc,
        attribs: svgAttribs,
      };
      clickHandlerRef.current = clickHandlerFactory(svgAttribs.elementLinks);

      setInitialized(true);
    }
  }, [initialized, svgStr, panelConfig, siteConfig]);
  
  //---------------------------------------------------------------------------
  // Interpolate time-series data

  const templateSrv = getTemplateSrv();
  const timeMin = Number(templateSrv.replace("${__from}"));
  const timeMax = Number(templateSrv.replace("${__to}"));
  const dataFrames = data.series ? data.series.map((item) => toDataFrame(item)) : [];
  let tsData = seriesTransform(dataFrames, timeMin, timeMax);

  if (options.testDataEnabled) {
    seriesExtend(tsData, timeMin, timeMax);
  }
  
  seriesInterpolate(tsData, timeSliderScalarRef.current);

  //---------------------------------------------------------------------------
  // Debugging data exports

  useEffect(() => {
    if (svgHolderRef.current && debuggingCtrRef.current) {
      if (options.debuggingCtr.colorsCtr) {
        if (options.debuggingCtr.colorsCtr !== debuggingCtrRef.current.colorsCtr) {
          debuggingCtrRef.current.colorsCtr = options.debuggingCtr.colorsCtr;
          displayColorsInner(grafanaTheme.current.visualization.hues);
        }
      }

      if (options.debuggingCtr.mappingsCtr && panelConfig) {
        if (options.debuggingCtr.mappingsCtr !== debuggingCtrRef.current.mappingsCtr) {
          debuggingCtrRef.current.mappingsCtr = options.debuggingCtr.mappingsCtr;
          displayMappingsInner(panelConfig, svgHolderRef.current);
        }
      }

      if (options.debuggingCtr.dataCtr) {
        if (options.debuggingCtr.dataCtr !== debuggingCtrRef.current.dataCtr) {
          debuggingCtrRef.current.dataCtr = options.debuggingCtr.dataCtr;
          displayDataInner(data.series, tsData);
        }
      }
    }
  }, [options.debuggingCtr, data.series, tsData, panelConfig]);

  //---------------------------------------------------------------------------
  // Update the SVG Attributes with the interpolated time-series data 

  let svgHolder = svgHolderRef.current;
  if (svgHolder) {
    // Snapshot the monitored variable states
    const variableValues = svgHolder.attribs.variableValues;
    templateSrv.getVariables().forEach((variable: any) => {
      try {
        if (typeof variableValues.get(variable.id) !== 'undefined') {
          variableValues.set(variable.id, variable.current.value);
        }
      }
      catch (err) {
        console.log('Error occured accessing variable', variable, ', error =', err);
      }
    });
  
    // Update the svg with current time-series and variable settings
    svgUpdate(svgHolder, tsData);
  }
  const svgElement = (svgHolder ? svgHolder.doc : svgDocBlankRef.current).childNodes[0] as HTMLElement;

  //---------------------------------------------------------------------------
  // TimeSlider

  const styles = useStyles2(getStyles);
  const timeSliderEnabled = options.timeSliderEnabled;
  const timeSlider = TimeSliderFactory({
    styles: styles,
    enabled: options.timeSliderEnabled,
    label: timeSliderLabel,
    setLabel: setTimeSliderLabel,
    timeSliderScalarRef: timeSliderScalarRef,
    tsData: tsData,
    windowWidth: width,
    timeZone: timeZone,
  });

  //---------------------------------------------------------------------------
  // Define the canvas

  const svgAttribs = svgHolder ? svgHolder.attribs : {width: 0, height: 0};
  const svgWidth = svgAttribs.width;
  const svgHeight = svgAttribs.height;
  const timeSliderHeight = timeSliderEnabled ? 60 : 0;
  const svgViewWidth = width;
  const svgViewHeight = height - timeSliderHeight;
  const svgPaddingLeft = Math.max(0, (width - svgWidth) * 0.5);
  const svgPaddingTop = Math.max(0, (svgViewHeight - svgHeight) * 0.5);
  const svgScaleX = (svgViewWidth / svgWidth);
  const svgScaleY = (svgViewHeight / svgHeight);
  const svgScale = Math.min(svgScaleX, svgScaleY) * 0.9 * 100;

  //---------------------------------------------------------------------------
  // Create the JSX
  return (
    <div className={cx(
      styles.wrapper,
      css`
      height: ${height}px;
      width: ${width}px;
      `
      )}>
      <div className={cx(
        styles.wrapper,
        css`
        height: ${svgViewHeight}px;
        width: ${svgViewWidth}px;
        scale: ${svgScale}%;
        display: flex;
        padding-top: ${svgPaddingTop}px;
        padding-left: ${svgPaddingLeft}px;
        `
        )}
        onClick={clickHandlerRef.current}
        // The externally received svg is sanitised when read in via sanitizeSvgStr which uses
        // dompurify. We don't re-sanitize it on each rendering as we are in control of the
        // modifications being made.
        dangerouslySetInnerHTML={{__html: svgElement.outerHTML}}/>
        <hr/>
      <div>{timeSliderEnabled && timeSlider}</div>
    </div>
  );
};
