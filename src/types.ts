export type TroubleshootingCtrs = {
  colorsCtr: number;
  mappingsCtr: number;
  dataCtr: number;
};

export interface FlowOptions {
  svg: string;
  panelConfig: string;
  siteConfig: string;
  timeSliderEnabled: boolean;
  troubleshootingDataCtr: number;
  troubleshootingCtr: TroubleshootingCtrs;
  testDataEnabled: boolean;
};
