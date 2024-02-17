export type ColorGradientMode = 'none' | 'hue';
export type LabelSeparator = 'cr' | 'colon' | 'space' | 'replace';
export type LinkUrlParams = 'none' | 'time' | 'all';

export type VariableThresholdScalars = {
  variableValuePattern: string;
  thresholdScalar: number;
  cellIdPatternScope: string[];
};

export type Threshold = {
  color: string;
  level: number;
};

export type Link = {
  url: string;
  params: LinkUrlParams;
};

export type PanelConfigCellLabel = {
  dataRef: string | undefined;
  separator: LabelSeparator;
  units: string;
  decimalPoints: number;
}

export type PanelConfigCellColor = {
  dataRef: string | undefined;
  gradientMode: ColorGradientMode | undefined;
  thresholdsRef: string | undefined;
  thresholds: Threshold[] | undefined;
}

export type PanelConfigCell = {
  dataRef: string | undefined;
  linkRef: string | undefined;
  link: Link | undefined;
  label: PanelConfigCellLabel | undefined;
  labelColor: PanelConfigCellColor | undefined;
  fillColor: PanelConfigCellColor | undefined;
};

export type SiteConfig = {
  variableThresholdScalars: Map<string, VariableThresholdScalars[]>;
  links: Map<string, Link>;
  colors: Map<string, string>;
  thresholds: Map<string, Threshold[]>;
};

export type PanelConfig = {
  variableThresholdScalars: Map<string, VariableThresholdScalars[]>;
  gradientMode: ColorGradientMode;
  cellIdPreamble: string;
  cellIdExtender: string;
  cells: Map<string, PanelConfigCell>;
};

export function panelConfigFactory(config: any) {
  config = config || {};
  return {
    variableThresholdScalars: new Map<string, VariableThresholdScalars[]>(Object.entries(config.variableThresholdScalars || {})),
    gradientMode: config.gradientMode || 'none',
    cellIdPreamble: config.cellIdPreamble || '',
    cellIdExtender: config.cellIdExtender || '@flowrpt',
    cells: new Map<string, Object>(Object.entries(config.cells || {})),
  } as PanelConfig;
}

export function siteConfigFactory(config: any) {
  config = config || {};
  return {
    links: new Map<string, Link>(Object.entries(config.links || {})),
    colors: new Map<string, string>(Object.entries(config.colors || {})),
    variableThresholdScalars: new Map<string, VariableThresholdScalars[]>(Object.entries(config.variableThresholdScalars || {})),
    thresholds: new Map<string, Threshold[]>(Object.entries(config.thresholds || {})),
  } as SiteConfig;
}

function siteConfigDereference(siteConfig: SiteConfig) {
  siteConfig.thresholds.forEach((thresholds) => {
    thresholds.forEach(function(threshold: Threshold) {
      threshold.color = siteConfig.colors.get(threshold.color) || threshold.color;
    });
  });
}

function panelConfigDereference(siteConfig: SiteConfig, panelConfig: PanelConfig) {
  function colorDeref(color: PanelConfigCellColor | undefined) {
    if (color) {
      color.gradientMode = color.gradientMode || panelConfig.gradientMode;
      if (color.thresholds) {
        color.thresholds.forEach(function(threshold) {
          threshold.color = siteConfig.colors.get(threshold.color) || threshold.color;
        });
      }
      if (!color.thresholds && color.thresholdsRef) {
        color.thresholds = siteConfig.thresholds.get(color.thresholdsRef);
      }
    }
  }

  panelConfig.cells.forEach((cell) => {
    colorDeref(cell.labelColor);
    colorDeref(cell.fillColor);

    if (!cell.link && cell.linkRef) {
      cell.link = siteConfig.links.get(cell.linkRef);
    }
  });
}

export function configInit(siteConfig: SiteConfig, panelConfig: PanelConfig) {
  siteConfigDereference(siteConfig);
  panelConfigDereference(siteConfig, panelConfig);
}
