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
import { displayColorsInner, displayDataInner, displayMappingsInner, displaySvgInner } from 'components/DebuggingEditor';
import { appendUrlParams, getInstrumenter } from 'components/Utils';
import { addHook, sanitize } from 'dompurify';

interface Props extends PanelProps<FlowOptions> {}

//-----------------------------------------------------------------------------
// Sanitize externally defined SVG using DOMPurify. DrawIO svg's rely on
// foreignObject. In addition, the cursor changing to a pointer on mouse-over of
// cells with links, relies on foreignObject defining 'pointer-events: none'. As
// such sanitization is configured to retain these objects and put back the
// pointer-events attribute. Note the parser-media-type matters in particular corners
// such as use of line breaks (<br/> in text blocks, but has the side effect of removing
// the viewBox that has to be put back for correct scaling.
let viewBox: string | null = null;

addHook('uponSanitizeAttribute', function(el) {
  if (el.nodeName === 'svg') {
    viewBox = el.getAttribute('viewBox');
  }
});

addHook('afterSanitizeAttributes', function(el) {
  if (el.nodeName === 'foreignObject') {
    el.setAttribute('pointer-events', 'none');
  }
  if (el.nodeName === 'svg' && viewBox) {
    el.setAttribute('viewBox', viewBox);
  }
});

function sanitizeSvgStr(svgStr: string) {
  return sanitize(svgStr, {
    PARSER_MEDIA_TYPE: 'application/xhtml+xml',
    ADD_TAGS: ['foreignObject'],
    ADD_ATTR: ['viewBox'],
  });
}

//-----------------------------------------------------------------------------

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
          const phrase = from && to ? `?from=${from}&to=${to}` :
            from ? `?from=${from}` :
            to ? `?to=${to}` : '';
          url = appendUrlParams(url, phrase);
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
      const svgAttribs = svgInit(svgDoc, grafanaTheme.current, panelConfig, siteConfig);
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

  const timingsEnabled = (typeof options.debuggingCtr.timingsCtr === 'number') &&
    (options.debuggingCtr.timingsCtr !== debuggingCtrRef.current.timingsCtr);
  const instrument = getInstrumenter(timingsEnabled);
  const templateSrv = getTemplateSrv();
  const timeMin = Number(templateSrv.replace("${__from}"));
  const timeMax = Number(templateSrv.replace("${__to}"));

  const dataConverter = function(arr: any[]) { return arr.map((item: any) => toDataFrame(item)) };
  const dataFrames = instrument('toDataFrame', dataConverter)(data.series || []);
  let tsData = instrument('transform', seriesTransform)(dataFrames, timeMin, timeMax);

  if (options.testDataEnabled) {
    instrument('seriesExtend', seriesExtend)(tsData, timeMin, timeMax);
  }
  
  instrument('seriesInterpolate', seriesInterpolate)(tsData, timeSliderScalarRef.current);

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
    instrument('svgUpdate', svgUpdate)(svgHolder, tsData);
  }
  const svgElement = (svgHolder ? svgHolder.doc : svgDocBlankRef.current).childNodes[0] as HTMLElement;

  //---------------------------------------------------------------------------
  // Debugging data exports

  useEffect(() => {
    if (svgHolderRef.current && debuggingCtrRef.current) {
      if (options.debuggingCtr.timingsCtr) {
        if (options.debuggingCtr.timingsCtr !== debuggingCtrRef.current.timingsCtr) {
          // The ctr delta was detected upstream and the timings enabled for this pass
          // via the instrument function. Here we just reset the timers.
          debuggingCtrRef.current.timingsCtr = options.debuggingCtr.timingsCtr;
        }
      }

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
      if (options.debuggingCtr.displaySvgCtr) {
        if (options.debuggingCtr.displaySvgCtr !== debuggingCtrRef.current.displaySvgCtr) {
          debuggingCtrRef.current.displaySvgCtr = options.debuggingCtr.displaySvgCtr;
          displaySvgInner(svgElement.outerHTML);
        }
      }
    }
  }, [options.debuggingCtr, data.series, tsData, svgElement.outerHTML, panelConfig]);

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

  const svgAttribs = svgHolder ? svgHolder.attribs : {width: 0, height: 0, scaleDrive: false};
  const svgWidth = svgAttribs.width;
  const svgHeight = svgAttribs.height;
  const timeSliderHeight = timeSliderEnabled ? 60 : 0;
  const svgViewWidth = width;
  const svgViewHeight = height - timeSliderHeight;
  const svgPaddingLeft = Math.max(0, (width - svgWidth) * 0.5);
  const svgPaddingTop = Math.max(0, (svgViewHeight - svgHeight) * 0.5);
  const svgScaleX = Math.max(1.0, (svgViewWidth / svgWidth));
  const svgScaleY = (svgViewHeight / svgHeight);
  const svgScale = svgAttribs.scaleDrive ? Math.min(svgScaleX, svgScaleY) * 0.9 * 100 : 100;

  //---------------------------------------------------------------------------
  // Create the JSX
  const jsx = instrument('createJsx', () => (
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
        // The externally received svg is sanitized when read in via sanitizeSvgStr which uses
        // dompurify. We don't re-sanitize it on each rendering as we are in control of the
        // modifications being made.
        dangerouslySetInnerHTML={{__html: svgElement.outerHTML}}/>
        <hr/>
      <div>{timeSliderEnabled && timeSlider}</div>
    </div>
  ))();
  return jsx;
};
