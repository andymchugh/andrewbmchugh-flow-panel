import { createUrl } from "./Utils";

export type DatapointMode = 'last' | 'lastNotNull';
export type ColorGradientMode = 'none' | 'hue';
export type LabelSeparator = 'cr' | 'colon' | 'space' | 'replace';
export type LinkUrlParams = 'none' | 'time' | 'all';
export type FillDirection = 'bottomToTop' | 'topToBottom' | 'leftToRight' | 'rightToLeft';

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

export type Background = {
  darkThemeColor: string | undefined;
  lightThemeColor: string | undefined;
};

export type TestConfig = {
  testDataSparse: boolean | undefined;
  testDataBaseOffset: number | undefined;
  testDataExtendedZero: boolean | undefined;
  testDataStringData: boolean | undefined;
};

export type FlowValueMapping = {
  value: string | number | null | undefined;
  valueMin: number | undefined;
  valueMax: number | undefined;
  text: string;
  valid: boolean;
};

export type PanelConfigCellLabel = {
  dataRef: string | undefined;
  datapoint: DatapointMode | undefined;
  separator: LabelSeparator;
  units: string | undefined;
  unitsPostfix: string | undefined;
  decimalPoints: number | null | undefined;
  valueMappingsRef: string | undefined;
  valueMappings: FlowValueMapping[] | undefined;
};

export type PanelConfigCellColor = {
  dataRef: string | undefined;
  datapoint: DatapointMode | undefined;
  gradientMode: ColorGradientMode | undefined;
  thresholdsRef: string | undefined;
  thresholds: Threshold[] | undefined;
};

export type PanelConfigCellFillLevel = {
  dataRef: string | undefined;
  datapoint: DatapointMode | undefined;
  thresholdLwrFillPercent: number;
  thresholdUprFillPercent: number;
  thresholdOffValue: number | undefined;
  thresholdLwrValue: number;
  thresholdUprValue: number;
  fillDirection: FillDirection;
  valid: boolean;
};

export type PanelConfigCellFlowAnimation = {
  dataRef: string | undefined;
  datapoint: DatapointMode | undefined;
  thresholdOffValue: number | undefined;
  thresholdLwrValue: number;
  thresholdLwrDurationSecs: number;
  thresholdUprValue: number;
  thresholdUprDurationSecs: number;
  unidirectional: boolean;
  dataCoherent: boolean;
};

export type PanelConfigCell = {
  dataRef: string | undefined;
  datapoint: DatapointMode | undefined;
  linkRef: string | undefined;
  link: Link | undefined;
  label: PanelConfigCellLabel | undefined;
  labelColor: PanelConfigCellColor | undefined;
  fillColor: PanelConfigCellColor | undefined;
  fillLevel: PanelConfigCellFillLevel | undefined;
  flowAnimation: PanelConfigCellFlowAnimation | undefined;
  tags: Set<string> | undefined;
};

export type HighlightFactors = {
  highlightRgbFactor: number;
  lowlightAlphaFactor: number;
};

export type PanelConfigHighlighter = {
  tagDrivable: Set<string>;
  tagLegend: string[];
  color: string;
  factors: HighlightFactors;
  condensed: boolean;
};

export type SiteConfig = {
  variableThresholdScalars: Map<string, VariableThresholdScalars[]>;
  links: Map<string, Link>;
  colors: Map<string, string>;
  thresholds: Map<string, Threshold[]>;
  valueMappings: Map<string, FlowValueMapping[]>;
};

export type PanelConfig = {
  test: TestConfig;
  background: Background;
  animationsPresent: boolean;
  variableThresholdScalars: Map<string, VariableThresholdScalars[]>;
  gradientMode: ColorGradientMode;
  datapoint: DatapointMode | undefined;
  cellIdPreamble: string;
  cellIdExtender: string;
  cellLabelDecimalPoints: number | undefined;
  cells: Map<string, PanelConfigCell>;
  highlighter: PanelConfigHighlighter;
};

