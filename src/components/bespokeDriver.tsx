import { DatapointMode, PanelConfigCell, PanelConfigCellBespoke } from 'components/Config';
import { BespokeStateHolder, getCellValue} from './SvgUpdater';
import { MathNode, parse } from 'mathjs'
import { TimeSeriesData } from './TimeSeries';
import { getTemplateSrv } from '@grafana/runtime';
import { flowDebug } from './Utils';

const gAllowedNewElementAttributes: Set<string> = new Set<string>([
  'transform', 'transform-origin', 'visibility']
);

type NamespacedData =  {
  utils: Object;
  data: any;
  // plus client defined variables
};

export type CellBespokeHandlerState = {
  element: HTMLElement;
  elementPosition: number;
};

export type ScopedState = {
  namespace: string;
  datapoint: DatapointMode;
  dataRefs: Set<string>;
  constants: Map<string, string>;
  formulas: MathNode[];
};

export type CellBespokeAttribSetter = {
  attribName: string;
  attribFormula: MathNode;
};

export type CellBespokeHandler = {
  element: HTMLElement;
  clientState: ScopedState;
  attribSetters: CellBespokeAttribSetter[];
};

// This function filters out diss-allowed attribute drives
// - on* attributes are not settable
// - gAllowedNewElementAttributes can be added
// - all other attributes must already exist on the element
function attributeName(element: HTMLElement, name: string) {
  const name2 = name.trim().toLowerCase();
  const allowed = (name2.indexOf('on') !== 0) &&
    (gAllowedNewElementAttributes.has(name2) || element.hasAttribute(name));
  return allowed ? name : null;
}

export function bespokeStateFactory(namespace: string) {
  return {
    namespace: namespace,
    datapoint: 'last' as DatapointMode,
    dataRefs: new Set<string>(),
    constants: new Map<string, string>(),
    formulas: [],
  };
}

export function bespokeDriveHandlerFactory(cellId: string, dataRef: string | undefined, element: HTMLElement, config: PanelConfigCellBespoke, bespokeStateHolder: BespokeStateHolder) {
  // Increment nodeName count
  bespokeStateHolder.elementCounts.set(element.nodeName, (bespokeStateHolder.elementCounts.get(element.nodeName) || 0) + 1);
  const elementPosition = bespokeStateHolder.elementCounts.get(element.nodeName) as number;

  // Get / create namespace state
  const namespace = config.namespace || cellId;
  if (!bespokeStateHolder.namespaceState.has(namespace)) {
    bespokeStateHolder.namespaceState.set(namespace, bespokeStateFactory(namespace));
  }
  const state =  bespokeStateHolder.namespaceState.get(namespace) as ScopedState;

  // datapoint is defined on a cell basis but data and formulas are gathered on a namespace basis. As such
  // the most permissive datapoint across the namespace is used by all.
  state.datapoint = state.datapoint === 'lastNotNull' ? state.datapoint : config.datapoint || 'last';

  if (dataRef) {
    state.dataRefs.add(dataRef);
  }
  config.dataRefs?.forEach((v) => {
    state.dataRefs.add(v);
  });
  config.formulas?.forEach((v) => {
    try {
      state.formulas.push(parse(v as string));
    }
    catch (err) {
      flowDebug().warn('Error occured parsing bespoke formula [', v, ']', element, 'error =', err);
    }
  });

  config.drives?.forEach((drive) => {
    if (((typeof drive.elementName === 'undefined') || (drive.elementName === element.nodeName)) &&
        ((typeof drive.elementPosition === 'undefined') || (drive.elementPosition === elementPosition))) {

      try {
        // Pull in the clients constants
        for (const [k, v] of Object.entries(config.constants || {})) {
          state.constants.set(k, v);
        }
        // Pull in the clients attribute captures
        for (const [k, v] of Object.entries(drive.attribsGet || {})) {
          const value = element.getAttribute(String(v));
          if (typeof value === 'string') {
            state.constants.set(k, value);
          }
        }
        const attribSetters = [];
        for (const [k, v] of Object.entries(drive.attribsSet || {})) {
          const attribName = attributeName(element, k);
          if (attribName) {
            attribSetters.push({
              attribName: attribName,
              attribFormula: parse(v as string)
            });
          }
          else {
            flowDebug().warn('attribute drive [', k, '] not allowed on element', element);
          }
        }
        bespokeStateHolder.handlers.push({
          element: element,
          attribSetters: attribSetters,
          clientState: state,
        });
      }
      catch (err) {
        flowDebug().warn('Error occured creating bespoke functions for',  element, 'error =', err, 'config =', config);
      }
    }
  });
}

export function getBespokeData(cellId: string, cellProps: PanelConfigCell, namespacedData: Map<string, NamespacedData>) {
  const namespace = cellProps.bespoke?.namespace || cellId;
  if (typeof namespace !== "undefined") {
    return namespacedData.get(namespace) as any;
  }
  return undefined;
}

function grafanaVariablesReplace(str: string) {
  return getTemplateSrv().replace(str);
}

function clientExposedUtils() {
  return {
    log: flowDebug().info,
    variablesReplace: grafanaVariablesReplace,
  }
}

export function attribDriverManager(cbh: CellBespokeHandler[], tsData: TimeSeriesData) {
  const namespacedData  = new Map<string, NamespacedData>();

  // Initialize each namespaced store with constants and data
  cbh.forEach((handler: CellBespokeHandler) => {
    const namespace = handler.clientState.namespace;

    // Create the store
    if (!namespacedData.has(namespace)) {
      const vars = Object.fromEntries([
        ['utils', clientExposedUtils()],
        ['data', {}],
        ...handler.clientState.constants]);
      namespacedData.set(namespace, vars);
    }
    const dataStore = namespacedData.get(namespace) as NamespacedData;

    // Populate store with data
    const bespokeDataDatapoint = handler.clientState.datapoint;
    handler.clientState.dataRefs.forEach((dataRef) => {
      if (typeof dataStore.data[dataRef] === 'undefined') {
        const drive = {dataRef: dataRef, bespokeDataRef: undefined, datapoint: bespokeDataDatapoint};
        const dataValue = getCellValue(drive, tsData, null);
        dataStore.data[dataRef] = dataValue;
      }
    });
  });

  // Invoke the formulas
  cbh.forEach((handler: CellBespokeHandler) => {
    const namespace = handler.clientState.namespace;
    const dataStore = namespacedData.get(namespace) as NamespacedData;

    try {
      handler.clientState.formulas.forEach((formula) => {
        formula.evaluate(dataStore);
      });
    }
    catch (err) {
      flowDebug().warn('Error occured calculating bespoke formulas for', handler.element, 'error =', err);
    }
  });

  // Invoke the attribute setters
  cbh.forEach((handler: CellBespokeHandler) => {
    const namespace = handler.clientState.namespace;
    const dataStore = namespacedData.get(namespace) as NamespacedData;

    try {
      handler.attribSetters.forEach((obj) => {
        const attribValue = obj.attribFormula.evaluate(dataStore);
        handler.element.setAttribute(obj.attribName, String(attribValue));
      });
    }
    catch (err) {
      flowDebug().warn('Error occured calculating bespoke attribute for', handler.element, 'error =', err);
    }
  });

  return namespacedData;
}
