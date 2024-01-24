import { seriesInterpolate, TimeSeries, TimeSeriesData } from 'components/TimeSeries'

test('interpolate1', () => {
    const tsd: TimeSeriesData = {
        timeMin: 1000,
        timeMax: 3000,
        timeRange: 2000,
        ts: new Map<string, TimeSeries>(),
    };
    
    const timeVals = [1000, 1010, 1020, 1030, 1540, 1942, 2006, 2572, 2798, 3000];

    const timeSeries1: TimeSeries = {
        time: {values: timeVals},
        values: Array(1000).fill(0),
    };
    
    tsd.ts.set('data1', timeSeries1);
     
    // When we interpolate we lock in a timeValues index, so we need to clear this
    // between interpolations, as happens naturally when we receive new data. The
    // expected index is going to be the index of the closest time value to the
    // slider position where the slider is a linear (0-1) position on the time range.
    const check = (timeSliderVal: number, expectedTimeIndex:  number) => {
        seriesInterpolate(tsd, timeSliderVal);
        expect(timeSeries1.time.valuesIndex).toEqual(expectedTimeIndex);
        timeSeries1.time.valuesIndex = null;
    }
    check(-0.1, 0);
    check(0, 0);
    check(1, 9);
    check(1.1, 9);
    check(0.5, 6);
    check(0.1, 3);
});

