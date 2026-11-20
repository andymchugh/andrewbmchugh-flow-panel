import { PanelConfigCell } from 'components/Config';
import { ControlError } from 'components/ControlLink';
import { SvgCell, SvgHolder, svgUpdate } from 'components/SvgUpdater';
import { TimeSeriesData } from 'components/TimeSeries';

// Builds the smallest svg holder that svgUpdate can drive: one cell with one text element.
function buildHolder(cellProps: Partial<PanelConfigCell>) {
  const el = document.createElement('div');
  el.id = 'cellEl';
  el.style.color = 'blue';
  const cell: SvgCell = {
    cellId: 'cellEl',
    cellIdShort: 'myCell',
    textElements: [],
    strokeElements: [],
    fillElements: [el],
    fillClipDrivers: [],
    text: 'Pump: ',
    cellProps: { label: { separator: 'replace', units: undefined, unitsPostfix: undefined, decimalPoints: undefined, valueMappingsRef: undefined, valueMappings: undefined, dataRef: undefined, bespokeDataRef: undefined, datapoint: undefined } as any, ...cellProps } as PanelConfigCell,
    variableThresholdScalars: new Map(),
  };
  const holder = {
    doc: document.implementation.createDocument(null, 'svg'),
    attribs: {
      width: 0,
      height: 0,
      scaleDrive: false,
      cells: new Map([['myCell', cell]]),
      elementAttribs: new Map([['cellEl', { styleColor: 'blue' }]]),
      variableValues: new Map(),
      highlightFactors: {} as any,
      bespokeHandlers: [],
    },
  } as unknown as SvgHolder;
  return { holder, el };
}

const emptyTs: TimeSeriesData = { timeMin: 0, timeMax: 1, timeRange: 1, ts: new Map() };

test('svgUpdate applies error text and colour only while the cell has an error', () => {
  const { holder, el } = buildHolder({
    link: {
      url: '/x', params: 'none', sameTab: false, open: 'silent', method: 'GET', body: undefined,
      headers: undefined, resultDataRef: undefined, resultPath: undefined, timeoutMs: 5000,
      error: { text: 'ERR ${status}', color: 'red' },
    },
  } as any);

  const errors = new Map<string, ControlError>([['myCell', { status: 503, message: 'Unavailable' }]]);
  svgUpdate(holder, emptyTs, undefined, false, errors);
  expect(el.textContent).toEqual('Pump: ERR 503');
  expect(el.style.color).toEqual('red');

  // A cell without an error gets the normal rendering back
  svgUpdate(holder, emptyTs, undefined, false, new Map());
  expect(el.style.color).toEqual('blue');
  expect(el.textContent).toEqual('Pump: ');
});

test('svgUpdate without an error representation leaves the cell unchanged', () => {
  const { holder, el } = buildHolder({
    link: {
      url: '/x', params: 'none', sameTab: false, open: 'silent', method: 'GET', body: undefined,
      headers: undefined, resultDataRef: undefined, resultPath: undefined, timeoutMs: 5000,
      error: undefined,
    },
  } as any);

  const errors = new Map<string, ControlError>([['myCell', { status: 500, message: 'Server' }]]);
  svgUpdate(holder, emptyTs, undefined, false, errors);
  expect(el.style.color).toEqual('blue');
  expect(el.textContent).toEqual('Pump: ');
});