export function panelConfigFactory(config: any) {
  config = config || {};

  // Create the cell map
  let cells = new Map<string, Object>(Object.entries(config.cells || {}))

  // Extract tag highlighting information.
  let tagDrivable = new Set<string>();
  cells.forEach((cell: any) => {
      if (Array.isArray(cell.tags)) {
        cell.tags = new Set(cell.tags);
        cell.tags.forEach((tag: string) => {tagDrivable.add(tag)});
      }
    });

  const highlighter = {
    tagDrivable: tagDrivable,
    tagLegend: Array.isArray(config.tagConfig?.legend) ? config.tagConfig.legend : Array.from(tagDrivable),
    color: config.tagConfig?.color ?? "yellow",
    factors: {
      highlightRgbFactor: config.tagConfig?.highlightRgbFactor ?? 5.0,
      lowlightAlphaFactor: config.tagConfig?.lowlightAlphaFactor ?? 0.3,
    },
    condensed: config.tagConfig?.condensed ?? false,
  };

  return {
    test: config.test || {},
    background: config.background || {},
    variableThresholdScalars: new Map<string, VariableThresholdScalars[]>(Object.entries(config.variableThresholdScalars || {})),
    gradientMode: config.gradientMode || 'none',
    datapoint: config.datapoint || 'last',
    cellIdPreamble: config.cellIdPreamble || '',
    cellIdExtender: config.cellIdExtender || '@flowrpt',
    cellLabelDecimalPoints: (typeof config.cellLabelDecimalPoints === 'undefined') ? 0 : config.cellLabelDecimalPoints,
    cells: cells,
    highlighter: highlighter,
  } as PanelConfig;
}

export function siteConfigFactory(config: any) {
  config = config || {};
  return {
    links: new Map<string, Link>(Object.entries(config.links || {})),
    colors: new Map<string, string>(Object.entries(config.colors || {})),
    variableThresholdScalars: new Map<string, VariableThresholdScalars[]>(Object.entries(config.variableThresholdScalars || {})),
    thresholds: new Map<string, Threshold[]>(Object.entries(config.thresholds || {})),
    valueMappings: new Map<string, FlowValueMapping[]>(Object.entries(config.valueMappings || {})),
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
  function colorDeref(cell: PanelConfigCell, color: PanelConfigCellColor | undefined) {
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
      if (typeof color.datapoint === 'undefined') {
        color.datapoint = cell.datapoint || panelConfig.datapoint;
      }
    }
  }
  panelConfig.cells.forEach((cell) => {
    colorDeref(cell, cell.labelColor);
    colorDeref(cell, cell.fillColor);

    if (!cell.link && cell.linkRef) {
      cell.link = siteConfig.links.get(cell.linkRef);
    }
    if (cell.link) {
      cell.link = createUrl(cell.link);
    }

    if (cell.label) {
      if (typeof cell.label.decimalPoints === 'undefined') {
        cell.label.decimalPoints = panelConfig.cellLabelDecimalPoints;
      }
      if (typeof cell.label.datapoint === 'undefined') {
        cell.label.datapoint = cell.datapoint || panelConfig.datapoint;
      }
      if (!cell.label.valueMappings && cell.label.valueMappingsRef) {
        cell.label.valueMappings = siteConfig.valueMappings.get(cell.label.valueMappingsRef);
      }
      if (cell.label.valueMappings) {
        for (let mapping of cell.label.valueMappings) {
          mapping.valid = mapping.valid || (
            (typeof mapping.text === 'string') &&
            ((typeof mapping.valueMin === 'number') || (typeof mapping.valueMin === 'undefined')) &&
            ((typeof mapping.valueMax === 'number') || (typeof mapping.valueMax === 'undefined')));
        }
      }
    }
    if (typeof cell.datapoint === 'undefined') {
      cell.datapoint = panelConfig.datapoint;
    }

    // Fill levels require a full bounded conversion from value to percent
    if (cell.fillLevel) {
      cell.fillLevel.valid = (typeof cell.fillLevel.thresholdLwrValue === 'number') &&
      (typeof cell.fillLevel.thresholdUprValue === 'number') &&
      (typeof cell.fillLevel.thresholdLwrFillPercent === 'number') &&
      (typeof cell.fillLevel.thresholdUprFillPercent === 'number') &&
      ((typeof cell.fillLevel.thresholdOffValue === 'number') ||
       (typeof cell.fillLevel.thresholdOffValue === 'undefined'));
    }

    // Flow animation drives are valid only when all terms are defined
    // coherently
    if (cell.flowAnimation) {
      cell.flowAnimation.dataCoherent = ((typeof cell.flowAnimation.thresholdOffValue === 'undefined') ||
        (typeof cell.flowAnimation.thresholdOffValue === 'number')) &&
        (typeof cell.flowAnimation.thresholdLwrValue === 'number') &&
        (typeof cell.flowAnimation.thresholdUprValue === 'number') &&
        (typeof cell.flowAnimation.thresholdLwrDurationSecs === 'number') &&
        (typeof cell.flowAnimation.thresholdUprDurationSecs === 'number') &&
        (cell.flowAnimation.thresholdUprValue >= cell.flowAnimation.thresholdLwrValue);

      cell.flowAnimation.unidirectional = !!cell.flowAnimation.unidirectional;
      panelConfig.animationsPresent = true;
    }
  });
}

export function configInit(siteConfig: SiteConfig, panelConfig: PanelConfig) {
  siteConfigDereference(siteConfig);
  panelConfigDereference(siteConfig, panelConfig);
}
