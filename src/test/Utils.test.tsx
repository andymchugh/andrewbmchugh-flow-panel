import { GrafanaTheme2, createTheme } from '@grafana/data';
import { appendUrlParams, cellIdFactory, colorGradient,
    colorLookup, colorStringToRgb, getInstrumenter, isUrl, regExpMatch,
    variableThresholdScalarsInit, variableThresholdScaleValue } from 'components/Utils';
import {SvgCell } from 'components/SvgUpdater';
import { VariableThresholdScalars } from 'components/Config';
 
//-----------------------------------------------------------------------------
// Cell Ids

test('cellIdFactory', () => {
    const cellIdFn = cellIdFactory('myid_abcd_');

    expect(cellIdFn()).toEqual('myid_abcd_0');
    expect(cellIdFn()).toEqual('myid_abcd_1');
    expect(cellIdFn()).toEqual('myid_abcd_2');

    const cellIdFn2 = cellIdFactory('myid_abcd_');
    expect(cellIdFn()).toEqual('myid_abcd_3');
    expect(cellIdFn2()).toEqual('myid_abcd_0');
    expect(cellIdFn2()).toEqual('myid_abcd_1');
    expect(cellIdFn()).toEqual('myid_abcd_4');
});

//-----------------------------------------------------------------------------
// URLs

test('appendUrlParams', () => {
    expect(appendUrlParams('abcd?abcd', 'abcd')).toEqual('abcd?abcdabcd');
    expect(appendUrlParams('abcdnabcd', '?abcd')).toEqual('abcdnabcd?abcd');
    expect(appendUrlParams('abcdnabcd', 'abcd')).toEqual('abcdnabcdabcd');
});

test('isUrl', () => {
    expect(isUrl('')).toEqual(false);
    expect(isUrl('   ')).toEqual(false);
    expect(isUrl('<htmlstuff>')).toEqual(false);
    expect(isUrl('  <htmlstuff> ')).toEqual(false);
    expect(isUrl('http://mylink')).toEqual(true);
    expect(isUrl('    http://mylink'    )).toEqual(true);
    expect(isUrl('https://mylink')).toEqual(true);
    expect(isUrl('    https://mylink'    )).toEqual(true);
    expect(isUrl('file://mylink')).toEqual(true);
    expect(isUrl('    file://mylink'    )).toEqual(true);
});

//-----------------------------------------------------------------------------
// RegExp

test('regExpMatch', () => {
    expect(regExpMatch('.*', 'abcd')).toEqual(true);
    expect(regExpMatch('.*dd', 'abcd')).toEqual(false);
    expect(regExpMatch('abc', 'nnnabcx')).toEqual(true);
    expect(regExpMatch('abc', 'nnnabxx')).toEqual(false);
});

//-----------------------------------------------------------------------------
// Colors

test('colorWhitespace', () => {
    const theme: GrafanaTheme2 = createTheme();
    const rgbRed = [255, 0, 0];
    expect(colorStringToRgb(theme, '  red   ')).toEqual([242, 73, 92]);
    expect(colorStringToRgb(theme, '  #f00   ')).toEqual(rgbRed);
    expect(colorStringToRgb(theme, '  #ff0000   ')).toEqual(rgbRed);
    expect(colorStringToRgb(theme, '  hsl(  0  ,   100%  ,   50%  ')).toEqual(rgbRed);
    expect(colorStringToRgb(theme, '  rgb( 255  ,   0  ,   0  ')).toEqual(rgbRed);
});

