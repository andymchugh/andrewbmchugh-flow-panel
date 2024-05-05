import { getFieldDisplayName, toDataFrame } from '@grafana/data';
import { seriesInterpolate, TimeSeries, TimeSeriesData } from 'components/TimeSeries'

// When we interpolate we lock in a timeValues index, so we need to clear this
// between interpolations, as happens naturally when we receive new data. The
// expected index is going to be the index of the closest time value to the
// slider position where the slider is a linear (0-1) position on the time range.
function checkTimeIndex(tsd: TimeSeriesData, ts: TimeSeries, timeSliderVal: number, expectedTimeIndex: number | null) {
    seriesInterpolate(tsd, timeSliderVal);
    expect(ts.time.valuesIndex).toEqual(expectedTimeIndex);
    ts.time.valuesIndex = null;
}

test('interpolate', () => {
    const tsd: TimeSeriesData = {
        timeMin: 1000,
        timeMax: 3000,
        timeRange: 2000,
        ts: new Map<string, TimeSeries>(),
    };

    const timeVals = [1000, 1010, 1020, 1030, 1540, 1942, 2006, 2572, 2798, 3000];

    const ts: TimeSeries = {
        time: {values: timeVals},
        values: Array(1000).fill(0),
    };

    tsd.ts.set('data1', ts);

    checkTimeIndex(tsd, ts, -0.1, 0);
    checkTimeIndex(tsd, ts, 0, 0);
    checkTimeIndex(tsd, ts, 1, 9);
    checkTimeIndex(tsd, ts, 1.1, 9);
    checkTimeIndex(tsd, ts, 0.5, 6);
    checkTimeIndex(tsd, ts, 0.1, 3);
});

test('interpolate_1_datapoint', () => {
  const tsd: TimeSeriesData = {
      timeMin: 1000,
      timeMax: 3000,
      timeRange: 2000,
      ts: new Map<string, TimeSeries>(),
  };

  const timeVals = [1020];

  const ts: TimeSeries = {
      time: {values: timeVals},
      values: Array(1).fill(25),
  };

  tsd.ts.set('data1', ts);

  checkTimeIndex(tsd, ts, -0.1, 0);
  checkTimeIndex(tsd, ts, 0, 0);
  checkTimeIndex(tsd, ts, 1, 0);
  checkTimeIndex(tsd, ts, 1.1, 0);
  checkTimeIndex(tsd, ts, 0.5, 0);
  checkTimeIndex(tsd, ts, 0.1, 0);
});

test('interpolate_0_datapoint', () => {
  const tsd: TimeSeriesData = {
      timeMin: 1000,
      timeMax: 3000,
      timeRange: 2000,
      ts: new Map<string, TimeSeries>(),
  };

  const timeVals: number[] = [];

  const ts: TimeSeries = {
      time: {values: timeVals},
      values: [],
  };

  tsd.ts.set('data1', ts);

  checkTimeIndex(tsd, ts, -0.1, null);
  checkTimeIndex(tsd, ts, 0, null);
  checkTimeIndex(tsd, ts, 1, null);
  checkTimeIndex(tsd, ts, 1.1, null);
  checkTimeIndex(tsd, ts, 0.5, null);
  checkTimeIndex(tsd, ts, 0.1, null);
});

test('displayNameFromTimeSeries', () => {
    const series = [
        {
          target: "myExpectedName",
          tags: {
            name: "mytag1",
            databaseName: "mydbnametag"
          },
          datapoints: [
            [
              72,
              1708548630000
            ],
            [
              24.5,
              1708548660000
            ],
          ],
          meta: [
            {
              [`schema-name`]: "default",
              [`schema-retentions`]: "1s:30d",
              [`archive-read`]: 0,
              [`archive-interval`]: 30,
              [`aggnum-norm`]: 1,
              [`consolidator-normfetch`]: "AverageConsolidator",
              [`aggnum-rc`]: 0,
              [`consolidator-rc`]: "NoneConsolidator",
              [`count`]: 2
            }
          ],
          title: "myExpectedName" // ver 10.0.0: this is the term thats exported as the name
        }
    ];

    const dataFrame = toDataFrame(series[0]);
    let foundTime = false;
    let foundData = false;
    dataFrame.fields.forEach((field) => {
        const name = getFieldDisplayName(field, dataFrame);
        foundTime = foundTime || (name === "Time");
        foundData = foundData || (name === "myExpectedName");
    })
    expect(foundTime).toEqual(true);
    expect(foundData).toEqual(true);
});
