import { FieldType, getFieldDisplayName } from '@grafana/data';
import { sliderTime } from 'components/TimeSlider';
import { DataRefTransform, DataRefTransformQuery, TestConfig } from './Config';

export type TimeSeries = {
  time: {
    valuesIndex?: number | null;
    values: number[];
  }
  values: Array<number | string | null>;
};

export type TimeSeriesData = {
  timeMin: number;
  timeMax: number;
  timeRange: number;
  ts: Map<string, TimeSeries>;
};

export function seriesExtend(tsData: TimeSeriesData, testConfig: TestConfig | undefined) {
  const timeMin = tsData.timeMin;
  const timeMax = tsData.timeMax;
  const dataSparse = testConfig?.testDataSparse;
  const dataExtendedZero = testConfig?.testDataExtendedZero;
  const baseOffset = typeof testConfig?.testDataBaseOffset === 'number' ? testConfig.testDataBaseOffset : 1;
  const create = function(datapoints: number, scalar: number, fn: (inp: number) => number, asString: boolean) {
    const intervalTime = Math.ceil((timeMax - timeMin) / datapoints);
    const intervalValue = 2 * Math.PI / datapoints;
    let timeValues = [];
    let dataValues = [];
    for (let i = 0; i <  datapoints; i++) {
      timeValues.push(timeMin + (i * intervalTime));

      const dv = scalar * (baseOffset + fn(i * intervalValue));
      const val1 = dataSparse && ((i % 10) > 5) ? null : dataExtendedZero && Math.abs(dv) < 20 ? 0 : dv;
      const val2 = asString && (typeof val1 === 'number') ? '*' + Math.ceil(val1).toString() + '*' : val1;
      dataValues.push(val2);
    }
    return {
      time: {values: timeValues},
      values: dataValues,
    };
  }

  let dataSets = [
    {name: 'test-data-small-sin', datapoints: 75, scalar: 100, fn: Math.sin, asString: false},
    {name: 'test-data-large-sin', datapoints: 50, scalar: 500, fn: Math.sin, asString: false},
    {name: 'test-data-small-cos', datapoints: 60, scalar: 100, fn: Math.cos, asString: false},
    {name: 'test-data-large-cos', datapoints: 88, scalar: 500, fn: Math.cos, asString: false},
  ];

  if (testConfig?.testDataStringData) {
    dataSets.push({name: 'test-data-string', datapoints: 65, scalar: 500, fn: Math.cos, asString: true});
  }

  dataSets.forEach((ds) => {
    if (!tsData.ts.get(ds.name)) {
      tsData.ts.set(ds.name, create(ds.datapoints, ds.scalar, ds.fn, ds.asString));
    }
  });
  if (testConfig?.testDataNoTime) {
    const name = 'test-data-no-time';
    if (!tsData.ts.get(name)) {
      tsData.ts.set(name, {values: [123], time: {values: [0], valuesIndex: null}});
    }
  }
}

function transformTabular(frame: any, keyColumnName: string, applyNamespace: (name: string) => string, tsNamed: Record<string, any>) {
  let keyColumnIndex = undefined;
  for (let i = 0; i < frame.fields.length; i++) {
    if (keyColumnName === getFieldDisplayName(frame.fields[i], frame)) {
      keyColumnIndex = i;
      break;
    }
  }
  if (typeof keyColumnIndex === 'number') {
    const keyColumn = frame.fields[keyColumnIndex];
    frame.fields.forEach((ts: any) => {
      if (ts !== keyColumn) {
        const fieldName = getFieldDisplayName(ts, frame);
        for (let i = 0; i < ts.values.length; i++) {
          const name = applyNamespace(keyColumn.values[i] + '.' + fieldName);
          const values = [ts.values[i]];
          tsNamed[name] = {values: values, time: null};
        }
      }
    })
  }
}

