import { VariableInterpolation, getTemplateSrv } from "@grafana/runtime";

export type DatapointMode = 'last' | 'lastNotNull';
export type ColorGradientMode = 'none' | 'hue';
export type LabelSeparator = 'cr' | 'colon' | 'space' | 'replace';
export type LinkUrlParams = 'none' | 'time' | 'all';
export type FillDirection = 'bottomToTop' | 'topToBottom' | 'leftToRight' | 'rightToLeft';
export type CompoundFunction = 'min' | 'max';
export type ColorDrives = 'labelColor' | 'strokeColor' | 'fillColor';

export type VariableThresholdScalars = {
  variableValuePattern: string;
  thresholdScalar: number;
  cellIdPatternScope: string[];
};

export type ThresholdNumber = {
  color: string;
  level: number;
  order: number;
  blinkColor: string;
};

export type ThresholdPattern = {
  color: string;
  pattern: string;
  regexp: RegExp;
  order: number;
  blinkColor: string;
};


export type Link = {
  url: string;
  params: LinkUrlParams;
  sameTab: boolean | undefined;
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
  testDataNoTime: boolean | undefined;
};

export type FlowValueMapping = {
  value: string | number | null | undefined;
  valueMin: number | undefined;
  valueMax: number | undefined;
  text: string;
  variableSubst: boolean;
  valid: boolean;
};

export interface DataRefDrive {
  dataRef: string | undefined;
  bespokeDataRef: string | undefined;
  datapoint: DatapointMode | undefined;
};

export type PanelConfigCellLabel = DataRefDrive & {
  separator: LabelSeparator;
  units: string | undefined;
  unitsPostfix: string | undefined;
  decimalPoints: number | null | undefined;
  valueMappingsRef: string | undefined;
  valueMappings: FlowValueMapping[] | undefined;
};


export type PanelConfigCellColor = DataRefDrive & {
  gradientMode: ColorGradientMode | undefined;
  thresholdsRef: string | undefined;
  thresholds: ThresholdNumber[] |undefined;
  thresholdPatternsRef: string | undefined;
  thresholdPatterns: ThresholdPattern[] | undefined;
  blinkDurationSecs: number;
};

export type PanelConfigElementFilter = {
  name: string;
  position: string;
};

export type PanelConfigCellColorCompound = {
  function: CompoundFunction;
  colors: PanelConfigCellColor[];
};

export type PanelConfigCellFillLevel = DataRefDrive & {
  thresholdLwrFillPercent: number;
  thresholdUprFillPercent: number;
  thresholdOffValue: number | undefined;
  thresholdLwrValue: number;
  thresholdUprValue: number;
  fillDirection: FillDirection;
  valid: boolean;
};

export type PanelConfigCellFlowAnimation = DataRefDrive & {
  thresholdOffValue: number | undefined;
  thresholdLwrValue: number;
  thresholdLwrDurationSecs: number;
  thresholdUprValue: number;
  thresholdUprDurationSecs: number;
  biasPower: number;
  unidirectional: boolean;
  dataCoherent: boolean;
};

export type PanelConfigCellBespokeDrive = {
  elementName: string | undefined;
  elementPosition: number | undefined;
  attribsGet: Object | undefined;
  attribsSet: Object | undefined;
};

export type PanelConfigCellBespoke = {
  datapoint: DatapointMode | undefined;
  dataRefs: string[] | undefined;
  namespace: string | undefined;
  constants: Object | undefined;
  variables: string[] | undefined;
  formulas: string[] | undefined;
  drives: PanelConfigCellBespokeDrive[];
};

