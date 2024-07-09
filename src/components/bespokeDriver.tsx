import { PanelConfigCellBespoke, PanelConfigCellBespokeDrive } from 'components/Config';
import { splitPath } from './FillLevel';
import { getTemplateSrv } from '@grafana/runtime';
import { BespokeStateHolder } from './SvgUpdater';


export type CellBespokeHandlerState = {
  element: HTMLElement;
  elementPosition: number;
};

type ClientState = {
  panelScope: Object;
  cellScope: Object;
  elementScope: CellBespokeHandlerState;
};

export type CellBespokeHandler = {
  element: HTMLElement;
  renderFn: Function;
  clientState: ClientState;
};

export type CellBespokeDrivers = {
  dataRefs: string[] | undefined;
  handlers: CellBespokeHandler[];
};

export function bespokeDriveFactory(config: PanelConfigCellBespoke | undefined) {
  return {
    dataRefs: Array.isArray(config?.dataRefs) ? config?.dataRefs : undefined,
    handlers: [],
  };
}

function pathDSplit(element: HTMLElement) {
  return splitPath(element.getAttribute('d') || '');
};

function grafanaVariablesReplace(str: string) {
  return getTemplateSrv().replace(str);
};

function getUtils() {
  return {
    splitPathDAttrib: pathDSplit,
    variablesReplace: grafanaVariablesReplace,
  };
};

function runClientFunction(element: HTMLElement, fn: Function, ...fnArgs: any[]) {
  try {
    return fn(...fnArgs);
  }
  catch (err) {
    console.log('Error occured running bespoke function for',  element, 'error =', err);
  }
}

export function bespokeDriveHandlerFactory(element: HTMLElement, config: PanelConfigCellBespokeDrive[], bespokeStateHolder: BespokeStateHolder) {
  // Increment nodeName count
  bespokeStateHolder.elementCounts.set(element.nodeName, (bespokeStateHolder.elementCounts.get(element.nodeName) || 0) + 1);
  const elementPosition = bespokeStateHolder.elementCounts.get(element.nodeName) as number;

  const handlers: CellBespokeHandler[] = [];
  config.forEach((drive) => {
    if (((typeof drive.elementName === 'undefined') || (drive.elementName === element.nodeName)) &&
        ((typeof drive.elementPosition === 'undefined') || (drive.elementPosition === elementPosition))) {
      const elementScope = {
        element: element.cloneNode(true) as HTMLElement,
        elementPosition: elementPosition,
      };
      const clientState = {
        panelScope: bespokeStateHolder.panelState,
        cellScope: bespokeStateHolder.cellState,
        elementScope: elementScope,
      }
      try {
        if (drive.primeFn) {
          // Invoke client prime function
          runClientFunction(element, Function('state', 'utils', drive.primeFn), {...clientState}, getUtils());
        }
        if (drive.initFn) {
          // Invoke client init function
          runClientFunction(element, Function('state', 'utils', drive.initFn), {...clientState}, getUtils());
        }
        if (drive.renderFn) {
          handlers.push({
            element: element,
            clientState: clientState,
            renderFn: Function('state', 'utils', 'data', drive.renderFn),
          })
        }
      }
      catch (err) {
        console.log('Error occured creating bespoke functions for',  element, 'error =', err, 'config =', config);
      }
    }
  });
  return handlers;
}

export function attribDriverManager(handlers: CellBespokeHandler[], data: any) {
  const utils = getUtils();
  handlers.forEach((handler: CellBespokeHandler) => {
    // Invoke client render function
    const params = runClientFunction(handler.element, handler.renderFn, {...handler.clientState}, utils, data) || {};

    // Assign attributes
    for (const [k, v] of Object.entries(params.attribs || {})) {
      handler.element.setAttribute(k, String(v));
    };

    // Assign value
    if (typeof params.value !== 'undefined') {
      handler.element.replaceChildren(String(params.value));
    }
  });
}