// This transforms the data so we have name-indexable sets of time and value.
// i.e.:
// - series: [fields: [{name, values}]] => Map<string, TimeSeries>
export function seriesTransform(series: any[], panelTimeMin: number, panelTimeMax: number, dataRefTransform: DataRefTransform | undefined): TimeSeriesData {
  const timeSeries = new Map<string, TimeSeries>();
  let timeMin: number | undefined = undefined;
  let timeMax: number | undefined = undefined;

  const drt = dataRefTransform || {namespaced: false, queries: new Map<string, DataRefTransformQuery>()};

  series.forEach((frame: any) => {
    function applyNamespace(name: string) {
      return drt.namespaced ? (frame.refId || 'GBL') + '.' + name : name;
    }

    if (('fields' in frame) && Array.isArray(frame.fields)) {
      let tsTime: null | {valuesIndex: null | number, values: any} = null;
      let tsNamed: Record<string, any> = {};
  
      const keyColumnName = frame.refId && drt.queries.get(frame.refId)?.tabularKeyColumn;
      if (keyColumnName) {
        transformTabular(frame, keyColumnName, applyNamespace, tsNamed);
      }
      else {
        frame.fields.forEach(function(ts: any) {
          if ((tsTime === null) && (ts.type === FieldType.time)) {
            // The index is stored alongside the ts because it has potential to be shared
            // and if so, only has to be calculated once.
            tsTime = {valuesIndex: null, values: ts.values};
            if (tsTime.values.length > 0) {
              const maxInd = tsTime.values.length - 1;
              timeMin = Math.min(timeMin ?? tsTime.values[0], tsTime.values[0]);
              timeMax = Math.max(timeMax ?? tsTime.values[maxInd], tsTime.values[maxInd]);
            }
          }
          else {
            const name = applyNamespace(getFieldDisplayName(ts, frame));
            tsNamed[name] = {values: ts.values, time: null};
          }
        });
      }
      // Embed a time shallow copy against each ts in the frame and export to holder
      tsTime = tsTime || {values: [0], valuesIndex: null};
      for (const [name, ts] of Object.entries<any>(tsNamed)) {
          ts.time = tsTime;
          timeSeries.set(name, ts);
      }
    }
  });
      
  timeMin = Math.floor(timeMin ?? panelTimeMin ?? 0);
  timeMax = Math.ceil(timeMax ?? panelTimeMax ?? 0);

  return {
    timeMin: timeMin,
    timeMax: timeMax,
    timeRange: timeMax - timeMin,
    ts: timeSeries,
  };
}

// This receives the timeSlider position and uses it to interpolate the time-series
// data.
export function seriesInterpolate(tsData: TimeSeriesData, timeSliderScalar: number) {
  const targetTime = sliderTime(tsData, timeSliderScalar);

  tsData.ts.forEach((ts) => {
    // ts.time can be shared across series so we only have to interpolate it once.
    if (!ts.time.valuesIndex) {
      let closestDeltaTime = null;
      let closestIndex = null;

      // Guess first position based on a ts with linear time progression
      const maxInd = ts.time.values.length - 1;
      if (maxInd >= 0) {
        const minTime = ts.time.values[0];
        const maxTime = ts.time.values[maxInd];
        let targetInd = (maxInd * (targetTime - minTime) / (maxTime - minTime)) || 0;
        targetInd = Math.max(0, Math.min(maxInd, Math.ceil(targetInd)));
        const nudge = ts.time.values[targetInd] < targetTime ? 1 : -1;

        while ((targetInd >= 0) && (targetInd  <= maxInd)) {
          const time = ts.time.values[targetInd];
          const deltaTime = targetTime - time;
          const deltaTimeAbs = Math.abs(deltaTime);
          if ((closestDeltaTime == null) || (deltaTimeAbs < closestDeltaTime)) {
            closestDeltaTime = deltaTimeAbs;
            closestIndex = targetInd;
          }
          // Break out once we start getting worse
          if (deltaTimeAbs > closestDeltaTime) {
            break;
          }
          targetInd += nudge;
        }
      }
      ts.time.valuesIndex = closestIndex;
    }
  });
  return tsData;
}