export type PanelConfigCell = DataRefDrive & {
  linkRef: string | undefined;
  link: Link | undefined;
  label: PanelConfigCellLabel | undefined;
  labelColor: PanelConfigCellColor | undefined;
  labelColorCompound: PanelConfigCellColorCompound | undefined;
  strokeColor: PanelConfigCellColor | undefined;
  strokeColorCompound: PanelConfigCellColorCompound | undefined;
  fillColorElementFilter: PanelConfigElementFilter[] | undefined;
  fillColor: PanelConfigCellColor | undefined;
  fillColorCompound: PanelConfigCellColorCompound | undefined;
  fillLevel: PanelConfigCellFillLevel | undefined;
  flowAnimation: PanelConfigCellFlowAnimation | undefined;
  bespoke: PanelConfigCellBespoke | undefined;
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

export type ZoomPanPinch = {
  wheelActivationKeys: string[] | undefined;
};

type LinkWindow = {
  sameTab: boolean;
};

type CellColorMappings = {
  darkTheme: Map<string, string>;
  lightTheme: Map<string, string>;
};

export type SiteConfig = {
  zoomPanPinch: ZoomPanPinch;
  variableThresholdScalars: Map<string, VariableThresholdScalars[]>;
  linkWindow: LinkWindow,
  linkVariables: Map<string, string>;
  links: Map<string, Link>;
  colors: Map<string, string>;
  cellColorMappings: CellColorMappings;
  thresholds: Map<string, ThresholdNumber[]>;
  thresholdPatterns: Map<string, ThresholdPattern[]>;
  valueMappings: Map<string, FlowValueMapping[]>;
};

export type PanelConfig = {
  test: TestConfig;
  zoomPanPinch: ZoomPanPinch;
  linkWindow: LinkWindow,
  linkVariables: Map<string, string>;
  background: Background;
  animationsPresent: boolean;
  variableThresholdScalars: Map<string, VariableThresholdScalars[]>;
  gradientMode: ColorGradientMode;
  datapoint: DatapointMode | undefined;
  cellIdPreamble: string;
  cellIdExtender: string;
  cellLabelDecimalPoints: number | undefined;
  cells: Map<string, PanelConfigCell>;
  cellColorMappings: CellColorMappings;
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
    zoomPanPinch: config.zoomPanPinch || {},
    linkWindow: config.linkWindow,
    linkVariables: new Map<string, string>(Object.entries(config.linkVariables || {})),
    background: config.background || {},
    cellColorMappings: {
      darkTheme: new Map<string, string>(Object.entries(config.cellColorMappings?.darkTheme || {})),
      lightTheme: new Map<string, string>(Object.entries(config.cellColorMappings?.lightTheme || {})),
    },
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
    zoomPanPinch: config.zoomPanPinch || {},
    linkWindow: config.linkWindow,
    linkVariables: new Map<string, string>(Object.entries(config.linkVariables || {})),
    links: new Map<string, Link>(Object.entries(config.links || {})),
    colors: new Map<string, string>(Object.entries(config.colors || {})),
    cellColorMappings: {
      darkTheme: new Map<string, string>(Object.entries(config.cellColorMappings?.darkTheme || {})),
      lightTheme: new Map<string, string>(Object.entries(config.cellColorMappings?.lightTheme || {})),
    },
    variableThresholdScalars: new Map<string, VariableThresholdScalars[]>(Object.entries(config.variableThresholdScalars || {})),
    thresholds: new Map<string, ThresholdNumber[]>(Object.entries(config.thresholds || {})),
    thresholdPatterns: new Map<string, ThresholdPattern[]>(Object.entries(config.thresholdPatterns || {})),
    valueMappings: new Map<string, FlowValueMapping[]>(Object.entries(config.valueMappings || {})),
  } as SiteConfig;
}

