export type DebuggingCtrs = {
  timingsCtr: number;
  colorsCtr: number;
  mappingsCtr: number;
  dataCtr: number;
  displaySvgCtr: number;
};

export interface FlowOptions {
  svg: string;
  panelConfig: string;
  siteConfig: string;
  highlighterEnabled: boolean;
  timeSliderEnabled: boolean;
  debuggingCtr: DebuggingCtrs;
  testDataEnabled: boolean;
};
