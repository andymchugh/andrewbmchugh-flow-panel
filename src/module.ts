import { PanelPlugin } from '@grafana/data';
import { FlowOptions } from './types';
import { FlowPanel } from './components/FlowPanel';
import { DebuggingEditor } from './components/DebuggingEditor';

export const plugin = new PanelPlugin<FlowOptions>(FlowPanel).setPanelOptions((builder) => {
  const svgName = 'ambiThemeSvg1.svg';

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
    path: 'panZoomEnabled',
    name: 'Pan / Zoom Enabled',
    description: `When enabled the scroll wheel allows you to zoom and click-drag allows
    you to pan. Double-Click to reset zoom to normal. Note the scroll wheel can be configured
    to need additional keys such as 'Alt' to separate panel zoom from dashboard scroll. Check
    in the site and panel yaml under zoomPanPinch.wheelActivationKeys.`,
    defaultValue: true,
  })
  .addBooleanSwitch({
    path: 'animationsEnabled',
    name: 'Animations Enabled',
    description: `This defines the initial state of animations controlled via yaml data. The actual
    state is dynamically settable from the play/pause button in the bottom left corner of the
    panel. The button is only visible if animations have been defined in the yaml data.`,
    defaultValue: true,
  })
  .addBooleanSwitch({
    path: 'animationControlEnabled',
    name: 'Animation Control Enabled',
    description: `This defines whether the pause/play animation control is shown in the
    bottom left corner of the panel. The button is only visible if animations have also been
    defined in the yaml data.`,
    defaultValue: true,
  })
  .addBooleanSwitch({
    path: 'highlighterEnabled',
    name: 'Highlighter',
    description: `When enabled a highlighting bar is added below the SVG. Widgets on the
    SVG have optional tags defined in the yaml and the highlighter allows you to bring
    a thread of information to the front.`,
    defaultValue: true,
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