function panelConfigDereference(siteConfig: SiteConfig, panelConfig: PanelConfig, isDark: boolean) {
  const siteColorMappings = isDark? siteConfig.cellColorMappings.darkTheme : siteConfig.cellColorMappings.lightTheme;
  const panelColorMappings = isDark? panelConfig.cellColorMappings.darkTheme : panelConfig.cellColorMappings.lightTheme;

  function resolveColor(color: string) {
    color = panelColorMappings.get(color) || color;
    color = siteColorMappings.get(color) || color;
    color = siteConfig.colors.get(color) || color;
    return color;
  }

  function colorDeref(cell: PanelConfigCell, color: PanelConfigCellColor | undefined) {
    if (color) {
      color.gradientMode = color.gradientMode || panelConfig.gradientMode;
      if (!color.thresholds && color.thresholdsRef) {
        color.thresholds = siteConfig.thresholds.get(color.thresholdsRef);
      }
      if (color.thresholds) {
        color.thresholds.forEach(function(threshold, index) {
          threshold.color = resolveColor(threshold.color);
          threshold.order = typeof threshold.order === 'number' ? threshold.order : index;
          threshold.blinkColor = resolveColor(threshold.blinkColor);
        });
      }
      if (!color.thresholdPatterns && color.thresholdPatternsRef) {
        color.thresholdPatterns = siteConfig.thresholdPatterns.get(color.thresholdPatternsRef);
      }
      if (color.thresholdPatterns) {
        color.thresholdPatterns.forEach(function(threshold, index) {
          threshold.color = resolveColor(threshold.color);
          threshold.order = typeof threshold.order === 'number' ? threshold.order : index;
          threshold.regexp = typeof threshold.pattern === 'object' ? threshold.regexp : new RegExp(threshold.pattern);
          threshold.blinkColor = resolveColor(threshold.blinkColor);
        });
      }
      if (typeof color.datapoint === 'undefined') {
        color.datapoint = cell.datapoint;
      }
    }
  }
  function colorBlend(cell: PanelConfigCell, colorStr: ColorDrives, colorCompound: PanelConfigCellColorCompound | undefined) {
    colorDeref(cell, cell[colorStr]);
    if (colorCompound) {
      colorCompound.colors = colorCompound.colors || [];
      (colorCompound.colors).forEach((color) => {
        colorDeref(cell, color);
      });
      if (cell[colorStr]) {
        // Prepend the single color value to the pre-existing compound
        colorCompound.colors.unshift(cell[colorStr] as PanelConfigCellColor);
        cell[colorStr] = undefined;
      }
    }
  }

  panelConfig.cells.forEach((cell) => {
    if (typeof cell.datapoint === 'undefined') {
      cell.datapoint = panelConfig.datapoint;
    }

    // Colors
    if (cell.fillColorElementFilter && Array.isArray(cell.fillColorElementFilter)) {
      cell.fillColorElementFilter.forEach((filter) => {
        filter.name = filter.name?.toString() || '.*';
        filter.position = filter.position?.toString() || '.*';
      })
    }
    colorBlend(cell, 'labelColor', cell.labelColorCompound);
    colorBlend(cell, 'strokeColor', cell.strokeColorCompound);
    colorBlend(cell, 'fillColor', cell.fillColorCompound);

    // Links
    if (!cell.link && cell.linkRef) {
      cell.link = siteConfig.links.get(cell.linkRef);
    }
    if (cell.link) {
      cell.link.sameTab = typeof cell.link.sameTab === 'boolean' ? cell.link.sameTab :
        typeof panelConfig.linkWindow?.sameTab === 'boolean' ? panelConfig.linkWindow.sameTab :
        typeof siteConfig.linkWindow?.sameTab === 'boolean' ? siteConfig.linkWindow.sameTab : false;
    }

    if (cell.label) {
      if (typeof cell.label.decimalPoints === 'undefined') {
        cell.label.decimalPoints = panelConfig.cellLabelDecimalPoints;
      }
      if (typeof cell.label.datapoint === 'undefined') {
        cell.label.datapoint = cell.datapoint;
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

          if (mapping.valid && (typeof mapping.variableSubst === 'undefined')) {
            let interpolations: VariableInterpolation[] = [];
            getTemplateSrv().replace(mapping.text, undefined, undefined, interpolations);
            mapping.variableSubst = interpolations.length > 0;
          }
        }
      }
    }

    // Fill levels require a full bounded conversion from value to percent
    if (cell.fillLevel) {
      cell.fillLevel.valid = (typeof cell.fillLevel.thresholdLwrValue === 'number') &&
      (typeof cell.fillLevel.thresholdUprValue === 'number') &&
      (typeof cell.fillLevel.thresholdLwrFillPercent === 'number') &&
      (typeof cell.fillLevel.thresholdUprFillPercent === 'number') &&
      ((typeof cell.fillLevel.thresholdOffValue === 'number') ||
       (typeof cell.fillLevel.thresholdOffValue === 'undefined'));
      cell.fillLevel.datapoint = cell.fillLevel.datapoint || cell.datapoint;
    }

    // Flow animation drives are valid only when all terms are defined
    // coherently
    if (cell.flowAnimation) {
      cell.flowAnimation.biasPower = typeof cell.flowAnimation.biasPower === 'number' ? cell.flowAnimation.biasPower : 1.0;
      cell.flowAnimation.biasPower = Math.max(0, cell.flowAnimation.biasPower);
      cell.flowAnimation.dataCoherent = ((typeof cell.flowAnimation.thresholdOffValue === 'undefined') ||
        (typeof cell.flowAnimation.thresholdOffValue === 'number')) &&
        (typeof cell.flowAnimation.thresholdLwrValue === 'number') &&
        (typeof cell.flowAnimation.thresholdUprValue === 'number') &&
        (typeof cell.flowAnimation.thresholdLwrDurationSecs === 'number') &&
        (typeof cell.flowAnimation.thresholdUprDurationSecs === 'number') &&
        (cell.flowAnimation.thresholdUprValue >= cell.flowAnimation.thresholdLwrValue);

      cell.flowAnimation.unidirectional = !!cell.flowAnimation.unidirectional;
      cell.flowAnimation.datapoint = cell.flowAnimation.datapoint || cell.datapoint;
      panelConfig.animationsPresent = true;
    }

    // Bespoke Drives
    if (cell.bespoke) {
      cell.bespoke.datapoint = cell.bespoke.datapoint || cell.datapoint;
    }
  });

  // Blend linkVariables
  panelConfig.linkVariables = new Map([...siteConfig.linkVariables, ...panelConfig.linkVariables]);

  // Blend ZoomPanPinch settings
  panelConfig.zoomPanPinch = {...siteConfig.zoomPanPinch, ...panelConfig.zoomPanPinch};
}

export function configInit(siteConfig: SiteConfig, panelConfig: PanelConfig, isDark: boolean) {
  panelConfigDereference(siteConfig, panelConfig, isDark);
}
