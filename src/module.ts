import { PanelPlugin } from '@grafana/data';
import { FlowOptions } from './types';
import { FlowPanel } from './components/FlowPanel';
import { DebuggingEditor } from './components/DebuggingEditor';
import {config} from '@grafana/runtime';

export const plugin = new PanelPlugin<FlowOptions>(FlowPanel).setPanelOptions((builder) => {
  const dark = config?.theme2?.isDark ?? true;
  const svgName = dark ? 'darkThemeSvg1.svg' : 'lightThemeSvg1.svg';

  return builder
  .addTextInput({
    path: 'svg',
    name: 'SVG',
    description: `This holds the SVG element or a url to the SVG element.`,
    defaultValue: 'https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/' + svgName,
    settings: {
      useTextarea: true,
      rows: 2,
    },
  })
  .addTextInput({
    path: 'panelConfig',
    name: 'Panel Config',
    description: `YAML file containing the panel config.`,
    defaultValue: 'https://raw.githubusercontent.com/andymchugh/andrewbmchugh-flow-panel/main/examples/panelConfig1.yaml',
    settings: {
      useTextarea: true,
      rows: 2,
    },
  })
  .addTextInput({
    path: 'siteConfig',
    name: 'Site Config',
    description: `YAML file containing the site config.`,
    defaultValue: '',
    settings: {
      useTextarea: true,
      rows: 2,
    },
  })
  .addBooleanSwitch({
    path: 'timeSliderEnabled',
    name: 'Time Slider',
    description: `When enabled a time-slider is added to the bottom of
    the panel to support visualization of any time point in the time range.`,
    defaultValue: true,
  })
  .addBooleanSwitch({
    path: 'testDataEnabled',
    name: 'Test Data Generation',
    description: `This enriches the grafana time series with additional test-data series that
    are used in the demonstration SVGs. It adds runtime overhead so only enable when getting
    started.`,
    defaultValue: true,
  })
  .addCustomEditor({
    category: ['Debugging'],
    id: 'debuggingCtr',
    path: 'debuggingCtr',
    name: `These buttons log relevant output to the browser console.
    Press '<CTRL><SHFT>J to view the console in Chrome.
    For details on how to use, refer to the docs.`,
    editor: DebuggingEditor,
    defaultValue: {
      timingsCtr: 0,
      colorsCtr: 0,
      mappingsCtr: 0,
      dataCtr: 0,
      displaySvgCtr: 0,
    },
  });
});