test('colorStringToRgb', () => {
    const theme: GrafanaTheme2 = createTheme();
    const rgbRed = [255, 0, 0];
    expect(colorStringToRgb(theme, 'red')).toEqual([242, 73, 92]);
    expect(colorStringToRgb(theme, '#f00')).toEqual(rgbRed);
    expect(colorStringToRgb(theme, '#ff0000')).toEqual(rgbRed);
    expect(colorStringToRgb(theme, 'hsl(0, 100%, 50%')).toEqual(rgbRed);
    expect(colorStringToRgb(theme, 'rgb(255, 0, 0)')).toEqual(rgbRed);

    const rgbGreen = [0, 255, 0];
    expect(colorStringToRgb(theme, 'green')).toEqual([115, 191, 105]);
    expect(colorStringToRgb(theme, '#0f0')).toEqual(rgbGreen);
    expect(colorStringToRgb(theme, '#00ff00')).toEqual(rgbGreen);
    expect(colorStringToRgb(theme, 'hsl(120, 100%, 50%')).toEqual(rgbGreen);
    expect(colorStringToRgb(theme, 'rgb(0, 255, 0)')).toEqual(rgbGreen);

    const rgbBlue = [0, 0, 255];
    expect(colorStringToRgb(theme, 'blue')).toEqual([87, 148, 242]);
    expect(colorStringToRgb(theme, '#00f')).toEqual(rgbBlue);
    expect(colorStringToRgb(theme, '#0000ff')).toEqual(rgbBlue);
    expect(colorStringToRgb(theme, 'hsl(240, 100%, 50%')).toEqual(rgbBlue);
    expect(colorStringToRgb(theme, 'rgb(0, 0, 255)')).toEqual(rgbBlue);
});

test('colorLookup', () => {
    const theme: GrafanaTheme2 = createTheme();

    const hexRed = '#ff0000';
    colorStringToRgb(theme, hexRed);
    expect(colorLookup(hexRed)).toEqual('rgb(255, 0, 0)');

    const hexGreen = '#00ff00';
    colorStringToRgb(theme, hexGreen);
    expect(colorLookup(hexGreen)).toEqual('rgb(0, 255, 0)');

    const hexBlue = '#0000ff';
    colorStringToRgb(theme, hexBlue);
    expect(colorLookup(hexBlue)).toEqual('rgb(0, 0, 255)');
});

test('colorGradient', () => {
    const theme: GrafanaTheme2 = createTheme();

    const rgbRed = 'rgb(100, 0, 0)';
    colorStringToRgb(theme, rgbRed);
    const rgbBlue = 'rgb(0, 100, 0)';
    colorStringToRgb(theme, rgbBlue);
    const rgbGreen = 'rgb(0, 0, 100)';
    colorStringToRgb(theme, rgbGreen);

    expect(colorGradient(rgbRed, rgbBlue, 0/0)).toEqual('rgb(0, 100, 0)');
    expect(colorGradient(rgbRed, rgbBlue, 1/0)).toEqual('rgb(0, 100, 0)');
    expect(colorGradient(rgbRed, rgbBlue, -999999999)).toEqual('rgb(100, 0, 0)');
    expect(colorGradient(rgbRed, rgbBlue, 1)).toEqual('rgb(0, 100, 0)');
    expect(colorGradient(rgbRed, rgbBlue, 0.4)).toEqual('rgb(60, 40, 0)');
    expect(colorGradient(rgbRed, rgbGreen, 1)).toEqual('rgb(0, 0, 100)');
    expect(colorGradient(rgbRed, rgbGreen, 0.4)).toEqual('rgb(60, 0, 40)');
});

//-----------------------------------------------------------------------------
// Variable Threshold Scalars. The logical implementation of this functionality
// is threshold scaling. However as there are many thresholds but only one value
// it's implemented the other way round. i.e if the threshold is being halved
// by config, we actually double the value to get the same comparison.

function addCell(cells: any, cellId: string) {
    cells.set(cellId, {
        cellId: cellId,
        textElements: [],
        fillElements: [],
        text: '',
        cellProps: {
            dataRef: '',
            linkRef: undefined,
            link: undefined,
            label: undefined,
            labelColor: undefined,
            fillColor: undefined,
        },
        variableThresholdScalars: new Map<string, VariableThresholdScalars[]>(),
    });
}

test('variableThresholdScalarsBlank', () => {

    const variableValues = new Map<string, string>();
    const cells = new Map<string, SvgCell>();
    const variableThresholdScalars = new Map<string, VariableThresholdScalars[]>();

    variableThresholdScalarsInit(variableValues, cells, variableThresholdScalars);
})

