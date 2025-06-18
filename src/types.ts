export type DebuggingCtrs = {
  timingsCtr: number;
  colorsCtr: number;
  mappingsCtr: number;
  dataCtr: number;
  displaySvgCtr: number;
};

export type TimeSliderMode = 'local' | 'time' | 'position';

export interface FlowOptions {
  svg: string;
  svgHeaders: string;
  panelConfig: string;
  panelConfigHeaders: string;
  siteConfig: string;
  panZoomEnabled: boolean;
  animationsEnabled: boolean;
  animationControlEnabled: boolean;
  highlighterEnabled: boolean;
  highlighterSelection: string;
  timeSliderEnabled: boolean;
  timeSliderMode: TimeSliderMode;
  debuggingCtr: DebuggingCtrs;
  testDataEnabled: boolean;
};
