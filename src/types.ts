export type DebuggingCtrs = {
  colorsCtr: number;
  mappingsCtr: number;
  dataCtr: number;
  displaySvgCtr: number;
};

export interface FlowOptions {
  svg: string;
  panelConfig: string;
  siteConfig: string;
  timeSliderEnabled: boolean;
  debuggingCtr: DebuggingCtrs;
  testDataEnabled: boolean;
};