function testThresholds(cellValues: Map<string, any>, variableThresholdScalars: any, variableValues: any) {
    const cells = new Map<string, SvgCell>();

    cellValues.forEach((_, cellId) => { addCell(cells, cellId); });

    const variableValuesBase = new Map();
    variableThresholdScalarsInit(variableValuesBase, cells, variableThresholdScalars);

    variableValuesBase.forEach((val, key) => {
        variableValuesBase.set(key, variableValues.get(key));
    });

    cells.forEach((cellData, key) => {
        const values = cellValues.get(key)
        expect(typeof values === 'object').toBeTruthy();
        expect(variableThresholdScaleValue(variableValuesBase, cellData, values.valBefore)).toEqual(values.valAfter);
    })
}

test('variableThresholdScalars_1match1not', () => {
    // Config defined variable rules
    const variableThresholdScalars = new Map<string, VariableThresholdScalars[]>();
    variableThresholdScalars.set('varName_env',  [{
        variableValuePattern: 'varVal_qwerty',
        thresholdScalar: 0.5,
        cellIdPatternScope: ['.*abc.*'],
    }]);

    // Variable values
    const variableValues = new Map<string, string>();
    variableValues.set('varName_env', 'varVal_qwerty');

    // Test expectations
    const cellValues = new Map<string, any>();
    cellValues.set('cell-abcd', {valBefore: 100, valAfter: 200});
    cellValues.set('cell-cvbn', {valBefore: 100, valAfter: 100});

    testThresholds(cellValues, variableThresholdScalars, variableValues);
})

test('variableThresholdScalars_2matchdiffPatterns', () => {
    // Config defined variable rules
    const variableThresholdScalars = new Map<string, VariableThresholdScalars[]>();
    variableThresholdScalars.set('varName_env',  [{
        variableValuePattern: 'varVal_qwerty',
        thresholdScalar: 0.5,
        cellIdPatternScope: ['.*abc.*', '.*cvb.*'],
    }]);

    // Variable values
    const variableValues = new Map<string, string>();
    variableValues.set('varName_env', 'varVal_qwerty');

    // Test expectations
    const cellValues = new Map<string, any>();
    cellValues.set('cell-abcd', {valBefore: 100, valAfter: 200});
    cellValues.set('cell-cvbn', {valBefore: 100, valAfter: 200});

    testThresholds(cellValues, variableThresholdScalars, variableValues);
})

test('variableThresholdScalars_2var1match1not', () => {
    // Config defined variable rules
    const variableThresholdScalars = new Map<string, VariableThresholdScalars[]>();
    variableThresholdScalars.set('varName_env',  [{
        variableValuePattern: 'varVal_qwerty',
        thresholdScalar: 0.5,
        cellIdPatternScope: ['.*abc.*'],
    }]);
    variableThresholdScalars.set('varName_site',  [{
        variableValuePattern: '.*mysite.*',
        thresholdScalar: 0.5,
        cellIdPatternScope: ['.*abc.*'],
    }]);

    // Variable values
    const variableValues = new Map<string, string>();
    variableValues.set('varName_env', 'varVal_qwerty');
    variableValues.set('varName_site', 'this is mysite on the hill');

    // Test expectations
    const cellValues = new Map<string, any>();
    cellValues.set('cell-abcd', {valBefore: 100, valAfter: 400});
    cellValues.set('cell-cvbn', {valBefore: 100, valAfter: 100});

    testThresholds(cellValues, variableThresholdScalars, variableValues);
})

test('instrumenter', () => {
    function inner(a: number, b: number, c: number) {
        expect(a + b + c).toEqual(6);
    }

    const instrumentTimeOff = getInstrumenter(false);
    const instrumentTimeOn = getInstrumenter(true);

    instrumentTimeOff('label', inner)(1, 2, 3);
    instrumentTimeOn('label', inner)(1, 2, 3);
})
